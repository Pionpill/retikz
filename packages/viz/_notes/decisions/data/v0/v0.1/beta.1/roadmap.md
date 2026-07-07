# @retikz/data v0.1-beta.1 roadmap

> 状态：Done（2026-07-07 收尾） · 完成提交：`a732efd7` / `55ac99f4` / `39470d2b` / `22ceb713` · 关联：[data v0.1 roadmap](../roadmap.md) · [plot beta.1 适配](../../../../plot/v0/v0.1/beta.1/roadmap.md)

beta.1 只做迁移和包边界收敛，不改变最终数据语义：

1. ✅ 建立 `@retikz/data` 包结构与公开入口。
2. ✅ 从 `@retikz/plot` 迁出数据 schema、数据 contract、字段解析、format、statistics、transform registry 与 apply pipeline。
3. ✅ data 默认内置 provider 只保留 plot / table / geo 交集：字段解析、format、statistics 子算子、`sort` / `summarize` / `select` / `annotate` 等通用 transform。
4. ✅ plot-only transform schema 与 implementation 由 plot 自行注册，data 只保留 transform contract / registry / apply pipeline。
5. ✅ 由 plot ADR 负责消费 `@retikz/data` 后的 registry 组合与 lowering 适配。

## ADR

- [ADR-01：从 plot 迁出通用数据层](./01-plot-data-migration.md) — Accepted（已压缩）
- [ADR-02：收敛 data 内置 provider 边界](./02-shared-provider-boundary.md) — Accepted（已压缩）
