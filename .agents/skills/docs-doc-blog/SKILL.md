---
name: docs-doc-blog
description: retikz 文档站「博客分区」（/blog/...）写作规则——面向程序员（多为前端开发）的设计理念 / 开发历程类文章。规定篇幅 / TL;DR / 段落风格 / ComponentPreview 优先 / 第三方外链允许 / 主观第一人称允许 / 中英流程 / 系列拆分 / 跨平台手抄约束 / 与 docs-doc-principle 的差异。写 blog mdx 前先读本文，再读 docs-doc-principle 拿继承通用规则（三处协同 / 路由 / Comparison 等不重复）。retikz 专用。
---

# retikz 博客分区规范

## 受众与定位

- **读者**：程序员，大部分做前端开发；熟 React / TypeScript / 现代构建链（Vite / pnpm / shadcn / Tailwind）
- **写作意图**：设计理念背后的「为什么」、开发过程的「踩过的坑」、版本演进的脉络——**不是** API 说明书（那是 docs 的活）
- **基调**：作者第一视角，**允许主观判断**（"做对了 / 走过的弯路"），但不写**防御性 / 攻击性**对比（"竞品 X 做不到"、"我们更好"）

## 使用时机

写 `apps/docs/src/contents/blog/<sectionId>/<slug>/index.{zh,en}.mdx` 前**先读本 skill**，再回读 [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿**通用规则**（三处协同 / 路由 / `<Comparison>` 表的 GitHub 链接惯例 / 表格宽度 640px / `<br />` 软断等不重复列举）。

本 skill **只列与 docs-doc-principle 有差异或额外补充的部分**。

## 篇幅 / 节奏

| 项 | 软上限 | 硬上限 | 超出处理 |
|---|---|---|---|
| 单篇阅读时间 | 8 分钟 | 12 分钟 | 拆成系列文章（见下文「系列文章」） |
| 单段行数 | 3 行 | — | 拆 bullet / 表格 / 代码块 |
| H2 章节数量 | 8 | 10 | 主题失焦，拆系列 |

- **每篇开头放 TL;DR**——一张紧凑表格 / callout / bullet 列表，**3–5 行**，写「这篇讲什么 + 读完拿到什么 + 谁该读」。程序员习惯先扫摘要
- **H2 / H3 标题用动词或名词短语**，不写整句：
  - ✅ 「为什么 IR 居中」
  - ❌ 「为什么我们决定把 IR 放在架构正中心」

## 写作风格

### 段落

- 单段 ≤ 3 行；超 3 行立刻拆——拆成 bullet / 表格 / 代码块 / 子小节
- 主观判断、第一人称（"我"、"我们"）允许；与 docs 的"中立工具说明书"语气区分
- **不写防御性 / 攻击性**对比；同类项目作为隐晦提及一次即可

### 形式优先级（同 docs-doc-principle，强化）

| 表达对象 | 优先形式 |
|---|---|
| 对比 / 配置 / 状态映射 / 决策权衡 | **表格** |
| 步骤 / 并列要点 / 时间线 | **有序 / 无序列表** |
| 用法演示 / 视觉效果 | **`<ComponentPreview>`** |
| API / 签名 / 配置 / 命令 / 真实历史代码 | **代码块** |
| 概念阐释、必要的"为什么" | **段落（≤ 3 行）** |

**只剩下"概念阐释"才用段落**——所有可转换为列表 / 表格 / 演示的内容，都必须转换。

## 代码与示例

### `<ComponentPreview>` 优先

- blog 文章里展示 retikz 用法 / 效果**优先嵌 `<ComponentPreview>`**——比代码块更生动
- demo 文件 `<name>.demo.tsx` **同级放在文章目录下**（与 docs 一致）
- 每个 `<ComponentPreview>` 前后**用一句话**点出"它在演示什么"——为跨平台手抄做准备（见下文「跨平台搬运」）

### 代码块约束

- **必须带语言标识**：```` ```ts ````、```` ```tsx ````、```` ```bash ````、```` ```yaml ````、```` ```json ````
- 不写虚构 / 教学伪代码——例子要么来自 **retikz 真实源码 / 真实历史 commit**，要么明确标注「仅作示意」

### 不要用的 mdx 元素

| 元素 | 原因 |
|---|---|
| `<ZodSchema>` | docs Reference 词典页专用，blog 不渲染 schema 字段表；要说某个字段用 inline code 或小表 |
| `<ExamplePrompt>` | docs 示例页 AI prompt 块专用 |

`<ComponentPreview>` / `<Comparison>` 仍可用。

## 引用规则（与 docs 的关键差异）

| | docs（principle 现行） | blog（本 skill） |
|---|---|---|
| 第三方外链 | **禁止** | **允许**——blog 是个人文字，引外部库 / 工具 / 文章合理；点到为止避免泛滥 |
| 站内跨页跳转 | react-router 路径（`/core/concepts/anchors`） | 同 |
| 项目仓库内文件（ADR / DESIGN / SKILL） | GitHub 完整 URL | 同 |
| mdx 暴露项目结构路径作为纯文字 | 禁止 | 同——用户读不到、点不到 |

## 视觉

- **所有图都 retikz 自绘**：`<ComponentPreview hideCode>` + 同级 `<name>.demo.tsx`；详细惯例去读 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)
- **禁 `<img>` 截图 / Mermaid / Excalidraw / draw.io**——blog 站和 docs 站共用 retikz 活体演示的属性
- **禁 GIF / 视频**：增加资源权重 + 程序员通常更愿读静态图 + 维护成本高
- 表格沿用 640px 宽度限制——超出靠 `<br />` 软断或压缩措辞

## Frontmatter

必填 4 字段：

```yaml
---
title: 文章标题             # 必填，由 DocPage 渲染为 H1
description: 一句话副标题    # 必填，由 DocPage 渲染为副标题（≤ 30 字）
date: 2026-05-17           # 必填，发布日期，ISO YYYY-MM-DD
tags: [设计, IR]           # 必填，1-3 个标签，字符串数组
---
```

- **`tags` 限 1-3 个**——不无限增长；**新文章优先复用已有 tag**，确实没合适的再新建
- **`date` 是发布日期**，改正文不更新；文章演进走 git 历史，blog 数据点保持稳定
- 不引入 `series` / `cover` 等额外字段——系列靠 sidebar 同 section 排列即可

## 双语策略

- `zh.mdx` **必填**，`en.mdx` **可选**——缺 en 时站内自动 fallback 到 zh 并显示「暂无英文版」提示
- AI 翻译辅助流程：作者写完 `index.zh.mdx`，由 AI 译出 `index.en.mdx` 初稿，**作者 review 术语**：
  - retikz 专有词保留原文：`Sugar` / `Kernel` / `IR` / `Scene` / `ComponentPreview`
  - TikZ 学界惯用词不能乱译：`elbow`（折角）不译成 `corner`、`anchor`（锚点）不译成 `position`
  - 中英描述保持结构对齐（同样的表格列、同样的 bullet 数量）

## 系列文章

- 单篇接近硬上限（12 分钟）就**拆系列**
- 命名按版本 / 时间 / 主题维度，不写"上篇 / 下篇"：
  - ✅ `journey/alpha-0` / `journey/alpha-1` / `journey/alpha-2`
  - ❌ `journey/post-1` / `journey/post-2`
- 系列文章**互相不在 frontmatter 引用**——靠 sidebar 同 section 排列即可

## 跨平台搬运（重要）

blog 文章预期会被作者**手抄到掘金 / 公众号 / 其它平台**。写作时要预想"去掉 retikz 专属组件后仍可读"：

| 元素 | 跨平台行为 | 应对 |
|---|---|---|
| frontmatter `---...---` | 各平台规则不一，多数不识别 | 手抄时直接删掉，正文从 `## ` 开始 |
| `<ComponentPreview>` | 外部平台不认 | **前后一句话点出 demo 在演示什么**，去掉组件后读者仍能理解 |
| `<Comparison target="...">` | 外部平台不认 | 同上：内容内嵌一句话，外部读者跳过对照块仍读得通 |
| 站内路径 `/core/...` | 外部平台访问会 404 | 手抄时改为 `https://pionpill.github.io/retikz.doc/#/core/...` 完整 URL |
| 相对图片 `./hero.png` | 外部平台拿不到 | 改 GitHub raw 绝对 URL，或上传到平台素材库 |

**手抄不是工具的事**——是写作时就把"外部读者最差视图"作为可读性下限考虑进去。

## 与 docs-doc-principle 的差异对照

| 维度 | docs | blog |
|---|---|---|
| 受众 | 全体用户（含非程序员） | 程序员（多前端） |
| 语气 | 中立工具说明 | 第一人称、主观判断 |
| 第三方外链 | 禁 | 允许 |
| 必填结构 | 组件页 5 段、示例页能力节 | 无固定段落结构，但必须有 TL;DR |
| 阅读时间软上限 | 教程 10 min / 字典 15 min | 8 min |
| ZodSchema / ExamplePrompt | 用 | 不用 |
| ComponentPreview / Comparison | 用 | 用 |
| 主观对比竞品 | 禁 | 禁（继承） |
| frontmatter | title / description | title / description / date / tags |
| 双语严格度 | zh / en 双轨缺一不可 | zh 必填，en 可选 |

## Common Mistakes

- **写成连续大段文字**——blog 受众扫读为主，超 3 行立刻拆 bullet / 表格 / 代码块
- **代码块漏写语言标识** ```` ``` ```` 后不带 `ts`/`tsx` 等——语法高亮失效
- **写虚构示例**（"假设你有一个 Foo 组件…"）——blog 例子要真实，要么 retikz 源码片段、要么真实历史 commit；想假设就明确标"仅作示意"
- **tags 写 4 个以上 / 每篇都新建 tag**——限 1-3 个，优先复用
- **`<ComponentPreview>` 前后没有一句话点题**——去掉组件后外部读者懵
- **手抄时把 frontmatter `---...---` 块一起复制进掘金 / 公众号**——大部分平台不识别，会作为正文显示出来
- **AI 翻译 retikz 专有词 / TikZ 学界惯用词**（`elbow` → `corner`、`anchor` → `position`）——人 review 时必须挡下
- **写「我们更好 / 竞品 X 做不到」**——blog 允许主观，但不允许攻击性 / 防御性
- **塞 `<ZodSchema>` / `<ExamplePrompt>`**——这俩是 docs 专用元素
- **塞 GIF / 视频 / 截图 / Mermaid 图**——blog 站同样禁；图用 retikz 自绘 + `<ComponentPreview hideCode>`
- **改正文同时更新 `date`**——`date` 是发布日期，演进走 git 历史
- **超过 12 分钟仍硬塞一篇**——拆系列，按 alpha-0 / alpha-1 命名

## 验证

写完一篇 blog 文章后：

```bash
pnpm --filter @retikz/docs build   # 类型 + 产物，挡 i18n 缺 key 等结构错
pnpm --filter @retikz/docs dev     # 浏览器开 /blog/<section>/<slug>，确认：
                                   #  - title / description / date / tags 元数据条都出
                                   #  - TOC 抓到所有 H2 / H3
                                   #  - 切英文：有 en 时切到 en；缺 en 时显示「暂无英文版」并回退 zh
                                   #  - 切中英文阅读时间显示合理（≤ 8 分钟为优）
```

### 跨平台预演

发布到外部平台前，**先在本地浏览器把文章读一遍**：

1. 把 `<ComponentPreview>` 当作"代码块 + 一句话说明"的占位想象，确认上下文仍通顺
2. 把所有相对路径 `./` / `/core/...` 在脑里替换为绝对 URL，确认链接仍可达
3. frontmatter 段裁掉后，正文从 `## ` 开始是否成立——如果首段直接接 `## TL;DR` 就 OK，如果首段是孤立一句话则要么并入 TL;DR 块要么改为 `## ` 开头
