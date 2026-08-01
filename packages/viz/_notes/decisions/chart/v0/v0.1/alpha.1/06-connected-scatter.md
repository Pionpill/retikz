# ADR-06：Connected Scatter 的 Point + Path 配方

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-05](./05-bubble.md)

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

## 行为、失败语义与兼容性

- 缺 `order` 时 schema fail-loud；Chart 不猜测时间字段、行序或路径优化
- `series` 决定 Path 分组；color constant 可统一着色，color field 可决定分组着色
- 省略 `series` 而提供 color field 时，Path 按 color field 分组，避免跨颜色连接
- 只有 `series` 时 Chart 提供稳定 categorical color default；连续 / temporal 字段必须由用户显式给出兼容 color scale
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
