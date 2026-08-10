# Diagram 制图能力域设计

> **状态：Diagram 领域目录与 Notation 方向已确认；Graph / Flow / Editor 仍未实现。** 本文沉淀可复用图式元素、逻辑关系模型、人工几何、算法布局与交互编辑的长期能力边界。`packages/diagram` 是领域目录，不要求存在 `@retikz/diagram` 聚合包；首个能力家族由 Notation roadmap / ADR 冻结，Graph、Flow 与 Editor 仍按各自后续 ADR 演进。Editor 的整体边界见 [`Editor 编辑运行时架构设计`](./editor-design.md)。
>
> 关联：[`Editor 编辑运行时架构设计`](./editor-design.md) · [`能力完备性与模块边界`](./capability-design.md) · [`包拓扑`](./package-topology.md) · [`Standard Drawing Library`](../../packages/library/_notes/architecture/standard-library-design.md)

---

## 1. 背景

retikz 当前已经能通过 Core IR 手写 Node、Path、Scope、Coordinate 等二维图形，也能由 Plot 把结构化数据映射为可视化图形。但流程图、架构图、血缘图、依赖图和节点图面对的是另一类问题：输入首先是一组逻辑关系，系统或用户需要决定这些关系如何排布、连线和交互编辑。

如果让作者或 LLM 直接计算每个节点、分组标题、padding 和连线的绝对坐标，内容稍有变化就需要同步修改大量几何参数。另一方面，Blender、Gaea、UE5 等节点图又不能把位置完全交给算法，因为节点位置是用户持续编辑并保存的结果。

因此需要同时区分四件事：

1. **元素表达什么**：流程、UML、状态等图式中的节点、容器、连接与说明分别承担什么可持久化语义。
2. **关系是什么**：有哪些节点、端口、边和分组。
3. **几何如何产生**：由算法生成，还是由作者直接提供并持久化。
4. **内容如何编辑**：如何选择、拖拽、连线、缩放和撤销。

前三件事属于 Diagram：Notation 提供可独立绘制的语义元素，Graph 保存关系与几何，Flow 可选地计算算法几何。第四件事属于跨领域的 Editor：它通过领域 editor adapter 编辑 Graph，也可以接入普通 Core IR、Notation 元素或其它领域模型。Diagram 不应为了交互编辑而保存 viewport、selection 或 history，Editor 也不应反向拥有 Graph 关系语义。

---

## 2. 与 Viz 的边界

逻辑制图与数据可视化解决不同问题：

| 能力域  | 输入真源                                   | 核心处理                       | 典型产物                      |
| ------- | ------------------------------------------ | ------------------------------ | ----------------------------- |
| Viz     | 数据集、字段、transform、统计结果          | visual grammar、scale、mark    | 柱状图、折线图、分面图等      |
| Diagram | 图式元素，或节点、端口、边、分组和逻辑约束 | 语义呈现、人工几何、布局与路由 | 流程图、UML、架构图、节点图等 |

Graph 不依赖 `@retikz/data`，Flow 也不属于 Viz。某个血缘产品可以把数据库元数据、AST 或业务数据转换成 GraphModel，但转换属于业务 adapter，不改变 Graph / Flow 的能力归属。

```text
业务元数据 ─→ lineage adapter ─→ GraphModel

结构化数据 ─→ Data ─→ Plot ─────────────────────────────→ Core IR
逻辑关系 ───→ GraphModel ─┬─→ Flow ─→ GraphGeometry ─┐
                          └─→ manual GraphGeometry ───┤→ Graph lowering ─→ Core IR
交互操作 ───→ Graph editor adapter ─→ GraphDocument change
```

---

## 3. 总体分层

制图领域采用 `diagram` 作为目录名：

```text
Diagram
├─ Notation：可复用图式元素、语义 sugar 与局部 composite
├─ Graph：关系模型、几何契约与统一 lowering
└─ Flow：算法布局与连线路由

Editor
├─ Editor：无 UI 的交互编辑运行时
└─ Graph editor adapter：GraphDocument 编辑接入
```

这些能力与 Kernel / Standard Library 的关系：

```text
Notation ────────────────────────────────────────────────┐
GraphModel ──┬─→ Flow：系统计算 ─→ algorithm GraphGeometry ─┐
             └─→ 作者直接提供 ──→ manual GraphGeometry ─────┤
Graph editor adapter ───────────→ model / geometry change ──┤
                                                               ↓
Standard Library：Frame / FlexLayout 等通用绘图积木 ─→ Notation / Graph presentation
                                                               ↓
                                                            Core IR
                                                               ↓
                                                             Scene
```

Notation、Graph、Flow 和 Editor 都不拥有 renderer。Notation 通过纯 Core sugar 或 Notation semantic IR 的 Tier 2 lowering 进入 Core IR；GraphDocument 无论来自人工几何、Flow 计算还是 Editor 编辑，都复用 Graph 的 presentation / lowering。两条路径都只通过公开 Core IR / composite / definition 契约进入 Kernel 编译与 SVG、Canvas 等后端。

---

## 4. Notation：可复用图式元素

Notation 是 Diagram 领域的基础元素库，提供可以脱离 GraphModel 独立使用、又能被未来 Graph presentation 复用的图式语义。它统一承接流程、UML、状态、架构等图示中反复出现的节点、容器、局部连接和说明元素，但不预先冻结所有图种的完整语法。

首个 package family 为 `@retikz/notation`、`@retikz/notation-react` 与 `@retikz/notation-vanilla`。其中：

- `@retikz/notation` 拥有 JSON-safe schema、factory、Definition、lowering 与领域中立的默认呈现。
- `@retikz/notation-react` 与 `@retikz/notation-vanilla` 只提供等价 authoring，不拥有新的 IR、布局或 renderer 语义。
- package family 作为 Diagram foundation 独立演进；未来 Graph 可以单向依赖 Notation，而 Notation 不依赖 Graph、Flow 或 Editor。

Notation 元素先判断是否拥有独立、长期可持久化的领域身份，再按 lower target 复杂度选择机制：

1. **Core Sugar**：没有独立持久化语义的便捷写法直接归一为 Core IR，不为命名一致性强行创建 composite。
2. **轻量 expansion composite**：正式 Notation 元素保留 semantic IR，但当前只需一个 Core Node 或 Path 时，通过普通 Definition 一对一下沉，例如 Terminal、Stage、Decision、Junction 与 Connector。
3. **Layout-aware composite**：需要局部布局、artifact 或多图元输出的正式元素使用 layout-aware Definition，例如 LogicFrame。

Notation 的边界以“可独立绘制的图式语义元素”为准，而不是当前逻辑组件清单或 lower target 的复杂度。未来 UML Class、State、actor、lifeline、fork / join、note 等候选可以在真实契约出现后进入相应 milestone；每项仍需判断是已有元素的 recipe、无独立语义的 Core Sugar，还是拥有持久化身份的轻量或 layout-aware composite。

Notation 不拥有：

- 全局 Node / Port / Edge / Group 集合、拓扑校验或 GraphModel。
- 自动布局、障碍规避、全局连线路由或 Flow 约束。
- selection、viewport、history、拖拽或编辑器状态。
- FlexLayout、Frame、shape 几何、target 解析和 renderer 等通用底层机制。
- UML、工作流或状态机的完整领域模型与执行语义。

现有 Standard alpha.3 逻辑组件作为 Notation 的首批输入。在 Notation alpha.1 实现前，Standard 的 Accepted 契约仍是当前真源；迁移完成后以 Notation ADR supersede 对应 Standard ADR，并直接移除 Standard 公开入口，不保留转发或兼容别名。

---

## 5. Graph：关系模型

Graph 负责描述稳定的逻辑关系、可持久化几何以及统一 presentation / lowering。它不决定几何应由哪种算法产生，也不承担用户交互。

### 5.1 GraphModel

GraphModel 是关系真源，至少覆盖：

- Node：稳定 id、类型和 JSON-safe domain payload。
- Port：所属节点、方向 / role、连接能力和 JSON-safe metadata。
- Edge：源节点 / 端口、目标节点 / 端口和关系类型。
- Group：节点或子分组的逻辑归属。
- Reference validation：悬空引用、重复 id、非法端口和不满足约束的连接诊断。

Graph 不理解数据库字段、Plot channel、业务执行函数或 ReactNode。Blender、血缘、流程审批等领域规则应通过 definition、adapter 或上层 domain schema 扩展，而不是写进通用 GraphModel。

### 5.2 GraphGeometry

Graph 包定义作者输入、Flow 和 Graph editor adapter 交换结果时共用的几何数据契约，但不提供布局算法：

- 节点位置与尺寸。
- 分组边界等可持久化几何。
- 连线 waypoint、端口附着结果等可选路径信息。
- 几何来源和失效策略，例如 algorithm、manual、pinned 或 baked。

概念上可以表达为：

```ts
type GraphDocument = {
  model: GraphModel;
  geometry?: GraphGeometry;
};
```

这里的关键不是字段名，而是 GraphModel 与 GraphGeometry 必须分离：关系变化不等于几何变化，重新布局也不能破坏关系真源。作者可以直接提供 manual geometry，不依赖 Editor 或 Flow；Editor 只是通过 Graph editor adapter 修改 geometry 的一种交互入口。

### 5.3 Presentation 与 lowering

GraphDocument 必须有一条不依赖 Flow 或 Editor 的公共 presentation / lowering 主链：

```text
GraphModel + GraphGeometry
  → resolve presentation definitions
  → lower nodes / ports / edges / groups
  → Core IR
```

Flow 计算出的 algorithm geometry、作者手写的 manual geometry 和 Graph editor adapter 保存的 geometry 都进入同一条主链。Graph 可以定义 Node、Port、Edge、Group 到 Core 图形的映射契约及必要的内置 presentation，但通用图元、样式、容器和 renderer 语义仍由 Core / Standard 拥有。

如果 lowering 由 Flow 独占，手写坐标或 Editor 编辑后的 Graph 仍会被迫依赖算法包；如果由 Graph editor adapter 复制，React、Vanilla 和非交互环境又会产生多条不一致的渲染主链。因此统一 lowering 必须随 GraphDocument 的稳定语义归入 Graph。

### 5.4 Graph 不拥有

- DAG、tree、radial、force 等布局算法。
- 自动连线路由策略。
- 鼠标、键盘、选择、viewport 或撤销重做。
- 通用 Core 图元、Standard 积木和 renderer 执行。
- 工作流、材质节点或地形节点的业务执行语义。

---

## 6. Flow：算法布局

Flow 消费 GraphModel 和布局约束，计算 GraphGeometry。它不拥有 GraphDocument 的 presentation / lowering；算法结果交回 Graph 后进入统一下沉主链。

```text
GraphModel
  → normalize
  → measure
  → layout
  → route
  → GraphGeometry
  → Graph presentation / lowering
  → Core IR
```

Flow 主要负责：

- 水平 / 垂直流程、分层有向图、tree 等布局 provider。
- Node、Group 和 label 的尺寸测量协调。
- 层级、顺序、间距、方向和固定位置等布局约束。
- Port 选择、直线 / 折线 / 曲线及避让等路由策略。
- 布局失败、约束冲突和无法路由时的可诊断错误。

Flow 中的人工拖动不应直接把算法布局退化成自由画布。它应转换为 `pin`、`rank`、`order`、port side、waypoint 等约束，再由 Flow 重新计算其余布局。

---

## 7. Editor：跨领域交互编辑

Editor 是 Diagram 之外的跨领域能力组，负责让用户直接操作图形或领域文档。它解决的是无 UI 的交互编辑运行时，不是新的 renderer、领域模型或另一套 Core IR。完整职责、状态模型和 adapter 协议以 [`Editor 编辑运行时架构设计`](./editor-design.md) 为准；本节只保留与 Graph / Flow 的交界。

`@retikz/editor` 的长期能力包括：

- 选择、框选、多选和 selection command 编排。
- 拖拽、缩放、旋转、snapping 和参考线。
- viewport、缩放、平移、快捷键和剪贴板。
- 命令、candidate transaction、撤销重做和 history 协调。
- 面向 Core IR 与不同领域文档的 adapter 契约。

Graph-specific 的 Port 命中、创建连接、重连、waypoint 编辑和模型校验进入独立 sibling 包 `@retikz/graph-editor`。该 adapter 把通用 Editor command / intent 映射为 GraphModel / GraphGeometry change，不把 Node / Port / Edge 规则写入 Editor 基础包，也不要求 `@retikz/graph` 反向依赖 Editor。

Editor 通过 Graph editor adapter 编辑 Graph 时，节点位置写入 GraphGeometry，成为作者拥有的持久化结果。除非用户显式执行 Arrange，否则系统不自动覆盖这些坐标。

```text
GraphModel + GraphGeometry
  → Graph editor adapter
  → 修改关系或几何
  → GraphDocument
  → Graph presentation / lowering
```

Editor 也可以不经过 Graph，通过独立领域 adapter 编辑普通 Core IR / Standard composite，或在未来接入其它领域模型。`Board` 可以保留为自由白板 preset、宿主组件或产品名称，但不再作为 Diagram 子包或底层能力 owner。

---

## 8. 两种几何所有权

算法布局和人工几何的根本差异不是“有没有交互界面”，而是几何结果由谁拥有。人工几何不是另一种布局算法：它表示作者直接提供并持久化位置、尺寸或 waypoint；Editor 只是通过领域 adapter 创建和修改这类 geometry 的一种方式。

| 模式            | 关系真源   | 几何真源                 | 调整方式                           | 重新布局                       |
| --------------- | ---------- | ------------------------ | ---------------------------------- | ------------------------------ |
| Flow 算法几何   | GraphModel | Flow 计算结果与布局约束  | 修改关系或 pin / rank 等约束       | 可重复执行并替换 GraphGeometry |
| Manual geometry | GraphModel | 作者保存的 GraphGeometry | 手写坐标或通过 Editor 直接编辑几何 | 只在作者显式请求时执行         |

当 Flow 与人工几何联合使用时，需要明确当前操作的语义：

- **constraint**：Editor 中的拖动经 Graph editor adapter 转成 Flow 约束，之后仍由算法拥有整体布局。
- **arrange once**：Flow 计算一次 geometry，写回 GraphDocument，随后切换为 manual geometry，由作者拥有位置。
- **detach / bake**：把关系图固化为普通 Core / Standard 内容，允许脱离 Graph 编辑，但不再保证可恢复原 Graph / Flow 语义。

这三种行为不能隐式混用，否则重新布局会不可预测地覆盖用户修改。

---

## 9. 典型场景

| 场景                        | 能力组合                                | 几何所有者                       |
| --------------------------- | --------------------------------------- | -------------------------------- |
| 静态流程图、架构图          | Graph + Flow                            | Flow                             |
| 手写坐标的静态关系图        | Graph                                   | 作者保存的 GraphGeometry         |
| 可交互流程图                | Graph + Flow + Graph editor adapter     | Flow 约束，Editor 提供交互入口   |
| 血缘图浏览                  | Graph + Flow                            | Flow                             |
| 血缘图探索与人工整理        | Graph + Flow + Graph editor adapter     | Flow 初始生成，之后切换为 manual |
| Blender / Gaea / UE5 节点图 | Graph + Graph editor adapter            | 作者保存的 GraphGeometry         |
| 节点图“自动整理”            | Graph + Graph editor adapter，按需 Flow | Flow 单次生成，之后切换为 manual |
| 纯自由白板                  | Editor + Kernel / Standard adapter      | 作者；不属于 Diagram 能力域      |

这组场景证明 Graph 可以脱离 Flow 和 Editor 独立表达人工几何；Flow 与 Graph editor adapter 都是 GraphDocument 的消费者。Graph 不应因为某个消费方需要数据或交互而反向拥有 Data、Flow 或 Editor 状态。

---

## 10. Standard：跨域绘图积木

Notation、Graph、Flow 和 Editor 会共享一部分绘图能力，例如根据 children 边界生成带 padding、background 和 border 的容器，或用 FlexLayout 排布若干区域。这类能力不属于具体图式语义、Graph 关系模型或 Editor 状态，也不应把 Core Scope 扩张成可见 UI 容器。

通用能力进入已经建立的 `@retikz/standard`：

```text
@retikz/standard
├─ Frame
├─ FlexLayout / GridLayout / OverlayLayout
├─ 通用 layout artifact 与组合 helper
├─ Legend 等跨域呈现 composite
└─ 其它可选 Drawing Complete 扩展
```

其中 Frame 已验证的边界是：测量已经布局的 children，应用 padding / minSize，为 title 或 header 预留空间，并生成背景、边框和整体 anchor。FlexLayout 等布局组件拥有通用 measure / solve / placement 与 artifact 机制。Notation 的 LogicFrame 可以组合这些公开能力，但不能 deep import Standard 私有 compile helper，也不能复制布局算法；若现有公共面不足，先由 Standard ADR 冻结最小的 layout composition surface，再由 Notation 消费。Flow 负责 Group 在图中的算法位置，Editor 与领域 adapter 负责用户如何移动元素；Standard 不理解 Notation、Graph、Flow 或 Editor。

通用能力进入 Standard 至少满足：

1. 移除 Notation、Graph、Flow、Editor、Plot 等领域词汇后仍然成立。
2. 有两个以上独立消费场景。
3. 通过公开 Core definition / composite / lowering 契约实现。
4. IR JSON-safe，React / Vanilla 可表达同一语义。
5. 不要求 renderer 特判，不保存编辑器运行时状态。

---

## 11. 包与依赖方向

长期目录可以采用以下工作结构，具体包数和 adapter 拆分留给 ADR：

```text
packages/
├─ kernel/
├─ library/
│  ├─ standard
│  ├─ standard-react
│  └─ standard-vanilla
├─ diagram/
│  ├─ notation
│  ├─ notation-react
│  ├─ notation-vanilla
│  ├─ graph
│  ├─ graph-editor
│  └─ flow
├─ editor/
│  ├─ editor
│  ├─ editor-react
│  └─ editor-vanilla
└─ viz/
   ├─ data
   └─ plot
```

依赖方向必须保持：

```text
Notation adapters ─→ Notation ────────────────────┐
Flow ─────→ Graph + Core / Math ─→ GraphGeometry ─┤
Graph ────→ Notation + Core / Standard ───────────┤→ Core IR → Scene
Notation ─→ Core / Standard ──────────────────────┤
Editor ─────────────→ Kernel 公开 runtime / interaction 契约
Graph editor adapter ─→ Editor + Graph

Plot ─────→ Data + Core
```

明确禁止：

- Graph 依赖 Data 或进入 Viz 能力域。
- Notation 依赖 Graph、Flow、Editor、Viz 或具体 renderer。
- Flow 依赖 Plot、Viz adapter 或具体 renderer。
- Editor 把 selection、viewport、history 等运行时状态写进 Graph IR 或 Core IR。
- Standard 反向依赖 Notation、Graph、Flow 或 Editor 领域语义。
- Flow 或 Graph editor adapter 复制 Graph presentation / lowering。
- Graph / Flow / Editor 建立平行于 Core IR / Scene 的渲染语义。

领域目录只表达代码归属，不要求存在 `@retikz/diagram` 聚合包。Notation 三包组成首个 lockstep release group，并作为未来 Graph 可依赖的 Diagram foundation；Graph、Flow、Editor 是否独立发布、Flow adapters 是否 lockstep、Graph editor adapter 与 Graph 是否 lockstep，仍由各自首个实现 ADR 单独决定。

---

## 12. 命名

当前工作名：

- `diagram`：逻辑制图领域目录，不要求存在 `@retikz/diagram` 包。
- `@retikz/notation`：可复用图式语义元素、纯 Core Sugar 与 Tier 2 composite 的统一入口。
- `@retikz/notation-react` / `@retikz/notation-vanilla`：Notation 的等价 authoring adapters。
- `@retikz/graph`：关系模型、几何契约与统一 presentation / lowering。
- `@retikz/flow`：算法布局与连线路由。
- `editor`：跨领域交互编辑能力组与候选目录名。
- `@retikz/editor`：无 UI 的图形编辑运行时。
- `@retikz/graph-editor`：Editor 与 GraphDocument 的独立领域 adapter。

`diagram` 覆盖流程、UML、状态、血缘与通用节点关系；`schematic` 偏向技术原理图，范围更窄。`notation` 表示一套用于表达某类图示含义的符号与约定，既能容纳当前逻辑元素，也不把未来元素限定为流程图或节点块。`graph` 是 Node / Port / Edge / Group 模型的行业通用术语；`topology`、`relation` 和 `network` 分别过窄或容易与其它领域混淆。

`Editor` 明确表达 selection、viewport、tools、commands、history 和 adapter 共同存在的无 UI 图形编辑上下文。`Workspace` 留给项目、文件、tab 和资源容器等产品 Shell 概念；`Board` 只保留为未来可能的自由白板 preset、宿主组件或产品名。领域 adapter 采用 `graph-editor`、`plot-editor` 等领域优先命名，不使用领域主包 subpath 导出。release group 与兼容策略仍需由首个真实实现 ADR 验证。

---

## 13. 明确反对

- **反对把 Flow 与 Viz 合并。** 逻辑关系不是结构化数据的 visual grammar。
- **反对把 Notation 命名为 Logic 或只按当前组件清单定边界。** 它是 Diagram 的可复用图式元素库，未来可以覆盖 UML Class、State 等语义。
- **反对把 Notation 扩张为 GraphModel。** 可独立绘制的元素和全局关系真源必须分层。
- **反对把语义 Connector 放回 Standard。** Standard 拥有通用 Path、target 与布局能力，Notation 拥有图式中的局部连接语义。
- **反对把 manual geometry 当作另一种布局算法。** 它是作者拥有并持久化的 GraphGeometry，不需要单独的 layouter。
- **反对把 Editor 放进 Diagram。** 交互编辑运行时可以服务 Graph、Core IR 和未来其它领域模型。
- **反对让 Graph 决定具体布局算法。** Graph 拥有关系、geometry 与统一 lowering，不拥有算法策略。
- **反对让 Flow 或 Graph editor adapter 独占 Graph lowering。** 人工、算法与交互三条输入必须共用同一 presentation 主链。
- **反对把通用 Frame / Stack 复制到 Flow 与 Editor。** 去领域化后成立的绘图积木进入 Standard。
- **反对为迁移复制或 deep import Standard 私有布局实现。** Notation 只能消费冻结的公共 composition surface。
- **反对把 Editor 状态塞进 Core、Graph IR 或 Standard。** 持久化领域文档与运行时编辑状态必须分离。
- **反对现在冻结完整公开 API。** 本文定义能力边界，不替代 Alpha ADR、completeness gate 和实现验证。

---

## 14. 分阶段演进

### 阶段 0：沉淀边界

本文已经完成 Diagram 目录、Notation foundation、Graph / Flow 与其 Editor 接入的阶段 0 边界沉淀。Notation 由独立 roadmap / ADR 进入实现；Graph、Flow 与 Graph editor adapter 仍不因本文自动建包。

### 阶段 1：Notation foundation

建立 `notation`、`notation-react`、`notation-vanilla` 三包，把 Standard alpha.3 的 LogicFrame、Terminal、Stage、Decision、Junction、Connector 与 Callout 迁入统一入口。迁移保持公开组件名和字段语义，不保留 Standard 转发；同时补齐 Standard 公共 layout composition surface，完成直接 IR、React、Vanilla、SVG / Canvas、双语文档和发布组闭环。Notation alpha.3 随后撤回缺少真实场景验证的 Callout 完整契约，当前元素集合为 LogicFrame、Terminal、Stage、Decision、Junction 与 Connector。

### 阶段 2：Graph 最小契约

从真实 Flow 与节点图示例确认 Node、Port、Edge、Group、GraphGeometry、presentation / lowering 和诊断的最小闭环。手写 manual geometry 必须不依赖 Flow 或 Editor 完成 Core IR 下沉；不得为了交互提前加入 viewport、selection 或 history。

### 阶段 3：Flow 算法布局闭环

选择一类明确关系图完成 `GraphModel → measure → layout → route → GraphGeometry`，再复用 Graph 的统一 lowering 进入 Core IR，并验证 SVG / Canvas、React / Vanilla 和自定义 layout / routing definition 的边界。

### 阶段 4：Standard 通用积木

**已完成基础验证。** Standard alpha.1 已用 Grid、Axes、Frame 验证官方可选能力、Core composite 与 React / Vanilla authoring 闭环。Graph / Flow / Editor 后续只消费公开 Standard 能力；若出现新的跨域绘图缺口，仍按 Standard 准入规则与独立 ADR 处理。

### 阶段 5：Editor 交互闭环

在真实自由绘图或节点图需求出现后，按 Editor 总设计定义无 UI 的 selection、transform、candidate transaction、command / history、viewport 和 adapter 契约，并通过 `@retikz/graph-editor` 修改 GraphDocument。第一版不要求同时编辑 Flow 约束、manual geometry 和普通 Core IR。

### 阶段 6：Flow / Editor 协作

在 Flow 与 Graph editor adapter 两条主链稳定后，定义 constraint、arrange-once、detach / bake 三种显式转换，避免 manual geometry 与 algorithm geometry 隐式覆盖。

---

## 15. 待决策

- Notation 在 UML Class、State 等后续 milestone 中采用独立语义 composite、较小 sugar，还是 docs recipe。
- GraphGeometry 哪些字段属于持久化契约，哪些只是 Flow 或 Graph editor adapter 的运行时缓存。
- Graph 的 presentation / lowering 如何注入 Node、Port、Edge、Group 的内置与自定义定义，同时避免吸收通用 Core / Standard 语义。
- Flow 是否按布局算法、图类型或 definition provider 扩展。
- `@retikz/graph-editor` 与 Graph 的 release group、版本兼容和首批 edit capability。
- Flow 的 pin / rank / order 等约束是否进入 GraphModel、GraphGeometry，还是独立 LayoutConstraint。
- Graph / Flow / Editor 的发布组与版本兼容策略；Notation 三包已由首个 ADR 单独冻结。
- Graph / Flow / Editor 是否只需消费现有 Frame，还是会提出新的领域中立 Standard 能力；新增能力必须通过 Standard 自己的准入与 ADR 验证。

---

## 16. 判断标准

后续设计与实现至少满足：

1. Notation 元素不依赖 GraphModel 即可由直接 IR、React 与 Vanilla 编写，并通过 Core / Standard 公共能力渲染。
2. Notation 可以增加 UML Class、State 等图式元素，而不把 Graph、Flow、Editor 或领域执行模型吸入包内。
3. 同一 GraphModel 可以由 Flow 自动生成 geometry，也可以直接携带作者提供的 manual geometry。
4. 重新布局只替换 geometry，不破坏节点、端口、边和分组关系。
5. 手写坐标和 Blender 类节点图无需依赖 Flow 或 Editor，也能通过 GraphDocument 完成 lowering；Editor 只是可选编辑入口。
6. 血缘图可以先由 Flow 生成，再显式切换为 manual geometry 或继续保持 Flow 约束。
7. Notation / Graph / Flow 不依赖 Viz / Data 语义或具体 renderer；Editor 基础包不吸收 Graph 等领域语义。
8. 通用布局与 Frame 等能力只实现一次，并通过 Standard 公共 capability 供多个领域复用。
9. Flow algorithm geometry、作者 manual geometry 与 detach 后普通 Core IR 的所有权转换清晰、可诊断。
10. 人工、算法与交互输入共用 Graph lowering，并通过 Core 公开 contract 下沉，不引入平行 IR、Scene 或 renderer 特判。
