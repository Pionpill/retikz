---
description: Relation 在 React 与 Vanilla authoring 中支持用 id 字符串引用端点，同时保持 Source IR 的完整 NodeTarget 契约。
keywords: Relation、endpoint、authoring、InputRelation、NodeTarget、React、Vanilla
---

# ADR-022：Relation endpoint authoring 简写

- 状态：Accepted
- 决策日期：2026-09-21
- 关联：[Relation contract](./008-relation-data-geometry.md) · [Graph package family](./001-graph-package-family.md) · [Graph semantic Source IR](./003-semantic-ir-lightweight-lowering.md)

## 背景与目标

首次编写 Relation 时，最常见的端点只引用已有对象 id。当前 React 与 Vanilla 都要求写成 `{ id: 'client' }`，而同一 authoring 输入中的 `way` 已支持直接写 id 字符串。这增加了最小图式示例的噪声，却没有提供额外语义。

目标是在 React 和 Vanilla authoring 中接受 id 字符串，同时保留完整端点对象的锚点、偏移和连接面能力。持久化 Graph Source 与通用绘图端点契约不因这项便利写法改变。

## 决策

`@retikz/graph-vanilla` 拥有 Relation endpoint 的 typed authoring 简写。`InputRelation.source` 与 `InputRelation.target` 都接受非空 id 字符串或完整 NodeTarget 对象；字符串只表示对象 id。

`normalizeRelation()` 在 Vanilla normalize 边界把字符串确定地组装为 `{ id: string }`。React `Relation` props 复用同一份 Vanilla Input 契约，再进入既有 normalize 链路。两种写法不得产生不同的 Graph Source、provider contribution、resolve、lowering 或诊断路径。

## 基础数据结构与公开契约

```ts
type InputRelationEndpoint = string | IRNodeTarget;

type InputRelation = {
  source: InputRelationEndpoint;
  target: InputRelationEndpoint;
  // 其它既有 Relation authoring 字段
};
```

`IRGraphRelation.source` 与 `IRGraphRelation.target` 继续是完整 `IRNodeTarget`。直接 JSON、`createRelation()` 与 Graph schema 只接受对象端点；字符串仅属于 React / Vanilla 的 TypeScript authoring API，不成为另一种持久化格式。

## 行为、失败语义与兼容性

- `source: 'client'` 与 `source: { id: 'client' }`（`target` 同理）归一为相同 Source IR
- 带 `anchor`、`offset` 或 `boundary` 的端点继续使用对象，原样进入 Source IR
- 空字符串、无效对象、未知 id 与重复 id 分别沿用既有 TypeScript、schema 与 compile 诊断；简写不增加 fallback、自动 id 或 Graph 专属 lookup
- `route`、`way` 与 JSX Step children 的既有互斥规则不变
- 这是向后兼容的 authoring 扩展；已有对象端点写法保持有效
