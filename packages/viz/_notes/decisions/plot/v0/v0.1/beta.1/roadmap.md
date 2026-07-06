# @retikz/plot v0.1-beta.1 roadmap

> 状态：Proposed · 关联：[plot v0.1 roadmap](../roadmap.md) · [data beta.1 迁移](../../../../data/v0/v0.1/beta.1/roadmap.md)

beta.1 聚焦数据层拆包后的 plot 适配：

1. `@retikz/plot` 新增 `@retikz/data` dependency。
2. plot lowering、scale / channel / mark provider 改为从 `@retikz/data` 消费数据类型、字段解析、transform pipeline。
3. plot 顶层继续 re-export 已公开的数据类型和 transform extension surface，降低 beta.1 迁移成本。
4. plot 私有深路径数据实现删除，测试改用公开入口或 data 包入口。

## ADR

- [ADR-01：适配 @retikz/data 数据层](./01-data-package-adapter.md)
