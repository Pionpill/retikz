# 逻辑制图能力域设计

> **状态：方向已确认，当前不实现。** 本文沉淀逻辑关系图、算法布局与交互制图的长期能力边界，用于后续 Graph / Flow / Board 设计与包规划。文中的 `diagram` 是领域目录工作名，具体包结构、发布组和公开 API 仍需通过 roadmap / ADR 确认。
>
> 关联：[`能力完备性与模块边界`](./capability-design.md) · [`包拓扑`](./package-topology.md) · [`Kernel v0.5 官方 Extension 包`](../../packages/kernel/_notes/decisions/v0/v0.5/roadmap.md#官方-extension-包)

---

## 1. 背景

retikz 当前已经能通过 Core IR 手写 Node、Path、Scope、Coordinate 等二维图形，也能由 Plot 把结构化数据映射为可视化图形。但流程图、架构图、血缘图、依赖图和节点图面对的是另一类问题：输入首先是一组逻辑关系，系统或用户需要决定这些关系如何排布、连线和交互编辑。

如果让作者或 LLM 直接计算每个节点、分组标题、padding 和连线的绝对坐标，内容稍有变化就需要同步修改大量几何参数。另一方面，Blender、Gaea、UE5 等节点图又不能把位置完全交给算法，因为节点位置是用户持续编辑并保存的结果。

因此逻辑制图需要同时区分三件事：

1. **关系是什么**：有哪些节点、端口、边和分组。
2. **关系如何布局**：由算法生成，还是由用户直接决定。
3. **用户如何操作**：如何选择、拖拽、连线、缩放和撤销。

这三件事分别对应 Graph、Flow 和 Board。它们属于同一个逻辑制图能力域，但不能合并成一个同时承担模型、算法和交互状态的大包。

---

## 2. 与 Viz 的边界

逻辑制图与数据可视化解决不同问题：

| 能力域  | 输入真源                          | 核心处理                       | 典型产物                         |
| ------- | --------------------------------- | ------------------------------ | -------------------------------- |
| Viz     | 数据集、字段、transform、统计结果 | visual grammar、scale、mark    | 柱状图、折线图、分面图等         |
| Diagram | 节点、端口、边、分组和逻辑约束    | 关系布局、连线路由、交互式排布 | 流程图、血缘图、架构图、节点图等 |

Graph 不依赖 `@retikz/data`，Flow 也不属于 Viz。某个血缘产品可以把数据库元数据、AST 或业务数据转换成 GraphModel，但转换属于业务 adapter，不改变 Graph / Flow 的能力归属。

```text
业务元数据 ─→ lineage adapter ─→ GraphModel

结构化数据 ─→ Data ─→ Plot ───────────────→ Core IR
逻辑关系 ───→ Graph ─→ Flow / Board ──────→ Core IR
```

---

## 3. 总体分层

逻辑制图领域当前采用 `diagram` 作为目录工作名：

```text
Diagram
├─ Graph：关系模型与几何交换契约
├─ Flow：算法布局与连线路由
└─ Board：用户交互与自由布局
```

三者与 Kernel / Extension 的关系：

```text
                             ┌─→ Flow：系统计算 ─┐
GraphModel ──────────────────┤                  ├─→ GraphGeometry
                             └─→ Board：用户编辑 ┘
                                                       │
Extension：Frame / Stack / Align 等通用绘图积木 ────────┤
                                                       ↓
                                                    Core IR
                                                       ↓
                                                     Scene
```

Graph、Flow 和 Board 不拥有 renderer。它们最终必须通过公开 Core IR / composite / definition 契约进入 Kernel 编译与 SVG、Canvas 等后端。

---

## 4. Graph：关系模型

Graph 负责描述稳定的逻辑关系，不决定关系应该由谁布局，也不承担用户交互。

### 4.1 GraphModel

GraphModel 是关系真源，至少覆盖：

- Node：稳定 id、类型和 JSON-safe domain payload。
- Port：所属节点、方向 / role、连接能力和 JSON-safe metadata。
- Edge：源节点 / 端口、目标节点 / 端口和关系类型。
- Group：节点或子分组的逻辑归属。
- Reference validation：悬空引用、重复 id、非法端口和不满足约束的连接诊断。

Graph 不理解数据库字段、Plot channel、业务执行函数或 ReactNode。Blender、血缘、流程审批等领域规则应通过 definition、adapter 或上层 domain schema 扩展，而不是写进通用 GraphModel。

### 4.2 GraphGeometry

Graph 包可以定义 Flow 与 Board 交换布局结果所需的几何数据契约，但不提供布局算法：

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

这里的关键不是字段名，而是 GraphModel 与 GraphGeometry 必须分离：关系变化不等于几何变化，重新布局也不能破坏关系真源。

### 4.3 Graph 不拥有

- DAG、tree、radial、force 等布局算法。
- 自动连线路由策略。
- 鼠标、键盘、选择、viewport 或撤销重做。
- Core 图元样式和 renderer 执行。
- 工作流、材质节点或地形节点的业务执行语义。

---

## 5. Flow：算法布局

Flow 消费 GraphModel 和布局约束，计算 GraphGeometry，并把确定的关系图下沉为 Core IR。

```text
GraphModel
  → normalize
  → measure
  → layout
  → route
  → GraphGeometry
  → lower
  → Core IR
```

Flow 主要负责：

- 水平 / 垂直流程、分层有向图、tree 等布局 provider。
- Node、Group 和 label 的尺寸测量协调。
- 层级、顺序、间距、方向和固定位置等布局约束。
- Port 选择、直线 / 折线 / 曲线及避让等路由策略。
- GraphModel / GraphGeometry 到 Core IR 的稳定 lowering。
- 布局失败、约束冲突和无法路由时的可诊断错误。

Flow 中的人工拖动不应直接把算法布局退化成自由画布。它应转换为 `pin`、`rank`、`order`、port side、waypoint 等约束，再由 Flow 重新计算其余布局。

---

## 6. Board：用户交互与自由布局

Board 负责让用户直接操作图形或 GraphDocument。它解决的是交互 authoring，不是新的 renderer，也不是另一套 Core IR。

Board 的长期能力可能包括：

- 选择、框选、多选、组合和图层操作。
- 拖拽、缩放、旋转、snapping 和参考线。
- Port 命中、创建连接、重连和 waypoint 编辑。
- viewport、缩放、平移、快捷键和剪贴板。
- 命令、事务、撤销重做和持久化 patch。
- 面向 Core IR 与 GraphDocument 的不同 adapter。

Board 直接编辑 Graph 时，节点位置写入 GraphGeometry，成为用户拥有的持久化结果。除非用户显式执行 Arrange，否则系统不自动覆盖这些坐标。

```text
GraphModel + GraphGeometry
  → Board interaction
  → 修改关系或几何
  → GraphDocument
```

Board 也可以不经过 Graph，直接编辑普通 Core IR / Extension composite，以支持纯自由白板。Graph adapter 是 Board 的一种领域接入，不应让 Board 的基础交互层硬编码 Node / Port / Edge 业务规则。

---

## 7. 两种布局所有权

算法布局和自由布局的根本差异不是“有没有布局算法”，而是布局结果由谁拥有。

| 模式           | 关系真源   | 位置真源            | 调整方式                       | 重新布局                       |
| -------------- | ---------- | ------------------- | ------------------------------ | ------------------------------ |
| Flow 算法布局  | GraphModel | Flow 计算结果与约束 | 修改关系或 pin / rank 等约束   | 可重复执行并替换 GraphGeometry |
| Board 自由布局 | 可选 Graph | 用户保存的 geometry | 直接拖动、缩放、旋转和编辑路径 | 只在用户显式请求时执行         |

当 Flow 与 Board 联合使用时，需要明确当前操作的语义：

- **constraint**：拖动转成 Flow 约束，之后仍由算法拥有整体布局。
- **arrange once**：Flow 计算一次 geometry，写回 GraphDocument，之后由 Board 拥有位置。
- **detach / bake**：把关系图固化为普通 Core / Board 元素，允许完全自由编辑，但不再保证可恢复原 Flow 语义。

这三种行为不能隐式混用，否则重新布局会不可预测地覆盖用户修改。

---

## 8. 典型场景

| 场景                        | 能力组合                 | 布局所有者                         |
| --------------------------- | ------------------------ | ---------------------------------- |
| 静态流程图、架构图          | Graph + Flow             | Flow                               |
| 可交互流程图                | Graph + Flow + Board     | Flow 约束，Board 提供交互          |
| 血缘图浏览                  | Graph + Flow             | Flow                               |
| 血缘图探索与人工整理        | Graph + Flow + Board     | Flow 初始布局，之后可切 Board 所有 |
| Blender / Gaea / UE5 节点图 | Graph + Board            | Board / 用户                       |
| 节点图“自动整理”            | Graph + Board，按需 Flow | Flow 单次生成，Board 后续持有      |
| 纯自由白板                  | Board + Kernel/Extension | Board / 用户                       |

这组场景证明 Graph 是 Flow 与 Board 的共同关系基础，但 Graph 不应因为某个消费方需要数据或交互而反向拥有 Data、Flow 或 Board 语义。

---

## 9. Extension：跨域绘图积木

Graph、Flow 和 Board 会共享一部分绘图能力，例如根据 children 边界生成带 title、padding、background 和 border 的容器。这类能力不属于 Graph 关系模型，也不应把 Core Scope 扩张成可见 UI 容器。

通用能力进入计划中的 `@retikz/extension`：

```text
@retikz/extension
├─ Frame
├─ Stack
├─ Align / Distribute
├─ 常用 Shape / Connector
└─ 其它可选 Drawing Complete 扩展
```

其中 Frame 的建议边界是：测量已经布局的 children，应用 padding / minSize，为 title 或 header 预留空间，并生成背景、边框和整体 anchor。Flow 负责 Group 在图中的算法位置，Board 负责用户如何移动 Frame；Extension 不理解 Flow 或 Board。

通用能力进入 Extension 至少满足：

1. 移除 Graph、Flow、Board、Plot 等领域词汇后仍然成立。
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
│  └─ extension
├─ diagram/
│  ├─ graph
│  ├─ flow
│  └─ board
└─ viz/
   ├─ data
   └─ plot
```

依赖方向必须保持：

```text
Graph ───────────────────────────────┐
Flow ─────→ Graph + Core / Math ─────┤
Board ────→ Core / Extension ────────┤→ Core IR → Scene
Board Graph adapter ─→ Board + Graph ┘

Plot ─────→ Data + Core
```

明确禁止：

- Graph 依赖 Data 或进入 Viz 能力域。
- Flow 依赖 Plot、Viz adapter 或具体 renderer。
- Board 把选择、viewport、history 等运行时状态写进 Core IR。
- Extension 反向依赖 Graph、Flow 或 Board 领域语义。
- Graph / Flow / Board 建立平行于 Core IR / Scene 的渲染语义。

领域目录只表达代码归属，不自动决定 release group。Graph、Flow、Board 是否独立发布、Flow adapters 是否 lockstep、Board adapter 如何拆分，必须在首个实现 ADR 中单独决定。

---

## 11. 命名

当前工作名：

- `diagram`：逻辑制图领域目录，不要求存在 `@retikz/diagram` 包。
- `@retikz/graph`：关系模型与几何交换契约。
- `@retikz/flow`：算法布局与关系图 lowering。
- `@retikz/board`：交互 authoring 与自由布局。

`diagram` 的备选名是 `schematic`，但后者偏向技术原理图，不完全覆盖纯自由 Board。`graph` 是 Node / Port / Edge / Group 模型的行业通用术语；`topology`、`relation` 和 `network` 分别过窄或容易与其它领域混淆。除非后续产品边界变化，优先保留以上工作名。

---

## 12. 明确反对

- **反对把 Flow 与 Viz 合并。** 逻辑关系不是结构化数据的 visual grammar。
- **反对把 Board 作为 Flow 的一种布局算法。** Board 的核心是用户交互和持久化 geometry。
- **反对把 Flow 与 Board 合并成双模式大包。** 两者的布局所有权、运行时依赖和错误路径不同。
- **反对让 Graph 决定具体布局。** Graph 只提供关系真源和共享 geometry 契约。
- **反对把通用 Frame / Stack 复制到 Flow 与 Board。** 去领域化后成立的绘图积木进入 Extension。
- **反对把 Editor / Board 状态塞进 Extension。** Extension 只承载无状态、可 lowering 的绘图能力。
- **反对现在冻结完整公开 API。** 本文定义能力边界，不替代 Alpha ADR、completeness gate 和实现验证。

---

## 13. 分阶段演进

### 阶段 0：沉淀边界

本文即阶段 0。当前不新建包、不改变 capability-design、package-topology 或 release group 真源。

### 阶段 1：Graph 最小契约

从真实 Flow 与节点图示例确认 Node、Port、Edge、Group、GraphGeometry 和诊断的最小闭环。不得为了 Board 交互提前加入 viewport、selection 或 history。

### 阶段 2：Flow 算法布局闭环

选择一类明确关系图完成 `GraphModel → measure → layout → route → GraphGeometry → Core IR`，并验证 SVG / Canvas、React / Vanilla 和自定义 layout / routing definition 的边界。

### 阶段 3：Extension 通用积木

以 Frame 等真实跨域需求验证官方 Extension 包。现有 Core composite / scope boundary 能表达时不新增 Core 契约；不能闭环时只补最小通用底座。

### 阶段 4：Board 交互闭环

在真实自由绘图或节点图需求出现后，再定义 selection、transform、command/history 和 Graph adapter。第一版不要求同时编辑 Flow 约束和自由 Core IR。

### 阶段 5：Flow / Board 协作

在两条主链稳定后，定义 constraint、arrange-once、detach / bake 三种显式转换，避免用户 geometry 与算法 geometry 隐式覆盖。

---

## 14. 待决策

- `diagram` 是否作为最终领域目录名，还是改为 `schematic`。
- GraphGeometry 哪些字段属于持久化契约，哪些只是 Flow / Board 运行时缓存。
- 已有位置的 Graph 由哪个包负责统一 presentation 与 Core lowering，如何避免 Flow / Board 复制节点和边的视觉映射。
- Flow 是否按布局算法、图类型或 definition provider 扩展。
- Board 基础包与 Graph adapter、React adapter、宿主 UI 的拆分方式。
- Flow 的 pin / rank / order 等约束是否进入 GraphModel、GraphGeometry，还是独立 LayoutConstraint。
- Graph / Flow / Board 的发布组与版本兼容策略。
- Extension Frame 能否完全通过现有 composite、Scope synthetic boundary 和相对引用闭环。

---

## 15. 判断标准

后续设计与实现至少满足：

1. 同一 GraphModel 可以由 Flow 自动布局，也可以由 Board 人工布局。
2. 重新布局只替换 geometry，不破坏节点、端口、边和分组关系。
3. Blender 类节点图无需依赖 Flow，也能通过 Graph + Board 成立。
4. 血缘图可以先由 Flow 生成，再显式切换为 Board 所有或继续保持 Flow 约束。
5. Graph / Flow / Board 均不依赖 Viz / Data 语义或具体 renderer。
6. 通用 Frame 等能力只实现一次，并通过 Extension 供多个领域复用。
7. Flow 算法布局、Board 用户布局和 detach 后自由 Core IR 的所有权转换清晰、可诊断。
8. 新能力通过 Core 公开 contract 下沉，不引入平行 IR、Scene 或 renderer 特判。
