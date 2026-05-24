---
name: docs-doc-review
description: retikz 文档站文档评审技能。用于在 docs-doc-principle / docs-doc-component / docs-doc-example / develop-document 产出后做独立审稿，也可单独评审 apps/docs 下已有页面。重点检查结构是否符合页型规范、是否按初级前端工程师视角写作、专业术语是否过载、TikZ / 外部生态对照是否走 Comparison / reference 展示、必要 demo / 图示是否齐全、双语与三处协同是否完整。只输出问题和修改建议，不直接改稿，除非用户明确要求修。
---

# 文档评审

本 skill 是 retikz 文档站的**独立审稿人**。它不替代写作 skill，而是在写完之后从读者角度挑问题：页面是否好读、结构是否对、demo 是否足够、进阶内容是否放在该放的位置。

## 何时用

- `develop-document` 阶段完成后，进入 wrapup 前
- `docs-doc-principle` / `docs-doc-component` / `docs-doc-example` / `docs-doc-group` 产出初稿后
- 用户单独说“审一下这篇文档 / 这个 docs 改动 / 这些 demo”
- 大规模文档重构后，想确认没有把页面写成作者自嗨的内部说明

本 skill 可以由主 AI 直接执行，也可以作为另一个写作 skill 的后置评审。默认**只评审、不改文件**；用户明确要求“顺手修掉”时，才按评审结果改稿。

## 输入

至少给出一个：

- 目标页面路径：`apps/docs/src/contents/**/index.{zh,en}.mdx`
- 本次文档 diff：`git diff -- apps/docs/src/contents apps/docs/src/data apps/docs/src/i18n`
- 相关 demo：同目录 `*.demo.tsx`
- 相关功能改动：packages 下 diff / ADR / plan TODO

若评审的是功能性改动，先读相关现有文档，不只看新文件。读不到实际功能改动时，要把判断标成“基于文档本身”，不要假装验证了实现。

## 评审标准

### 1. 页型结构

- 组件页是否符合 [`docs-doc-component`](../docs-doc-component/SKILL.md) 的 6 段顺序：Usage / Composition / Examples / How it works / API Reference / Related
- 示例页是否符合 [`docs-doc-example`](../docs-doc-example/SKILL.md) 的 6 段结构：引言 hero / Prompt / 过程 / 能力 / Limitations / Related
- 分组页是否符合 [`docs-doc-group`](../docs-doc-group/SKILL.md)：分组介绍 + 职责表 + LinkedCard 子页索引
- Reference 页是否保持词典职责：字段完整、可扫描、可链接，不写成教程
- zh / en 是否结构对齐：标题层级、表格列、示例数量、关键 bullet 数一致

### 2. 读者视角

默认读者是**初级前端工程师**：会 React / TypeScript 基础，但不熟 TikZ、IR、Scene、编译器、几何算法和项目历史。

检查：

- 页面开头是否先回答“这个能力解决什么问题 / 什么时候用”，而不是先抛内部名词
- 专业词是否过多；必要术语是否先用普通话解释，再给 API / schema 名
- 句子是否被内部词堆满，如“renderer-agnostic resource table / emit-in-compile / synthetic bbox”这类内容是否放进可选 deepdive
- 进阶内容是否用 `ComponentAlert` / tip / `How it works` 标出，并提示初次阅读可跳过
- API 表描述是否能独立读懂，还是只有作者才懂的关键词

### 3. 对照内容

- TikZ / D3 / Recharts / shadcn / 其它生态的对照，是否走 `<Comparison target="tikz">` 或页面支持的 reference / 对照组件，而不是散落在正文
- 隐藏对照块后，正文是否仍然完整自洽
- 对照内容是否客观，不写“我们更好 / 竞品做不到”
- 外部生态只在帮助读者迁移或消除困惑时出现，不为了显示知识面而出现

### 4. Demo 覆盖

- 用户需要看到效果才能理解的功能，是否有 `<ComponentPreview name="..." />`
- 新 prop / 新字段 / 新组件是否至少有一个最小 demo；复杂能力是否拆成 2-3 个单主题 demo
- demo 是否真展示了该能力，而不是只把 prop 写上但视觉上看不出差异
- 含展示文本的 demo 是否 zh / en 双语文件并行；无展示文本时单文件即可
- demo 是否可复制：不过度抽 helper、不依赖读者看不到的上下文

### 5. 图示与复杂逻辑

- 架构、数据流、多阶段流程、坐标变换、命名空间、编译管线等内容，是否有 retikz 自绘图示（通常 `<ComponentPreview hideCode />`）
- 图示是否服务理解，而不是装饰；图中标签是否少而清楚
- 图示和正文是否互相解释：正文先给读图线索，图后收束结论
- 没有图示时，是否至少用表格 / 步骤列表把流程拆开

### 6. 三处协同与可维护性

- `contents/`、`data/`、`i18n/` 是否同步
- 页面路由、目录段、data id 是否一致
- API 表是否与当前 props / schema 一致
- Related 链接是否存在，是否链到最有帮助的下一页
- 新文档是否避免引用本地路径给普通用户看；需要引用项目设计文档时用 GitHub URL

## 输出格式

按严重度输出，先问题后总结：

```md
BLOCKING（必须修）：
- [结构] apps/docs/src/contents/.../index.zh.mdx:42
  问题：...
  为什么影响读者：...
  建议：...

WARNING（建议修）：
- [读者视角] ...

INFO（做得好的地方 / 可保留）：
- ...

建议补充的 demo / 图示：
- ...

结论：
- 通过 / 不通过
```

严重度判定：

- **BLOCKING**：结构不符合页型、zh/en 明显不一致、API / demo 与实际行为冲突、必要 demo 缺失、初级前端读者无法理解主线
- **WARNING**：术语偏多但还能读、进阶内容位置不佳、Related 不够好、demo 可更聚焦
- **INFO**：可保留的写法、已经满足规范的地方、适合进入 changelog / review summary 的亮点

## 常见问题

- **把实现说明当用户文档主线**：先讲用户怎么用，再把内部机制放进 How it works 或 tip
- **demo 太大**：一个 demo 只演示一个能力；多能力拆多个 demo
- **正文散落 TikZ 对照**：统一放到 Comparison / reference，对照隐藏后正文仍要能读
- **API 表像源码注释**：改成用户能判断的描述，“什么时候设、设了会怎样、默认是什么”
- **进阶内容没提示可跳过**：初次阅读路径要干净，deepdive 要显式标出
