---
name: docs-doc-review
description: Use when independently reviewing retikz docs pages or docs diffs for page-type structure, reader clarity, source-backed API claims, demo coverage, bilingual parity, and navigation integrity.
---

# 文档评审

本 skill 是 retikz 文档站的**独立审稿人**。它不替代写作 skill，而是在写完之后从读者角度挑问题：页面是否好读、结构是否对、demo 是否足够、进阶内容是否放在该放的位置。

## 何时用

- `develop-document` 阶段完成后，进入 wrapup 前
- `docs-doc-principle` / `docs-doc-component` / `docs-doc-extension` / `docs-doc-example` / `docs-doc-group` 产出初稿后
- 用户单独说“审一下这篇文档 / 这个 docs 改动 / 这些 demo”
- 新增页面或大规模文档重构后，确认没有把页面写成作者自嗨的内部说明

普通文档审查可以由主 AI 直接执行。新增页面或命中 `docs-doc-principle`“大改”条件时，必须由一个新的只读 subagent 在改稿与机械验证完成后独立执行；主 agent 自评不能替代。默认**只评审、不改文件**；用户明确要求“顺手修掉”时，才按评审结果改稿。

## 输入

至少给出一个：

- 目标页面路径：`apps/docs/src/modules/docs/contents/**/index.{zh,en}.mdx`
- 本次文档 diff：`git diff -- apps/docs/src/modules/docs/contents apps/docs/src/modules/docs/data apps/docs/src/i18n`
- 相关 demo：同目录 `*.demo.tsx`
- 相关功能改动：packages 下 diff / ADR / plan TODO

若评审的是功能性改动，先读相关现有文档，不只看新文件。读不到实际功能改动时，要把判断标成“基于文档本身”，不要假装验证了实现。

## 评审标准

### 1. 页型结构

- 组件页是否符合 [`docs-doc-component`](../docs-doc-component/SKILL.md) 的 5 类 section 顺序：Usage / Examples / How it works / API Reference / Related
- 是否照搬了独立的 Composition 顶级章节；必要组合关系是否就近放在 Usage 骨架、Examples 用法或 How it works 机制中
- 扩展指南是否符合 [`docs-doc-extension`](../docs-doc-extension/SKILL.md)：适用边界 / 定义 / 注入 / 执行机制 / 错误与限制 / API / 相关，并证明内置与自定义同路
- 示例页是否符合 [`docs-doc-example`](../docs-doc-example/SKILL.md) 的 6 段结构：引言 hero / Prompt / 过程 / 能力 / Limitations / Related
- 分组页是否符合 [`docs-doc-group`](../docs-doc-group/SKILL.md)：分组介绍 + 职责表 + LinkedCard 子页索引
- Reference 页是否保持词典职责：字段完整、可扫描、可链接，不写成教程
- 中文 Reference 的 object `<ZodSchema>` 是否用 `descriptions` 覆盖全部字段与匿名对象点路径；只有顶层 `description`、字段仍回退英文 `.describe()` 均不算完成
- 英文 Reference 是否直接复用源码 `.describe()`，不重复维护 `descriptions`
- zh / en 是否结构对齐：标题层级、表格列、示例数量、关键 bullet 数一致

### 2. 读者视角

默认读者是**初级前端工程师**：会 React / TypeScript 基础，但不熟 TikZ、IR、Scene、编译器、几何算法和项目历史。

检查：

- 按首次阅读顺序逐段走读，不用作者已知背景替读者补齐省略的前提
- 页面开头是否先回答“这个能力解决什么问题 / 什么时候用”，而不是先抛内部名词
- 专业词是否过多；逐项列出未解释或解释过晚的术语，必要术语是否先用普通话解释，再给 API / schema 名
- 相邻段落或小节之间是否存在概念跳跃；读者是否需要提前知道尚未介绍的类型、机制或项目约定
- 顺序是否从场景与可观察结果进入用法和概念，再深入机制、落点与 API；内部实现是否过早打断主线
- 句子是否被内部词堆满，如“renderer-agnostic resource table / emit-in-compile / synthetic bbox”这类内容是否放进可选 deepdive
- 进阶内容是否用 `ComponentAlert` / tip / `How it works` 标出，并提示初次阅读可跳过
- API 表描述是否能独立读懂，还是只有作者才懂的关键词
- 读者沿主线是否能完成第一个可运行结果；示例、图和表是否在抽象概念出现时及时提供支撑
- `frontmatter.description` 是否能脱离页面独立说明根问题与核心职责或使用入口，供 manifest / `llms.txt` 直接作为机器摘要使用

### 3. 核心设计与内容权重

- 核心功能必须作为页面主线，重点说明根问题、核心抽象、职责边界和用户可感知的能力闭环；不能与次要能力平均分配篇幅，也不能按 prop 数量组织正文
- 分组页是否说明成员如何协作，以及本家族明确不负责什么；开放能力是否能看出统一扩展入口
- 组件页是否把语义、结构、组合、边界 case 与错误行为作为主要示例
- 成熟绘图库普遍具备的通用功能，以及边框色、背景色、线宽、透明度、尺寸等基础样式，是否只做简要说明并保留 API 查询入口；不要挤占核心功能篇幅
- 同一任务与 JSX 结构下仅参数取值不同的案例，是否合并为 controls playground，让用户通过操作感知变化；不同结构、组合关系、职责边界、错误或编译机制仍由静态 demo 讲清
- 是否错误地用 demo 数量、视觉变体数量或 prop 覆盖率证明能力完备

### 4. 对照内容

- TikZ / D3 / Recharts / shadcn / 其它生态的对照，是否走 `<Comparison target="tikz">` 或页面支持的 reference / 对照组件，而不是散落在正文
- 隐藏对照块后，正文是否仍然完整自洽
- 对照内容是否客观，不写“我们更好 / 竞品做不到”
- 外部生态只在帮助读者迁移或消除困惑时出现，不为了显示知识面而出现

### 5. Demo 覆盖

- 用户需要看到效果才能理解的功能，是否有 `<ComponentPreview files="..." />`
- 新 prop / 新字段 / 新组件是否至少有一个最小 demo；复杂能力是否拆成 2-3 个单主题 demo
- demo 是否真展示了该能力，而不是只把 prop 写上但视觉上看不出差异
- 含展示文本的 demo 是否 zh / en 双语文件并行；无展示文本时单文件即可
- demo 是否可复制：不过度抽 helper、不依赖读者看不到的上下文
- 大量仅参数变化的静态 demo 是否已收敛为 controls；评审者要实际操作代表性字段，确认变化肉眼可辨，无效或难以感知时重做场景而不是追加文字解释
- 带 controls 时完整套用 [`docs-doc-control`](../docs-doc-control/SKILL.md) 的契约、取景、极值、Reset、caption、视觉层级和真实页面验证；本 skill 不复制其检查项
- 使用多文件、数据文件或动态源码派生时，套用 [`ComponentPreview 按需契约`](../docs-doc-principle/references/component-preview.md)

### 6. 图示与复杂逻辑

- 架构、数据流、多阶段流程、坐标变换、命名空间、编译管线等内容，是否有 retikz 自绘图示（通常 `<ComponentPreview hideCode />`）
- 图示是否服务理解，而不是装饰；图中标签是否少而清楚
- 图示和正文是否互相解释：正文先给读图线索，图后收束结论
- 没有图示时，是否至少用表格 / 步骤列表把流程拆开

### 7. 三处协同与可维护性

- `contents/`、`data/`、`i18n/` 是否同步
- 页面路由、目录段、data id 是否一致
- API 表是否与当前 props / schema 一致
- API 表中的函数、类型和常量是否从所属包根入口真实可导入；是否把概念简称或内部类型误写成公共 API
- 组件 Props、schema、owner barrel 与 package root 是否形成可追溯导出链
- 宿主/容器页是否漏掉 owner barrel 中完成任务所需的 Provider、Context、hook 或 helper；共享继承 props 是否只做一行摘要并指向权威页
- Related 链接是否存在，是否链到最有帮助的下一页
- 新文档是否避免引用本地路径给普通用户看；需要引用项目设计文档时用 GitHub URL

### 8. 链接有效性

先运行 `docs-doc-principle/scripts/check-doc-integrity.mjs --scope <scope>`，不要人工重复可机械检查的双语配对、站内路由/锚点、demo 文件和 SourceLinks 行号。评审者继续负责脚本无法判断的部分：链接语义是否正确、SourceLinks 是否覆盖真正决策分支、HTTP(S) 目标是否仍匹配正文、zh/en 含义是否一致。

### 9. 真实页面视觉复核

结构、内容和链接检查完成后，必须打开真实 docs 页面再下结论。运行在 Codex desktop 时，优先在应用内浏览器侧边栏打开目标路由，以实际侧栏宽度检查窄屏阅读；条件允许时再补常规桌面宽度。

检查：

- 首屏是否突出标题、定位和核心功能，通用说明、API 与 deepdive 没有抢占主视觉
- 标题层级、段落密度、留白和内容节奏是否便于扫描，表格、代码块、LinkedCard 是否溢出或拥挤
- demo 的主体比例、取景、caption 与代码区是否协调；controls 面板打开后是否可操作，并能通过代表性字段直接感知变化
- zh / en 的文本长度是否造成不同的换行、遮挡或布局跳动；本次涉及主题或响应式行为时一并切换验证

根据真实效果判断是否继续优化：影响理解、遮挡内容、交互不可达或核心 demo 难以辨认记为 BLOCKING；层级、密度、留白或构图仍可改善但不妨碍使用记为 WARNING。不要只凭源码、截图尺寸或测试通过宣称视觉通过，也不要为没有读者收益的纯主观微调扩大范围。

若浏览器或本地 dev 环境不可用，明确写“视觉复核未执行”及原因；此时可以给出结构评审结论，但不能宣称完整视觉通过。

## 输出格式

按严重度输出，先问题后总结：

```md
BLOCKING（必须修）：

- [结构] apps/docs/src/modules/docs/contents/.../index.zh.mdx:42
  问题：...
  为什么影响读者：...
  建议：...

WARNING（建议修）：

- [读者视角] ...

INFO（做得好的地方 / 可保留）：

- ...

建议补充的 demo / 图示：

- ...

视觉复核：

- 已执行：Codex 侧边栏 / 桌面宽度；通过 / 需优化
- 可继续优化：... / 无

结论：

- 通过 / 不通过
```

严重度判定：

- **BLOCKING**：结构不符合页型、zh/en 明显不一致、中文 `<ZodSchema>` 字段缺少翻译而回退英文、API / demo 与实际行为冲突、必要 demo 缺失、核心职责或边界缺失导致读者无法理解主线、链接 404 / 锚点失效 / 源码路径或行号错误
- **WARNING**：术语偏多但还能读、进阶内容位置不佳、Related 不够好、通用样式挤占正文、controls 与静态 demo 分工不清
- **INFO**：可保留的写法、已经满足规范的地方、适合进入 changelog / review summary 的亮点

每个读者视角问题都要定位到首次造成困难的位置，并给出可执行的替代表达、补充解释或章节移动建议；不要只写“术语太多”“顺序不好”。

## 常见问题

- **把实现说明当用户文档主线**：先讲用户怎么用，再把内部机制放进 How it works 或 tip
- **demo 太大**：一个 demo 只演示一个能力；多能力拆多个 demo
- **样式 demo 太多**：通用视觉属性合并进 controls / API 表，把篇幅还给核心抽象、职责边界和语义分支
- **controls 代替设计说明**：controls 只能探索稳定任务与可比较场景下的参数空间，不能隐藏不同结构、组合、职责边界或错误行为
- **正文散落 TikZ 对照**：统一放到 Comparison / reference，对照隐藏后正文仍要能读
- **API 表像源码注释**：改成用户能判断的描述，“什么时候设、设了会怎样、默认是什么”
- **进阶内容没提示可跳过**：初次阅读路径要干净，deepdive 要显式标出
- **只看链接文字不验证目标**：逐条确认路由、锚点、响应与 `<SourceLinks>` 行号仍有效
