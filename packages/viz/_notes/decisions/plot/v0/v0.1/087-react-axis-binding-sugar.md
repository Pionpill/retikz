---
description: 'React 曾把 axis id 绑定展开为旧 coordinateScope'
keywords: 'React、axis、binding、sugar、for、overlay、scopes、yAxisId'
---

# ADR-087: React axis binding sugar for overlay scopes

- 状态：Superseded
- 决策日期：2026-06-29
- 关联：[plot v0.1 roadmap](./roadmap.md)、[alpha.14 roadmap](./roadmap.md)、[ADR-080 coordinate composition registry](./080-coordinate-composition-registry.md)、[ADR-082 same-panel multi-axis overlay](./082-same-panel-multi-axis.md)、[ADR-085 scope provenance surface](./085-scope-provenance-surface.md)、[ADR-086 axis-level grid targeting](./086-axis-grid-targeting.md)
- 后续决策：[plot v0.1/088](088-composition-api-structure.md)、[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

React 曾把 axis id 绑定展开为旧 coordinateScope。作者层简写仍可存在，但由共享归一化生成 view/arrangement，不把 React 私有字段加入领域 IR。
