# ADR-01：@retikz/math 零依赖纯计算几何包

- 状态：Accepted（已实现）
- 决策日期：2026-06-13
- 关联：[ADR-02 core 几何下沉](./02-core-pure-geometry-sink.md) · [ADR-03 point 公开面](./03-point-polar-surface-fix.md)

## 背景

Core 中已有私有的求交和弧几何，但纯数学、IR 类型和 TikZ 语义混在同一层。需要一个可独立复用的计算底座，同时不把业务语义带入 math。

## 决策

新建 @retikz/math：ESM、零运行时依赖、零 IR/Zod、不使用 class；所有 API 为纯函数、普通对象和 Position 数组。Position 与 DEFAULT_EPSILON（1e-9）在 math 中成为真源，core 通过 re-export 保持原公开面。

首切公开命名空间与能力：

- point：Position、向量加减缩放、dot/cross、length、normalize、shiftToward、equal、lerp
- transform：CenteredShape、localToWorld、worldToLocal
- arc：arcEndPoint、arcAngleInRange、rayArc、ellipseArcPoint、arcBoundingPoints、ellipseArcBoundingPoints
- intersect：lineLine、lineCircle、circleCircle、segmentSegment；rayArc 留在 arc 并返回沿射线的距离数组
- triangle：Circle、incircle、circumcircle
- polygon：不限定凹凸和绕向的 ray-casting containsPoint
- hull：CCW Andrew monotone chain，去重并剔除共线中间点；少于三个点返回排序去重后的点

返回和退化语义：

- lineLine 平行/共线为 null；lineCircle/circleCircle 返回 0/1/2 个交点，重合、内含、相离为空；切线仍返回两个重合点
- segmentSegment 首切只返回真交点，平行、共线（含重叠）和不相交为 null
- triangle 三点共线时返回 null；containsPoint 的边界结果首切未定义
- 所有数值比较使用朴素 epsilon，复杂退化谓词另行升级

math 只接受可迁移的纯数学能力；curve、matrix 和业务 shape 语义不属于本包的默认范围。

## 兼容性与实现结果

@retikz/math 已加入 Kernel lockstep，核心几何 API 已落地；它是新增底座，既有 core 使用方式通过 re-export 保持兼容。

## 遗留风险

共线重叠的细分判别、稳健谓词、Bezier 求交和更复杂曲线算法仍需独立契约。
