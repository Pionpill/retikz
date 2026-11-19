# 发布准备

## 工作区改动

只做发布准备相关改动：

1. **包版本号**：发布组内每个包都改到目标版本。
2. **changelog 数据**：更新 `apps/docs/src/modules/docs/data/changelog/*.ts` 中对应 release 文件，结构以 `apps/docs/src/modules/docs/data/types.ts` 为准；不要改旧 changelog MDX。
3. **模块徽章**：只有可见模块版本变化时才改 `apps/docs/src/modules/docs/data/module.ts`，例如 minor / major 切档或 alpha -> beta -> rc -> stable。
4. **roadmap**：仅在重点功能、目标或必要依赖发生获批变化时按 `develop-design` 更新；不回填发布记录、ADR 细节或阶段检查清单，不因预发布递增搬迁未完成 ADR。
5. **ADR 检查**：每次发包都做下方的全文审计；中版本首次正式发布时，另做中版本 ADR 整理。
6. **lockfile**：package metadata 或依赖图变化导致 lockfile 漂移时，运行 `pnpm install`。

## ADR 全文审计

全仓验证和 dry-run 前，从本次交付与依赖识别相关 ADR（含被动上游组），逐篇阅读全文并追踪 Superseded/替代关系。按 [ADR 长期一致性](../../develop-wrapup/references/adr-consistency.md) 对账实现、公开契约、tests/docs/changelog。

当期获批提案标 Accepted，被替代提案指明后继；长期主题核对实际生效的契约及历史记录。状态本身不证明完成；不相关且不影响快照的未来能力列“未纳入”，不随 alpha 批次搬迁。半成品污染发布快照不能靠省略 changelog 排除。

逐篇报告状态、长期形态、契约一致性和结论；未通过停止，不继续验证、commit、tag 或 publish。修订不得扩大既有授权。

## 中版本 ADR 整理

在发布组首次发布该中版本的正式版（如 `0.5.0`）前执行；alpha、beta、rc 和后续 patch 仍按本次交付做全文审计，不重复整档整理。

1. 按实际交付逐篇核对当期编号 ADR，将仍生效的条款合入所属 owner 的长期主题，更新或移除被覆盖的正文；不把编号文件原样搬入长期目录。
2. 在每个受影响主题末尾的“历史记录”按 owner、中版本和原 ADR 编号简记实质变化与原因。同一版本合并一条；完全失效且没有现行契约的主题可删除，历史由 Git 保留。
3. 未交付但仍计划实施的提案转到明确的目标中版本并按目标目录编号；已放弃的移除。修正跨 owner 链接、roadmap 与编号引用，确认无悬空引用或遗漏提案后清理旧版本目录，不保留编号占位页。

## Changelog 规则

- zh 是 source of truth，en 结构同步。
- `PackageBlock.pkg` 必须来自 `PACKAGE_IDS`。
- 写用户可见行为、迁移说明、包级 release highlight。内部 docs / ADR / AGENTS 改动通常不进 npm changelog，除非影响用户入口或迁移说明。
- 保持既有排序约定：新 release / subVersion 在前。
