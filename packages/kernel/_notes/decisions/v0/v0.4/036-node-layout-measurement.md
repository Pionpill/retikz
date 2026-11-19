---
description: '曾用 onNodeLayout 向外部观察者发布逐节点的布局摘要，方便检查或消费测量结果'
keywords: 'Node、layout、measurement、surface、NodeLayout、compileToScene、onNodeLayout、content.size'
---

# ADR-036: Node layout measurement surface

- 状态：Superseded
- 决策日期：2026-07-07
- 关联：[compile structure ADR](./035-compile-structure-convention.md)
- 后续决策：[kernel v0.5/077](../v0.5/077-compile-output-contract.md)

## 决策沿革

曾用 onNodeLayout 向外部观察者发布逐节点的布局摘要，方便检查或消费测量结果。这条公共观察路线已撤销，不再承诺节点测量表；绘图、连接和 Composite 子布局所需的内部测量仍然存在。
