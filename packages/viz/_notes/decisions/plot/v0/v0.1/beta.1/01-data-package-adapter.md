# ADR-01：适配 @retikz/data 数据层

- 状态：Accepted
- 决策日期：2026-07-06
- 完成日期：2026-07-07
- 关联：[plot v0.1-beta.1 roadmap](./roadmap.md) · [data beta.1 迁移 ADR](../../../../data/v0/v0.1/beta.1/01-plot-data-migration.md) · [plot-design.md §3.1 Data / §8 lowering](../../../../../architecture/plot-design.md)

## 背景

`@retikz/data` 在 beta.1 成为数据模型、字段解析、transform、statistics、format 的真源后，`@retikz/plot` 需要从“拥有数据实现”调整为“消费数据实现”。plot 仍负责 GoG 语义：scale、coordinate、mark、guide、locator、theme、composition 与 lowering。

beta.1 直接采用破坏式迁移。现有 `<Plot data model dataTransforms>`、`lowerPlots(datasets, options)` 等 plot 入口保持语义，但数据模型、外部数据集、字段格式和共享 transform definition helper 的 import 源头改为 `@retikz/data`。

## 决策

`@retikz/plot` 新增 `@retikz/data` 依赖，内部从 data 包消费数据 schema、field helper、format、statistics、transform pipeline 与 provenance。plot 顶层 public API 只导出 plot 自己拥有的 schema / provider / lowering 能力，不保留 `DataModel`、`ExternalDatasets`、`defineTransform`、`applyTransforms` 等 data re-export。

适配规则：

1. plot schema 中引用 `DataRef`、共享 transform schema 的位置改从 `@retikz/data` 导入。
2. `lowerPlots` 改从 `@retikz/data` 消费 `applyTransforms`、`collectTransformFields`、registry resolver、field resolver、coerce / format 等纯数据能力。
3. channel / label / mark-local 组合 helper 留在 plot，并基于 data 包的字段解析和格式化能力实现。
4. plot-react / plot-vanilla 需要数据类型时直接依赖 `@retikz/data`。

## 被否决选项

- **plot 继续拥有数据实现**：会让 chart / table 等宿主重复实现或反向依赖 plot。
- **plot 顶层兼容转发 data API**：会扩大 plot 公共面，让 owner 边界长期模糊。
- **保留深导入 shim**：会为未承诺入口制造兼容负担，阻碍 beta 阶段结构收敛。

## 公开契约与兼容性

plot 入口保持 plot 自身 API：

```ts
import { lowerPlots, type PlotSpec, type TransformOperation } from '@retikz/plot';
```

data API 从 data 包获取：

```ts
import { defineTransform, type ExternalDatasets } from '@retikz/data';
import { lowerPlots, type PlotSpec, type TransformOperation } from '@retikz/plot';
```

`TransformOperation` 仍属于 plot schema：它包含共享 data transform、plot-only transform 与外部 transform passthrough。共享 transform definition helper 与外部数据集类型属于 data。

依赖 `@retikz/plot` 获取 data API 或依赖 `@retikz/plot/src/...` 深导入的用户，需要改为 `@retikz/data` 或 `@retikz/plot` 对应顶层 owner 入口。

## 最终实现

plot package 已新增 `@retikz/data` dependency。plot schema、lowering pipeline、source field collection、locator、scale / channel / mark provider 相关数据读取路径已改为消费 data 包。plot public barrel 删除 data-only 类型和 helper 转发，plot-react / plot-vanilla 的 data 类型来源也改为直接依赖 data。

plot-only transform 的 schema 和 provider 回归 plot，由 [ADR-02](./02-plot-transform-registration.md) 记录；data 内置能力边界由 [data ADR-02](../../../../data/v0/v0.1/beta.1/02-shared-provider-boundary.md) 记录。

## 验证

- plot lowering 使用 data 包后，transform / field / format / provenance 行为保持通过测试。
- plot 顶层不再 re-export data-only surface，并由 public barrel 边界测试覆盖。
- plot-react 与 plot-vanilla 通过直接 data dependency 完成类型检查与 adapter 测试。
- beta.1 roadmap 记录完成提交：`21b1019e` / `23bba402` / `22ceb713`。

## 遗留风险

adapter 暴露面中仍出现的 data 类型必须持续从 `@retikz/data` 消费，不能经 plot 转发。后续若新增 chart / table 宿主，应复用 data 包而不是复用 plot adapter 入口。

## 实现指针

本 ADR 已随 viz `0.1.0-beta.1` 收尾压缩；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在历史中。

> 🔖 压缩前完整施工蓝图 = `git show 3c76d64d1402545454f1ae301d8588313abb7d5d:packages/viz/_notes/decisions/plot/v0/v0.1/beta.1/01-data-package-adapter.md`。
