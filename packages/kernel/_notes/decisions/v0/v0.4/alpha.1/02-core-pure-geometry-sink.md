# ADR-02：Core 纯几何按函数粒度下沉到 @retikz/math

- 状态：Accepted（已实现）
- 决策日期：2026-06-13
- 关联：[ADR-01 math](./01-math-package-and-geometry-api.md) · [ADR-03 point 公开面](./03-point-polar-surface-fix.md)

## 背景

Core 的 geometry 公开面被多个 adapter 使用，但形状模块同时包含纯射线数学和 TikZ anchor/IR 语义。整文件搬迁会把业务类型带入 math，因此下沉必须按函数粒度完成。

## 决策

- 依赖方向为 core → math，math 不依赖 core
- point 的向量运算、transform 全部、edge.lerpPoint 和 arc 全部迁入 math；contour 改用 math intersect，但 filletContour、contourCommands 和业务类型留在 core
- circle、ellipse、rect、diamond 的 contains/boundaryPoint/anchor/edgePoint 留在 core；polar 和 anchor 的 IR/TikZ 语义留在 core
- core 继续 re-export Position、point、lerpPoint、localToWorld、worldToLocal 等原有公开符号；react、render、vanilla 和 plot 继续从 core 取得这些能力
- arc 作为非公开 core 模块移除后，消费者改用 math；math 的 null 结果语义替代原先 undefined 时，调用方按 null 处理

## 兼容性与实现结果

Core geometry 的公开导入面逐字保持，底层纯实现已下沉并完成消费方接线；这是稳定的 re-export，不是旧语法兼容桥。既有形状、编译和连接行为应保持不变。

## 遗留风险

形状的 contains/boundaryPoint 下沉、curve、matrix 和 bend 仍未定义；若拆分必须继续隔离 anchor/IR 语义，不能整体搬迁业务模块。
