# Diagram v0.1 Roadmap

> 状态：alpha.1 进行中；Diagram Foundation 已完成，FlowDiagram MVP 待设计，后续 alpha 等待真实使用继续规划。关联：[Diagram v0 roadmap](../roadmap.md) · [Schematic 制图能力域设计](../../../../../../../notes/architecture/schematic-design.md) · [Schematic Graph 完备设计](../../../../architecture/schematic-graph-complete.md) · [Graph v0 roadmap](../../../graph/v0/roadmap.md)

## 目标

建立可使用的 Diagram package family，以 presentation、frame / appearance 与 drawing core 三层形成完整图示，以 Graph 的通用关系数据为 Flow 绘图核心的唯一语义真源。alpha.1 先建立 drawing-core-agnostic 的 Diagram Foundation，再完成 `FlowDiagram` 的 Graph Body、自动 layout、routing 与结果闭环，避免外围装配与复杂图本体在同一轮设计中互相牵制

`FlowDiagram` 是首个公开图类型，为架构、数据流、控制流、依赖、传播与反馈等关系型流程图提供完整说明内容、图示装配、自动布局和 routing。alpha.1 只有在真实 Source、Direct IR / Vanilla / React 和 docs 形成闭环后才完成；已完成的 Foundation 不单独构成可发布能力，也不发布临时 Diagram root 或占位 drawing body

## Milestone

| Milestone | 主题            | 范围                                                                                                                                                                                                                                                                  |
| --------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alpha.1   | FlowDiagram MVP | 先在 `@retikz/diagram` 包内建立 Presentation、Frame、Diagram Theme 与固定区域装配 Foundation，再冻结 Graph Body、layout / routing Definition、orchestration、result 与 artifact，并建立 `IRFlowDiagram`、Vanilla、React、真实 Graph、完整 Scene、双语 docs 与渐进迁移 |

alpha.1 内部按 Foundation 与 FlowDiagram 两个依赖阶段推进，但只以完整 FlowDiagram MVP 作为 milestone 退出目标。内部 Foundation 不因暂未公开而接受临时模型；后续 Flow root 必须直接组合其长期契约，不保留占位 alias、fallback 或双轨实现

## 总体结构

完整 Diagram 由三个正交层次组成：

1. `Presentation`：title、description、legend 等位于绘图核心之外、但仍参与完整图示输出的说明内容与区域语义
2. `Frame / Appearance`：各 presentation region 与 drawing core 的物理排列、外框、padding、section gap 和 Diagram 专属外观
3. `Drawing Core`：由具体图类型拥有；FlowDiagram 复用 Graph 关系数据，负责测量、layout、routing 与 renderer-neutral 布局结果

Diagram 只拥有完整图示的区域装配语义和 Diagram 独有行为。通用文字、Surface、排版、测量、Theme 基础能力与绘制 primitive 继续复用 Standard、Layout 与 Core；Legend item 的长期 owner 由 ADR-01 结合真实复用证据决定；Graph 的 Group / Block / Entity / Relation、Graph Theme 与 identity 继续由 Graph 独立拥有

已完成的 Foundation 接收一个不透明 drawing child 以完成内部装配和 Scene 验证，但不读取其内容，也不把它保存为通用 `body` Source。内部验证载体不进入 schema、metadata、artifact 或 package exports。alpha.1 后续建立的具体 Flow root 负责把 Graph Body 结果作为 drawing child 交给同一 Foundation

## 候选 ADR

### alpha.1 FlowDiagram MVP

| ADR                                                    | 主题                                   | 负责                                                                                                                                           | 状态     |
| ------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [01](./alpha.1/01-diagram-assembly-presentation.md)    | Diagram Assembly 与 Presentation       | 公共 Presentation 片段、固定区域语义、显式 Standard Legend、统一输出边界、内部 opaque drawing child 与具体 root 延期边界                       | Accepted |
| [02](./alpha.1/02-diagram-frame-spacing-appearance.md) | Diagram Frame、Spacing 与 Appearance   | 区域排列、外框、frame padding、语义区块间距、Diagram Theme、文字继承，以及对 Layout / Standard / Core Theme 的复用与 Foundation 实施边界       | Accepted |
| 03                                                     | FlowDiagram Graph Body                 | 具体 Flow Source root、真实 Graph 输入、managed Graph 内容、Group 层级、identity、endpoint、authored geometry 与 Block / Port 延期边界         | 待设计   |
| 04                                                     | Flow Layout Definition 与 Registry     | 可替换布局 Definition、内置与自定义 registry、公共布局意图、provider 输入输出、确定性与失败边界                                                | 待设计   |
| 05                                                     | Flow Orchestration、Result 与 Artifact | Graph Theme 下的测量、Group 递归布局、routing、provider 结果验证、render-ready Graph、renderer-neutral artifact、diagnostics 与完整 Scene 闭环 | 待设计   |

上述 ADR 只表示长期决策的依赖分区，不在 roadmap 冻结字段、默认值、算法库、测试 case、文件 scope 或实现步骤

## 依赖顺序

1. Graph 先提供 Diagram 所需的通用关系模型、Graph resolve 与稳定 identity；Diagram 不把现有独立呈现元素集合伪装成全局关系模型
2. alpha.1 ADR-01 建立 drawing-core-agnostic 的 Presentation 与 Assembly，ADR-02 再确定 Frame / Appearance 如何组合这些区域
3. ADR-01～02 完成 Architecture Gate、人工确认和独立 implementation plan 后，先实现并验证 Diagram Foundation；内部 drawing child 只证明 Foundation 可替换，不成为公开语义
4. Foundation 验证完成后，再逐项设计同一 alpha.1 的 Graph Body、layout / routing registry 与 orchestration / result，允许真实实现证据参与复杂 drawing core 推敲
5. ADR-03～05 全部完成 Architecture Gate 并由人工确认后，细化 FlowDiagram implementation plan，一次建立 public root、三入口、artifact、docs 与迁移闭环；该闭环完成后 alpha.1 才退出

依赖域缺少必要的测量、几何、composition 或 Graph 关系能力时，先回到对应 owner 补齐，不在 Diagram 内复制模型、solver、artifact 或 renderer 路径

## v0.1 边界

- `FlowDiagram` 是按主要关系方向自动排列的关系型流程图；关系可以表达执行、数据、控制、依赖、传播或反馈，不要求具有时间语义
- 完整 Diagram 可以包含 title、description、legend 等 presentation 内容与具体 drawing core；Presentation、Frame 与 Flow Graph Body 都由 alpha.1 的对应 ADR 冻结
- frame padding 与 section gap 属于完整图示 composition；Flow 节点间距与层级间距属于 drawing-core layout intent，二者不合并为同一 spacing 契约
- 已完成的 Foundation 只在 `@retikz/diagram` 包内消费；具体 Flow root 建立前，package public exports 不暴露 foundation schema、resolver、装配入口或可实例化 composite，两个 adapter 包保持空壳
- alpha.1 通过 Diagram 三包对称的 `/flow` 子入口暴露 FlowDiagram；包根只提供届时具有真实消费者的共享基础契约，不聚合具体图类型
- Graph 三包继续通过公共根入口提供基础能力，不建立 FlowDiagram 专用子入口
- docs 是 FlowDiagram 的首个真实消费者与验收语料；内部 drawing placeholder 不写成正式 demo，alpha.1 从简单关系图开始渐进替换
- 品牌配色、字体和响应式预览等站点专属选择保留为 docs recipe 或 reference appearance，不成为 Diagram Source enum 或内置白名单
- 不包含几何教学图、组件展示图、自由画布、交互式编辑器或完整 UML / 状态执行模型
- 不在 v0.1 预先实现 tree、force 或其它尚无当前消费者的布局类型
- Block / Port、跨 Group 层级 relation、完整 compound routing 与异步连续布局等待对应 Graph 能力或真实消费者后继续规划，不在 alpha.1 预留字段，并由 ADR-03 明确是否进入 MVP
- 不创建 Graph 数据、Graph presentation、Graph Theme、通用 Layout / Standard composite、Editor 状态、DOM 或 renderer 的平行契约

## alpha.1 退出条件

- `@retikz/diagram` 包内建立 JSON-safe Presentation / Frame / Diagram Theme、Theme Definition / registry、resolve 与固定区域 assembly，且没有 package-public foundation API
- title、description、Legend 与不透明 drawing child 可以经过 Layout / Surface / Core Scope 进入同一 renderer-neutral Scene、bounds 与 clip 边界
- frame padding、三个 section gap、Legend 四边方位、Diagram Neutral 与同名 Core style 协作具有确定行为和失败语义
- 内部 drawing child 可被不同尺寸和内容替换，foundation 不读取、修改或持久化其领域语义
- Foundation 不复制 Graph、Layout、Standard、Core 或 renderer 已拥有的模型与机制
- `@retikz/diagram`、`@retikz/diagram-vanilla` 与 `@retikz/diagram-react` 形成职责明确的可用 package family，React 通过 Vanilla 共享同一 authoring 与处理链路
- 完整 FlowDiagram 以 renderer-neutral 方式组合 Presentation、Frame / Appearance 与 Flow drawing core，并把所有存在区域纳入同一输出边界
- Diagram 消费 Graph 的公开 Source / resolve 契约，布局意图保持 JSON-safe，几何结果保持 renderer-neutral，并通过 Graph identity 稳定对齐
- FlowDiagram 完成 Graph 自动测量、布局、routing、Diagram foundation composition 与 Core Scene 的最小端到端闭环，不要求作者手工计算全部节点位置和连线路径
- Direct IR、Vanilla 与 React 对 MVP 具有等价表达，不存在 adapter 或 renderer 私有能力
- 至少一批现有 docs 关系型流程图已迁移为真实消费者；未覆盖场景有明确边界，并留待后续 alpha 按需规划
