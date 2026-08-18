# ADR-01：统一 data IR 类型的 owner 命名

- 状态：Accepted
- 决策日期：2026-07-11
- 关联：[data v0.1-beta.2 roadmap](./roadmap.md) · [data v0.1 roadmap](../roadmap.md)

## 背景与目标

`@retikz/data` 的公开 schema 派生类型曾沿用 `FieldDef`、`DataModel`、`DataRef`、`Transform` 等迁移前名称，既未表达 JSON IR 真源，也无法与 core、plot 的同概念类型自然区分。只增加无 owner 的 `IR` 前缀仍会使 data 与 core 的 `IRTransform` 冲突。

本 ADR 只修正 TypeScript 公共命名；JSON schema、字段、判别值、默认语义、registry、provider 与 pipeline 行为不变。

## 核心决策与公开契约

data 拥有的 schema 派生公开类型统一使用 `IRDataXxx`，旧名直接删除，不保留 deprecated alias。const object 派生的 `XxxValue`、runtime-only 的 `ExternalRow` / `ExternalDatasets` / `DataFieldTypeMap`，以及 contract 层的 `XxxDefinition` / `XxxContext` 保持原名。plot 自有 schema 派生类型使用 `IRPlotXxx`，不由本 ADR 重命名。

| 旧名                                   | 新名                                         |
| -------------------------------------- | -------------------------------------------- |
| `FieldDef`                             | `IRDataFieldDefinition`                      |
| `DataModel`                            | `IRDataModel`                                |
| `DataRef`                              | `IRDataReference`                            |
| `ScalarValue`                          | `IRDataScalarValue`                          |
| `SortTransform`                        | `IRDataSortTransform`                        |
| `ReducerOperation`                     | `IRDataReducerOperation`                     |
| `ReducerMetrics`                       | `IRDataReducerMetrics`                       |
| `QuantileBandReducerOperation`         | `IRDataQuantileBandReducerOperation`         |
| `SelectorOperation`                    | `IRDataSelectorOperation`                    |
| `OutsideQuantileBandSelectorOperation` | `IRDataOutsideQuantileBandSelectorOperation` |
| `OrderBy`                              | `IRDataOrderBy`                              |
| `SummarizeTransform`                   | `IRDataSummarizeTransform`                   |
| `SelectTransform`                      | `IRDataSelectTransform`                      |
| `AnnotateSelector`                     | `IRDataAnnotateSelector`                     |
| `AnnotateTransform`                    | `IRDataAnnotateTransform`                    |
| `BuiltinTransform`                     | `IRDataBuiltinTransform`                     |
| `Transform`                            | `IRDataTransform`                            |

`IR` 表示类型来自 JSON schema，而 `Data` 前缀表示 owner，避免跨包同名导出与消费方 import alias。

## 行为、兼容性与失败语义

这是 TypeScript-only breaking rename：外部 TypeScript 消费方必须按迁移表改名，不获得 legacy alias。运行时 schema、序列化结果、registry、provider 与数据处理行为不变；不存在运行时双读或兼容路径。

## 最终实现

data 包及其消费方已使用 `IRDataXxx`；plot 的 data 类型消费可以与 core 的 `IRTransform` 在同一消费方共存。类型仍直接由对应 Zod schema 推导，旧类型名不再由 data 包根或消费方导入、导出。

## 遗留风险

该变更的剩余影响仅是外部 TypeScript 源码需要完成命名迁移；运行时与持久化数据不需要迁移。
