# Schematic 制图能力域设计

> 状态：Schematic 分组、Graph / Diagram 与 Editor 的长期边界已确认。Graph v0.1 已按当前契约形成基础闭环；Diagram 的完整图示分层已确认，具体 presentation、frame、Flow 绘图核心与 Editor 仍需分别通过 milestone ADR 落地

## 1. 目标与边界

Schematic 处理“如何把具有关系或结构的对象表达为可理解、可布局、可编译的图”。它包含两个领域 owner，并明确与 Editor 的协作边界：

1. `Graph`：通用关系数据、图式语义与直接复用 Core lower target 的可绘制封装
2. `Diagram`：组合完整图示的 presentation、frame 与绘图核心，并在 Graph 之上解析布局意图，通过可替换算法计算自动布局、连线与几何
3. `Editor`：跨领域的交互编辑能力，负责选择、变换、事务和历史，不属于 Schematic 数据或布局 IR

Graph 回答“图中有什么、对象如何关联”，Diagram 回答“完整图示如何组织，以及这些关系应按哪类布局规则自动排列”。Diagram 单向依赖 Graph；Graph 不读取 Diagram。`flow` 是 Diagram 首个关系型绘图核心，不再作为独立 package owner。Editor 可以消费 Graph 数据与 Diagram 几何，但 Graph 与 Diagram 都不保存 viewport、selection、history 或 transaction 状态

Schematic 领域的早期公共输入只接受 JSON-safe 结构，不支持 DOT、Mermaid、PlantUML 或其它文本 DSL。未来文本语法只能通过外围 parser 产生同一 Source IR，不改变 Graph 与 Diagram 的 JSON 真源

## 2. Graph 长期边界与当前 foundation

Graph 是 Schematic 的通用关系与呈现基础。长期拥有：

- Group / Block / Entity / Relation 的 JSON-safe 语义契约、领域 Definition、metadata 与适用的 Theme appearance rules
- 可选 Graph context：局部 `graphTheme` 与完整 Core Scope composition
- 与 Core lower target 同名同义的位置、路径、尺寸、内容及 NodeTarget endpoint，不建立 Graph-owned geometry、presentation 或 reference 投影
- 可独立放入任意 Core 内容树的 Group / Block / Entity / Relation 图式呈现能力

Graph 不拥有成员数据库或全局 GraphModel root。`IRGraph`、`IRGroup`、`IRBlock`、`IREntity` 与 `IRRelation` 是独立 Source composite：Group 组合可见包含边界与任意 Core children，Block 组合非递归 Header / Section / Row / Cell 与局部可寻址结构，Entity / Relation 分别组合自身语义和 Core Node / Path lower-facing 字段；Graph 只组合完整 Core `IRChild` 并提供局部上下文。身份、namespace frame、重复 id 与引用解析继续由 Core 统一负责

当前 v0.1 已由 ADR-07～10 完成以下长期组合边界：

- `Group`：独立的可见包含 composite，组合完整 Core Scope、Standard Surface、caption 与 boundary labels，不拥有 children 自动布局或 routing
- `Entity`：独立的语义化 Node composite，role definition 直接持有 shape / padding 等结构
- `Relation`：独立的语义化 Path composite，source / target 复用 Core NodeTarget，role definition 直接持有 direction 对应的 marker / dash 结构
- `Graph`：组合完整 Core `IRScopeProps`，额外提供可选 `graphTheme` context；children 与 Core `IRChild` 同源，不维护 membership 或引用索引

v0.1 alpha.2 正在设计 `Block`：它面向代码与工程结构说明图，使用固定 Header / Section / Row / Cell grammar 和 Layout / Surface / Node 组合形成结构化图节点。Block、Section、Row 的显式 id 继续通过 Core NodeTarget 与 anchor / boundary 连接，不增加平行 Port IR；Blender、Gaea 只作为覆盖性验证，不把执行或 Editor 语义带入 Graph

Group、Block、Entity 与 Relation 保留 `namespace: 'graph'` 的 JSON-safe semantic IR。Group 下沉为复用 Layout / Standard / Core 的可见 Scope composite，Block 下沉为包含 Section / Row Core Node host 的 layout-aware Scope composite，Entity 与 Relation 分别下沉为 Core Node 与 Core stroke Path；role、kind、predicate 与 Graph discriminator 在 lowering 后丢弃。Graph 下沉为普通 Core Scope，原样保留完整 Core Scope properties；不自动建立 local namespace，也不自动生成 id

Graph 不拥有 geometry 数据模型、Diagram 自动布局、自动 routing、避障、命中测试、Editor 或 renderer。作者、Diagram、Editor 或其它消费者可以计算位置与路径，并直接填写 Graph 元素复用的 Core-compatible 字段；Graph 不区分这些值的来源，也不负责调度或合并

## 3. 包族与依赖方向

当前 Graph 包族由三个 lockstep 包组成：

| 包                      | 拥有                                                                                                                             | 不拥有                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `@retikz/graph`         | Graph / Group / Block / Entity / Relation IR、领域 resolve、Graph context、Definition、provider、Core-compatible 字段与 lowering | 成员数据库、Port / geometry 模型、Diagram 自动布局、Editor、renderer |
| `@retikz/graph-react`   | 五类 Source composite 的 JSX authoring 与宿主 adapter                                                                            | Graph schema、resolve、lowering、布局算法                            |
| `@retikz/graph-vanilla` | 五类 Source composite 的 builder、normalize、InputEmbed 与 Vanilla adapter                                                       | Graph schema、resolve、lowering、布局算法                            |

未来 `@retikz/diagram` package family 单向依赖 Graph，拥有完整 Diagram 的区域装配语义、Diagram 专属 frame / appearance、布局意图、布局 Definition / provider、Diagram resolve、布局编排、routing 与计算结果；它复用 Layout 的排版和测量、Standard 的通用绘图 composite、Core 的绘图与 Theme 机制，不复制 Graph 的 Group / Entity / Relation、appearance 或 Theme 契约。Graph 当前没有端口契约；Relation 只复用 Core 已公开的 NodeTarget，后续新的局部连接点能力必须先由 Core 或适用 owner 的独立设计冻结。`@retikz/diagram` 是实际的上层能力包，不是聚合入口；package family 的具体组成与公开 API 必须由自身 roadmap / ADR 确认后建立

允许的方向为：

```text
Graph React / Graph Vanilla / direct IR
          │
          ▼
 Graph / Group / Block / Entity / Relation Source composites
          │
          ▼
  per-composite resolve / lower
          │
          ▼
 Core Node / Path / Scope + namespace
```

Graph 依赖 Core、Foundation、必要的 Math、Layout 与 Standard 公开能力，不依赖 adapter、renderer、Viz、Diagram 或 Editor。Diagram 可以依赖 Graph 及 Core、Math、Layout 的公开 measurement / geometry capability。Graph React / Vanilla 只把宿主写法归一到对应 Graph / Group / Block / Entity / Relation Source IR；不维护私有 IR、Graph-root 成员索引、endpoint 所属索引、默认 id、平行 schema 或 renderer 分支

Graph Theme style 与 Core、Plot、Table 使用同一个 Core `theme.style` 名称协作。Graph 发布包只维护 Neutral baseline；React 通过 `GraphThemeProvider` 为 standalone Graph 注入 Graph-owned style definitions，embedded Graph / Group / Block / Entity / Relation 在 Layout 的静态 InputEmbed 提取边界显式传递同一 definitions，Vanilla 也通过显式 definition options 注入，不建立 ambient 全局 registry。Docs 可以像 Viz 一样通过公开 Definition 提供 Academic、Vibrant、Clean reference styles，并复用同一个 Preview Theme selector；Preview host 负责把同一 bundle 显式交给 embedded Graph authoring。这些参考值不成为 Graph Source enum 或发布包内置白名单

Graph context 不要求 Core 增加领域 context bag。Graph Definition 只遍历自身 schema 可见的 Source child tree，把 Graph-local appearance overrides 投影到生成态 Entity / Relation composite；投影后的节点仍由各自 Definition / provider 消费。普通 Scope 可见，第三方 composite 内部不透明；该过程不收集成员、不解析 endpoint，也不产生 authored id

## 4. Graph 元素与模型的判定

新增 Graph 元素或模型能力前必须回答：

1. 是否具有独立、长期可持久化的图式语义，而不是页面 recipe 或 authoring shorthand
2. 是可独立绘制的 semantic element，还是只提供局部默认与 Theme 的可选 context
3. 是否只需要一个现有 Core Node / Path，还是需要局部布局、artifact 或多图元输出
4. 是否与现有 Graph 元素共享同一 authoring surface；如果共享，应使用统一组件和 `role`
5. 是否能让 direct IR、React、Vanilla、tests、docs 与 renderer-neutral 输出形成闭环

实现分类：

- 无独立持久化语义的便利写法是 Core Sugar，直接输出 Core IR
- 只需要一个 Core Node / Path 的正式元素使用轻量 expansion Definition
- 需要局部布局、artifact 或多图元输出的正式元素使用 layout-aware Definition
- 只是既有元素的组合且没有新不变量的内容保留为 docs recipe
- Graph context 只组合完整 Core child 并影响可见的 Graph 语义后代，不把 adapter declaration 数组或 children 投影成成员数据库

所有路径都不得把函数、ReactNode、DOM、renderer 对象或编辑器状态写入 IR

## 5. 复用边界

Graph 拥有通用关系语义，但不拥有底层绘图或自动布局算法：

- Core 拥有 Node、Path、Step、shape、target、颜色基础能力、Scene 与 renderer-neutral compile
- Layout 拥有 Flex / Grid / Overlay、spacing、measurement、allocation、clip 与 layout artifact
- Standard 拥有移除 Schematic / Graph / Diagram 词汇后仍成立的通用绘图 composite
- Graph 组合这些公开能力，但不 deep import `internal` / `pipeline`，不复制 solver、parser、geometry 或 artifact
- Diagram 拥有结构化关系图的布局意图、约束确定化、provider 选择、算法编排、自动 routing 与布局结果，不把这些能力下沉到 Graph
- renderer 只消费最终 Scene，不识别 Graph 或 Diagram discriminator

Graph 本身不拥有 children 排布算法。standalone React Graph 复用 Layout 建立 Scene，embedded Graph 只贡献局部 Scope；Graph 作为 Layout item 的 placement 继续由 Layout 拥有。需要局部布局、artifact 或多图元输出的未来 semantic composite 可以调用 Layout 的公开 compiler；这不等于 Graph 拥有 Layout registry。独立 authored Layout 仍按 Layout 契约由宿主显式注入 Definition

完整 Diagram 按三个正交层次组织：

1. `Presentation` 表达 title、description、legend 等位于绘图核心之外、但仍属于完整图示的说明内容及区域语义；这些内容可以占据多个外围区域
2. `Frame / Appearance` 组合 presentation regions 与 drawing core 的物理排列、外框、内边距、区块间距和 Diagram 专属外观；排版、测量与 Surface 继续复用 Layout / Standard
3. `Drawing Core` 由具体图类型拥有；`FlowDiagram` 以 Graph 为唯一关系语义真源，负责自动测量、layout、routing 与 renderer-neutral 布局结果

三层不得压成一个同时拥有说明内容、视觉样式、Graph 关系数据与算法状态的平行模型。Diagram 可以拥有“某段内容在完整图示中是 presentation 或 legend”的装配语义，但通用文字、Surface、排版和 Theme 基础能力仍由既有 owner 提供；Legend item 的长期 owner 由对应 ADR 结合真实复用证据决定。移除 Diagram 领域词汇后仍成立且经多个 Tier 2 消费者验证的 composition 才下沉到 Standard 或 Layout

间距按 owner 分为三类：完整图示外框到内容的 `frame padding`、各 presentation region 与 drawing core 之间的 `section gap`，以及 Flow 绘图核心内部的节点与层级间距。前两者属于 Diagram frame composition，后者属于具体 Flow 布局意图；不得合并为没有坐标层级和消费方的通用 `spacing`

## 6. Data、Resolve 与 Layout

Graph 与 Diagram 的稳定管线只有 Data、Resolve 与 Layout 三个领域概念，不复制 Plot 的 Transform、Encoding、Scale 或 Coordinate 分层。Diagram 先分别确定 presentation、frame 与 drawing core，再通过 Layout / Standard 的公开 composition 把三者物化为一个完整图示；Graph Source record 直接承载 lower target 字段，是否以及何时调用布局器由消费者决定：

```text
Diagram presentation + frame intent + drawing core
        │
        ├── presentation resolve and measurement
        └── Flow drawing core
                │
                ├── Graph / Group / Entity / Relation records
                └── Diagram resolve / layout / routing
                            │
                            ▼
                render-ready Graph semantic records
        │
        ▼
Layout / Standard composition
        │
        ▼
Core Node / Path / Scope
```

Graph Data 由独立 Group / Entity / Relation record、对应 Core lower target 的实例字段与各类图自己的 JSON-safe 扩展组成。Group resolve 保留包含层级和可见边界，Entity / Relation resolve 负责领域 Definition、Theme、metadata 与补全后不变量；Graph Theme 只按 role、kind、predicate 与 direction 等真实语义匹配 Entity / Relation，实例 appearance 字段保持最高优先级。Relation endpoint、namespace 可见性、重复 id 与 unresolved reference 交由 Core NodeTarget / namespace 编译统一处理。Graph resolve 只确定局部 Graph context 并保留有序 children，不收集成员或建立引用索引，也不计算、合并或标记 geometry 来源

Diagram 的 frame intent 与具体 drawing core intent 分开 resolve。Frame 只确定完整图示的区域排列、外框、padding、section gap 与专属 appearance；Flow drawing core 增加 direction、rank、order、pin、节点间距与 routing 等布局意图。Flow Resolve 确定布局默认、约束与 provider；Layout 结合 Kernel 提供的测量和几何能力计算节点位置、分组边界、边线路径与标签位置。计算结果如何写入 render-ready Graph Source 或直接进入其它下游，由 Diagram 自身 ADR 决定，不反向要求 Graph 建立 geometry result contract

Diagram 是面向 Graph 关系结构的自动图示上层能力，不是所有领域数据模型的总 owner。`flow`、`tree`、`layered`、`force` 等布局可以作为 Diagram kind、provider 或 preset；Gantt 等领域可以复用 Graph / Diagram 的适用能力，但仍拥有自己的领域数据与 resolve。只有经过真实复用验证的无领域算法或约束才下沉到 Layout、Math 或其它通用 owner

## 7. Editor 边界

Editor 是跨领域交互能力。它可以通过 Graph editor adapter 编辑 Graph 数据和其中的 Core-compatible 实例字段，也可以消费 Diagram 计算结果或编辑普通 Core IR 与其它领域文档。持久化的 Graph 关系数据属于 Graph；selection、viewport、history、transaction、临时拖拽状态与交互 session 属于 Editor，不写入 Graph 或 Diagram Source IR

## 8. 迁移原则

当能力被确认属于 Schematic Graph 或 Diagram 时，`0.x` 阶段直接迁移 owner，并同步 schema、Definition、provider、adapter、docs、registry、tests、release metadata 与架构文档。旧包、旧 namespace、旧路由和旧导出不保留 re-export、alias、fallback 或双真源

## 9. 完备性检查

每个 Graph / Diagram milestone ADR 至少说明：

- 用户问题、图式语义与 LLM 可见字段
- presentation、frame / appearance 与 drawing core 的区域语义、owner 和组合顺序
- frame padding、section gap 与 drawing-core spacing 的坐标层级和消费方
- Graph Data / Resolve 与 Diagram Resolve / Layout 的 owner 和依赖方向
- JSON-safe IR、可选 id、Core NodeTarget relation endpoint、Graph context、Core-compatible 实例字段与失败语义
- role、appearance、shape 与可替换呈现边界
- lower target 字段的 Core 真源、Graph 显式收窄与缺失字段诊断
- layout provider、约束、routing、计算结果交付与 diagnostics；不适用时说明理由
- direct IR / React / Vanilla parity
- lowering、Scene 与 renderer-neutral 结果
- Editor 与领域执行模型的排除边界
- tests、双语 docs、schema registry 与 release group 证据

## 10. 版本关系

本文定义长期边界；具体 presentation 字段、legend 来源、frame 默认、appearance、role 词汇、关系模型、布局约束与版本迁移进入对应 milestone ADR。Graph v0.1 已确认 ADR-06～10 的无 Variant Theme、Group / Entity / Relation 独立 composite、可选 Graph context、Core NodeTarget endpoint 与三入口 parity。`@retikz/diagram` package family、完整图示装配、Flow 布局 provider 与结果交付必须由 Diagram roadmap / ADR 确认后建立，Editor 继续独立设计和审查
