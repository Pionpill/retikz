# Plans 索引

> retikz 实施方案、迁移步骤、版本 TODO。活跃期保留；完工后把长期信息沉淀到 roadmap / changelog / ADR / docs，纯执行稿可删除。
>
> 起新 plan：**版本专属**用 `v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>.md`（plan 比 adr 粒度粗，单文件就够）；**跨版本草案**放顶层 `kebab-case-标题.md`。

## 目录约定

```
notes/plans/
├── README.md                       ← 本文（索引）
└── v0/                             ← MAJOR 版本目录
    ├── roadmap.md                  ← MAJOR 系列总路线
    └── v0.2-beta.1.md              ← 单版本 plan（一文件一版本，多个 ## TODO-N 段）
```

与 [`adr/`](../adr/) 对比：

- **adr** 每个版本一个目录、目录下多篇 ADR（每篇一个独立决策）
- **plans** 每个版本一个文件（多个 TODO 集中写）——plan 粒度粗、变化快，不需要 adr 那种分篇编号；完工后只保留仍有版本追踪价值的计划，纯执行稿 / 迁移步骤可删

PATCH 版本不开 plan——patch 仅修 bug，不写 plan。

## 当前活跃 plans

### v0 系列

- [`v0/roadmap.md`](v0/roadmap.md) — v0 总路线与跨 minor 追踪
- [`v0/v0.2.md`](v0/v0.2.md) — v0.2 总计划与已完成 alpha / beta 跟踪
- [`v0/v0.2-beta.1.md`](v0/v0.2-beta.1.md) — v0.2 beta.1 优化窗口收口记录

### 跨版本草案

当前无活跃跨版本草案。跨版本草案落地后，需把稳定约束沉淀到对应 docs / AGENTS / architecture 文档，再删除临时 plan。

## 与 ADR 的关系

- **plans** 登记"接下来要做什么"——具体 TODO 列表 + 改动清单 + 验证项；颗粒粗、变化快，活跃期服务执行
- **adr** 登记"为什么这么做"——架构 / 接口 / 字段语义层面的单点决策；永久保留、不可变

一个 plan 的 TODO 完工通常对应一篇 ADR 落地（在该 milestone 的 [`adr/v0/v0.1-<channel>.<N>/`](../adr/v0/) 下）。两者交叉引用，但生命周期独立。若 plan 只剩执行过程记录，且长期信息已经进入 ADR / roadmap / changelog / docs，可以删除。
