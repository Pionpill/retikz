# ADR-01：统一 data IR 类型的 owner 命名

- 状态：Accepted
- 决策日期：2026-07-11
- 完成日期：2026-07-11
- 关联：[data v0.1-beta.2 roadmap](./roadmap.md) · [data v0.1 roadmap](../roadmap.md) · [data v0 roadmap](../../roadmap.md) · [plot-design.md §3.1 Data / §3.3 Transform](../../../../../architecture/plot-design.md)

## 背景

`@retikz/data` 的公开 schema 派生类型曾沿用 `FieldDef`、`DataModel`、`DataRef`、`Transform` 等迁移前名称，既未表达 JSON IR 真源，也无法与 core、plot 等 owner 的同概念类型自然区分。仅增加无 owner 的 `IR` 前缀仍会让 data `IRTransform` 与 core `IRTransform` 冲突。

本次只修正 TypeScript 公共命名；JSON schema、字段、判别值、默认语义、registry、provider 与 pipeline 行为均不改变。

## 决策

data 拥有的 schema 派生公开类型统一使用 `IRDataXxx`。旧名直接删除，不保留 deprecated alias。const object 派生的 `XxxValue`、runtime-only 的 `ExternalRow` / `ExternalDatasets` / `DataFieldTypeMap`，以及 contract 层的 `XxxDefinition` / `XxxContext` 保持原名。

公开迁移表：

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

plot 自己拥有的 schema 派生类型使用 `IRPlotXxx`；本 ADR 只迁移 plot 对 data 类型的消费，不重命名 plot 自有类型。

理由：

1. `IR` 明确类型来自 JSON schema，而不是 runtime definition、registry 或外部宿主数据。
2. `Data` owner 前缀避免跨包同名导出和消费方 import alias。
3. `0.x` 阶段直接删除错误旧名，避免兼容 alias 长期扩大公共面。

## 被否决选项

- **只增加无 owner 的 `IR` 前缀**：仍会与 core 及未来 viz 包冲突。
- **只迁移少量入口类型**：会留下同源却不同规则的 reducer、selector 与 annotate 类型。
- **保留 deprecated alias**：会让旧名继续进入自动补全、文档和新代码。
- **同时重命名 plot 全部 IR 类型**：超出 data owner 收口范围。

## 不在本 ADR 范围

- 不重命名 Zod schema、JSON 字段、kind 或运行时导出。
- 不处理 runtime-only 类型的 owner 搬迁。
- 不统一 plot 自有 schema 派生类型。

## 验证

- 每个 `IRDataXxx` 继续直接由对应 Zod schema 推导，core `IRTransform` 与 data `IRDataTransform` 可在同一消费方无 alias 共存。
- data 包根与消费方源码不再导入或重导出旧类型名；Data、Plot、adapter 与 docs 的类型检查在实现收尾时通过。
- RC 收尾复核通过 Data 108 tests、docs changelog 17 tests、Data / docs `tsc --noEmit` 与 release-group 校验。

## 遗留风险与兼容性

这是 TypeScript-only breaking rename；运行时 schema、序列化结果与数据处理行为不变。外部 TypeScript 消费方必须按迁移表改名，且不会获得 legacy alias；完整迁移说明保留在文档站 changelog。除消费方改名外，无待兼容的运行时风险。

## 实现指针

- schema 派生类型：`packages/viz/data/src/schemas/{data,transform}/types.ts`
- 公共类型契约：`packages/viz/data/tests/ir/public-type-naming.test.ts`
- 用户迁移说明：文档站 viz v0.1 changelog
- 完成提交：`b79f94d75`

> 本 ADR 已在 data v0.1 RC 收尾时压缩；完整施工契约保留在该 ADR 的 Proposed 历史版本中。
