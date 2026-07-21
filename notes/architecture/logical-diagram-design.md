# 逻辑制图能力域设计

> **状态：方向已确认，当前不实现。** 本文沉淀逻辑关系模型、人工几何、算法布局与交互编辑的长期能力边界，用于后续 Graph / Flow / Workspace 设计与包规划。文中的 `diagram` 与 `workspace` 均是能力组工作名，具体包结构、发布组和公开 API 仍需通过 roadmap / ADR 确认。
>
> 关联：[`能力完备性与模块边界`](./capability-design.md) · [`包拓扑`](./package-topology.md) · [`Standard Drawing Library`](../../packages/library/_notes/architecture/standard-library-design.md)

---

## 1. 背景

retikz 当前已经能通过 Core IR 手写 Node、Path、Scope、Coordinate 等二维图形，也能由 Plot 把结构化数据映射为可视化图形。但流程图、架构图、血缘图、依赖图和节点图面对的是另一类问题：输入首先是一组逻辑关系，系统或用户需要决定这些关系如何排布、连线和交互编辑。

如果让作者或 LLM 直接计算每个节点、分组标题、padding 和连线的绝对坐标，内容稍有变化就需要同步修改大量几何参数。另一方面，Blender、Gaea、UE5 等节点图又不能把位置完全交给算法，因为节点位置是用户持续编辑并保存的结果。

因此需要同时区分三件事：

1. **关系是什么**：有哪些节点、端口、边和分组。
2. **几何如何产生**：由算法生成，还是由作者直接提供并持久化。
3. **内容如何编辑**：如何选择、拖拽、连线、缩放和撤销。

前两件事属于 Diagram：Graph 保存关系与几何，Flow 可选地计算算法几何。第三件事属于跨领域的 Workspace：它通过 adapter 编辑 Graph，也可以接入普通 Core IR 或其它领域模型。Diagram 不应为了交互编辑而保存 viewport、selection 或 history，Workspace 也不应反向拥有 Graph 关系语义。

---

## 2. 与 Viz 的边界

逻辑制图与数据可视化解决不同问题：

| 能力域  | 输入真源                          | 核心处理                     | 典型产物                         |
| ------- | --------------------------------- | ---------------------------- | -------------------------------- |
| Viz     | 数据集、字段、transform、统计结果 | visual grammar、scale、mark  | 柱状图、折线图、分面图等         |
| Diagram | 节点、端口、边、分组和逻辑约束    | 人工几何、关系布局、连线路由 | 流程图、血缘图、架构图、节点图等 |

Graph 不依赖 `@retikz/data`，Flow 也不属于 Viz。某个血缘产品可以把数据库元数据、AST 或业务数据转换成 GraphModel，但转换属于业务 adapter，不改变 Graph / Flow 的能力归属。

```text
业务元数据 ─→ lineage adapter ─→ GraphModel

结构化数据 ─→ Data ─→ Plot ─────────────────────────────→ Core IR
逻辑关系 ───→ GraphModel ─┬─→ Flow ─→ GraphGeometry ─┐
                          └─→ manual GraphGeometry ───┤→ Graph lowering ─→ Core IR
交互操作 ───→ Workspace Graph adapter ─→ GraphDocument patch
```

---

## 3. 总体分层

逻辑制图领域当前采用 `diagram` 作为目录工作名：

```text
Diagram
├─ Graph：关系模型、几何契约与统一 lowering
└─ Flow：算法布局与连线路由

Workspace
├─ Workspace：无 UI 的交互编辑运行时
└─ Workspace Graph adapter：GraphDocument 编辑接入
```

三者与 Kernel / Standard Library 的关系：

```text
GraphModel ──┬─→ Flow：系统计算 ─→ algorithm GraphGeometry ─┐
             └─→ 作者直接提供 ──→ manual GraphGeometry ─────┤
Workspace Graph adapter ────────→ model / geometry patch ───┤
                                                              ↓
Standard Library：Frame / Stack / Align 等通用绘图积木 ─→ Graph presentation / lowering
                                                              ↓
                                                           Core IR
                                                              ↓
                                                            Scene
```

Graph、Flow 和 Workspace 不拥有 renderer。GraphDocument 无论来自人工几何、Flow 计算还是 Workspace 编辑，都复用 Graph 的 presentation / lowering，通过公开 Core IR / composite / definition 契约进入 Kernel 编译与 SVG、Canvas 等后端。

---

## 4. Graph：关系模型

Graph 负责描述稳定的逻辑关系、可持久化几何以及统一 presentation / lowering。它不决定几何应由哪种算法产生，也不承担用户交互。

### 4.1 GraphModel

GraphModel 是关系真源，至少覆盖：

- Node：稳定 id、类型和 JSON-safe domain payload。
- Port：所属节点、方向 / role、连接能力和 JSON-safe metadata。
- Edge：源节点 / 端口、目标节点 / 端口和关系类型。
- Group：节点或子分组的逻辑归属。
- Reference validation：悬空引用、重复 id、非法端口和不满足约束的连接诊断。

Graph 不理解数据库字段、Plot channel、业务执行函数或 ReactNode。Blender、血缘、流程审批等领域规则应通过 definition、adapter 或上层 domain schema 扩展，而不是写进通用 GraphModel。

### 4.2 GraphGeometry

Graph 包定义作者输入、Flow 和 Workspace 交换结果时共用的几何数据契约，但不提供布局算法：

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

这里的关键不是字段名，而是 GraphModel 与 GraphGeometry 必须分离：关系变化不等于几何变化，重新布局也不能破坏关系真源。作者可以直接提供 manual geometry，不依赖 Workspace 或 Flow；Workspace 只是修改 geometry 的一种交互入口。

### 4.3 Presentation 与 lowering

GraphDocument 必须有一条不依赖 Flow 或 Workspace 的公共 presentation / lowering 主链：

```text
GraphModel + GraphGeometry
  → resolve presentation definitions
  → lower nodes / ports / edges / groups
  → Core IR
```

Flow 计算出的 algorithm geometry、作者手写的 manual geometry 和 Workspace 保存的 geometry 都进入同一条主链。Graph 可以定义 Node、Port、Edge、Group 到 Core 图形的映射契约及必要的内置 presentation，但通用图元、样式、容器和 renderer 语义仍由 Core / Standard 拥有。

如果 lowering 由 Flow 独占，手写坐标或 Workspace 编辑后的 Graph 仍会被迫依赖算法包；如果由 Workspace adapter 复制，React、Vanilla 和非交互环境又会产生多条不一致的渲染主链。因此统一 lowering 必须随 GraphDocument 的稳定语义归入 Graph。

### 4.4 Graph 不拥有

- DAG、tree、radial、force 等布局算法。
- 自动连线路由策略。
- 鼠标、键盘、选择、viewport 或撤销重做。
- 通用 Core 图元、Standard 积木和 renderer 执行。
- 工作流、材质节点或地形节点的业务执行语义。

---

## 5. Flow：算法布局

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

## 6. Workspace：跨领域交互编辑

Workspace 是 Diagram 之外的跨领域能力组，负责让用户直接操作图形或领域文档。它解决的是无 UI 的交互编辑运行时，不是新的 renderer、领域模型或另一套 Core IR。

`@retikz/workspace` 的长期能力可能包括：

- 选择、框选、多选、组合和图层操作。
- 拖拽、缩放、旋转、snapping 和参考线。
- viewport、缩放、平移、快捷键和剪贴板。
- 命令、事务、撤销重做和持久化 patch。
- 面向 Core IR 与不同领域文档的 adapter 契约。

Graph-specific 的 Port 命中、创建连接、重连、waypoint 编辑和模型校验进入 `@retikz/workspace-graph`。该 adapter 把通用 Workspace command 映射为 GraphModel / GraphGeometry patch，不把 Node / Port / Edge 规则写入 Workspace 基础包。

Workspace 直接编辑 Graph 时，节点位置写入 GraphGeometry，成为作者拥有的持久化结果。除非用户显式执行 Arrange，否则系统不自动覆盖这些坐标。

```text
GraphModel + GraphGeometry
  → Workspace Graph adapter
  → 修改关系或几何
  → GraphDocument
  → Graph presentation / lowering
```

Workspace 也可以不经过 Graph，直接编辑普通 Core IR / Standard composite，或在未来接入其它领域模型。`Board` 可以保留为自由白板 preset、宿主组件或产品名称，但不再作为 Diagram 子包或底层能力 owner。

---

## 7. 两种几何所有权

算法布局和人工几何的根本差异不是“有没有交互界面”，而是几何结果由谁拥有。人工几何不是另一种布局算法：它表示作者直接提供并持久化位置、尺寸或 waypoint；Workspace 只是创建和修改这类 geometry 的一种方式。

| 模式            | 关系真源   | 几何真源                 | 调整方式                              | 重新布局                       |
| --------------- | ---------- | ------------------------ | ------------------------------------- | ------------------------------ |
| Flow 算法几何   | GraphModel | Flow 计算结果与布局约束  | 修改关系或 pin / rank 等约束          | 可重复执行并替换 GraphGeometry |
| Manual geometry | GraphModel | 作者保存的 GraphGeometry | 手写坐标或通过 Workspace 直接编辑几何 | 只在作者显式请求时执行         |

当 Flow 与人工几何联合使用时，需要明确当前操作的语义：

- **constraint**：Workspace 中的拖动转成 Flow 约束，之后仍由算法拥有整体布局。
- **arrange once**：Flow 计算一次 geometry，写回 GraphDocument，随后切换为 manual geometry，由作者拥有位置。
- **detach / bake**：把关系图固化为普通 Core / Standard 内容，允许脱离 Graph 编辑，但不再保证可恢复原 Graph / Flow 语义。

这三种行为不能隐式混用，否则重新布局会不可预测地覆盖用户修改。

---

## 8. 典型场景

| 场景                        | 能力组合                                   | 几何所有者                        |
| --------------------------- | ------------------------------------------ | --------------------------------- |
| 静态流程图、架构图          | Graph + Flow                               | Flow                              |
| 手写坐标的静态关系图        | Graph                                      | 作者保存的 GraphGeometry          |
| 可交互流程图                | Graph + Flow + Workspace Graph adapter     | Flow 约束，Workspace 提供交互入口 |
| 血缘图浏览                  | Graph + Flow                               | Flow                              |
| 血缘图探索与人工整理        | Graph + Flow + Workspace Graph adapter     | Flow 初始生成，之后切换为 manual  |
| Blender / Gaea / UE5 节点图 | Graph + Workspace Graph adapter            | 作者保存的 GraphGeometry          |
| 节点图“自动整理”            | Graph + Workspace Graph adapter，按需 Flow | Flow 单次生成，之后切换为 manual  |
| 纯自由白板                  | Workspace + Kernel / Standard              | 作者；不属于 Diagram 能力域       |

这组场景证明 Graph 可以脱离 Flow 和 Workspace 独立表达人工几何；Flow 与 Workspace Graph adapter 都是 GraphDocument 的消费者。Graph 不应因为某个消费方需要数据或交互而反向拥有 Data、Flow 或 Workspace 状态。

---

## 9. Standard：跨域绘图积木

Graph、Flow 和 Workspace 会共享一部分绘图能力，例如根据 children 边界生成带 title、padding、background 和 border 的容器。这类能力不属于 Graph 关系模型或 Workspace 状态，也不应把 Core Scope 扩张成可见 UI 容器。

通用能力进入计划中的 `@retikz/standard`：

```text
@retikz/standard
├─ Frame
├─ Stack
├─ Align / Distribute
├─ 常用 Shape / Connector
└─ 其它可选 Drawing Complete 扩展
```

其中 Frame 的建议边界是：测量已经布局的 children，应用 padding / minSize，为 title 或 header 预留空间，并生成背景、边框和整体 anchor。Flow 负责 Group 在图中的算法位置，Workspace 负责用户如何移动 Frame；Standard 不理解 Flow 或 Workspace。

通用能力进入 Standard 至少满足：

1. 移除 Graph、Flow、Workspace、Plot 等领域词汇后仍然成立。
2. 有两个以上独立消费场景。
3. 通过公开 Core definition / composite / lowering 契约实现。
4. IR JSON-safe，React / Vanilla 可表达同一语义。
5. 不要求 renderer 特判，不保存编辑器运行时状态。

---

## 10. 包与依赖方向

长期目录可以采用以下工作结构，具体包数和 adapter 拆分留给 ADR：

```text
packages/
├─ kernel/
├─ library/
│  ├─ standard
│  ├─ standard-react
│  └─ standard-vanilla
├─ diagram/
│  ├─ graph
│  └─ flow
├─ workspace/
│  ├─ workspace
│  ├─ workspace-react
│  └─ workspace-graph
└─ viz/
   ├─ data
   └─ plot
```

依赖方向必须保持：

```text
Flow ─────→ Graph + Core / Math ─→ GraphGeometry ─┐
Graph ────→ Core / Standard ──────────────────────┤→ Core IR → Scene
Workspace ─→ Kernel 公开 runtime / interaction 契约
Workspace Graph adapter ─→ Workspace + Graph

Plot ─────→ Data + Core
```

明确禁止：

- Graph 依赖 Data 或进入 Viz 能力域。
- Flow 依赖 Plot、Viz adapter 或具体 renderer。
- Workspace 把 selection、viewport、history 等运行时状态写进 Graph IR 或 Core IR。
- Standard 反向依赖 Graph、Flow 或 Workspace 领域语义。
- Flow 或 Workspace adapter 复制 Graph presentation / lowering。
- Graph / Flow / Workspace 建立平行于 Core IR / Scene 的渲染语义。

领域目录只表达代码归属，不自动决定 release group。Graph、Flow、Workspace 是否独立发布、Flow adapters 是否 lockstep、Workspace adapter 如何拆分，必须在首个实现 ADR 中单独决定。

---

## 11. 命名

当前工作名：

- `diagram`：逻辑制图领域目录，不要求存在 `@retikz/diagram` 包。
- `@retikz/graph`：关系模型、几何契约与统一 presentation / lowering。
- `@retikz/flow`：算法布局与连线路由。
- `workspace`：跨领域交互编辑能力组工作名。
- `@retikz/workspace`：无 UI 的编辑运行时工作名。
- `@retikz/workspace-graph`：Workspace 与 GraphDocument 的领域 adapter 工作名。

`diagram` 的备选名是 `schematic`，但后者偏向技术原理图，不能完整覆盖流程、血缘与通用节点关系。`graph` 是 Node / Port / Edge / Group 模型的行业通用术语；`topology`、`relation` 和 `network` 分别过窄或容易与其它领域混淆。

`Workspace` 表达 selection、viewport、tools、commands、history 和 adapter 共同存在的无 UI 编辑上下文，但它不拥有项目、文件、面板、协作或具体产品外壳。`Board` 只保留为未来可能的自由白板 preset、宿主组件或产品名，不作为当前底层包名。所有名称仍需由首个真实实现 ADR 验证。

---

## 12. 明确反对

- **反对把 Flow 与 Viz 合并。** 逻辑关系不是结构化数据的 visual grammar。
- **反对把 manual geometry 当作另一种布局算法。** 它是作者拥有并持久化的 GraphGeometry，不需要单独的 layouter。
- **反对把 Workspace 放进 Diagram。** 交互编辑运行时可以服务 Graph、Core IR 和未来其它领域模型。
- **反对让 Graph 决定具体布局算法。** Graph 拥有关系、geometry 与统一 lowering，不拥有算法策略。
- **反对让 Flow 或 Workspace adapter 独占 Graph lowering。** 人工、算法与交互三条输入必须共用同一 presentation 主链。
- **反对把通用 Frame / Stack 复制到 Flow 与 Workspace。** 去领域化后成立的绘图积木进入 Standard。
- **反对把 Workspace 状态塞进 Core、Graph IR 或 Standard。** 持久化领域文档与运行时编辑状态必须分离。
- **反对现在冻结完整公开 API。** 本文定义能力边界，不替代 Alpha ADR、completeness gate 和实现验证。

---

## 13. 分阶段演进

### 阶段 0：沉淀边界

本文即阶段 0。当前不新建包、不改变 capability-design、package-topology 或 release group 真源。

### 阶段 1：Graph 最小契约

从真实 Flow 与节点图示例确认 Node、Port、Edge、Group、GraphGeometry、presentation / lowering 和诊断的最小闭环。手写 manual geometry 必须不依赖 Flow 或 Workspace 完成 Core IR 下沉；不得为了交互提前加入 viewport、selection 或 history。

### 阶段 2：Flow 算法布局闭环

选择一类明确关系图完成 `GraphModel → measure → layout → route → GraphGeometry`，再复用 Graph 的统一 lowering 进入 Core IR，并验证 SVG / Canvas、React / Vanilla 和自定义 layout / routing definition 的边界。

### 阶段 3：Standard 通用积木

以 Frame 等真实跨域需求验证官方 Standard 包。现有 Core composite / scope boundary 能表达时不新增 Core 契约；不能闭环时只补最小通用底座。

### 阶段 4：Workspace 交互闭环

在真实自由绘图或节点图需求出现后，再定义无 UI 的 selection、transform、command / history、viewport 和 adapter 契约，并通过 Workspace Graph adapter 修改 GraphDocument。第一版不要求同时编辑 Flow 约束、manual geometry 和普通 Core IR。

### 阶段 5：Flow / Workspace 协作

在 Flow 与 Workspace Graph adapter 两条主链稳定后，定义 constraint、arrange-once、detach / bake 三种显式转换，避免 manual geometry 与 algorithm geometry 隐式覆盖。

---

## 14. 待决策

- `diagram` 是否作为最终领域目录名，还是改为 `schematic`。
- GraphGeometry 哪些字段属于持久化契约，哪些只是 Flow 或 Workspace 的运行时缓存。
- Graph 的 presentation / lowering 如何注入 Node、Port、Edge、Group 的内置与自定义定义，同时避免吸收通用 Core / Standard 语义。
- Flow 是否按布局算法、图类型或 definition provider 扩展。
- Workspace 是否作为最终能力组与包名，以及 Graph adapter、React adapter、宿主 UI 的拆分方式。
- Flow 的 pin / rank / order 等约束是否进入 GraphModel、GraphGeometry，还是独立 LayoutConstraint。
- Graph / Flow / Workspace 的发布组与版本兼容策略。
- Standard Frame 能否完全通过现有 composite、Scope synthetic boundary 和相对引用闭环。

---

## 15. 判断标准

后续设计与实现至少满足：

1. 同一 GraphModel 可以由 Flow 自动生成 geometry，也可以直接携带作者提供的 manual geometry。
2. 重新布局只替换 geometry，不破坏节点、端口、边和分组关系。
3. 手写坐标和 Blender 类节点图无需依赖 Flow 或 Workspace，也能通过 GraphDocument 完成 lowering；Workspace 只是可选编辑入口。
4. 血缘图可以先由 Flow 生成，再显式切换为 manual geometry 或继续保持 Flow 约束。
5. Graph / Flow 不依赖 Viz / Data 语义或具体 renderer；Workspace 基础包不吸收 Graph 等领域语义。
6. 通用 Frame 等能力只实现一次，并通过 Standard 供多个领域复用。
7. Flow algorithm geometry、作者 manual geometry 与 detach 后普通 Core IR 的所有权转换清晰、可诊断。
8. 人工、算法与交互输入共用 Graph lowering，并通过 Core 公开 contract 下沉，不引入平行 IR、Scene 或 renderer 特判。
