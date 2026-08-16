# Chart 封装完备设计

> **状态：长期封装准入真源，不定义新的底层能力域。** 本文回答“什么属于 `@retikz/chart`”以及“怎样才算形成 Chart 封装闭环”。Chart 依赖 Visualization Complete，不拥有独立的 Mark、Transform、Scale、Coordinate、Guide、Composition、Data 或 Drawing 能力。
>
> 关联：[`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Chart 总设计`](./chart-design.md) · [`Plot 可视化完备设计`](./plot-visualization-complete.md) · [`Data 能力完备设计`](./data-capability-complete.md) · [`Core 绘图完备设计`](../../../kernel/_notes/architecture/core-drawing-complete.md) · [Core ADR-18 provider graph](../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) · [Core ADR-19 spatial handles](../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) · [Standard Surface ADR-01](../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/01-arbitrary-child-surface.md)

---

本文只维护 Chart 的长期问题边界、封装闭环和准入方法，不维护具体 type 清单、公开字段或版本状态。

## 1. 定位与问题边界

Chart 解决的是：

> 让基础 Chart 直接承载完整 Plot authoring，让 typed Chart 把常见图表意图表达为简洁、JSON-safe 的 IRChart；两者都确定性地产生完整 IRPlot，并与可选单图展示内容归一为同一个 renderer-neutral `IRChart`，同时保留 Plot 的配置、扩展、诊断和追溯能力。

Chart 是 Tier 3 封装层，不是新的 capability domain。它的完备方向是 **Encapsulation Complete**：

> 基础 Chart 与每个封闭 Canonical Type 都能通过统一 Plot authoring / IRChart 形成完整 IRPlot，再进入同一个 canonical `IRChart`；typed Chart 的核心配方始终保留，用户可以在其边界内调整隐式 GoG 成员并追加正式 Plot 内容；Chart-level title、subtitle、note、source 通过 Standard 与 Plot 本体组成单一结果；React、Vanilla 与 JSON 入口等价；类型专用 definition 与宿主扩展都复用 Plot registry，不私造纵向能力机制或平行 registry。

“Chart 完备”不表示拥有最多的图表类型，也不表示任何名称都应进入 `type` union。它表示新增或维护一个官方 type 时，可以沿统一封装机制闭环，而不是为每个 type 写独立 schema、adapter、renderer 或 lowering 特判。

## 2. 包角色与端到端闭环

| 角色                | 主责包 / 协作包             | 在 Chart 闭环中的责任                                                                                                                         | 不拥有                                                                      |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 数据能力            | `@retikz/data`              | 数据引用、字段解析、通用 transform / statistics、lineage                                                                                      | Chart type 与视觉默认                                                       |
| 可视化能力          | `@retikz/plot`              | GoG schema、Plot token / preset / resolver、shared categorical projection、definition / registry、lowering、diagnostics、provenance / locator | Chart type、Chart presentation / recipe token                               |
| Chart 主责          | `@retikz/chart`             | typed IRChart、canonical IRChart、Canonical Type 配方、Chart token、共享 authoring normalizer、Plot 主题转发、单图展示与组合编排            | Plot token / preset / resolver、新 GoG 能力轴、renderer、开放 type registry |
| 通用呈现            | `@retikz/standard`          | 由 Plot 或 Chart 解析后消费的领域无关 composite 与 Surface                                                                                    | Layout solver、Chart / Plot 语义与字段角色                                  |
| 通用布局            | `@retikz/layout`            | FlexLayout schema / Definition、solver、artifact 与 composition                                                                               | Surface appearance、Chart / Plot 语义                                       |
| 图形执行            | Core / Render               | 编译 Plot、Layout 与 Standard lowering 产物并渲染                                                                                             | Chart / Plot 领域语义                                                       |
| authoring / runtime | chart-react / chart-vanilla | 构造同一 typed IRChart / canonical IRChart、传递 datasets / definitions、接入宿主                                                           | Chart 默认算法与私有 IR                                                     |

完整链路必须保持：

```text
base Chart -> complete Plot authoring -> IRPlot
typed IRChart -> Canonical Type recipe -> IRPlot
  -> canonical IRChart
  + Core effective Theme / namespace definitions
  -> optional ordered presentation resolution
  -> Standard Surface containing IRPlot or Layout FlexLayout
  -> Plot / Layout / Standard definitions and lowering
  -> Core IR / Scene
  -> Renderer
  -> Plot provenance / locator / lineage consumed by host
```

任一 type 若只能在 React、某个 renderer、某个 demo 或未序列化的 helper 中成立，都不算 Chart 封装闭环。

Chart 的主题 context 由 Core 统一传播和校验。Chart resolver 只消费 inherited `theme.tokens.chart` 与 local `chartThemeTokens`；内部 Plot resolver 消费同一份 inherited `theme.tokens.plot` 与 local `plotThemeTokens`。Chart adapter 必须聚合 Chart 与 Plot definitions，direct headless 使用方显式注入两者；Chart 不静态解释 Plot token。

## 3. 封装能力面

| 能力面               | 完备目标                                                                                                      | 关键不变量                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Type Recipe          | 每个 Canonical Type 选择完整、确定的 Plot 配方                                                                | 核心配方不可撤销；type 不是可任意改写的 preset        |
| Sparse IR            | typed IRChart 只保存高层意图；IRChart 保存整图 identity、Chart token handoff、完整 IRPlot 与 presentation | 两者职责分明且都 JSON-safe，不进入同一 type union     |
| Default Resolution   | 核心配方、表现性默认和覆盖优先级统一                                                                          | 不按 type 私造互不相容的 merge 规则                   |
| Plot Extension       | 用户可调整隐式成员并追加 Plot operations                                                                      | 扩展复用 Plot schema / definition / registry          |
| Presentation         | 单图可选绘制 title、subtitle、note、source 展示外壳                                                           | canonical children 顺序唯一，布局 / 绘制复用 Standard |
| Spatial Transparency | Chart 外层空间与 Plot 内部空间都可被稳定选择、解释和复用                                                      | 增加外层 namespace，但不吞掉或复制 Plot handles       |
| Lowering             | 相同输入确定性生成完整 IRPlot 与单一 Chart 组合结果                                                         | IRPlot 可检查；Chart 不私造 Core 几何或隐藏旁路     |
| Authoring Parity     | React、Vanilla、JSON 共享同一 IRChart 与 lowering                                                             | marker / position 只是 sugar，不成为私有能力          |
| Diagnostics          | schema、type、definition 与冲突错误 fail-loud                                                                 | 错误指向用户可修改的 Chart 或 Plot 配置               |
| Traceability         | 默认、override、extension 的贡献可解释                                                                        | Plot provenance / locator / lineage 不因 Chart 丢失   |
| Docs / LLM           | schema 和文档能区分 Canonical Type 与 Chart Pattern                                                           | 不用不断扩张 type union 换取可发现性                  |

## 4. Type Recipe 完备

一个 Canonical Type 的配方至少需要回答：

1. 它要求哪些数据角色，哪些可选
2. 它隐式生成哪些 Transform、Mark、Scale、Coordinate / Composition 和 Guide
3. 哪些成员构成不可撤销的 type 核心配方，允许调整哪些参数
4. 哪些成员是可关闭、替换或调整的表现性默认
5. 用户如何覆盖隐式主成员，如何追加新的 Plot 内容
6. 配方依赖哪些内置或外部注入的 Plot capability
7. 缺少字段、definition 或不支持组合时如何诊断
8. lower 后如何保留稳定 identity 与来源

只声明 `type -> Mark` 映射不算完整配方。比如 waterfall 除主 Interval Mark 外，还需要明确区间派生、字段角色、scale、coordinate、guide 与默认覆盖关系。

Type Recipe 完备还要求类型身份在扩展后持续成立。以 Connected Scatter 为例，Point、按稳定顺序连接观察值的开放 Path 及二者的共同位置角色必须保留；追加 Interval Mark 可以作为背景、参照或补充表达，但不能替换任一核心 Mark，或让 Connected Scatter 退化成只剩 type 名称的任意组合。

## 5. Sparse IR、核心配方与默认解析完备

typed IRChart 的省略语义由 `type` 决定：省略代表使用类型默认，不代表 Plot 中的 `undefined` 语义。基础 Chart 不经过 type recipe，而是直接使用完整 Plot authoring。两条入口都必须在 presentation 处理前形成通过 IRPlot schema 的完整 IRPlot，并归一为 canonical `IRChart`。canonical 根保留整图 `id` 与 `chartThemeTokens`；Plot-owned theme 和 intrinsic contract 只保留在内部完整 IRPlot 中。

基础 Chart 的宿主 renderer、外层 placement / transform / clip / theme 与 `id` 作用于包含 presentation 的整图。spec authoring 保留显式 `IRPlot.id`；DSL authoring 只在 Chart 有 id 时为 Plot body 派生 `${chartId}/plot`，无 id 时不得生成全局或计数 identity。spec 模式的额外 children 只允许 presentation marker；DSL 模式必须先把 marker 与 Plot declaration 分类，再把 Plot declaration 完整交给 Plot builder。

统一解析顺序为：

```text
non-revocable type core recipe
  + (Core effective Theme
    < Chart preset tokens
    < inherited chart namespace
    < IRChart chartThemeTokens
     < explicit Chart presentation / recipe config)

complete IRPlot
  + (Core effective Theme
    < Plot preset tokens
    < shared categorical projection
    < inherited plot namespace
    < forwarded IRChart plotThemeTokens
    < IRChart colors
    < IRChart plotTheme
     < allowed GoG member overrides)
```

Type 核心配方只能在允许范围内调整，不能删除、关闭、替换或失效；表现性默认允许调整、关闭或替换。Chart-owned recipe token 只决定默认 guide 是否生成，不能过滤显式 guides；具体 Plot member 配置优先于 Plot theme，但该优先级不能越过核心配方不变量。

IRChart 不重复持久化 Core 的 style / mode。`chartThemeTokens` 只接受 Chart canvas、presentation 与 recipe-default key；`plotThemeTokens`、`colors` 与 Plot `plotTheme` 原样进入完整 IRPlot，并由 Plot owner 在同一 effective Theme 下解析。Chart recipe 需要默认 series color 时只读取 Plot resolver 的最终 palette，不直接索引 Core shared categorical array。Chart 不复制 Plot token schema、preset、resolver、merge 或 resolved inspection。

封装闭环必须避免：

- 要求用户在 IRChart 重写完整 IRPlot
- 允许 override 把主 Mark 改成其它 Mark，或撤销必需 Transform / encoding
- 用浅拷贝或无语义 deep merge 处理有顺序、identity 或跨字段约束的成员
- 通过数组下标定位多个隐式同类成员
- 在 adapter 中补一套与核心不同的默认值
- 在 Chart 中复制 Plot surface、axis、legend、label 或 palette token / preset / merge
- lower 后继续由 renderer 猜测或补齐 Chart 默认

多个隐式同类成员需要稳定语义目标。其公开表达由 ADR 冻结，但完备标准是不依赖声明顺序和内部实现偶然性。

### 5.1 单图展示外壳完备

Chart presentation 只覆盖一个独立 Chart 可以选择绘制、但不构成 Plot 数据映射的内容。首个公开范围固定为 title、subtitle、note、source，以及背景、边框、padding 和间距；caption、credit、任意 presentation child 与 inline TextRun 留给后续独立需求。

必须按语义而不是视觉形态划分：

- Chart 拥有四类 preset 的含义、shorthand 默认位置、marker 覆盖规则、canonical authored order 和与整图的关系
- Layout 拥有领域无关的 Box / Flex / Overlay 组合、测量与布局机制；Standard 拥有 Surface / Frame 等领域无关 presentation composite
- Plot 继续拥有 axis title、tick label、datum / mark label、数据锚定 annotation、legend 与 tooltip 的领域语义
- adapter / host 拥有 export、toolbox、fullscreen、loading 等运行时 chrome 与状态切换
- accessibility name / description 可以作为 Chart semantic metadata 候选，但可见 caption 与不可见描述不得混成同一含混语义

presentation 不属于 Canonical Type 核心配方。没有显式内容时，type 不得凭空生成标题、来源或说明；用户可以省略整套展示外壳。React / Vanilla authoring 可用 `top | bottom` position 将四类唯一 preset 放到 Plot 前后，同一区域保持 authored order；归一后 `IRChart.presentation.children` 的数组顺序是唯一真源，不保留 position。Chart 可以为已声明内容提供样式与排列默认，但不能用开放 `graphic`、任意 ReactNode 或任意 slots 建立第二套通用组合系统。

IRPlot 不承载 title、subtitle、note、source 等 chart-level presentation。它们由 canonical `IRChart` presentation 通过 Standard 与唯一 Plot body 组合；axis、legend、facet、datum、mark、reference 与 annotation 文本继续属于 Plot。

## 6. Plot registry 横向扩展与 `defineChart` 不适用

Chart 不拥有扩展机制，但可以拥有符合 Plot 扩展机制的具体实现：

- Chart 可以为官方 type 提供具体 `MarkDefinition`、`TransformDefinition` 等 provider
- 宿主也可以注入自定义 Mark、Transform、Scale、Coordinate、Channel 等 definitions
- 两种来源都必须合入 Plot registry，并由 Plot schema、contract 与 lowering 统一解析和消费
- IRChart 只保存 operation 与 JSON-safe 配置，不把 provider 函数或实例写入 IR

例如，股票图可以选择股票 Mark。该 `MarkDefinition` 既可以随 Chart 官方类型提供，也可以由宿主扩展提供；关键不变量不是“Chart 不实现它”，而是它必须作为合法 Plot provider 注册，由 Plot registry / lowering 执行，不能成为 Chart 私有几何旁路。definition 的内建注入与宿主合并方式由后续 ADR 冻结，缺失或冲突语义沿用 Plot 的 fail-loud 契约。

Chart 只提供唯一、固定、不可扩展的 canonical `ChartDefinition`，其完整 key 为 `chart.chart`，负责把已经归一的 `IRChart` 接入 Core composite dispatch；它不是 Chart type 扩展机制，不按 typed Chart 分裂 definition。除此之外，Chart 不提供：

- `defineChart`
- Chart registry
- 自定义 Chart type 字符串

这不是扩展缺口，而是包使命的闭合边界。唯一 `ChartDefinition` 只闭合 canonical `IRChart` 到 Surface / Flex / Plot 的执行路径，不接受自定义 type 或注册。Chart 负责精选、稳定、低学习成本的官方类型；用户若需要设计新配方，应直接组合 Plot，若需要新增具体 provider，则沿 Plot registry 横向扩展。开放 Chart registry 会复制 Plot 的扩展问题，并让 Chart 用户额外学习配方 schema、注册、部署和冲突解析，违背封装层目标。

因此，`define-registry` 检查在 Chart type 层的结论固定为“不适用且禁止”；但每个 type 依赖的 Plot capability 仍必须证明其 definition / registry / lowering 闭环。

Chart theme token schema 不属于 Chart type registry，但属于 Core 通用 ThemeTokenDefinition registry 的 owner definition。Chart adapter 聚合 `ChartThemeTokenDefinition` 与 `PlotThemeTokenDefinition`；standalone、embedded 和 direct headless 入口必须使用同一 validation、去重和冲突语义。Standard 只消费 Chart / Plot 已解析的正式输入与 Core `InspectionAppearance`，不读取任一领域 token bag。

## 7. 混合表达完备

基础 Chart 必须支持完整 Plot authoring；typed Chart 必须支持在类型默认基础上混入正式 Plot 内容：

- 覆盖隐式主 Mark / Transform / Scale / Guide 等成员的允许参数
- 追加 Mark、Transform、Guide 或其它正式 Plot operation
- 使用已注册的自定义 Plot capability
- 保留单一根 data 与 Plot 的 series / group / color 语义

基础 React Chart 的 Plot children 必须通过 Plot adapter 形成完整 IRPlot；typed React children 中的 Plot extension 必须可以表示为 IRChart。Vanilla 和 JSON 入口最终都必须产生等价 `IRChart`。

混合边界保持单向：基础 Chart 拥有完整 Plot authoring，typed Chart 包含 Plot extensions，Plot 不包含 Chart。typed 追加内容默认追加，不作为替换、关闭或删除核心成员的指令；ID 或语义目标冲突必须显式诊断。

typed Chart 的混合内容应围绕当前 type 的本体功能增强，而不是把 typed Chart 当作无类型约束的 Plot 容器。核心配方破坏必须 fail-loud；作者需要自由组合时使用基础 Chart 或裸 Plot。

## 8. Spatial Transparency 完备

Chart presentation 会在 Plot 外增加 frame、header、body、footer 等布局区域，但 Chart 封装不能把 Plot 变成只剩整体 bbox 的不可寻址黑盒。完整闭环必须同时满足：

- Chart 可以为整图与外层 presentation 区域生成稳定 handle；具体 handle 清单由后续空间契约 ADR 冻结
- Plot 继续生成并拥有 view、arrangement、facet panel、track、plotArea、axis region、series、datum 等 domain handle
- 外部 selector 可以先定位 Chart，再穿过 body / Plot namespace 定位内部 Plot 空间，而不只能选中整个 Chart
- Chart 只做 namespace facade 与 selector delegation，不复制 Plot handle registry，不重新解释 facet / track，也不把内部 id 改造成 Chart 私有 id
- Layout 布局改变最终全局 geometry 时，Core handle index 更新空间结果，但 Plot handle 的稳定 identity、domain payload、locator 与 provenance 保持连续
- type recipe 隐式生成的 view / facet / track 仍在展开后的完整 IRPlot 中可检查，并能追溯到 type default、用户 override 或显式 extension

Canonical Type 可以把 Plot composition 作为核心配方。例如价格轨道、成交量轨道与共享时间轴应展开为同一个 IRPlot；只要共享 coordinate、scale、axis、track 或同一数据映射语义，就不应拆成多个 Chart 再由 Chart 私下同步。多个独立 Chart / Plot / Table 的静态排列与 attachment 归 Layout + Standard Surface + Core spatial handles；linked selection、filter、scroll、responsive dashboard state 归更高层 dashboard / workspace runtime。Chart 不拥有 dashboard IR，也不复制 Plot composition、Layout solver 或 Standard Surface lowering。

空间透明性至少需要验证：

- 等价 IRPlot 单独运行与被 Chart 包裹后，内部 handle 集合与相对 selector 语义一致
- selector 可以分别命中整个 Chart、presentation 区域、Plot body、某个 view / track / facet panel / plotArea
- 多个 Chart 中相同 Plot 局部 id 经过 qualified namespace 后不冲突
- Chart presentation 的加入或关闭只改变外层组合 geometry，不破坏内部 provenance / locator / lineage
- selector 目标不存在、namespace 越界或被 type override 破坏时 fail-loud，不静默回退到整个 Chart

## 9. Lowering 完备

Chart resolution 必须产出包含完整 IRPlot 的单一、JSON-safe、renderer-neutral `IRChart`，而不是让 adapter 在外部补 DOM-only 标题。缺少 presentation 时裸 Plot 成为 Standard Surface content；存在 presentation 时 Layout FlexLayout 包含同一 IRPlot 并成为 Surface content。逻辑阶段必须保持：

- 基础 Chart 通过正式 Plot authoring 生成 IRPlot；typed Chart 校验 type 数据角色与覆盖边界并确定性展开 recipe
- 使用统一规则合并 defaults、overrides 与 extensions
- 生成可通过 IRPlot schema、可独立 inspection 的完整 IRPlot
- 归一为 canonical `IRChart`，保留整图 identity / Chart token handoff，且 presentation children 恰好一个 Plot、每个 preset 至多一个、顺序权威
- 严格按 canonical children 顺序通过 Layout FlexLayout 组合 presentation 与 IRPlot
- 让 Plot 与 Standard 各自沿正式 definition / lowering 主链进入 Core
- 不读取 renderer 或 framework 私有状态，不自行实现文字测量、容器 solver 或私有几何

Chart resolution、Plot lowering 与 presentation composition 应可分别观察和测试。至少需要验证：

- typed IRChart 到预期 IRPlot 的精确等价，以及基础 Chart 与等价 Plot authoring 的精确等价
- 删除、替换或关闭 type 核心成员的配置稳定失败
- 显式 Chart 图本体配置与手写等价 IRPlot 的可观察结果一致
- presentation 缺省时不生成额外可见内容，显式内容时形成预期 Standard 组合
- React / Vanilla / JSON 生成等价 IRPlot、同一 canonical IRChart 与等价最终组合
- 自定义 Plot definitions 能穿过 Chart 链路被统一消费
- 错误路径不会静默丢弃用户配置、展示内容或退化为另一类型

## 10. Diagnostics 与 Traceability 完备

Chart 隐式内容越多，越需要可解释性。完整闭环至少要求：

- 未知或不支持的 type 在 Chart schema / lowering 阶段失败
- 缺失数据角色指向对应字段配置
- 尝试删除、关闭、替换或使 type 核心成员失效时明确说明不变量
- override 目标不存在、重复或冲突时 fail-loud
- ID 冲突不自动重命名或覆盖
- 所需 Plot definition 缺失时保留 capability key 与来源信息
- 工具可以查看展开后的 IRPlot
- 工具可以查看 Chart presentation 的来源、最终组合位置及其与 Plot-owned mark / guide 文本的区别
- 工具可以区分 Chart 外层 handle 与 Plot 内部 handle，并检查 qualified selector 的委托路径
- Plot 的 view / arrangement / facet panel / track / plotArea identity、provenance / locator / lineage 能继续定位最终视觉贡献

具体 artifact schema 可以延期，但不得以“Chart 只是 sugar”为理由省略诊断和来源链。

## 11. Docs 与 type taxonomy 完备

文档发现性不等于公开 type 数量。Chart 文档使用：

- Canonical Type：稳定 IR 判别值与完整隐式配方
- Chart Pattern：Canonical Type 加 modifier、表现配置或 Plot extension 的常用名称

每个 Canonical Type 应有一份 canonical 页面，说明适用目的、数据角色、最小 IRChart、不可撤销的核心配方、常用 Patterns、Plot 混合方式及其语义边界和不适用场景。

文档可按分析目的分组，并用底层 recipe family 作为技术标签；同一类型可以从多个目的入口被发现，但不复制多份契约真源。

新增 type 不能只因为某个市场别名常见。应先把候选图表展开为完整 Plot 配方，移除 theme / style 并提取可复用 modifier，再判断剩余的数据角色、Mark 组合、Transform 与 Coordinate / Composition 拓扑是否形成稳定独立语义。具体阈值由 Chart architecture design 或 ADR 决定。

## 12. 准入与闭环检查

新的 Chart type 进入 roadmap / ADR 前至少填写：

```md
## Chart 封装完备性检查

- 用户问题与 Canonical Type 名称：
- 数据角色与单根 data 语义：
- 完整隐式 Plot 配方：
- 不可撤销的 type 核心配方与允许调整范围：
- 表现性默认及关闭 / 替换范围：
- Chart-owned `chartThemeTokens`、Plot `plotThemeTokens` / `plotTheme` 转发、Chart + Plot definition aggregation 与 Core effective Theme 边界：
- 可选 Chart presentation、默认排列与关闭语义：
- Chart / Plot label 边界与 Layout Flex / Standard Surface composition：
- 隐式 composition / track / facet 配方及其核心不变量：
- 用户 override 与 Plot extension 表面：
- 扩展后如何保持 type 本体语义：
- 依赖的 Data / Plot / Standard / Layout / Core capability：
- 是否只使用现有能力轴与 contract：
- 新增具体 definition、来源、注册方式与闭环：
- 缺失纵向 capability 的 owner 与处理结论：
- IRChart -> complete IRPlot -> presentation composition 的 lowering 与错误路径：
- Chart 外层 handles、Plot 内部 handle forwarding 与 qualified selector：
- 空间 identity、provenance / locator 在封装前后的保持方式：
- React / Vanilla / JSON parity：
- diagnostics / provenance / locator / lineage：
- Canonical Type 还是 Chart Pattern，理由：
- 本轮结论：组合 / 先下沉 / 仅 Pattern / 不支持或延期
```

若需求可以由既有 Plot contract 下的具体 Mark、Transform 等 definition 表达，Chart ADR 可以纳入该横向 provider，但必须证明 definition、registry、lowering、诊断与测试闭环。只有当需求需要新增能力轴、contract、registry 类型、pipeline 语义或 Core primitive 时，当前 Chart ADR 才必须暂停并把纵向能力送回对应 owner；不得在 Chart 内建立旁路实现。

## 13. 常见反例

以下情况都不算 Chart 封装完备：

- 某 type 由 renderer 或 React 组件直接绘制，无法生成完整 IRPlot
- adapter 用 DOM-only 外壳补 title / subtitle / source，Vanilla、SSR 或导出结果不等价
- 把 title / subtitle / note / source 塞回 IRPlot，迫使 Plot 长期承担 Chart 展示外壳
- Chart 自建文字测量、Box / Overlay solver 或开放任意 graphic / ReactNode slots
- IRChart 只保存 `type + x + y`，常用 style、guide、scale、mark 配置无法表达
- 允许 Connected Scatter override 删除 Point 或开放 Path、闭合轨迹，或撤销二者共同的位置角色
- 追加内容已经成为主要表达、原 type 只剩名义存在，却仍把 typed Chart 当作通用 Plot 容器，而不是使用基础 Chart
- 为股票图在 Chart 内建立私有股票几何路径，而不是提供 Plot registry 可识别的 `MarkDefinition`
- 为 waterfall 在 Chart 内旁路计算数据，而不是提供或复用 Data / Plot transform definition
- React children 能追加 Plot Mark，但 Vanilla / JSON 无对应 IR
- React marker 与 Vanilla plain item 同序输入生成不同 `IRChart`，或 canonical resolver 根据 preset / position 重新排序
- Chart wrapper 只暴露整个 body bbox，吞掉 Plot 的 view / track / facet panel / plotArea handles
- Chart 复制 Plot handle registry、重新生成内部 id，或让 selector 依赖不透明数组下标
- type recipe 把共享时间轴的价格 / 成交量轨道拆成多个 Chart，再在 Chart 内私造同步状态
- Chart 私造 dashboard IR，拥有 linked selection、filter、scroll 或 responsive runtime state
- 每个 type 各写一套 merge、默认轴、theme 或错误处理
- Chart 复制 Plot token vocabulary、preset、resolver 或把 resolved Plot theme 物化回 IRPlot
- 用 `series[]` 给每个系列绑定独立 dataset，破坏 Plot 单根 data 模型
- 为了用户自定义 type 增加 Chart registry，形成第二套扩展体系
- 文档把 stacked / horizontal / smooth 等所有市场名称都固化成 type union

## 14. 与能力域和版本的关系

Chart 封装完备性依赖但不取代：

- Data Complete：数据与通用 transform 可被统一消费
- Visualization Complete：所有 GoG 能力可表达、扩展并 lower
- Layout 通用布局 + Standard 通用呈现：Chart presentation 与 Plot 本体通过 Layout composite 排列，再由 Standard Surface 包装
- Drawing Complete：Plot 产物可由 Core / Render 执行，空间 handle / selector 由 Core 提供 renderer-neutral 基础

Chart completeness 只检查高层意图是否完整、安全、可解释地映射到这些能力。

具体类型、字段、默认值和测试矩阵进入 milestone ADR；版本 roadmap 只安排已确认的封装缺口。本文不以当前未实现状态降低长期标准，也不把长期标准误记为 v0.1 已承诺范围。
