---
description: Plot 绘图区支持独立于填充的边框视觉默认值，并按坐标帧形状绘制
keywords: Plot、plotArea、border、Academic、facet、polar
---

# ADR-013：Plot 绘图区边框

- 状态：Accepted
- 决策日期：2026-09-28
- 关联：[ADR-004：Plot background 限定为绘图区背景](./004-plot-area-background.md) · [ADR-011：Plot Source 默认片段与 Axis 规则](./011-theme-source-fragments.md) · [Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Plot 的 `plotArea.fill` 已能填充有效绘图区，但不能表达独立的外边框。已有 Axis 只覆盖作者声明的轴线；用 Axis 或 grid 补齐另外两侧会把绘图区边界误写成坐标语义。Plot 需要可由主题默认值与显式 Source 覆盖的绘图区边框，同时保持 Chart 外围 canvas 和 presentation 的所有权不变。

## 决策：边框属于 Plot area 的视觉默认值

`plotDefaults.plotArea.border` 是可选的线样式对象或 `false`。线样式复用 Plot guide 线条的 paint、宽度与描边不透明度原子；`false` 明确关闭继承的边框。边框不创建 Axis、tick 或 grid，也不改变数据投影和绘图区尺寸。

边框沿有效二维绘图区绘制：直角坐标使用矩形，极坐标使用圆形，facet 的每个面板独立绘制。一维坐标没有二维绘图区，不生成边框。边框位于数据图元之上、Axis 与 Legend 之下，以便完整显示且不遮挡轴标签。它不填充绘图区；`plotArea.fill` 仍独立决定背景。

理由：

1. 边框是绘图区表面的视觉属性，与 Axis 和 grid 的坐标语义不同
2. Plot 已拥有有效绘图区几何，自定义 style 和显式 Source 可以共用同一条主题级联与 lowering 路径
3. Core 图元已能表达矩形、圆形及其描边，无需新增 renderer 语义

## 基础数据结构与公开契约

```ts
type IRPlotAreaDefaults = Readonly<{
  fill?: IRPaintValue;
  border?:
    | false
    | Readonly<{
        stroke?: IRPaintValue;
        strokeWidth?: number;
        drawOpacity?: number;
      }>;
}>;
```

线样式缺省的描边为当前文字色、宽度为 1、不透明度为 1。结构化 Source 和自定义 Plot style 使用同一字段；后来源可覆盖边框的单个字段，`false` 替换整个边框。

## 行为、失败语义与兼容性

- 缺省时没有边框；`false` 禁用继承边框；显式 Source 高于命名 style
- 无效 paint、负宽度与范围外不透明度由既有字段 schema 拒绝；未知字段不被静默忽略
- Academic 参考 style 默认关闭 x/y 及其他维度的网格，并启用与默认 Axis line 同色同宽的边框；显式 Axis grid 配置仍按既有优先级覆盖默认值
- React、Vanilla 与直接 JSON IR 传递同一 Plot Source 字段，无 adapter 专用语义
- 仅新增可选字段，不改变缺省 Plot 的视觉结果
