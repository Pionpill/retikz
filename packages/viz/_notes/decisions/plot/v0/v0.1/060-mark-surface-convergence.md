---
description: 'React 与 Vanilla 应暴露相同的几何图元，图表名保留给上层配方'
keywords: 'mark、format、angle、stack、series'
---

# ADR-060：mark 公开表面收敛

- 状态：Partially Superseded
- 决策日期：2026-06-17
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md)、[ADR-059 mark abstraction](./059-mark-abstraction-registry.md)、[plot v0.1 roadmap](./roadmap.md)、[docs-doc-principle skill](../../../../../../../.agents/skills/docs-doc-principle/SKILL.md)
- 后续决策：[plot v0.2/020](../v0.2/020-mark-encoding-properties.md)、[plot v0.2/021](../v0.2/021-unified-mark-position-inputs.md)、[plot v0.2/023](../v0.2/023-closed-mark-vocabulary.md)、[plot v0.2/028](../v0.2/028-path-ribbon.md)

## 保留的决策

React 与 Vanilla 应暴露相同的几何图元，图表名保留给上层配方。字段编码与固定图形属性必须能清楚区分，不能由同一个字符串猜测含义。

## 修订边界

旧组件映射表中的 ReferenceMark、RelationMark 或自定义 mark 入口不是现行表面；连接和 ribbon 由 Path 组合表达。
