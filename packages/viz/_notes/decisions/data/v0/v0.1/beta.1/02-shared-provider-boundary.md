# ADR-02：收敛 data 内置 provider 边界

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [ADR-01：从 plot 迁出通用数据层](./01-plot-data-migration.md) · [plot beta.1 ADR-02](../../../../plot/v0/v0.1/beta.1/02-plot-transform-registration.md)

## 背景与目标

ADR-01 将 plot 的数据 schema、字段解析、format、statistics、transform registry 与 apply pipeline 迁入 `@retikz/data`。迁移后的 data 仍必须是 plot、table、geo 等宿主共用的数据层，而不是 plot 的数据实现包。输出字段、默认命名或语义直接服务 mark、scale、coordinate、relation routing 或 stat geometry 的能力，应由宿主注册自己的 transform definition。

## 核心决策

`@retikz/data` 只保留跨宿主数据 provider：数据模型、字段解析、format、statistics 子算子、transform contract / registry / apply pipeline，以及通用 tabular transform。plot 专属 transform schema 与内置实现由 `@retikz/plot` 作为宿主注册。

保留在 data 的能力：

| 能力                                                                              | 语义                                                |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `ExternalRow` / `ExternalDatasets` / `DataRef` / `DataModel` / `ScalarValue`      | 所有 viz 宿主的数据模型与引用边界                   |
| 字段路径解析、字段类型推断、`fieldMap`、canonical row normalize、coerce、validate | ingest 与字段读取底座                               |
| field format registry 与内置 format                                               | 与图形几何无关的字段格式                            |
| provenance helper 与 `TransformContext.groupProvenance`                           | 为 locator、表格行回溯和 geo feature 回指提供行来源 |
| transform contract、registry resolver、apply pipeline                             | 宿主注入 definition 的数据流编排                    |
| `sort` / `summarize` / `select` / `annotate`                                      | 通用排序、汇总、代表行选择和统计回填                |
| statistics reducer / row selector registry                                        | 可被 data 与宿主 transform 复用的统计子算子         |

`stack`、`bin`、`normalize`、`derive-interval`、`relate`、`jitter`、`density`、`smooth` 由 plot 注册。data 默认 registry 只注册 data 内置项；在 data 视角，plot-only kind 是未注册的外部 transform，只有显式传入宿主 definition 后才能执行。

## 公开契约与失败语义

```ts
import { applyTransforms, type IRDataTransform } from '@retikz/data';

const operations: Array<IRDataTransform> = [
  { kind: 'sort', field: 'month', order: 'ascending' },
  { kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] },
];

const rows = applyTransforms(sourceRows, operations);
```

从 data 默认 registry 直接执行 plot-only transform 必须失败；用户应通过 plot lowering，或显式传入对应宿主 definitions。data 不拦截这些 kind 为全局保留字，也不为它们提供兼容别名。

## 功能与包边界

data 拥有通用 registry、provenance、reducer / selector 与 apply pipeline；plot 拥有 plot-only definition 并通过组合 registry 消费 data pipeline。宿主不得复制 pipeline、字段收集、错误路径或 provenance。

## 最终实现

`@retikz/data` 的默认 transform 集合已收窄为 `sort`、`summarize`、`select`、`annotate`；plot-only transform 的 schema、类型、definition 与默认注册由 `@retikz/plot` 拥有。data 仍保留 reducer / selector registry、transform extension surface、provenance helper 和 apply pipeline，供 plot 与后续宿主复用。

## 遗留风险

`bin` 的长期归属仍取决于宿主需求。若 table / geo 形成共同的“数值分桶 + 通用区间统计”需求，应另开 data-native ADR，不复用 plot 当前默认字段与 histogram 语义。
