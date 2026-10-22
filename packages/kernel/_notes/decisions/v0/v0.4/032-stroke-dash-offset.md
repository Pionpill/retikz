---
description: Stroke dash offset；背景：Core 已以 dashPattern 表达通用虚线
keywords: 'Stroke、dash、offset、dashPattern、lineDashOffset、dashOffset、dashed'
---

# ADR-032: Stroke dash offset

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[path dash pattern naming](../v0.1/023-path-dash-pattern-naming.md)

## 背景

Core 已以 `dashPattern` 表达通用虚线。Plot axis、grid、reference line 等还需要控制虚线相位；renderer 内部的 `lineDashOffset` / `stroke-dashoffset` 不能成为上层稳定契约

## 决策

通用描边能力新增 `dashOffset?: number`：

```ts
type StrokeDashStyle = {
  dashPattern?: Array<number>;
  dashOffset?: number;
};
```

`dashOffset` 是与现有 path user units 相同的有限 number，允许正数、0 和负数。无 `dashPattern` 时可以保留但没有可见效果。SVG 映射为 `stroke-dashoffset`；Canvas 在每个 primitive / marker-local save/restore 范围内设置 `lineDashOffset`。动画可临时覆盖静态值，settled base render 回到 `dashOffset`

## 行为、失败语义与兼容性

Schema 拦截 NaN / Infinity，保留负相位以对齐 SVG / Canvas 原生语义。`dashPattern`、`dashed` / `dotted` 的既有优先级与数组语义不变；不新增 renderer 命名、CSS shorthand 或 plot-only 字段

这是 Core 通用字段，Node border、shape outline、marker、label pin 与 Plot guide 可共用；renderer 只执行 Scene 中已解析的描边值

## 共享样式与作用域

`GraphicStyleSchema` 与 `CascadingGraphicStyleSchema` 组合完整的通用描边契约：`stroke`、`strokeWidth`、`dashPattern`、`dashOffset`。`Scope.defaults.style` 对 Node / Path 共用这些字段，按祖先默认、本层共享默认、本层通道默认、实例显式值的顺序逐字段覆盖；虚线数组整体替换，相位 0 是显式覆盖。省略字段继续继承，恢复内置实线通过对应默认通道的 reset 屏障完成，不改变非空虚线数组约束。

Scope 外框独立消费同一通用描边契约，显式虚线与相位进入 Scene；外框只共享有效颜色上下文，不继承后代默认通道的描边样式。Renderer 继续执行已有 Scene 描边字段，不新增平行语义。

## 遗留边界

Plot guide 的默认值与 theme mapping 仍由 Plot owner 消费；pathDraw 动画 offset 不是独立动画属性
