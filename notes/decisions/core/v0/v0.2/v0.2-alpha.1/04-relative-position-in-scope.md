# ADR-04：scope 下相对定位（Polar / At / Offset）语义

- 状态：Accepted
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](./roadmap.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-02](./02-node-index-anchor-resolution.md) · [本 milestone ADR-03](./03-scope-id-bounding-box.md) · [alpha.4 ADR-01 (Node.position direction/of)](../../v0.1/v0.1-alpha.4/01-node-at-positioning.md) · [alpha.5 ADR-04 (OffsetPosition)](../../v0.1/v0.1-alpha.5/04-position-offset.md)

## 背景

v0.1 引入了三种相对定位 position 形态（Node / Coordinate / step.to 共享）：

| schema | 字段 | 基准 | TikZ 对应 |
|---|---|---|---|
| `PolarPositionSchema` | `{ origin, angle, radius }` | origin（id / Position / 嵌套 polar） | `({A} + (30:50))` 极坐标 |
| `AtPositionSchema` | `{ direction, of, distance? }` | of（id） | `[above=of A]` |
| `OffsetPositionSchema` | `{ of, offset }` | of（id / Position / PolarPosition） | `($(A) + (30, 10)$)` calc |

引入 `<Scope>` 后，**referent + 当前节点可能不在同一 scope**。语义需明确：

```tsx
<Scope transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
  <Node id="A" position={[0, 0]}>A</Node> {/* A 全局 (100, 0) */}
  <Node id="B" position={{ origin: 'A', angle: 0, radius: 30 }}>B</Node>
  {/* B 在 A 右 30 —— 是 A 局部 (30,0) 后 apply scope 得 (130,0)？还是 A 全局 (100,0) 加 (30,0) 得 (130,0)？*/}
</Scope>
```

两种语义在"同 scope referent"下等价（如上），但**跨 scope** referent 时不等价：

```tsx
<Node id="hub" position={[0, 0]}>hub</Node>  {/* hub 全局 (0,0) */}
<Scope transforms={[{ kind: 'rotate', degrees: 90 }]}>
  <Node id="orbit" position={{ origin: 'hub', angle: 0, radius: 50 }}>orbit</Node>
  {/* 
    语义 1（全局基准）：hub 全局 (0,0)、polar 算 (50,0)、apply scope rotate 90 → 全局 (0, 50)
    语义 2（referent 局部基准）：hub 不在本 scope，无对应"局部坐标"——退化为全局，结果同 1
    语义 3（当前 scope 局部基准）：hub 投影到本 scope 局部 (0,0) 经反向 rotate → 仍 (0,0)、polar 算 (50,0)、apply scope rotate → (0, 50)
  */}
</Scope>
```

TikZ 行为：`\begin{scope}[rotate=90]` 内写 `node at ($(hub) + (50:0)$)` —— `(hub)` 引用解析为全局坐标（不受 scope rotate 影响），但 `+ (50:0)` 在当前 scope 局部坐标系里——所以 hub 全局点 + scope 局部 (50, 0)，后者经 scope rotate 投影。

retikz 选哪种？这正是本 ADR 要拍板的事。

## 选项

### A. 当前 scope 局部基准（TikZ 完全对齐，**推荐**）

- referent 坐标先取全局（已由 ADR-01 / ADR-02 决策——NameStack 内 layout 存全局坐标；lookup 走 inside-out frame 搜索，shadowing 命中最近 frame 的 referent）
- relative 部分（polar 的 `(angle, radius)` / at 的 `(direction, distance)` / offset 的 `[dx, dy]`）在**当前 node 所属 scope 局部坐标系**计算
- 结果 = referent 全局坐标 + relative 部分（按当前 scope transform 链投影）

**等价表述**：把 referent 看作一个全局"原点"，在它附近**按当前 scope 的局部度量单位**做相对位移；位移结果再经过当前 scope 的 transform 链拉到全局视觉位置。

数学：
```
final = scopeTransform(referent_global_in_local + relative_part_in_local)
```
即 referent 全局点要先反向投影到当前 scope 局部，加 relative，再正向投影回全局。

### B. 全局基准（relative 部分也在全局坐标系）

- referent 全局 + relative 部分**直接加在全局坐标**
- 不管当前 node 在哪个 scope，relative 单位永远是全局单位

```
final = referent_global + relative_part_in_global
```

- 优：实现极简，无需"反向投影 referent 到局部再投影回"
- 缺：与 TikZ 不对齐；scope rotate 下 relative `(30, 0)` 看起来"没旋转"，违反 scope 的 transform 语义；用户预期破坏

### C. 当前 scope 局部 + referent 也用局部投影

- referent 也按"如果它在当前 scope 内会是什么"反向投影
- 复杂 + 多义 + 与 ADR-02 nodeIndex 全局语义冲突

## 决策：A（当前 scope 局部基准，relative 部分跟着 scope 走）

理由：

1. **TikZ 对齐**：retikz 总体方针是"TikZ 用户能直接迁移"。scope 内 `+ (30, 0)` 跟着 scope rotate 旋转，是 TikZ 用户最强的直觉
2. **scope transform 语义自洽**：scope 的 transform "改变内部坐标系"——relative 偏移在新坐标系里测量天经地义；如果 relative 单位不受 scope 影响，scope rotate / scale 形同虚设
3. **数学上自然**：把 scope 想成"用户先在白纸上以当前坐标系画 (referent_local + relative)，再整张纸贴到全局"——relative 在白纸上度量
4. **实现可行**：referent 全局坐标已在 NameStack（lookup 走 inside-out shadowing）；scope transform 链可在 Pass 1 累积时下挂当前节点上下文；relative 计算 + 一次正向 apply scope chain 即可

## 决策细节

> 选项 A 锁后，6 项细节均拍板：

1. **referent 在当前 scope 外时**：referent 全局坐标直接用；relative 仍在当前 scope 局部度量。即"先把 referent 看作落在当前 scope 局部的固定点（其局部坐标 = `inverseScopeTransform(global)`），加 relative，再正向 apply 当前 scope" —— 几何上等价于"把 referent 全局点平移到 + apply scope rotate/scale 后的偏移"
2. **referent 在当前 scope 内时**（同 scope 或更内层 scope）：referent 全局坐标已经经过了**它所在 scope** 的累积 transform；当前 node 所在 scope **可能更外层**——按"当前 node 的 scope"计算 relative 投影；不按 referent 的 scope。即：relative 总是用当前 node 的 scope，不用 referent 的 scope
3. **polar / at / offset 三种 schema 行为一致**：都按"当前 scope 局部度量 + 末端 apply 当前 scope chain"统一处理；不出现"polar 用 A 规则、at 用 B 规则"的不一致
4. **`Position`（笛卡尔字面量 `[x, y]`）在 scope 内**：与 v0.1 行为一致——`position=[50, 0]` 在 scope 内被 scope transform 投影；这是 ADR-01 决策的自然结果（Pass 1 累积 transform 时所有 position resolve 都用当前 scope chain）
5. **`PolarPosition.origin` 是嵌套 polar / OffsetPosition.of 是嵌套 polar 时**：嵌套结构 resolve 递归——内层 polar / offset 也在**当前 node 的 scope 局部**度量。即整条嵌套链都跟着当前 node 所在 scope 走，不切换基准 scope
6. **scope chain 传到 `resolvePosition` 时已是 Cartesian-only 4 变体**：ADR-01 compile 阶段把 polar-translate 展平为 Cartesian translate；本 ADR 的 `applyScopeTransform` / `inverseScopeTransform` 只需处理 translate / rotate / scale 3 变体——polar-translate 不会进 transform chain

## 待决策点

> 选项 A 已锁，但实施前再判：

- **逆变换的数值稳定性**：scope scale=0 时反向投影无定义。**约定 scale=0 不允许**（schema 加 `.refine(s !== 0)`，或 compile 警告 + fallback 到 1）。在 ADR-01 schema 内补 `.refine`，本 ADR 不重复处理；如未补则本 ADR 实施时同步补
- **`nodeDistance` CompileOption 在 scope 下**：当前是全局参数；是否需要"scope 局部 nodeDistance"？倾向不加（YAGNI，可用显式 `distance` 覆盖；nodeDistance 单位与当前 scope 的局部度量同步——即 scope scale=2 时 `nodeDistance=10` 视觉表现 20）
- **codec 反推**：unbuilder 把 IR scope 反推回 JSX 时 relative position 字段不变（保留高层意图）；但 codec → TikZ 文本时如何输出？倾向"scope 内 position 写 `\begin{scope}` 内的 TikZ 表达"，但 v0.2 alpha 不实现 codec，留待 v0 收尾阶段

## DSL 表面

```tsx
// 同 scope：自然预期，relative 跟着 scope 一起旋转
<TikZ>
  <Scope transforms={[{ kind: 'rotate', degrees: 90 }]}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Node position={{ of: 'A', direction: 'right', distance: 50 }}>
      right-of-A
      {/* 在 scope 局部 = A 右 50；scope rotate 90 后视觉上 = A 下方 50（屏幕 y-down 假设） */}
    </Node>
  </Scope>
</TikZ>

// 跨 scope：referent 是 scope 外的 hub
<TikZ>
  <Node id="hub" position={[0, 0]}>hub</Node>
  <Scope transforms={[{ kind: 'rotate', degrees: 45 }]}>
    <Node position={{ origin: 'hub', angle: 0, radius: 50 }}>
      hub-orbit
      {/* hub 全局 (0,0)、polar 角度 0 在当前 scope 局部 = 局部 (50, 0)、apply scope rotate 45 → 全局 (≈35.4, ≈35.4) */}
    </Node>
  </Scope>
</TikZ>

// OffsetPosition 跨 scope：offset 跟着当前 scope 走
<TikZ>
  <Node id="anchor" position={[100, 100]}>anchor</Node>
  <Scope transforms={[{ kind: 'scale', x: 2 }]}>
    <Node position={{ of: 'anchor', offset: [10, 0] }}>
      scaled-offset
      {/* anchor 全局 (100,100)、offset (10, 0) 在 scope 局部 → apply scale 2 → 视觉偏移 (20, 0) → 全局 (120, 100) */}
    </Node>
  </Scope>
</TikZ>

// 嵌套 polar：内层 polar.origin 引用全局 node，整条链都在当前 scope 局部度量
<TikZ>
  <Node id="A" position={[0, 0]}>A</Node>
  <Scope transforms={[{ kind: 'rotate', degrees: 30 }]}>
    <Node position={{
      origin: { origin: 'A', angle: 0, radius: 30 },
      angle: 90,
      radius: 20,
    }}>
      nested-in-scope
      {/* A 全局 (0,0)；内 polar 算"A 右 30" 在当前 scope 局部 = (30,0)；外 polar 再 +20 上 = (30,-20)；apply scope rotate 30 → 全局视觉位置 */}
    </Node>
  </Scope>
</TikZ>

// Position 笛卡尔字面量同样按 scope 投影（v0.1 已是此行为，scope 是自然延续）
<TikZ>
  <Scope transforms={[{ kind: 'translate', x: 50, y: 50 }]}>
    <Node position={[10, 10]}>shifted</Node> {/* 全局 (60, 60) */}
  </Scope>
</TikZ>
```

## 测试设计

`packages/core/tests/compile/scope-position.test.ts`（新建）覆盖：

- 三种 relative 形态在 scope 下的行为：polar / at / offset
- 跨 scope referent
- 嵌套 polar / 嵌套 offset 在 scope 下递归
- scope rotate / scale / translate 三种 transform 对 relative 的影响
- referent 在更内层 scope vs 更外层 scope vs 同 scope vs 无 scope

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/compile/compile.ts`**：Pass 1 调用 `resolvePosition` 时传入当前 scope 累积 transform 链（新参数）
- **`packages/core/src/compile/position.ts`** `resolvePosition`（修改）：签名加可选 `scopeTransform` 参数；polar / at / offset 三个分支末端用 `applyScopeTransform(scopeChain, localResult)` 投影；referent（id 查表）取全局坐标作为"在当前 scope 局部的固定点"基准——即 `referent_in_local = inverseScopeTransform(scopeChain, referent_global)`，relative 在局部 + scope transform 正向投影回全局
- **`packages/core/src/compile/scope.ts`**（ADR-01 已建）：补 `applyScopeTransform` / `inverseScopeTransform` helpers
- **`packages/core/src/compile/path/*.ts`**：path step target 解析（resolveTarget）调用 resolvePosition 时同样传 scopeTransform
- **`packages/core/src/compile/node.ts`** `layoutNode`：内部 `resolvePosition` 调用同上
- **`packages/core/src/geometry/_transform.ts`**（**引用 / 可能小扩**）：现有 transform apply helper；如需 inverse helper 在此补
- **测试**：core compile（scope 下 polar / at / offset 三 schema × 同 scope / 跨 scope / 嵌套 referent / scope 三种 transform）
- **文档**：scope.mdx 加"相对定位语义"章节 + 5 个 demo（每种 schema × 跨 scope）
- **AGENTS.md**：加"scope 下 relative position 在当前 scope 局部度量"规则

## 不在本 ADR 范围

- **scope 上挂 `nodeDefault` / `pathDefault`**：v0.2 alpha.2 处理
- **scope 内 `direction` 的 8 方向枚举如何配合 rotate**：使用方层面与 AtPosition 现有语义一致——`direction: 'right'` 是**当前 scope 局部**的 right；scope rotate 90 后视觉变 down。本 ADR 决策（当前 scope 局部基准）已隐含此行为
- **TikZ `cm` 任意仿射矩阵下 inverse**：v0.2 不引入 cm（ADR-01 已决）
- **`PolarPosition.origin = Position` 笛卡尔字面量在 scope 下的语义**：等价于"该坐标先经 scope transform 后用作 origin"——本 ADR 规则自动覆盖（笛卡尔在当前 scope 局部度量是 v0.1 行为延续）
- **scope 内 `RelativeTarget` (`{ relative: [dx, dy] }`)**：基准是 path 前一步终点不是 referent id；relative 仍在当前 scope 局部度量；不需要单独决策——本 ADR 规则统一覆盖

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/compile/**`（`resolvePosition` 签名扩 + scope transform 投影）
- 不动 schema / 不动公开 API
- 跨级取最高 = red（compile 改动）

### Schema 改动

无 schema 改动（本 ADR 仅 compile 行为定义）。

### 文件 scope

- `packages/core/src/compile/position.ts`（修改：`resolvePosition` 签名扩 scope transform 参数；polar / at / offset 分支末端投影）
- `packages/core/src/compile/compile.ts`（修改：Pass 1 调用 resolvePosition 时传当前 scope chain）
- `packages/core/src/compile/scope.ts`（ADR-01 已建，扩 `applyScopeTransform` / `inverseScopeTransform`）
- `packages/core/src/compile/path/*.ts`（修改：path target resolve 同样传 scope chain）
- `packages/core/src/compile/node.ts` `layoutNode`（修改：内部 resolvePosition 调用传 scope chain）
- `packages/core/src/geometry/_transform.ts`（**修改**：可能需补 inverseTransform helper）
- `packages/core/tests/compile/scope-position.test.ts`（新建）
- `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx`（扩"相对定位语义"章节）
- `apps/docs/src/contents/core/components/tikz/scope/relative-position*.demo.tsx`（新建若干）
- `AGENTS.md`（修改：加 scope-relative 规则）

### 测试象限

#### Happy path（≥ 3）

- `scope_polar_same_scope`：scope rotate(90) 内 A + B={origin:'A', angle:0, radius:50} → B 视觉在 A 下方（局部右 50 经 scope rotate）
- `scope_at_same_scope`：scope rotate(90) 内 A + B={direction:'right', of:'A', distance:50} → 同上
- `scope_offset_same_scope`：scope rotate(90) 内 A + B={of:'A', offset:[50, 0]} → 同上
- `scope_polar_cross_scope`：外层 hub + 内层 scope rotate(45) + node={origin:'hub', angle:0, radius:50} → hub 全局 (0,0)、局部 (50,0)、scope rotate 45 投影
- `scope_at_cross_scope`：同上结构、at 形态
- `scope_offset_cross_scope`：同上结构、offset 形态
- `scope_polar_nested_origin_in_scope`：scope 内 polar 嵌套 polar，整条链局部度量后正确投影

#### 边界（≥ 2）

- `scope_translate_only_relative_unchanged`：scope translate(50, 0) + relative (10, 0) → translate 不旋转/缩放，relative 视觉仍 (10, 0)（即不被 translate 影响——translate 不改 transform 矩阵的 a/d 分量）
- `scope_scale_relative_scaled`：scope scale(2) + offset (10, 0) → 视觉偏移 (20, 0)
- `scope_rotate_zero_no_op`：scope rotate(0) → relative 不被改变
- `scope_inverse_for_external_referent`：外层 referent + 内层 scope 时反向投影数值精度（rotate 任意角度）

#### 错误路径（≥ 2）

- `scope_scale_zero_relative_resolve`：scope scale=0 → 反向投影未定义 → schema 拒绝（ADR-01 .refine）或 compile warn + fallback
- `scope_polar_origin_forward_reference_within_scope`：scope 内 polar.origin 引用同 scope 内**后**定义的 node → 抛错（与 v0.1 一致）
- `scope_at_of_unresolved_under_scope`：scope 内 at.of 引用不存在 id → AT_TARGET_UNRESOLVED warn + fallback（与 v0.1 一致）

#### 交互（≥ 2）

- `scope_polar_with_scope_rotate_and_node_rotate`：scope rotate(30) + 内 node A rotate(15) + 另一 node B={origin:'A', angle:45, radius:50} → polar 在当前 scope 局部 = (35.4, 35.4)、scope rotate 30 后投影；B 自身无 rotate
- `scope_at_with_nodeDistance_compile_option`：CompileOption.nodeDistance=20 + scope rotate(90) + at 无 distance → 用 20 作为局部 distance、视觉投影旋转 90
- `scope_offset_chain_across_scopes`：node A 在 scope1、B `{of:'A', offset:[10,0]}` 在 scope2、C `{of:'B', offset:[0,10]}` 在 scope3 —— 三层 scope 各自 transform 全部投影正确
- `scope_polar_origin_cartesian_in_scope`：scope rotate(45) + node `{ origin: [100, 0], angle: 0, radius: 30 }`（polar.origin 用笛卡尔字面量）→ origin [100,0] 在当前 scope 局部、polar 算后 (130,0) 局部、scope rotate 45 投影到全局；验证笛卡尔 origin 在 scope 下也走"当前 scope 局部度量"规则
- `scope_polar_translate_chain_lowered_before_apply`：scope `transforms: [{ kind: 'polar-translate', angle: 30, radius: 50 }, { kind: 'rotate', degrees: 30 }]` + 内 node `position={[10, 0]}` → polar-translate 在 chain 累积时已展平为 `translate(≈43.3, 25)`，resolvePosition 看到的 chain 全为 Cartesian；最终全局坐标 = chain.apply([10, 0])

### 依赖现有元素

- `packages/core/src/compile/position.ts` 的 `resolvePosition` —— **修改签名**：扩可选 scope transform 参数（如不传 = 全局，等价 v0.1 行为）
- `packages/core/src/compile/scope.ts`（ADR-01 新建）的 transform chain 累积——**引用 + 扩**：补 inverse / apply helpers
- `packages/core/src/geometry/_transform.ts` 的 transform apply 工具—— **可能扩**：补 inverse helper（rotate 反向角度、scale 倒数、translate 取负）
- `packages/core/src/compile/path/*.ts` 的 `resolveTarget` —— **修改**：传 scope chain
- `packages/core/src/compile/node.ts` 的 `layoutNode` —— **修改**：传 scope chain 进 resolvePosition
- 本 milestone [ADR-01](./01-scope-ir-and-compile.md) —— **强依赖**：scope 树遍历 + transform chain 累积是本 ADR 的基础
- 本 milestone [ADR-02](./02-node-index-anchor-resolution.md) —— **强依赖**：NameStack 存全局坐标 + inside-out lookup 是本 ADR "referent_global" 取值的前提；localNamespace shadowing 时取最近 frame 的 referent 自然落实"按当前位置可见的 referent"语义
