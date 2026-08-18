# ADR-01：可嵌入 Tier 2 组件的 Layout 静态贡献

- 状态：Accepted MVP（已实现）
- 决策日期：2026-06-13
- 关联：[v0.3 Tier 2 支撑](../../v0.3/alpha.2/01-tier2-support.md) · [ADR-02 scope bbox](./02-scope-polymorphic-bbox.md)

## 背景

已有 composite lowering，但 buildIR 只识别 Kernel 元素；把 Plot 等 Tier 2 组件写入 Layout children 会被当作普通 Sugar 调用，可能执行 hooks。Layout 也缺少收集多个领域组件的数据集和 composite 工厂的通道。这是 core-react 的通用底座，不应由 plot 建立平行容器。

## 决策

可嵌入 Tier 2 组件通过静态 adapter 贡献 IR 和 lowering 资源，Layout 汇总后传入 compile：

- EmbeddableTier2Adapter 包含 displayName、namespace 和纯 contribute(props)。贡献为 node、datasets、makeComposites(mergedDatasets)
- 组件声明 isTier2Embeddable = true 与 embeddableAdapter；Layout 的 embeddables prop 可显式注入并覆盖静态 adapter。标记组件找不到合法 adapter 时 fail-loud，不能退化为 Sugar；普通无标记函数组件仍按原 Sugar 规则
- readSceneChildren 和 handler 收集使用同一静态识别，均不调用可嵌入组件，不执行 hooks。Layout 按 namespace 合并 contributions；同一 reference 必须是同一对象引用，冲突直接报错
- 公开 buildIR/convertReactNodeToIR 仍返回 IR；贡献通过内部 side channel 汇总，不能改变公开返回值。Standalone 组件仍执行自身逻辑，嵌入态由 Layout 处理
- core 不识别 plot 等具体 domain；Vanilla 继续直接构造同一 core IR 并显式提供 composites/datasets

## 兼容性与实现结果

现有 Layout children、composites prop 和 standalone 行为保持兼容；能力以 additive adapter 和贡献汇总落地，core IR schema 不变。

## 遗留风险

布局托管、相对 anchor、series/datum locator 和更高阶 Vanilla compose sugar 不属于本契约，仍由领域层决定。
