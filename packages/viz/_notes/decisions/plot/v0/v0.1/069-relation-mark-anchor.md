---
description: '数据 key 标识实例，mark 身份标识它由哪组图元生成；仅有数据 key 不足以唯一定位连接对象'
keywords: 'RelationMark、anchor、contract、LinkMark、link、AnchorId'
---

# ADR-069：RelationMark + anchor id contract

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 后续决策：[plot v0.2/026](../v0.2/026-mark-target-endpoints.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)、[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)

## 保留的决策

数据 key 标识实例，mark 身份标识它由哪组图元生成；仅有数据 key 不足以唯一定位连接对象。锚点几何归 Core，Plot 建立从数据实例到图元身份的关联。

## 修订边界

独立 RelationMark 和它的连接入口已移除。Path 的 from/to 可引用目标 mark 与 key，步骤构造与 ribbon 几何另有契约。
