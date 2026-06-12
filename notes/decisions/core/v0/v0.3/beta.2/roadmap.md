# v0.3.0-beta.2 实施待办

> 写于 2026-06-12。beta.2 延续 beta.1 的封版前加固窗口，跟踪 beta.1 → rc 之间的零散任务。
>
> 关联：[`v0.3 总计划`](../roadmap.md) · [`v0.4 路线讨论`](../../v0.4/roadmap.md)

## 进度看板

| # | 标题 | level | 工作量 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | 升级 zod v3 → 最新版（v4） | internal | 中 | 📋 计划 | `pnpm-workspace.yaml` catalog 统一升级，core / plot 全量 zod schema 适配（v4 有 API 变更，留意 breaking）。**解锁 core 内置 `z.toJSONSchema()`**——零额外依赖即可产出喂 LLM 的 JSON Schema 契约，利好 [`eval`](../../../../../eval/design.md) 的 schema 导出（D2）与未来 MCP。 |
