# ADR-02：撤销 GraphNode Variant 视觉轴

- 状态：Superseded by [ADR-06](./06-graph-entity-registry-theme.md)（2026-08-23 breaking revision）
- 决策日期：2026-08-15
- 替代原因：Graph Theme 与元素显式 appearance 已覆盖 Variant 的全部稳定职责

## 背景与目标

早期 GraphNode 使用 `role` 表达语义，并用闭合的 `variant` 词汇选择共享视觉层级。该设计随后形成了 Graph Theme style、局部 `graphTheme` rules 和元素显式 appearance 之外的第二套视觉参数体系，使作者需要在两个等价入口之间选择，也让视觉差异被误认为稳定语义

本决策撤销 GraphNode Variant 轴。Graph 的可复用语义继续由 role、kind 与 predicate 表达；批量视觉默认由 Graph Theme 管理；单个实例的精确呈现直接使用 Core-compatible appearance 字段

## 决策

- 删除 GraphNode `variant`、GraphFrame `graphNodeVariant` 及其继承规则
- 删除 Variant schema、类型、常量、Definition、registry、options、Theme selector 与内置 recipe
- Theme selector 只匹配真实语义轴，不接受纯视觉 key
- Graph Theme 负责 mode-aware 默认与语义规则，元素显式 appearance 逐字段覆盖 Theme 默认
- Graph lowering 只把最终 appearance 下沉到普通 Core Node / Path，不把 Variant 写入 Canonical、Scene 或 renderer

## 行为与兼容性

- `variant` 与 `entityVariant` 在 strict Source schema 中作为未知字段拒绝
- 旧 Variant 导出、注册入口和 selector 不提供 alias、deprecated、fallback 或双轨解析
- 默认视觉语言、同名 Core / Graph Theme style 协作及完整级联由 ADR-06 冻结
- GraphNode / GraphFrame 的后续命名和 Source 结构分别由 ADR-05、ADR-07 与 ADR-09 取代

## 结果

Graph 只保留一条视觉配置路径：Theme 提供可复用默认，元素 appearance 提供实例覆盖。Variant 不再属于现行 Source IR 或公开 API
