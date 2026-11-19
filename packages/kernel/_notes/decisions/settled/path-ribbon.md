---
description: '流带需要表达变化的宽度、两侧边界和端帽，但不应因此另造一套路径身份、标签或渲染语义。'
keywords: 'IRPath、RibbonPathSchema、路径类型与可变宽带、path、Ribbon、IRRibbon、Path.ribbon、width、start、interpolation、arc、cap'
---

# 路径类型与可变宽带

## 设计目的

流带需要表达变化的宽度、两侧边界和端帽，但不应因此另造一套路径身份、标签或渲染语义。这里定义带状几何如何成为可绘制轮廓，而不把流量分配和 Sankey 布局放进 Core。

## 决策

`IRPath` 是路径宿主；`RibbonPathSchema` 描述带状路径接受的几何声明。

可变宽带由中心线与宽度，或显式上下边界形成闭合轮廓。Core 负责几何，renderer 执行普通 path；流量分配、排序和 Sankey 布局不属 Core。

中心线模式按宽度分布及 center/left/right 对齐派生两侧边界；显式边界模式直接使用 upper/lower。采样应由几何契约决定，不能因换后端而改变轮廓。

center 将宽度分配在中心线两侧，left/right 将带放在方向确定的一侧；边界模式不应再从宽度 profile 反推作者已明确给出的边界。

带状路径的起点与终点可以各自使用圆弧闭合两侧边界。圆心、半径和扫向必须可序列化，编译时验证能否连接；不能生成有限有效几何时应报告错误，而非让后端猜测。

起点与终点的 cap 可分别配置；圆弧封口连接的是同一端的两条边，而非沿中心线添加一个装饰箭头。

stroke 与 ribbon 共享路径身份、来源、外观与标签语义，不能为了两种几何重复声明图元公共属性。宽度 profile、两侧边界和端盖则只对 ribbon 有意义。

Path 是唯一的路径类宿主，默认 stroke，ribbon 是同一宿主上的几何 kind。内置与自定义 kind 共用 Definition；未知 kind 或重复注册不得静默回退。运行时函数不进入 JSON。

bulge 宽度 profile 用非负有限的 base、peak 表示两端与中点宽度，peak 小于 base 时中段收窄。它仍属于 ribbon 几何。

## 历史记录

- Kernel v0.4：统一路径宿主、带状轮廓、端帽与宽度分布（ADR-015、ADR-016、ADR-017、ADR-020、ADR-021、ADR-033）。
