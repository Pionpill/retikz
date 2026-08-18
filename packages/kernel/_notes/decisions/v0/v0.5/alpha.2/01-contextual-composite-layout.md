# ADR-01：上下文化 Composite 布局事务

- 状态：Superseded（由 [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) 取代）
- 决策日期：2026-07-23
- 关联：[alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md)

## 背景

本提案最初尝试让 Tier 2 Composite 在一次 Core compile 中测量任意 child、根据真实布局反馈求解，并复用选中结果生成最终 Scene。结构化 `expand()` 无法完成这类上下文化布局，因为它运行在完整 provider、引用、资源、命名空间和文字测量环境建立之前。

## 取代决定

[alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) 已用同一 Composite registry 的 layout-aware `compile` 分支完整解决该问题，并冻结以下长期边界：

- child layout、选择和 replay 发生在同一次 compile transaction 中
- probe 结果与 replay handle 只在创建它们的 compile environment 内有效
- 未选 probe 不向最终 primitive、resource、warning、artifact 或 namespace 写入状态
- Core 管理 occurrence、typed artifact 与真实 allocation / visual bounds
- React、Vanilla 与 headless 入口只接线同一 Core compile contract

该替代方案已取代本记录，因此本文件不再定义当前 API 或实现范围。alpha.2 后续的双轴 proposal、slot、alignment guide 和 failure isolation 由 [ADR-06](./06-box-layout-composite-contract.md) 与 [ADR-08](./08-layout-proposal-probe-contract.md) 在替代合同上继续扩展

## 历史边界

- 本记录只说明被替代的问题与原因，不作为实现或兼容性依据
- 当前公开契约以 alpha.1 ADR-07、alpha.2 ADR-06/08、公开类型和用户文档为准
- Table、Standard 等 Tier 2 owner 不得恢复私有 measurement service、跨 compile replay 或平行 lowering 管线
