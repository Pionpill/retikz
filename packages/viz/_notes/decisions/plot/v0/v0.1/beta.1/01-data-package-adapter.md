# ADR-01：适配 @retikz/data 数据层

- 状态：Proposed
- 决策日期：2026-07-06
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md) · [data beta.1 迁移 ADR](../../../../data/v0/v0.1/beta.1/01-plot-data-migration.md) · [plot-design.md §3.1 Data / §8 lowering](../../../../../architecture/plot-design.md)

## 背景

`@retikz/data` 在 beta.1 成为数据模型、字段解析、transform、statistics、format 的真源后，`@retikz/plot` 需要从“拥有数据实现”调整为“消费数据实现”。plot 仍负责 GoG 语义：scale、coordinate、mark、guide、locator、theme、composition 与 lowering。

这次适配必须保持用户可见行为等价。现有 `<Plot data model dataTransforms>`、`lowerPlots(datasets, options)`、`TransformOperation`、`defineTransform`、`resolveTransformRegistry` 等公开入口不能在 beta.1 直接消失，否则 plot-react、plot-vanilla 和外部用户会被一次拆包打断。

因此 plot 的策略是：内部 import 改走 `@retikz/data`；顶层 public API 在 beta.1 继续 re-export data 包中的稳定类型与 helper；深导入不兼容。

## 决策：plot 消费 data，并保留顶层兼容 re-export

`@retikz/plot` 新增依赖：

```json
{
  "dependencies": {
    "@retikz/data": "workspace:*"
  }
}
```

内部适配规则：

1. `schemas/plot`、`schemas/layer`、`schemas/mark` 等 plot schema 中引用 `DataSpec`、`TransformOperation` 的位置改从 `@retikz/data` 导入。
2. `pipeline/expand.ts` 改从 `@retikz/data` 消费 `applyTransforms`、`collectTransformFields`、`resolveTransformRegistry`、`applyFieldResolver`、`resolveFieldPath`、field type / coerce / format 等纯数据能力。
3. `providers/scale`、`providers/channel`、`providers/mark` 只保留 plot 语义；`channelValue`、`labelOf` 这类组合 helper 留在 plot，并基于 data 包的字段解析和格式化能力实现。
4. `src/index.ts` 在 beta.1 继续 re-export `DataModel`、`ExternalRow`、`ExternalDatasets`、`TransformOperation`、`defineTransform`、`AnyTransformDefinition`、`applyTransforms`、`resolveTransformRegistry` 等现有公开数据 API。
5. plot-react / plot-vanilla 暂时不强制改为直接依赖 `@retikz/data`；它们可继续从 `@retikz/plot` 获取类型，避免 adapter 同步破坏。

理由：

1. plot 不应继续拥有跨宿主数据算法，否则 chart / table 会重复实现或反向依赖 plot。
2. 顶层 re-export 可以让 beta.1 成为低摩擦迁移，真正清理旧导出留到后续 beta。
3. 内部 import 改走 data 包可以立即暴露循环依赖和错误边界，保证 data 包不是空壳。

## 待决策点

- **re-export 保留周期**：beta.1 必须保留；beta.2 是否标记 deprecated，等 docs 和 chart/table 设计确定后再定。
- **adapter 直接依赖 data**：beta.1 不强制。只有当 plot-react 需要不经 plot 的数据 authoring helper 时，再单独 ADR。

## DSL / API 表面

现有 plot 入口保持可用：

```ts
import {
  defineTransform,
  lowerPlots,
  type ExternalDatasets,
  type PlotSpec,
  type TransformOperation,
} from '@retikz/plot';
```

新 data-first 入口也可用：

```ts
import { defineTransform, type TransformOperation } from '@retikz/data';
import { lowerPlots, type PlotSpec } from '@retikz/plot';
```

两种写法在 beta.1 中应得到同一 runtime definition 与 transform 行为。

## 测试设计

`packages/viz/plot/tests/` 覆盖：

- plot lowering 使用 `@retikz/data` 后，现有 transform / field / format 行为不变。
- plot 顶层 re-export 的 data 类型和 helper 可被外部测试 import。
- plot-react 和 plot-vanilla 不需要新增 data dependency 也能通过类型检查。
- 深路径删除后，plot 内部没有从本包旧 data/provider 文件导入的残留。

## 影响

- `@retikz/plot` package dependency 增加 `@retikz/data`。
- `@retikz/plot` 源码删除私有 data / transform / statistics / format 实现文件，或保留最小 re-export shim；最终真源必须是 `@retikz/data`。
- docs 需要说明 data 包存在，以及 plot 顶层 data re-export 是 beta.1 兼容入口。
- ⚠️ BREAKING：依赖 `@retikz/plot/src/...` 的深导入用户需要改为 `@retikz/data` 或 `@retikz/plot` 顶层入口。

## 不在本 ADR 范围

- 不改 plot scale / coordinate / mark / guide schema 语义。
- 不新增 data-react。
- 不删除 plot 顶层 data re-export。
- 不设计 chart / table 消费 data 的 API。

---

## 实现契约

### Level

`red`

理由：触及 `@retikz/plot` public API barrel、package dependency、lowering pipeline 和跨包数据真源。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/plot/schema.ts` | 改 import | 无新增 | 从 `@retikz/data` 引用 data schema | 沿用 | PlotSpec data 字段保持等价 |
| `packages/viz/plot/src/schemas/layer/schema.ts` | 改 import | 无新增 | 从 `@retikz/data` 引用 transform schema | 沿用 | layer / mark-local transform 保持等价 |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/package.json`
- `packages/viz/plot/src/index.ts`
- `packages/viz/plot/src/schemas/**`
- `packages/viz/plot/src/contract/**`（仅删除/替换 data 相关 re-export）
- `packages/viz/plot/src/providers/**`（仅删除/替换 data 相关实现与 import）
- `packages/viz/plot/src/pipeline/**`
- `packages/viz/plot/tests/**`
- `packages/viz/plot-react/src/**`（仅 import 类型来源必要调整）
- `packages/viz/plot-vanilla/src/**`（仅 import 类型来源必要调整）
- `packages/viz/plot-react/package.json`（仅在确实直接依赖 data 时修改）
- `packages/viz/plot-vanilla/package.json`（仅在确实直接依赖 data 时修改）
- `apps/docs/**`（仅说明 data 包与兼容入口）

### 测试象限

**Happy path（≥ 3）**：

- `plot lowerPlots applies data transforms from data package`：sort + stack 下沉输出与迁移前一致。
- `plot public barrel re-exports transform extension surface`：从 `@retikz/plot` import `defineTransform` 和 `resolveTransformRegistry` 可用。
- `plot-react dataTransforms still builds the same PlotSpec`：`<Transform>` 与 `dataTransforms` 顺序不变。

**边界（≥ 2）**：

- `plot without transform avoids data pipeline work`：无 transform 的 spec 行为不变。
- `mark-local transform uses shared data pipeline`：relation / mark-local rows 与全局 transform 分离语义不变。

**错误路径（≥ 2）**：

- `unknown transform kind propagates data error`：plot 不包裹或吞掉 data 层错误。
- `field validation still reports plot context`：strict field 校验错误保留 `lowerPlots` 语境。

**交互（≥ 2）**：

- `scale domain inference sees transformed rows`：scale / guide 域推断仍消费 transform 后 rows。
- `locator provenance survives transformed rows`：datum locator 使用 data provenance 后仍能反查源行。

### 依赖的现有元素

- `@retikz/data`（`packages/viz/data/src/**`）—— data schema / contract / providers / pipeline 真源。
- `lowerPlots`（`packages/viz/plot/src/pipeline/expand.ts`）—— 消费 transform 后 rows，并继续负责 plot lowering。
- `plot-react` 的 `<Transform>`（`packages/viz/plot-react/src/components/transform.tsx`）—— 保持 adapter authoring sugar，不迁入 data 包。
- `plot-vanilla` 的 `renderPlot`（`packages/viz/plot-vanilla/src/render-plot.ts`）—— 通过 plot API 间接消费 data。
