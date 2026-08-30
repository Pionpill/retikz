# ADR-08：Strip 不设独立 chartType

- 状态：Superseded
- 决策日期：2026-08-30
- 关联：[alpha.1 roadmap §7](./roadmap.md) · [ADR-04](./04-scatter.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Strip Plot 展示分类分组内的一维观测分布。当前 Scatter 已能用分类 / 数值位置字段表达 Point，并通过 facet 划分分组、通过 Jitter 避免观测值完全重叠；文档示例已证明这三个现有能力可以组合得到 Strip 的目标视觉。

继续新增独立 `strip` chartType 会复制 Scatter 的字段映射、Point recipe、adapter 与文档 surface，却没有引入新的长期语义或独立 lowering 能力。本 ADR 因此不再冻结未来 Strip contract，而是记录不建立独立 chartType 的结论。

## 核心决策

1. Chart 不新增 `strip` chartType、exact Source schema、recipe Definition、provider contribution 或 adapter subpath
2. Strip 由 `scatter` + facet + jitter 组合表达；分类 / 数值角色继续使用 Scatter 的 x / y 映射，分组与抖动分别由现有 Plot composition 和 transform 主链拥有
3. Point 样式、颜色、facet、jitter 参数及 provenance 继续遵循各现有 owner contract，不增加 Strip 专用 alias、默认值或兼容层
4. Docs 可以把该组合展示为 Scatter 示例或 pattern，但不得把 `strip` 列为可导入 chartType

## 行为、失败语义与兼容性

`strip` 不进入当前 Chart Source union；以该值作为 `chartType` 的输入继续得到既有 unknown chartType / schema 诊断。实现不注册不可执行 variant，不提供 fallback、别名或 renderer 特判。

未来只有出现无法由 Scatter + facet + jitter 表达、且具有独立长期契约的真实需求时，才重新提出新的 ADR；不能仅因常见图表名称而恢复独立 chartType。

## 功能与包边界

Chart 继续拥有 Scatter exact authoring 与 recipe；Plot 继续拥有 facet composition、Jitter transform、coordinate projection、field collection、lowering 与 trace；Core / renderer 只消费 Plot lowering 结果；adapter 不拥有随机数或像素偏移。

## 当前实现结果与遗留风险

原 Proposed 方案要求独立 category-band offset contract，并把 Strip 作为未来 implementation gate；该方向已被现有 Scatter + facet + jitter 组合替代。Strip 不再是 alpha.1 退出 blocker，也没有待实现的公开 contract。
