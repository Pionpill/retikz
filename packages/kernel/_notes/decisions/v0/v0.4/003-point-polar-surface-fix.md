---
description: 将 point.toPolar / equalPolar 迁入 polar；背景：PolarPosition 可能携带节点 id，是 IR 类型，不能进入零 IR 的 math.point
keywords: 'point、toPolar、equalPolar、polar'
---

# ADR-003：将 point.toPolar / equalPolar 迁入 polar

- 状态：Accepted（已实现）
- 决策日期：2026-06-13
- 关联：[ADR-001 math](./001-math-package-and-geometry-api.md) · [ADR-002 core 几何下沉](./002-core-pure-geometry-sink.md)

## 背景

PolarPosition 可能携带节点 id，是 IR 类型，不能进入零 IR 的 math.point。toPolar 和 equalPolar 实际只服务 polar 语义，却挂在 point 上，导致 point 的纯计算公开面与 core IR 耦合。

## 决策

- 纯点与向量运算由 Math 提供，Core 不重复导出
- Core 的 polar 仅保留有实际消费者的 toPosition：将带递归 origin 的极坐标输入转换为笛卡尔位置；节点 id 的解析由编译上下文负责
- 无实际消费者的 fromPosition、equal 与 offsetFrom 删除，不保留别名或包装层

## 边界

PolarPosition 的 IR 语义属于 Core；Math 只消费纯数学数据，不接受节点 id 或编译上下文。
