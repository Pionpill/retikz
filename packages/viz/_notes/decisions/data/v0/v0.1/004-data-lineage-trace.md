---
description: data 提供可配置的数据链路追踪；背景：@retikz/data 已有 Symbol provenance：tagSourceIndex 标记原始行，groupProvenance 标记聚合来源集合
keywords: 'data、TransformContext.lineage、rowSamples、calculationDetails、tagSourceIndex'
---

# ADR-004：data 提供可配置的数据链路追踪

- 状态：Accepted
- 决策日期：2026-07-08
- 关联：[data v0.1 roadmap](./roadmap.md) · [data ADR-002](./002-shared-provider-boundary.md) · [plot ADR-103](../../../plot/v0/v0.1/103-plot-mark-lineage-trace.md)

> 同步入口的返回形状、来源建立与事件启用方式由 [Data v0.2 ADR-002](../v0.2/002-transform-execution.md) 统一；本决策的事件记录范围、采样与消费规则继续适用。

## 背景与目标

`@retikz/data` 已有 Symbol provenance：`tagSourceIndex` 标记原始行，`groupProvenance` 标记聚合来源集合。它能回答输出行来自哪些输入行，却不能解释 transform 管线、reducer 或 selector 如何得到结果。完整记录每步输入输出会放大成本并可能泄露业务数据，因此 data 需要 runtime-only、可配置且默认轻量的链路追踪。

## 核心决策

Data 提供 `DataLineageOptions`、`DataLineageRun` 和 `DataLineageRecorder`。追踪通过统一同步入口的运行时 `lineage` 选项与计算上下文传递，不写入 TransformOperation schema、不写回业务字段、不进入 JSON IR。

默认与开关契约：

1. `applyTransforms()` 返回对象，默认不创建 recorder
2. `applyTransforms(..., { lineage: true })` 只记录 source identity 与 transform step 摘要；来源摘要读取已有标记，`provenance` 选项独立控制来源建立
3. `sourceIdentity` 默认使用 summary，最多记录 capped 来源索引前缀；完整来源索引只能显式开启
4. `fieldFlow`、`reducerOperations`、`selectorOperations`、`rowSamples`、`calculationDetails` 独立开关
5. `rowSamples` 与 `calculationDetails` 必须给 `maxRows` 与非空 `fields` 白名单，不默认复制整行
6. `sink` 可流式消费事件；`retainEvents` 控制使用 sink 时是否继续保留完整 events

## 公开契约

```ts
import { applyTransforms } from '@retikz/data';

const { rows, lineage } = applyTransforms(sourceRows, operations, {
  provenance: true,
  lineage: {
    fieldFlow: true,
    reducerOperations: true,
    rowSamples: { maxRows: 5, fields: ['region', 'revenue', 'total'] },
  },
});
```

只需要最小链路时：

```ts
const { lineage } = applyTransforms(sourceRows, operations, { provenance: true, lineage: true });
```

## 行为、失败语义与兼容性

内置 transform 继续沿同一 registry / definition 路径执行，statistics reducer / selector provider 通过 `TransformContext.lineage` 写入已开启的操作摘要。未注册 transform 仍按 data 的既有 registry 失败语义处理。追踪是运行时附加能力，不改变原始数据处理结果，也不改变 Zod transform schema。

## 数据与宿主消费

Data 提供 lineage 类型、recorder 抽象和 `createDataLineageRecorder()`；统一同步入口通过选项启用记录，并返回数据与可选的 lineage。Plot 可基于 Data lineage 拼接图元链路。

## 遗留风险

完整链路仍可能很大。宿主应优先使用 summary、sink 与字段白名单，只为审计面板或用户主动查看的对象保留细粒度事件。
