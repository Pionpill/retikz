---
description: '标签附着方式由宿主几何决定，作者不必额外声明“节点标签”或“路径标签”'
keywords: 'Mark、label、surface、follows、core、hosts、Path.label、Node.label'
---

# ADR-079：Mark label surface follows core label hosts

- 状态：Partially Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md)、[kernel ADR-018](../../../../../../kernel/_notes/decisions/v0/v0.4/018-node-label-inside-placement.md)、[kernel ADR-019](../../../../../../kernel/_notes/decisions/v0/v0.4/019-ribbon-label.md)
- 后续决策：[plot v0.2/022](../v0.2/022-label-encoding.md)、[kernel v0.5/081](../../../../../../kernel/_notes/decisions/v0/v0.5/081-shared-text-capabilities.md)

## 保留的决策

标签附着方式由宿主几何决定，作者不必额外声明“节点标签”或“路径标签”。文本排版是共享能力，落点、切向和距离由具体宿主处理。

## 修订边界

固定文字使用 properties.label，字段绑定使用 encodings.label；字符串的含义由所在位置决定，不根据内容猜测。
