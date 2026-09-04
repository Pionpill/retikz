# Schematic Graph 完备设计

> **状态：长期能力边界已确认；Graph v0.1 alpha.1 的 Group / Entity / Relation 与 alpha.2 的 Block 契约均已确认。** 本文回答“什么属于 `@retikz/graph`”以及“怎样才算形成可复用关系图闭环”，不维护具体组件清单或版本完成状态
>
> 关联：[`Schematic 制图能力域设计`](../../../../notes/architecture/schematic-design.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Core Drawing Complete`](../../../kernel/_notes/architecture/core-drawing-complete.md) · [`Standard Drawing Library`](../../../library/_notes/architecture/standard-library-design.md)

## 1. 定位与问题边界

Graph 解决的是：

> 用稳定、JSON-safe、renderer-neutral 的数据表达可组合节点、关系与局部 Graph 呈现上下文，使作者、工具与 LLM 能直接理解“对象是什么、如何关联”，并通过 Core-compatible 实例字段直接进入绘图链路

Graph 是 Schematic foundation，长期拥有 Group / Block family / Entity / Relation 语义、领域 resolve、可选 `graphTheme` context 与可独立绘制的 semantic composite。Graph、Group、Block、Section 与 Row Source 组合完整 Core Scope surface。位置、路径、尺寸、内容和 NodeTarget endpoint 直接复用 Core 契约；Group 表达任意内容的可见包含，Block 表达具有 Graph identity 的开放内容纵向布局容器，Header / Section / Row 是可选的独立组合，Row 直接接受任意 children。Graph 不建立独立 Port、geometry、reference、成员集合、Variant 视觉轴或按 identity 分离的 appearance 模型。`IRGraph` 不是必需模型根，只是可选上下文；Graph family composite 可以出现在任意 Core 内容树位置

Graph 不拥有 Diagram 自动布局、自动 routing、Editor 或 renderer。Graph 支持自由布局仅表示作者可以显式提供位置与连接方式；拖拽、selection、viewport、history 和交互 session 仍归 Editor

## 2. 包角色与完整链路

| 角色           | 主责包 / 协作包             | 责任                                                                                                                                | 不拥有                                                               |
| -------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Graph 主责     | `@retikz/graph`             | Graph / Group / Block / Entity / Relation Source IR、领域 resolve、Graph context、Definition、Core-compatible 字段、lowering 与诊断 | 成员数据库、Port / geometry 模型、Diagram 自动布局、Editor、renderer |
| 通用排版布局   | `@retikz/layout`            | FlexLayout、spacing、measurement、artifact 与公共 composition contract                                                              | Graph 关系语义、Diagram 约束与算法编排                               |
| 通用绘图拓展   | `@retikz/standard`          | Surface 等领域无关绘图 composite                                                                                                    | Graph / Diagram 数据和算法                                           |
| 图形表达与编译 | Core / Math                 | IRChild、Node、Path、NodeTarget、namespace、shape、Scene 与几何                                                                     | Graph / Diagram 领域语义                                             |
| authoring      | graph-react / graph-vanilla | 构造对应 Graph / Group / Block / Entity / Relation Source IR 并接入宿主                                                             | Graph schema、resolve、lowering、布局算法                            |
| 自动图示布局   | 未来 `@retikz/diagram`      | LLM-first Flow Source、扁平 token、全局与单项配置、布局意图、Graph 语义投影、约束确定化、provider、自动 layout / routing 与结果交付 | Graph 基础语义、屏蔽字段、Editor、renderer                           |

```text
Graph / Group / Block / Entity / Relation direct IR / React / Vanilla
  -> per-composite resolve / lowering
  -> Core Node / Path / Scope + namespace
  -> Scene
  -> renderer
```

React Graph standalone 时复用 Layout 建立 Scene，并把 Graph Source 作为唯一 authored child；嵌入外层 Layout / Scene 时只贡献局部 Graph Scope。Graph 在两种模式下都使用同一完整 Core Scope properties，standalone-only viewport、renderer、runtime 与资源 fields 不进入 `IRGraph`；这不让 `IRGraph` 成为必需模型根，也不让 Graph 拥有 Layout solver 或 renderer

Graph context 通过 Graph / Group / Block Definition 对自身可见 Source child tree 的编译期投影生效：生成态 Entity / Relation 仍保留原 discriminator，并由各自 provider 消费；已知的 Block family 内容边界与普通 Scope 可穿透，第三方 composite 内部不透明。该投影不进入 authored Source schema，不增加 Core 领域 context bag、成员索引或第二套 endpoint / lowering 真源

Graph Theme style 与 Core、Plot、Table 使用同一个 Core `theme.style` 名称协作，并统一拥有 Entity / Relation 默认以及 Group / Block 根 Surface 外观。Graph 发布包只维护 Neutral baseline；React 通过 `GraphThemeProvider` 为 standalone Graph 注入 Graph-owned style definitions，embedded Graph / Group / Block / Entity / Relation 在 Layout 的静态 InputEmbed 提取边界显式传递同一 definitions，Vanilla 也通过显式 definition options 注入。Docs 可复用 Viz Preview Theme selector，并通过公开 Definition 提供 Academic、Vibrant、Clean reference styles；Preview host 负责把同一 bundle 显式交给 embedded Graph authoring。这些消费方 reference styles 不进入 Graph Source enum 或发布包内置 registry

任一 Graph 能力若只能在 React、demo、某个 renderer 或未序列化 helper 中成立，都不算 Graph 闭环。Diagram 可以拥有适合 LLM 与自动布局的窄 Flow Source，但必须把它确定性投影为 Graph 的 Group / Entity / Relation，并复用 Graph role、Theme、Core identity / namespace 与 canonical lowering，不得建立平行下层语义真源。Graph Block 在自身结构与连接契约稳定前不进入 Flow；未来消费方仍须从 Source 派生内部 endpoint 所属关系。布局计算及其调度由 Diagram 或其它消费者拥有，Graph 不为其预建 geometry result collection

## 3. 完备能力面

| 能力面            | 完备目标                                                                                                          | 关键不变量                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Relationship data | JSON-safe 地表达独立 Group / Block / Entity / Relation、metadata、NodeTarget endpoint 与 Core-compatible 实例字段 | 不混入函数、renderer 或 Editor 状态 |
| Domain resolve    | 分别确定 Entity / Relation Definition、Theme、metadata 与补全后不变量                                             | 不收集 Graph 成员或复制 Core 引用   |
| Graph context     | Graph / Group / Block 用完整 Scope，并用 `graphTheme` 为可见 Graph 后代提供 appearance 默认                       | 不成为必需父节点或隐式 namespace    |
| Semantic identity | 正式元素由 schema / describe / discriminator 表达                                                                 | 不由 shape、颜色或位置代替          |
| Lower surface     | Node / Path / Scope 字段保持 Core 名称、默认、校验与几何语义；Block / Section / Row 复用完整 Scope                | 不建立 Graph geometry / style 投影  |
| Core Sugar        | 无独立持久化语义的便捷写法直接输出基础 Core IR                                                                    | 不为命名一致性强造 composite        |
| Lightweight lower | 单 Node / Path 元素通过普通 Definition 一对一下沉                                                                 | 不复制 Core schema、parser 或算法   |
| Layout composite  | 局部布局、artifact 与多图元输出形成完整闭环                                                                       | 不复制 Core / Layout 机制           |
| Composition       | Graph family composite 可进入任意 Core 内容树；Group 与 Block family 的内容直接组合 `IRChild`                     | 不建立 Graph-only 通用 child 镜像   |
| Extension         | 开放 role / appearance 沿既有契约扩展                                                                             | 不建立隐藏白名单或第二 registry     |
| Authoring parity  | direct IR、React、Vanilla 产生等价输入与结果                                                                      | JSX children 只是 sugar             |
| Diagnostics       | schema、definition 与 Core namespace / target 失败可定位                                                          | 不重写为 Graph membership 错误      |
| Traceability      | 显式 authored id 与适用 Core namespace / Scene identity 稳定                                                      | 省略 id 时不创建内部模型 identity   |
| Docs / LLM        | describe、API 与双语 recipe 可发现且一致                                                                          | 不把 recipe 误写成独立 IR           |

## 4. Data 与 Resolve

Graph Data 由独立 Group / Block family / Entity / Relation record、对应 Core lower target 的实例字段与各类图自己的 JSON-safe 扩展组合而成。Relation source / target 直接使用 Core NodeTarget；领域执行状态、任意回调和运行时对象不进入 Graph IR。Entity 以排除结构字段的方式复用 Core Node：`type`、`shape`、`boundary`、`padding`、`cornerRadius` 由 Graph role / lower target 决定。Relation 以同样方式复用 Core Path，只排除与 Relation discriminator、语义 kind、route、labels、endpoint markers 和开放连线冲突的字段。Group、Graph、Block、Section 与 Row 完整复用 `IRScopeProps`。Group 额外组合 Surface 呈现、caption、Core Node labels 与任意 children；Block 组合 Surface 与纵向 FlexLayout，并按 authored order 接受任意 children；Header、Section 与 Row 是独立可选 composite，Row children 直接保存任意 `IRChild`。它们都不保存自动布局结果

Entity / Relation resolve 分别消费自身 Source IR 与窄上下文，处理领域默认、Definition lookup、Theme appearance rules、metadata 解释及补全后不变量。Graph / Group resolve 建立局部 Graph context 并保留有序 children，Group 同时解析根 Surface appearance；Block family resolve 保留 authored order、确定组合默认，并为 Block 根 Surface 解析 appearance。它们都不收集成员、校验 membership 或建立 endpoint 索引；Group / Block family lowering 只组合既有 Surface、Layout 与 Core 能力。Theme rules 只按 role、kind、predicate 与 direction 等真实语义为 Entity / Relation 提供默认，不使用纯视觉 Variant selector；Group / Block 不增加 rule selector，只消费同名 Graph Theme 的闭合 `background`、`border` 与 `cornerRadius` baseline，显式 Source 顶层字段最终替换。namespace、重复 id、NodeTarget、anchor 与 unresolved reference 由 Core 统一处理；Graph 不负责自动布局、routing、Scene 输出或 Editor 状态

Graph 不复制 Plot 的 Transform、Encoding、Scale 或 Coordinate 分层。根据任意字段声明视觉 channel 的能力只有在真实 Graph 数据可视化需求出现后才单独设计；固定 kind、predicate、metadata 与 Theme style 的确定化属于 Graph resolve

Group、Block、Header、Section、Row、Entity、Relation 与 Graph 都是独立 composite。`IRGraph` / `IRGroup` 不表达成员数据库、全局关系模型或编辑文档；Group 与 Block 的嵌套内容树是唯一包含事实源，Header / Section / Row 仅在作者显式使用时存在。adapter 不得把 declaration 数组、runtime embed id、endpoint 所属索引或 normalization 结果投影成第二套集合与引用真源

## 5. Semantic identity 与 lower target 判定

新增 Graph 元素先回答：

1. 是否具有独立、长期可持久化的图式语义，而不是某个 authoring shorthand 或页面 recipe
2. 是否只需一个现有 Core Node / Path，且不增加独立布局、artifact 或几何算法
3. 是否需要多个 children、局部布局、artifact、identity facade 或多图元 lowering

没有独立持久化语义的便捷写法优先做 Core Sugar；正式元素只需一个 Core lower target 时使用轻量 expansion Definition；需要局部布局、artifact 或多图元输出时使用 layout-aware composite；仅由现有元素组合且没有新不变量时保留为 docs recipe。所有路径都不得把函数、ReactNode、renderer 对象或运行时编辑状态写入 IR

## 6. Graph 与 Diagram

Graph 提供“图中有什么、对象如何关联以及如何显式呈现”；Diagram 提供“这些关系应按哪类布局规则自动排列”。允许的方向只有：

```text
Diagram -> Graph
```

Diagram 用自己的高层 Flow Source 平级声明 Entity / Group / Layout，以根、Group 与 Layout 的 `children` 引用组织唯一 containment，并保存显式 relations、rank、扁平 token、结构化 flowTheme、单项 style / layout、spacing 与 routing intent。resolve 校验引用与 owner 后重建递归 Canonical tree，再确定性生成 Graph semantic records。当前 Flow style 只投影 Entity / Relation / Group 已公开字段，不复制 Graph namespace、通用 NodeTarget、position、route、完整 lower-facing surface 或 Graph 特意屏蔽的 role-owned 结构。Group 始终下沉为可见 Graph Group并保留 endpoint identity；独立 Layout 复用 Layout Flex compiler 形成无外壳固定排列、artifact 与 inspection handle，不产生 Graph identity。Graph Block 及其 Section / Row endpoint 投影延期到 Block 契约稳定后的独立 Diagram 设计，当前 Flow 不预留字段或兼容入口。Entity / Group / Layout 保留 authored identity，Flow relation 由根 `relations` 集合和数组顺序确定，不重复保存 discriminator 或 id。Diagram resolve 确定 Graph 投影、token 到全局再到单项配置的级联、布局默认、约束与 provider；Diagram layout 结合 Kernel 的 measurement / geometry capability 计算节点位置、分组边界、边线路径和标签位置，并按 element id 与 relation Source 顺序产出 renderer-neutral artifact

Graph 不保存 Diagram Source、layout provider、算法内部状态、geometry result、endpoint 所属索引或来源标记。Diagram 的 Flow element 是一次窄高层投影，不重新定义 Graph role、Theme、Core identity / namespace 或 canonical lowering；当前也不投影尚未稳定的 Block family。它如何调度计算并把最终位置、路径或尺寸交付给 Graph 或其它下游，由 Diagram ADR 明确，不得把裁决协议反向加入 Graph

`@retikz/diagram` 是实际的自动图示能力包，不是 Schematic 聚合入口。`flow`、`tree`、`layered`、`force` 等布局可以作为 Diagram kind、provider 或 preset；Gantt 等领域可以复用 Graph / Diagram 的适用能力，但仍拥有自己的领域 Data 与 Resolve。无领域算法只有经过真实复用验证后才下沉到 Layout、Math 或其它通用 owner

## 7. Layout / Standard / Core 复用边界

Graph 可以拥有“Relation 是关系呈现”等职责，但不拥有它依赖的通用布局和几何算法：

- Graph 本身不排布 children；作者需要布局时组合 Layout FlexLayout / GridLayout / OverlayLayout。standalone React Graph 只复用 Layout 的 Scene host，不取得 solver 所有权
- spacing、axis sizing、allocation、clip、measurement 与 layout artifact 复用 Layout 公共 composition contract
- Group 外框直接复用 Standard Surface；不依赖 Standard Frame，也不复制 Surface 能力
- Block 固定使用 Layout 排列 Header / Section / Row / Cell，Cell 直接组合 Flex item，根外框复用 Surface，Section / Row endpoint 复用与 allocation 重合的 Core Node host
- Node、Path、shape、anchor、target 解析与 Scene identity 复用 Core
- renderer 只消费最终 Scene，不识别 Graph 或 Diagram discriminator

Graph 不得跨包 deep import Layout `internal` / `pipeline`，也不得复制 solver。若多个上层需要同一内部语义，Layout 应提供最小、命名清晰的公共原子契约；若只有一个元素需要局部组合，优先复用完整公开 layout compiler，不公开无关内部状态

Layout 公共 composition API 是无隐式注册的 owner-to-owner 组合面：上层 composite 可以在自己的 compile 中直接调用公开 compiler，并继承其 probe、replay、artifact 与失败语义；独立 authored Layout 仍通过显式 Definition 注入。直接组合不建立第二个 registry，也不允许上层访问 solver 的可变中间状态

## 8. 语义开放与未来能力

Graph 的统一入口不是封闭的组件枚举。UML Class、State、actor、lifeline、fork / join、note 等候选应从真实用例提炼，但不得因为“未来可能需要”提前固化字段。每个候选都经过 semantic identity / Core Sugar / lightweight / layout-aware / recipe 判定，并证明：

- 去除具体产品词汇后仍是可复用图式语义
- 可以脱离自动布局独立绘制
- 默认呈现可替换而语义身份不丢失
- 与通用 Graph 模型和已有元素没有重复持久化真源
- direct IR、React、Vanilla、tests 与 docs 能闭环

完整 UML 元模型、状态转换规则、工作流执行和领域 socket 约束不进入 Graph。Graph 当前拥有 Group / Block / Entity / Relation 语义与可选局部 context；Group 只表达可见包含边界，Block 只表达结构化图节点，不保存 Diagram compound-layout 结果。Relation endpoint 复用 Core NodeTarget，可引用 Core 已公开寻址的 Node、Coordinate、resolved Scope 及下沉为这些 target 的上层 composite；Block、Section 与 Row 通过显式 id 下沉为这些 target，具体连接点继续由 anchor / boundary 指定。Path id、Cell key、artifact key、provenance 或 spatial handle 不因拥有局部身份自动成为 endpoint；input / output、socket 类型、连接容量与 port constraint 仍由对应上层领域或 Diagram 拥有

## 9. 迁移与兼容原则

当一个既有能力被确认放错 owner 时，`0.x` 阶段直接迁移到 Graph 或 Diagram，并同步 schema、Definition、adapter、docs 与测试。旧 owner 不保留 re-export、别名、双 namespace 或双 registry；否则两个包会同时宣称语义真源。迁移 ADR 必须写清 canonical namespace、release group、下游更新和 superseded 关系

## 10. 准入与闭环检查

新的 Graph / Diagram 能力进入 roadmap / ADR 前至少回答：

```md
## Schematic Graph / Diagram 完备性检查

- 用户问题与图式语义：
- Flow Source / Resolve、Graph Data / lowering 与 Diagram Layout 归属：
- LLM-first canonical JSON、definition catalog、可修复 diagnostics 与 deterministic normalization：
- Graph 的 JSON-safe 输入、可选 id、Core NodeTarget endpoint、Graph context 与 Core-compatible 实例字段，以及 Flow element 的必需 id、无 identity relation 与简化 endpoint：
- Semantic identity / Core Sugar / lightweight / layout-aware / docs recipe 判定：
- 固定职责与可替换 appearance：
- lower target surface 的 Core 真源与 Graph 仅排除 role-owned 结构字段：
- 依赖的 Layout / Standard / Core capability：
- 是否需要新的 Definition / registry；不需要时的理由：
- 结构化局部 endpoint 是否可由现有 NodeTarget + anchor 表达；若新增 Port，现有能力缺口证据：
- layout provider、routing、计算结果交付与 diagnostics；不适用时的理由：
- lowering 与 renderer-neutral 结果：
- direct IR / React / Vanilla parity：
- Editor / 领域执行模型排除边界：
- tests、双语 docs 与 LLM describe 证据：
- 本轮结论：组合 / 扩展 Graph / 新增 Diagram 能力 / 先下沉 / recipe / 延期
```

## 11. 常见反例

- 只提供一个 shape helper，却宣称拥有新的语义组件
- 为简单 Node sugar 创建独立 composite、artifact 与 layout compiler
- 在 Graph 中保存 Diagram direction、rank、routing provider 或自动布局结果
- 在 Diagram 中复制 Graph role / Theme / canonical lowering、Core identity / namespace 或 presentation schema；Flow-specific 窄 authoring 投影不算复制
- 为 Block 再建 Port id / resolver，或按 role、字段名、数组下标猜测 endpoint
- 把 selection、viewport、history、transaction 或拖拽 session 写入 Graph / Diagram IR
- deep import 或复制 Layout FlexLayout、artifact、spacing、measurement 与 clip 算法
- adapter 生成无法由 direct JSON 表达的私有 IR
- renderer 根据 Graph / Diagram discriminator 绘制专用分支
- 同一能力同时由 Standard、Graph 或 Diagram 导出，形成双真源
- 为尚无真实契约的 UML、状态、Gantt 或节点编辑器提前冻结完整字段体系

## 12. 与版本的关系

本文定义长期 Graph Complete 标准；具体元素、模型字段、默认值、迁移批次和发布版本进入 milestone ADR。v0.1 alpha.1 已确认 ADR-06～10 的无 Variant Theme、Group / Entity / Relation 独立 composite、可选 Graph context、Core NodeTarget endpoint 与三入口 parity；alpha.2 已确认复用同一 endpoint 的结构化 Block。`@retikz/diagram` package family、LLM-first Flow Source、布局 provider 与结果交付由独立 Diagram roadmap / ADR 建立
