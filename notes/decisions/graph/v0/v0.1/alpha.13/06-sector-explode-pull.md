# ADR-06：sector pull visual offset

状态：Proposed
决策日期：2026-06-28
关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [alpha.13 ADR-02 quantile-band statistics + boxplot composition](./02-quantile-band-boxplot.md) · [alpha.13 ADR-05 stat-geom structural surface](./05-stat-geom-surface.md) · [plot-design.md §13](../../../../../architecture/plot-design.md) · [core-design.md §7](../../../../../architecture/core-design.md)

## 背景

plot 当前已经能用 `IntervalMark` 在 `polar2D` 下表达 pie / donut / radial bar：interval 的正交 cell 会被 `polar2D.projectCell` 投影成 sector，再由 core 的 `sector` shape 渲染。`padAngle` 也已经作为 sector 专用视觉参数存在，它只缩小 sector 的角度边界，不引入新的 chart mark。

v0.1 roadmap 里还留着一个常见需求：让单个扇区从圆心向外“拉出”一点，用于静态强调。这个需求在可视化生态里常被叫作 `explode`，但它如果直接进入 plot 容易把三个概念混在一起：

1. 静态几何偏移：某个 datum 预先声明向外偏移多少。
2. 交互高亮：hover / selected 时临时偏移。
3. 布局语义变化：扇区的 anchor、locator、label、boundaryPoint 是否也一起移动。

alpha.13 的主线是底层 grammar 能力，不是交互状态管理，也不是 chart preset。若本 ADR 做 `explode` 高亮系统，会反向拖住统计闭环；若完全顺延，又会让 pie / donut 的静态强调能力继续缺口。因此本 ADR 只处理静态、JSON-safe、可测试的 sector 视觉偏移。

## 决策：新增 `IntervalMark.pull`，不新增 `explode`

在 `IntervalMark` 上新增 `pull` 字段，表示 polar sector 沿自身中分角向外平移的距离。`pull` 是静态 mark style value，支持常量和字段绑定；单位是最终 user units；默认值为 0。

不新增 `explode` 字段。理由是 `explode` 在图表语境里容易暗示“当前 slice 被交互高亮 / 分离状态”，而 `pull` 更接近 TikZ / 几何语义：沿径向把扇区拉出一段距离。交互态、hover highlight、selected state 都不进入本 ADR。

语义约束：

1. `pull` 只适用于 `IntervalMark` 在 `polar2D` 下生成的 sector geometry。若同一 mark 在 cartesian / ternary / contour / custom non-sector geometry 下设置 `pull`，lowering 必须 fail-loud，不允许静默忽略。
2. `pull` 的方向是 sector 输出空间的中分角 `(startAngle + endAngle) / 2`。正值向外，0 不移动；负值 schema reject。
3. `pull` 作用在 cell geometry 层：sector 的 `center` 与最终 core `Node.position` 一起平移，sector shape params 的 `innerRadius` / `outerRadius` / `startAngle` / `endAngle` 不变。
4. locator 与 rendering 必须共享同一份 pulled cell geometry。`datumAnchor`、`createPlotLocator().datum()`、series centroid、anchor id 对应的位置都应反映 pull 后的位置。
5. label 跟随 host node。由于 sector 仍是 core Node，node label、anchor、boundaryPoint 都随 `Node.position` 平移；不需要修改 core `sector` shape schema。
6. `padAngle` 与 `pull` 可同时使用。先按 `padAngle` 缩小角度，再按缩小后的 sector 中分角计算 pull 方向，避免视觉中心和偏移方向不一致。

推荐实现形态是把 sector-only 样式从 `applySectorStyleParams` 抽成共享 helper，例如：

```ts
const applySectorVisualParams = (
  geometry: CellGeometry,
  mark: IntervalMark,
  row: ExternalRow,
  channels: MarkChannels,
): CellGeometry => {
  // 1. reject non-sector geometry when pull is set
  // 2. apply padAngle to sector angles
  // 3. resolve pull and translate sector.center along the final mid angle
};
```

这样 lowering 与 locator 都可以在 `cell -> geometry -> pulled geometry -> anchor/node` 这条路径上复用同一逻辑，避免渲染看起来被拉出、locator 仍停在原位。

## 待决策点

- **字段名是否保留 `explode` 别名**：本 ADR 倾向不保留。`0.x` 阶段不为旧写法背兼容负担，且 `explode` 容易把静态偏移和交互态混淆。
- **pull 单位是否用半径比例**：本 ADR 倾向 user units。比例会依赖当前 plot layout 的 `outerRadius`，使同一 spec 在不同尺寸下的偏移语义变化；user units 与 `padAngle` / strokeWidth / label distance 的绝对几何风格一致。
- **是否允许 `pull` 超过半径**：schema 只要求非负有限数，不做上界限制。过大 pull 是用户显式视觉选择；实现只需保证不会产生 NaN / Infinity。
- **field-bound pull 缺失值如何处理**：沿用 style channel 现有语义。无法解析为有限非负数时 fail-loud，而不是当成 0，避免单片高亮字段拼错时静默失效。

## DSL 表面

React 静态强调单片：

```tsx
<Plot data={share} coordinate={{ type: 'polar2D', innerRadius: 0.45 }}>
  <IntervalMark
    angle="value"
    color="name"
    padAngle={2}
    pull="offset"
  />
</Plot>
```

等价 PlotSpec / Vanilla：

```ts
renderPlot(
  {
    namespace: 'retikz.plot',
    type: 'plot',
    data: { reference: 'share' },
    coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', innerRadius: 0.45 },
    marks: [
      {
        type: 'interval',
        encoding: {
          x: { field: 'value', scale: 'angle' },
          y: { value: 1, scale: 'radius' },
          color: { field: 'name', scale: 'color' },
        },
        bounds: {
          x: { kind: 'proportional', field: 'value' },
          y: { kind: 'full' },
        },
        padAngle: 2,
        pull: { kind: 'field', value: 'offset' },
      },
    ],
  },
  { share },
);
```

数据里可以只让某一行有非零 offset：

```ts
const share = [
  { name: 'A', value: 40, offset: 0 },
  { name: 'B', value: 24, offset: 12 },
  { name: 'C', value: 18, offset: 0 },
];
```

## 测试设计

`packages/graph/plot/tests/lower/sector-pull.test.ts` 覆盖 schema、lowering、locator 的几何一致性：

- 常量 `pull` 让 polar sector Node.position 沿中分角平移。
- field-bound `pull` 只移动有非零字段值的 datum。
- `padAngle + pull` 同时存在时，pull 使用 pad 后的中分角。
- `pull=0` 与未设置 pull 的几何一致。
- donut sector 与 pie sector 都可 pull，shape params 的半径与角度不被 pull 改写。
- cartesian interval 设置 `pull` 时 fail-loud。
- ternary interval / custom non-sector cell 设置 `pull` 时 fail-loud。
- field-bound pull 为负数、非有限数或非数值时 fail-loud。
- `createPlotLocator().datum()` 返回 pull 后 anchor。
- `createPlotLocator().series()` 的 centroid 使用 pull 后各 datum anchor。
- React `<IntervalMark pull="offset" />` 产物与手写 PlotSpec 等价。
- Vanilla `renderPlot` 消费同一 PlotSpec 时输出 SVG path，且不需要 chart preset。
- docs pie / donut demo 显示静态 pulled slice，不引入 hover / selected 文案。

## 影响

- `@retikz/plot` public mark schema 新增 `IntervalMark.pull`。
- `@retikz/plot-react` 新增 `<IntervalMark pull={...}>` prop。
- `@retikz/plot-vanilla` 不新增 builder；继续消费同一 PlotSpec。
- `lowerIntervalLayer` 与 locator 需要复用同一 sector visual geometry helper。
- docs 需要在 polar / interval 相关页面补一组静态 pulled sector demo，并明确 `pull` 不是交互高亮。
- core `sector` shape 不改；所有偏移都发生在 plot lowering 的 Node.position 层。

## 不在本 ADR 范围

- 不新增 `explode` 字段、`selected` 字段、hover highlight、animated explode、tooltip 或 interaction state。
- 不新增 `PieChart` / `DonutChart` / chart preset。
- 不修改 core `SectorParams`，不把 pull 写进 core shape schema。
- 不改变 `padAngle` 已有语义，不做 radial gap、inner / outer 半径分离间距。
- 不处理 label collision avoidance；label 只随 host node 平移。

---

## 实现契约（必填）

### Level

`yellow`

判级理由：本 ADR 新增 `@retikz/plot` public mark schema 字段与 React authoring prop，并要求 locator 与 rendering 共享 geometry 结果；但不修改 core IR / core sector schema，不引入新 mark kind，也不改 compile 核心。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `IntervalMarkSchema.pull` | `PointNonnegativeNumberStyleSchema.optional()` | 0 | polar sector 沿中分角向外平移的静态距离；支持常量或字段绑定；仅 sector geometry 可用 |
| `packages/graph/plot/src/schemas/mark/types.ts` | 派生 | `IntervalMark.pull` | `z.infer<typeof IntervalMarkSchema>` 自动包含 | 0 | interval mark 的 sector-only pull 字段 |
| `packages/graph/plot-react/src/components/marks.tsx` | 加 | `IntervalMarkProps.pull` | `MarkValueProp<number> \| PointNonnegativeNumberStyle` | 0 | React DSL 的静态 sector pull prop |
| `packages/graph/plot-react/src/components/build-plot-spec.ts` | 映射 | `pull` | React prop → PlotSpec `IntervalMark.pull` | 0 | 将字符串视为 field、数字视为 constant，结构化对象原样透传 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/schemas/mark/schema.ts`
- `packages/graph/plot/src/schemas/mark/types.ts`
- `packages/graph/plot/src/providers/mark/features/interval.ts`
- `packages/graph/plot/src/providers/mark/private/cell.ts`
- `packages/graph/plot/src/contract/coordinate/cell.ts`
- `packages/graph/plot/src/features/interaction/locate.ts`
- `packages/graph/plot/tests/lower/sector-pull.test.ts`
- `packages/graph/plot/tests/ir/mark.schema.test.ts`
- `packages/graph/plot-react/src/components/marks.tsx`
- `packages/graph/plot-react/src/components/build-plot-spec.ts`
- `packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`
- `packages/graph/plot-react/tests/components/Plot.composition.test.tsx`
- `packages/graph/plot-vanilla/tests/render-plot.test.ts`
- `apps/docs/src/contents/graph/grammar/mark/interval/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/mark/interval/index.en.mdx`
- `apps/docs/src/contents/graph/grammar/mark/interval/interval-pull.demo.tsx`
- `apps/docs/src/contents/graph/grammar/mark/interval/interval-pull.data.ts`
- `apps/docs/src/contents/graph/grammar/coordinate/2d/index.zh.mdx`
- `apps/docs/src/contents/graph/grammar/coordinate/2d/index.en.mdx`

偏离白名单的改动需要回本 ADR 加条或另开 ADR。不得在本 ADR 下修改 `packages/kernel/core/**` 的 sector schema / compile 行为。

### 测试象限

**Happy path（≥ 3）**：

- `sector-pull-constant`：常量 pull 将 sector Node.position 沿中分角平移。
- `sector-pull-field`：field-bound pull 按 datum 分别解析，只移动非零行。
- `sector-pull-pad-angle`：`padAngle` 与 `pull` 同时存在时，pull 使用最终 sector 中分角。
- `sector-pull-donut-and-pie`：innerRadius 为 0 和大于 0 都可稳定渲染。

**边界（≥ 2）**：

- `sector-pull-zero`：`pull: 0` 与未设置 pull 输出一致。
- `sector-pull-large-finite`：大 pull 保持有限几何，不改写半径 / 角度 params。
- `sector-pull-label-anchor`：node label / anchor id 跟随 pulled Node.position。

**错误路径（≥ 2）**：

- `sector-pull-cartesian-rejected`：cartesian interval 设置 pull fail-loud。
- `sector-pull-non-sector-rejected`：ternary / custom non-sector geometry 设置 pull fail-loud。
- `sector-pull-negative-rejected`：负数 pull schema reject。
- `sector-pull-invalid-field-rejected`：field-bound pull 解析为非数值 / 非有限值 fail-loud。

**交互 / 等价（≥ 2）**：

- `sector-pull-locator-datum`：locator datum anchor 与渲染 Node.position 一致。
- `sector-pull-locator-series`：series centroid 使用 pulled anchors。
- `react-sector-pull-equivalence`：React DSL 产物与手写 PlotSpec 等价。
- `vanilla-sector-pull-ssr`：Vanilla SSR 消费同一 PlotSpec 输出 sector path。

### 依赖的现有元素

- `IntervalMarkSchema.padAngle`：扩展同一类 sector-only 视觉参数；`pull` 不改变 padAngle 语义。
- `CellGeometry.kind='sector'`：扩展 / 修改；作为 pull 的唯一合法 geometry host。
- `cellGeometryNode`：引用 / 修改；sector Node.position 是 pull 的最终落点。
- `cellGeometryAnchor` / `datumAnchor`：修改；locator 与 lowering 必须共享 pull 后 geometry。
- `buildIntervalContext` / `markCell`：引用；pull 不参与 cell 区间计算，只在 cell 投影后生效。
- `PointNonnegativeNumberStyleSchema`：引用；复用现有 field-bound / constant style value 模型。
- React `normalizeMarkValue` / `buildPlotSpec` interval 分支：扩展；把 `<IntervalMark pull>` 映射为 PlotSpec。
- Vanilla `renderPlot`：引用；不新增 builder。

### 多 LLM 设计评估

尚未执行。当前草案为 `yellow`，进入实现前应按 `develop-design` 流程补至少一轮独立设计评估，或由人工明确接受本 ADR 作为实现输入；评估重点是：`pull` 是否应进入 `CellGeometry` 还是只在 interval lowering 层生效、locator parity 是否覆盖充分、非 sector fail-loud 是否过严。
