# ADR-04：Scatter 首个 Canonical Type

- 状态：Proposed（公开 adapter 与 release surface 受 ADR-01 / ADR-03 及 Plot size / legend capability gates 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md)

## 背景与目标

Scatter 是最小的二维关系图，也是验证 Chart 封装主链的首个 Canonical Type。它只需要 Point Mark、两个位置角色和 Plot 已有的 scale、coordinate 与 guide 能力，但仍应保留 ChartCommon 提供的 Plot transform、scale、coordinate / composition、guide、theme、layout 与追加 mark 扩展。

## 决策：`scatter` 固定 Point 主 Mark 与 x / y 核心角色

```ts
type ScatterChartSpec = ChartCommon & {
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
```

Scatter recipe 固定生成一个 Point 主 Mark、二维 coordinate / composition root 以及 x / y axis 表现性 defaults。x / y 和 Point identity 构成不可撤销的 type 核心；color、size、opacity、shape 与 Point 表现样式可以调整。用户可以追加正式 Plot marks，但不能替换主 Point 或改写其核心位置角色。

Bubble 是 Scatter 的 Chart Pattern，不进入 `ChartSpec.type`。当 `encoding.size` 绑定字段时，Plot 按正式 size channel contract 自动合成或消费 sqrt radius scale；Scatter recipe 同时加入一个可替换的表现性 size legend default，由 Plot 使用最终 channel descriptor 下沉。这已经完整表达面积感知的气泡图。常量 size 只改变 Point 的最终半径，不生成 size legend default，也不构成独立类型语义。Chart 不为 Bubble 增加第二套 schema、recipe、identity 或 runtime，文档可以将其作为 Scatter 的常用发现入口。

公开 patch / channel contract 固定为：

```ts
type StrictColorChannel = { field: string; scale?: string } | { value: string };
type StrictSizeChannel = { field: string; scale?: string } | { value: number };
```

`StrictSizeChannel` 的两个分支都是 strict object。field branch 可以引用 sqrt scale；value branch 要求非负有限数并拒绝 `scale`。`encoding.size` 是 Scatter 唯一的 size authoring surface，避免数据映射与 Point patch 形成两个互相覆盖的来源。

`ScatterPointPatch` 是封闭 strict allowlist，字段的 value contract 逐项复用 `IRPlotPointMark` 同名字段：

```text
color, textColor, shape, fill, stroke, strokeWidth,
fillOpacity, strokeOpacity, opacity, rotate, minimumSize, zIndex,
align, lineHeight, maxTextWidth, cornerRadius, scale, padding, margin,
dashed, dotted, dashPattern, font, boundary, shadow, blendMode,
dx, dy, anchorId, layer, label
```

`type`、`id`、`encoding`、`transform`、`coordinateView` 与 `size` 明确拒绝；任何未来加入 Plot Point 的字段不会自动进入 Chart patch。`anchorId` 只控制每个 datum 的 Plot anchor 规则，不替换 recipe 保留的主 Mark identity；`layer` 只调整该 Mark 的 Plot semantic layer。两种 patch 对象都严格拒绝未知字段，也不能通过嵌套对象重新引入核心字段。应用顺序是 recipe 视觉 encoding 先成立，再由 `mark` patch 按 authored 字段覆盖其它 Point-local 值；未 authored sibling 保留。

## 行为、失败语义与兼容性

- 缺省使用 Cartesian2D；显式 Cartesian2D、Polar2D 或兼容自定义 coordinate 仍由 Plot 的正式 coordinate registry 与 role projection 处理
- coordinate 与 composition 互斥；composition 的 active/default view 必须提供精确二维角色，核心 Point 与 axes 始终属于同一 view
- 位置 scale 由 Plot 根据 binding、data model 与显式 scale 解析；Chart 不猜测重绑定未引用 scale
- `color` 支持严格 field binding 或 string constant；其它视觉角色复用 Plot 的正式 channel contract
- `size` 绑定字段时沿用 Plot 的 sqrt radius scale；缺省 `guides` 时 Scatter 加入一个 size legend default，显式 `guides` 按 ChartCommon 规则整体替换包括该 legend 在内的表现性 defaults
- `size` 绑定常量时直接作为最终 Point 半径，不接受 `scale`，也不产生 field descriptor 或 size legend default
- field size 引用未知或非 sqrt scale、scale 契约非法、数据含负值时必须沿 Plot 正式诊断 fail-loud，且显式 scale 校验不得因全零或空集而跳过；全零、空集或单个正值沿 Plot 正式退化半径与 descriptor 语义，不由 Chart 补算法
- 追加成员产生第二个 field-bound size descriptor 且 size legend 无法消歧时沿 Plot 正式诊断 fail-loud；用户可以显式替换 guides 并省略 size legend，或避免歧义
- `mark` 只能覆盖 Point 的非核心表现字段，不能携带 type、identity、encoding、transform 或 view ownership
- 缺 x / y、非法视觉值、非二维 coordinate、缺失自定义 definition、保留 identity 冲突或核心配方破坏均 fail-loud
- 公开时首次形成 ChartSpec discriminated union，并让 JSON、React、Vanilla 生成等价 ChartSpec、PlotSpec 与最终 composition

## Plot size / legend capability gate

field-bound size 与默认 size legend 只有在 Plot owner 补齐以下现有 capability 闭环后才能公开：

1. 显式 size scale 的存在性、sqrt 类型及 scale 契约先于全零、空集等退化数据分支校验，使同一 ChartSpec 的合法性不随 runtime rows 改变
2. 每个 field-bound size descriptor 都携带实际消费的稳定 scale identity，包括显式引用与确定性合成的默认 scale
3. size legend 未指定 scale 且存在多个不同 scale identity 时 fail-loud；指定 scale 时精确选择对应 descriptor；相同 identity 的重复 descriptor 只有在契约等价时才能合并

该 gate 未解除时，不公开接受 field-bound size 的 Scatter surface 或可执行 Bubble Pattern 文档。Chart 不预扫描 rows、不复制 size scale 校验、不私造 descriptor，也不在 legend lowering 前维护一套 Chart 专用消歧规则；修复必须进入 Plot 的 channel resolver、descriptor 与 guide 正式主链。

## 功能与包边界

- Chart 拥有 `scatter` variant、数据角色、核心 Point recipe 与允许覆盖边界
- Plot 拥有 Point、channel、scale inference、coordinate / composition、axis guide、lowering 与 trace
- adapter 只暴露同一 ChartSpec；presentation 与 surface 继续由 ADR-02 / ADR-03 组合
- package 公开、release group 与 docs 只在 ADR-01 / ADR-03 gates 解除后原子完成；成为 publishable 不等于获得发布授权

## 架构验证

- Canonical Type 判定：Scatter 的稳定身份是二维 Point + x / y，而不是只换主题的 Chart Pattern
- Pattern 判定：Bubble 只把 Scatter 已有的可选 size channel 绑定为字段，没有改变 Mark、Transform、Coordinate 或数据拓扑，因此不单列 Canonical Type
- 能力归属：完全组合 Plot 现有 Point、channel、coordinate、scale 与 guide 能力
- 外部扩展：自定义 coordinate / scale /追加 mark 沿 Plot registry 与 ChartCommon 表面进入，不新增 Chart registry
- 核心闭环：ChartSpec -> complete PlotSpec -> Plot lowering；presentation 可选地再由 Standard 包装
- 依赖结论：field-bound size 的 scale 校验与 legend descriptor identity 属于 Plot 现有 channel / guide 闭环，当前先下沉修复，不在 Chart 局部绕过
- trace：主 Point 的默认、用户覆盖与 extension 来源可 inspection；Chart 包裹不改变 Plot datum / series provenance 与 locator

## 被否决方案

- 只公开 `type + x + y`：会把 Chart 降为一次性 sugar，丢失 Plot 可调整能力
- 为 field-bound size 单列 `bubble` type：只把 Scatter 已有的一个可选 channel 改为必需，复制 schema、recipe 与文档契约却不增加稳定结构语义
- 固定 Cartesian renderer 语义：会绕过 Plot coordinate contract
- 允许 mark patch 改写 encoding / coordinate view：会使 Scatter type identity 可撤销

## 测试策略摘要

需要 strict schema、exact Plot recipe、size field / constant、size scale / legend interaction、退化数据、多 descriptor 诊断、coordinate / composition、custom definition、core invariant、inspection / trace 与三入口 parity 证据。关键不变量是主 Point 与 x / y 始终存在，size 只从 `encoding.size` 进入；field-bound size 沿 Plot 正式 sqrt channel 与 descriptor / guide 主链闭环且不产生 Bubble 私有路径，兼容 coordinate 通过 Plot 正式 roles 投影，追加 marks 不替换核心，presentation 前后 datum identity 与 provenance 连续。

## 不在本 ADR 范围

- packed bubble / circle packing 等具有独立布局或拓扑的气泡图
- 点间连接、拟合线、range 或 jitter
- scatter matrix / facet type；相邻需求可直接使用 Plot composition
- capability gate 未解除前的 public adapter、release surface 与自动混合嵌入
