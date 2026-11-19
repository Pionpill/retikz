---
description: '颜色、渐变和图案既可用于填充，也可能用于描边。'
keywords: 'IRPaint、IRPathStroke、描边与填充资源、paint、Path、dash、pattern、TikZ、strokeDasharray、lineCap、lineJoin、dashPattern'
---

# 描边与填充资源

## 设计目的

颜色、渐变和图案既可用于填充，也可能用于描边。这里把可复用的绘制资源与线条自身的宽度、虚线等样式分开，使不同后端能表达同一外观。

## 决策

`IRPaint` 描述绘制资源；`IRPathStroke` 描述路径如何描边，二者不是同一层的样式。

虚线以数值段长序列 dashPattern 表达，不把 SVG 的 stroke-dasharray 字符串或 Canvas API 写进绘图 IR。后端转换表示，但不得改变段长顺序。

颜色可直接作为绘制值；渐变等需要共享的 paint 应以渲染器中立的资源表达，由图元引用。后端负责物化和去重，不让作者提供 SVG defs 或 CanvasGradient。

多处图元引用同一渐变不应产生多个不同的视觉定义。Scene 保存资源及其引用，后端将其物化，而非由 renderer 重新解释作者输入。

图案填充与图像填充不能被当成普通颜色处理。可重复的 motif 属于绘制资源；图片是否可加载、如何取得并非一个 pattern 形状名称能够决定。

首版 image 保存 URL，不嵌入图像对象。fill 拉伸至边界，contain 保持比例完整放入，cover 保持比例铺满；pattern 的重复周期以绘图单位衡量，不随每个节点的尺寸重算。

PatternDefinition 负责重复单元的 motif；内置与扩展图案走同一注册和编译流程。后端只消费解析后的绘制资源，不根据图案名重做领域判断。

stroke 与 fill 一样可以是基础颜色或结构化 paint。相同绘制资源不应因用于描边而被定义第二次，纯色也不必强制提升为资源。

dashOffset 表示虚线序列的起始相位，可以是有限负数；它不改变段长序列。SVG 与 Canvas 应得到相同相位，不以 CSS 或 Canvas 属性名作为作者词汇。

## 历史记录

- Kernel v0.1：以数值序列表达虚线（ADR-023）。
- Kernel v0.2：区分颜色、图案资源与外部图片（ADR-019、ADR-022、ADR-026）。
- Kernel v0.4：共用描边与填充资源，明确虚线相位（ADR-014、ADR-032）。
