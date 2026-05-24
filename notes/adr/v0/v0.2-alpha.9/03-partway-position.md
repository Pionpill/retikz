# ADR-03：比例 partway 定位（`{ between: [A, B], t }` + 自包含 AbsoluteTarget）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0 roadmap §v0.2](../../../plans/v0/roadmap.md) · [tikz-gap-analysis §5 定位](../../../analysis/2026-05-07-tikz-gap-analysis.md) · [v0.2 计划 §alpha.9](../../../plans/v0/v0.2.md)

## 背景

retikz 现有定位形态：笛卡尔 `[x,y]`、极坐标、`at`（方向+距离相对某节点）、`offset`（`{of, offset}` 加法偏移）、node target（`{id, anchor?, offset?}`）。**缺"两点之间按比例取点"**——TikZ 的 `($(A)!0.5!(B)$)`（A、B 连线中点）、`!t!`（比例 t 处）。这是放"中点标签""连线 1/3 处节点""两节点间均匀分布"的核心习语，加法 offset 表达不了（offset 只能定长平移，不能"随两端点移动而保持比例"）。

目标：结构化 `{ between: [A, B], t }`，`lerp(A, B, t)`。A、B 复用既有 target 解析（节点引用 / 坐标 / 极坐标 / offset），`lerpPoint` 复用 `geometry/_edge.ts` 既有实现。

**关键设计坎（评审 P1）**：端点 A、B 用什么类型？若直接用 `TargetSchema`（含 relative `{relative}` / `{relativeAccumulate}`），会有两个问题：① relative 形态需要"上一段终点"游标，在 `Node.position` 语境里无意义（节点没有"上一段"）；② `TargetSchema` 已含 `PositionSchema` 等，若再让 between 进 `TargetSchema`、端点又引 `TargetSchema`，schema 自引用成环、被迫全局 `z.lazy`。解法：端点用**自包含的 `AbsoluteTarget`**——明确排除 path-relative 形态，单独成一棵 schema，只在自身内 `z.lazy` 自引用（between 可嵌套 between），不与 `TargetSchema` 互引成跨 schema 环。

## 选项

### A. 自包含 `AbsoluteTarget` + `BetweenPosition`，复用 refPointOfTarget 解析（**推荐**）

```ts
// ir/position/between-position.ts —— 自包含端点类型（排除 path-relative，避免 Position↔Target 递归）
AbsoluteTargetSchema: z.ZodType<IRAbsoluteTarget> = z.lazy(() =>
  z.union([
    PositionSchema,        // [x, y]
    PolarPositionSchema,   // 极坐标
    NodeTargetSchema,      // { id, anchor?, offset? }
    OffsetPositionSchema,  // { of, offset }
    BetweenPositionSchema, // 递归：between 可嵌套 between
  ]),
);
BetweenPositionSchema = z.object({
  between: z.tuple([AbsoluteTargetSchema, AbsoluteTargetSchema]),
  t: z.number().min(0).max(1),   // 0..1 严格（外插推迟）
});

// 进 3 处：
//  - TargetSchema（path Step.to）追加 BetweenPosition 分支
//  - Node.position union 追加 BetweenPosition
//  - Coordinate.position union 追加 BetweenPosition

// DSL：
//  <Node position={{ between: [{ id:'A' }, { id:'B' }], t: 0.5 }} />     // A、B 连线中点
//  <Coordinate id="m" position={{ between: [[0,0], [100,60]], t: 0.3 }} />
//  <Path>...<Step to={{ between: [{ id:'A' }, { id:'B' }], t: 0.5 }} />...</Path>
```

- 解析复用 `refPointOfTarget`（`compile/path/anchor.ts`）：它已处理 NodeTarget（anchor 缺省取中心）/ Cartesian / Polar / Offset、返回**世界坐标**、并正确处理 scopeChain。给它加一个 BetweenPosition 分支：`lerpPoint(refPointOfTarget(A), refPointOfTarget(B), t)`（端点递归、世界坐标 lerp）。`refPointOfTarget` 即"AbsoluteTarget resolver"。
- Step.to：path 解析本就走 `refPointOfTarget` / `clipForTarget`，加 between 分支后天然支持，返回世界点与其它 target 同质。
- Node / Coordinate position：compile 层检测 BetweenPosition → 走同一 AbsoluteTarget resolver。为避免 `position.ts ↔ anchor.ts` / `node.ts ↔ anchor.ts` 循环依赖，between resolver 与 `refPointOfTarget` 同居 `anchor.ts`，由 **compile.ts**（顶层消费者，单向 import anchor.ts，无反向 import）在 node / coordinate 分支显式分流到它，不下沉进 `resolvePosition`。
- `t ∈ [0,1]` 严格（schema `.min(0).max(1)`）：对齐既有 `AnchorRef.{side,t}` 的 [0,1] 约定，可预期、不外插；将来放宽是 widening、非破坏。

### B. 端点直接用 `TargetSchema`（含 relative）

复用面更广但引 schema 自引用环（被迫全局 `z.lazy`）+ relative 在 Node.position 语义错位。**否决**（评审 P1 明确排除）。

### C. partway 只进 path Step.to，不进 Node.position

少改一处。但"连线中点放节点"是核心用例（Node.position），不支持就废一半价值。**否决**：Position 与 Target 都要进。

## 决策：A

理由：

1. 自包含 `AbsoluteTarget` 一次性解决 schema 递归 + relative 语义错位两个评审 P1 点。
2. 解析全复用 `refPointOfTarget` + `lerpPoint`，不新增几何 / 解析机器，blast radius 集中在 schema + 三处 union 接线 + 一个 between 分支。
3. Position 与 Target 都进，覆盖"中点节点 / 连线比例点 / 中点 step 端点"全部用例。

## 待决策点

- **AbsoluteTarget 成员集** = Cartesian / Polar / NodeTarget / OffsetPosition / BetweenPosition；**排除** RelativeTarget / RelativeAccumulateTarget。
- **`t` 范围 = [0,1] 严格**（schema 守门）；外插（t<0 / t>1，TikZ `!1.5!`）推迟，写进"不在本 ADR 范围"。
- **进 3 处 union**：TargetSchema（Step.to）/ Node.position / Coordinate.position。
- **解析归位**：between resolver 在 `anchor.ts`（扩 `refPointOfTarget`）；compile.ts node/coordinate 分支显式分流，避免 position.ts/node.ts ↔ anchor.ts 循环。
- **scopeChain 投影**：`refPointOfTarget(endpoint, nameStack, scopeChain)` 返回世界坐标。Step.to 直接用世界点（path 几何本就世界系）。Node/Coordinate.position 需要送进 `layoutNode` / coordinate 注册的是"当前 scope 局部点再投全局"——between 世界点经 `inverseTransformChain(world, scopeChain)` 反投回局部后再走既有 local→global 通道，避免双重投影。无 transforms scope / 顶层时 chain 为空、恒等。
- **端点未解析（引用未定义节点）**：refPointOfTarget 返回 null → 整个 between 解析失败 → 发既有 warn code（`UNRESOLVED_NODE_REFERENCE` 等），与其它 target 解析失败同路径处理。
- **finite 守卫**：`t` schema `.min(0).max(1)`（隐含 finite）；lerp 结果若因端点异常出非 finite，沿用既有 position 解析的失败处理（Scene 不收非 finite）。

## DSL 表面

```tsx
// 两节点连线中点放一个标注节点 + 1/3 处放一个小圆
<Layout width={320} height={160}>
  <Node id="A" position={[-120, 0]} fill="#2563eb" textColor="white">A</Node>
  <Node id="B" position={[120, 0]} fill="#16a34a" textColor="white">B</Node>
  <Node id="mid" position={{ between: [{ id: 'A' }, { id: 'B' }], t: 0.5 }} fill="#f59e0b">mid</Node>
  <Coordinate id="third" position={{ between: [{ id: 'A' }, { id: 'B' }], t: 0.33 }} />
  <Path><Step to={{ id: 'A' }} /><Step to={{ id: 'B' }} /></Path>
</Layout>
```

## 测试设计

`packages/core/tests/ir/between-position.schema.test.ts` + `packages/core/tests/compile/partway.test.ts` 覆盖：

- schema：between 各端点形态接受、t 越界拒、嵌套 between 接受、relative 端点拒
- compile：Node.position / Coordinate.position / Step.to 三处 between 解析正确（lerp 命中）
- 端点为节点引用 / 坐标 / 极坐标 / 嵌套 between
- scope 内 between（scopeChain 投影正确）
- 端点引用未定义节点 → warn + 不崩

具体 case 见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/position/between-position.ts`（新建）：AbsoluteTarget + BetweenPosition schema/type。
- `packages/core/src/ir/path/target.ts`：TargetSchema union 追加 BetweenPosition。
- `packages/core/src/ir/node.ts` / `coordinate.ts`：position union 追加 BetweenPosition。
- `packages/core/src/compile/path/anchor.ts`：refPointOfTarget / clipForTarget 加 between 分支（AbsoluteTarget resolver）。
- `packages/core/src/compile/compile.ts`：node / coordinate 分支分流 between。
- 文档：定位相关页（Node / Coordinate / Path Step）补 between demo + API。

## 不在本 ADR 范围

- **外插**（t<0 / t>1，TikZ `($(A)!1.5!(B)$)`）——schema 严格 [0,1]，将来 widening 放宽。
- **投影定位**（`($(A)!(P)!(B)$)`，垂足）——几何作图，学术，跳过。
- **沿路径比例点**（path 上的 t 处，区别于两点连线）——已有 step marking `pos` 覆盖路径上的点，本 ADR 只做"两端点之间"。
- relative / relativeAccumulate 作为 between 端点。

---

## 实现契约（必填）

### Level

`red`——动 `packages/core/src/ir/**`（新建 between-position.ts + 改 target.ts / node.ts / coordinate.ts）、`packages/core/src/compile/**`（anchor.ts + compile.ts）、`packages/core/src/index.ts`（导出）。green（docs）搭车。无 react schema 改动（DSL 直接吃对象 IR，react 透传）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/position/between-position.ts` | 新建 | `AbsoluteTargetSchema` | `z.lazy(union([Position, Polar, NodeTarget, Offset, Between]))` | — | 自包含端点类型（排除 path-relative） |
| `ir/position/between-position.ts` | 新建 | `BetweenPositionSchema` | `z.object({ between: tuple([Absolute, Absolute]), t: number().min(0).max(1) })` | — | 两端点之间按比例 t 取点（lerp） |
| `ir/path/target.ts` | 改 union | `TargetSchema` | 追加 `BetweenPositionSchema` 分支 | — | path Step.to 支持 between |
| `ir/node.ts` | 改 union | `NodeSchema.position` | 追加 `BetweenPositionSchema` | — | Node 中心支持 between |
| `ir/coordinate.ts` | 改 union | `CoordinateSchema.position` | 追加 `BetweenPositionSchema` | — | Coordinate 位置支持 between |

### 文件 scope

- `packages/core/src/ir/position/between-position.ts`（新建）
- `packages/core/src/ir/position/index.ts`（改：export between-position）
- `packages/core/src/ir/path/target.ts`（改：TargetSchema 加分支 + IRTarget 类型）
- `packages/core/src/ir/node.ts`（改：position union 加分支）
- `packages/core/src/ir/coordinate.ts`（改：position union 加分支）
- `packages/core/src/ir/index.ts`（改：re-export AbsoluteTargetSchema / BetweenPositionSchema / 类型）
- `packages/core/src/compile/path/anchor.ts`（改：refPointOfTarget / clipForTarget 加 between 分支 + 导出 resolveAbsoluteTarget 供 compile.ts 用）
- `packages/core/src/compile/compile.ts`（改：node / coordinate 分支分流 between → resolveAbsoluteTarget + inverseTransformChain）
- `packages/core/src/index.ts`（改：导出 schema + 类型）
- `packages/core/tests/ir/between-position.schema.test.ts`（新建）
- `packages/core/tests/compile/partway.test.ts`（新建）
- `packages/core/tests/compile/partway.adversarial.test.ts`（新建，Stage 3）
- `apps/docs/src/contents/core/components/node/coordinate/` 或 Node/Path 页（改 mdx + 新 demo）
- `apps/docs/src/data/changelog.ts` / i18n（收尾阶段）

### 测试象限（≥ 9）

**Happy（≥3）**：
- `between-node-midpoint`：`Node.position = { between:[{id:'A'},{id:'B'}], t:0.5 }`，A=[-120,0] B=[120,0] → 节点中心 [0,0]。
- `between-coord-third`：`Coordinate.position = { between:[[0,0],[90,0]], t:0.333 }` → 注册中心 ≈[30,0]，可被后续引用。
- `between-step-to`：`Step.to = { between:[{id:'A'},{id:'B'}], t:0.5 }` → path 端点落中点。

**边界（≥2）**：
- `between-t0-t1`：t=0 → 端点 A；t=1 → 端点 B。
- `between-nested`：`between:[ {between:[A,B],t:0.5}, C ]` 嵌套解析正确。

**错误路径（≥2）**：
- `between-t-out-of-range`：t=1.5 → schema 拒；t=-0.1 → schema 拒。
- `between-relative-endpoint-rejected`：端点 `{relative:[1,1]}` → schema 拒（AbsoluteTarget 排除 relative）。

**交互（≥2）**：
- `between-in-scope`：transforms scope 内 `Node.position = between(...)` → 投影正确（中点落 scope 局部 lerp 经 chain 投全局）。
- `between-endpoint-anchor`：端点 `{ id:'A', anchor:'north' }` → lerp 用 A 的 north anchor 点（复用 NodeTarget anchor）。

### 依赖的现有元素

- `PositionSchema` / `PolarPositionSchema` / `OffsetPositionSchema`（`ir/position/`）——引用：AbsoluteTarget 成员。
- `NodeTargetSchema`（`ir/path/target.ts`）——引用：AbsoluteTarget 成员（跨文件 import，z.lazy 化解 eval 环）。
- `TargetSchema` / `NodeSchema.position` / `CoordinateSchema.position`——修改：各加 between 分支。
- `refPointOfTarget` / `clipForTarget`（`compile/path/anchor.ts`）——扩展：加 between 分支，升为 AbsoluteTarget resolver。
- `lerpPoint`（`geometry/_edge.ts`）——引用：两端点世界点线性插值。
- `inverseTransformChain` / `applyTransformChain`（`compile/scope.ts`）——引用：Node/Coordinate between 的 scopeChain 反投影。
- `resolvePosition`（`compile/position.ts`）——引用：refPointOfTarget 内非 NodeTarget 端点解析。
