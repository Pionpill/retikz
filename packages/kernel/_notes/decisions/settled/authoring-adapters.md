---
description: 从 JSX、Vanilla 或 JSON 输入同一张图时，改变的应是书写方式，而不是几何或编译结果。
keywords: 'InputScene、IRScene、声明式输入与适配器、authoring、unbuilder、round-trip、arrowDetail、OffsetPosition、StepLabel.position、builder、cast、parseTargetSugar'
---

# 声明式输入与简写

## 设计目的

从 JSX、Vanilla 或 JSON 输入同一张图时，改变的应是书写方式，而不是几何或编译结果。因此连预览生成的路径简写也必须能无损还原。

## 决策

### 声明式输入与适配器

`InputScene` 是 Vanilla 的作者输入；`IRScene` 是与宿主无关的场景声明。

纯 Kernel IR 在 React 构建与反向转换之间应逐字段等价，不能只凭最终绘制相似就丢掉位置、标签或箭头的作者意图。

React 元素的 props 在进入已知组件边界时收窄一次，后续处理使用对应的类型，不逐字段强转。字段改名或类型变化应由 TypeScript 指出，不靠运行时探测兜底。

作者简写必须等价于显式基础 IR。只做透传的目标可以保留节点引用；在作者层就需要做算术的点位只能使用可直接计算的坐标，不预演编译上下文。

顶层容器称为 Layout，强调它接收并布局一棵图形树，而不是另一种绘图语言。

Vanilla 为非 React 宿主提供作者输入和接线能力，业务数据不必先伪装成 React element；SVG 和 Canvas 仍消费同一 Scene。

Vanilla 构造器返回普通声明对象，构造不同时编译或挂载；根输入选择直接 children 或显式 layers，不混用。编译、序列化和宿主挂载各有入口，不恢复链式 builder。

React 根入口提供 Kernel 声明与 Sugar；后端宿主、资源定义和具体绘制函数不是公共 React 组件。Layout 选择后端时仍消费相同的编译契约。

### 作者示例与包入口

ComponentPreview 优先生成读者可直接使用的 Vanilla 作者代码。只有当步骤可无损还原为 way，且正向解析能得到相同路径语义时才使用简写；其余步骤保留显式表示。预览源码不能为了简短而丢失圆弧、端点或闭合方式。

## 历史记录

- Kernel v0.1：界定 React 与基础 IR 的往返边界（ADR-011、ADR-014）。
- Kernel v0.2：区分 Layout 根容器、作者简写与基础 IR（ADR-015、ADR-018）。
- Kernel v0.3：明确非 React 宿主的作者入口（ADR-003）；要求示例简写可无损还原（ADR-026）。
- Kernel v0.4：分离 Vanilla plain spec 与 React 声明式接口（ADR-037、ADR-038）。
