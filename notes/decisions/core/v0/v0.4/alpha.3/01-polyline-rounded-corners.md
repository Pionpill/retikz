# ADR-01：任意折线几何圆角 —— `<Path>` 的 `roundedCorners`

- 状态：Proposed
- 决策日期：2026-06-15
- 关联：[v0.4-alpha.3 roadmap](./roadmap.md) · [v0.4 roadmap 候选 B](../roadmap.md#b--路径补强2026-06-12-拍板) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · core `geometry/contour.ts`（`filletContour` / `contourCommands`）· `ir/path/path.ts`（`PathSchema`）· `compile/path/index.ts`

> **范围**：B1「任意折线圆角」——把矩形 / 多边形已有的 `cornerRadius` 圆角能力推广到 `<Path>` 任意折线拐角。B2「过点平滑曲线」见 [ADR-02](./02-smooth-curve-through-points.md)。

## 背景

TikZ 用路径选项 `rounded corners=<r>` 把路径拐角倒成半径 `r` 的圆角，是日常画流程图 / 布线 / 折线连接的高频能力。

retikz 现状只有**闭合形状 / 自包含 step** 能圆角：`rectangle` step 有 `cornerRadius`（step.ts:391，编译走 `rectOutline` 四分之一弧），`rectangle` / `polygon` / `star` shape 的边界经 core `geometry/contour.ts` 的 `filletContour` 倒角。**`<Path>` 的任意 `line` 折线拐角无法倒圆**——用户画一条折线连线，拐角只能是尖角。

core 已有成熟 fillet 几何：`geometry/contour.ts` 的 `filletContour(segments, radius)` 对相邻段求切圆弧、按 turn 方向定弧向、半径过大时二分 clamp 到可行最大值；`contourCommands` 把 fillet 解转成 `move/line/arc/close`。但该模块**假定闭合 contour**（缝含首尾环绕），直接用于开放折线会把首尾也错误地当成拐角倒。

注意 `PathSchema` 已有 `lineJoin: 'miter' | 'round' | 'bevel'`（path.ts:128），但那是**纯描边渲染**的 join 样式（不改几何、不影响 bbox / 连接点 / 填充区 / 弧长 / marks 参数），与本 ADR 的**几何**倒角是两码事——见「影响 · 与 lineJoin 区分」。

## 决策：path 级 `roundedCorners`，编译期对 line↔line 内接缝插 fillet 弧

给 `PathSchema` 加可选 path 级字段 `roundedCorners?: number`（对齐 TikZ `rounded corners=<r>`）。编译期在折线的**内部 line↔line 接缝**逐个插 fillet 圆弧；缺省 / 省略 → 全尖角，现有行为逐字不变。

```ts
// ir/path/path.ts —— PathSchema 增字段
roundedCorners: z
  .number()
  .finite()
  .nonnegative()
  .optional()
  .describe(
    'Geometric corner radius (TikZ `rounded corners=`) applied to every line-to-line joint of the path. This rounds the path GEOMETRY (pulls the joint vertices back and inserts a tangent arc) — distinct from `lineJoin` which only styles the stroke render. Joints touching a curve / arc / bezier / fold segment stay sharp. Per-joint radius is clamped to what the adjacent segment lengths allow. Omitted = sharp corners (current behavior, unchanged).',
  ),

// compile/path/index.ts —— 折线点序 → 内部 line-line 接缝插弧
// 复用 geometry/contour.ts 的 fillet 解算，扩展其支持「开放 seam 序列」：
//   开放折线只倒内部接缝，首点 / 末点保持尖（不环绕）；
//   路径以 cycle 闭合时，把闭合接缝也纳入 fillet（等价闭合 contour）。
// 每个合格接缝：相邻两 line 端点按 fillet 解回退 + 插一段 arc PathCommand。
```

理由：

1. **拐角是「两 step 之间」的接缝，path 级最贴 TikZ 模型**——挂到单个 step 上语义含糊（这个 step 的哪一端？），TikZ 本身就是 path option，一个半径管全路径所有合格拐角最自然、最 LLM 直觉。
2. **复用已有 fillet 几何，churn 最小**——`filletContour` / `contourCommands` 已实现切圆弧 + clamp，B1 主要是「接线 + 把闭合 fillet 推广到开放折线」，不新造几何。
3. **只产既有 PathCommand（line + arc），renderer 零改动**——守 renderer-agnostic 红线；几何倒角 vs 描边 join 正交、可共存。

## 待决策点 🔻

- **`fold` 是否参与圆角**：**已拍板 = 不参与，保持尖角**（2026-06-15 人工签字）。fold 与其它非 line 接缝一致保持尖；fold 倒角留后续。已并入「测试象限 · 交互」与「DSL 表面」。
- **`cycle` 闭合接缝**：纳入 fillet（闭合后等价闭合 contour，复用现有闭合 seam 逻辑）。已并入测试象限。

## DSL 表面

react（kernel `<Path>` prop）：

```tsx
<Path stroke="steelblue" roundedCorners={8}>
  <Step kind="move" to="A" />
  <Step to="B" />
  <Step to="C" />
  <Step kind="cycle" />
</Path>
```

vanilla（`draw` 的 path 级 config，与 react `<Path>` 同消费 IRPath）：

```ts
import { figure, draw } from '@retikz/vanilla';

const fig = figure([
  draw(['(A)', '(B)', '(C)', DrawWay.Cycle], {
    stroke: 'steelblue',
    roundedCorners: 8,
  }),
]);
```

两套都只是把 `roundedCorners` 透传进同一份 IRPath；字段单一真源（zod schema），无适配器特异逻辑。

## 测试设计

`packages/core/core/tests/compile/path-rounded-corners.test.ts`（新建）+ path schema 测试覆盖：

- 折线 line-line 内拐角倒圆（单 / 多拐角）
- cycle 闭合接缝倒圆
- 缺省 / 0 半径逐字回退尖角
- 半径过大 clamp
- 非 line 接缝（curve / arc / fold）保持尖角
- schema 拒绝非法半径
- 与 marks/label 弧长、rotate/scale 的交互

具体 case 拆分见「实现契约 § 测试象限」。

## 影响

- **现有代码**：`PathSchema` 加字段（additive）；`compile/path/index.ts` 折线编译路径加 fillet 分支；`geometry/contour.ts` 扩展开放 seam 序列支持（现有闭合调用方 rectangle/polygon/star 行为不变——开放支持是新增入口，不改闭合语义）。
- **与 `lineJoin` 区分**：`roundedCorners` 改**几何**（端点回退 + 插弧 → 影响 bbox / 弧长 / `marks`·label 归一化参数 / 填充区 / 连接点解析）；`lineJoin` 只改**描边视觉**。文档须并排说明、给「几何圆角 vs 描边 round join」对照，避免误用。
- **文档站**：`<Path>` 页加 `roundedCorners` prop（API 表 + 双语说明 + demo：折线圆角 vs 尖角、与 `lineJoin:round` 对照）。
- **对外 API**：react `<Path>` 加 `roundedCorners` prop；vanilla `DrawConfig` 加 `roundedCorners`。均 optional、additive，无 breaking。

## 不在本 ADR 范围

- **per-corner 半径覆盖**（path 级半径之外逐拐角微调）——推迟。
- **path 中途 `sharp corners` / `rounded corners` 切换**（TikZ 支持）——需 per-段开关状态机，推迟。
- **曲线-直线 / 弧-直线接缝倒角**——依赖切点求解，`contour.ts` 现拒绝 arc-arc 倒角，推迟。
- **fold 接缝倒角**——本轮 fold 保持尖角（待决策点已拍板），倒角留后续。
- **过点平滑曲线**——[ADR-02](./02-smooth-curve-through-points.md)。
- **装饰 motif**（波浪 / 花括号 / 弹簧）——roadmap B4，归 extension，另议。

---

## 实现契约（必填）🔻

> 下游 implement / test / document / wrapup 阶段的硬约束。偏离需开新 ADR 或本 ADR 加条重审。

### Level

`red`

- 动 `packages/core/core/src/ir/path/path.ts`（IR schema）+ `packages/core/core/src/compile/path/index.ts`（compile）→ red。
- react `<Path>` / vanilla `DrawConfig` 加 prop（yellow / 适配器）跨级取最高 = **red**。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/path/path.ts` | 加 | `roundedCorners` | `z.number().finite().nonnegative().optional()` | — (省略 = 尖角) | 路径所有 line-line 接缝的几何圆角半径；区别于 `lineJoin`（仅描边）；非 line 接缝保持尖；按段长 clamp |
| `packages/core/react/src/kernel/Path.tsx` | 加 | `roundedCorners` | `IRPath['roundedCorners']` | — | `<Path>` prop，透传 |
| `packages/core/vanilla/src/builder/types.ts` | 加 | `roundedCorners` | `IRPath['roundedCorners']`（`DrawConfig`） | — | `draw` path 级 config，透传 |

字段名 `roundedCorners` 写死，下游不得改。

### 文件 scope

- `packages/core/core/src/ir/path/path.ts`（改：加字段）
- `packages/core/core/src/compile/path/index.ts`（改：折线接缝 fillet 接线 + cycle 闭合接缝）
- `packages/core/core/src/geometry/contour.ts`（改：扩展开放 seam 序列支持，不改闭合语义）
- `packages/core/core/tests/compile/path-rounded-corners.test.ts`（新建）
- `packages/core/core/tests/ir/path-schema.test.ts`（改 / 若无则新建：roundedCorners accept/reject）
- `packages/core/react/src/kernel/Path.tsx`（改：`PathProps` 加 `roundedCorners`）
- `packages/core/vanilla/src/builder/types.ts`（改：`DrawConfig` 加 `roundedCorners`）
- `packages/core/react/tests/kernel/builder.test.tsx`（改：roundedCorners 入 IR）
- `apps/docs/src/contents/core/components/.../path` 对应 mdx（改）+ demo `.tsx`（新建）

### 测试象限

**Happy path（≥ 3）**：

- `polyline-single-corner`：3 点折线（line-line 单内拐角）+ `roundedCorners=r` → 该拐角端点按 r 回退、插一段 arc command；起点 / 终点保持尖。
- `polyline-multi-corner`：5 点折线（多内拐角）→ 每个 line-line 内拐角都倒出半径 r 的 arc。
- `rounded-with-cycle`：折线 + `cycle` 闭合 + `roundedCorners=r` → 闭合接缝也倒（等价闭合 contour 所有拐角）。

**边界（≥ 2）**：

- `radius-zero-noop`：`roundedCorners=0` → 输出与无该字段逐字一致（全尖角）。
- `radius-clamp`：`r` > 相邻段长一半 → clamp 到可行最大值，arc 不溢出段、两端落在各自段内。
- `single-segment-noop`：仅 2 点单 line（无内拐角）→ `roundedCorners` 无 op。

**错误路径（≥ 2）**：

- `reject-negative`：`roundedCorners=-1` → schema parse 拒绝。
- `reject-nonfinite`：`roundedCorners=NaN/Infinity` → schema parse 拒绝（`.finite()`）。

**交互（≥ 2）**：

- `mixed-curve-joint-stays-sharp`：接缝一侧为 `curve` / `arc` / `cubic` / `bend` → 该接缝保持尖角，同路径其余 line-line 接缝仍倒。
- `fold-joint-stays-sharp`：路径含 `fold` step → fold 相关接缝保持尖角（待决策点拍板：fold 不参与）。
- `marks-arclength-recompute`：`roundedCorners` + path `marks`（pos∈[0,1]）/ step `label` → mark/label 按倒角后新弧长重定位、落在倒角后几何上（验证决策声明的「影响 marks/label 归一化参数」真被实现）。
- `rounded-with-rotate-scale`：`roundedCorners` + path 级 `rotate` / `scale` → 几何圆角先算、再随 path 变换，结果正确。

### 依赖的现有元素

- `filletContour` / `contourCommands` / `boundaryFromContour`（`geometry/contour.ts`）—— **扩展**（加开放 seam 序列支持）。
- `PathSchema`（`ir/path/path.ts`）—— **修改**（加字段）。
- path 编译主流程 `emitPath*`（`compile/path/index.ts`）—— **修改**（折线接缝插弧）。
- `lineJoin`（`ir/path/path.ts`）—— **仅引用**（文档区分语义，不改）。
- `rectOutline` / rectangle `cornerRadius`（`geometry/rect.ts` / `ir/path/step.ts`）—— **仅引用**（圆角先例，对齐 clamp 行为）。
- `marks`（`ir/path/path.ts`）—— **引用**（交互测试，倒角后弧长重算）。
- react `PathProps`（`react/src/kernel/Path.tsx`）/ vanilla `DrawConfig`（`vanilla/src/builder/types.ts`）—— **扩展**（透传 prop）。
