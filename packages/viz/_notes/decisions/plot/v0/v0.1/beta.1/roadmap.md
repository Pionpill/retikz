# @retikz/plot v0.1-beta.1 roadmap

> 状态：Proposed · 关联：[plot v0.1 roadmap](../roadmap.md) · [data beta.1 迁移](../../../../data/v0/v0.1/beta.1/roadmap.md)

beta.1 聚焦数据层拆包后的 plot 适配：

1. `@retikz/plot` 新增 `@retikz/data` dependency。
2. plot lowering、scale / channel / mark provider 改为从 `@retikz/data` 消费数据类型、字段解析、transform pipeline。
3. plot 不再顶层转发 data-only 类型和 helper；消费方直接从 `@retikz/data` 顶层导入。
4. plot-only transform schema 与 provider implementation 回到 plot，由 plot 默认 registry 组合 data 内置项与 plot 内置项。
5. plot 私有深路径数据实现删除，测试改用公开入口或 data 包入口。

## ADR

- [ADR-01：适配 @retikz/data 数据层](./01-data-package-adapter.md)
- [ADR-02：plot 自行注册 plot-only transform](./02-plot-transform-registration.md)
