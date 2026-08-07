# ADR-04：Scatter 与 Bubble 平级 Canonical Types

- 状态：Proposed（owner-local Plot quantitative size dependency 已满足；ADR-01 / ADR-03 的公开 capability gates 仍未解除）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md)

## 背景与目标

Scatter 与 Bubble 是用户心智、公开 API、ChartSpec 判别值和文档入口都平级的二维点图。Scatter 用两个位置角色比较观测关系，Bubble 进一步要求第三个定量尺寸角色并以面积表达量级。两者共享 Point Mark、scale、coordinate、guide 与 ChartCommon 能力，但必须分别保留 authored intent、稳定 identity、inspection 与 JSON round-trip，不能因为底层结构相近而把 Bubble 降为 Scatter 的文档别名或 adapter sugar。

## 决策：`scatter` 与 `bubble` 分别冻结二维关系和面积量级语义

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

type BubbleChartSpec = ChartCommon & {
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

Scatter 与 Bubble 分别进入 `ChartSpec.type` 封闭 union，并各自拥有稳定 type identity。两者都固定生成一个 Point 主 Mark、二维 coordinate / composition root 以及 x / y axis 表现性 defaults；x / y 与主 Point identity 构成共同的不可撤销核心。Scatter 的 size 可缺省、绑定字段或使用常量；Bubble 的 size 是不可撤销的第三个定量角色，必须绑定字段并始终按面积感知语义解析。

Bubble 不复制 Point、channel、scale、guide、merge 或 lowering 机制。它与 Scatter 复用同一份 Point 能力投影及 Plot size channel 主链，但使用独立严格 variant 和 recipe identity 冻结必需 size role、面积映射、默认 size legend 与 inspection 来源。用户可以调整 color、opacity、shape、Point 表现样式、scale 和 guides，也可以追加正式 Plot marks；不能替换主 Point、改写 x / y，或把 Bubble 的最终 size 降为常量。

这里的面积语义专指 Plot size channel 用 sqrt radius descriptor 把定量 magnitude 映射为主 Point 的基础尺寸，不承诺用户显式 shape、Node scale 或其它后续视觉修饰仍保持相同的最终像素面积。它们属于可 inspection 的 Plot Point 完整操作，不构成第二个定量 size role；Bubble 的类型核心只保证必需 field-bound size binding 不可撤销。

公开 patch / channel contract 固定为：

```ts
type StrictColorChannel = { field: string; scale?: string } | { value: string };
type StrictSizeFieldChannel = { field: string; scale?: string };
type StrictSizeChannel = StrictSizeFieldChannel | { value: number };
```

`StrictSizeChannel` 的两个分支都是 strict object。field branch 可以引用 sqrt scale；value branch 要求非负有限数并拒绝 `scale`。Scatter 的 `encoding.size` 是可选高层尺寸入口，显式 `mark.size` 可以按 Plot Point 契约覆盖其最终值。Bubble 的 `encoding.size` 只接受必填的 field branch；Bubble `mark` 不接受 `size`，避免 Point-local constant 或第二个字段来源撤销、替换或歧义化类型核心。Bubble 的 field 和 scale 选择统一写在 `encoding.size`，显式 `scales` 继续提供 Plot 支持的完整 sqrt scale 配置。

`ScatterPointPatch` 是 Plot Point Mark 的严格能力投影，不是 Chart 独立维护的字段白名单。它接受 Point Mark 除 recipe-owned 成员外的全部公开配置，并随 Plot Point 契约演进。顶层排除项固定为：

```text
type, id, transform, coordinateView
```

这些成员分别由两个 type、canonical identity、recipe transform 与空间根拥有，不能通过 patch 改写。Point `encoding` 仍进入投影，但其中 `x` / `y` 由两种 Point Chart 的核心角色拥有并明确拒绝；Scatter 继续复用 `text`、`color`、`channels` 以及兼容自定义 coordinate 的其它非核心 role。Bubble 的主 Mark 必须保持可承载面积编码的 Point glyph，因此额外拒绝会把 Point 切换为文本节点的 `encoding.text`。长期类型关系保持：

```ts
type ScatterPointPatch = Omit<IRPlotPointMark, 'type' | 'id' | 'transform' | 'coordinateView' | 'encoding'> & {
  encoding?: Omit<IRPlotPointEncoding, 'x' | 'y'> & {
    x?: never;
    y?: never;
  };
};

type BubblePointPatch = Omit<ScatterPointPatch, 'size' | 'encoding'> & {
  size?: never;
  encoding?: Omit<NonNullable<ScatterPointPatch['encoding']>, 'size' | 'text'> & {
    size?: never;
    text?: never;
  };
};
```

Scatter 的 `size`、`color`、`shape`、`opacity`、`text`、`label` 及其它 Point-local 配置均保持 Plot 的完整 value contract。Bubble 把所有名为 `size` 的 Point-local authoring surface 视为 type-owned 排除项：当前既排除顶层视觉尺寸，也排除 Point encoding catchall 中可能出现的同名自定义 coordinate role，避免形成第二个尺寸来源或同名歧义。Bubble 同时排除 `encoding.text`，因为 Plot Point 的 text mode 会用文本节点替换 glyph，使必需 size role 不再具有面积载体；这不是裁剪通用标签能力，datum label 仍沿 Point 正式 label 能力开放。除 size 与 text mode 外，其它能力与 Scatter 使用同一投影规则。未来 Plot Point 新增的非 recipe-owned、非 size、且不改变 glyph 载体的公开字段或非核心 channel，自动进入两种投影；若新增另一种 size authoring surface 或会替换 glyph 载体的模式，则必须继续由 Bubble 投影排除。

`anchorId` 只控制每个 datum 的 Plot anchor 规则，不替换 recipe 保留的主 Mark identity；`layer` 只调整该 Mark 的 Plot semantic layer。patch 严格拒绝未知字段，也不能通过嵌套对象重新引入核心字段。应用顺序是 recipe 的高层 visual encoding 先成立，再由 `mark` 投影按 authored 字段深度合并非核心 encoding、覆盖同名 Point-local 值；未 authored sibling 与核心 x / y 保留。因此 `encoding.size` 继续提供易用的 Scatter authoring，而显式 `mark.size` 可以对最终 Point 元素执行 Plot 支持的完整配置并具有更高优先级。Point 本身同时提供正式属性与兼容 encoding 入口时继续遵守 Plot 契约，例如 `mark.color` 优先于 `mark.encoding.color`；Chart 不重新定义第二套优先级。

Scatter 默认 size legend 以应用 `mark` 投影后的最终有效 Point size 为准；Bubble 则始终以必填 `encoding.size` 为准。Chart 只决定是否需要 size legend 及其来源，不推导或拼接 Plot 的隐式 scale identity：

- 最终 size 缺省或为 constant 时不生成自动 size legend
- `guides` 缺省、resolved `chart.legend.enabled` 为 true 且最终 size 为 field 时生成自动 size legend；field binding 显式引用 scale 时可以沿用该引用，否则默认 guide 不写猜测出的 scale 名，由 Plot 从正式 descriptor 选择唯一的实际 scale identity
- `encoding.size.field` 被 `mark.size.constant` 覆盖时移除原自动 legend；`encoding.size.value` 被 `mark.size.field` 覆盖时生成 field legend；两处绑定不同 field / scale 时只解释最终 `mark.size`
- 显式 `guides` 仍整体替换包括 size legend 在内的全部表现性默认
- Bubble 在上述默认生成条件满足时生成绑定其 size descriptor 的 legend；`chart.legend.enabled: false` 或显式 `guides` 都可以省略该表现性 guide，但不能撤销 field-bound size 核心

统一 inspection 必须能区分最终 Point size binding、Chart 默认 guide 与用户显式 guides 的来源，并沿 Plot 正式 channel descriptor / guide 选择链观察实际 scale identity。Bubble 复用这份 Chart / Plot inspection，不新增 Bubble 私有 descriptor、scale 命名或 provenance 结构。

## 行为、失败语义与兼容性

- 缺省使用 Cartesian2D；显式 Cartesian2D、Polar2D 或兼容自定义 coordinate 仍由 Plot 的正式 coordinate registry 与 role projection 处理
- coordinate 与 composition 互斥；composition 的 active/default view 必须提供精确二维角色，核心 Point 与 axes 始终属于同一 view
- 位置 scale 由 Plot 根据 binding、data model 与显式 scale 解析；Chart 不猜测重绑定未引用 scale
- `color` 支持严格 field binding 或 string constant；其它视觉角色复用 Plot 的正式 channel contract
- 最终有效 size 绑定字段时沿用 Plot 的 sqrt radius scale；`guides` 缺省且 resolved `chart.legend.enabled` 为 true 时 Scatter 加入 size legend default，显式 `guides` 按 ChartCommon 规则整体替换包括该 legend 在内的表现性 defaults
- 最终有效 size 绑定常量时直接作为最终 Point 半径，不产生 field descriptor 或 size legend default
- Bubble 缺少 field-bound size、提供 constant size、通过 `mark.size` 提供第二个尺寸来源或引用非 sqrt scale 时 fail-loud
- Bubble size field 的 data-model type 已知为 categorical、temporal 或其它非 quantitative 类型时，必须沿 Plot 正式 size channel 诊断 fail-loud；Chart 不自行推断或预扫描 rows
- quantitative size field 的单行值缺失、null 或非有限时，Plot size channel 必须在 Point 生成前把该 datum 判为不可交付，不生成其主 Point；不得把 size resolver 的 `undefined` 退化成默认尺寸 glyph。空集、全缺失或只有零值仍保留 field-bound descriptor、inspection 与可选默认 legend，不改变 authored type identity
- field size 引用未知或非 sqrt scale、scale 契约非法、数据含负值时必须沿 Plot 正式诊断 fail-loud，且显式 scale 校验不得因全零或空集而跳过；全零、空集或单个正值沿 Plot 正式退化半径与 descriptor 语义，不由 Chart 补算法
- 追加成员产生第二个 field-bound size descriptor 且 size legend 无法消歧时沿 Plot 正式诊断 fail-loud；用户可以显式替换 guides 并省略 size legend，或避免歧义
- `mark` 完整复用 Point 的非核心公开字段与非核心 encoding；不能携带 type、identity、transform、view ownership，也不能在 nested encoding 中改写核心 x / y。Bubble 还拒绝 nested encoding 中名为 `size` 的 role 及会替换 glyph 的 `text` mode；这些字段必须 fail-loud，color、channels、datum label 与其它兼容自定义 role 继续沿 Plot schema 接受
- 缺 x / y、非法视觉值、非二维 coordinate、缺失自定义 definition、保留 identity 冲突或核心配方破坏均 fail-loud
- 公开时首次形成包含 `scatter` 与 `bubble` 的 ChartSpec discriminated union；JSON、React、Vanilla 分别保留两个 type，并生成等价 ChartSpec、PlotSpec 与最终 composition
- React 以包级扁平 named exports 提供平级的 `ScatterChart` 与 `BubbleChart`，Vanilla 提供平级的 `scatterChart` 与 `bubbleChart`；四个入口分别生成 `type: 'scatter'` 与 `type: 'bubble'`，不得把 Bubble 在 adapter 层改写成 Scatter。两种 type root 复用同一套 Chart presentation children 与 runtime 接线，不建立 type-specific host

框架无关的 variant authoring input 分别是 `Omit<ScatterChartSpec, 'namespace' | 'type'>` 与 `Omit<BubbleChartSpec, 'namespace' | 'type'>`。Vanilla `scatterChart(input)` / `bubbleChart(input)` 接受对应 input，并确定性补齐 `namespace: 'chart'` 与各自 `type` 后返回完整 variant。React `ScatterChart` / `BubbleChart` 是平级的完整 headless Chart root：`spec` 接受对应 variant input，presentation `layout` 与 children 完整复用 ADR-03 的 `Chart` root 契约；组件只补齐判别值，再委托同一 canonical normalizer。泛型 `<Chart spec={completeChartSpec}>` 仍接受已经包含 `namespace` / `type` 的完整 ChartSpec。两种写法生成同一 canonical variant，variant root 不能嵌套进另一个 `Chart` root。

## Plot size / legend dependency contract

field-bound size 与默认 size legend 依赖 Plot owner 持续满足以下 capability 闭环：

1. 显式 size scale 的存在性、sqrt 类型及 scale 契约先于全零、空集等退化数据分支校验，使同一 ChartSpec 的合法性不随 runtime rows 改变
2. size field 的 data-model type 必须与 quantitative magnitude 兼容；已知非 quantitative 类型在 descriptor 解析时 fail-loud；单行缺失、null 或非有限值必须通过正式 channel delivery 语义阻止该 datum 的 Point 生成，不能回落到默认尺寸
3. 每个 field-bound size descriptor 都携带实际消费的稳定 scale identity，包括显式引用与确定性合成的默认 scale
4. size legend 未指定 scale 且存在多个不同 scale identity 时 fail-loud；指定 scale 时精确选择对应 descriptor；相同 identity 的重复 descriptor 只有在契约等价时才能合并

Chart 不预扫描 rows、不复制 size scale 校验、不私造 descriptor、不拼接隐式 scale identity，也不在 legend lowering 前维护一套 Chart 专用消歧规则；任何回归必须进入 Plot 的 channel resolver、descriptor 与 guide 正式主链。

## 功能与包边界

- Chart 拥有平级的 `scatter` / `bubble` variants、各自数据角色、核心 Point recipe identity 与允许覆盖边界
- Plot 拥有 Point、channel、scale inference、coordinate / composition、axis guide、lowering 与 trace
- adapter 只暴露同一 ChartSpec；presentation 与 surface 继续由 ADR-02 / ADR-03 组合
- package 公开、release group、Chart adapter / schema API 文档只在 ADR-01 / ADR-03 gates 解除后原子完成；成为 publishable 不等于获得发布授权
- capability gate 未解除时可以先提供基于已公开 Plot API 的 Scatter / Bubble 概念 Showcase，用真实 Point、size、scale 与 guide 组合展示 Canonical Type 的分类、用途和可观察视觉效果；这类页面必须具有明确的非契约概念预览身份，配置方式、demo 与 API 内容只能以当前公开 Plot / plot-react surface 为真源
- 概念 Showcase 不得归类为 Chart runtime、schema 或 API 真源，不得把私有 ChartSpec 字段、Chart-owned defaults、recipe / patch / override 规则、adapter 或 runtime surface 描述为当前可用能力；Chart package、release surface、adapter 与 schema API 文档仍须在 ADR-01 / ADR-03 gates 解除后原子公开

## 架构验证

- Canonical Type 判定：Scatter 的稳定身份是二维 Point + x / y；Bubble 的稳定身份是二维 Point + x / y + 必需定量 size role、面积映射与对应解释行为。必需数据角色、失败语义和 round-trip intent 的差异足以形成平级 type，不以底层是否复用同一 Mark 判断用户语义身份
- 复用判定：两个 type 共享 Point、channel、coordinate、scale、guide、merge 与 lowering 主链，但分别保留 schema variant、recipe identity、inspection 与公开文档入口
- 能力归属：完全组合 Plot 现有 Point、channel、coordinate、scale 与 guide 能力；主 Mark patch 是 Plot Point 契约的能力投影，不建立 Chart 平行类型
- 外部扩展：自定义 coordinate、其它兼容角色的自定义 scale 与追加 mark 沿 Plot registry 与 ChartCommon 表面进入，不新增 Chart registry；Bubble 核心 size 在本 milestone 只接受 Plot 内建 sqrt scale，不把自定义 scale registry 扩展解释为任意面积 scale
- 核心闭环：ChartSpec -> complete PlotSpec -> Plot lowering；presentation 可选地再由 Standard 包装
- 依赖结论：field-bound size 的类型与 scale 校验、逐行缺值跳过和 legend descriptor identity 属于 Plot 正式 channel / guide 闭环，Chart 只消费该正式契约，不在局部绕过
- trace：主 Point 的最终 size binding、Chart 默认 guide、显式 guide 替换及 Plot 实际 descriptor / scale identity 可沿统一 inspection 链区分来源；Chart 包裹不改变 Plot datum / series provenance 与 locator

## 被否决方案

- 只公开 `type + x + y`：会把 Chart 降为一次性 sugar，丢失 Plot 可调整能力
- 手工维护 Scatter Point 字段 allowlist：会裁剪 Plot 能力，并在 Point Mark 演进时造成 Chart schema、文档和实际元素能力漂移
- 把 Bubble 归一化为 `scatter + size` Pattern：会丢失用户明确选择的第三定量角色、类型级失败语义、inspection 与 JSON round-trip intent，并使公开 API 和文档身份与 ChartSpec 不一致
- 为 Bubble 复制 Point、scale、guide、merge 或 lowering：平级公开身份不要求平行底层机制，复制会造成两个 point type 的能力与诊断漂移
- 固定 Cartesian renderer 语义：会绕过 Plot coordinate contract
- 允许 mark patch 整体替换 encoding、改写核心 x / y 或 coordinate view：会使 Point Chart type identity 可撤销；非核心 Point encoding 仍按能力投影开放

## 测试策略摘要

需要两个 strict variant、type dispatch 与 round-trip、共享 Point 能力投影、nested encoding merge、各自 recipe identity、Scatter 最终 size 的 field / constant interaction、Bubble 必需 field size 与顶层 / nested constant、同名 role、text mode 反例、quantitative type / missing-value 语义、sqrt scale / legend、退化数据、多 descriptor 诊断、coordinate / composition、custom definition、core invariant、inspection / trace 与 JSON / React / Vanilla parity 证据。关键不变量是两个 type 的主 Point 与 x / y 始终存在，Bubble 的最终 size 始终 field-bound、主 Mark 始终保留 glyph 载体且不存在第二个同名 authoring surface，field-bound size 缺值的 datum 不生成默认尺寸 Point，recipe-owned 字段始终被投影排除；非核心 Point 能力完整复用 Plot，两个 type 沿同一 Plot size / descriptor / guide 主链闭环但不丢失各自 identity，追加 marks 不替换核心，presentation 前后 datum identity 与 provenance 连续。

## 不在本 ADR 范围

- packed bubble / circle packing 等具有独立布局或拓扑的气泡图
- 自动按尺寸重排 rows、碰撞避让或力导向布局
- 点间连接、拟合线、range 或 jitter
- scatter matrix / facet type；相邻需求可直接使用 Plot composition
- capability gate 未解除前的 public adapter、release surface 与自动混合嵌入
- capability gate 未解除前以私有 ChartSpec、Chart-owned defaults、recipe / patch / override、Chart adapter 或 runtime surface 为真源的 API 文档
