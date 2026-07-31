# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector / rule、条件视觉 scale 与 theme / legend。具体公开字段和行为由同目录 ADR 冻结。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：计划中

## 目标

沿现有 Definition / registry 与 value → `IRChild` 链路扩展 formatter、presentation、selector / rule、conditional scale、theme 与 Legend descriptor，并把通用 Legend 呈现交给 Standard 消费。manual Table 的矩形 `rows` 持久化 authoring 已归入 alpha.2，不在本 milestone 重复定义。

## ADR 顺序

尚未立项。formatter、presentation、selector / rule、conditional scale、theme 与 Legend descriptor 由后续 ADR 分别冻结。

## 不在 alpha.3 范围

- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
