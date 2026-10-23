---
description: 补齐通用描边、图元效果与文本行样式的输入到输出能力
keywords: 'stroke、lineCap、lineJoin、pin、arrow、font、segments、effects'
---

# ADR-066：通用视觉样式完整消费

- 状态：Accepted
- 决策日期：2026-10-23
- 关联：[图元效果边界](../v0.4/030-group-scope-effect-boundary.md)、[描边相位](../v0.4/032-stroke-dash-offset.md)

## 决策

Core 的通用描边包含 paint、width、dashPattern、dashOffset、lineCap、lineJoin。Node、Path、Scope 外框与 pin 使用一致的描边含义；Scene 的矩形、椭圆、路径和 marker 保留适用字段，SVG / Canvas 等价执行。线帽同样作用于闭合形状的虚线段。共享后代默认允许 shadow / blendMode，逐图元应用；不引入 Scope 整体离屏合成，外框仍独立。

Pin 支持结构化 paint 与独立标量 opacity。未指定 opacity 沿用原宿主规则，显式值用于该引线。Arrow 保留 color 作为上下文主色，支持独立 stroke / fill paint、虚线和 cap/join；显式字段覆盖 provider 产物中的对应默认字段，未指定字段保留 provider 语义。共用与逐端覆盖继续逐字段合并；空心箭头仍无填充。

TextLine 与 SegmentedLine 共享 fill、opacity、font 行级默认。文字片段逐字段覆盖行级字体，行级字体继承块级字体；相对字号逐层解析。MathSegment 支持 fontSize，未指定时继承行级有效字号，仅字号传入 TeX lowerer，不把 CSS 字体族伪装成 TeX 字体能力。行与片段透明度按既有逐级默认覆盖，最终乘宿主透明度。

未知字段在本轮扩展的闭合输入中拒绝，不静默丢弃。原子 schema 是唯一校验真源，provider 及 adapter 不增加平行 IR。

## 外部语义依据

采用 SVG stroke-linecap / stroke-linejoin、stroke-dasharray / stroke-dashoffset 及 Canvas lineCap / lineJoin / setLineDash / lineDashOffset 的共同语义。文本默认按 CSS 的继承与局部覆盖思想分层确定，但仅开放 Retikz 和 TeX 实际消费的属性。资源继续使用现有 Scene paint 引用，不向 renderer 传递 Source paint。
