# Chart 类型封装与 Plot-backed lowering 总设计

> **状态：长期架构草案，已确认分层、IR、扩展与单图呈现边界。** 本文定义 `@retikz/chart` 的长期定位、ChartSpec 语义、默认解析、Plot 混合、可选展示外壳与 lowering 关系，不冻结具体字段、首批类型清单或版本排期。当前公开契约以后续 Accepted ADR、代码与用户文档为准。
>
> 关联：[`Chart 封装完备设计`](./chart-encapsulation-complete.md) · [`Chart 横向分析对比`](../analysis/chart-compare-analysis.md) · [`Plot 总设计`](./plot-design.md) · [`Plot 可视化完备设计`](./plot-visualization-complete.md) · [`通用视觉主题设计`](../../../../notes/architecture/visual-theme-design.md) · [`chart v0.1 roadmap`](../decisions/chart/v0/v0.1/roadmap.md)

---

本文只确定 Chart 的长期核心模型。ChartSpec 的精确 schema、Canonical Type 清单、默认值、错误 payload 与 provenance 产物由对应能力契约冻结。

## 1. 核心判断

`@retikz/chart` 是 Plot 之上的 **Tier 3 类型封装编译器**：

> Chart 用稳定的 `type` 选择一套完整、隐式的 Grammar-of-Graphics 配方，把用户写出的差异配置和追加 Plot 内容合并为完整 PlotSpec，并可用 Standard 组合成带标题、说明与来源等可选内容的独立图表。

固定执行链路为：

```text
ChartSpec / Chart IR
  -> type recipe resolution
  -> user override + Plot extension assembly
  -> complete PlotSpec
  -> optional Chart presentation resolution
  -> Standard composition containing PlotSpec
  -> Plot / Standard lowering
  -> Core IR / Scene
  -> Renderer
```

Chart 不直接实现 Core 几何或 renderer，也不建立与 Plot 平行的 Mark、Transform、Scale、Coordinate、Guide、Composition 或交互语义。Chart 只拥有 type 与单图展示内容的高层语义；Plot 负责图本体，Standard 负责领域无关的组合、布局和呈现，Core 负责最终图形表达。

Chart 的价值不是减少 Plot 能力，而是减少用户必须显式学习和重复填写的 Plot 配置。ChartSpec 可以比 PlotSpec 稀疏，但其可达能力不能因封装层而被人为裁剪。

## 2. 要解决的问题

Plot 面向需要掌握 GoG 组合、扩展和 lowering 的高级作者。直接使用 Plot 时，用户需要理解 Mark、Transform、Encoding、Scale、Coordinate、Guide、Theme 和 Composition 的关系。

Chart 解决四类体验问题：

1. 用熟悉、稳定的图表类型表达常见意图
2. 通过类型隐式补齐完整 GoG 配方，只让用户声明数据角色和差异配置
3. 在不退出 Chart authoring 的情况下，继续使用 Plot 的完整配置与扩展能力
4. 让单个 Chart 可以选择绘制标题、说明、来源等完整展示内容，而不要求外部宿主另行拼装

Chart 不建立新的绘图、数据或运行时能力轴。若一个图表只需要实现符合现有 Plot contract 的具体 Mark、Transform 等 definition，Chart 可以随类型提供该横向扩展，并通过 Plot registry 注册和消费；若 Plot contract 本身无法表达该需求，才需要先由对应 owner 补齐纵向能力机制，再由 Chart 封装。

## 3. 包角色与依赖方向

| 角色                | 包                          | 责任                                                                                                                                           | 不拥有                                                                       |
| ------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 数据底座            | `@retikz/data`              | 数据引用、字段模型、通用 transform / statistics、lineage                                                                                       | Chart type、Mark、Scale、Guide                                               |
| 可视化底座          | `@retikz/plot`              | PlotSpec、GoG 成员、Plot token / preset / resolver、definition / registry、lowering、provenance / locator                                      | Chart type、Chart presentation 与 recipe token                               |
| Chart 核心          | `@retikz/chart`             | ChartSpec、封闭 Canonical Type 目录、类型配方、Chart canvas / presentation / recipe token、Plot 主题输入转发、具体 Plot definitions 与组合编排 | Plot token / preset / resolver、新 GoG 能力轴、renderer、Chart 扩展 registry |
| 通用图形能力        | `@retikz/standard`          | 被 Plot 或 Chart 解析后消费的领域无关 composite、布局与呈现                                                                                    | Chart / Plot IR、类型配方与字段角色                                          |
| 图形底座            | `@retikz/core`              | Core IR、Scene、manifest 与通用编译                                                                                                            | Chart / Plot 领域语义                                                        |
| authoring / runtime | chart-react / chart-vanilla | 构造同一 ChartSpec、注入 datasets / definitions、接入宿主生命周期                                                                              | Chart 配方、Plot 算法或私有 IR                                               |

依赖只能沿以下方向：

```text
Data ──▶ Plot ──▶ Standard ──▶ Core
          ▲          ▲
          │          │
          └── Chart ─┘
                ▲
                │
        React / Vanilla adapters
```

Chart 可以依赖 Data、Plot 与 Standard 的公开契约，但不复制它们的 schema、definition、registry、pipeline、布局或算法。

## 4. ChartSpec 是独立、稀疏且 JSON-safe 的 Tier 3 IR

Chart 可以拥有自己的 `ChartSpec`，因为 Tier 3 需要用 `type` 区分常用图表语义、缩短人和 LLM 的学习路径，并持久化用户的高层意图。

ChartSpec 必须满足：

- 100% JSON 可序列化
- 顶层 `type` 是 Canonical Type 判别值
- 只保存数据引用、字段角色、用户差异配置、显式追加内容与显式单图展示内容
- 实际数据集仍由 runtime / datasets 注入，不内联 rows
- 同一 Chart 只有一个根 `data`，与 Plot 的单根数据模型保持一致
- 多系列复用 Plot 的 series、group、color 等语义，不建立可独立绑定 dataset 的 ECharts 式 `series[]`
- React、Vanilla 与手写 JSON 最终生成或消费同一份 ChartSpec

ChartSpec 不是缩减版 PlotSpec。图本体配置应沿用 Plot 的结构轴，允许配置 data、transform、encoding、scales、coordinate / composition、mark、guides、theme、layout 和追加 marks，但不要求用户重写 `type` 已经确定的内容。Chart 另外拥有可选的单图展示语义，用于表达 Plot 本体之外的标题、说明、来源、自定义绘图内容与外框；它们不是 Plot GoG 成员。Chart 只声明主 Plot 占位与便捷 preset，排列和任意 renderer-neutral child 组合复用 Standard / Core 的正式契约，不建立自己的通用布局系统。

精确字段形态由 ADR 冻结；长期语义先保持：

| 成员                                        | Chart 层语义                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                                      | 单一外部数据引用及可选模型，不保存真实数据                                                                                                                           |
| `encoding`                                  | 声明该类型需要的数据角色与用户覆盖的视觉通道                                                                                                                         |
| `mark`                                      | 投影隐式主 Mark 的完整 Plot 契约，只排除 type、稳定 identity、核心 encoding role、必需 transform 与 view ownership 等 recipe-owned 成员，不改变其 Mark type 或存在性 |
| `transform`                                 | 调整隐式主 Transform 的允许参数，并允许追加显式 Transform；必需 Transform 不可撤销                                                                                   |
| `scales`                                    | 调整类型默认 scale，或增加 Plot 可识别的 scale 配置                                                                                                                  |
| `coordinate` / `composition`                | 调整类型默认空间与组合；type 可以隐式生成多视图 / track 配方，结构性不变量不能被破坏                                                                                 |
| `guides`                                    | 调整、关闭、替换或追加表现性 guide                                                                                                                                   |
| `plotStyleTokens` / `theme` / Plot `layout` | 转发或调整图本体的 Plot 呈现，不建立 Chart 平行 Plot token / preset / resolver                                                                                       |
| Chart `styleTokens`                         | 只调整 Chart canvas、presentation 与 recipe 表现性默认                                                                                                               |
| `marks`                                     | 在类型生成的主 Mark 之外追加正式、JSON-safe 的 Plot Mark                                                                                                             |
| 单图展示                                    | 以唯一主 Plot 占位、有序 renderer-neutral children、文本 preset 与外框表达完整 Chart；布局和绘制复用 Standard / Core                                                 |

这里必须避免把所有文字统称为 `label`：

- Chart-level title、subtitle、caption、note、source、credit 属于单图展示外壳
- axis title、tick label、datum / mark label 与数据锚定 annotation 属于 Plot
- accessibility description 可以由 Chart 保存语义 metadata，但不与可见 caption 共用一个含混字段；实际宿主映射由 adapter / renderer 契约决定
- toolbar、export、fullscreen、loading 等宿主运行时状态不进入静态 ChartSpec

## 5. `type` 选择完整隐式配方

Canonical Type 不是主 Mark 的别名，而是一套完整 GoG 配方。它可以隐式决定：

- 数据角色与默认 encoding
- 一个或多个 Transform
- 主 Mark 或 Mark 组合
- Scale 与 Coordinate / Composition
- Guide、Plot Layout 与 Plot Label 等 type-specific 表现性默认

`type` 是持续成立的语义契约，不是生成后即可任意改写的 preset。配方中定义类型身份的成员构成 **type 核心配方**：只要 ChartSpec 仍声明该 type，这些成员就必须保留并参与最终 PlotSpec，用户配置与追加内容都不能删除、关闭、替换或使其失效。

例如，`waterfall` 可以隐式表达主 Mark 是 Interval Mark，并需要 `derive-interval` Transform；股票图可以隐式表达主 Mark 是股票 Mark。它们可以复用 Plot 内建 definition，也可以由 Chart 随类型提供符合 Plot contract 的具体 definition，或消费宿主注入的 definition；无论来源如何，都必须进入 Plot registry 并由 Plot pipeline 统一执行。上述隐式 Plot 内容不需要在 Chart IR 中重复出现，只在 Chart 解析得到的完整 PlotSpec 中显式展开。可选单图展示内容独立解析，不写入 PlotSpec，也不属于 type 核心配方。

Chart type 的图本体配方只允许三种行为：

1. 复用已有 Plot 能力
2. 组合多个已有 Plot 能力
3. 通过 Plot definition / registry 提供或消费横向扩展

这里必须区分两类“新增能力”：

- **纵向能力机制**：新增 GoG 成员种类、contract、registry、pipeline、lowering 或绕开 Plot 的几何 / 数据执行路径。Chart 不拥有这类能力，缺口必须回到 Plot、Data、Standard 或 Core
- **横向能力实现**：在既有 contract 下新增具体 `MarkDefinition`、`TransformDefinition` 等 provider。Chart 可以为官方 type 提供这类实现，也可以消费宿主扩展，但必须通过 Plot registry 注册、解析和执行

因此，Chart 禁止的是平行能力机制和旁路实现，而不是新的具体 Mark / Transform definition。

单图 presentation 不增加第四种 Plot 配方能力：它只声明 Chart-level 语义，再消费 Standard 已有的通用组合与呈现能力。

## 6. 默认、覆盖与追加

Chart 的解析模型是：

```text
完整 type recipe
  + 用户对隐式主成员的稀疏覆盖
  + 用户显式追加的 Plot 成员
  -> 完整 PlotSpec

可选 Chart presentation
  + Chart 展示样式与排列策略
  -> Standard presentation composition
```

### 6.1 Type 核心配方

Type 核心配方定义该 type 的身份，例如：

- 主 Mark 或必要 Mark 组合
- 必需 Transform
- 必需数据角色
- 维持类型语义所需的 Coordinate / Composition 结构

核心配方不是可撤销的默认值。用户只能在 type 明确允许的范围内调整参数，不能删除、关闭、替换核心成员，也不能把主 Mark 改成另一种 Mark。若需求不再需要这套核心配方，用户应选择其它 Canonical Type 或直接使用 Plot。

以 Connected Scatter 为例，Point、按稳定顺序连接观察值的开放 Path 及二者的共同位置角色属于核心配方。用户可以调整两种 Mark 的表现或追加其它 Plot 内容，但不能删除其中一个核心 Mark、闭合 Path，或改写二者的共同位置角色后仍把结果解释为 Connected Scatter。

### 6.2 表现性默认

表现性默认负责开箱可读性，例如 guide 可见性、Plot label、theme、palette、Plot spacing 和部分 scale 呈现。它们允许调整、关闭或替换。

Chart 的视觉环境消费全仓 [`通用视觉主题设计`](../../../../notes/architecture/visual-theme-design.md)：Core Scene / Scope Theme 提供有效 style / mode，Chart 不在 ChartSpec 重复声明同义字段。Chart 只拥有 canvas、presentation 与 recipe-default token、对应 preset / resolver、到 Standard / recipe 的 mapping 和 inspection；Plot surface、guide、label 与 palette token、preset、resolver 和 native theme merge 由 Plot owner 独立维护。

ChartSpec 的主题 authoring surface 分成两条 owner 明确的输入：`styleTokens` 只接受 Chart-owned key；`plotStyleTokens` 复用 Plot 公开 sparse token contract，并与 `colors`、Plot `theme` 原样进入最终 PlotSpec。Chart 不复制 Plot schema，不把 resolved Plot token 物化回 PlotSpec；recipe 必须读取 palette 等 Plot 结果时，只调用 Plot 公开纯 resolver。

标题、说明、来源等单图展示内容没有值时不得由 type 凭空生成，也不构成 Canonical Type 身份。Chart 可以提供文本 preset、默认 column Flex 参数和间距，但 children 的 authored order、重复 preset、自定义 renderer-neutral child 与 item-local Flex 参数由用户决定；用户也可以省略整套展示外壳。

### 6.3 优先级

统一优先级为：

```text
不可撤销的 type 核心配方
  + (Core effective Theme
     < Chart preset tokens
     < ChartSpec styleTokens
     < ChartSpec 允许的 presentation / recipe 覆盖)

内部完整 PlotSpec
  + (Core effective Theme
     < Plot preset tokens
     < ChartSpec plotStyleTokens
     < ChartSpec colors
     < ChartSpec theme
     < ChartSpec 允许的具体 GoG 成员覆盖)
```

Chart recipe toggle 只能决定默认 guide 是否生成，不能过滤显式 guides。具体 Mark、Scale 或 Guide 的显式配置优先于 Plot theme；追加的 Plot 成员遵守 Plot 自身的 token、theme 与局部配置规则，不继承主成员的局部覆盖。

上述优先级只处理可配置值，不授予后层配置撤销 type 核心配方的权力。

### 6.4 主成员覆盖与额外成员追加

- `mark` 不是 Chart 重新定义的字段白名单，而是对应 Plot 主 Mark 契约的能力投影。除 type、稳定 identity、核心 encoding role、必需 transform 与 view ownership 等 recipe-owned 成员外，其余公开成员随 Plot 契约完整可配；同一 encoding 对象内只锁定核心 role，其余内建与扩展 channel 继续投影
- 类型专属的 transform 配置调整隐式主 Transform
- `marks` 与显式 Plot children 追加新的 Mark、Transform 或其它正式 Plot 内容
- 追加内容不作为替换、关闭或删除类型核心成员的指令
- 显式 ID 与生成 ID 冲突时 fail-loud，不静默覆盖

能力投影必须直接复用 Plot 的 schema / public type 真源，不复制 Chart 版 Axis、Label、Mark、Scale 或 Transform 契约，也不维护随 Plot 字段增长而漂移的手工 allowlist。Chart 可以为 recipe-owned 成员提供更高层的 type-specific authoring；同一非核心值同时由高层 authoring 与 `mark` 投影给出时，显式 `mark` 配置优先，因为它是用户对最终元素的精确操作。由 Mark 最终有效配置派生的表现性默认必须在投影后计算或复验，不能继续解释已被覆盖的高层输入。

具有多个同类隐式成员的 type，需要由该 type 的公开契约定义稳定、语义化的覆盖目标；不得依赖易漂移的数组下标或不透明生成顺序。

Chart 保留 Plot 的高扩展性，但扩展的语义边界是增强当前 type，而不是重新定义它。系统必须对可机械判断的核心配方破坏 fail-loud；对于“追加内容是否仍服务该 type”这类无法可靠判定的高层意图，不建立全面禁止规则，但文档与可解释性工具应明确提示：若追加内容已经成为主要表达、使原 type 只剩名义存在，应改用 Plot。

## 7. Chart 与 Plot 的混合

Chart 与 Plot 支持单向混合：

```text
Chart contains Plot members   ✅
Plot contains Chart           ❌
```

React 中允许在 `<Chart>` 下声明 PointMark、IntervalMark、Transform 等 Plot 内容；这些 JSX children 只是 authoring sugar。对应内容必须进入正式、JSON-safe 的 Chart IR，保证 Vanilla builder 和手写 JSON 具有等价表达。

混合是围绕 type 核心配方的单向增强，不是把 Chart 当作任意 Plot 容器。无论追加多少 Plot members，lowering 都必须保留并执行 type 核心配方；若作者的主要意图已经变成另一种图形组合，应直接使用 Plot。

不支持 `<Plot><Chart /></Plot>`，因为 Chart 需要先选择并展开完整 PlotSpec，再决定是否组合单图展示外壳；把 Chart 作为 Plot 子成员会混淆根数据、默认配方、presentation 与 lowering owner。组合多个完整 Chart / Plot 应使用 Standard 的通用外层组合能力，而不是让 Plot 解释 Chart。

Chart 可以提供或消费自定义 Plot Mark、Transform、Scale、Coordinate 或 Channel。具体 definition 可以随 Chart 官方 type 提供，也可以由宿主注入；Chart IR 只引用对应 operation 与 JSON-safe 配置，definition 必须合入 Plot registry，并沿正常 Plot lowering 链解析和执行。所需 definition 缺失时沿用 Plot 的 fail-loud 诊断。

### 7.1 空间透明封装

Chart 对 Plot 的封装必须保持 **空间透明**。Chart 可以增加整图展示外壳，却不能把 Plot lowering 成一个只有整体 bbox 的黑盒：

```text
Chart result
├─ Chart presentation space
│  ├─ frame
│  └─ authored Flex items
│     ├─ preset / custom child
│     ├─ primary Plot item
│     └─ preset / custom child
└─ Plot body
   ├─ views
   ├─ arrangements: facet / tracks / overlay
   ├─ plotArea / axis regions
   └─ series / datum / spatial handles
```

长期句柄分为两层：

- Chart 为整图、frame、唯一主 Plot item 与 authored presentation item 提供 container-local 稳定 identity；具体公开 handle 由 Core 空间契约冻结
- Plot 继续生成 view、arrangement、facet panel、track、plotArea、axis region、series、datum 等内部 handle，并拥有这些 handle 的领域语义与 provenance
- Core 提供 renderer-neutral 的 handle 数据模型、索引与 qualified selector 基础；Chart 只建立外层 namespace / facade，并把指向 Plot body 的后续选择委托给 Plot / Core handle index
- Standard 对 presentation 与 Plot body 做布局后，可以改变它们的最终全局位置，却不能重命名、扁平化或丢弃 Plot 内部 identity

因此，外部组合或仪表板工具既可以选择整个 Chart 或它的 body，也可以通过稳定、qualified 的 selector 继续定位内部某个 track、facet panel 或 plotArea。qualified selector 的精确语法留给 Core 空间契约；Chart 不复制一份 Plot handle registry，也不把内部生成 id 暴露成新的 Chart 私有寻址体系。

Canonical Type 的完整配方可以隐式生成复杂 Plot composition。例如股票图可以展开为价格轨道、成交量轨道与共享时间轴；只要这些视图共享 coordinate、scale、axis、track 或同一数据映射语义，它们就属于同一个完整 PlotSpec。该 composition 拓扑若构成类型身份，就属于不可撤销的 type 核心配方；用户可以在允许范围内调整或追加内容，但不能把共享骨架拆散后仍保留原 type 语义。

复合需求按所有权分成三类：

| 复合需求                                                                   | owner 与表达                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 一个 type 内共享数据映射、coordinate、scale、axis、facet 或 track 的复合图 | Chart type recipe 生成一个完整 PlotSpec，由 Plot composition 负责             |
| 多个独立 Chart、Plot、Table 或其它内容的静态排列、对齐与空间贴附           | Standard 组合布局 + Core spatial handles；Chart 只暴露可进入的外层 / 内层句柄 |
| linked selection、filter、scroll、responsive state 等仪表板联动            | 更高层 dashboard / workspace runtime；Chart 不拥有 dashboard IR 或状态机      |

Chart 不复制 Plot composition、Standard solver 或 dashboard runtime。Chart presentation 只携带可确定性映射到 Standard FlexLayout 的公开 container / item 契约和 renderer-neutral children；它的职责是让类型配方与这些内容进入各自正式能力链，并保证封装前后同一 Plot 空间仍可被定位、解释和复用。

## 8. Canonical Type 与 Chart Pattern

Chart 文档区分两层概念：

- **Canonical Type**：进入 `ChartSpec.type` 的稳定、封闭判别值，选择完整隐式配方
- **Chart Pattern**：面向用户的常用图表名称，本质是 Canonical Type 加可复用 modifier、表现配置或 Plot 扩展

例如 stacked bar、horizontal bar、smooth line 或 donut 可以先作为 Chart Pattern，而不必立即扩张公开 type union。

Chart type 目录是封闭的：

- 不提供 `defineChart`
- 不提供 Chart registry
- 不把自定义 type 当作 Chart 的扩展机制
- 用户需要新能力时扩展 Plot，再用 Chart 的混合入口消费

关闭 Chart registry 是有意的包边界：Chart 负责精选、稳定和低学习成本的类型目录；若把 type 目录开放成任意 provider，用户仍必须理解完整配方、schema、注册和部署，等价于重新学习 Plot，却额外制造一套扩展面。

Canonical Type 的具体准入规则和首批清单尚未冻结。长期判断至少应比较去除 theme、style 和可复用 modifier 后的数据角色、Mark 组合、Transform 拓扑及 Coordinate / Composition 拓扑；只改变方向、堆叠、平滑或视觉样式的常用名称优先保留为 Pattern。

## 9. Lowering 生成单一可组合结果，不产生第二套语义

Chart lowering 需要完成两个彼此可观察但最终合流的阶段：

1. 校验 ChartSpec 与 Canonical Type 数据角色及核心配方不变量
2. 选择完整 type recipe，应用稀疏覆盖并追加显式 Plot operations
3. 产出可独立检查、通过 PlotSpec schema 的完整 PlotSpec，并保留 Plot-owned token / theme 原始输入
4. 解析可选的 Chart presentation children、唯一主 Plot 占位与 Flex defaults
5. 按 authored order 通过 Standard FlexLayout 把 presentation children 与 PlotSpec 组合为一个完整 Chart 结果
6. 让 Plot 从同一 effective Theme 独立解析 Plot preset / token / native theme，并与 Standard 分别沿自身正式 lowering 链进入 Core

Chart 的最终执行出口不是裸 PlotSpec，也不能是 adapter 私下拼装的 DOM 外壳。长期契约需要同时保证：完整 PlotSpec 可检查，完整 Chart 又是单个 JSON-safe、renderer-neutral 的可组合结果。最终公开函数名与中间结果形态由对应公开契约冻结，不在架构层预设 `ResolvedChart` 等具体类型。

Chart 不得自行测量文字、实现 layout solver、直接生成私有几何，或在 renderer 中特判 preset / custom child。相同 ChartSpec、datasets 与 definitions 必须解析出等价 PlotSpec 和 presentation composition，并在 React、Vanilla、SSR 与手写 JSON 入口保持一致。

## 10. 诊断、追溯与可解释性

Chart 的隐式配方不能成为不可观察黑盒。长期需要满足：

- Chart schema 错误指向用户可修改的字段或数据角色
- type 不支持某种覆盖时 fail-loud
- 删除、关闭、替换或使 type 核心成员失效时 fail-loud
- 必需的 Plot definition 缺失时保留 Plot 的 capability 诊断
- 生成 ID、默认成员与用户追加成员具有稳定来源
- 工具可以区分 type default、用户 override 与显式 Plot extension 对 PlotSpec 的贡献
- 工具可以区分 Chart presentation、Plot guide / label 与宿主 UI，并检查最终组合树
- Chart 外层 handle 与 Plot 内部 handle 的 namespace、qualified selector 和来源可检查
- Plot 的 view / arrangement / facet panel / track / plotArea identity、provenance / locator / lineage 在 Chart lowering 后继续可用

具体 diagnostics 和 provenance artifact 由对应能力契约定义，但不得依赖 React-only 状态或 renderer DOM 反推。

## 11. Framework authoring 等价性

Chart 家族按模块发布：

- `@retikz/chart`：schema、类型配方、lowering 与框架无关 helper
- `@retikz/chart-react`：`<Chart>`、JSX sugar、runtime 接线
- `@retikz/chart-vanilla`：plain builder、SSR 与 framework-neutral runtime

三条入口共享同一 ChartSpec 与 Chart 解析 / 组合主链。React 使用包级扁平导出的 headless components 声明主 Plot、文本 preset 与任意 Retikz drawable child；所有 authoring 都必须归一化为 JSON-safe Chart IR。Vanilla 不得只能消费展开后的 PlotSpec，React 也不得拥有 ChartSpec 无法表示的额外类型语义、普通 DOM child 或 DOM-only 外壳。嵌套 Tier 2 child 的 datasets、definitions 与 inspection 必须由 Kernel adapter 的通用 contribution 聚合机制保真转交，Chart adapter 不建立私有旁路。

## 12. 缺口流向

当一个 Chart type 无法用现有能力表达时，按根问题处理：

| 缺口                                                                                       | owner                                                          |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 通用 rows / fields / statistics 算法                                                       | `@retikz/data`                                                 |
| 新的 Mark、Transform、Scale、Coordinate、Guide、Composition、interaction 能力轴或 contract | `@retikz/plot`                                                 |
| 符合既有 Plot contract、只服务 Chart 配方的具体 definition                                 | `@retikz/chart` 或独立扩展包，经 Plot registry 消费            |
| 通用图形、几何、测量、编译或 renderer-neutral primitive                                    | Core / Math / Runtime / Render                                 |
| 跨领域复用的官方绘图 composite 与呈现                                                      | `@retikz/standard`                                             |
| Chart type 默认、字段角色映射与用户友好配置                                                | `@retikz/chart`                                                |
| 主 Plot 占位、title / caption 等文本 preset 与单图展示 inspection                          | `@retikz/chart`，任意 child 复用 Core，布局与绘制消费 Standard |
| export、toolbox、fullscreen、loading 与其它宿主 chrome / 状态                              | React / Vanilla adapter 或更外层 host                          |

Chart 不允许用“只服务一个 type”为由绕开能力 owner。符合既有 Plot contract 的类型专用 provider 可以留在 Chart，但必须形成 definition / registry / lowering 的正式闭环；只有当需求引入新的能力轴、contract 或底层机制时，才必须先补 Plot / Data / Core 的纵向闭环。

## 13. 非目标

- 不建立与 Plot 平行的 GoG、IR、registry、pipeline 或 renderer
- 不提供用户自定义 Chart type 或 `defineChart`
- 不把 Canonical Type 降级为可任意改写核心配方的 preset 或通用 Plot 容器
- 不内联真实数据集，不建立 series-local dataset 模型
- 不封装 Table；geo-backed type 等 geo 边界确认后再决定
- 不把 DOM 事件、函数 callback 或宿主状态写入 Chart IR
- 不把 Chart presentation 塞回 PlotSpec，也不让 adapter 用 DOM-only 外壳补齐静态图表
- 不让普通 ReactNode、DOM element 或 renderer object 进入 Chart IR；自定义绘图内容只复用 Core `IRChild` 与 Standard item 契约
- 不以类型数量作为完备目标，不追逐所有市场别名
- 不在长期设计中冻结 v0.1 字段、文件结构、测试 case 或实现顺序

## 14. 后续设计入口

进入具体版本前仍需逐项确认：

1. Canonical Type 的准入阈值、命名和首批目录
2. 各 type 的数据角色及完整隐式配方
3. 多个隐式同类成员的稳定覆盖定位
4. 表现性默认的关闭 / 替换语法
5. Chart presentation preset、自定义 child 与 accessibility metadata 边界
6. 完整 PlotSpec inspection、presentation composition 与最终单一结果的 diagnostics / provenance
7. React children、Vanilla builder 与 JSON IR 的精确 parity
8. Chart Pattern 的文档元数据、分组与搜索策略
9. Chart 外层 handle、Plot 内部 handle forwarding 与 qualified selector 的长期空间契约

这些议题由 architecture design 或对应能力契约继续收敛；未确认前不得由实现细节反向冻结。
