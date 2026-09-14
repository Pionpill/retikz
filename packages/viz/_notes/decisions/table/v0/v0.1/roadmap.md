# table v0.1 Roadmap

## 版本目标

建立完整的静态表格语法与可追溯绘图能力。

## 重点功能

| 重点能力       | 目标                                                          | 相关 ADR                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 基础与二维布局 | 支持 manual / detail、轨道、span、border、对齐与内容 fit      | [001](./001-table-spec-root.md)、[002](./002-table-structure-model.md)、[010](./010-track-sizing-schema-and-solver.md)、[011](./011-cell-box-span-and-alignment.md)、[012](./012-content-fit-overflow-and-wrap.md)、[013](./013-border-graph-and-conflict-resolution.md)、[016](./016-manual-row-matrix-authoring.md) |
| 呈现语法       | 支持 formatter、selector / rule、条件视觉、默认片段与图例描述 | [017](./017-cell-formatter-and-formatted-value.md)、[018](./018-presentation-context-and-cell-appearance.md)、[019](./019-cell-selector-and-rule-cascade.md)、[020](./020-conditional-visual-encoding-and-scale.md)、[023](./023-table-source-default-fragments.md)                                                   |
| 分组与汇总     | 规划 group、hierarchy、subtotal、grand total 与 transpose     | —                                                                                                                                                                                                                                                                                                                     |
| 交叉表         | 规划 pivot / matrix、多层 header 与表格区域语义               | —                                                                                                                                                                                                                                                                                                                     |
| 组合与追溯     | 支持 Legend 组合，并规划分片、重复 header 与完整 lineage      | [014](./014-layout-lowering-manifest-and-migration.md)、[024](./024-standard-legend-consumption-and-traceability.md)                                                                                                                                                                                                  |

## 功能规划

### 基础与二维布局

主要场景：

- 作者显式组织内容，或按数据行生成明细表。
- 单元格需要跨行列、对齐并容纳不同尺寸内容。

规划内容：

- 覆盖 manual / detail、track sizing、span、border 与 fit / overflow。
- 提供可持久化的二维 authoring，并保持单元格测量与放置一致。

预期效果：

静态内容和明细数据能够形成有明确尺寸、边界和对齐的表格。

### 呈现语法

主要场景：

- 不同单元格需要格式化、规则匹配和条件外观。
- 数据大小或类别需要映射为表格内的视觉提示。

规划内容：

- 发展 formatter、selector / rule、条件视觉与 Source 默认片段。
- 形成图例描述，区分数据编码与通用 Legend 绘制。

预期效果：

表格能承载数据解释与视觉提示，不只是统一样式的文字网格。

### 分组与汇总

主要场景：

- 数据需要按类别或层次分组。
- 分组内容需要小计、总计或行列转置展示。

规划内容：

- 保留 group、hierarchy、subtotal、grand total 与 transpose 规划。
- 聚合与数据来源处理依赖 Data，不在 Table 内重建统计算法。

预期效果：

分组数据与汇总结果拥有明确展示方向，不提前假设具体实现已完成。

### 交叉表

主要场景：

- 多维结果需要透视或矩阵表达。
- 列组与行组需要多层表头和明确的区域语义。

规划内容：

- 保留 pivot / matrix 与多层 header 规划。
- 覆盖 spanner、stub、corner、row group 等表格区域表达。

预期效果：

多维结构可以按表格语义规划，避免用无关联单元格拼接复杂表头。

### 组合与追溯

主要场景：

- 长表或复合图需要分片、重复表头与外围图例。
- 使用者需要追溯显示内容到数据与布局结果。

规划内容：

- 发展 Legend 组合、fragmentation 与重复 header。
- 完善 manifest、lineage、locator 与 diagnostics，不接管交互编辑状态。

预期效果：

复杂表格能与外部图例组合，并保持内容、数据和布局之间的关联。

## 边界与依赖

依赖 Data 聚合与 lineage、Core 约束布局和 artifact、Layout 与 Standard Legend；不拥有数据算法、renderer、单元格编辑或电子表格计算。
