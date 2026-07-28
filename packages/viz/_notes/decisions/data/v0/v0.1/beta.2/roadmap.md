# @retikz/data v0.1-beta.2 roadmap

> 状态：Done · 关联：[data v0.1 roadmap](../roadmap.md)

beta.2 收紧 data IR 与 statistics 边界，收敛 schema 派生公开 TypeScript 类型命名，并补齐宿主无关的数据链路追踪。类型命名变更不提供 deprecated alias；lineage 保持 runtime-only，不写入 JSON IR。

## ADR

- [ADR-01：统一 data IR 类型的 owner 命名](./01-ir-data-type-naming.md) — Accepted
- [ADR-02：data 提供可配置的数据链路追踪](./02-data-lineage-trace.md) — Accepted

## 完成条件

1. data schema 派生公开类型全部使用 `IRDataXxx`。
2. data、plot、adapter 与 docs 不再引用被删除的旧类型名。
3. `@retikz/core` 的 `IRTransform`、data 的 `IRDataTransform` 与 plot 后续采用的 `IRPlotXxx` 无需 import alias 即可区分 owner。
4. `applyTransformsWithLineage()` 可按需记录 source identity、transform step 与受控细节，不改变 `applyTransforms()` 默认行为。
5. 受影响包的 lint、tsc、测试、构建与 docs 校验通过。

## 延期边界

宿主无关的 canonical data-view preparation contract 会新增公共能力与跨宿主消费边界，不作为 beta.2 cleanup 处理；延期到后续 Alpha milestone 单独设计、契约测试与实现。
