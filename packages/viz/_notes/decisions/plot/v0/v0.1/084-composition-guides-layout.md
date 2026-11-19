---
description: '旧 composition.layout 与 guidePolicy 同时描述间距、标题与辅助线策略'
keywords: 'composition、guides、axes、grid、spacing、layout、guidePolicy、axisGap'
---

# ADR-084：composition guides, axes, grid, spacing

- 状态：Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-081 facet grid data routing](./081-facet-grid-data-routing.md)、[ADR-082 same-panel multi-axis overlay](./082-same-panel-multi-axis.md)、[ADR-083 shared scaffold tracks](./083-shared-scaffold-tracks.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 composition.layout 与 guidePolicy 同时描述间距、标题与辅助线策略。这些是不同决定，现分别由 spacing、header 和 resolve 表达，不保留旧字段作为别名。
