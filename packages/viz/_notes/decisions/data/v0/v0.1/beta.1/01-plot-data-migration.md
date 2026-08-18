# ADR-01：从 plot 迁出通用数据层

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [plot beta.1 适配 ADR](../../../../plot/v0/v0.1/beta.1/01-data-package-adapter.md)

## 背景与目标

`@retikz/plot` 在 alpha 阶段同时承担 GoG 图形语义和通用数据处理。数据 schema、字段解析、format、statistics、transform registry 与 apply pipeline 不依赖 mark、scale、coordinate、guide 或 renderer；继续由 plot 持有会迫使 chart、table、geo 等宿主依赖 plot 语义，或复制数据能力。

## 核心决策

新增 `@retikz/data` 作为 viz 组通用数据层真源，承载数据 schema、data / transform / statistics / format contract、内置 data provider、transform pipeline 与 provenance。plot 不再拥有通用数据实现，只消费 data 的公开能力。

| Owner                                         | 职责                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@retikz/data`                                | 数据模型、字段路径、fieldMap、coerce / format、statistics reducer / row selector、transform contract / registry / pipeline、行 provenance |
| `@retikz/plot`                                | GoG 语义、scale / coordinate / mark / guide / locator / theme / composition、plot lowering，以及 channel / label / mark-local 组合逻辑    |
| `@retikz/plot-react` / `@retikz/plot-vanilla` | adapter authoring surface；需要数据类型时直接依赖 `@retikz/data`                                                                          |

data 不提供 `<Transform>` 组件，也不创建 `data-react`；React / Vanilla 宿主在自己的 adapter 中收集数据 transform 声明。

## 基础数据结构与公开契约

`@retikz/data` 从 `0.1.0-beta.1` 起成为公开包，数据 API 从顶层入口导入：

```ts
import {
  applyTransforms,
  defineTransform,
  type ExternalDatasets,
  type IRDataModel,
  type IRDataTransform,
} from '@retikz/data';
```

plot 不为迁出的数据 API 提供兼容 re-export；依赖旧 plot 私有数据实现的消费方必须迁移到 data 顶层入口或对应 owner 入口。

## 行为、失败语义与兼容性

data 负责通用数据处理及其 registry / provenance 语义，plot 负责将这些结果组合进 GoG pipeline；任何宿主不得复制 data 的字段解析、transform registry 或行追溯机制。数据层不因消费方是 plot、table 或 geo 而携带宿主可视化语义，也不反向依赖 plot。

这是公开 owner 的 breaking boundary：旧的 plot 数据入口不再继续工作，运行时数据处理语义由 data 统一承载。

## 最终实现

`@retikz/data` 已成为数据 schema、字段解析、format、statistics、通用 transform registry、apply pipeline 与 provenance 的公开 owner；plot、plot-react、plot-vanilla 直接消费它，plot 侧只保留 GoG 组合逻辑。data 的默认 provider 边界由 [ADR-02](./02-shared-provider-boundary.md) 进一步收窄，plot-only transform 仍由 plot 注册。

## 遗留风险

table / geo 等后续宿主是否直接复用 `TransformOperation`，还是组合自己的宿主 transform union，由各宿主另行决定。`bin` 等能力若形成跨宿主共同语义，应另开 data-native ADR，不复用 plot 的字段或 histogram 语义。
