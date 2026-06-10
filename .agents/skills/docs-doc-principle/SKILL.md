---
name: docs-doc-principle
description: retikz 文档站通用规则：三处协同、双语、写作风格、DSL 优先、Comparison、自绘 demo、Reference(ZodSchema)、验证与页型分流。组件/示例/分组/blog 等细则再读对应 skill。retikz 专用。
---

# retikz 文档总原则

## 总览

retikz 文档站，1 个页面 = **3 处同步改动**：内容（`contents/`）、注册（`data/`）、文案（`i18n/`）。漏一处会 404、菜单不显示、或标题变成 i18n key 字符串。

中文是源语言，英文跟随；mdx 走 shadcn/ui 风格，但 demo 用我们自己的 `<ComponentPreview>`。

## 使用时机 + 分流

所有 docs 改动都**先读本 skill** 拿通用规则，再按页型分流到专门 skill：

| 页型 | 路径 | 分流到 |
| --- | --- | --- |
| 组件页 | `contents/<module>/components/**` | [`docs-doc-component`](../docs-doc-component/SKILL.md) |
| 示例页 | `contents/<module>/examples/**` | [`docs-doc-example`](../docs-doc-example/SKILL.md) |
| 分组落地页 | 带 children 的分组节点（`components/node`、`reference/schema` 等） | [`docs-doc-group`](../docs-doc-group/SKILL.md) |
| 概念页 | `contents/<module>/concepts/**` 叶子页 | [`docs-doc-concept`](../docs-doc-concept/SKILL.md) |
| 入口页 | `introduction` / `get-start` | 本 skill 的「入口页例外」节 |
| Reference 词典页 | `contents/<module>/reference/**` | 本 skill 的「Reference 词典页」节 |
| 博客文章 | `contents/blog/**` | [`docs-doc-blog`](../docs-doc-blog/SKILL.md)（差异较大，blog skill 独立成体；通用规则仍继承本 skill） |
| 文档评审 | 任意文档初稿 / 改稿 / demo 补充后 | [`docs-doc-review`](../docs-doc-review/SKILL.md) |

本 skill 也直接覆盖：i18n 改 key、改菜单、改正文、加 demo 这类"对页结构无大改"的杂活。

## 三处协同的目录

```
apps/docs/src/
  contents/<moduleId>/<sectionId>/<pageId>[/<subPageId>]/
    index.zh.mdx          # 中文正文（必填）
    index.en.mdx          # 英文正文（必填）
    <demo-name>.demo.tsx  # 被 <ComponentPreview name="..."> 引用（按需）
  data/
    module.ts             # 顶层 module 列表（core / flow / plot）
    core.ts               # core module 的 sections + pages 树
    interface.ts          # Section / Page / SubPage / I18nKey 类型
  i18n/locales/
    zh.json               # 文案源（I18nResources = typeof zh）
    en.json               # 英文，由 I18nResources 类型反向约束
```

路由：`/:moduleId/:sectionId/:pageId(/:subPageId)?`。URL 段 == 目录段 == 数据节点 `id`，三处必须严格一致。

## 加叶子页面：完整步骤

以加 `core/profile/get-start` 为例（已有 `core` module 与 `profile` section）：

1. **i18n key 先行**（类型才能通）
   - `i18n/locales/zh.json`：在 `core` 命名空间下加 `"getStart": "快速开始"`
   - `i18n/locales/en.json`：相同位置加 `"getStart": "Get Started"`
2. **加内容**
   - `contents/core/profile/get-start/index.zh.mdx` + `index.en.mdx`
   - 顶部 frontmatter：`title`（与 i18n label 一致）+ `description`（一句话，渲染在 H1 下方）
3. **注册数据**
   - `data/core.ts` 找到 `id: 'profile'` 的 section，往 `pages` 里加：
     ```ts
     { id: 'get-start', label: 'core.getStart' }
     ```
   - `id` 必须等于目录段；`label` 是完整 i18n 路径，由 `I18nKey` 类型约束（拼错编译就报）

加分组（带 children 的非叶子）：在父节点加 `children: Array<SubPage>`。分组**有自己的落地页** `index.{zh,en}.mdx`（侧栏点分组主体进落地页、点右侧 chevron 展开子项）——写法见 [`docs-doc-group`](../docs-doc-group/SKILL.md)。

## 漏改对照

| 漏掉 | 现象 |
| --- | --- |
| i18n key | TS 编译失败：`label` 类型不匹配 `I18nKey` |
| mdx 文件 | URL 直访进入 not found / 占位状态，或当前语言回退到另一份正文 |
| data 注册 | 侧边栏看不到；URL 直访 → "页面不存在" |
| index.zh.mdx / index.en.mdx 缺一份 | 切到该语言时回退到另一份；普通文档要补齐；blog 的 en 可按 blog 规则选填 |

## 中英规则

**zh 是 source of truth；en 跟随。**

- 编辑文档时若 zh / en 已不同步：以 zh 重写 en
- 翻译可在不损失语义前提下本地化（标题、列表数量、表格列保持一致）
- 中文页标题默认**不要**写括号英文（如 `自定义形状（Custom Shapes）`、`例子（Examples）`、`形状定义（ShapeDefinition）`）。只有英文名本身是用户必须识别的契约时才保留，例如 schema / 类型 / API 名称：`NodeSchema`、`ShapeDefinition`、`CompileOptions.shapes`、`ScenePrimitive`。这类英文更适合放在正文首段或 API 表里解释，而不是塞进每个中文标题。
- **代码与 index.zh.mdx 不一致**：停下来询问用户，不要自行选边——两边都过期的情况都见过
- 新增 i18n key：先加 `zh.json`，再加 `en.json`，顺序固定

## 写作风格

默认读者是**初级前端工程师**：会 React / TypeScript，能读 JSX，但不熟 TikZ、IR、几何术语和项目历史。先讲“解决什么问题 / 怎么用 / 怎么判断”，再引入专名。

写作原则：

- **短**：段落最多 3 行；能用表格、demo、代码块表达的，不写长段落。
- **先场景后术语**：先说用户会遇到什么，再命名 `ShapeDefinition` / `ScenePrimitive` 等概念。
- **先行为后内部**：用户文档解释结果和用法；内部原理放 `How it works`、`ComponentAlert` 或 Reference。
- **中性**：不写“竞品做不到 / 我们更好”；对照内容放 `<Comparison>`。
- **少形容词**：“非常 / 极其 / 强大”这类无信息词直接删。

| 内容 | 优先形式 |
| --- | --- |
| 用法 / 效果 | `<ComponentPreview>` |
| API / 配置 / 命令 | 代码块或表格 |
| 对比 / 状态映射 | 表格 |
| 步骤 / 并列要点 | 列表 |
| 必要的“为什么” | 短段落 |

## DSL 优先，IR 克制

retikz 文档面向**用户**——用户写的是 DSL（`<Layout>` / `<Node>` / `<Path>` / `<Draw>` 等 JSX）。正文以 DSL 用法为主；IR 是底层的持久化 / AI 生成中间表示，对用户**默认隐藏**，只在以下场景下出现：

- 介绍页 / 设计哲学页里讲整体架构
- 持久化、`<Layout ir={...}>` 直喂、AI 接入相关章节
- 该组件的行为只能借 IR 解释清楚（如"Sugar 编译期展开为 Kernel"这种 Sugar 与 Kernel 关系的引子）

普通用法页**不要**为了"完整"硬塞 IR JSON 节录或字段表——`<ComponentPreview>` 的 IR Tab 已经把"想看的人能看"留好了，不必正文复述。编译器内部（`compileToScene` / Scene primitive）一律不进用户文档。

## 不引用第三方外链

mdx 正文里不主动加任何指向第三方网站的链接（zod 官网、RFC、第三方库主页、博客等）。需要时由维护者自己加。

**例外（GitHub 仓库内文件可链）**：如果确实要引用项目仓库内的设计文档 / SKILL / AGENTS / ADR，用 GitHub 完整 URL 作超链接，让用户能点进去：

```mdx
详见 [core-design.md §7](https://github.com/Pionpill/retikz/blob/main/notes/architecture/core-design.md)
```

GitHub URL 是这条规则的**例外**——它指向项目自家 repo，对用户来说是可达的"项目延伸阅读"，与第三方外链性质不同。

**不要在 mdx 中暴露项目结构路径**（文件名 / 目录路径）——文档站用户看不到也点不到。例如不要写"详见 `notes/architecture/core-design.md` §7"或"参 `.agents/skills/...`"——用户读到这种描述只能去仓库 / 本地手动找。仅与"项目目录约定"相关的纯文字描述（如"ADR 起新文件用 `cp _template.md ...`"）可以保留路径作为 inline code，因为这是给已经在用 retikz 的人看的操作说明。

## 对照内容 (Comparison)

涉及 TikZ / Recharts / shadcn / D3 / 其它外部生态的对照、迁移提示、写法映射时，必须使用 `<Comparison>` 组件，不要把对照内容直接写在正文段落里。正文在隐藏所有对照块后仍应自洽完整；对照块只是给有相关背景的读者补充参照。

当前只注册了 `target="tikz"`；新增其它 target 前，先扩展 `ComparisonTargets`、Header 菜单与 i18n 文案。

写法约束：

- 一个 `<Comparison>` 块只服务一个 target，不要在同一块里混写多个生态
- 内容保持短：优先一段映射、一小段代码或一张紧凑表格
- 迁移/对照不改变正文主线，不在正文里写"对应 TikZ ..."这类散落句子
- 只有页面主题本身就是 TikZ 迁移指南时，正文才可以直接讨论 TikZ

## 图文结合，多配图

**优先图文结合、提高配图密度**——能用图说清的就配图，别堆纯文字。文档站既是教材也是 retikz 的活体演示,图多 = 演示多,默认姿势是「一段讲解配一张图」而非「整页文字偶尔插图」:

- 组件页：每个能力点 / 关键 prop 尽量配一个 `<ComponentPreview>` demo，而不是只用文字 + API 表描述
- 概念 / 设计页：每个模型 / 流程 / 关系尽量配一张叙述图（详见 [`docs-doc-concept`](../docs-doc-concept/SKILL.md)）
- 示例页：本就是累加式 demo，天然图文结合
- 判断信号：一屏滚下去只有文字没有图，多半是漏画了

## 图示一律 retikz 自绘

文档里的**所有可视化示例都用 retikz 自身绘制**——同级 `<name>.demo.tsx` + `<ComponentPreview name="..." />`。

- 禁止 `<img src="*.jpg|png|gif|svg" />`、截图、Mermaid、Excalidraw、draw.io 等第三方产物
- 文档站既是教材也是 retikz 的活体演示，引第三方图等于自打脸
- ASCII 框图作为**辅助叙述**允许（如 introduction 里的"IR 居中"管道图）；**演示组件用法**必须走 `<ComponentPreview>`
- 极少数确实需要外部图（screenshot、流程截图等），先在 PR 里说明理由

两种用法区分：

| 用途 | hideCode | 例 |
| --- | --- | --- |
| **演示组件用法**（"`<Node>` 长这样、props 这样配") | `false`（默认） | components/* 下每页的用例 demo |
| **叙述性插图**（架构图、流程图、概念示意——retikz 当配图工具用） | `true` | introduction / concepts 页里画 IR pipeline、anchor 体系、坐标系等 |

判断方法：用户看到这张图是想"复制源码学怎么写"还是"看懂这个概念"——前者保留源码、后者 `hideCode`。

**画叙述性插图时的具体惯例**（`stroke="none"` 当文字锚点、连线靠 id、宽度限制、双语 demo 拆分条件、模板代码等）走专门的 [`docs-figure-draw`](../docs-figure-draw/SKILL.md) skill；本文只管"什么时候用哪种"，不重复画法细节。

## 演示位置 / 关系类 demo

主题是位置、引用、关系（OffsetPosition / AtPosition / `<Coordinate>` / Sugar way / `step.to` 等）时，demo 要小而清楚：

- 优先用 `<Draw way={['A', 'B']} />`，除非页面本身在讲 `<Path>` / `<Step>`。
- 锚点 Node：`id` 用大写 `A/B/C`，children 用小写 `a/b/c`，文字保持默认色。
- 不把“右 80 下 30”“cartesian+offset”这类位置说明写进 Node；放正文或边标注。
- 边标注可用淡色 `textColor="#888"`，不要降低整条 path 的层级来弱化文字。
- 一个 demo 只演示一件事；两个节点能讲清就不要放四个。

边界：

| 用途 | 规则 |
| --- | --- |
| 叙述性插图 | 走 `docs-figure-draw`，`hideCode`，Node 可 `stroke="none"` |
| 位置 / 关系用法演示 | 保留 Node 默认外框，Node 也是 demo 主体 |
| Node 视觉特性演示 | 按组件页主题自由设计 |

## 文档宽度限制

文档正文最大宽度 **640px**（`max-w-160`）；表格 `<td>` 默认 `whitespace-nowrap`——**单元格不会自动换行**，过长会触发横向滚动。

表格优先 3 列以内，单元格 ≤ 12 个中文字 / 25 个英文字符；过长用 `<br />` 软断或拆成段落。单元格内 `|` 写 `\|`。代码块、URL、长英文术语也要人工检查窄屏。

## 阅读时间与页面类型

| 页面类型 | 例子 | 阅读时间约束 | 处理方式 |
| --- | --- | --- | --- |
| 教程类文章 | `core/get-start`、线性 tutorial、迁移步骤、`examples/*` | **尽量 ≤ 10 分钟，且不可超过 15 分钟** | 超过 10 分钟先压缩叙述 / 拆步骤；接近 15 分钟必须拆页或改成多篇 guide |
| 字典类文章 | `components/*`、组件 API 页、能力查阅页 | **尽量 ≤ 15 分钟；特殊情况下可超过** | 超过 15 分钟时必须有清晰 TOC、主题分组、API 表和可跳读小节；若多个主题互不依赖，优先拆子页 |
| Reference / Schema | `core/reference/schema/*` | 不按完整阅读时间限制 | 以查询效率为准：字段表完整、锚点稳定、中英文结构一致 |

页面同时承担教程 + 字典时，先保证教程主线在 10 分钟内；额外查阅放 Reference / API / 子页。

## 入口页例外

- **入口页**（`introduction`、`get-start`）有自己的章节布局（介绍 / 安装 / 步骤……），不强制走组件页的 5 段结构
- **概念页**（`concepts/**` 叶子页）走 [`docs-doc-concept`](../docs-doc-concept/SKILL.md)：一概念一 H2、图文结合、按模块语境解释内部模型（不强行套 core 的 IR/Scene）、保持当前版本、延伸阅读 LinkedCard

## Reference 词典页 (`<ZodSchema>`)

`apps/docs/src/contents/core/reference/schema/<page>/index.{zh,en}.mdx` 用 `<ZodSchema name="XxxSchema" descriptions={{...}} />` 渲染字段表。Reference 只做 schema 查询入口：字段完整、可扫描、可链接；教程、JSON walkthrough、ComponentPreview 放组件页/概念页/示例页。

规则：

- `name` 必须注册在 `apps/docs/src/lib/schema-registry.ts`；字段名、类型、必填、英文描述来自源码 `.describe()`。
- `index.zh.mdx` 必传 `descriptions` 覆盖中文；`index.en.mdx` 不传。
- anonymous object 子字段会平铺，中文描述必须用点路径（如 `font.family`、`label.text`）；漏写会在控制台 warn。
- 合并页标题的 rehype-slug 要与 registry URL 一致；`CirclePath` 的自动锚点是 `#circlepath`，不是 `#circle-path`。

当前常见点路径：

| 父 schema.字段 | 嵌套 schema | 子字段 |
| --- | --- | --- |
| `NodeSchema.font` | FontSchema | family, size, weight, style |
| 8 个 step variant 的 `label`（Line / Fold / Curve / Cubic / Bend / Arc / CirclePath / EllipsePath） | StepLabelSchema | text, position, side |

加新 schema：

1. 确认 schema 在 `@retikz/core` `index.ts` 已 export
2. `apps/docs/src/lib/schema-registry.ts` 加一行（含 schema instance + label + URL；URL 是合并页 + `#anchor` 或独立页）
3. 在合适的合并页 mdx 加 H2/H3 + `<ZodSchema name="..." descriptions={{...}} />`；zh 必须含所有字段（+ 嵌套点路径）；en 只写 `<ZodSchema name="..." />`
4. **如果是新增独立页**（不属于现有 4 合并页）：在 `data/core.ts` reference section 加 children 条目 + i18n 加 `core.refXxxSchema` key
5. 跑 `pnpm --filter @retikz/docs exec tsc --noEmit`，再起 dev 看控制台 warn；需要验证站点产物时再跑 `pnpm --filter @retikz/docs build`

## 与 shadcn 的差异

| | shadcn/ui | retikz |
| --- | --- | --- |
| Demo 引用组件 | `<ComponentPreview name=...>` + `<ComponentSource name=...>` | 仅 `<ComponentPreview name=...>`（合二为一） |
| Demo 文件名 | `<name>-demo.tsx` | `<name>.demo.tsx`（**点号**后缀） |
| Demo 位置 | 集中在 `registry/` | mdx **同级目录** |
| Demo 形态 | 任意 React 组件 | `default export` 的**纯 FC**，**不能用 hooks**（IR 视图会调用一次该组件） |
| 双语 | 单语言 | 同目录 `index.zh.mdx` + `index.en.mdx` |
| 代码 Tab | React 源码 | React 源码 + IR JSON + Vanilla builder 代码（IR / Vanilla 均自动算） |

`ComponentPreview` 常用 props：

| prop | 用法 |
| --- | --- |
| `name` | 同级 `<name>.demo.tsx` 的 stem，必填；语言版优先 `<name>.zh.demo.tsx` / `<name>.en.demo.tsx` |
| `size` | 渲染区高度：`xs` / `sm` / `md` / `lg` / `xl` / `xxl` / `xxxl`，默认 `md` |
| `hideCode` | 叙述性插图开；演示组件用法保持默认 |
| `sourceFiles` | 额外展示的同级源码文件，如 `.data.ts` / helper；示例页多文件 diff 见 `docs-doc-example` |
| `diffFrom` | 示例页 step 对比上一份 demo 的 React 源码新增行 |
| `interactive` | demo 确需 hooks / 异步时才开；默认跳过静态 IR / Vanilla 视图，可配 `previewIR` 或 `<name>.ir.json` 恢复 IR 视图 |
| `replayable` / `actions` / `overlays` | 动画或自定义工具才用；普通文档不要碰 |

### 代码视图：React / IR / Vanilla

`ComponentPreview` 默认展示三套视图：

| 视图 | 来源 |
| --- | --- |
| React | `<name>.demo.tsx` 原文 |
| IR | 静态执行 demo 后由 `buildPreviewIR` 派生 |
| Vanilla | 从同一份 IR 自动 codegen；需要更地道写法时用 `<name>.vanilla.ts` 覆盖 |

不要为了“只演示 React”省掉 Vanilla 视图。`interactive` demo（hooks / 异步）是例外：默认只保留 React；若需要 IR Tab，可 `export const previewIR` 或提供 `<name>.ir.json`。

### demo 数据文件

数据来源和取数逻辑不要内联在 `.demo.tsx`，统一抽到同级 `.data` 文件，并通过 `sourceFiles` 展示：

| 场景 | 规则 |
| --- | --- |
| 单数据集 | `<demo>.data.ts` |
| 多数据集 | `<demo>.<dataset>.data.ts` |
| 接线 | `.demo.tsx` import 数据；mdx 写 `sourceFiles={['<demo>.data.ts']}` |
| 写死数据 | 普通 `export const`，React 与 `<name>.vanilla.ts` 可共用 |
| 远程数据 | React hook 放 `.data.ts`；vanilla 远程取数单独文件，不共用 React hook |

## MDX 可用元素

- GFM markdown（表格、列表、引用、链接、围栏代码块）全部支持
- 围栏代码块带语言后会上语法高亮；写 `` ```tsx showLineNumbers `` 开行号
- 行内 `<a href>`：`/` 开头自动走 react-router `<Link>`；`http(s)://` 开头自动 `target="_blank"`
- 自定义 JSX：
  - `<ComponentPreview ... />` —— 组件 / 示例 / 概念页 demo 都用
  - `<ZodSchema ... />` —— Reference 词典页用，详见上文「Reference 词典页」
  - `<Comparison ... />` —— 外部生态对照内容用，当前只支持 `target="tikz"`
  - `<ExamplePrompt ... />` —— 示例页 AI Prompt 节用，见 [`docs-doc-example`](../docs-doc-example/SKILL.md)
  - `<ComponentAlert type="tip|warn|error" title="..." description="..." />` —— 文档提示块，只传 `title` 和 `description`；`type` 省略时默认为 `tip`

### `<ComponentAlert>` 使用边界

`ComponentAlert` 用于把正文里的提示 / 警告 / 错误用法从普通段落中分离出来。它不承载长篇教程，不替代 `<Comparison>`，也不替代真实 demo；如果提示内容超过 2-3 句，优先拆成正文小节或表格。

| type | 用途 |
| --- | --- |
| `tip` | 提示、用法建议、文档阅读顺序、文档建议 |
| `warn` | 警告、非规范用法、组件错误用法、性能 / 内存问题 |
| `error` | 错误、明确错误用法 |

## Quick Reference

| 任务 | 改动 | 也要读 |
| --- | --- | --- |
| 加叶子页 | i18n × 2 + `contents/.../index.{zh,en}.mdx` + 在 `data/<module>.ts` 注册 `{ id, label }` | 按页型分流 |
| 改正文 | `contents/.../index.{zh,en}.mdx`（双语都要；blog 例外按 blog skill） | — |
| 改菜单 / 标题文案 | `i18n/locales/{zh,en}.json`（双语都要） | — |
| 加一个 demo | 同级写 `<name>.demo.tsx` + 在 mdx 里 `<ComponentPreview name="<name>" />` | — |
| 加菜单图标 | `data/core.ts` 的 `Page.icon`（仅一级 Page 支持） | — |
| 新建 module | `data/module.ts` 加条目 + 新建 `data/<module>.ts` + i18n 加新命名空间 | — |
| 加分组节点 | 父节点加 `children` + 写分组落地页 `index.{zh,en}.mdx` | [`docs-doc-group`](../docs-doc-group/SKILL.md) |
| 加新 IR schema 字典 | 注册到 `lib/schema-registry.ts` + 合适合并页加 `<ZodSchema>` 块（含 zh 嵌套点路径） | — |
| 写 TikZ 对照 | 用 `<Comparison target="tikz">` 包起来，不写进普通正文 | — |
| 加组件页 | — | [`docs-doc-component`](../docs-doc-component/SKILL.md) |
| 加示例页 | — | [`docs-doc-example`](../docs-doc-example/SKILL.md) |

## Common Mistakes

- **mdx 顶部又写 `# 标题`** —— H1 走 frontmatter，再写一遍会出现两个标题
- **demo 用 hooks** —— `ComponentPreview` 的 IR 视图会直接 `Component({})` 调用一次，hooks 在非渲染路径中会触发 React 错误
- **demo 文件名写成 `<name>-demo.tsx`** —— 我们用 `.demo.tsx`，glob 匹配不到，会显示 "Demo not found"
- **`<ComponentPreview src=...>`** —— 沿用 shadcn 写法。我们的 prop 是 `name`，不接受 `src`
- **`<ZodSchema>` 漏写嵌套字段点路径** —— `Node.font` / Step 各 variant 的 `label` 等嵌套 object 必须用 `'font.family'` / `'label.text'` 等点路径补完所有子字段中文，否则中文页该子行残留英文 `.describe()`
- **`<ZodSchema>` 的 name 不在 registry** —— 渲染会显示 "Unknown schema" 红框；新加 schema 必须先在 `apps/docs/src/lib/schema-registry.ts` 注册
- **只加一边 i18n** —— `en` 由 `I18nResources = typeof zh` 类型反向约束，少一个 key 就编译失败
- **`label` 写成 `'core/getStart'` 或 `'getStart'`** —— 必须是 `'<ns>.<key>'` 完整路径，`I18nKey` 类型会卡你
- **改 `id` 不改目录** —— `id` 决定 URL 段、决定 mdx 加载路径、决定 sidebar 的 key，三者强耦合
- **写成连续的大段文字** —— 优先表格 / 示例 / 代码块；段落超过 3 行就拆
- **写防御性 / 攻击性内容** —— "竞品做不到 / 我们更好"等段落直接删，正向表述自身能力即可
- **普通用法页大段讲 IR 结构 / 字段** —— IR 是后端 / AI 用的隐藏层，正文说 DSL 即可；要看 IR 的用户点 `<ComponentPreview>` 的 IR tab
- **把 TikZ / 外部生态对照散落在正文** —— 用 `<Comparison>` 可选显示；隐藏对照后正文仍要完整
- **塞 jpg / png / Mermaid / 截图当演示** —— 演示用 `<ComponentPreview>` + retikz 自绘；ASCII 框图作辅助叙述可以

## 验证

加完一页之后，最少跑这两步：

```bash
pnpm --filter @retikz/docs exec tsc --noEmit
pnpm --filter @retikz/docs dev     # 浏览器打开新页，确认中英、demo、TOC、菜单都对
```

需要验证站点产物或 CI 等价路径时再跑 `pnpm --filter @retikz/docs build`（docs 包的本地 AGENTS 允许；不要把它当日常类型检查的替代）。

### 超链接自检

写完文档（含改动 / 新页）后**逐条复核所有超链接是否可达**，TS / build / 自动测试都挡不住，断链一旦出现是用户体验灾难。重点检查：

| 类别 | 检查方法 |
| --- | --- |
| **页内锚链接**（`#xxx`） | 每一条都跳得到对应 H1-H3；CJK / 含 `+ - ° :` 的标题别手写 slug，用 github-slugger 跑一下：`cd apps/docs && node -e "import('github-slugger').then(({default:S})=>console.log(new S().slug('<标题>')))"` |
| **站内路径**（`/core/...`） | 路径段必须命中 `data/<module>.ts` 里实际注册的 `{ id }` —— 改名 / 重组目录后所有外部文档 link 一起改；最简单做法是搜全仓 `rg "/core/old-path"` |
| **GitHub URL** | 仓库根 / branch / 路径都对（默认 `main`）；本地复制 GitHub URL 时容易把 `blob/<commit>/...` 黏进去——必须改回 `blob/main/...` |
| **能力节 step 锚** | 示例页能力节第三列每个 `[N](#<H3-slug>)` 都要跳到对应 step H3，slug 与 github-slugger 输出一致 |
| **components/ 跳转** | 每条 `[X](/core/components/...)` 都落到现有页 —— 组件改名 / 移位时一起改 |

zh 和 en 两份 mdx **分别**检查（很多链接在两边目标 slug 不同）。改完批量改动后用浏览器开页直接挨个点是最稳的兜底。
