---
description: '派生关联行、选择端点与决定路径路由是不同层次'
keywords: 'RelationMark、derived、data、and、routing、strategy、RelationMark.source、target'
---

# ADR-070：RelationMark derived data and routing strategy

- 状态：Partially Superseded
- 决策日期：2026-06-26
- 后续决策：[plot v0.2/026](../v0.2/026-mark-target-endpoints.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)、[data v0.2/001](../../../data/v0/v0.2/001-shared-transforms.md)

## 保留的决策

派生关联行、选择端点与决定路径路由是不同层次。关联行应保留数据来源，不能把屏幕坐标写回数据来代替寻址。

## 修订边界

不再通过独立 RelationMark 组织这三步：Data 计算关系，Path 构造连接或流带，需要端点图形时另组合 Point。
