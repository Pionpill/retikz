# ADR-01：任意折线几何圆角 —— `<Path>` 的 `roundedCorners`

- 状态：Accepted（2026-06-16；step `label` 倒角后重定位延后，见「不在本 ADR 范围」）
- 决策日期：2026-06-15
- 关联：[v0.4-alpha.3 roadmap](./roadmap.md) · [v0.4 roadmap 候选 B](../roadmap.md#b--路径补强2026-06-12-拍板) · [core-design.md §7 AI 一等公民](../../../../../../../notes/architecture/core-design.md)

> **范围**：B1「任意折线圆角」——把矩形 / 多边形已有的 `cornerRadius` 圆角能力推广到 `<Path>` 任意折线拐角。B2「过点平滑曲线」见 [ADR-02](./02-smooth-curve-through-points.md)。

## 背景

TikZ 用路径选项 `rounded corners=<r>` 把路径拐角倒成半径 `r` 的圆角，是日常画流程图 / 布线 / 折线连接的高频能力。塑造本决策的三条硬约束：

- retikz 现状只有**闭合形状 / 自包含 step** 能圆角（rectangle 的 `cornerRadius`、rectangle / polygon / star shape 边界的 fillet）；`<Path>` 的任意 `line` 折线拐角无法倒圆，用户画折线连线只能得到尖角。
- core 已有成熟 fillet 几何（`geometry/contour.ts` 的 `filletContour` / `contourCommands`：对相邻段求切圆弧、按 turn 定弧向、半径过大二分 clamp），但它**假定闭合 contour**（缝含首尾环绕），直接用于开放折线会把首尾也错当拐角倒。
- `PathSchema` 的 `lineJoin: 'miter' | 'round' | 'bevel'` 是**纯描边渲染**的 join 样式（不改几何、不影响 bbox / 连接点 / 填充区 / 弧长 / marks 参数），与本 ADR 的**几何**倒角正交，是两码事——见「影响 · 与 lineJoin 区分」。

## 决策：path 级 `roundedCorners`，编译期对 line↔line 内接缝插 fillet 弧

给 `PathSchema` 加可选 path 级字段 `roundedCorners?: number`（对齐 TikZ `rounded corners=<r>`）。编译期在折线的**内部 line↔line 接缝**逐个插 fillet 圆弧；缺省 / 省略 → 全尖角，现有行为逐字不变。

接缝处理的两条已拍板规则：**`fold` 接缝不参与圆角，保持尖角**（与其它非 line 接缝一致，fold 倒角留后续）；路径以 `cycle` 闭合时，把**闭合接缝纳入 fillet**（闭合后等价闭合 contour，复用现有闭合 seam 逻辑）。

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
```

理由：

1. **拐角是「两 step 之间」的接缝，path 级最贴 TikZ 模型**——挂到单个 step 上语义含糊（这个 step 的哪一端？），TikZ 本身就是 path option，一个半径管全路径所有合格拐角最自然、最 LLM 直觉。
2. **复用已有 fillet 几何，churn 最小**——`filletContour` / `contourCommands` 已实现切圆弧 + clamp，B1 主要是「接线 + 把闭合 fillet 推广到开放折线」，不新造几何。
3. **只产既有 PathCommand（line + arc），renderer 零改动**——守 renderer-agnostic 红线；几何倒角 vs 描边 join 正交、可共存。

> 实现：core `9f3f3a49`（schema+spec）→ `3b04e046`（折线接缝圆角编译）→ `9ac26761`（react `<Path>` / vanilla draw 透传），修正 `dbdb7cee`；测试 `packages/kernel/core/tests/compile/path-rounded-corners.test.ts`；最终 schema / 行为以代码为准。

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

vanilla（`draw` 的 path 级 config）与 react 同消费一份 IRPath、同字段，用法见文档站 `<Path>` 页。

## 影响

- **与 `lineJoin` 区分**：`roundedCorners` 改**几何**（端点回退 + 插弧 → 影响 bbox / 弧长 / 路径级 `marks` 归一化参数 / 填充区 / 连接点解析）；`lineJoin` 只改**描边视觉**。文档须并排说明、给「几何圆角 vs 描边 round join」对照，避免误用。（step `label` 的倒角后重定位见「不在本 ADR 范围」。）
- **对外 API**：react `<Path>` 加 `roundedCorners` prop；vanilla `DrawConfig` 加 `roundedCorners`。均 optional、additive，无 breaking。

## 不在本 ADR 范围

- **per-corner 半径覆盖**（path 级半径之外逐拐角微调）——推迟。
- **path 中途 `sharp corners` / `rounded corners` 切换**（TikZ 支持）——需 per-段开关状态机，推迟。
- **曲线-直线 / 弧-直线接缝倒角**——依赖切点求解，`contour.ts` 现拒绝 arc-arc 倒角，推迟。
- **fold 接缝倒角**——本轮 fold 保持尖角，倒角留后续。
- **step `label` 随倒角几何重定位**——本轮路径级 `marks` 已按倒角后弧长重采样；但 step 边标注（`label`）在编译期逐 step 产出、定位在该 step 自身的（未缩短）线段上，不随接缝倒角缩短重算。视觉影响小（缩短对称、中点几乎不动），但近拐角的 label 会贴在原尖角侧。完整「label 跟随倒角几何」需把 label 产出推迟到倒角之后并按 step→倒角后命令映射重采样，留后续。
- **过点平滑曲线**——[ADR-02](./02-smooth-curve-through-points.md)。
- **装饰 motif**（波浪 / 花括号 / 弹簧）——roadmap B4，归 extension，另议。

---

> 🔖 本文件压缩前完整施工蓝图 = `git show fd0a8598:_notes/decisions/core/v0/v0.4/alpha.3/01-polyline-rounded-corners.md`（封板全文）。
