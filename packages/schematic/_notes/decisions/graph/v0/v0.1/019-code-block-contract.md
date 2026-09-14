---
description: Graph 代码实体的共享内容与 Block 基础，供接口、函数及后续代码节点复用
keywords: 'CodeBlock、Block、代码实体、共享内容'
---

# ADR-019：代码实体 Tier 3 与共享内容契约

- 状态：Proposed
- 决策日期：2026-09-08
- 关联：[roadmap](./roadmap.md) · [InterfaceBlock](./020-interface-block.md) · [FunctionBlock](./021-function-block.md) · [Block 开放内容](./013-block-open-content.md) · [通用视觉主题](../../../../../../../notes/architecture/visual-theme-design.md)

## 背景与目标

代码理解图需要表达实体自身的数据：接口包含属性和方法契约，函数包含签名和逻辑。让作者手动组装 Section 或以通用 Block 配合类别标记，会丢失这些差异，也无法统一校验、保存和生成默认呈现。

代码实体具有独立语义，但共享标题、属性项、签名、可调用成员和逻辑段。本决策建立代码图式 Tier 3，以真实实体组装驱动共享内容的发展，并复用 Graph Block 的布局、Surface 和连接能力。

## 决策

### Graph 内的实体 Block

代码实体由 `@retikz/graph` 拥有，官方 Source namespace 为 `graph`；`@retikz/graph-vanilla` 提供无框架 Input 与 normalize，`@retikz/graph-react` 通过 Vanilla 适配 JSX。不新增包、namespace 或 release group，随 Graph 三包的 alpha.3 交付并保持 lockstep。

Tier 3 表示 Graph 包内的组合层次：InterfaceBlock、FunctionBlock 等拥有独立实体数据结构，内部下沉为基础 Tier 2 Block。包内实体 owner 负责代码内容及其 resolve，基础 Block owner 负责开放内容容器；不把实体字段塞入基础 Block，也不以 Block.role/kind 承载实体模型。

Graph 的职责扩展为提供这些代码说明 Block，不解析源码、不执行函数、不模拟对象实例。类型和值是说明数据，而非 TypeScript 编译器类型或运行时对象。实体通过基础 Block 复用 Layout / Standard / Core，不建立另一套几何或渲染语义。

### 组合与扩展

每类实体拥有独立 Source discriminator 与 schema，通过 Core `defineComposite` 和 dependency provider 下沉为一个 Graph Block。Block 是唯一公开 identity 根；需要先建立主题环境时允许外包仅含 theme、无 identity 的 Core Scope，不把几何或内容属性复制到该边界。Header、Section、Row 及普通文字内容由实体生成，Graph 再消费自身公开 Layout / Standard / Core 路径；实体 Block 不计算几何、不直接输出 Scene primitive。

官方与自定义实体使用同一 Core composite registry。自定义实体采用自己的 namespace/type，声明下层 provider 依赖，可以复用 Graph 公开的共享内容 schema 与主题解析能力；不注册到一个 Block 实体白名单，也不增加第二套实体 registry。

公开 `CodeBlockDefinition<TSource>` 包含 namespace、type、对应严格 Source schema，以及 `compose(source, context) -> ReadonlyArray<IRChild>`；通过 `defineCodeBlock` 定义。TSource 组合本 ADR 的实体公共 surface，新增自身领域字段；compose 只产生 Block 内容，不创建实体根。context 包含已经生效的 Core theme 与有效 codeBlockTokens，不暴露 Core 私有 registry。根 Surface/defaults/Scope 的解析与生成由 Graph 内的公共实体 Block 组合层负责，官方实体也不绕过该层。

`createCodeBlockContribution(definition, options)` 返回 CoreProviderContribution：roots 只有该 namespace/type 对应的实体 key，providers 显式包含公开实体、Graph-owned 延迟内容以及所需 Graph Block family 的完整提供者目录。`createGraphProviders(options)` 是官方实体的集合入口，自定义 contribution 与官方贡献一起传入 resolveCoreProviderDependencies 装配，不新增实体注册表。自定义 type 不进入官方枚举，Core 负责 composite key 冲突与未注册诊断。用户传入 compose 回调失败由 RetikzGraphError 包装，保留 cause。

实体 Block provider 统一先建立仅含 theme 的匿名 Core Scope，再在该 Scope 内调用延迟内容 composite。延迟阶段接收 Core 已解析的 context.theme，解析 Graph 实体 Block 主题 token，调用 compose，最后生成唯一可寻址 Block；原 theme 转移到匿名 Scope，Block 不再携带该字段。无本地 theme 时可直接进入同一内容阶段。用户只注册公开 CodeBlockDefinition，不自行注册或调用内部 continuation；官方与自定义均由同一个 provider 工厂组装依赖。

Direct IR 经 Core compile contributions/roots 注入这些 providers；Vanilla embed adapter 与 React Input embed adapter 通过既有 provider 贡献协议携带同一 contribution 中的 provider 对象。自定义 authoring 可以直接提供自己的 Source 与 provider，不要求额外注册到 React/Vanilla 的实体白名单。共享内容 schema、defineCodeBlock、createCodeBlockContribution 与主题解析 API 均由 Graph 根公开入口提供。

共享内容首先是可组合的数据契约。属性项、签名和逻辑段不因被多个实体使用就成为独立图节点，不增加自己的 discriminator、provider 或布局结果。需要独立图节点时使用实体 composite。

### 根容器与身份

每个实体根复用 Graph Block 的完整公开 surface，仅移除 `namespace`、`type` 和由实体生成的 `children`，增加实体数据，不增加内部区域的样式配置。根 Scope 的 id、localNamespace、transforms、placement、clip、style、defaults、theme、meta 等语义保留，完整复用 Block 的 width/minWidth、Surface 与布局约束。

这些字段只作用一次，不复制到所有生成 child。实体空内容仍产生同一 Block 根。显式成员 id 下沉到对应 Row 或 Section 的 Scope；不从名称、位置或数组下标生成公共 id，不为子项自动添加实体前缀。Relation 使用 Core NodeTarget 与命名空间规则；省略成员 id 不提供成员级寻址。

实体 Block 只有结构化内容这一项收窄：不接受任意根 children；需要开放混排时直接使用 Graph Block。非法 children 在 JSON schema 入口拒绝，而不是被静默丢弃。

## 基础数据结构与公开契约

### 共享数据

以下对象均为严格 JSON Source，公开 IR 类型由对应 schema 派生。`name` 为非空字符串，说明和类型表达式为普通字符串；不解析其语言语法。未列出的字段拒绝。

| 内容       | 字段                                                          | 语义                                                           |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| 参数       | name、可选 typeText、optional、description                    | optional 缺省为 false，不表达默认实参求值                      |
| 签名       | 可选 parameters、returnType、description                      | parameters 为有序参数数组；省略返回类型表示未说明，不推断 void |
| 属性契约   | 可选 id、name、可选 typeText、optional、readonly、description | 数据成员的声明，不保存实际值或初始值                           |
| 可调用契约 | 可选 id、name、signature、可选 logic                          | 方法签名与行为说明，不保存可执行函数                           |
| 逻辑段     | 可选 id、title、body                                          | title 可省略；body 是下述互斥内容                              |

逻辑 body 使用内部 `kind` 判别：`{ kind: 'text', text: string }` 或 `{ kind: 'steps', steps: Array<string> }`。text 和每个 step 必须非空，steps 至少一项；数组顺序就是说明顺序。它不定义条件执行、跳转、循环或返回值传播。

属性值、构造、可见性与模块组成由后续实体决策按真实需要扩展；本决策不把它们预塞入全可选共享对象。重名方法可以表达重载，成员名称不承担 identity；重复显式 id 沿 Core namespace 诊断。

### 封装内容与主题 token

根 name、description 是 Header 文本事实，icon、trail 是可选 Core IRChild 或 null。省略使用实体默认标记，null 显式隐藏，显式 child 替换默认内容。默认 icon/trail 与分区结构由实体定义，主题不创建或删除内容。

代码实体是封装组件，不提供 presentation，也不提供 header/section/row/property/signature/logic 的逐区域格式对象。不增加 graphDefaults.codeBlock 或实例 tokens 字段；需要任意布局与精细样式时，使用基础 Block 及其开放 children。

使用小型、闭合的 CodeBlockTokens 描述共享视觉角色，全部实体消费相同 token，不按实体或成员建立嵌套配置树：

| Token             | 值与默认                                                  | 消费范围                                       |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------- |
| textColor         | Core 文字颜色值；默认 currentColor                        | 标题、属性名称、逻辑正文                       |
| mutedTextColor    | Core 文字颜色值；默认有效 Core semantic.guide             | 描述、类型注释、参数说明、区域标题与默认 trail |
| accentColor       | Core 文字颜色值；默认有效 Core categorical 首项           | 默认 icon                                      |
| codeFontFamily    | Core font.family 值；默认 monospace                       | 方法名称、参数与返回签名                       |
| sectionBackground | Standard Surface background 值；缺省使用基础 Section 默认 | 所有生成的内容分区背景                         |

标题粗体、普通文字层级、readonly/optional 标记与步骤序号的排版固定在实体组合中。字号与测量使用底层文字能力，padding/gap 等内部布局使用基础 Block/Section/Row 默认，不作为额外 token 开放。显式 icon/trail child 使用自身样式，不递归改写任意 child。

### 主题 Definition 与消费

Core Scene / Scope 的 theme.style/mode 是唯一主题环境。扩展现有 GraphThemeStyleSource，增加可选 codeBlockTokens，其类型为上述 CodeBlockTokens 的稀疏覆盖；沿用 GraphThemeStyleDefinition、defineGraphThemeStyle 与 GraphDefinitionOptions.graphThemeStyles，不新增主题 registry。

codeBlockTokens 是主题 Definition 的运行时生成配置，不是实体 Source，也不进入 graphDefaults。它使用 TypeScript 契约并复用原 owner 字段类型，不建立持久化 IR/schema。封装 token 是本能力选择的有限主题接口，不将通用 Block 或其它 Graph 默认片段改回 token 系统。

实体 resolve 在本地 Core Theme 生效后确定：Graph Neutral token → 当前 Core style 对应 Graph Definition 的 codeBlockTokens。缺省字段保留 Neutral，显式 token 按字段替换，sectionBackground 作为复合值整体替换；不进行任意递归深合并。compose context 接收有效 Core theme 与解析后的 codeBlockTokens，官方和自定义实体经过同一消费路径。

Graph Neutral 的默认值取自当前 Core 环境或下层契约，不复制 palette。具名 Core style 必须已在 Core 注册且有同名 Graph Theme Definition；缺少时沿现有错误路径失败。mode 传给 definition；切换 Light/Dark 后重新生成同一组 token。主题只改变视觉，不改变实体类型、内容、分区存在性、成员顺序与连接目标。

不为这些 token 新增祖先 authored defaults 投影、实体识别目录或 selector。graphRules 继续只匹配已有 Entity/Relation。实体自身 graphDefaults/graphRules 原样交给生成 Block，按原契约作用其后代；它们不配置 codeBlockTokens。基础 Block 的外壳字段和 Graph Theme block 片段仍按原 owner 规则消费，与内部 token 分工明确。

## 行为、失败语义与兼容性

实体 Source schema 拒绝 presentation 及其它未声明的内部样式字段。根部已有 Block/Scope 字段仍按原 owner 契约消费，不通过封装 token 改写其覆盖语义。

实体本地 theme 必须先在无 identity 的 Core Scope 中建立环境，再在该 Scope 内解析实体 Block 默认和生成 Block；该边界只承载 theme，Block 保留全部其它根属性，theme 不重复施加。没有本地 theme 时直接使用当前有效环境。此语义通过 Core 既有 Scope traversal 与后续 composite 消费 context.theme 实现，不在最外层 expand 提前解析内容默认，也不以默认 registry 私自解析用户 style。

外部 JSON 只在 parse/schema 边界校验；Source/Canonical/adapter 不复制校验。实体 Block 主动创建的错误统一为 RetikzGraphError，至少区分主题缺失、definition 冲突、用户主题 callback 失败与 compose callback 失败，携带 style/name 与 Source 路径（可用时）；callback 原异常保留为 cause。下层错误沿公开 Core composite 诊断路径保留 cause 与 occurrence，不重新解释 namespace 或尺寸错误。

Direct IR、Vanilla、React 共享一个 Source schema 和领域 resolve。React 不持有默认值、主题合并或私有 IR，runtime definition 函数不进入 JSON。实体 Block 是 Graph 内的新增能力，不改变现有 Block Source；不新增旧名别名、兼容分支或 renderer 专用路径。
