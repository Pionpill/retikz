---
description: Flow 根级 Graph 规则投影；背景：Flow 已将 Entity 与 Relation 的 role、kind、status 投影为 Graph record，并复用 Graph definition registry 校验
keywords: 'Flow、Graph、graphRules、IRGraphRule、role、status'
---

# ADR-009：Flow 根级 Graph 规则投影

- 状态：Accepted
- 决策日期：2026-09-09
- 主责：Diagram，目标版本 0.1.0-alpha.1
- 关联：[v0.1 roadmap](./roadmap.md) · [Flow Source](./007-flow-catalog-source-layout-groups.md) · [Flow Defaults](./008-theme-source-fragments.md) · [Graph Theme 片段](../../../graph/v0/v0.1/017-theme-source-fragments.md)

## 背景与目标

Flow 已将 Entity 与 Relation 的 `role`、`kind`、`status` 投影为 Graph record，并复用 Graph definition registry 校验。但是 Flow Source 没有 Graph author rules 上下文，`kind` 只能表达和校验语义，不能在一个 Flow 内选择 Graph 已有的条件外观规则。Docs 因而无法在保持自动布局和自动 routing 的同时，用稳定 kind 表达逻辑图的颜色与线型。

本决策让 Flow 在不拥有 Graph 语义、selector 或 Theme 的前提下，携带一个 Graph 规则上下文，并将其投影至 Flow 下沉的 Graph Entity 与 Relation。

## 决策

`FlowDiagram` 根增加可选 `graphRules`。它是当前 Flow 的有序 Graph author rules，只作用于该 Flow 下沉的 Entity 与 Relation。

Flow 继续复用 Graph 的 `IRGraphRule`、selector、kind / role / predicate registry、规则校验和 author-layer 投影。Diagram 不建立 `flowRules`、Flow 专属 selector、颜色 token、kind definition 或平行规则 resolver。`graphRules` 不改变 Flow catalog、containment、rank、layout、routing、endpoint 或 artifact 契约。

Flow Group 不在本决策中获得局部 `graphRules`。根级上下文已满足当前按 kind 统一表达整张自动布局流程图的需求；后续只有出现独立的局部规则消费者时，才单独决定 Group scope。

## 基础数据结构与公开契约

`IRFlowDiagram` 的根级 Source 增加：

```json
{
  "graphRules": [
    {
      "type": "entity",
      "selector": { "kind": "docs.logic.importantData" },
      "style": { "color": "darkorange" }
    }
  ]
}
```

字段复用 Graph 的有序 `IRGraphRule` schema，保持 JSON-safe。Direct IR、`@retikz/diagram-vanilla/flow` 与 `@retikz/diagram-react/flow` 表达同一字段；Vanilla 只组装 Source，React 只调度 Vanilla 输入。

有效规则优先级为：Graph Theme baseline / named-style rules、Flow 根 `graphRules`、有效 `flowDefaults`、单项 Flow Entity / Relation 显式字段。规则只能覆盖 Graph 已允许的 Entity / Relation rule 字段；规则匹配不改变被匹配 record 的 role、kind、status、结构、关系端点、布局或自动路由。

## 行为、失败语义与兼容性

Flow resolve 在现有 Graph record 投影链中应用根级 rules。相同 kind 的 Entity / Relation 因而得到同一规则外观；Flow 显式字段仍覆盖规则结果，Graph Theme 仍提供较低优先级的基线。测量与最终 Graph materialization 必须消费同一投影结果。

规则对象的 JSON 形态、未知字段和非法规则字段由 Flow Source schema 在 `graphRules` 路径拒绝。引用未注册 role、kind 或 predicate 的 selector，或违反 Graph rule 合法性的规则，由既有 Graph registry / resolver 诊断；不降级为原始颜色或忽略该规则。

这是可选的新增 Source 字段。不提供旧名、Flow rule 别名、Graph root 包装输入或 adapter / renderer fallback；省略字段保持现有 Flow 的解析、布局、routing 与外观行为。
