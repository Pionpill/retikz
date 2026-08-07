# table v0.1 Roadmap

> v0.1 的目标是建立完整的 renderer-agnostic 静态表格语法。本文只确定 milestone 边界；具体字段、Definition、算法和测试合同由各 milestone ADR 决定。
> 关联：[`table v0 roadmap`](../roadmap.md) · [`table-design.md`](../../../../architecture/table-design.md) · [`table completeness`](../../../../architecture/table-visualization-complete.md)

## 版本目标

同一份 JSON-safe TableSpec 能在 React / Vanilla 中表达，并沿统一 Table pipeline 进入 Core contextual compile；renderer 不需要认识 Table 私有类型。

v0.1 发布前应覆盖明细、分组、汇总与交叉表等核心静态表格形态，同时保持 Data、Core、adapter 和 data-grid 宿主边界清晰。

## Milestones

| Milestone                       | 主题                           | 主要产出                                                                                               | Gating                                                   | 状态       |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------- |
| [alpha.1](./alpha.1/roadmap.md) | **最薄纵向闭环**               | TableSpec、manual/detail、基础 Cell、固定轨道布局、lowering、React/Vanilla                             | Core composite 与 DataReference 已就绪                   | 已完成     |
| [alpha.2](./alpha.2/roadmap.md) | **二维布局与持久化 authoring** | auto/fraction/minmax、span、border、bounds-aware alignment、fit/overflow、manual row-major persistence | 通用 `IRChild` constrained layout                        | 已完成     |
| [alpha.3](./alpha.3/roadmap.md) | **呈现语法**                   | formatter、presentation、selector/rule、条件视觉 scale、theme、Legend descriptor seed                  | alpha.2 canonical model                                  | 治理收口中 |
| alpha.4                         | **分组与汇总**                 | group、hierarchy、subtotal、grand total                                                                | Data aggregate / lineage                                 | 计划中     |
| alpha.5                         | **交叉表**                     | pivot、matrix、多层 header、spanner/stub/corner/row group                                              | Data 分组与聚合能力                                      | 计划中     |
| [alpha.6](./alpha.6/roadmap.md) | **分片与追溯收口**             | Standard Legend 组合、fragmentation、重复 header、完整 manifest/lineage/locator/diagnostics            | Standard Legend/Flex；Core occurrence-safe artifact link | 计划中     |
| beta.1                          | **稳定化**                     | API 收口、adversarial tests、双语 docs、发布检查                                                       | alpha completeness 全部闭环                              | 计划中     |

## 贯穿原则

- 数据集不进入 IR；TableSpec 只保存外部数据引用和可序列化配置
- Cell 是语义与布局槽位，内容以 Core `IRChild` 为边界
- 显式 Plot 等 Tier 2 Cell 属于 v0.1；Table 负责其 Cell box、测量、fit、clip 与追溯，但不解析内容内部语义
- 内置与自定义结构 / 呈现经过同一 Definition / registry 链路
- manual / detail / pivot / matrix 是基础 structure；group / hierarchy / summary / transpose 是可组合 operation
- Table 不复制通用 Data transform，也不建立平行 Core IR、测量或 renderer
- Table 拥有 visual encoding 到 Legend descriptor / Standard Legend 输入的领域解析、theme mapping 与 lineage；alpha.3 截止于 descriptor seed，Standard Legend composition 与跨 Table / Legend artifact 的 occurrence 关联由 alpha.6 收口
- 每个 alpha 都形成 `table`、`table-react`、`table-vanilla` 可验证的纵向薄片
- manifest、lineage 与 locator 可以分阶段丰富，但稳定 identity 与来源不能事后补造

## 不在 v0.1 范围

- 虚拟滚动、滚动同步与 viewport windowing；这些大表展示能力延后到 v0.2
- 选择、拖拽等展示交互 runtime；后续按独立 ADR 评估
- 单元格编辑、电子表格公式与依赖计算；这些不是 Table 家族目标
- 服务端分页、异步加载和缓存状态；这些由宿主提供
- DOM table / ARIA grid 的具体宿主实现
- 自动按 Table 维度生成 Plot Cell 的 PivotChart，以及跨 Plot Cell 自动训练或协调 scale、axis、grid、legend；显式 Plot Cell 仍通过 Core composite 支持
- 统一 `viz-react` / `viz-vanilla` adapter

## ADR 约定

每个 milestone 在自己的目录内从 `01` 编号。ADR 状态从 Proposed 开始，完成 Architecture Gate 与人工确认后才能进入实现。
