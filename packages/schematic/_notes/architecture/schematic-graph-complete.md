# Schematic Graph 完备设计

> **状态：长期能力边界已确认，当前 v0.1 已落地元素与呈现 foundation；通用关系模型仍需后续 Graph milestone ADR。** 本文回答“什么属于 `@retikz/graph`”以及“怎样才算形成可复用关系图闭环”，不维护具体组件清单或版本完成状态
>
> 关联：[`Schematic 制图能力域设计`](../../../../notes/architecture/schematic-design.md) · [`能力完备性与模块边界`](../../../../notes/architecture/capability-design.md) · [`Core Drawing Complete`](../../../kernel/_notes/architecture/core-drawing-complete.md) · [`Standard Drawing Library`](../../../library/_notes/architecture/standard-library-design.md)

## 1. 定位与问题边界

Graph 解决的是：

> 用稳定、JSON-safe、renderer-neutral 的数据表达节点、关系、分组、端口与可复用图式呈现，使作者、工具与 LLM 能直接理解“图中有什么、对象如何关联”，并能在显式自由布局与未来自动布局之间复用同一语义真源

Graph 是 Schematic foundation，长期拥有通用关系数据、Graph resolve、authored geometry 与可独立绘制的 presentation element。当前 v0.1 只实现 Container、Entity、Relation 等元素 foundation；节点集合、关系集合、分组、端口及其 Canonical 模型必须由后续 Graph milestone ADR 落地

Graph 不拥有 Diagram 自动布局、自动 routing、Editor 或 renderer。Graph 支持自由布局仅表示作者可以显式提供位置与连接方式；拖拽、selection、viewport、history 和交互 session 仍归 Editor

## 2. 包角色与完整链路

| 角色           | 主责包 / 协作包             | 责任                                                                                                                    | 不拥有                                         |
| -------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Graph 主责     | `@retikz/graph`             | 通用关系与元素 Source IR、Graph resolve、semantic identity、Definition、authored geometry、presentation lowering 与诊断 | Diagram 自动布局、Editor、renderer             |
| 通用排版布局   | `@retikz/layout`            | FlexLayout、spacing、measurement、artifact 与公共 composition contract                                                  | Graph 关系语义、Diagram 约束与算法编排         |
| 通用绘图拓展   | `@retikz/standard`          | Frame 等领域无关绘图 composite                                                                                          | Graph / Diagram 数据和算法                     |
| 图形表达与编译 | Core / Math                 | Node、Path、target、shape、layout-aware contract、Scene 与几何                                                          | Graph / Diagram 领域语义                       |
| authoring      | graph-react / graph-vanilla | 构造同一 Graph Source IR 并接入宿主                                                                                     | Graph schema、resolve、lowering、布局算法      |
| 自动图示布局   | 未来 `@retikz/diagram`      | Diagram 布局意图、约束确定化、provider、自动 layout / routing 与 Diagram Layout Result                                  | Graph 基础数据、presentation、Editor、renderer |

```text
JSON Graph Data / direct IR / React / Vanilla
  -> Graph resolve
  -> Canonical Graph
       ├── authored geometry
       └── Diagram layout intent -> Diagram resolve / layout -> Diagram Layout Result
  -> Graph presentation / lowering
  -> Core IR / Scene
  -> renderer
```

任一 Graph 能力若只能在 React、demo、某个 renderer 或未序列化 helper 中成立，都不算 Graph 闭环。Diagram 必须复用 Graph 的节点、关系、分组、端口与 identity，不得建立平行数据真源

## 3. 完备能力面

| 能力面            | 完备目标                                                                                        | 关键不变量                          |
| ----------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| Relationship data | JSON-safe 地表达节点、关系、分组、端口、metadata 与 authored geometry                           | 不混入函数、renderer 或 Editor 状态 |
| Graph resolve     | 将 Source IR、Definition、Theme、variant、metadata、显式 style 与引用确定为唯一 Canonical Graph | 不计算 Diagram 自动布局几何         |
| Semantic identity | 正式元素由 schema / describe / discriminator 表达                                               | 不由 shape、颜色或位置代替          |
| Authored geometry | 不经过 Diagram 时也能显式放置节点和连接                                                         | 不引入拖拽或自由布局求解器          |
| Core Sugar        | 无独立持久化语义的便捷写法直接输出基础 Core IR                                                  | 不为命名一致性强造 composite        |
| Lightweight lower | 单 Node / Path 元素通过普通 Definition 一对一下沉                                               | 不复制 Core schema、parser 或算法   |
| Layout composite  | 局部布局、artifact 与多图元输出形成完整闭环                                                     | 不复制 Core / Layout 机制           |
| Composition       | Graph 数据、元素与 Diagram geometry 通过稳定 identity 对齐                                      | 不建立第二套节点或关系模型          |
| Extension         | 开放 role / appearance 沿既有契约扩展                                                           | 不建立隐藏白名单或第二 registry     |
| Authoring parity  | direct IR、React、Vanilla 产生等价输入与结果                                                    | JSX children 只是 sugar             |
| Diagnostics       | schema、definition、reference、target 与 child layout 失败可定位                                | 不用 placeholder 静默兜底           |
| Traceability      | authored identity 与适用 artifact / Scene identity 稳定                                         | 不从 Scene 反推完整 Graph 模型      |
| Docs / LLM        | describe、API 与双语 recipe 可发现且一致                                                        | 不把 recipe 误写成独立 IR           |

## 4. Data 与 Resolve

Graph Data 由通用关系结构与各类图自己的 JSON-safe 扩展组合而成。通用部分只承载节点、关系、端点、分组、端口、identity、metadata、显式 presentation 与 authored geometry；领域执行状态、任意回调和运行时对象不进入 Graph IR

Graph resolve 消费 Source IR 与窄上下文，统一处理引用、包含关系、领域默认、Definition lookup、Theme、variant、metadata 解释、显式 style 优先级及补全后不变量，产出下游唯一的 Canonical Graph。它不负责自动布局、routing、Scene 输出或 Editor 状态

Graph 不复制 Plot 的 Transform、Encoding、Scale 或 Coordinate 分层。根据任意字段声明视觉 channel 的能力只有在真实 Graph 数据可视化需求出现后才单独设计；固定 `kind`、`variant`、metadata 与 style 的确定化属于 Graph resolve

单个 Entity 或 Relation presentation IR 不等于全局关系模型。通用关系模型与元素呈现可以同属 Graph owner，但必须使用不同、准确的契约表达集合、引用和全局不变量，不能把 authoring element 数组当成模型数据库或编辑文档

## 5. Semantic identity 与 presentation 判定

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

Diagram 在 Canonical Graph 上增加 layout kind、direction、rank、order、pin、spacing、routing 等布局意图。Diagram resolve 确定布局默认、约束与 provider；Diagram layout 结合 Kernel 的 measurement / geometry capability 计算节点位置、分组边界、端口位置、边线路径和标签位置，并产出以 Graph identity 对齐的 Diagram Layout Result

Graph 不保存 Diagram layout provider、算法内部状态或自动几何。Diagram 不重新定义 Graph 的节点、关系、分组、端口、presentation、Theme 或 identity。authored geometry 与 Diagram geometry 的优先级及非法组合必须由 Diagram ADR 明确，不得由 renderer 猜测

`@retikz/diagram` 是实际的自动图示能力包，不是 Schematic 聚合入口。`flow`、`tree`、`layered`、`force` 等布局可以作为 Diagram kind、provider 或 preset；Gantt 等领域可以复用 Graph / Diagram 的适用能力，但仍拥有自己的领域 Data 与 Resolve。无领域算法只有经过真实复用验证后才下沉到 Layout、Math 或其它通用 owner

## 7. Layout / Standard / Core 复用边界

Graph 可以拥有“Container 是有序语义区域”“Relation 是关系呈现”等职责，但不拥有它们依赖的通用布局和几何算法：

- children 排布复用 Layout FlexLayout / GridLayout / OverlayLayout
- spacing、axis sizing、allocation、clip、measurement 与 layout artifact 复用 Layout 公共 composition contract
- Frame 等通用绘图拓展按需复用 Standard
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

完整 UML 元模型、状态转换规则、工作流执行和领域端口约束不进入 Graph。通用节点、关系、分组、端口及引用不变量属于 Graph；只有领域规则留在对应上层包

## 9. 迁移与兼容原则

当一个既有能力被确认放错 owner 时，`0.x` 阶段直接迁移到 Graph 或 Diagram，并同步 schema、Definition、adapter、docs 与测试。旧 owner 不保留 re-export、别名、双 namespace 或双 registry；否则两个包会同时宣称语义真源。迁移 ADR 必须写清 canonical namespace、release group、下游更新和 superseded 关系

## 10. 准入与闭环检查

新的 Graph / Diagram 能力进入 roadmap / ADR 前至少回答：

```md
## Schematic Graph / Diagram 完备性检查

- 用户问题与图式语义：
- Graph Data / Resolve 与 Diagram Resolve / Layout 归属：
- JSON-safe 输入、identity、relation、port、group 与 authored geometry：
- Semantic identity / Core Sugar / lightweight / layout-aware / docs recipe 判定：
- 固定职责与可替换 appearance：
- authored geometry 与自动 geometry 的优先级：
- 依赖的 Layout / Standard / Core capability：
- 是否需要新的 Definition / registry；不需要时的理由：
- layout provider、routing、geometry result 与 diagnostics；不适用时的理由：
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
- 在 Diagram 中复制 Graph 节点、关系、分组、端口或 presentation schema
- 把 selection、viewport、history、transaction 或拖拽 session 写入 Graph / Diagram IR
- deep import 或复制 Layout FlexLayout、artifact、spacing、measurement 与 clip 算法
- adapter 生成无法由 direct JSON 表达的私有 IR
- renderer 根据 Graph / Diagram discriminator 绘制专用分支
- 同一能力同时由 Standard、Graph 或 Diagram 导出，形成双真源
- 为尚无真实契约的 UML、状态、Gantt 或节点编辑器提前冻结完整字段体系

## 12. 与版本的关系

本文定义长期 Graph Complete 标准；具体元素、模型字段、默认值、迁移批次和发布版本进入 milestone ADR。v0.1 已建立 package family、公共底层复用和首批元素 foundation，但不代表通用关系模型已经实现。后续 Graph milestone 负责关系模型与 Graph resolve；`@retikz/diagram` package family、布局 provider 与 Diagram Layout Result 由独立 Diagram roadmap / ADR 建立，不反向改写已完成 milestone 的历史范围
