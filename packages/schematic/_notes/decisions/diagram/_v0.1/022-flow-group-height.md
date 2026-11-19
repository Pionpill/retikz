---
description: Flow 横向布局按直接子分组的最大自然高度统一外壳，保持内部节点自然尺寸
keywords: Flow、containerHeight、Group、等高、布局约束
---

# ADR-022：Flow 分组等高

- 状态：Accepted
- 决策日期：2026-10-15
- 关联：[roadmap](./roadmap.md) · [分组](./014-flow-group-graph-surface.md) · [容器等宽](./020-flow-container-width.md)

## 背景与目标

并排展示不同长度的流程时，分组内容决定的自然高度不同。作者需要统一外框上下边界，并让短流程通过增加节点间隙填满可用高度，保留节点自然尺寸和最小间距。

## 决策与公开契约

FlowLayout 的 linear 变体增加 `containerHeight?: 'match-largest'`。该策略仅用于 direction 为 left/right 的横向布局，其直接子项必须全部是 FlowGroup。省略时保持自然高度，不自动继承到后代。参与的父布局不得设置非空 excludeFromBounds。

共同高度是直接子分组完成内部布局后的最大自然外壳高度，包含 caption、padding、内部布局与关系标签的占位。外部连线和标签不参与自然高度比较。分组以单个纵向 linear Layout 组织内容时，可用内容高度扣除自然排列高度后的正剩余均分到相邻子项间隙。既有 gap、margin 和标签预留作为最小占位，节点尺寸不变。单子项的透明 linear 容器向内传递剩余高度；单节点不扩张、不移动。多内容根、Grid、横向多子项或带非空 excludeFromBounds 的内容布局保留自然排列，仅统一外框。标题位于底部时，标题仍位于扩展后的内容区下方。

方向 left/right 只改变水平排列顺序。单组时共同高度就是自身自然高度。嵌套的等高布局先完成内层分配，再参与外层自然高度计算。已有宽度策略先确定尺寸，宽度引起的文本重排计入自然高度。

此能力不提供 Entity 固定高度、节点等高或节点高度拉伸，也不将高度策略作用于无外壳 Layout。Direct IR、Vanilla 和 React 共享相同契约。

## 所有权与结果一致性

分组间的高度约束由 Diagram Flow 拥有。外壳扩展复用 Graph 的内容占位与分组物化能力，底层不新增固定节点高度或几何缩放。Flow Layout Definition 的 Group 输入增加可选 `allocatedHeight: number`，保存本次已确定的物理高度；叶节点继续只使用原有 size，输出继续使用 bounds。

共享编排在调用布局 Definition 前确定高度，并把分配后的有效 gap 写入同一 Layout 输入；内置与自定义 Definition 必须保持该高度、原有叶节点尺寸、有效间距和父布局排列。Graph 绘制、分组连接端点、路由及 artifact 消费同一最终几何。不能只修改外框或 artifact，也不允许 provider 忽略高度分配。

## 失败语义

非法方向、混入 Entity 或 Layout、排除参与分组等错误在布局回调前拒绝，诊断指向配置所在 Layout 的 containerHeight 字段及相关 identity。输出分组高度偏离分配值时，以现有浮点容差检查并报告 layout-output-invalid。内部内容仍须满足既有包含关系校验，不通过裁切、缩字或压缩最小间距修复约束。

未声明新字段的输入行为不变。本决策补充分组高度同步，不改变现有 itemWidth、containerWidth 或 Core Node 尺寸契约。
