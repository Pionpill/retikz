# ADR-01：从 plot 迁出通用数据层

- 状态：Accepted
- 决策日期：2026-07-06
- 完成日期：2026-07-07
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [plot beta.1 适配 ADR](../../../../plot/v0/v0.1/beta.1/01-data-package-adapter.md) · [plot-design.md §3.1 Data / §3.3 Transform](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot` 在 alpha 阶段同时承担 GoG 图形语义和通用数据处理：data schema、transform schema、字段解析、format、statistics、transform registry 与 apply pipeline 都位于 plot 包内。随着 chart / table / geo 等后续宿主出现，这些能力继续留在 plot 会迫使新宿主依赖 plot 语义，或者复制一套字段解析和 transform registry。

数据模型、字段解析、transform 和 statistics 不依赖 mark、scale、coordinate、guide 或 renderer。它们适合作为 viz 组通用底座，供 plot / chart / table 等宿主共同消费。`@retikz/data` 的边界必须保持纯数据处理：不提供 React 组件，不携带宿主可视化语义，不反向依赖 plot。

## 决策

新增 `@retikz/data` 作为 viz 组数据层真源，承载通用数据 schema、data / transform / statistics / format contract、内置 data provider、transform pipeline 与 provenance helper。plot 不再拥有通用数据实现文件，只消费 `@retikz/data` 提供的数据能力。

迁移后的 owner 边界：

| Owner                                         | 职责                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@retikz/data`                                | 数据模型、字段路径、fieldMap、coerce / format、statistics reducer / row selector、transform contract / registry / pipeline、行 provenance。 |
| `@retikz/plot`                                | GoG 语义、scale / coordinate / mark / guide / locator / theme / composition、plot lowering，以及 channel / label / mark-local 组合逻辑。    |
| `@retikz/plot-react` / `@retikz/plot-vanilla` | adapter authoring surface；需要数据类型时直接依赖 `@retikz/data`。                                                                          |

`@retikz/data` 不提供 `<Transform>` 组件，也不创建 `@retikz/data-react`。React / Vanilla 宿主继续在自己的 adapter 中决定如何收集数据 transform 声明。

## 被否决选项

- **继续把数据层留在 plot**：会让 chart / table / geo 依赖 plot，破坏 viz 分层。
- **在 plot 顶层长期转发 data API**：会让消费方继续把 data API 误认为 plot API，延迟 owner 边界收敛。
- **建立 data-react**：纯数据层没有 React authoring 语义，提前绑定 React 会扩大无关公共面。

## 公开契约与兼容性

`@retikz/data` 从 `0.1.0-beta.1` 起成为公开包，数据 API 从它的顶层入口导入：

```ts
import {
  applyTransforms,
  defineTransform,
  type DataModel,
  type ExternalDatasets,
  type TransformOperation,
} from '@retikz/data';
```

`@retikz/plot` 不为被迁走的数据 API 提供兼容 re-export。依赖 `@retikz/plot/src/providers/data/*`、`@retikz/plot/src/schemas/transform/*` 等深导入的用户需要迁移到 `@retikz/data` 顶层入口或 plot 对应 owner 入口。

## 最终实现

`@retikz/data` 已建立 `shared`、`schemas`、`contract`、`providers`、`pipeline` 和顶层 barrel。原 plot 中的数据 schema、字段解析、format、statistics、通用 transform registry / apply pipeline 与 provenance helper 已迁入 data。plot / plot-react / plot-vanilla 已改为直接依赖 `@retikz/data`，plot 侧只保留 channel、label、locator、mark-local 等 GoG 组合逻辑。

通用 data 包先迁出完整数据处理层，再由 [ADR-02](./02-shared-provider-boundary.md) 收窄 data 默认内置 provider 边界；plot-only transform 的归属由 [plot ADR-02](../../../../plot/v0/v0.1/beta.1/02-plot-transform-registration.md) 记录。

## 验证

- data schema、field resolver、format、statistics、transform pipeline 与 provenance 行为已迁移到 `packages/viz/data/tests/` 覆盖。
- plot lowering、scale domain、locator、adapter 类型来源和 public barrel 边界已在 plot / adapter 测试中覆盖。
- beta.1 roadmap 记录完成提交：`a732efd7` / `55ac99f4` / `39470d2b` / `22ceb713`。

## 遗留风险

table / geo 等后续宿主是否直接复用 `TransformOperation`，还是组合自己的宿主 transform union，留到对应宿主 ADR 决定。`bin` 等部分能力若未来出现跨宿主共同语义，应另开 data-native ADR，而不是复用 plot 当前字段与 histogram 语义。

## 实现指针

本 ADR 已随 viz `0.1.0-beta.1` 收尾压缩；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在历史中。

> 🔖 压缩前完整施工蓝图 = `git show 3c76d64d1402545454f1ae301d8588313abb7d5d:packages/viz/_notes/decisions/data/v0/v0.1/beta.1/01-plot-data-migration.md`。
