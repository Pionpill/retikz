# ADR-04：以 Sector 作为弧形与扇形 Node shape 的统一定义

- 状态：Accepted（2026-08-15，Sector 统一定义与公开面收敛完成）
- 决策日期：2026-08-14
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard library design](../../../../../architecture/standard-library-design.md)

## 背景与目标

Standard Node shape 同时维护 `arc` 与 `sector` 两套几何定义。两者都表达同一组圆极坐标与角度范围，差别只在于 Sector 是否有径向厚度。两套 definition 会重复维护 AABB、anchor、边界投影和 Path 输出，也让调用方必须在同一概念上选择两个注册名。

本决策将 Standard Node shape 收敛为单一 `sector` definition：`innerRadius === outerRadius` 时输出没有闭合边的开放弧，`innerRadius < outerRadius` 时输出现有扇形或环楔。`innerRadius === 0` 仍然表示实心扇形。

## 决策

- 删除 Standard Node 的 `ArcShapeDefinition`、`ArcShapeProvider`、`ArcShapeParams` 与 `StandardShapeName.Arc`
- 保留 Kernel React 的 `<Arc>` Sugar；它是 Path authoring API，不属于 Standard Node shape
- `SectorShapeParamsSchema` 接受 `outerRadius >= innerRadius`
- 零厚度 Sector 使用单个 `move + arc` Path，不生成 `close`，并强制透明填充
- 零厚度 Sector 的自动边界使用开放弧的角度投影并夹到起点 / 终点
- 零厚度 Sector 保留 Sector 的 `center`、`apex`、`centroid`、`outer-arc-mid` 等 anchor 命名；不增加 Arc 的 `start`、`end`、`arc-mid` 别名
- `cornerRadius` 仅作用于正厚度 Sector
- 将仅被 Sector 使用的几何 helper 合并到 `sector.ts`，删除 `sector-geometry.ts`
- 不保留旧名导出、兼容 alias、migration 或 fallback 路径

## 不在本次范围

- 不删除或重命名 Kernel React 的 `<Arc>` 及其 Sugar 文档、测试和实现
- 不改变 Core Path、Arc step、连接面或 renderer 语义
- 不改变 `innerRadius === 0` 的实心扇形语义

## 结果

调用方只需注册 `SectorShapeDefinition`。Node 需要开放弧时使用相同的 `sector` shape，并将 `innerRadius` 与 `outerRadius` 设为同一个正数；Path Sugar 继续使用 `<Arc>` 表达独立的路径绘制需求。
