# ADR-02：data 提供可配置的数据链路追踪

- 状态：Accepted
- 决策日期：2026-07-08
- 完成日期：2026-07-08
- 关联：[data v0.1 roadmap](../roadmap.md) · [data beta.1 ADR-02](../beta.1/02-shared-provider-boundary.md) · [plot beta.2 ADR-01](../../../../plot/v0/v0.1/beta.2/01-plot-mark-lineage-trace.md) · [plot-design.md §5.2 Data API](../../../../../architecture/plot-design.md)

## 背景

`@retikz/data` 已有 Symbol provenance：`tagSourceIndex` 标记原始行，`groupProvenance` 标记聚合来源集合。它足够回答“输出行来自哪些输入行”，但不能解释数据在 transform 管线中经历了什么，也不能说明 reducer / selector 为什么得到某个结果。

BI 场景下，AI 生成图表需要向用户解释数据准确性与来源。完整记录每步输入输出会放大成本并可能泄露业务数据，因此 data 层需要提供 runtime-only、可配置、默认轻量的链路追踪能力。

## 决策

新增 `DataLineageOptions`、`DataLineageRun`、`DataLineageRecorder` 与 `applyTransformsWithLineage()`。链路追踪只通过运行时 options 与 `TransformContext.lineage` 传递，不写入 TransformOperation schema，不写回数据行，也不进入 JSON IR。

默认规则：

1. `applyTransforms()` 保持现有返回值和默认成本，不创建 recorder。
2. `applyTransformsWithLineage(..., { lineage: {} })` 只记录 source identity 与 transform step 摘要。
3. `sourceIdentity` 默认是 summary，最多记录 capped 来源索引前缀；完整来源索引只能显式开启。
4. `fieldFlow`、`reducerOperations`、`selectorOperations`、`rowSamples`、`calculationDetails` 独立开关。
5. `rowSamples` 与 `calculationDetails` 必须给 `maxRows` 与非空 `fields` 白名单，不允许默认复制整行。
6. `sink` 可流式消费事件；`retainEvents` 控制使用 sink 时返回值是否继续保留完整 events。

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

## 被否决选项

- **把链路写进 TransformOperation schema**：会污染 JSON IR，并让运行时审计数据变成声明式输入。
- **默认记录完整 row / reducer 输入值**：成本和隐私风险不可控。
- **只给 plot 做私有 trace**：table / geo / 后续宿主仍会重复数据链路逻辑。

## 最终实现

data contract 新增 lineage 类型与 recorder 抽象；pipeline 新增 `createDataLineageRecorder()` 和 `applyTransformsWithLineage()`。内置 transform 继续复用同一 registry / definition 执行路径，statistics reducer / selector provider 通过 `TransformContext.lineage` 记录可选操作摘要。

实现不改变 Zod transform schema，也不改变 `applyTransforms()` 行为。plot 侧通过 data lineage 拼接图元链路。

## 验证

验证覆盖默认摘要、可选细节、采样上限与字段白名单、sink 保留策略，以及未注册 transform 的失败语义；链路能力保持 runtime-only，不改变原始数据处理结果。

## 遗留风险

完整链路可能仍然很大。宿主应优先使用 summary / sink / 字段白名单，并只为审计面板或用户主动查看的对象保留细粒度事件。
