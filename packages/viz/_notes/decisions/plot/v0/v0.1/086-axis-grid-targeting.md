---
description: '旧 gridPlacement 曾负责多视图中网格的投放'
keywords: 'axis-level、grid、targeting、composition.guidePolicy.grid、Axis.grid、select'
---

# ADR-086: axis-level grid targeting

- 状态：Superseded
- 决策日期：2026-06-29
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-080 coordinate composition registry](./080-coordinate-composition-registry.md)、[ADR-081 facet grid data routing](./081-facet-grid-data-routing.md)、[ADR-083 shared scaffold tracks](./083-shared-scaffold-tracks.md)、[ADR-084 composition guides layout](./084-composition-guides-layout.md)、[ADR-085 scope provenance surface](./085-scope-provenance-surface.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 gridPlacement 曾负责多视图中网格的投放。Axis 是否启用网格与向哪些视图投放仍是两个决定；目标选择和共享策略进入统一组合模型。
