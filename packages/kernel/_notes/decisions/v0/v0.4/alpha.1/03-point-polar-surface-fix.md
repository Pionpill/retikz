# ADR-03：将 point.toPolar / equalPolar 迁入 polar

- 状态：Accepted（已实现）
- 决策日期：2026-06-13
- 关联：[ADR-01 math](./01-math-package-and-geometry-api.md) · [ADR-02 core 几何下沉](./02-core-pure-geometry-sink.md)

## 背景

PolarPosition 可能携带节点 id，是 IR 类型，不能进入零 IR 的 math.point。toPolar 和 equalPolar 实际只服务 polar 语义，却挂在 point 上，导致 point 的纯计算公开面与 core IR 耦合。

## 决策

- polar.fromPosition 直接实现 atan2/hypot 计算，替代 point.toPolar
- polar.equal 直接实现 precision 取整比较，替代 point.equalPolar
- 从 core.point 删除 toPolar 和 equalPolar，不保留别名、包装层或 fallback；调用方统一使用 polar 的公开方法

## 兼容性与实现结果

这是 0.x 明确接受的 breaking 公开面修正；向量运算仍由 math/core 的 point 提供，polar 语义集中在 polar。文档和调用方已迁移。

## 遗留风险

依赖旧方法的外部 0.x 消费者必须迁移，不能通过兼容别名隐藏 point 与 math.point 的身份边界。
