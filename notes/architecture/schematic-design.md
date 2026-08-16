# Schematic 制图能力域设计

> 状态：Schematic 分组、Graph / Diagram 与 Editor 的长期边界已确认。Graph 首个 package family 已实现元素与呈现基础；通用关系模型、Diagram 自动布局与 Editor 仍需分别通过 milestone ADR 落地

## 1. 目标与边界

Schematic 处理“如何把具有关系或结构的对象表达为可理解、可布局、可编译的图”。它包含两个领域 owner，并明确与 Editor 的协作边界：

1. `Graph`：通用关系数据、图式语义、可复用呈现与 authored geometry
2. `Diagram`：在 Graph 之上解析布局意图，并通过可替换算法计算自动布局、连线与几何
3. `Editor`：跨领域的交互编辑能力，负责选择、变换、事务和历史，不属于 Schematic 数据或布局 IR

Graph 回答“图中有什么、对象如何关联”，Diagram 回答“这些关系应按哪类布局规则自动排列”。Diagram 单向依赖 Graph；Graph 不读取 Diagram。`flow` 是 Diagram 可提供的一种有向流程布局类型或 preset，不再作为独立 package owner。Editor 可以消费 Graph 数据与 Diagram 几何，但 Graph 与 Diagram 都不保存 viewport、selection、history 或 transaction 状态

Schematic 领域的早期公共输入只接受 JSON-safe 结构，不支持 DOT、Mermaid、PlantUML 或其它文本 DSL。未来文本语法只能通过外围 parser 产生同一 Source IR，不改变 Graph 与 Diagram 的 JSON 真源

## 2. Graph 长期边界与当前 foundation

Graph 是 Schematic 的通用关系与呈现基础。长期拥有：

- 节点、关系、分组、端口与稳定 identity 的 JSON-safe 数据契约
- 关系端点、包含关系、领域默认、Definition、variant、metadata 与显式 style 的确定化
- 可以脱离自动布局独立使用的 authored geometry，即由作者直接提供的位置和连接方式
- 可复用的 GraphNode、GraphConnector、GraphFrame 等图式呈现能力

Graph 的通用关系模型属于 Graph owner，不另设悬空的 GraphModel owner。单个 `GraphNode`、`GraphConnector` authoring IR 仍不等于全局关系模型；未来 milestone 必须为节点集合、关系集合、端口、分组及其 Canonical 形态建立独立且准确的模型契约，不能把现有元素 IR 当作模型数据库或编辑文档

当前 v0.1 只实现了元素与呈现 foundation：

- `GraphNode`：统一的节点入口，通过 `role` 区分 `terminal`、`stage`、`decision`、`junction`
- `GraphConnector`：统一的关系入口，通过 `role` 区分 `flow`、`branch`、`dependency`、`feedback`
- `GraphFrame`：带 header、section、divider 和局部布局的语义外壳

GraphNode 与 GraphConnector 保留 `namespace: 'graph'` 的 JSON-safe semantic IR。它们分别轻量下沉为一个 Core Node 和一个 Core stroke Path；role、variant 与 Graph discriminator 在 lowering 后丢弃。GraphFrame 复用 Layout 的公开 composition contract，不复制布局 solver 或几何算法

Graph 不拥有 Diagram 自动布局、自动 routing、避障、命中测试、Editor 或 renderer。Graph 支持自由布局仅表示它接受 authored geometry，不表示它拥有拖拽、选择或自由布局求解器

## 3. 包族与依赖方向

当前 Graph 包族由三个 lockstep 包组成：

| 包                      | 拥有                                                                                                  | 不拥有                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `@retikz/graph`         | Graph 元素与通用关系模型的 JSON-safe IR、resolve、Definition、provider、authored geometry 与 lowering | Diagram 自动布局、Editor、renderer        |
| `@retikz/graph-react`   | Graph JSX authoring 与宿主 adapter                                                                    | Graph schema、resolve、lowering、布局算法 |
| `@retikz/graph-vanilla` | Graph builder、InputEmbed 与 Vanilla adapter                                                          | Graph schema、resolve、lowering、布局算法 |

未来 `@retikz/diagram` package family 单向依赖 Graph，拥有 Diagram 布局意图、布局 Definition / provider、Diagram resolve、布局编排、routing 与几何结果；它不复制 Graph 的节点、关系、分组、端口、presentation 或 Theme 契约。`@retikz/diagram` 是实际的上层能力包，不是聚合入口；package family 的具体组成与公开 API 必须由自身 roadmap / ADR 确认后建立

允许的方向为：

```text
Graph React / Graph Vanilla
          │
          ▼
       Graph IR
          │
          ▼
     Graph resolve
          │
          ▼
   Canonical Graph
          │
          ├── Graph presentation
          │
          └── Diagram → Diagram layout geometry
```

Graph 依赖 Core、Foundation、必要的 Math 与 Layout 公开能力，不依赖 adapter、renderer、Viz、Diagram 或 Editor。Diagram 可以依赖 Graph 及 Core、Math、Layout 的公开 measurement / geometry capability。Graph React / Vanilla 只把宿主写法归一到同一 Graph Source IR；不维护私有 IR、平行 schema、默认值或 renderer 分支

## 4. Graph 元素与模型的判定

新增 Graph 元素或模型能力前必须回答：

1. 是否具有独立、长期可持久化的图式语义，而不是页面 recipe 或 authoring shorthand
2. 是可独立绘制的 presentation element，还是描述全局节点、关系、端口与分组的 model contract
3. 是否只需要一个现有 Core Node / Path，还是需要局部布局、artifact 或多图元输出
4. 是否与现有 Graph 元素共享同一 authoring surface；如果共享，应使用统一组件和 `role`
5. 是否能让 direct IR、React、Vanilla、tests、docs 与 renderer-neutral 输出形成闭环

实现分类：

- 无独立持久化语义的便利写法是 Core Sugar，直接输出 Core IR
- 只需要一个 Core Node / Path 的正式元素使用轻量 expansion Definition
- 需要局部布局、artifact 或多图元输出的正式元素使用 layout-aware Definition
- 只是既有元素的组合且没有新不变量的内容保留为 docs recipe
- 全局关系模型使用独立 Source IR 与 Graph resolve，不把 presentation element 集合伪装成模型契约

所有路径都不得把函数、ReactNode、DOM、renderer 对象或编辑器状态写入 IR

## 5. 复用边界

Graph 拥有通用关系语义，但不拥有底层绘图或自动布局算法：

- Core 拥有 Node、Path、Step、shape、target、颜色基础能力、Scene 与 renderer-neutral compile
- Layout 拥有 Flex / Grid / Overlay、spacing、measurement、allocation、clip 与 layout artifact
- Standard 拥有移除 Schematic / Graph / Diagram 词汇后仍成立的通用绘图 composite
- Graph 组合这些公开能力，但不 deep import `internal` / `pipeline`，不复制 solver、parser、geometry 或 artifact
- Diagram 拥有结构化关系图的布局意图、约束确定化、provider 选择、算法编排、自动 routing 与布局结果，不把这些能力下沉到 Graph
- renderer 只消费最终 Scene，不识别 Graph 或 Diagram discriminator

GraphFrame 在自身 layout-aware Definition 中可以直接调用 Layout 的公开 compiler；这不等于 Graph 拥有 Layout registry。独立 authored Layout 仍按 Layout 契约由宿主显式注入 Definition

## 6. Data、Resolve 与 Layout

Graph 与 Diagram 的稳定管线只有 Data、Resolve 与 Layout 三个领域概念，不复制 Plot 的 Transform、Encoding、Scale 或 Coordinate 分层：

```text
Graph JSON Data
        │
        ▼
   Graph Resolve
        │
        ▼
  Canonical Graph
        │
        ├── authored geometry ──────────────┐
        │                                    │
        └── Diagram layout intent            │
                    │                        │
                    ▼                        │
             Diagram Resolve                 │
                    │                        │
                    ▼                        │
        measure / layout / routing           │
                    │                        │
                    ▼                        │
        Diagram Layout Result ───────────────┘
```

Graph Data 由共享节点、关系、分组、端口与各类图自己的 JSON-safe 扩展组成。Graph Resolve 负责引用、端点、包含关系、默认、Definition、Theme、variant、metadata 与显式 style 的确定化，不产生自动布局坐标

Diagram 在 Canonical Graph 上增加 layout kind、direction、rank、order、pin、spacing、routing 等布局意图。Diagram Resolve 确定布局默认、约束与 provider；Layout 结合 Kernel 提供的测量和几何能力计算节点位置、分组边界、端口位置、边线路径与标签位置，并产出以 Graph identity 对齐的 Diagram Layout Result

Diagram 是面向 Graph 关系结构的自动图示上层能力，不是所有领域数据模型的总 owner。`flow`、`tree`、`layered`、`force` 等布局可以作为 Diagram kind、provider 或 preset；Gantt 等领域可以复用 Graph / Diagram 的适用能力，但仍拥有自己的领域数据与 resolve。只有经过真实复用验证的无领域算法或约束才下沉到 Layout、Math 或其它通用 owner

## 7. Editor 边界

Editor 是跨领域交互能力。它可以通过 Graph editor adapter 编辑 Graph 数据和 authored geometry，也可以消费 Diagram Layout Result 或编辑普通 Core IR 与其它领域文档。持久化的 Graph 关系数据属于 Graph；selection、viewport、history、transaction、临时拖拽位置与交互 session 属于 Editor，不写入 Graph 或 Diagram Source IR

## 8. 迁移原则

当能力被确认属于 Schematic Graph 或 Diagram 时，`0.x` 阶段直接迁移 owner，并同步 schema、Definition、provider、adapter、docs、registry、tests、release metadata 与架构文档。旧包、旧 namespace、旧路由和旧导出不保留 re-export、alias、fallback 或双真源

## 9. 完备性检查

每个 Graph / Diagram milestone ADR 至少说明：

- 用户问题、图式语义与 LLM 可见字段
- Graph Data / Resolve 与 Diagram Resolve / Layout 的 owner 和依赖方向
- JSON-safe IR、identity、relation、port、group、authored geometry 与失败语义
- role、appearance、shape 与可替换呈现边界
- authored geometry 与自动布局 geometry 的优先级和非法组合
- layout provider、约束、routing、geometry result 与 diagnostics；不适用时说明理由
- direct IR / React / Vanilla parity
- lowering、Scene 与 renderer-neutral 结果
- Editor 与领域执行模型的排除边界
- tests、双语 docs、schema registry 与 release group 证据

## 10. 版本关系

本文定义长期边界；具体字段、默认值、role 词汇、关系模型、布局约束与版本迁移进入对应 milestone ADR。Graph v0.1 已完成三包与 GraphFrame、GraphNode、GraphConnector 的元素 foundation；通用 Graph 数据模型仍需新的 Graph milestone ADR。`@retikz/diagram` package family、布局 provider 与 Diagram Layout Result 必须由 Diagram roadmap / ADR 确认后建立，Editor 继续独立设计和审查
