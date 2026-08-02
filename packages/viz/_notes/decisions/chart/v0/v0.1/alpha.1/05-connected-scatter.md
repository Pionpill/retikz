# ADR-05：Connected Scatter 的 Point + Path 配方

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04](./04-scatter.md)

## 背景与目标

Connected Scatter 用点表示观察值，并按稳定顺序连接它们以强调二维轨迹。连接不是可关闭的装饰；只有 Point 或只有 Path 都不再是该 Canonical Type。

## 决策：`connected-scatter` 固定 points 与 connection 两个核心 Mark

```ts
type ConnectedScatterChartSpec = ChartCommon & {
  type: 'connected-scatter';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    order: string;
    series?: string;
    color?: StrictColorChannel;
  };
  mark?: ConnectedPointPatch;
  components?: { connection?: ConnectedPathPatch };
};
```

recipe 固定生成一条开放 Path 与一个 Point Mark：connection 先绘制，points 后绘制；两者共享 x / y、active view 与颜色语义，Path 使用必需 `order`，可按 `series` 分组。两个 Mark、共同位置角色、Path 顺序和开放轨迹共同构成不可撤销核心。

`mark` 只调整 points 的表现字段；`components.connection` 只调整 Path 的 curve 与表现样式。两者都不能修改 type、identity、encoding、order / series、closed 状态、transform、coordinate ownership 或核心层级。

`ConnectedPointPatch` 精确复用 ADR-04 `ScatterPointPatch`，并额外排除 `layer`，保证 points 相对 connection 的核心层级不可被 patch 改写。`ConnectedPathPatch` 是 strict object，只允许以下 Plot Path 公开字段：

```text
curve, connectNulls, strokeWidth, opacity, lineCap, lineJoin,
roundedCorners, fill, stroke, strokeOpacity, fillRule, thickness,
marks, dashPattern, shadow, blendMode, label
```

这些字段的 value contract 直接复用 Plot Path。`type`、`id`、`encoding`、`order`、`series`、`closed`、`closure`、`transform`、`coordinateView`、`anchorId`、`zIndex`、`rotate` 与 `scale` 明确不属于 patch。Points 的 recipe color 与核心 layer 先成立再应用 `mark`；connection 的 recipe color / grouping / layer 先成立再应用 `components.connection`，patch 不能穿透到核心字段。任何 patch 携带 `layer` 均在 strict schema 阶段 fail-loud。

两个核心 Mark 的颜色使用同一个 resolved color 语义。constant color 分别写入 Point 的 `color` 与 Path 的 `stroke`；field color 写入 Point 的 field-bound `color` 与 Path 的 `encoding.color`，并共享同一 scale identity。这样既复用两个 Plot owner 的正式形态，也让后应用的 `mark.color` 或 `components.connection.stroke` 能覆盖对应核心成员的 recipe color，而不暴露任意 Path encoding。

显式 color field 使用 authored `color.scale`；未 authored scale 时使用保留 identity `__chart.connected-scatter.scale.color` 的 Plot ordinal scale，并把最终 `data.palette.categorical` 物化为它的 range。省略 `color` 而存在 `series` 时，recipe 将 `series` 作为两者共同的 field-bound color，使用保留 identity `__chart.connected-scatter.scale.series-color` 的 Plot ordinal scale，并把最终 `data.palette.series` 物化为 range。用户可以通过正式 `scales` 成员按对应 identity 调整 Chart 合成的 scale；字段类型与 scale family 的兼容性仍由 Plot fail-loud。省略 `series` 而使用 color field 时，该 field 同时成为 Path series。

field color 与 series-only 两个 field-bound 分支在默认 legend 允许时各生成一个 Plot color legend，并绑定上述实际共享的 scale identity。`legend.enabled: false` 抑制该 default；显式 `guides` 按 ChartCommon 规则整体替换所有表现性 defaults。显式 constant color（无论是否同时存在 `series`）和 `color` / `series` 都省略的共享 constant 都不生成 color scale、descriptor 或 legend。

`color` 与 `series` 都省略时，recipe 从最终 Chart / Plot series palette 的第一项解析一个共享 constant color，再分别写入 Point `color` 与 Path `stroke`；最终 palette 已应用 preset / mode / `styleTokens`、`colors` 与 `theme` 的既定级联，因此 Chart 不硬编码颜色，也不依赖 Plot 按 mark index 选择两个可能不同的默认色。该共享 constant 是可被 `mark.color` / `components.connection.stroke` 继续覆盖的 type presentational default，不合成 scale、descriptor 或 legend。显式 color 始终优先于 series-only 和无分组默认，但不改变 Path grouping 规则。

## 行为、失败语义与兼容性

- 缺 `order` 时 schema fail-loud；Chart 不猜测时间字段、行序或路径优化
- `series` 决定 Path 分组；color constant 可统一着色，color field 可决定分组着色
- color 与 series 都省略时，Point 与 Path 使用最终 series palette 第一色的同一 resolved constant，不因核心 Mark 数组位置产生不同默认色
- 省略 `series` 而提供 color field 时，Path 按 color field 分组，避免跨颜色连接
- field color 未指定 scale 时，两个核心 Mark 通过同一保留 ordinal scale 消费最终 categorical palette；continuous / temporal 字段必须显式引用兼容的 color scale
- 只有 `series` 时，两个核心 Mark 通过同一保留 ordinal scale 消费最终 series palette；若数据模型把该字段声明为 continuous / temporal，Plot 按正式 field / scale compatibility 诊断 fail-loud，用户必须显式提供兼容的 `color` 与 scale，而不是让 Chart 猜测离散化
- field-bound color 在 default legend 允许时生成一个绑定实际共享 scale identity 的 color legend；constant color 与无 color / series 的 palette constant 不生成 legend，显式 guides 整体替换 defaults
- `series` 与不同 color field 同时存在时，Plot 必须验证每个 series 内颜色恒定；Chart 不预扫描 runtime rows，也不合成复合 key
- coordinate / composition 复用 ADR-04 的二维 role contract；Path、Point 与 axes 始终属于同一 active/default view
- 核心 Mark 缺失、顺序改变、x / y / order / series 不一致、轨迹被闭合、保留 identity 冲突或 coordinate 不兼容均 fail-loud

## 功能与包边界

- Chart 拥有 Connected Scatter 的双 Mark recipe、order / series 角色、patch 边界与 categorical default
- Plot 拥有 Point / Path、stable order、series grouping、color / scale 校验、coordinate projection、lowering 与 locator
- root transform 沿 Plot 主链作用于两种 Mark 的共同输入；Chart 不复制排序、分组或 color consistency 算法

## 架构验证

- Canonical Type 判定：Point + ordered open Path 是持续成立的复合语义，不是 Scatter 的纯样式 modifier
- 内部表达：组合 Plot Point、Path、color、scale 与 coordinate，不新增 Mark 或 pipeline 能力
- 外部扩展：用户可追加正式 Plot members、custom coordinate / scale，但不能替换两个核心 Mark
- trace：inspection 记录 connection / points 两个稳定目标；presentation 前后 Point datum、Path series、provenance 与 lineage 连续

## 被否决方案

- 把连接线做成可关闭 guide / decoration：会撤销 type identity
- Chart 自己排序、扫描分组或合成 series key：会复制 Plot 数据与 Mark pipeline
- 用 renderer path 直接连接 Point：会绕过 Plot Path definition、coordinate 与 trace

## 测试策略摘要

需要 schema、双 Mark recipe、order / series / color 组合、coordinate / composition、core invariant、Plot 数据诊断、inspection / trace 与三入口 parity 证据。关键不变量是开放 Path 先于 Point、两者共享位置与 view、series / color 语义确定、追加成员不替换核心。

## 不在本 ADR 范围

- 仅 Line 或仅 Scatter
- order 自动猜测、时间解析或路径优化
- 多 view 与 animation trail
