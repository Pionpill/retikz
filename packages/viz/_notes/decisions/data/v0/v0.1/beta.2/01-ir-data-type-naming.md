# ADR-01：统一 data IR 类型的 owner 命名

- 状态：Proposed
- 决策日期：2026-07-11
- 关联：[data v0.1-beta.2 roadmap](./roadmap.md) · [data v0.1 roadmap](../roadmap.md) · [data v0 roadmap](../../roadmap.md) · [plot-design.md §3.1 Data / §3.3 Transform](../../../../../architecture/plot-design.md)

## 背景

`@retikz/data` 的 JSON schema 已是数据 IR 的单一真源，但其公开 TypeScript 类型仍沿用 `FieldDef`、`DataModel`、`DataRef`、`ReducerOperation`、`Transform` 等迁移前名称。这些名称没有表达“由 IR schema 推导”的契约，也无法从名称判断 owner。

viz 与 kernel 经常被同一消费方同时使用。`@retikz/core` 已公开 `IRTransform`；如果 data 也导出同名 `IRTransform`，常见组合代码必须使用 import alias。plot 还拥有独立的高层 transform IR，因此单纯给所有包使用不带 owner 的 `IRXxx` 会继续制造冲突。

本次只修正 TypeScript 公共命名。JSON schema、字段、判别值、默认语义、registry、provider 与 pipeline 行为均不改变。

## 决策：schema 派生类型使用 `IR<Owner><Concept>`

data 拥有的 schema 派生公开类型统一使用 `IRDataXxx`；旧名直接删除，不保留 deprecated alias。const object 派生的 `XxxValue`、runtime-only 的 `ExternalRow` / `ExternalDatasets` / `DataFieldTypeMap`，以及 contract 层的 `XxxDefinition` / `XxxContext` 不属于 IR schema 派生类型，保持原名。

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

plot 自己拥有的 schema 派生类型以后使用 `IRPlotXxx`。本 ADR 只在 plot 作为 data 消费方时迁移 `IRDataXxx` import，不重命名 plot 自有类型。

理由：

1. `IR` 明确类型来自 JSON schema，而不是 runtime definition、registry 或外部宿主数据。
2. `Data` / `Plot` owner 前缀避免与 `@retikz/core` 及未来 viz 包产生同名导出，不要求消费方使用 import alias。
3. `0.x` 阶段直接删除错误旧名，避免 deprecated alias 长期扩大公共面并掩盖 owner 边界。

## 被否决选项

- **只给类型增加无 owner 的 `IR` 前缀**：`IRTransform` 会与 core 现有类型冲突，未来 plot 类型也无法自然命名。
- **只迁移 `FieldDef` / `DataModel` / `DataRef` / `Transform`**：会留下同样由 schema 推导、却没有 `IRData` 前缀的 reducer、selector 与 annotate 类型，规则仍不闭合。
- **保留 deprecated alias**：data `0.1.0-beta.2` 仍处于允许修正公开 API 的 `0.x` 阶段；alias 会让旧名继续进入自动补全、文档和新代码。
- **同时重命名 plot 全部 IR 类型**：超出 data review 范围，并会与正在进行的 plot 模块 review 混在同一改动集。

## API 表面

迁移后从 owner 包直接导入：

```ts
import type { IRTransform } from '@retikz/core';
import type { IRDataModel, IRDataTransform } from '@retikz/data';
import type { PlotSpec } from '@retikz/plot';

const model: IRDataModel = [{ name: 'value', type: 'quantitative' }];
const transforms: Array<IRDataTransform> = [{ kind: 'sort', field: 'value' }];
```

`FieldDef`、`DataModel`、`DataRef`、`Transform` 等旧名不再从 `@retikz/data` 导出。迁移方式是按上表替换 type import 和类型标注；运行时代码及 JSON 数据无需改动。

## 测试设计

- 类型真源：每个 `IRDataXxx` 继续直接使用 `z.infer<typeof XxxSchema>`，不引入手写平行类型。
- 删除面：包内与消费方源码不再出现旧类型 import，且不通过 alias 重新导出。
- 组合面：同一文件可同时导入 core `IRTransform` 与 data `IRDataTransform`，无需本地重命名。
- 回归面：data、plot、plot-react、plot-vanilla 与 docs 的类型检查和现有运行时测试保持通过。

## 影响

- ⚠️ **BREAKING**：所有引用旧 TypeScript 类型名的消费代码必须按迁移表改名。
- JSON schema、序列化结果、transform operation、运行时错误与数据处理结果不变。
- data 内部、plot 消费方和 adapter 类型标注需同步迁移。
- 双语 data / plot API 文档、demo 和 changelog 需要同步新名称与迁移表。
- package version、发布与 tag 不在本 ADR 中执行，由后续 wrapup / publish 流程处理。

## 不在本 ADR 范围

- 不重命名任何 Zod schema、JSON 字段、kind 或运行时导出。
- 不处理 runtime-only 类型的 owner 搬迁；`ExternalRow` / `ExternalDatasets` / `DataFieldTypeMap` 的分层问题另行处理。
- 不统一 plot 自有 schema 派生类型；后续按 `IRPlotXxx` 规则单独设计和迁移。
- 不拆分 transform schema 文件，不补与命名无关的测试覆盖。

---

## 实现契约

### Level

`red`：删除并替换 `@retikz/data` 公开类型名，属于 public API breaking change，并触及多个消费包与 docs。

### Schema 改动

无运行时 schema 改动。仅修改 `packages/viz/data/src/schemas/{data,transform}/types.ts` 中由现有 schema 推导的 TypeScript 导出名；所有 `z.infer` 真源保持不变。

### 文件 scope

本 ADR 实现允许触碰：

- `packages/viz/data/src/**` 与 `packages/viz/data/tests/**`：定义新类型名并迁移内部消费。
- `packages/viz/plot/src/**` 与 `packages/viz/plot/tests/**`：只迁移从 `@retikz/data` 消费的类型名，保留当前工作区已有 plot 改动。
- `packages/viz/plot-react/src/**` 与 `packages/viz/plot-react/tests/**`：迁移 data 类型 import 与 props 标注。
- `packages/viz/plot-vanilla/src/**` 与 `packages/viz/plot-vanilla/tests/**`：仅在类型检查坐实存在旧名消费时修改。
- `apps/docs/src/modules/docs/contents/viz/data/**`、`apps/docs/src/modules/docs/contents/viz/components/plot/**`、`apps/docs/src/modules/docs/data/changelog/viz-0-1.ts`：同步双语正文、demo、API 表与迁移说明。
- `packages/viz/_notes/decisions/data/v0/**`：本 ADR 与 roadmap 状态；不改写既有 Accepted ADR 的历史正文。

偏离以上范围需要回到本 ADR 补充原因并重新确认。

### 测试象限

**Happy path**：

- `IRDataFieldDefinition` / `IRDataModel` / `IRDataReference` 与对应 schema 推导类型一致。
- reducer、selector、annotate 与 transform 新类型可表达现有合法 operation。
- data、plot 与 adapter 使用新名称后完整类型检查通过。

**边界**：

- `IRDataScalarValue` 继续覆盖 string / number / boolean / null，不扩大到 runtime-only 值。
- const object 派生 `XxxValue` 和 runtime-only `ExternalXxx` 保持原名，迁移脚本不误改。

**错误路径**：

- 包根不再导出旧类型名，源码扫描不允许 deprecated alias 或 named re-export 回流。
- data 的 `IRDataTransform` 与 core 的 `IRTransform` 可同时导入且无命名冲突。

**交互**：

- plot 继续组合 data transform contract 与 plot 自有 transform IR，运行时 registry 行为不变。
- plot-react 的 `Plot` / builder props、docs demo 与 API 表使用同一组 `IRDataXxx` 名称。

### 依赖的现有元素

- `FieldDefinitionSchema` / `DataModelSchema` / `DataReferenceSchema` / `ScalarValueSchema`：data model 类型真源，仅修改派生类型名。
- data transform schemas：reducer、selector、annotate 与 transform 类型真源，仅修改派生类型名。
- `@retikz/data` 顶层 barrel：通过既有 `export *` 自动暴露新名并移除旧名，不新增精选 re-export。
- `@retikz/core` 的 `IRTransform`：验证 owner 前缀消除跨包命名冲突。
