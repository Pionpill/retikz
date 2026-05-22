# retikz 内部文档地图

按**生命周期**组织，不按主题。每个子目录给出装什么、何时归档 / 删。

## 子目录

| 目录 | 装什么 | 生命周期 | 命名 |
|---|---|---|---|
| [`architecture/`](./architecture) | 长期架构文档；少改、不带日期 | 永久（重大架构调整时**更新原文**，不另起新文） | 主题名，如 `DESIGN.md` |
| [`adr/`](./adr) | 单点架构决策记录（Architecture Decision Records） | 永久、不可变；被推翻就写新 ADR 标 `Supersedes #N` | `NNNN-kebab-case-标题.md`，编号递增 |
| [`analysis/`](./analysis) | 一次性研究 / 对比 / gap 分析 | 长期保留作历史参考，但不再更新 | `YYYY-MM-DD-kebab-case-标题.md` |
| [`plans/`](./plans) | 临时实施方案、迁移步骤 | **完工后保留留档**（标记完成、不再更新；摘要进 roadmap 跟踪段） | 版本专属：`v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>.md`（plan 比 adr 粒度粗，单文件就够）；跨版本草案：顶层 `kebab-case-标题.md` |

## 当前文档

### architecture/

- [`DESIGN.md`](./architecture/DESIGN.md)：retikz v0.1 总架构设计——分层模型、IR、Scene、AI 友好原则、跨平台策略

### adr/

> alpha.1 / alpha.2 / alpha.3 期间的 ADR 已随版本发布归档进 changelog（旧约定，每个 alpha 重新起号）。
>
> alpha.4 起转为永久保留 + 全局单调编号——alpha.4 的 3 篇 ADR 在 [`adr/v0/v0.1-alpha.4/`](./adr/v0/v0.1-alpha.4)；后续版本的 ADR 写入 [`adr/v0/<version>/`](./adr/v0)，索引见 [`adr/README.md`](./adr/README.md)。

### analysis/

- [`2026-05-07-tikz-gap-analysis.md`](./analysis/2026-05-07-tikz-gap-analysis.md)：当前 Node / Path 能力对比 TikZ 的缺失项 + 优先级

### plans/

详细索引见 [`plans/README.md`](./plans/README.md)。当前活跃 plan：

- [`v0/roadmap.md`](./plans/v0/roadmap.md)：v0 总路线（v0.1 → v0.4 → v0 收尾）含 v0.1 各 alpha 详细拆分
- [`v0/v0.1-beta.1.md`](./plans/v0/v0.1-beta.1.md)：v0.1.0-beta.1 非破坏性优化 TODO 列表
- [`docs-ai-chat-panel.md`](./plans/docs-ai-chat-panel.md)：文档站侧边栏 AI 聊天面板设计讨论（草案 / 待续）；BYOK 浏览器直连方向

## 写文档前先选生命周期

1. 是"为什么这么做"的单点决策？→ `adr/`，开新编号
2. 是会持续更新的架构总图？→ `architecture/`
3. 是一次性的研究 / 对比，写完不再改？→ `analysis/`，加日期
4. 是"接下来要做什么"的实施方案？→ `plans/`，完工后保留留档

**有歧义就当 plans 写**——plan 颗粒粗、变化快，完工后留档作实施记录即可；别把临时方案塞进永久架构目录（architecture / adr），那才是 CORE-REFACTOR / REACT-ADAPTER 的悲剧。

## superpowers/

`superpowers/` 目录下的 specs / plans 是 superpowers skill 的工作流产物，生命周期由 skill 自己管，**不要混进上面的体系**。
