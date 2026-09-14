# plot v0.1 Roadmap

## 版本目标

建立完整的静态图形语法与跨宿主绘图入口。

## 重点功能

| 重点能力       | 目标                                                | 相关 ADR                                                                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 语法基础       | 贯通数据、通道、scale、coordinate、mark 与 lowering | [001](./001-plot-spec-root.md)、[003](./003-plot-scale.md)、[004](./004-plot-coordinate.md)、[005](./005-plot-encoding-mark.md)、[006](./006-plot-lowering.md)                                                                                                                              |
| 标度与通道     | 完善类型驱动 scale、视觉通道与图例                  | [030](./030-type-driven-scale.md)、[038](./038-channel-scale-resolver-size.md)、[042](./042-continuous-color-scale.md)、[043](./043-discretization-scale.md)、[044](./044-legend-guide.md)                                                                                                  |
| 几何与统计     | 扩展 mark、关系几何及统计变换                       | [069](./069-relation-mark-anchor.md)、[072](./072-statistical-transform-algebra.md)、[073](./073-relation-ribbon.md)、[074](./074-quantile-band-boxplot.md)、[075](./075-density-transform.md)、[076](./076-smooth-regression.md)                                                           |
| 坐标与组合     | 支持坐标扩展、facet、overlay、多轴与共享 scaffold   | [045](./045-coordinate-frame-roles.md)、[049](./049-coordinate-chart-frame.md)、[080](./080-coordinate-composition-registry.md)、[081](./081-facet-grid-data-routing.md)、[082](./082-same-panel-multi-axis.md)、[083](./083-shared-scaffold-tracks.md)                                     |
| Guide 与 Theme | 完善轴、网格、标签、图例与主题外观                  | [089](./089-axis-domain-tick-strategy.md)、[091](./091-theme-schema-merge.md)、[092](./092-legend-palette-guide-theme.md)、[095](./095-axis-tick-label-layout.md)、[096](./096-axis-title-layout.md)、[097](./097-axis-grid-source-and-style.md)、[099](./099-legend-size-symbol-layout.md) |
| 入口与追溯     | 统一薄容器、identity、lineage 及 Data 消费边界      | [026](./026-scope-id-meta.md)、[027](./027-datum-locator.md)、[085](./085-scope-provenance-surface.md)、[088](./088-composition-api-structure.md)、[101](./101-data-package-adapter.md)、[103](./103-plot-mark-lineage-trace.md)、[104](./104-plot-vanilla-plain-api.md)                    |

## 功能规划

### 语法基础

主要场景：

- 作者用图形语法表达数据到图形的映射。
- 普通二维图不应要求手写底层 Node 和 Path。

规划内容：

- 贯通数据、通道、scale、coordinate、mark 与 lowering。
- 建立可组合的静态绘图骨架，不在本版本引入交互执行模型。

预期效果：

常见静态图能够从数据描述一路得到可绘制结果。

### 标度与通道

主要场景：

- 不同类型字段需要选择合适标度。
- 颜色、大小、透明度和形状需要表达数据差异。

规划内容：

- 完善类型驱动 scale、连续 / 离散视觉通道与图例。
- 保持通道解释、标度计算和呈现职责清晰。

预期效果：

数据差异能通过多个视觉通道表达，并保持可读的标度与图例。

### 几何与统计

主要场景：

- 常见图形需要更丰富的 mark 和关系表达。
- 统计结果需要通过区间、分布或趋势被可视化。

规划内容：

- 扩展关系几何、Ribbon 与常用 mark。
- 补齐统计变换及其几何消费，通用数据算法归 Data。

预期效果：

更多分析结果能够通过同一图形语法呈现，而非依赖专用绘图代码。

### 坐标与组合

主要场景：

- 数据需要分面、叠加或共享坐标骨架。
- 同一面板可能包含多个坐标轴或坐标表达。

规划内容：

- 提供坐标扩展、facet、overlay、多轴与 scaffold 组合。
- 各层保持可识别的来源和空间关系，已退出的 ternary2D 不重新纳入。

预期效果：

多视图和多坐标图形可以组合，同时保持来源与空间关系清晰。

### Guide 与 Theme

主要场景：

- 图形需要可读的轴、刻度、网格和图例。
- 不同图形希望共享一致的主题外观。

规划内容：

- 完善 Axis、Grid、标签、Legend 与 Theme。
- 区分数据映射语义与外观选择，使组合图保持清晰。

预期效果：

图形不只有 mark，也具备帮助读者理解数据的完整辅助呈现。

### 入口与追溯

主要场景：

- 复杂图形需要追溯数据、图层和来源。
- 不同宿主需要等价而不过度包装的 authoring。

规划内容：

- 统一薄容器、scope identity、locator 与 lineage。
- 收敛 Data 消费边界及 React / Vanilla 入口。

预期效果：

图形能被创建、组合和追溯，不因宿主入口不同而产生另一套语义。

## 边界与依赖

通用数据能力归 Data；已退出的 ternary2D 不再纳入。交互、增量与按需物化留给后续版本。
