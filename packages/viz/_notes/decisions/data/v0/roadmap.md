# @retikz/data v0 roadmap

> 状态：Proposed · 关联：[plot v0 roadmap](../../plot/v0/roadmap.md) · [plot-design.md §3.1 Data / §3.3 Transform](../../../architecture/plot-design.md)

`@retikz/data` 是 viz 组通用数据层，先从 `@retikz/plot` 迁出已经被验证的数据模型、字段解析、transform、statistics 与 format 能力，再作为后续 plot / chart / table 的共享底座。

## v0.1

- beta.1：从 `@retikz/plot` 抽出最小稳定数据层，并让 plot 改为消费 `@retikz/data`。
- beta.2：收紧 data IR 与 statistics 边界，统一 schema 派生公开类型为 `IRDataXxx`，并补齐宿主无关的 runtime lineage。
- RC：冻结 v0.1 公共契约，只接收兼容性 bug、诊断、文档和发布修正。
- v0.1 后续：canonical data-view preparation 等新公共能力只在 plot / chart / table 出现稳定重复需求后进入新的 Alpha milestone；不提前创建 React adapter。

## 不在 v0 范围

- 不承载 renderer、layout、mark、scale、coordinate 或 guide 语义。
- 不提供 `@retikz/data-react`，除非至少两个 React 宿主出现稳定重复的 data authoring sugar。
