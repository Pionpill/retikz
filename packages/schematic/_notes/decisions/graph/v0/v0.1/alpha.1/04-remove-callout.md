# ADR-04：撤回缺少用例验证的 Callout 公共契约

- 状态：Accepted
- 决策日期：2026-08-10
- 修订日期：2026-08-28
- 关联：[Graph package family](./01-graph-package-family.md) · [Graph semantic Source IR](./03-semantic-ir-lightweight-lowering.md)

## 背景与目标

Callout 曾同时尝试表达目标附属说明、任意内容容器、可选 leader、previous-only placement 与布局 artifact，但没有真实用例证明这些字段属于同一个稳定 Graph 语义。保留或轻量改写都会用预设方案限制未来 annotation、label 或 relationship 设计

本决策完整撤回 Callout 公共能力。未来若出现稳定标注场景，必须重新确认语义 identity、owner、lower target、routing 与持久化边界，不继承本次删除的字段形态

## 决策

Graph 当前稳定 discriminator 只包含：

```ts
type GraphTypeValue = 'graph' | 'group' | 'entity' | 'relation';
```

Callout 不再拥有 Source IR、schema、factory、Definition、provider、artifact、React / Vanilla authoring、schema registry、Docs route 或 demo。Graph 不把它降级为 Core Node、Node label、Path 或 Group，也不保留 target、placement、leader、content、appearance 或 artifact 的字段子集

Core Node relative position、Node labels、Path target 与 Graph Relation / Group 可以独立组合，但不会自动形成名为 Callout 的 Graph 语义。未来 annotation 能力是否属于 Graph、Core Sugar、普通 recipe 或其它 owner，由新的真实需求和 ADR 决定

## 行为、失败语义与兼容性

- 从 Graph 三包导入 Callout 标识符在 TypeScript / ESM 导出层失败
- `namespace: 'graph'`、`type: 'callout'` 不是 Graph schema 或内置 composite 支持的输入
- 未由用户自行定义其它 namespace / Definition 的 callout 输入沿 Core 未注册 composite 路径 fail-loud
- Direct IR、React、Vanilla、Docs 与 schema registry 均不保留私有入口
- 这是 `0.x` removal，不提供 deprecated export、alias、migration、Node fallback 或双轨解析

## 结果

Graph 当前只维护 Graph、Group、Entity 与 Relation 四类已经形成 Source、authoring、resolve、lowering和文档闭环的能力。通用 annotation、leader routing、自动避障与附属内容管理不属于本版本 Graph owner
