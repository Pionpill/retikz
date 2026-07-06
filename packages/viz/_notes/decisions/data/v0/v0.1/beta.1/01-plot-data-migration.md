# ADR-01：从 plot 迁出通用数据层

- 状态：Proposed
- 决策日期：2026-07-06
- 关联：[data v0.1-beta.1 roadmap](./roadmap.md) · [plot beta.1 适配 ADR](../../../../plot/v0/v0.1/beta.1/01-data-package-adapter.md) · [plot-design.md §3.1 Data / §3.3 Transform](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot` 目前同时承担 GoG 图形语义和通用数据处理：`schemas/data`、`schemas/transform`、`contract/data`、`contract/transform`、`contract/statistics`、`contract/format`、`providers/data`、`providers/transform`、`providers/statistics`、`providers/format` 都位于 plot 包内。随着 chart / table 等后续宿主出现，这些能力如果继续留在 plot，会让新包要么依赖 plot，要么复制字段解析和 transform registry。

数据模型、字段解析、transform 和 statistics 本身不依赖 mark、scale、coordinate、guide 或 renderer。它们适合作为 viz 组通用底座，供 plot / chart / table 共同消费。`@retikz/data` 的边界必须保持纯数据处理：不提供 React 组件，不携带宿主可视化语义，不反向依赖 plot。

本 ADR 只定义迁移步骤和 `@retikz/data` 的包内边界。plot 如何保持旧 public surface、如何接入 lowering，由同一 beta.1 的 plot ADR 处理。

## 决策：`@retikz/data` 成为数据层真源

在 `packages/viz/data` 建立与现有 plot 分层一致的包结构：

```text
src/
  shared/
  schemas/
    data/
    transform/
  contract/
    data/
    transform/
    statistics/
    format/
  providers/
    data/
    transform/
    statistics/
    format/
  pipeline/
    transform/
  index.ts
```

迁移顺序固定为：

1. 先迁 `schemas/data` 与 `schemas/transform`，保持 `DataModel`、`ExternalRow`、`ExternalDatasets`、`TransformOperation` 等导出名不变。
2. 再迁 `contract/data`、`contract/transform`、`contract/statistics`、`contract/format`，保持 `defineTransform`、`defineStatisticsReducer`、`defineRowSelector`、`defineFieldFormat` 等作者侧 API 不变。
3. 再迁 `providers/data` 中的纯字段能力、`providers/transform`、`providers/statistics`、`providers/format`，保持 registry resolver 和内置集合名称不变。`channelValue`、`labelOf` 这类依赖 channel / mark 语义的 helper 不迁入 data，后续由 plot 以 data 的字段解析能力重新组合。
4. 最后建立 `pipeline/transform` 作为 `applyTransforms`、`collectTransformFields`、`DEFAULT_TRANSFORM_CONTEXT` 等编排入口；`DEFAULT_TRANSFORM_CONTEXT` 只持有 data-only 行溯源能力。现有 provenance 中的 row sourceIndex / sourceIndices 读写符号和 helper 迁入 data；plot layer meta、datum meta、markLayerId、rootMeta 等 plot IR 元信息继续留在 plot。
5. 迁移后 plot 不再拥有通用数据实现文件；plot 只从 `@retikz/data` 消费类型、字段函数、format 函数和 transform pipeline，并保留 channel / label / mark-local 组合逻辑。

理由：

1. 数据处理是跨宿主能力，放在 plot 会迫使 chart / table 依赖 plot 语义。
2. 现有 plot 数据层已经按 schema / contract / providers / pipeline 分层，迁移可以保持行为等价。
3. 不创建 `@retikz/data-react`，避免把纯数据层提前绑定到 React authoring sugar。

## 待决策点

- **`applyTransforms` 的最终目录**：倾向放 `pipeline/transform`；若实现发现现有 providers 内部耦合更小，可先留在 `providers/transform/orchestrate.ts`，但 public barrel 仍从 `@retikz/data` 导出。
- **Plot 前缀类型名称**：`PlotFieldFormat`、`PlotFieldType`、`PlotTransform`、`PlotSortOrder` 等现有公开名在 beta.1 作为兼容名保留；是否重命名为 `DataFieldFormat` / `DataTransform` 留到 beta.2 单独处理，避免同一迁移混入命名破坏。

## DSL / API 表面

```ts
import {
  applyTransforms,
  defineTransform,
  type DataModel,
  type ExternalDatasets,
  type TransformOperation,
} from '@retikz/data';

const transforms: Array<TransformOperation> = [
  { kind: 'sort', by: 'month', order: 'ascending' },
  { kind: 'stack', y: 'value', groupBy: ['series'] },
];
```

`@retikz/data` 不提供 `<Transform>` 组件。React / Vanilla 宿主继续在自己的 adapter 中决定如何收集数据 transform 声明。

## 测试设计

`packages/viz/data/tests/` 覆盖：

- schema parse：DataModel / TransformOperation 与现有 plot 契约等价。
- field runtime：字段路径、fieldMap、format、coerce 与 resolveField 行为等价。
- transform runtime：sort / stack / normalize / derive-interval / jitter / group / bin / summarize / select / density / smooth 输出等价。
- registry：内置与自定义 definition 同路注册，重复 key、未注册 kind、schema 不匹配 fail-loud。
- provenance：sourceIndex / sourceIndices 在保行数与改行数 transform 中按现有语义保留。

## 影响

- `@retikz/data` 新增为 viz workspace 包，版本从 `0.1.0-beta.1` 起。
- `@retikz/plot` 失去数据层实现真源，后续通过依赖 `@retikz/data` 消费。
- `@retikz/plot-react` / `@retikz/plot-vanilla` 不直接依赖 `@retikz/data`，除非后续决定让 adapter 类型从 data 包直引。
- ⚠️ BREAKING：深导入 `@retikz/plot/src/providers/data/*` 或 `@retikz/plot/src/schemas/transform/*` 的用户不再受支持；公开入口由 `@retikz/data` 与 `@retikz/plot` 顶层 re-export 承载。

## 不在本 ADR 范围

- 不迁移 scale、coordinate、mark、guide、locator、theme、plot lowering。
- 不迁移 plot channel / label 解析语义；`channelValue`、`labelOf` 等组合 helper 留在 plot。
- 不设计 chart / table 的具体数据 DSL。
- 不新增 `@retikz/data-react`。
- 不重命名已经公开的 transform kind、field type、registry helper。

---

## 实现契约

### Level

`red`

理由：新增 workspace 包并迁移公开 schema / contract / provider / pipeline 入口，影响 `packages/viz/*/src/index.ts` 和 plot lowering 消费边界。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/data/src/schemas/data/*` | 迁移 | 无新增 | 沿用 plot 现有 data schema | 沿用 | 数据模型与数据引用契约迁到 data 包 |
| `packages/viz/data/src/schemas/transform/*` | 迁移 | 无新增 | 沿用 plot 现有 transform schema | 沿用 | 数据 transform 操作契约迁到 data 包 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/data/package.json`
- `packages/viz/data/README.md`
- `packages/viz/data/LICENSE`
- `packages/viz/data/tsconfig.json`
- `packages/viz/data/vite.config.ts`
- `packages/viz/data/AGENTS.md`
- `packages/viz/data/src/**`
- `packages/viz/data/tests/**`
- `packages/viz/plot/src/schemas/data/**`
- `packages/viz/plot/src/schemas/transform/**`
- `packages/viz/plot/src/contract/data.ts`
- `packages/viz/plot/src/contract/transform.ts`
- `packages/viz/plot/src/contract/statistics.ts`
- `packages/viz/plot/src/contract/format/**`
- `packages/viz/plot/src/providers/data/**`
- `packages/viz/plot/src/providers/transform/**`
- `packages/viz/plot/src/providers/statistics/**`
- `packages/viz/plot/src/providers/format/**`
- `packages/viz/plot/src/index.ts`（仅配合 re-export 迁移）
- `packages/viz/plot/package.json`（仅新增 `@retikz/data` dependency 和删除被迁走的 runtime deps）
- `packages/viz/plot/tests/**`（仅调整 import / 兼容断言）
- `package.json`（仅新增 data 包到 viz 脚本过滤器）
- `pnpm-lock.yaml`
- `packages/viz/AGENTS.md`
- `packages/viz/_notes/README.md`
- `packages/viz/_notes/decisions/data/**`

### 测试象限

**Happy path（≥ 3）**：

- `applyTransforms keeps sort/stack output stable`：同一输入 rows 和 transform 链，迁移前后输出字段和值一致。
- `field resolver maps logical to physical paths`：fieldMap + model + resolveField 组合保持现有解析结果。
- `custom transform definition executes through same registry`：自定义 kind schema parse 后执行，输出与旧 plot API 一致。

**边界（≥ 2）**：

- `empty rows stay empty`：空数据集经过任意保行数 transform 返回空数组。
- `missing optional field formats to undefined`：缺字段、null、非法时间按现有 coerce / format 语义处理。

**错误路径（≥ 2）**：

- `unknown transform kind fails loud`：未注册 kind 抛出 data 层错误，plot 不吞错。
- `duplicate custom transform kind fails loud`：重复用户 definition 抛错。

**交互（≥ 2）**：

- `summarize uses custom reducer registry`：statistics reducer registry 与 transform pipeline 同路消费。
- `selector transform preserves provenance`：row selector 与 provenance context 组合保持 sourceIndices。

### 依赖的现有元素

- `packages/viz/plot/src/schemas/data/**`：迁移到 data 包，作为初始 schema 真源。
- `packages/viz/plot/src/schemas/transform/**`：迁移到 data 包，作为 transform operation 真源。
- `packages/viz/plot/src/providers/data/**`：迁移到 data 包，保持字段解析和 format runtime。
- `packages/viz/plot/src/providers/transform/**`：迁移到 data 包，保持 transform apply pipeline。
- `packages/viz/plot/src/providers/statistics/**`：迁移到 data 包，供 summarize / select transform 使用。
- `@retikz/core` / `@retikz/math`：作为 data 包的基础依赖，继续承接 JSON schema 公共类型和数值判断等底层能力。
