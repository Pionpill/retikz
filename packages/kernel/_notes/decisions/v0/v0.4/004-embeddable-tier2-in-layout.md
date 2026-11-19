---
description: 'Tier 2 可贡献领域 IR、定义与所需资源，嵌入 Layout 后与其它图形在同一上下文中编译'
keywords: 'Tier、Layout'
---

# ADR-004：可嵌入 Tier 2 组件的 Layout 静态贡献

- 状态：Partially Superseded
- 决策日期：2026-06-13
- 关联：[v0.3 Tier 2 支撑](../v0.3/006-tier2-support.md)、[ADR-005 scope bbox](./005-scope-polymorphic-bbox.md)
- 后续决策：[kernel v0.5/029](../v0.5/029-vanilla-authoring-normalization.md)、[kernel v0.5/052](../v0.5/052-unified-composite-compilation.md)

## 保留的决策

Tier 2 可贡献领域 IR、定义与所需资源，嵌入 Layout 后与其它图形在同一上下文中编译。adapter 负责表达作者意图，不直接输出另一套 Scene。

识别嵌入式组件不能通过直接调用组件或执行其 hooks 完成。按声明顺序收集贡献，合并及冲突由所属能力解释；IR 保持可序列化，运行时输入单独传递。

## 修订边界

早期静态 contribution 不等于要向所有宿主暴露独立 lowering API；作者输入共享归一化，Composite 使用统一 compile。
