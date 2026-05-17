---
name: docs-doc-blog
description: retikz 文档站「博客分区」（/blog/...）写作规则——面向程序员（多为前端开发）的设计理念 / 开发历程类文章。规定篇幅 / TL;DR / 段落风格 / ComponentPreview 优先 / 第三方外链允许 / 主观第一人称允许 / 中英流程 / 系列拆分 / 跨平台手抄约束 / 与 docs-doc-principle 的差异。写 blog mdx 前先读本文，再读 docs-doc-principle 拿继承通用规则（三处协同 / 路由 / Comparison 等不重复）。retikz 专用。
---

# retikz 博客分区规范

## 受众与定位

- **读者**：程序员，大部分做前端开发；熟 React / TypeScript / 现代构建链（Vite / pnpm / shadcn / Tailwind）
- **写作意图**：设计理念背后的「为什么」、开发过程的「踩过的坑」、版本演进的脉络——**不是** API 说明书（那是 docs 的活）
- **基调**：作者第一视角，**允许主观判断**（"做对了 / 走过的弯路"），**允许平实比较**（"A 用 X 方式 / retikz 用 Y 方式"、"D3 侧重数据、TikZ 侧重图元"——客观描述差异）；但**不写针对性话语**（"竞品 X 做不到"、"我们更好"、"比 X 强"——攻击性 / 防御性表达）

## 使用时机

写 `apps/docs/src/contents/blog/<sectionId>/<slug>/index.{zh,en}.mdx` 前**先读本 skill**，再回读 [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿**通用规则**（三处协同 / 路由 / `<Comparison>` 表的 GitHub 链接惯例 / 表格宽度 640px / `<br />` 软断等不重复列举）。

本 skill **只列与 docs-doc-principle 有差异或额外补充的部分**。

## 协作模式（作者讲思路 + AI 成文）

retikz blog 默认走「作者讲 → AI 写」的双人协作，AI 不替作者构思，也不一次性写完整篇：

| 角色 | 职责 |
|---|---|
| 作者 | 给大纲（H2 列表 + 每节关键点 / 外链 / demo 参考）；每节口语化讲想说什么；终稿审阅 |
| AI | 按 skill 规则把口语转写为 mdx：补 TL;DR、控段 3 行、转表 / 列表 / 代码块、嵌 ComponentPreview、维持双语 |

落地节奏（四阶段串行，不允许跳步、不许压缩成一步）：

1. **大纲**——作者一次给出 H2 列表（每节标题 + 核心关键词即可，不必详写）
2. **整体建议**——AI 评估长度 / 节奏 / 与其他 blog 文章边界（journey vs design 等）/ 潜在结构问题，提改进选项交作者拍板；**这一步只评不动笔**，作者没确认大纲前不进入第 3 步
3. **逐节讲述 → AI 可对该节内容提议 → 逐节生成**——流程：
   - 作者口语讲该节想说什么（关键点、锚点、想用的 demo / 链接 / 例子）
   - **AI 在该节范围内可主动提议**："建议补 X demo / Y 链接 / 这两条 bullet 顺序反过来 / 这里加个表 / 这段可压成一句"等
   - 作者对提议拍板（接受 / 修改 / 拒绝）
   - AI 出该节 mdx 草稿 → 作者审改通过 → 下一节
   - **AI 不许一次把所有节都写完，也不许跳节先写后面的**
4. **结构级决策由作者拍板**——拆节 / 换 demo / 改外链 / 改标题 / 改 slug 等改动随时可发起，AI 提选项 + tradeoff，作者决定

附加约束：**AI 提议 OK，擅自加不行**——AI 可以在每节范围内主动提议补充内容（demo / 链接 / 例子 / 节内顺序 / 形式转换等），但必须等作者点头才能进 mdx；作者没讲到、AI 也没提议过的内容，不能直接出现在草稿里。

**一个关键约束**：作者口语里给的外链 / demo 名 / 术语保留原样，AI 不"改进"（如把英文术语翻译成中文、把链接换成更"权威"的等）。作者每个选择背后通常都有上下文。

## 篇幅 / 节奏

| 项 | 软上限 | 硬上限 | 超出处理 |
|---|---|---|---|
| 单篇阅读时间 | 15 分钟 | 20 分钟 | 拆成系列文章（见下文「系列文章」） |
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
- **平实比较 OK，针对性话语禁**：可以写"A 库做了 X、retikz 选了 Y"这种客观差异；不写"A 库做不到 / 我们更好"这种攻击性 / 防御性表达。同类项目正面点名可以（不必隐晦），但点名后只描述事实差异不评高低

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
| 文末引用清单 | 不要求 | **有引用时必填**——见下「文末引用清单」 |

### 文末引用清单（有引用时必填）

正文一旦出现**外部链接 / 站内跨页 / 项目仓库 URL / 第三方文章 / 教程示例**等引用，文末必须用一个 H2 节集中汇总，方便读者跳转 + 跨平台手抄整理。**正文完全没有任何引用的纯叙述短文，可省略该节**。

- zh.mdx 标题：`## 引用`
- en.mdx 标题：`## References`

格式（无序列表，每条一句点出引用语境）：

```mdx
## 引用

- [TikZ for Impatient — §3.2](https://tikz.dev/tutorial)：karl 圆原例出处
- [retikz DESIGN.md](https://github.com/Pionpill/retikz/blob/main/notes/architecture/DESIGN.md)：IR 居中模型详述
- [shadcn/ui](https://ui.shadcn.com/) / [Tailwind CSS v4](https://tailwindcss.com/)：无头库 + CSS-first 灵感来源
- 站内：[核心架构介绍](/core/introduction) — IR / Sugar / Kernel 三层全景
```

约束：

- **只列正文出现过的引用**——不主动塞「相关阅读 / 延伸学习」凑数
- **只收有链接 / 可跳转的引用**——光给项目文件路径字符串（如 `packages/core/src/ir/scene.ts`、`AGENTS.md`）不算引用，**不进清单**。要引仓库内文件就配 GitHub 完整 URL 写成 `[文件名](https://github.com/.../...)`；只在行文里 inline code 提一句文件位置而读者点不进去的，不列入
- **每条带一句话点出引用语境**（"什么场景下提到的"），跨平台手抄时不丢上下文
- **inline link 在正文该用还用**——文末清单是去重汇总，不是替代正文 inline；读者顺读时能就近点击
- **正文不写脚注编号** `[1]` `[2]`——blog 站没渲染脚注；保留 inline link 即可
- **顺序按正文出现顺序**——不强求按字母 / 重要性排序，跟着读者阅读路径走
- **同一链接多处引用只列一次**——清单是去重的

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

- 单篇接近硬上限（20 分钟）就**拆系列**
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
| 必填结构 | 组件页 5 段、示例页能力节 | 无固定段落结构；TL;DR 必填；文末「引用」节按正文有无引用选填 |
| 阅读时间软上限 | 教程 10 min / 字典 15 min | 15 min |
| ZodSchema / ExamplePrompt | 用 | 不用 |
| ComponentPreview / Comparison | 用 | 用 |
| 主观对比竞品 | 禁 | 平实比较 OK，针对性话语禁 |
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
- **写「我们更好 / 竞品 X 做不到 / 比 X 强」**——blog 允许平实比较与主观判断，但不允许针对性话语；「A 选了 X 方式 / retikz 选了 Y 方式」可以，「A 做不到 X」 / 「retikz 比 A 强」不行
- **塞 `<ZodSchema>` / `<ExamplePrompt>`**——这俩是 docs 专用元素
- **塞 GIF / 视频 / 截图 / Mermaid 图**——blog 站同样禁；图用 retikz 自绘 + `<ComponentPreview hideCode>`
- **改正文同时更新 `date`**——`date` 是发布日期，演进走 git 历史
- **超过 20 分钟仍硬塞一篇**——拆系列，按 alpha-0 / alpha-1 命名
- **AI 跳过大纲直接下笔 / 一次写完整篇 / 跳节写**——违反协作模式逐节推进；每节必须等作者讲完该节口语内容、且作者审过上一节再动笔
- **正文有引用却漏写文末「引用」节 / 塞「相关阅读」凑数**——正文出现过链接就必须在文末汇总到 `## 引用`（en: `## References`），只列正文出现过的，每条配一句语境；正文完全无引用的短文则不强制该节
- **把不可点的项目文件路径塞进 `## 引用`**——清单只收**实际有链接**的项；行文里 inline code 形式提到的 `packages/core/src/...`、`AGENTS.md` 这类路径读者点不进去，不算引用，不进清单。真要进清单就配上完整 GitHub URL
- **正文写脚注编号 `[1]` `[2]`**——blog 站没渲染脚注；正文用 inline link，文末清单是去重汇总

## 验证

写完一篇 blog 文章后：

```bash
pnpm --filter @retikz/docs build   # 类型 + 产物，挡 i18n 缺 key 等结构错
pnpm --filter @retikz/docs dev     # 浏览器开 /blog/<section>/<slug>，确认：
                                   #  - title / description / date / tags 元数据条都出
                                   #  - TOC 抓到所有 H2 / H3
                                   #  - 切英文：有 en 时切到 en；缺 en 时显示「暂无英文版」并回退 zh
                                   #  - 切中英文阅读时间显示合理（≤ 15 分钟为优）
```

### 跨平台预演

发布到外部平台前，**先在本地浏览器把文章读一遍**：

1. 把 `<ComponentPreview>` 当作"代码块 + 一句话说明"的占位想象，确认上下文仍通顺
2. 把所有相对路径 `./` / `/core/...` 在脑里替换为绝对 URL，确认链接仍可达
3. frontmatter 段裁掉后，正文从 `## ` 开始是否成立——如果首段直接接 `## TL;DR` 就 OK，如果首段是孤立一句话则要么并入 TL;DR 块要么改为 `## ` 开头
