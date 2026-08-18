# ADR-04：rectangle/polygon 参数化与 diamond preset

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)

## 背景

roundedCorners 是 rectangle 专属字段却位于 Node 顶层；diamond 又是 4-gon 的重复几何。Core 还缺少 regular polygon。

## 决策

- rectangle 的 params 为可选 roundedCorners >= 0；它仍是文本容器，circumscribe 由内容内框和 minimumSize 决定
- polygon 的 params 为 sides >= 3 和可选 rotate；顶点落在能容纳内容的外接圆上，rotate 决定首顶点方向并与 Node.rotate 组合
- diamond 规范化为 polygon 的 sides: 4, rotate: 0 preset；显式 diamond 参数可表达 aspectRatio，缺省或 1 保持正菱形
- polygon、diamond 的连接和 anchor 使用同一 polygon 几何，position 为 AABB 中心
- 迁移期间 rectangle 的 params.roundedCorners 优先于顶层 Node.roundedCorners；未提供 params 时保留顶层值，以兼容既有输入

## 兼容性与实现结果

裸 rectangle、diamond 写法和原有合法 Node 行为保持兼容；polygon 为新增能力，roundedCorners 的归位和 diamond preset 已实现。

## 遗留风险

顶层 roundedCorners 仍是兼容字段，未来若删除必须另行给出明确的 breaking 迁移决定；非正多边形不属于本契约。
