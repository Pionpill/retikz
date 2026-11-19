---
description: 'Math 提供零运行时依赖的纯几何计算；坐标、向量、弧与求交不需要理解节点 id、IR 或 Zod'
keywords: 'retikz、math'
---

# ADR-001：@retikz/math 零依赖纯计算几何包

- 状态：Partially Superseded
- 决策日期：2026-06-13
- 关联：[ADR-002 core 几何下沉](./002-core-pure-geometry-sink.md)、[ADR-003 point 公开面](./003-point-polar-surface-fix.md)
- 后续决策：[kernel v0.4/003](003-point-polar-surface-fix.md)

## 保留的决策

Math 提供零运行时依赖的纯几何计算；坐标、向量、弧与求交不需要理解节点 id、IR 或 Zod。Core 消费这些计算，而不公开另一份同义实现。

## 修订边界

最初导出表只是首批 API。点与极坐标的公开归属后来调整，不能据此使用已移除的 equal 等 helper。
