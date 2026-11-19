---
description: '领域组件既要保留自身语义，又要和普通图元共享父级布局与编译环境。'
keywords: 'IRComposite、CompositeDefinition、领域组合与嵌入、compile、Tier、lowering、JSX、authoring、expand、cache、Layout'
---

# 领域组合与嵌入

## 设计目的

领域组件既要保留自身语义，又要和普通图元共享父级布局与编译环境。决定由谁解释领域声明，是为了避免 React、Vanilla 和各后端分别展开同一组件。

## 决策

`IRComposite` 保存领域声明，`CompositeDefinition` 描述编译时如何消费该声明。

Tier 2 组件保留可序列化的领域声明，由注册的 Composite Definition 消费；React、Vanilla 和 renderer 不各自实现一套领域降解。

作者声明、编译上下文和缓存是不同职责；支持组件嵌入不等于向作者承诺某种展开缓存。

Tier 2 可贡献领域 IR、定义与所需资源，嵌入 Layout 后与其它图形在同一上下文中编译。adapter 负责表达作者意图，不直接输出另一套 Scene。

识别嵌入式组件不能通过直接调用组件或执行其 hooks 完成。按声明顺序收集贡献，合并及冲突由所属能力解释；IR 保持可序列化，运行时输入单独传递。

## 历史记录

- Kernel v0.3：区分领域声明、共享编译上下文和缓存责任（ADR-006、ADR-007）。
- Kernel v0.4：确立领域子树与布局共享编译环境（ADR-004）。
