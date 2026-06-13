# ADR-04：scope 下相对定位（Polar / At / Offset）语义

- 状态：Accepted（已实现）
- 决策日期：2026-05-16
- 关联：[v0.2-alpha.1 plan](./roadmap.md) · [本 milestone ADR-01](./01-scope-ir-and-compile.md) · [本 milestone ADR-02](./02-node-index-anchor-resolution.md) · [本 milestone ADR-03](./03-scope-id-bounding-box.md) · [alpha.4 ADR-01 (Node.position direction/of)](../../v0.1/alpha.4/01-node-at-positioning.md) · [alpha.5 ADR-04 (OffsetPosition)](../../v0.1/alpha.5/04-position-offset.md)

## 背景 / 约束

- v0.1 有三种相对定位 position 形态（Node / Coordinate / step.to 共享）：`PolarPosition {origin, angle, radius}`、`AtPosition {direction, of, distance?}`、`OffsetPosition {of, offset}`。
- 引入 `<Scope>` 后 referent 与当前节点可能不在同一 scope，语义需明确。核心问题：scope 内 `+ (30, 0)` 这类 relative 部分，是在**全局坐标系**度量还是在**当前 scope 局部坐标系**度量？同 scope referent 下两者等价，**跨 scope referent 时不等价**（如 scope rotate(90) 内引用 scope 外的 hub）。
- TikZ 行为：`\begin{scope}[rotate=90]` 内写 `node at ($(hub) + (50:0)$)` —— `(hub)` 解析为全局坐标（不受 scope 影响），`+ (50:0)` 在当前 scope 局部坐标系——故 hub 全局点 + scope 局部偏移，后者经 scope rotate 投影。

## 决策：当前 scope 局部基准（relative 部分跟着 scope transform 走，TikZ 完全对齐）

- referent 坐标取全局（ADR-01 / ADR-02：NameStack 内 layout 存全局坐标，lookup 走 inside-out shadowing，命中最近 frame 的 referent）。
- relative 部分（polar 的 `(angle, radius)` / at 的 `(direction, distance)` / offset 的 `[dx, dy]`）在**当前 node 所属 scope 局部坐标系**计算；结果再经当前 scope transform 链投影回全局。
- 数学：`final = scopeTransform(inverseScopeTransform(referent_global) + relative_in_local)`——referent 全局点先反向投影到当前 scope 局部，加 relative，再正向投影回全局。等价直觉：用户在白纸上以当前坐标系画 `(referent_local + relative)`，再整张纸贴回全局，relative 在白纸上度量。

### 设计细节（具体决策）

- **relative 总用当前 node 的 scope，不用 referent 的 scope**：referent 在更内层 / 更外层 / 同 scope / 无 scope 都一样——referent 全局坐标固定，投影规则只看当前 node 所在 scope chain。
- **polar / at / offset 三 schema 行为一致**：统一"当前 scope 局部度量 + 末端 apply 当前 scope chain"，不出现"polar 用 A 规则、at 用 B 规则"。
- **笛卡尔字面量 `[x, y]` 同样按 scope 投影**：v0.1 行为延续，是 ADR-01 Pass 1 累积 transform 的自然结果。
- **嵌套 polar / offset 整条链都在当前 node 的 scope 局部度量**，不切换基准 scope。
- **scope chain 传到 `resolvePosition` 时已是 Cartesian-only**：ADR-01 compile 阶段已把 polar-translate 展平为 Cartesian translate，故 `applyScopeTransform` / `inverseScopeTransform` 只需处理 translate / rotate / scale 3 变体。
- **`direction: 'right'` 是当前 scope 局部的 right**：scope rotate 90 后视觉变 down——当前 scope 局部基准已隐含此行为。
- **scale=0 反向投影无定义**：约定不允许（schema `.refine(s !== 0)` 或 compile warn + fallback 到 1）。
- **nodeDistance** 仍是全局 CompileOption（不加 scope 局部 nodeDistance，YAGNI）；其单位与当前 scope 局部度量同步（scope scale=2 时 `nodeDistance=10` 视觉表现 20，可用显式 `distance` 覆盖）。

### 被否决的选项

- **B：全局基准（relative 部分直接加在全局坐标）** —— `final = referent_global + relative_in_global`，实现极简无需反向投影，但与 TikZ 不对齐；scope rotate 下 relative `(30, 0)` 看起来"没旋转"，scope rotate / scale 形同虚设，破坏用户预期。
- **C：当前 scope 局部 + referent 也用局部投影** —— referent 也按"若它在当前 scope 内会是什么"反向投影，复杂 + 多义 + 与 ADR-02 nodeIndex 全局语义冲突。

选 A 核心理由：TikZ 对齐（retikz 总方针"TikZ 用户能直接迁移"，scope 内 `+ (30,0)` 跟着 scope rotate 旋转是最强直觉）；scope transform "改变内部坐标系" 自洽（relative 偏移在新坐标系测量天经地义，否则 rotate / scale 形同虚设）；实现可行（referent 全局坐标已在 NameStack，relative + 一次正向 apply scope chain 即可）。

## 不在本 ADR 范围

- scope 上挂 `nodeDefault` / `pathDefault` → v0.2 alpha.2。
- TikZ `cm` 任意仿射矩阵下 inverse → v0.2 不引入 cm（ADR-01 已决）。
- codec → TikZ 文本输出 scope 内 position 的形态 → v0.2 alpha 不实现 codec，留 v0 收尾；unbuilder 反推 JSX 时 relative 字段不变（保留高层意图）。
- `RelativeTarget` (`{ relative: [dx, dy] }`，基准是 path 前一步终点而非 referent id）→ 本 ADR 规则统一覆盖（relative 仍在当前 scope 局部度量），不需单独决策。

---

> **实现指针**：level `red`（动 compile，无 schema 改动、不动公开 API）、非 breaking（`resolvePosition` 不传 scope transform 时等价 v0.1 全局行为）。真源以代码为准——`resolvePosition` 签名扩可选 scope transform 参数 + polar / at / offset 三分支末端投影（`core/src/compile/position.ts`）、`applyScopeTransform` / `inverseScopeTransform`（`core/src/compile/scope.ts`）、inverse helper（`core/src/geometry/_transform.ts`，rotate 反角 / scale 倒数 / translate 取负）；Pass 1 / `layoutNode` / `compile/path/*` 调用 resolvePosition 时透传当前 scope chain（`core/src/compile/{compile,node}.ts`）。测试在 `core/tests/compile/scope-position.test.ts`。完整施工契约（6 项决策细节 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `da448234`；压缩前完整施工蓝图 = `git show da448234^:notes/decisions/core/v0/v0.2/alpha.1/04-relative-position-in-scope.md`。
