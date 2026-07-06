# ADR-02：plot 自行注册 plot-only transform

- 状态：Proposed
- 决策日期：2026-07-06
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md) · [data beta.1 ADR-02](../../../../data/v0/v0.1/beta.1/02-shared-provider-boundary.md) · [ADR-01：适配 @retikz/data 数据层](./01-data-package-adapter.md) · [plot-design.md §3.3 Transform / §8 lowering](../../../../../architecture/plot-design.md)

## 背景

ADR-01 让 `@retikz/plot` 从 `@retikz/data` 消费数据模型、字段解析、format、statistics、transform pipeline。随后对 data 内置能力复盘发现，部分 transform 只是“rows in / rows out”，但输出字段和语义直接服务 plot mark、scale 或 geometry。把这些 transform 作为 data 内置项，会把 plot 的 stat-geom 词汇强加给 table / geo。

plot 仍然需要这些 transform：堆叠、分箱、归一化区间、relation 派生、抖动、密度、平滑都是当前 GoG 层的重要能力，并被 root transform、mark-local transform、scale domain、locator provenance 共同消费。正确边界不是删除这些能力，而是把它们从 data 内置集合移回 plot，由 plot 在调用 data pipeline 时注入自己的 transform definitions。

本 ADR 修正 ADR-01 中“plot 顶层继续转发 data 能力”和“data 内置所有 transform”的过渡策略。beta.1 不保留旧兼容层；消费方需要直接从 `@retikz/data` 获取 data-only API，从 `@retikz/plot` 获取 plot API。

## 决策：plot 拥有 plot-only transform definitions

`@retikz/plot` 新增 plot transform 子域，承载 plot-only schema、definition、provider implementation 和内置集合。plot lowering 和 locator 仍调用 `@retikz/data` 的 `applyTransforms` / `collectTransformFields` / `resolveTransformRegistry`，但默认 registry 由 data 内置 definitions 与 plot 内置 definitions 组合。

plot 自行注册的 transform：

| transform | plot 归属理由 |
| --- | --- |
| `stack` | 产出 baseline 区间，服务 stacked interval / area / sector 等 plot geometry。 |
| `bin` | 产出 bin 边界与默认 count，服务 histogram、binned interval、heatmap 等 plot stat geometry。 |
| `normalize` | 服务 percentage stacking / share chart。 |
| `derive-interval` | 把单值或双字段派生成 mark 可消费的区间边界。 |
| `relate` | 产出 relation rows，服务 relation mark anchor 与 routing。 |
| `jitter` | 对位置字段施加确定性视觉抖动。 |
| `density` | KDE 采样输出服务 density path / area。 |
| `smooth` | regression / trend 采样输出服务 smooth path。 |

实现结构倾向：

```text
packages/viz/plot/src/
  schemas/transform/
    constants.ts
    schema.ts
    types.ts
    index.ts
  providers/transform/
    definitions.ts
    row.ts
    group.ts
    density.ts
    smooth.ts
    shared.ts
    index.ts
```

plot 暴露 `PLOT_TRANSFORMS`、`BUILTIN_PLOT_TRANSFORMS` 或等价命名的内置集合，并提供一个 plot-local registry resolver：

```ts
const transformRegistry = resolvePlotTransformRegistry(options.transformDefinitions);
const rows = applyTransforms(normalized, spec.transform, transformRegistry, transformContext);
```

`resolvePlotTransformRegistry` 必须复用 data 的 `resolveTransformRegistry` 或等价入口，把 data 默认内置项与 plot 内置项同路注册，再合并用户 `options.transformDefinitions`。消费侧不得写“如果 kind 是 stack/bin 就走 plot switch，否则走 data registry”的旁路。

plot 的 schema 组合必须避免 data external passthrough 抢先接住 plot-only kind：`stack` / `bin` / `density` 等 plot 内置 kind 必须先经过 plot 闭合 schema 校验，或者由 plot 定义一个排除 data 内置 kind 与 plot 内置 kind 的 external transform 分支。不能把 `z.union([DataTransformSchema, PlotBuiltinTransformSchema])` 作为最终形态，否则 data 的开放 external 分支可能让 `{ kind: 'stack' }` 绕过 plot 字段校验。

理由：

1. plot-only transform 是 plot 的 Statistics / Geometry 交界能力，不应进入 data 默认内置集合。
2. registry 仍由 data 提供，可以保持自定义 transform、字段收集、provenance 和错误路径一致。
3. plot schema 与 provider 同包后，`.describe(...)` 可以直接说明 PathMark、baseline、relation rows 等 plot 语义，不污染 data。

## 待决策点

- **内置集合命名**：倾向 `BUILTIN_PLOT_TRANSFORMS` 与 `resolvePlotTransformRegistry`。最终命名以实现时和 plot 既有 provider 命名一致为准，但必须避免让 data 的 `resolveTransformRegistry` 表示“plot 全量 registry”。
- **内置集合命名**：plot-only transform 常量采用 `PlotTransform`，data 内置 transform 常量采用 `DataTransform`；两者只共享 transform registry 协议，不共享 owner 命名。

## DSL / API 表面

plot 用户继续在 plot spec 中使用 plot transform：

```ts
import { compileToScene } from '@retikz/core';
import { lowerPlots, type PlotSpec } from '@retikz/plot';

const spec: PlotSpec = {
  type: 'plot',
  data: { ref: 'sales' },
  transform: [
    { kind: 'summarize', groupBy: ['region', 'product'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] },
    { kind: 'stack', x: 'region', y: 'total', groupBy: 'product' },
  ],
  marks: [{ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'y1' } } }],
};

compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots({ sales }) });
```

`summarize` 来自 data 内置 transform，`stack` 来自 plot 内置 transform。用户不需要手动传入 plot 内置 definitions；只有自定义 transform 继续通过 `options.transformDefinitions` 注入。

## 测试设计

`packages/viz/plot/tests/` 覆盖：

- plot 默认 lowering 同时可执行 data transform 和 plot-only transform。
- root transform 与 mark-local transform 都使用同一 plot registry。
- scale domain、channel resolver、mark lowering 与 locator 读取 plot transform 后的 rows。
- `@retikz/plot` 不再 re-export data-only 类型和 helper；消费方从 `@retikz/data` 顶层导入。

## 影响

- ⚠️ BREAKING：`@retikz/plot` 顶层不再转发 data-only 类型、schema、provider、pipeline helper。消费方要从 `@retikz/data` 顶层导入。
- `@retikz/plot` 重新拥有 plot-only transform schema 与 provider implementation，但不复制 data pipeline。
- `@retikz/plot-react` 的 `<Transform>` / `dataTransforms` 只负责 authoring plot spec，不迁入 data 包。
- `@retikz/plot-vanilla` 继续通过 `@retikz/plot` lowering 间接获得 plot transform 能力。
- docs 需要把 data transform 和 plot transform 的来源讲清楚。

## 不在本 ADR 范围

- 不改变 plot transform kind 的 JSON 形态。
- 不新增 chart / table / geo 包。
- 不改变 plot transform kind 的 JSON 形态。
- 不为 `@retikz/plot` 的旧 data 转发入口保留兼容层。
- 不把 `<Transform>` 组件迁入 `@retikz/data-react`。

---

## 实现契约

### Level

`red`

理由：触及 plot public barrel、transform schema/provider、lowering pipeline、locator transform registry 与跨包 API 边界。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/transform/constants.ts` | 新建/迁入 | `PlotTransform` plot-only 成员 | const object enum | - | plot-only transform kind 集 |
| `packages/viz/plot/src/schemas/transform/schema.ts` | 新建/迁入 | `PlotTransformSchema` 或等价 schema | union | - | plot 可接受 data transform 与 plot-only transform |
| `packages/viz/plot/src/schemas/transform/types.ts` | 新建/迁入 | plot-only transform types | `z.infer` | - | plot-only operation 类型 |
| `packages/viz/plot/src/schemas/plot/schema.ts` | 改 | `transform` | data transform + plot transform union | - | plot root transform 接受 data 与 plot 内置项 |
| `packages/viz/plot/src/schemas/mark/schema.ts` | 改 | `transform` | data transform + plot transform union | - | mark-local transform 接受 data 与 plot 内置项 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/transform/**`
- `packages/viz/plot/src/schemas/index.ts`
- `packages/viz/plot/src/schemas/plot/schema.ts`
- `packages/viz/plot/src/schemas/mark/schema.ts`
- `packages/viz/plot/src/providers/transform/**`
- `packages/viz/plot/src/providers/index.ts`
- `packages/viz/plot/src/pipeline/source-fields.ts`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot/src/pipeline/locator/**`
- `packages/viz/plot/src/index.ts`
- `packages/viz/plot/tests/**`
- `packages/viz/plot-react/src/**`（仅类型来源必要调整）
- `packages/viz/plot-vanilla/src/**`（仅类型来源必要调整）
- `apps/docs/**`（仅 data / plot transform 来源说明）
- `packages/viz/_notes/decisions/plot/v0/v0.1/beta.1/**`

### 测试象限

**Happy path（≥ 3）**：

- `plot_registry_applies_data_and_plot_transform_chain`：`summarize -> stack` 在 plot lowering 中可执行。
- `plot_registry_applies_density_and_smooth`：`density` / `smooth` 通过 plot 内置 definitions 执行。
- `plot_react_transform_authoring_builds_plot_transform`：React `<Transform>` 或 `dataTransforms` 仍生成同一 spec 形态。

**边界（≥ 2）**：

- `mark_local_transform_uses_plot_registry`：mark-local `bin` / `stack` 使用同一 plot registry。
- `plot_without_plot_only_transform_uses_data_defaults`：只使用 `sort` / `summarize` 时无需 plot 特例分支。

**错误路径（≥ 2）**：

- `plot_unknown_transform_kind_fails_loud`：未知 kind 仍由 registry 抛错。
- `plot_duplicate_custom_transform_conflicts_with_plot_builtin`：用户自定义 kind 不能覆盖 plot 内置 kind。
- `plot_schema_rejects_invalid_stack_shape`：`{ kind: 'stack' }` 不能被 data external passthrough 接住，必须按 plot stack schema 报缺字段错误。

**交互（≥ 2）**：

- `locator_provenance_survives_plot_only_transform`：`bin` / `relate` 等改行数 transform 后 locator 仍能回指来源。
- `scale_domain_uses_rows_after_plot_transform`：scale / guide 域推断消费 plot transform 后 rows。

### 依赖的现有元素

- `@retikz/data`：继续提供 `ExternalRow`、field helpers、statistics reducer/selector、transform contract、pipeline 和 provenance。
- `packages/viz/data/src/providers/transform/**`：保留 data 内置 transform，并作为 plot registry 的基础集合。
- `packages/viz/plot/src/pipeline/expand.ts`：消费组合 registry 后的 transform rows。
- `packages/viz/plot/src/pipeline/locator/**`：必须与 lowering 使用同一 transform registry。
- `packages/viz/plot-react/src/**`：保持 `<Transform>` authoring 表面。
