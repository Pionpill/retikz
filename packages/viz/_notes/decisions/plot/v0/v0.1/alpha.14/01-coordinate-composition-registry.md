# ADR-01：coordinate composition registry + guide binding

- 状态：Accepted（实现字段以 ADR-09 为准）
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [plot-design.md §7](../../../../../architecture/plot-design.md) · [alpha.2 ADR-01 guide IR](../alpha.2/01-guide-ir.md) · [alpha.10 ADR-02 plot composable foundation](../alpha.10/02-plot-composable.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/graph/_notes/decisions/v0/v0.1/alpha.14/01-coordinate-composition-registry.md`

## 背景

当前 `PlotSpec` 只有一个顶层 `coordinate`。这对普通单图足够，但无法表达 alpha.14 需要的三类复合图形：facet grid 需要多个 panel coordinate scope；same-panel dual-axis 需要同一 panel 内多个位置坐标或位置 scale 叠加；shared scaffold tracks 需要多个局部图层共享部分坐标基底，再各自管理局部 range。

这些需求不能分别在 facet、dual-axis、track 里各自发明字段。否则 mark 引用坐标、axis 绑定坐标、locator 返回 provenance、React / Vanilla authoring surface 都会出现三套相似但不兼容的机制，后续 v0.3 composite 也无法把高层复合图形稳定 lower 到 plot primitive。

alpha.2 的 guide IR 已明确暂缓 `guide.coordinate` 与双轴；alpha.10 的 plot composable foundation 解决的是整张 Plot 作为 composable 单元，并没有解决 Plot 内部多个 coordinate scope 的身份、引用和 guide 绑定问题。alpha.14 的第一步应先补这个共同地基，再分别设计 facet 数据拆分、overlay 多轴和 shared scaffold tracks。

本 ADR 只处理 Plot 内部 coordinate scope 的注册、默认 scope 规则、mark / axis guide 绑定和 fail-loud 校验。scope 如何布局成 facet panel、如何同 panel 叠加、如何挂到 polar ring 或 cartesian lane，由后续 ADR-02～05 继续细化。

## 决策：引入 coordinate composition registry 作为 Plot 内多坐标空间的唯一身份层

`PlotSpec` 新增可选 `composition`。当 `composition` 存在时，Plot 内部的坐标空间由 `composition.scopes` 注册，每个 scope 拥有稳定 `id`、自己的 `coordinate`、可选 `placement`，并可被 mark 与 axis guide 通过 `coordinateScope` 引用。省略 `coordinateScope` 时绑定到 `composition.defaultScope`。

旧的单坐标写法仍作为 shorthand 保留：没有 `composition` 时，顶层 `coordinate` 会被规范化成一个隐式默认 scope。新写多 scope spec 时，`composition` 是 canonical surface，避免顶层 `coordinate` 与 `composition.scopes` 同时成为坐标真源。

```ts
type CoordinateScopeId = string;

type CoordinateScopePlacement =
  | { kind: 'root' }
  | { kind: 'panel'; slot?: string }
  | { kind: 'overlay'; target: CoordinateScopeId }
  | { kind: 'track'; scaffold: string; track: string };

type CoordinateScopeSpec = {
  id: CoordinateScopeId;
  coordinate: CoordinateOperation;
  placement?: CoordinateScopePlacement;
  meta?: JsonObject;
};

type CoordinateCompositionSpec = {
  defaultScope: CoordinateScopeId;
  scopes: Array<CoordinateScopeSpec>;
};

type PlotSpec = {
  coordinate?: CoordinateOperation;
  composition?: CoordinateCompositionSpec;
  marks: Array<MarkSpec & { coordinateScope?: CoordinateScopeId }>;
  guides?: Array<AxisGuideSpec | LegendGuideSpec>;
};

type AxisGuideSpec = {
  type: 'axis';
  dimension: string;
  coordinateScope?: CoordinateScopeId;
};
```

理由：

1. `coordinateScope` 表达的是“引用某个坐标实例”，不是“选择某种坐标类型”。它比复用 `coordinate` 字段更不容易和 `cartesian2D` / `polar2D` / custom coordinate definition 混淆。
2. registry 先解决 identity 与 reference，后续 facet、overlay、track 只扩展 scope 的生成和 placement 语义，不再改 mark / guide 的绑定方式。
3. 顶层 `coordinate` 作为 shorthand 保留，可以让现有单图 spec 不需要整体迁移；但多 scope 场景统一走 `composition`，避免双真源。
4. `placement` 只保留最小判别外形，具体 `panel` 排布、`overlay` 轴侧、`track` 带宽和共享 scaffold 在后续 ADR 中定义，避免 ADR-01 过早把 polar 或 facet 细节写死。

## 不在本 ADR 范围

- 不定义 facet row / column、panel key、空 panel、共享 / 独立 domain 策略。
- 不定义 dual-axis 的左右 / 上下轴侧、overlay z-order、grid 归属和视觉避让。
- 不定义 shared scaffold 的 basis sharing、polar ring、cartesian lane 或 mixed scope track 的具体 payload。
- 不改 legend 绑定策略。
- 不做 tooltip、hover、brush、linked highlighting。
- 不做 v0.3 composite / chart preset；高层封装后续必须 lower 到本 ADR 定义的 coordinate scope registry。
