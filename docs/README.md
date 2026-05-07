# retikz 内部文档地图

按**生命周期**组织，不按主题。每个子目录给出装什么、何时归档 / 删。

## 子目录

| 目录 | 装什么 | 生命周期 | 命名 |
|---|---|---|---|
| [`architecture/`](./architecture) | 长期架构文档；少改、不带日期 | 永久（重大架构调整时**更新原文**，不另起新文） | 主题名，如 `DESIGN.md` |
| [`adr/`](./adr) | 单点架构决策记录（Architecture Decision Records） | 永久、不可变；被推翻就写新 ADR 标 `Supersedes #N` | `NNNN-kebab-case-标题.md`，编号递增 |
| [`analysis/`](./analysis) | 一次性研究 / 对比 / gap 分析 | 长期保留作历史参考，但不再更新 | `YYYY-MM-DD-kebab-case-标题.md` |
| [`plans/`](./plans) | 临时实施方案、迁移步骤 | **完工即删**（git 历史还在），不留死文件 | `YYYY-MM-DD-kebab-case-标题.md` |

## 当前文档

### architecture/

- [`DESIGN.md`](./architecture/DESIGN.md)：retikz v0.1 总架构设计——分层模型、IR、Scene、AI 友好原则、跨平台策略

### adr/

（暂无；后续单点决策从这里开始编号 0001）

### analysis/

- [`2026-05-07-tikz-gap-analysis.md`](./analysis/2026-05-07-tikz-gap-analysis.md)：当前 Node / Path 能力对比 TikZ 的缺失项 + 优先级

### plans/

（暂无；写完即删）

## 写文档前先选生命周期

1. 是"为什么这么做"的单点决策？→ `adr/`，开新编号
2. 是会持续更新的架构总图？→ `architecture/`
3. 是一次性的研究 / 对比，写完不再改？→ `analysis/`，加日期
4. 是"接下来要做什么"的实施方案？→ `plans/`，完工即删

**有歧义就当 plans 写**——临时文档删起来零成本，永久目录里塞临时文档（CORE-REFACTOR / REACT-ADAPTER 的悲剧）才贵。

## superpowers/

`superpowers/` 目录下的 specs / plans 是 superpowers skill 的工作流产物，生命周期由 skill 自己管，**不要混进上面的体系**。
