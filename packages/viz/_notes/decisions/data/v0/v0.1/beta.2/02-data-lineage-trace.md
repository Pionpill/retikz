# ADR-02：data 提供可配置的数据链路追踪

- 状态：Accepted
- 决策日期：2026-07-08
- 关联：[data v0.1 roadmap](../roadmap.md) · [data beta.1 ADR-02](../beta.1/02-shared-provider-boundary.md) · [plot beta.2 ADR-01](../../../../plot/v0/v0.1/beta.2/01-plot-mark-lineage-trace.md)

## 背景与目标

`@retikz/data` 已有 Symbol provenance：`tagSourceIndex` 标记原始行，`groupProvenance` 标记聚合来源集合。它能回答输出行来自哪些输入行，却不能解释 transform 管线、reducer 或 selector 如何得到结果。完整记录每步输入输出会放大成本并可能泄露业务数据，因此 data 需要 runtime-only、可配置且默认轻量的链路追踪。

## 核心决策

新增 `DataLineageOptions`、`DataLineageRun`、`DataLineageRecorder` 与 `applyTransformsWithLineage()`。追踪只通过运行时 options 与 `TransformContext.lineage` 传递，不写入 TransformOperation schema、不写回数据行、不进入 JSON IR。

默认与开关契约：

1. `applyTransforms()` 保持现有返回值和默认成本，不创建 recorder
2. `applyTransformsWithLineage(..., { lineage: {} })` 只记录 source identity 与 transform step 摘要
3. `sourceIdentity` 默认使用 summary，最多记录 capped 来源索引前缀；完整来源索引只能显式开启
4. `fieldFlow`、`reducerOperations`、`selectorOperations`、`rowSamples`、`calculationDetails` 独立开关
5. `rowSamples` 与 `calculationDetails` 必须给 `maxRows` 与非空 `fields` 白名单，不默认复制整行
6. `sink` 可流式消费事件；`retainEvents` 控制使用 sink 时是否继续保留完整 events

## 公开契约

```ts
import { applyTransformsWithLineage } from '@retikz/data';

const { rows, lineage } = applyTransformsWithLineage(sourceRows, operations, {
  lineage: {
    fieldFlow: true,
    reducerOperations: true,
    rowSamples: { maxRows: 5, fields: ['region', 'revenue', 'total'] },
  },
});
```

只需要最小链路时：

```ts
const { lineage } = applyTransformsWithLineage(sourceRows, operations, {
  lineage: {},
});
```

## 行为、失败语义与兼容性

内置 transform 继续沿同一 registry / definition 路径执行，statistics reducer / selector provider 通过 `TransformContext.lineage` 写入已开启的操作摘要。未注册 transform 仍按 data 的既有 registry 失败语义处理。追踪是运行时附加能力，不改变原始数据处理结果，也不改变 Zod transform schema。

## 最终实现

data contract 已提供 lineage 类型、recorder 抽象、`createDataLineageRecorder()` 与 `applyTransformsWithLineage()`；plot 可基于 data lineage 拼接图元链路。普通 `applyTransforms()` 继续保持原行为。

## 遗留风险

完整链路仍可能很大。宿主应优先使用 summary、sink 与字段白名单，只为审计面板或用户主动查看的对象保留细粒度事件。
