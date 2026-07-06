# @retikz/data v0.1-beta.1 roadmap

> 状态：Proposed · 关联：[data v0.1 roadmap](../roadmap.md) · [plot beta.1 适配](../../../../plot/v0/v0.1/beta.1/roadmap.md)

beta.1 只做迁移，不改变数据语义：

1. 建立 `@retikz/data` 包结构与公开入口。
2. 从 `@retikz/plot` 迁出数据 schema、数据 contract、字段解析、format、statistics、transform registry 与 apply pipeline。
3. 保持 JSON IR 形态、错误语义、transform 输出、provenance 行为与现有 plot 测试等价。
4. 由 plot ADR 负责消费 `@retikz/data` 后的 re-export 与 lowering 适配。

## ADR

- [ADR-01：从 plot 迁出通用数据层](./01-plot-data-migration.md)
