# Diagram 制图能力域设计

> 状态：Diagram 目录、Graph foundation 与 Graph / Flow / Editor 的长期边界已确认。Graph 首个 package family 已进入实现，Flow、GraphModel、GraphGeometry 与 Editor 仍需各自 ADR

## 1. 目标与边界

Diagram 处理“如何把具有关系或结构的对象表达为可理解、可编译、可渲染的图”。它同时包含三类问题：

1. `Graph`：可独立绘制的图式元素及其 authored 语义
2. `Flow`：基于 Graph 关系和约束计算布局、连线与几何
3. `Editor`：面向交互编辑的选择、变换、事务和历史

这三类问题共享 Core 的 Node、Path、target、shape、Scene 和 renderer-neutral pipeline，但不共享所有权。Diagram 不为交互编辑保存 viewport、selection 或 history；Flow 不把布局算法写进 Graph；Editor 不拥有 Graph 的关系语义

## 2. 当前 Graph foundation

Graph 是 Diagram 的基础元素层，服务直接 IR、React、Vanilla、工具和 LLM。它提供可以脱离 GraphModel 独立使用、也能被未来关系模型和 presentation 复用的语义元素：

- `GraphNode`：统一的节点入口，通过 `role` 区分 `terminal`、`stage`、`decision`、`junction`
- `GraphConnector`：统一的关系入口，通过 `role` 区分 `flow`、`branch`、`dependency`、`feedback`
- `GraphFrame`：带 header、section、divider 和局部布局的语义外壳

GraphNode 与 GraphConnector 保留 `namespace: 'graph'` 的 JSON-safe semantic IR。它们分别轻量下沉为一个 Core Node 和一个 Core stroke Path；role、variant 与 Graph discriminator 在 lowering 后丢弃。GraphFrame 复用 Layout 的公开 composition contract，不复制布局 solver 或几何算法

Graph 不预先实现 GraphModel、GraphDocument、GraphGeometry、Flow、Editor、自动布局、自动 routing、避障、命中测试或交互状态

## 3. 包族与依赖方向

Graph 包族由三个 lockstep 包组成：

| 包 | 拥有 | 不拥有 |
| --- | --- | --- |
| `@retikz/graph` | Graph schema、IR、factory、Definition、provider 与 lowering | GraphModel、Flow、Editor、renderer、自动布局 |
| `@retikz/graph-react` | Graph JSX authoring 与宿主 adapter | Graph schema、lowering、布局算法 |
| `@retikz/graph-vanilla` | Graph builder、InputEmbed 与 Vanilla adapter | Graph schema、lowering、布局算法 |

允许的方向为：

```text
Graph React / Graph Vanilla
          │
          ▼
       Graph IR
          │
          ▼
Graph Definition / lowering
          │
          ▼
 Core Node / Path / Layout composition
          │
          ▼
        Scene → renderer
```

Graph 依赖 Core、Foundation、必要的 Math 与 Layout 公开能力，不依赖 adapter、renderer、Viz、Flow 或 Editor。Graph React / Vanilla 只把宿主写法归一到同一 Graph factory 和 Definition；不维护私有 IR、平行 schema、默认值或 renderer 分支

## 4. Graph 元素的判定

新增 Graph 元素前必须回答：

1. 是否具有独立、长期可持久化的图式语义，而不是页面 recipe 或 authoring shorthand
2. 是否能脱离 GraphModel 单独绘制，并能被 LLM 通过 schema / role 直接理解
3. 是否只需要一个现有 Core Node / Path，还是需要局部布局、artifact 或多图元输出
4. 是否与现有 Graph 元素共享同一 authoring surface；如果共享，应使用统一组件和 `role`
5. 是否能让 direct IR、React、Vanilla、tests、docs 与 renderer-neutral 输出形成闭环

实现分类：

- 无独立持久化语义的便利写法是 Core Sugar，直接输出 Core IR
- 只需要一个 Core Node / Path 的正式元素使用轻量 expansion Definition
- 需要局部布局、artifact 或多图元输出的正式元素使用 layout-aware Definition
- 只是既有元素的组合且没有新不变量的内容保留为 docs recipe

所有路径都不得把函数、ReactNode、DOM、renderer 对象或编辑器状态写入 IR

## 5. 复用边界

Graph 只拥有图式语义，不拥有底层绘图与布局算法：

- Core 拥有 Node、Path、Step、shape、target、颜色基础能力、Scene 与 renderer-neutral compile
- Layout 拥有 Flex / Grid / Overlay、spacing、measurement、allocation、clip 与 layout artifact
- Standard 拥有移除 Diagram / Graph / Flow 词汇后仍成立的通用绘图 composite
- Graph 组合这些公开能力，但不 deep import `internal` / `pipeline`，不复制 solver、parser、geometry 或 artifact
- renderer 只消费最终 Scene，不识别 GraphNode、GraphConnector 或 GraphFrame discriminator

GraphFrame 在自身 layout-aware Definition 中可以直接调用 Layout 的公开 compiler；这不等于 Graph 拥有 Layout registry。独立 authored Layout 仍按 Layout 契约由宿主显式注入 Definition

## 6. Graph 与 Flow 的关系

Graph 提供“是什么”：节点、连接、外壳、role、identity、可替换 shape 与 authored geometry。Flow 提供“如何放置”：它消费关系模型、布局约束和节点尺寸，计算布局与连线路径。因而 Flow 本质上建立在 Graph 的语义和 Core 的几何能力之上，但 Flow 不是 GraphNode / GraphConnector 的 owner

未来可形成如下链路：

```text
Graph authored elements
        │
        ▼
GraphModel / GraphDocument   ← 独立未来契约
        │
        ├── manual geometry
        └── Flow → layout / routing geometry
                              │
                              ▼
                 Graph presentation / lowering
                              │
                              ▼
                         Core Scene
```

GraphNode 与 GraphConnector 不是 GraphModel。未来的 GraphModel 应使用独立名称记录全局节点、连接、端口、分组和关系，不把 authoring IR 类型直接当成模型数据库或编辑文档

## 7. Editor 边界

Editor 是跨领域交互能力。它可以通过 Graph editor adapter 编辑 GraphModel / GraphGeometry，也可以编辑普通 Core IR 或其它领域文档，但不把 selection、viewport、history 或 transaction 状态写入 Graph package

## 8. 迁移原则

当能力被确认属于 Diagram Graph 时，`0.x` 阶段直接迁移 owner，并同步 schema、Definition、provider、adapter、docs、registry、tests、release metadata 与架构文档。旧包、旧 namespace、旧路由和旧导出不保留 re-export、alias、fallback 或双真源

## 9. 完备性检查

每个 Graph milestone ADR 至少说明：

- 用户问题、图式语义与 LLM 可见字段
- Graph / Core / Layout / Standard 的 owner 与依赖方向
- JSON-safe IR、identity、target、artifact 与失败语义
- role、appearance、shape 与可替换呈现边界
- direct IR / React / Vanilla parity
- lowering、diagnostics、Scene 与 renderer-neutral 结果
- GraphModel、Flow、Editor 与领域执行模型的排除边界
- tests、双语 docs、schema registry 与 release group 证据

## 10. 版本关系

本文定义长期边界；具体字段、默认值、role 词汇和版本迁移进入 Graph milestone ADR。Graph alpha.1 冻结三包与 GraphFrame、GraphNode、GraphConnector；Graph alpha.2 收敛统一 role 与轻量 lowering；后续 Flow、GraphModel 与 Editor 必须分别通过设计和能力完备性审查
