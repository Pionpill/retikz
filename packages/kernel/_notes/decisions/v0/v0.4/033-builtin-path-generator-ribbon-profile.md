---
description: '两项 provider 应分开看：bulge 宽度 profile 用非负有限的 base、peak 表示两端与中点宽度，peak 小于 base 时中段收窄'
keywords: 'Builtin、path、generator、and、ribbon、width、profile、parabola'
---

# ADR-033: Builtin path generator and ribbon width profile

- 状态：Partially Superseded
- 决策日期：2026-07-04
- 关联：[ADR-032](./032-stroke-dash-offset.md)、[ADR-023](./023-provider-key-contract.md)、[ADR-021](./021-path-kind-registry.md)
- 后续决策：[kernel v0.2/024](../v0.2/024-path-generator-definition.md)、[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

两项 provider 应分开看：bulge 宽度 profile 用非负有限的 base、peak 表示两端与中点宽度，peak 小于 base 时中段收窄。它仍属于 ribbon 几何。

## 修订边界

旧 parabola path generator 随生成器入口撤销；移除该入口不等于移除宽度 profile。参数化绘图可在作者侧展开为路径步骤。
