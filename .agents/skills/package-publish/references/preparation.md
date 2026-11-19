# 发布准备

## 工作区改动

只做发布准备相关改动：

1. **包版本号**：发布组内每个包都改到目标版本。
2. **changelog 数据**：更新 `apps/docs/src/modules/docs/data/changelog/*.ts` 中对应 release 文件，结构以 `apps/docs/src/modules/docs/data/types.ts` 为准；不要改旧 changelog MDX。
3. **模块徽章**：只有可见模块版本变化时才改 `apps/docs/src/modules/docs/data/module.ts`，例如 minor / major 切档或 alpha -> beta -> rc -> stable。
4. **roadmap**：仅在重点功能、目标或必要依赖发生获批变化时按 `develop-design` 更新；不回填发布记录、ADR 细节或阶段检查清单，不搬迁未完成 ADR。
5. **ADR 检查**：每次发包都做下方的全文审计；中版本首次正式发布时，另做中版本 ADR 整理。
6. **lockfile**：package metadata 或依赖图变化导致 lockfile 漂移时，运行 `pnpm install`。

## ADR 全文审计

全仓验证和 dry-run 前，从本次交付与依赖识别相关 ADR（含被动上游组），逐篇阅读全文并追踪 Superseded/替代关系。按 [ADR 长期一致性](../../develop-wrapup/references/adr-consistency.md) 对账实现、公开契约、tests/docs/changelog。

生效决策为 Accepted；被替代记录为 Superseded 并链接替代 ADR。状态本身不证明完成；不相关且不影响快照的未来能力列“未纳入”，不随 alpha 批次搬迁。半成品污染发布快照不能靠省略 changelog 排除。

逐篇报告状态、长期形态、契约一致性和结论；未通过停止，不继续验证、commit、tag 或 publish。修订不得扩大既有授权。

## 中版本 ADR 整理

在发布组首次发布该中版本的正式版（如 `0.5.0`）前执行；alpha、beta、rc 和后续 patch 仍按本次交付做全文审计，不重复整档整理。

1. **收敛当前中版本**：逐篇核对本组相关 owner 的 ADR，保留决策、关键理由、适用边界与仍生效的约束；删去重复背景、施工过程及已被替代的细节，不把尚未交付的提案写成现行契约。
2. **回查此前中版本**：按 owner 检查旧 ADR，沿跨版本、跨 owner 的替代链核对。仍有效的保持原样；部分替代的明确哪些条款仍有效，并链接新决策；完全替代且有追溯价值的在原路径保留简短的 Superseded 记录与替代链接。不要把旧决定改写成当初就采用了新方案。
3. **删除与验收**：只删除没有独立决策或追溯价值的失效记录；先检索原路径及带 owner / 版本的编号引用，修正 roadmap、ADR 和文档中的现行链接。按 [ADR 编号规则](../../develop-design/references/adr.md) 留空号，不重排、不复用；即使删除的是末号，新编号也要越过历史已用号。完成后核验受影响链接，汇报压缩、部分替代、完全替代及删除的记录。

## Changelog 规则

- zh 是 source of truth，en 结构同步。
- `PackageBlock.pkg` 必须来自 `PACKAGE_IDS`。
- 写用户可见行为、迁移说明、包级 release highlight。内部 docs / ADR / AGENTS 改动通常不进 npm changelog，除非影响用户入口或迁移说明。
- 保持既有排序约定：新 release / subVersion 在前。
