# ADR-02：收敛 data 内置 provider 边界

- 状态：Accepted
- 决策日期：2026-07-06
- 完成日期：2026-07-07
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [ADR-01：从 plot 迁出通用数据层](./01-plot-data-migration.md) · [plot beta.1 ADR-02](../../../../plot/v0/v0.1/beta.1/02-plot-transform-registration.md) · [plot-design.md §5.2 Data API](../../../../../architecture/plot-design.md)

## 背景

ADR-01 把 plot 中的数据 schema、字段解析、format、statistics、transform registry 与 apply pipeline 迁入 `@retikz/data`。迁移先保证行为等价，但也把部分只服务 plot 几何或统计图层的内置 provider 一并带入 data。

`@retikz/data` 的长期定位不是“plot 的数据实现包”，而是给 plot / table / geo 等宿主共用的数据层。判断一项内置能力是否应留在 data，不能只看它是否处理 rows，还要看它是否自然属于未来宿主交集。输出字段、默认命名或语义直接服务 mark、scale、coordinate、relation routing、stat geometry 的能力，应由宿主包注册自己的 transform definition。

## 决策

`@retikz/data` 只保留跨宿主数据 provider：数据模型、字段解析、format、statistics 子算子、transform contract / registry / apply pipeline，以及通用 tabular transform。plot 专属 transform schema 与内置 implementation 移出 data，由 `@retikz/plot` 作为宿主注册。

保留在 data 的能力：

| 能力                                                                              | 保留理由                                                                |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ExternalRow` / `ExternalDatasets` / `DataRef` / `DataModel` / `ScalarValue`      | 数据模型与数据引用，是所有 viz 宿主的输入边界。                         |
| 字段路径解析、字段类型推断、`fieldMap`、canonical row normalize、coerce、validate | ingest 与字段读取底座，plot / table / geo 都需要。                      |
| field format registry 与内置 format                                               | 字段解析格式，不依赖图形几何或 plot mark。                              |
| provenance helper 与 `TransformContext.groupProvenance`                           | 数据行来源追踪，可服务 locator、table row drilldown、geo feature 回指。 |
| transform contract、registry resolver、apply pipeline                             | 数据流编排能力；宿主通过 definitions 注入自己的内置项。                 |
| `sort` / `summarize` / `select` / `annotate`                                      | 通用行排序、汇总、代表行选择和统计回填。                                |
| statistics reducer / row selector registry                                        | 通用统计子算子，可被 data transform 与宿主 transform 复用。             |

移出 data、由 plot 自行注册的能力：`stack`、`bin`、`normalize`、`derive-interval`、`relate`、`jitter`、`density`、`smooth`。

data 的默认 transform registry 只注册 data 内置项。data 不负责把 plot-only kind 当成保留字拦截；在 data 视角它们只是未注册的外部 transform，只有显式传入宿主 definition 后才能执行。

## 被否决选项

- **data 内置所有 rows in / rows out transform**：会把 plot 的 stat-geom 词汇变成所有宿主的公共 API。
- **在 data 中保留 plot-only 兼容别名**：会让 beta.1 的边界收敛失效，并污染 data schema 描述。
- **为每个宿主复制 transform pipeline**：会丢失统一 registry、provenance、错误路径和字段收集能力。

## 公开契约与兼容性

data-first 使用方式只依赖通用 transform：

```ts
import { applyTransforms, type IRDataTransform } from '@retikz/data';

const operations: Array<IRDataTransform> = [
  { kind: 'sort', field: 'month', order: 'ascending' },
  { kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] },
];

const rows = applyTransforms(sourceRows, operations);
```

从 `@retikz/data` 默认 registry 直接执行 plot-only transform 会失败。用户应通过 `@retikz/plot` lowering，或显式传入对应宿主 definitions。

## 最终实现

`@retikz/data` 的内置 transform 集合已收窄为 `sort` / `summarize` / `select` / `annotate`。plot-only transform 的 schema、类型、definition 与默认注册由 `@retikz/plot` 拥有，并通过组合 registry 消费 data pipeline。

data 仍保留 reducer / selector registry、transform extension surface、provenance helper 和 apply pipeline，供 plot 与后续宿主复用。

## 验证

验证覆盖 data 默认 registry 的内置边界、未注册 transform 的失败语义、reducer / selector 与 provenance 的组合能力，以及 plot 组合 registry 对 plot-only transform 的消费。

## 遗留风险

`bin` 的长期归属仍需以后续宿主需求判断。若 table / geo 出现共同的“数值分桶 + 通用区间统计”需求，应另开 ADR 设计 data-native bin，不复用 plot 当前默认字段与 histogram 语义。
