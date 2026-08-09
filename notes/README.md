# retikz 内部文档地图

面向项目内部协作，不面向终端用户。用户文档放在 `apps/docs/`。

## 当前结构

| 目录                              | 内容                                                             | 生命周期                                     |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| [`architecture/`](./architecture) | 全仓长期架构真源。只放跨包原则、IR / Scene / schema 等底层契约。 | 永久；重大架构调整直接更新原文。             |
| [`plans/`](./plans)               | 长任务执行计划、状态和临时 review 材料。                         | 本地临时产物；被 `.gitignore` 忽略，不提交。 |
| [`reports/`](./reports)           | 只读审计、阶段性 review 报告。                                   | 本地临时产物；被 `.gitignore` 忽略，不提交。 |

包或发布组专属文档已经下沉到对应目录：

| 目录                                                        | 内容                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`../packages/kernel/_notes/`](../packages/kernel/_notes)   | kernel 七包（math / runtime / core / render / react / vanilla / tex）的 roadmap、ADR、架构与分析。 |
| [`../packages/viz/_notes/`](../packages/viz/_notes)         | data、plot、table 等 viz 能力域与发布组的架构、roadmap、ADR、分析。                                |
| [`../packages/library/_notes/`](../packages/library/_notes) | Standard 官方可选绘图库的架构、roadmap 与 ADR。                                                    |
| [`../apps/eval/_notes/`](../apps/eval/_notes)               | eval 应用的评测设计、语料与 runner 方案。                                                          |

## 写到哪里

1. 跨包长期架构原则：写进 `notes/architecture/`。
2. kernel 发布组的版本路线、ADR、执行记录：写进 `packages/kernel/_notes/decisions/`。
3. viz / library 各发布组的版本路线、ADR、执行记录：写进对应 `_notes/decisions/`。
4. 单包一次性分析：写进该包或发布组的 `_notes/analysis/`。
5. 长任务计划和状态：写进 `notes/plans/` 或就近 `_notes/plans/`；完成且无恢复价值后删除。
6. 全仓审计报告：写进 `notes/reports/`；这是本地临时目录，不提交。

判断标准：文档的主要维护者是谁，就放到谁的目录下；只有会约束多个包的长期原则才留在根 `notes`。

## 文档头区与效力

- `architecture/` 长期文档在标题后至少写明：`状态`、效力或不负责的范围、当前基线或“不跟版本”、关联真源。已实现能力不能继续写成“包未建立 / owner 待定 / 首个 ADR 决定”。
- `analysis/` 写明快照日期、被评版本或 commit、覆盖范围和是否可作为当前契约。历史评分与经验阈值可以保留，但再次立项前必须按当前实现复验。
- `README.md` 只维护当前目录、当前入口和生命周期，不复制具体 API、schema 字段或 milestone 实现细节。
- roadmap 可持续更新；Accepted ADR 只增补状态或 supersede。长期架构直接更新当前判断，不用历史段落与当前规则并列充当双真源。

## 当前入口

### 全仓架构

- [`capability-design.md`](./architecture/capability-design.md)：能力域、包角色、完备标准与能力性迭代门禁。
- [`schema-design.md`](./architecture/schema-design.md)：schema / LLM 契约相关设计。
- [`package-topology.md`](./architecture/package-topology.md)：领域目录、release group 与依赖策略。
- [`performance-design.md`](./architecture/performance-design.md)：增量执行、调度、retained patch 与 generation 总则。
- [`interaction-design.md`](./architecture/interaction-design.md)：事件、behavior、presentation、intent 与交互边界。
- [`editor-design.md`](./architecture/editor-design.md)：无 UI 图形编辑运行时、candidate transaction 与领域 editor adapter 边界。
- [`visual-theme-design.md`](./architecture/visual-theme-design.md)：renderer-neutral 视觉主题、公开 token、通用 preset 与跨包映射原则。
- [`attached-space-composition.md`](./architecture/attached-space-composition.md)：跨域空间贴附与复用长期方向。
- [`diagram-design.md`](./architecture/diagram-design.md)：Notation / Graph / Flow / Editor 制图能力长期边界。

### kernel 发布组

- [`kernel notes`](../packages/kernel/_notes/README.md)：kernel 发布组内部文档入口。
- [`kernel v0 roadmap`](../packages/kernel/_notes/decisions/v0/roadmap.md)：kernel v0 总路线。
- [`kernel ADR template`](../packages/kernel/_notes/decisions/_template.md)：kernel ADR 模板。
- [`core compare analysis`](../packages/kernel/_notes/analysis/core-compare-analysis.md)：core 底座横向对比。

### viz 发布组

- [`viz notes`](../packages/viz/_notes/README.md)：viz 能力域与发布组内部文档入口。
- [`plot-design.md`](../packages/viz/_notes/architecture/plot-design.md)：`@retikz/plot` 架构设计。
- [`data-capability-complete.md`](../packages/viz/_notes/architecture/data-capability-complete.md)：data 能力完备与宿主边界。
- [`plot-visualization-complete.md`](../packages/viz/_notes/architecture/plot-visualization-complete.md)：plot 可视化完备与跨能力域闭环。
- [`plot v0 roadmap`](../packages/viz/_notes/decisions/plot/v0/roadmap.md)：plot v0 总路线。
- [`plot v0.1 roadmap`](../packages/viz/_notes/decisions/plot/v0/v0.1/roadmap.md)：plot v0.1 路线与 milestone 索引。
- [`plot compare analysis`](../packages/viz/_notes/analysis/plot-compare-analysis.md)：plot 横向对比。
- [`plot rendering performance`](../packages/viz/_notes/analysis/plot-rendering-performance.md)：plot 渲染性能分析。
- [`table-visualization-complete.md`](../packages/viz/_notes/architecture/table-visualization-complete.md)：table 能力准入与完备性边界。
- [`table-design.md`](../packages/viz/_notes/architecture/table-design.md)：Table grammar、Table Algebra 与约束布局总设计。
- [`table v0.1 roadmap`](../packages/viz/_notes/decisions/table/v0/v0.1/roadmap.md)：table v0.1 路线与 milestone 索引。

### library 发布组

- [`library notes`](../packages/library/_notes/README.md)：Standard 发布组内部文档入口。
- [`standard-library-design.md`](../packages/library/_notes/architecture/standard-library-design.md)：Standard 包家族、Core 扩展机制与领域包边界。
- [`standard v0.1 roadmap`](../packages/library/_notes/decisions/standard/v0/v0.1/roadmap.md)：Standard v0.1 路线与 milestone 索引。

## 打包约束

包内 `_notes/` 是仓库协作资料，不进入 npm 包。发布包继续依赖各自 `package.json` 的 `files` 白名单，只发布 `dist/**/*`、`README.md`、`LICENSE` 和 `package.json`。
