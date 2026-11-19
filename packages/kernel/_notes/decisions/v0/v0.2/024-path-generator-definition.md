---
description: '曾为参数化曲线增加 generator 步骤、Definition 与 registry，以 JSON 参数描述生成过程'
keywords: 'PathGeneratorDefinition、JSON、params、definePathGenerator、JsonObjectSchema、targetParams'
---

# ADR-024：PathGeneratorDefinition 注册面（外部曲线生成器 + JSON params + definePathGenerator）

- 状态：Superseded
- 决策日期：2026-05-24
- 关联：[ADR-007 Shape Registry](./007-shape-registry.md)、[ADR-023](./023-arrow-definition.md)、[ADR-025](./025-curve-transform-marking.md)
- 后续决策：[kernel v0.4/021](../v0.4/021-path-kind-registry.md)、[kernel v0.4/033](../v0.4/033-builtin-path-generator-ribbon-profile.md)

## 决策沿革

曾为参数化曲线增加 generator 步骤、Definition 与 registry，以 JSON 参数描述生成过程。这套独立通路已移除：作者侧函数可展开为既有步骤，整条路径需要独立几何时使用 Path kind。旧 definePathGenerator 及内置生成器不再可用。
