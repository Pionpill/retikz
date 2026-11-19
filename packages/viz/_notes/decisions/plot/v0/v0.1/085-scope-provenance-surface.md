---
description: '旧 locator 与 provenance 通过 coordinateScope 和 facet/scaffold/track 定位来源'
keywords: 'locator、provenance、and、adapters、surface、coordinateScope、facet、track'
---

# ADR-085：locator, provenance, and adapters surface

- 状态：Superseded
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-080 coordinate composition registry](./080-coordinate-composition-registry.md)、[ADR-081 facet grid data routing](./081-facet-grid-data-routing.md)、[ADR-082 same-panel multi-axis overlay](./082-same-panel-multi-axis.md)、[ADR-083 shared scaffold tracks](./083-shared-scaffold-tracks.md)、[ADR-084 composition guides layout](./084-composition-guides-layout.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)

## 决策沿革

旧 locator 与 provenance 通过 coordinateScope 和 facet/scaffold/track 定位来源。局部身份仍有意义，现以 view 与 arrangement 解释，不能用旧 scope 字段查现行模型。
