# v0.3.0-beta.2 实施待办

> 写于 2026-06-12。beta.2 延续 beta.1 的封版前加固窗口，跟踪 beta.1 → rc 之间的零散任务。
>
> 关联：[`v0.3 总计划`](../roadmap.md) · [`v0.4 路线讨论`](../../v0.4/roadmap.md)

## 进度看板

| # | 标题 | level | 工作量 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | 升级 zod v3 → 最新版（v4） | internal | 中 | ✅ 完成 | catalog 升至 `^4.4.3`，core / plot / docs 全量适配（nativeEnum→enum、issue code 字面量、record 双参、docs walker 改 v4 内省 API）。**core 内置 `z.toJSONSchema()` 已解锁**——`SceneSchema` / `PlotSpecSchema` 导出能力有测试锁定，喂 [`eval`](../../../../../eval/design.md) schema 导出（D2）与未来 MCP。 |
