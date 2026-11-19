---
description: 'React 与 Vanilla 曾各自增加极坐标图元糖与默认绑定'
keywords: 'polar、authoring、closed、color、angle、buildPlotIR'
---

# ADR-025：三包 polar authoring 表面 + 文档露出 + 端到端验收

- 状态：Superseded
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md)、[ADR-021](./021-coordinate-polar.md)、[ADR-022](./022-sector-geometry.md)、[ADR-023](./023-continuous-mark.md)、[ADR-024](./024-polar-guide.md)、[plot-design.md §5 Preset/Primitive API / §6 包结构](../../../../architecture/plot-design.md)
- 后续决策：[plot v0.1/104](104-plot-vanilla-plain-api.md)

## 决策沿革

React 与 Vanilla 曾各自增加极坐标图元糖与默认绑定。极坐标仍是公共能力；生成领域 IR 的归一化共享，不保留旧 sector 或旧角色 props 作为并行入口。
