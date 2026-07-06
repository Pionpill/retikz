# ADR-02：收敛 data 内置 provider 边界

- 状态：Proposed
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [ADR-01：从 plot 迁出通用数据层](./01-plot-data-migration.md) · [plot beta.1 ADR-02](../../../../plot/v0/v0.1/beta.1/02-plot-transform-registration.md) · [plot-design.md §5.2 Data API](../../../../../architecture/plot-design.md)

## 背景

ADR-01 已经把 plot 中的数据 schema、字段解析、format、statistics、transform registry 与 apply pipeline 迁入 `@retikz/data`。这个迁移先保证行为等价，但它也把部分只服务 plot 几何/统计图层的内置 provider 一并带入 data。

`@retikz/data` 的长期定位不是“plot 的数据实现包”，而是给 plot / table / geo 等宿主共用的数据层。判断一项内置能力是否应留在 data，不能只看“它是否处理 rows”，还要看它是否自然属于未来 table / geo 与 plot 的交集。若能力的输出字段、默认命名或语义直接服务 mark、scale、coordinate、relation routing、stat geometry，则它应该由宿主包注册自己的 transform definition。

本 ADR 修正 ADR-01 中“迁出全部 transform provider 并保持在 data 内置集合”的临时状态。beta.1 继续允许破坏性调整：不保留旧 data 内置项兼容别名，不从 plot 转发 data-only 能力，也不为深导入保留 shim。

## 决策：data 只保留跨宿主数据 provider

`@retikz/data` 保留数据模型、字段解析、format、statistics 子算子、transform contract / registry / apply pipeline，以及跨 plot / table / geo 都可复用的 tabular transform。plot 专属 transform schema 与内置 implementation 移出 data，由 `@retikz/plot` 作为宿主注册。

保留在 data 的能力：

| 能力 | 保留理由 |
| --- | --- |
| `ExternalRow` / `ExternalDatasets` / `DataRef` / `DataModel` / `ScalarValue` | 数据模型与数据引用，是所有 viz 宿主的输入边界。 |
| 字段路径解析、字段类型推断、`fieldMap`、canonical row normalize、coerce、validate | ingest 与字段读取底座，plot / table / geo 都需要。 |
| field format registry 与内置 `iso` / `epochSeconds` / `epochMillis` / `slashDate` / `numberString` / `percent` | 字段解析格式，不依赖图形几何或 plot mark。 |
| provenance helper：`tagSourceIndex`、`readSourceIndex`、`readSourceIndices`、`withGroupProvenance` 与 `TransformContext.groupProvenance` | 数据行来源追踪，可服务 locator、table row drilldown、geo feature 回指。 |
| transform contract：`defineTransform`、`TransformDefinition`、`AnyTransformDefinition`、`TransformContext` | 运行时扩展协议，宿主通过 definitions 注入自己的内置项。 |
| transform pipeline：`applyTransforms`、`collectTransformFields`、`DEFAULT_TRANSFORM_CONTEXT`、`resolveTransformRegistry` | 数据流编排能力；默认 registry 只含 data 内置 transform。 |
| `sort` transform | 通用行排序，table / geo / plot 都自然需要。 |
| `summarize` transform | 通用 groupBy + reducer 汇总，table / geo / plot 都自然需要。 |
| `select` transform | 通用分组代表行选择，table / geo / plot 都可复用。 |
| `annotate` transform | 通用组统计回填，table / geo / plot 都可复用。 |
| statistics reducer registry 与 `count` / `sum` / `mean` / `median` / `min` / `max` / `extent` / `quantile` / `quantile-band` | 通用统计子算子；即使某些输出常被 plot 使用，本身仍是数据统计。 |
| row selector registry 与 `min` / `max` / `first` / `last` / `top` / `bottom` / `nth` / `outside-quantile-band` | 通用行选择子算子，供 `select` / `annotate` 和宿主自定义 transform 复用。 |

移出 data、由 plot 自行注册的能力：

| 能力 | 移出理由 |
| --- | --- |
| `stack` | 产出 baseline 区间，主要服务堆叠柱、堆叠面积、饼/环等 plot geometry。 |
| `bin` | 当前默认字段 `binStart` / `binEnd` / `binCount` 与 histogram / interval mark 前处理绑定。 |
| `normalize` | 当前语义主要服务百分比堆叠与占比图；若未来 table 需要组占比列，再以 data 通用形态重新设计。 |
| `derive-interval` | 产出 start/end 区间字段，服务 interval / range 类 mark。 |
| `relate` | 产出 source / target relation rows，服务 relation mark 与 routing。 |
| `jitter` | 视觉位置抖动，属于 plot layout / mark 消隐策略。 |
| `density` | KDE 采样输出服务 density plot / path mark。 |
| `smooth` | trend / regression 采样输出服务 smooth line / path mark。 |

迁移后 data 的默认 transform registry 只注册 `sort`、`summarize`、`select`、`annotate`。`TransformSchema` 仍允许外部 transform passthrough，但内置保留 kind 集只覆盖 data 内置项；plot-only kind 的闭合 schema、reserved kind 与字段级校验由 plot 自己维护并组合。data 不负责把 `stack` / `bin` 等 plot-only kind 当成保留字拦截；它们在 data 视角只是未注册的外部 transform，只有显式传入宿主 definition 后才能执行。

理由：

1. data 的内置集合必须能被 table / geo 直接消费，而不是把 plot 的 stat-geom 词汇变成所有宿主的公共 API。
2. 保留 transform contract / pipeline 可以避免 plot/table/geo 重复实现 registry 和 provenance；移动 plot-only definitions 不会破坏扩展机制。
3. 将 plot-only schema 与 implementation 同时移走，能避免 data schema `.describe(...)` 中继续出现 `PathMark`、baseline、relation mark 等宿主语义。

## 待决策点

- **`bin` 的长期归属**：beta.1 先移到 plot。若 table / geo 后续出现共同的“数值分桶 + 通用区间统计”需求，应另开 ADR 设计 data-native bin，不复用 plot 默认字段与 histogram 语义。
- **宿主 transform union 形态**：plot 已组合 data transform 与 plot transform；table / geo 是否采用同一组合方式，留到对应宿主 ADR 决定。

## DSL / API 表面

data-first 使用方式只依赖通用 transform：

```ts
import { applyTransforms, type TransformOperation } from '@retikz/data';

const operations: Array<TransformOperation> = [
  { kind: 'sort', field: 'month', order: 'ascending' },
  { kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] },
];

const rows = applyTransforms(sourceRows, operations);
```

plot-only transform 不再默认从 `@retikz/data` 可用；plot 通过自己的 registry 注入这些 definitions。

## 测试设计

`packages/viz/data/tests/` 覆盖：

- data 默认 registry 只包含 data 内置 transform。
- `sort` / `summarize` / `select` / `annotate` 行为保持不变。
- reducer / selector registry 仍可被 data transform 与外部 transform definition 复用。
- `stack` / `bin` / `normalize` / `derive-interval` / `relate` / `jitter` / `density` / `smooth` 不再作为 data 内置 transform 通过默认 registry 执行。

## 影响

- ⚠️ BREAKING：从 `@retikz/data` 直接使用 plot-only transform kind 将失败；用户应通过 `@retikz/plot` lowering 或显式传入对应宿主 definitions。
- `@retikz/data` 仍保留 transform 扩展协议和 pipeline，不提供 `@retikz/data-react`。
- `@retikz/data` 的 runtime dependency 可以在实现阶段复核：若 plot-only transform 移出后 data 不再需要某些统计图层依赖，应删除多余依赖。
- docs 需要说明 data 包的“内置 transform”与 plot 包的“plot transform”不是同一集合。

## 不在本 ADR 范围

- 不改变 data 内置 transform 的 JSON kind 字符串。
- 不设计 table / geo 具体 API。
- 不新增 data-react。
- 不删除 transform extension surface。
- 不调整 plot mark / scale / coordinate 的用户语义。

---

## 实现契约

### Level

`red`

理由：触及 `@retikz/data` 公开 schema / provider / pipeline 边界，并改变 `TransformSchema` 与默认 registry 的内置能力集合。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/data/src/schemas/transform/constants.ts` | 改 | `DataTransform` 成员 | 删除 plot-only kind，保留 `sort` / `summarize` / `select` / `annotate` | - | data 内置 transform kind 只覆盖跨宿主能力 |
| `packages/viz/data/src/schemas/transform/schema.ts` | 改 | `BuiltinTransformSchema` | 删除 plot-only transform schema 分支 | - | data 内置 transform schema 只包含通用数据 transform |
| `packages/viz/data/src/schemas/transform/types.ts` | 改 | plot-only transform type exports | 删除或停止从 data 导出 | - | plot-only operation 类型迁到 plot |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/data/src/schemas/transform/**`
- `packages/viz/data/src/contract/transform.ts`
- `packages/viz/data/src/contract/statistics.ts`
- `packages/viz/data/src/providers/transform/**`
- `packages/viz/data/src/providers/statistics/**`
- `packages/viz/data/src/pipeline/provenance.ts`
- `packages/viz/data/src/pipeline/transform/**`
- `packages/viz/data/src/index.ts`
- `packages/viz/data/src/schemas/index.ts`
- `packages/viz/data/src/providers/index.ts`
- `packages/viz/data/tests/**`
- `packages/viz/data/package.json`
- `pnpm-lock.yaml`
- `packages/viz/_notes/decisions/data/v0/v0.1/beta.1/**`

### 测试象限

**Happy path（≥ 3）**：

- `data_default_registry_applies_sort`：默认 registry 执行 `sort`，排序结果与迁移前一致。
- `data_default_registry_applies_summarize_with_builtin_reducer`：`summarize` + `sum` 输出与迁移前一致。
- `data_default_registry_applies_select_and_annotate`：`select` / `annotate` 复用 row selector 和 reducer registry。

**边界（≥ 2）**：

- `data_empty_rows_keep_transform_contract`：空 rows 经过保留的 data transform 行为不变。
- `custom_transform_can_use_data_context`：外部 transform definition 仍能读取 provenance 和自定义统计 registry。

**错误路径（≥ 2）**：

- `data_default_registry_rejects_stack`：未显式注入 plot definition 时执行 `stack` 抛未注册错误。
- `data_default_registry_rejects_density`：未显式注入 plot definition 时执行 `density` 抛未注册错误。

**交互（≥ 2）**：

- `data_summarize_preserves_group_provenance`：改行数通用 transform 仍保留 sourceIndices。
- `data_custom_transform_composes_after_summarize`：外部 transform 可接在 data 内置 transform 后执行。

### 依赖的现有元素

- `packages/viz/data/src/providers/data/**`：继续作为字段解析与 canonical row 真源。
- `packages/viz/data/src/providers/statistics/**`：继续作为通用 reducer / selector 真源。
- `packages/viz/data/src/pipeline/transform/**`：继续作为 registry 消费与 transform 编排真源。
- `packages/viz/plot/src/pipeline/expand.ts`：后续由 plot ADR 负责注入 plot-only definitions。
