---
description: Node 固定宽度与内容重排；背景：Core Node 目前可以以 minimumSize 扩大可见外框，并以 maxTextWidth 约束文本折行；两者不能表达“外框必须恰好为指定宽度”
keywords: 'Node、width、maxTextWidth、minimumSize、IRNodeLayout'
---

# ADR-038：Node 固定宽度与内容重排

- 状态：Accepted
- 决策日期：2026-09-12
- 关联：[alpha.4 roadmap](./roadmap.md) · [Child Layout Proposal、Probe 与 Alignment Guide 合同](./017-layout-proposal-probe-contract.md) · [Drawing Complete](../../../architecture/core-drawing-complete.md)

## 背景与目标

Core Node 目前可以以 `minimumSize` 扩大可见外框，并以 `maxTextWidth` 约束文本折行；两者不能表达“外框必须恰好为指定宽度”。上层自动布局若只在一次 probe 中要求 exact slot，后续从 Source 重新编译 Node 时也不能保留该尺寸意图。

需要一个 JSON-safe、renderer-neutral 的 Node 事实源：作者或上层领域可以声明固定可见外框宽度，Core 统一确定文本可用宽度、折行后的高度、shape 边界与 Scene。它必须让上层不再反推不同 shape 的内边距、文本宽度或视觉 bounds。

## 决策

Node layout 增加可选 `width`，表示未应用 Node scale 前的精确可见外框宽度。它属于 Core Node 的通用尺寸事实，与具体 Flow、Graph、Theme、renderer 或宿主无关。

Core 在 Node resolve / layout 中统一消费该字段。Node 先以同一 shape、padding、字体、文本与 injected measurer 确定可用内容宽度；可折行正文在该约束下重排，最终外框严格采用指定宽度，纵向尺寸继续由内容、padding、shape 与已有最小高度决定。Node scale 仍按既有规则作用于最终几何，不把 `width` 解释为屏幕 CSS 像素或 renderer transform。

Core 已有 Layout Proposal 的 exact slot 仍是父 Composite 的临时测量条件；新的 Source 字段是可持久化、可重编译的作者/领域意图。两者共同使用同一 Node 内容与 shape layout 路径，不建立第二套测量器或 renderer 后处理。

## 基础数据结构与公开契约

`IRNodeLayout` 增加：

```ts
type IRNodeLayout = Readonly<{
  // existing fields
  width?: number;
}>;
```

`width` 必须为有限正数。它指定 Node 边界在未缩放局部坐标中的精确宽度，不包含 Node `margin`；margin 继续由父 Layout 的 allocation 与碰撞留白语义单独处理。

`minimumSize.width` 继续是下限。两者同时存在时，`width` 必须不小于有效最小宽度；`minimumSize.height` 不受影响。`maxTextWidth` 继续是显式内容宽度上限；当它与固定宽度导出的可用内容宽度同时存在时，取更严格值。固定宽度不隐式设置 `maxTextWidth`，也不改变 Node 的文字对齐、shape、padding、margin、rotate、label 或 Theme 选择。

所有直接 Core IR、Vanilla Input 与 React Node authoring 都使用相同的 `layout.width` 字段。Graph、Diagram 等上层只通过已公开的 Core-compatible Node layout 字段投影它；不增加领域尺寸类型、provider option 或 Scene primitive 字段。

## 行为、失败语义与兼容性

- 缺省时 Node 保持现有自然尺寸与 `minimumSize` 行为
- 可折行的 plain-text 正文在固定宽度下自动换行，并以换行后的高度确定可见外框；短文本保留现有文字对齐和空白
- 固定宽度小于有效最小宽度、shape/padding 的不可约束边界，或不可分割内容无法在可用内容宽度内布局时，Core 以 Node Source path 报错；不得静默扩大、裁切、缩放内容或退回自然宽度
- mixed inline 或 TeX 文本沿既有原子内容规则处理：若可用内容宽度不足，则按同一固定宽度失败语义处理，不建立 run-level 分词或 renderer 特判
- `width` 不提供固定高度、aspect ratio、百分比、CSS 响应式尺寸、父子尺寸绑定、自动 fit 或全局碰撞处理
- 这是 v0.x 的新增公开字段；无旧字段别名或兼容路径，已有未配置 Source 的 Scene 与 renderer 结果不变
