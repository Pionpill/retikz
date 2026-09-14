---
description: Flow 子项固定宽度；背景：流程图中的一个步骤组通常需要用一致的节点外框宽度表达它们属于同一视觉层级
keywords: 'Flow、itemWidth、FlowLayout、layout.width、minimumSize'
---

# ADR-013：Flow 子项固定宽度

- 状态：Accepted
- 决策日期：2026-09-12
- 关联：[所属 roadmap](./roadmap.md) · [Flow 平级 Source、Group 与 Layout](./007-flow-catalog-source-layout-groups.md) · [Flow Grid 二维对齐布局](./010-flow-grid-layout.md) · [Core Node 固定宽度与内容重排](../../../../../../kernel/_notes/decisions/v0/v0.5/038-node-fixed-width.md) · [能力完备性](../../../../architecture/schematic-graph-complete.md)

## 背景与目标

流程图中的一个步骤组通常需要用一致的节点外框宽度表达它们属于同一视觉层级。现有 Flow Layout 按各 Entity 的自然内容尺寸排列，中心对齐的纵向步骤会留下不齐的左右边缘。作者可以逐项填写 Core-compatible `minimumSize`，但它不能把长文本限制在指定宽度内自动折行，也无法让同一 scope 随内容变化保持一致。

Flow 增加局部子项宽度策略，使作者可以使用该 scope 中的自然最大宽度，或提供固定宽度。该策略既要影响自动布局与 relation routing，又要保证最终 Graph/Core 节点按同一个宽度和文本换行规则绘制。

## 决策

宽度策略属于 Diagram Flow 的无外壳 Layout，而不是 Graph Entity、Graph Rule、Theme 或 renderer。它表达“此处的一组自动图示步骤如何共同占据横向空间”，不改变 Entity 的语义、身份、appearance 默认或全局尺寸。

`itemWidth` 只作用于当前 `FlowLayout` 的直接 Entity children。作者可嵌套一个 FlowLayout 建立新的局部 scope；它不穿透 Group、Layout 或后代，也不按 role、kind、group 字段或 selector 跨结构匹配。Group 与 Layout 作为直接 child 时不支持该策略，避免用无外壳容器或包含边界推断子孙节点尺寸。

Flow 在调用 Layout Definition 前确定每个受影响 Entity 的实际测量尺寸。数值宽度投影到 Core Node 的正式 `layout.width` 契约，再由 Core 统一测量与文本重排；`match-largest` 由同一 scope 的自然测量结果确定。Layout Definition、routing、artifact 与 Graph materialization 都消费这次确定的几何，Definition 不接收新的 engine-specific option，也不增加可忽略该语义的 capability。

## 基础数据结构与公开契约

两个 `IRFlowLayout` 变体都增加可选字段：

```ts
type FlowItemWidth = number | 'match-largest';

type IRFlowLayout = Readonly<{
  // existing linear or grid fields
  itemWidth?: FlowItemWidth;
}>;
```

缺省时 direct children 保持各自自然尺寸。`'match-largest'` 取该 Layout 的所有直接 Entity 在应用 Flow / Graph defaults、Theme 和 Entity-local layout 后的自然**可见外框**最大宽度；它不把 margin 计入比较。数值必须为有限正数，表示每个直接 Entity 的可见外框固定宽度（用户单位）；margin 仍是独立的布局碰撞留白。

数值宽度不是 `minimumSize.width` 的别名。Flow 将它作为目标可见外框宽度，投影为 Core `layout.width`，由 Core 的文本、padding、shape 与 scale 统一计算可用内容宽度，保证测量与最终绘制一致。Entity 的显式 `layout.maxTextWidth` 仍是更窄的内容上限；最终文本宽度使用该上限与 Flow 可用内容宽度中较小者。Entity 的高度由折行后的实际内容、padding 与既有最小高度决定，不增加固定高度字段。

Direct JSON、Vanilla Input 与 React `FlowLayout` 对 `itemWidth` 具有逐字段相同的表达。Flow layout artifact 继续只保存已有的 element bounds；策略和由它导出的文本宽度、行数、尺寸不重复写入 artifact 或 Source 的其它位置。

## 行为、失败语义与兼容性

- 数值宽度小于一个 Entity 已确定的最小可见外框、或 Core 无法在该宽度内形成有效内容布局时失败，诊断指向所属 Layout 和受影响 Entity；不得溢出、裁切、静默扩大宽度或退回自然宽度
- 只要内容可由 Core 的文本布局折行，长文本自动增加节点高度，同时保持固定可见外框宽度。不可分割且无法适配的内容沿用同一失败边界
- `'match-largest'` 不主动限制文本宽度；每个 Entity 都使用共同的最大自然外框宽度，短内容通过既有 Node 文本对齐显示在其中
- 所有受影响 Entity 的布局输入、输出 bounds、relation endpoint 与 routing 都使用最终宽高；改变文本、语言、字体、Theme、padding、margin 或 Entity-local layout 会重新测量并得到新的确定结果
- 该策略不提供横向 Flow 自动换行、换行后的新行排序、固定高度、跨 scope 等宽、按 selector 批量约束、Group / Layout 宽度同步、自动避障或响应式 CSS 宽度。横向 child 换行是独立的 placement 能力
- 未配置 `itemWidth` 的现有 Source 保持原有自然尺寸、布局、路由与 artifact 行为。不保留旧 API alias、fallback 或双轨执行
