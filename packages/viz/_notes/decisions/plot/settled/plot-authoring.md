---
description: Plot 要能与普通图元组成一张图，而不是强制生成自带装饰的整图。
keywords: 'IRPlot、IRPlotLayer、IRPlotDefaults、IRPlotAxisDefaults、InputPlot、绘图规格与图层组合、spec、Plot、plot、composite、JSON、meta'
---

# Plot 声明、组合与装饰

## 设计目的

Plot 要能与普通图元组成一张图，而不是强制生成自带装饰的整图。React、Vanilla 和 JSON 应表达同一份领域声明；可选的轴、图例和标题由绘图区统一安排空间，不由各入口各自补齐。

## 决策

### 绘图规格与图层组合

`IRPlot` 是可嵌入的领域规格，`IRPlotLayer` 表达图层配置。

Plot 是 namespace/type 标识的领域组合节点，声明图元、坐标、尺度和要使用的数据；数据行、运行时函数与后端对象不进入可持久化 IR。同一声明可从 JSON 或作者 API 得到。

Plot 编译把外部数据、声明式规格与绘图区结合，输出 Core 可处理的图形，不让 SVG 或 Canvas 解释数据字段。首个闭环只需要一个可投影的数据图元。

Plot 是可组合的底层图形块。没有显式 guide 就不应悄悄补出可见轴、网格或图例；要显示装饰，作者应能从规格中看出其来源。

多个 Plot 可以和 Core 图元共处在一棵图形树，形成独立图层、布局子项或被连接的对象。组合的单位是领域声明，不是把多张后端图像再叠起来。

绘图区背景、网格、图元和上层装饰以语义图层交给 Core 排序。覆盖整层的顺序与改变单个 datum 在层内的顺序是不同操作；默认顺序不依赖偶然的 lowering 遍历次序。

### 主题与装饰布局

`IRPlotDefaults` 汇集绘图区与装饰的默认设置；`IRPlotAxisDefaults` 是其中的轴默认值。

Plot 的轴、网格、图例、字体和绘图区可以共享领域默认值；更具体的作者显式配置应能覆盖默认，而不能靠各 lowering 阶段各自猜一套。

绘图区内部的轴、图例和分面/轨道 header 会占用空间，应通过统一测量和放置协调，而不是每个 guide 另加 magic margin。

### Plot 作者输入

`InputPlot` 是 Vanilla 作者输入，`IRPlot` 是规范化后的领域声明。

Vanilla 接收 TypeScript 作者输入，展开绑定并规范化为可持久化 Plot IR；React 收集 JSX 后走同一路径。JSON 入口消费领域 IR，不承担框架作者简写。

## 历史记录

- Plot v0.1：确定可嵌入的绘图根、显式装饰与图层顺序（ADR-001、ADR-006、ADR-050、ADR-051、ADR-100）；明确主题默认值和装饰占位（ADR-091、ADR-098）；统一 Vanilla plain spec 与组件输入的语义（ADR-104）。
