# 发布准备

## 工作区改动

只做发布准备相关改动：

1. **包版本号**：发布组内每个包都改到目标版本。
2. **changelog 数据**：更新 `apps/docs/src/modules/docs/data/changelog/*.ts` 中对应 release 文件，结构以 `apps/docs/src/modules/docs/data/types.ts` 为准；不要改旧 changelog MDX。
3. **模块徽章**：只有可见模块版本变化时才改 `apps/docs/src/modules/docs/data/module.ts`，例如 minor / major 切档或 alpha -> beta -> rc -> stable。
4. **roadmap**：仅在重点功能、目标或必要依赖发生获批变化时按 `develop-design` 更新；不回填发布记录、ADR 细节或阶段检查清单，不搬迁未完成 ADR。
5. **ADR 检查**：按下方“ADR 长期一致性门禁”逐篇审计本次交付及依赖涉及的 ADR；发现混入施工细节、状态错误或契约不一致时停下，先走 `develop-wrapup` 修正。
6. **lockfile**：package metadata 或依赖图变化导致 lockfile 漂移时，运行 `pnpm install`。

## ADR 全文审计

全仓验证和 dry-run 前，从本次交付与依赖识别相关 ADR（含被动上游组），逐篇阅读全文并追踪 Superseded/替代关系。按 [ADR 长期一致性](../../develop-wrapup/references/adr-consistency.md) 对账实现、公开契约、tests/docs/changelog。

生效决策为 Accepted；被替代记录为 Superseded 并链接替代 ADR。状态本身不证明完成；不相关且不影响快照的未来能力列“未纳入”，不随 alpha 批次搬迁。半成品污染发布快照不能靠省略 changelog 排除。

逐篇报告状态、长期形态、契约一致性和结论；未通过停止，不继续验证、commit、tag 或 publish。修订不得扩大既有授权。

Changelog 规则：

- zh 是 source of truth，en 结构同步。
- `PackageBlock.pkg` 必须来自 `PACKAGE_IDS`。
- 写用户可见行为、迁移说明、包级 release highlight。内部 docs / ADR / AGENTS 改动通常不进 npm changelog，除非影响用户入口或迁移说明。
- 保持既有排序约定：新 release / subVersion 在前。
