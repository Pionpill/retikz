# Plans 索引

> retikz 临时实施方案、迁移步骤。**完工即删**（git 历史还在），不留死文件。
>
> 起新 plan：**版本专属**用 `v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>.md`（plan 比 adr 粒度粗，单文件就够）；**跨版本草案**放顶层 `kebab-case-标题.md`。

## 目录约定

```
notes/plans/
├── README.md                       ← 本文（索引）
├── docs-ai-chat-panel.md           ← 跨版本草案（顶层 kebab-case）
└── v0/                             ← MAJOR 版本目录
    ├── roadmap.md                  ← MAJOR 系列总路线
    └── v0.1-beta.1.md              ← 单版本 plan（一文件一版本，多个 ## TODO-N 段）
```

与 [`adr/`](../adr/) 对比：

- **adr** 每个版本一个目录、目录下多篇 ADR（每篇一个独立决策）
- **plans** 每个版本一个文件（多个 TODO 集中写）——plan 粒度粗、变化快、完工即删，不需要 adr 那种分篇编号永久保留

PATCH 版本不开 plan——patch 仅修 bug，不写 plan。

## 当前活跃 plans

### v0 系列

- [`v0/roadmap.md`](v0/roadmap.md) — v0 总路线（v0.1 → v0.4 → v0 收尾）+ v0.1 各 alpha 详细拆分 + v0.2 预备段（Scope / 样式 / Shape 扩展）
- [`v0/v0.1-beta.1.md`](v0/v0.1-beta.1.md) — v0.1.0-beta.1 实施待办（非破坏性优化，4 条 TODO）

### 跨版本草案

- [`docs-ai-chat-panel.md`](docs-ai-chat-panel.md) — 文档站侧边栏 AI 聊天面板设计讨论（草案 / 待续）；BYOK 浏览器直连方向

## 与 ADR 的关系

- **plans** 登记"接下来要做什么"——具体 TODO 列表 + 改动清单 + 验证项；颗粒粗、变化快、完工即删
- **adr** 登记"为什么这么做"——架构 / 接口 / 字段语义层面的单点决策；永久保留、不可变

一个 plan 的 TODO 完工通常对应一篇 ADR 落地（在该 milestone 的 [`adr/v0/v0.1-<channel>.<N>/`](../adr/v0/) 下）。两者交叉引用，但生命周期独立。
