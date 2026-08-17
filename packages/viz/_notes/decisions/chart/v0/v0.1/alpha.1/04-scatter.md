# ADR-04：Scatter 与 Bubble 平级 Canonical Types

- 状态：Proposed（owner-local Plot quantitative size dependency 已满足；ADR-01 / ADR-03 的公开 capability gates 仍未解除）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md)

## 背景与目标

Scatter 与 Bubble 在用户心智、公开 API、IRChart 判别值和文档入口上平级。Scatter 比较两个位置角色，Bubble 额外要求第三个定量尺寸角色并以面积表达量级。两者共享 Point Mark、scale、coordinate、guide 与 ChartCommon，但必须保留各自的 authored intent、稳定 identity、inspection 与 JSON round-trip。

## 核心决策与基础数据结构

```ts
type ScatterChartIR = ChartCommon & {
  namespace: 'chart';
  type: 'scatter';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    color?: StrictColorChannel;
    size?: StrictSizeChannel;
    opacity?: IRPlotOpacityChannel;
    shape?: IRPlotShapeChannel;
  };
  mark?: ScatterPointPatch;
};

type BubbleChartIR = ChartCommon & {
  namespace: 'chart';
  type: 'bubble';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    size: StrictSizeFieldChannel;
    color?: StrictColorChannel;
    opacity?: IRPlotOpacityChannel;
    shape?: IRPlotShapeChannel;
  };
  mark?: BubblePointPatch;
};
```

两者分别进入封闭 `IRChart` union，各自固定生成一个 Point 主 Mark、二维 coordinate / composition root 以及 x / y axis 表现性 defaults。x / y 与主 Point identity 是共同核心；Bubble 的 size 是不可撤销的第三个定量 field role，按 Plot size channel 的面积感知语义解析。

```ts
type StrictColorChannel = { field: string; scale?: string } | { value: string };
type StrictSizeFieldChannel = { field: string; scale?: string };
type StrictSizeChannel = StrictSizeFieldChannel | { value: number };
```

`StrictSizeChannel` 为 strict object；field branch 可引用 sqrt scale，value branch 要求非负有限数并拒绝 `scale`。Scatter 的 size 可缺省、绑定字段或使用常量，显式 `mark.size` 可按 Plot Point 契约覆盖最终值。Bubble 的 `encoding.size` 必须是 field branch，`mark` 与 nested encoding 均不得提供第二个 size 来源。

`ScatterPointPatch` 是 Plot Point Mark 的能力投影，排除 `type`、`id`、`transform`、`coordinateView` 及核心 x / y；Bubble 在此基础上排除所有 Point-local `size` 与会替换 glyph 的 `encoding.text`。patch 严格拒绝未知字段，应用顺序为 recipe visual encoding 后按 authored leaf 覆盖非核心字段，保留 x / y 与 type identity。Plot 新增的非核心、非 size 且不替换 glyph 的公开能力可沿同一投影进入。

## 行为、默认值、失败语义与兼容性

- 缺省使用 Cartesian2D；显式 Cartesian2D、Polar2D 或兼容自定义 coordinate 由 Plot registry 与 role projection 处理
- `coordinate` 与 `composition` 互斥；active/default view 必须提供精确二维角色，Point 与 axes 属于同一 view
- color 与其它视觉角色复用 Plot channel contract；位置 scale 由 Plot 根据 binding、data model 与显式 scale 解析
- 最终 size 为 field 且 guides 缺省、`chart.legend.enabled` 为 true 时生成 size legend default；显式 guides 整体替换表现性 defaults
- 最终 size 为 constant 时直接作为 Point 半径，不生成 field descriptor 或 size legend
- Bubble 缺少 field-bound size、提供 constant size、提供第二个 size 来源或引用非 sqrt scale 时 fail-loud
- Bubble size field 已知为 categorical、temporal 或其它非 quantitative 类型时 fail-loud；Chart 不预扫描 rows
- quantitative size 的单行值缺失、null 或非有限时，Plot 在 Point 生成前跳过该 datum，不退化为默认尺寸 glyph；空集、全缺失或零值仍保留 field-bound descriptor、inspection 与可选 legend
- 未知或非法 scale、负值、无法消歧的多个 size descriptor、缺 x / y、非法视觉值、非二维 coordinate、缺失 definition 或核心配方破坏均 fail-loud

JSON、React、Vanilla 保留两个 type 并生成等价 IRChart、IRPlot 与 composition；Bubble 不在 adapter 层改写成 Scatter。presentation 与 surface 继续复用 ADR-02 / ADR-03。

## 功能与包边界

Chart 拥有平级 variants、数据角色、核心 Point recipe identity 与 patch 边界；Plot 拥有 Point、channel、scale inference、coordinate / composition、axis guide、lowering 与 trace。Chart 不复制 Point、scale、guide、merge 或 lowering，也不建立 Chart registry。

## 当前实现结果与遗留风险

本 ADR 已冻结 Scatter / Bubble 的平级 type 语义、Bubble 必需 size contract、Point 能力投影、size legend 来源和失败语义；状态仍为 Proposed，公开 surface 依赖 ADR-01 / ADR-03 的 canonical Chart 闭环。

长期风险集中在 Plot size channel 的 descriptor、scale identity、数据类型与逐行缺值语义必须保持单一 owner；Chart 不得通过局部推断、默认值或 adapter 旁路改变 Bubble 的 field-bound 核心。
