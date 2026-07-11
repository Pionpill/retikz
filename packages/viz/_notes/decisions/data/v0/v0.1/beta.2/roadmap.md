# @retikz/data v0.1-beta.2 roadmap

> 状态：Proposed · 关联：[data v0.1 roadmap](../roadmap.md)

beta.2 收紧 data IR 与 statistics 边界，并收敛 schema 派生公开 TypeScript 类型命名。所有旧类型名直接删除，不提供 deprecated alias；运行时 schema、JSON 字段、transform kind 和数据处理行为保持不变。

## ADR

- [ADR-01：统一 data IR 类型的 owner 命名](./01-ir-data-type-naming.md) — Proposed

## 完成条件

1. data schema 派生公开类型全部使用 `IRDataXxx`。
2. data、plot、adapter 与 docs 不再引用被删除的旧类型名。
3. `@retikz/core` 的 `IRTransform`、data 的 `IRDataTransform` 与 plot 后续采用的 `IRPlotXxx` 无需 import alias 即可区分 owner。
4. 受影响包的 lint、tsc、测试、构建与 docs 校验通过。
