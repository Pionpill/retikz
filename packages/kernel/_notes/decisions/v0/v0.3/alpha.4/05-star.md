# ADR-05：参数化 star shape

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)

## 背景

Core 缺少星形图元。星形是外径和内径交替的规则闭合多边形，常用于评分、徽标和强调标注；它的尺寸由几何参数决定，不应伪装成文本容器。

## 决策

star 的 params 为 points >= 3、innerRadius > 0、outerRadius > innerRadius 和可选 rotate（默认 0，首个尖角位于 +x）；尺寸不依赖文本内框。

同一 starGeometry(params) 负责计算交替的 2×points 个顶点、随 rotate 变化的精确 AABB、boundaryPoint、anchor 和 emit。position 为 AABB 中心；emit 产生闭合 path；boundaryPoint 为中心向目标射线与星形边的最近交点。anchor 支持 center、tip-N、notch-N、角度和边上比例点。

## 兼容性与实现结果

star 作为 builtin 参数化 shape 落地，继续使用现有 Scene primitive 和连接机制。

## 遗留风险

规则星形的专属文本容器语义和非规则星形未纳入；需要这些能力时必须扩展明确的 shape 契约。
