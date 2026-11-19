---
description: 'React、Vanilla 与 JSON 应能表达同一一维笛卡尔或极坐标，不让 adapter 拥有额外投影语义'
keywords: 'DSL、cartesian1D、polar1D、ternary2D、CoordinateInput、PointMarkProps、coordinate'
---

# ADR-048：三包 DSL + 文档露出（cartesian1D / polar1D / ternary2D 表面 + 端到端验收）

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md)、[plot-design §3.5 CoordinateSystem](../../../../architecture/plot-design.md)、[ADR-045](./045-coordinate-frame-roles.md)、[ADR-046](./046-cartesian1d.md)、[ADR-047](./047-ternary2d.md)、[ADR-025 bindings-dsl](./025-bindings-dsl.md)、[ADR-105](./105-ternary2d-removal.md)
- 后续决策：[plot v0.1/061](061-coordinate-registry.md)、[plot v0.1/105](105-ternary2d-removal.md)

## 保留的决策

React、Vanilla 与 JSON 应能表达同一一维笛卡尔或极坐标，不让 adapter 拥有额外投影语义。

## 修订边界

本篇曾将 ternary2D 一并纳入内置 authoring。该入口已取消；特殊坐标通过 coordinate definition 提供。
