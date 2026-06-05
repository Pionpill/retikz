# ADR-01：`<Scope>` IR 容器 + compile 下沉到 GroupPrim

- 状态：Accepted（已实现）
- 决策日期：2026-05-16
- 关联：[v0 roadmap §v0.2 预备](../../roadmap.md) · [v0.2 总计划](../roadmap.md) · [v0.2-alpha.1 plan](./roadmap.md) · [alpha.5 ADR-01 (Scene 结构化)](../../v0.1/v0.1-alpha.5/01-scene-primitive-structured.md)

## 背景 / 约束

- v0.1 的 IR 扁平：`Scene.children: Array<Node | Path | Coordinate>`，无分组容器；TikZ 用户用 `\begin{scope}` 做局部 transform + 样式作用域 + 结构分组，IR 层却没有对应基元。
- Scene Tier 3 已有 `GroupPrim`（带 `transforms` 数组，alpha.5 ADR-01 结构化的产物）承担 transform 复合的实际渲染——IR Scope 有自然的下沉目标。

## 决策：引入 IR 一等基元 `IRScope`（第 4 类 child）+ Pass 1 累积 transform 算全局坐标

`<Scope>` emit `IRScope`，作为 `ChildSchema` discriminated union 第 4 类（`type: 'scope'`）；schema 见 `core/src/ir/scope.ts`，递归 `ChildSchema` 见 `core/src/ir/scene.ts`（`z.lazy` 包裹整个 union 支持 scope 嵌套，`IRChild` 类型手写不能用 `z.infer`，沿用 v0.1 polar 嵌套 origin 的惯例）。

**只引入 `<Scope>`、不引入 `<Group>`**：TikZ 用户视角只接触 `\begin{scope}`，`GroupPrim` 是内部 Tier 3 实现细节；两个相似 IR 基元会让 schema 翻倍 + 拖累 LLM 生成。

**编译**（`core/src/compile/{compile,scope}.ts`）：Pass 1 递归遍历 scope tree，对每个 node / coordinate 计算其 scope 链累积 transform、用**全局坐标**存进 nodeIndex（Pass 2 path 引用仍走全局 nodeIndex，无需改造）。双重存储语义：node 在 nodeIndex 是全局坐标（供引用），在 Scene primitive 树里是局部坐标 + GroupPrim transform 链（供渲染），两者 compile 层各自算、互不依赖。每个 `IRScope` 对应一层 `GroupPrim`。

**IR `TransformSchema` ≠ Scene `Transform`**（`core/src/ir/transform.ts`）：IR 层独立定义 **6 变体**，4 个 translate 完全镜像 Node.position union 4 形态——

- `translate {x, y}`（笛卡尔字面量）
- `polar-translate {origin?, angle, radius}`（镜像 `PolarPosition`）
- `at-translate {direction, of, distance?}`（镜像 `AtPosition`）
- `offset-translate {of, offset?}`（镜像 `OffsetPosition`）
- `rotate {degrees, cx?, cy?}` / `scale {x, y?}`（与 Scene 层一致）

kind 字面量限定词在前（`'polar-translate'` / `'at-translate'` / `'offset-translate'`，与对应 Position 命名风格对齐）。4 个 translate 在 compile 阶段全部**复用 `compile/position.ts` 的 `resolvePosition`** 展平为 Cartesian translate（把 translate "shift 量"当对应 Position 字面量解析拿到 `(x, y)`），下沉到 `GroupPrim.transforms` 时 Scene 层只剩 3 变体（Cartesian translate + rotate + scale），不污染底层渲染契约。前向引用规则与 PolarPosition / AtPosition / OffsetPosition 一致（referent 须在 scope 进入前已定义）。

`<Scope>` 是 **kernel 而非 sugar**（IR 一等基元，与 Node / Path / Coordinate 同层），落 `react/src/kernel/Scope.tsx`。

### 设计细节（具体决策）

- `id` 可选：缺省 → 仅分组 / transform / 样式作用域；设值 → 注册 bbox synthetic layout 进**父 namespace frame**（不受 `localNamespace` 影响——scope.id 是 scope 的"外部句柄"，必须可被外部引用；bbox 语义详 ADR-03）。
- `localNamespace` 可选 boolean（缺省 false）：true → 创建本地 namespace 边界，子 id 不向父 frame 传播、外部不可见；最上层 `<Layout>` 才是真正全局 frame（namespace stack / lookup / duplicate 规则详 ADR-02）。
- `transforms` 数组顺序应用，第 0 个最先生效（最内层）——**与 Scene `GroupPrim` / SVG transform list 一致**；TikZ 多 scope option 是 option 出现顺序叠加 CM，retikz 复用 SVG/Scene 约定。
- 空 scope 优化：children 空 + transforms 空/缺省 + id 缺省 → 不 emit GroupPrim；任一非空（含 id 设值需注册 bbox）仍 emit / 注册。
- scope 内 coordinate 注册到全局 nodeIndex（与 v0.1 / TikZ pgf 默认一致，coordinate 不引入局部命名空间）。
- polar-translate `radius < 0` 接受，等价 `(angle + 180°, |radius|)`，按 `x = radius·cos`, `y = radius·sin` 数学直接算，不加 `.nonnegative()`（与 v0.1 PolarPosition.radius 一致）。

### 被否决的选项

- **B：nodeIndex 存"局部 layout + transform 链"、引用时即查即解** —— 保留"node 在哪个 scope"语义、codec 反推直接还原，但所有 nodeIndex 消费者（compile/path、resolvePosition、anchor）都要改造成 transform-aware，改造面大、数字角度方向向量也要按 transform 旋转。被否决理由：YAGNI——v0.2 所有引用都需要全局坐标（path / position 引用是用户最终想要的世界坐标），"按需投影"无强需求。
- **C：不引入 IR Scope、让用户直接写 Scene `GroupPrim`** —— 零 schema 改动，但违反 IR 分层（Tier 1 IR vs Tier 3 Scene）、用户得理解 ScenePrimitive、codec 反推丢失 scope 语义、样式继承（alpha.2）无处挂。

选 A 的核心理由：改造面最小（nodeIndex 仍 `Map<string, NodeLayout>`，只 Pass 1 加 transform 累积）；与 alpha.5 ADR-01 的 GroupPrim 自然映射；GroupPrim → IRScope 反推由 unbuilder 接口兼容处理。

## 不在本 ADR 范围

- nodeIndex 跨 scope ID 唯一性 / anchor 投影 / id 冲突检测 → [ADR-02](./02-node-index-anchor-resolution.md)。
- scope.id 触发的 bbox 注册 / synthetic layout 计算 / scope 作为引用整体的 anchor 语义 → [ADR-03](./03-scope-id-bounding-box.md)。
- scope 下相对定位（referent 投影规则）→ [ADR-04](./04-relative-position-in-scope.md)。
- scope 上挂 `nodeDefault` / `pathDefault` 默认值 → v0.2 alpha.2 单独 ADR。
- scope 下 path 跨 scope 走线的视觉裁剪 → 不需要（TikZ 也不裁剪，scope 是逻辑分组不是 clip region）。
- TikZ `cm` 任意 2×3 仿射矩阵 → v0.2 不做（YAGNI），如需另开 `MatrixTransform` ADR。
- polar 形态的 rotate / scale → 现实需求弱，v0.2 不做。
- scope rotate 下 bbox 是 axis-aligned vs rotation-aware → ADR-03 默认 axis-aligned 全局 bbox，rotation-aware 留后续。

---

> **实现指针**：level `red`（动 IR schema + compile + 包 index 公开导出）、additive 非 breaking（v0.1 代码 0 改动可跑）。真源以代码为准——`ScopeSchema` / `IRScope`（`core/src/ir/scope.ts`）、`TransformSchema`（`core/src/ir/transform.ts`，6 变体）、递归 `ChildSchema`（`core/src/ir/scene.ts`）、Pass 1 累积 + GroupPrim emit（`core/src/compile/{compile,scope}.ts`，`lowerScopeTransforms` 复用 `compile/position.ts` 的 `resolvePosition` 把 6 变体展平为 Scene 3 变体）、`<Scope>` kernel（`react/src/kernel/Scope.tsx` + builder / unbuilder 双向）；用户侧示例见文档站 Scope 组件页。测试在 `core/tests/{ir/scope.schema,compile/scope,compile/scope-transform-lowering}.test.ts` 与 `react/tests/kernel/`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `da448234`；压缩前完整施工蓝图 = `git show da448234^:notes/decisions/core/v0/v0.2/v0.2-alpha.1/01-scope-ir-and-compile.md`。
