---
description: '带状路径的起点与终点可以各自使用圆弧闭合两侧边界'
keywords: 'Ribbon、arc、cap、Path.ribbon.start.cap、Path.ribbon.end.cap'
---

# ADR-017：Ribbon arc cap

- 状态：Partially Superseded
- 决策日期：2026-06-25
- 关联：[ADR-021](./021-path-kind-registry.md)
- 后续决策：[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

带状路径的起点与终点可以各自使用圆弧闭合两侧边界。圆心、半径和扫向必须可序列化，编译时验证能否连接；不能生成有限有效几何时应报告错误，而非让后端猜测。

起点与终点的 cap 可分别配置；圆弧封口连接的是同一端的两条边，而非沿中心线添加一个装饰箭头。

## 修订边界

端盖属于 Path 的 ribbon 几何，不是独立 Ribbon 节点或绘制后处理。
