---
name: docs-doc-example
description: retikz 示例页规范：`apps/docs/src/contents/<module>/examples/**` 的 6 段结构、累加式 step demo、Prompt/能力/限制/扩展阅读写法、多文件 demo 与 diff 约定。通用文档规则见 docs-doc-principle。retikz 专用。
---

# 示例类文档写法

## 何时用本 skill

- 在 `apps/docs/src/contents/<module>/examples/**` 下加 / 改示例页
- 即将动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则

本 skill 只覆盖**示例页特有**的页面结构、step 写法、demo 命名、Prompt 节、限制 节。其它一切（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间等）以 principle 为准。

示例页必须站在第一次跟做的读者视角写：每一步先说“这一步让图多了什么、为什么现在加”，再链接到组件或提术语。不要用作者全知视角跳到最终架构、内部机制或完整 API；读者应能按 step 顺序复制、观察、理解。

## 定位

示例页是 **retikz 能力综合 showcase**——以经典 / 实用图表为载体，**循序渐进教读者用 retikz 能力**。与现有三种 section 的边界：

| Section | 服务什么 |
| --- | --- |
| `concepts/` | 抽象概念（坐标系 / anchor / 分层） |
| `components/` | 单组件 API 字典 + 该组件自身的多个 demo |
| `examples/`（本 skill） | 多组件 + 多能力**组合成完整图**，按 step 教 |

**不是**什么：
- 不是 TikZ 迁移指南（正文不主动比 TikZ；TikZ 关系只在写法差异极大、TikZ 老用户可能困惑时才用 `<Comparison>` 提一下）
- 不是组件 API 字典（具体 API 用法请用 markdown link 跳到 components/）
- 不是 final-result 摆图秀（重点是教过程，不是炫成品）

## 单页骨架（6 段固定）

| 顺序 | section | 要点 |
| --- | --- | --- |
| 1 | `## 引言` | frontmatter 后 2-3 句说明目的；hero 复用最后一个 step demo |
| 2 | `## Prompt` | 用 `<ExamplePrompt short="..." detailed={...} />` |
| 3 | `## 过程` | 每步 `### Step N：<主题>`，累加式 `<ComponentPreview>`，H3 进 TOC |
| 4 | `## 能力` | 组件 link + 在图中角色 + step 锚链接 |
| 5 | `## 限制` | 只列本例触到的 gap；为空可省略 |
| 6 | `## 扩展阅读` | 进阶、优化、相关组件/概念；无合适内容可省略 |

`title` / `description` 仍写在 frontmatter；正文不要再写 H1。

## Step 内部 4 行骨架

每个 step 严格 4 行：

1. **`### Step N：<主题>`** —— H3，**进右侧 TOC**，让读者能从目录跳到任意 step
2. **2-3 句讲解** —— 解释本 step 引入了什么、为什么这么写。本 step 用到的**关键能力**主动用 markdown link 跳到 components/ 对应页（如 `[circlePath](/core/components/draw/step#circlepath)`），让用户能 deepdive
3. **`<ComponentPreview name="<id>-NN-<theme>" />`** —— 累加式
4. **（可选）`<Comparison target="tikz">`** —— **仅**当 retikz 写法与 TikZ 差异极大、TikZ 老用户可能困惑时才用。默认不要

正文不主动写"这里 TikZ 是 `\draw ...`"——TikZ 关系一律走 `<Comparison>`（principle 已规定）。

## Demo 文件约定

| 项 | 规则 |
| --- | --- |
| 形态 | **累加式**——第 N 个 demo = 前 N-1 step 的全部内容 + 本 step 新增 |
| 命名 | `<example-id>-NN-<theme>.demo.tsx`，NN 两位 0 补齐（如 `karl-circle-01-circle.demo.tsx`） |
| 双语 | **按文本是否实际不同**判断：通用数学 / 公式 / 符号 label（`sin α` / `f(x)` / `α`）单 `.demo.tsx`；含本地化散文 / 解释性文本的 step 才分 `.zh.demo.tsx` / `.en.demo.tsx` |
| Helpers | **默认内联**在每个 demo，保证独立可读；demo 体量过大、或多步共用同一套基础设施时，按下文「多文件 demo」拆成子文件（`sourceFiles` 会一并展示，不再被隐藏） |
| Hero 复用 | 引言里 hero `<ComponentPreview>` 复用最后一个 step 的 demo（不另起 `-final` 文件） |
| 颜色字面值 | demo 里的 `stroke` / `fill` / `bg` 等 **必须用字面量颜色**——优先命名色，默认用 `darkorange` 做强调；只有一张图里需要两个以上并列示例，或明确要做对比时才用 `dodgerblue`；若同图已经用了 `darkorange` + `dodgerblue` 仍需要第三个强调色，再用 `darkviolet`。`red` / `green` 只保留给错误 / 成功语义，灰阶只保留 `gray` / `lightgray` / `dimgray`，并尽量不用 `black` / `white`；只有需要精确对齐时才用 hex / oklch。不能用 `var(--border)` / `var(--background)` 等 CSS 自定义属性。预览工具条可下载 SVG，CSS var 在新上下文里无定义 → fallback 成黑，下载后图变样 |
| DSL 选择 | **默认用 Sugar `<Draw way={[...]}>`，不用 Kernel `<Path><Step /></Path>`**。`way` 数组 1 行就能表达 line / curve / cubic / bend / step (fold) / cycle / label，比 Kernel 的多行 children 更短、与 components/draw/* 例子风格一致。例外：示例**本身**就是教 `<Path>` / `<Step>` Kernel 用法、或需要 fill + 闭合（`DrawWay.Cycle`）的填充形状 |

累加式意味着代码会复制，但读者在任意 step 打开源码都能拿到可运行完整版本；复杂例子再用多文件 demo 分担体量。

## 多文件 demo（子文件 + 自动 diff）

默认每个 demo 内联自包含（见上）。当 demo 体量过大、或多步共用同一套基础设施（自定义形状 / 布局 / 端点表）时，把内容拆成**子文件**，由 `<ComponentPreview sourceFiles={[...]}>` 一并展示。`sourceFiles` 里**主 demo 自己不用列**（由 `name` 自动加载），只列附加子文件。子文件分两类：

| 类别 | 命名 | 用途 | diff |
| --- | --- | --- | --- |
| 步内子文件 | `<主demo名>.<subName>.tsx`（**无 `.demo`**，如 `ohms-law-circuit-02-shapes.elements.tsx`） | 只属于某一步、随步演进 | 自动（见下） |
| 共享子文件 | 独立名 `<name>.tsx`（如 `circuitShapes.tsx`） | 跨多步复用、基本不变的基础设施 | 不 diff |

- 子文件是**纯源码**（不渲染），用普通 `.tsx` / `.ts`，**不要带 `.demo.tsx`**——带了会被当成可渲染 demo（要求 default 导出 FC、并去算 IR）。
- 步内子文件以**所属步的主 demo 名**为前缀，`<subName>` 在各步间保持稳定（如各步都叫 `.elements.tsx`），这是自动 diff 配对的钥匙。
- **造的数据集**用专门的 `<主demo名>.data.ts` 子文件（多数据集 `<主demo名>.<dataset>.data.ts`），有专属 Database 图标——通用约定见 [`docs-doc-principle`](../docs-doc-principle/SKILL.md)「demo 的数据文件」。

### 渐进式例子的子文件 = 自包含快照

渐进式例子若用子文件，**每步的步内子文件必须是该阶段的自包含快照**——直接写出本步完整内容，**不要 `import` 上一步的子文件**。import 链虽 DRY，但相邻步是不同模块、diff 没有意义；自包含快照换来「步与步之间真正可 diff」。跨步不变的部分才抽进共享子文件。

### 自动 diff 配对

`<ComponentPreview>` 设了 `diffFrom="<上一步主 demo 名>"` 后：

- `sourceFiles` 里**以当前 demo 名为前缀**的步内子文件，自动与 `<diffFrom>.<同 subName>.tsx` 做 diff（默认只看新增高亮，同主 demo `diffFrom`）；baseline 不存在则静默无 diff。
- 共享子文件（非该前缀）不 diff，原样展示。

```mdx
<ComponentPreview
  name="ohms-law-circuit-02-shapes"
  diffFrom="ohms-law-circuit-01-meters"
  sourceFiles={['ohms-law-circuit-02-shapes.elements.tsx', 'circuitShapes.tsx']}
/>
{/* elements.tsx 自动 diff ohms-law-circuit-01-meters.elements.tsx；circuitShapes.tsx 共享件不 diff */}
```

跨步 / 跨名的特殊配对，用显式对象形式覆盖：`{ file: 'a.tsx', diffFrom: 'b.tsx' }`。

## Prompt 节

每个示例页都有一个 `## Prompt` 节，让读者：
1. 看到「这张图用一段自然语言怎么说」
2. 一键发送站内 AI 对话面板预填 prompt 跑 LLM
3. 或一键复制带 retikz 上下文的可移植 prompt，粘到任意外部 AI 工具

### 形态：`<ExamplePrompt>`

`<ExamplePrompt>` 只读，默认显示 `short`；有 `detailed` 时可展开。按钮行为由组件负责：复制时加 retikz 外部上下文，发送到站内 AI 时只填当前 prompt。

### Prompt 写作要点

- **`short`**：markdown，一句话能讲完。重点是「画什么」，不是「怎么画」。可用 `**bold**` 强调关键短语
- **`detailed`**：markdown，3-7 个分类（如「几何」/「颜色」/「标注」/「文字」），分类标题用 `**bold**`，每类下 bullet 列表 ≤ 5 行
- **避免**给精确坐标——让 LLM 有发挥空间。给意图 + 约束，不给坐标
- **`detailed` 可省略**——简单 example 单 `short` 即可
- 双语：index.zh.mdx 与 index.en.mdx 各自写一份 `short` / `detailed`——两边语义对齐，不强求逐字翻译
- Prompt 内容**不要列 retikz 组件清单**（如「用 Path / Step / Draw / Node」）——这种限定 LLM 用什么 API 反而压表达空间；复制按钮的上下文头已经提示 AI 可用任意 `@retikz/*` API + 让它查 llms.txt，文档化任何具体能力都是反模式

## 能力节

`## 能力` 用 3 列表格：`组件`（markdown link 到 components 页）/ `在本例中扮演的角色` / `主要 step`（`[N](#slug)` 跳 H3）。

中文或含符号 H3 的 slug 用 github-slugger 算，不手写猜：

```bash
cd apps/docs && node -e "import('github-slugger').then(({default: S}) => { const s = new S(); console.log(s.slug('步骤 4：画 30° 扇形 + α 标签')); })"
```

## 限制 节

`## 限制` 只列本例触到的“做不了 / 做得绕”的 gap；为空省略。表格列固定：`能力 / 限制`、`计划`、`现状 / 兜底`。

`计划` 只用三类：🚧 未来支持 / ❌ 不支持 / 🔧 优化方案。表格 cell 内 `|` 转义为 `\|`。

## 扩展阅读 节

页面最后一节（原 Related，已更名）。**不只放链接**——可以基于本例写一些**扩展 / 优化 / 进阶**内容，给读者指出下一步往哪走：

- **更多扩展点**：本例往往只演示了某一面（如自定义形状），可顺手指向其它扩展面——[自定义箭头](/core/reference/extending/custom-arrow) / [自定义图案](/core/reference/extending/custom-pattern) / [路径生成器](/core/reference/extending/path-generator) 等。
- **进阶 / 优化**：基于本例的下一步深入方向，例如把反复出现的结构封装成专门的（更高 tier 的）组件，以减少重复代码、精简 IR 持久化体积。
- **相关组件 / 概念 / sister example**：跳到本例用到的组件页、相关概念、或同系列的另一个示例。

没有可写的扩展 / 进阶、也没有相关链接时，整节可省略。

## 阅读时间

教程类，目标 ≤ 10 分钟。超过就拆子页（如 example 太大，可拆成「基础版 / 完整版」两页，或按主题拆「Karl 单位圆 - 几何篇 / 装饰篇」）。

7-9 step + 引言 + Prompt + 能力 + 限制 + 扩展阅读 一般在 8-10 分钟以内。

## 与组件页的边界

容易混淆的几个点：

| 写在哪 | 内容 |
| --- | --- |
| `components/draw/overview` 的 `## 例子` 节 | 围绕 `<Draw>` 单组件的多种能力（直线 / 曲线 / 箭头 / 折角…）的小 demo，每个 demo 几行 |
| `examples/karl-circle` 整页 | 用 `<Draw>` + `<Node>` + `<Coordinate>` + `<Path>` 等多个组件组合出一张完整图，循序渐进教过程 |

简单判断：单组件能讲完 → 组件页 Examples 子节；多个组件协同 → 示例页。

## Draw way 速查

示例 demo 写 edge 默认用 `<Draw way={[...]}>`，不要嵌 `<Path><Step /></Path>`。速查：

| 需求 | way 形态 |
| --- | --- |
| 直线 | `['A', 'B']` |
| 折角 | `['A', '|-', 'B']` / `['A', '-|', 'B']` |
| 二次 / 三次曲线 | `['A', { curve: [cx, cy] }, 'B']` / `{ cubic: [[c1x,c1y],[c2x,c2y]] }` |
| bend | `['A', { bend: 'right', angle: 45 }, 'B']` |
| label | `['A', { label: 'midway' }, 'B']` 或 `{ label: { text, position, side } }` |
| 闭合填充 | `['A', 'B', 'C', DrawWay.Cycle]` |

端点优先写 node id 字符串，编译期自动按 toward 方向裁到节点边框；裸坐标不会 auto-clip。

## 常见错误（示例页特有）

- **6 段顺序错乱** —— 严格按"引言 / Prompt / 过程 / 能力 / 限制 / 扩展阅读"；缺哪段除非整节为空否则不许
- **section 标题写成 `## AI Prompt`** —— 用 `## Prompt`，AI 是工具不是主语
- **demo 非累加** —— 每个 step 的 demo 必须包含之前所有内容，不能只画"本 step 新增"的孤立小图
- **demo 文件名缺序号** —— 必须 `<id>-NN-<theme>.demo.tsx`，NN 两位 0 补齐（`-01-` 而非 `-1-`）
- **简单 demo 过度拆子文件** —— 能内联读懂的小 demo 不要拆；只有体量过大 / 跨步复用基础设施时才按「多文件 demo」拆，且拆出的子文件必须用 `sourceFiles` 显式列出（否则读者看不到）。反过来，**渐进式例子的步内子文件不要 `import` 上一步**——那样 diff 失效，必须写成自包含快照
- **子文件带了 `.demo.tsx` 后缀** —— 子文件是纯源码、不渲染，用普通 `.tsx` / `.ts`；带 `.demo.tsx` 会被当成可渲染 demo
- **过程节用 `####` 而非 `###`** —— H4 不入 TOC，读者无法跳到具体 step；统一用 `###`
- **过度拆 zh/en demo** —— 只在文本**实际不同**时才拆；`sin α` / `α` / `f(x)` 这种通用符号留单文件
- **demo 颜色用 CSS var**（`var(--border)` / `var(--muted)` 等） —— 工具条 SVG 下载在新上下文里 var 解析失败 fallback 成黑；颜色统一用字面量（hex / oklch / 命名色）。需要 light/dark 适配的"装饰性"色（grid help line / 背景遮罩）取浅色字面值（如 `#e5e7eb` / `#ffffff`），下载后在白底文档里仍然好看
- **demo 用 `<Path><Step />` 而非 `<Draw way={[...]}>`** —— 示例 edge 一律走 Draw sugar（way 数组 1 行就能表达），Kernel Path 仅在示例**本身**教 Path/Step 内部或需要 fill+cycle 时用；理由见 demo 文件约定的「DSL 选择」行
- **正文里散落 TikZ 对照** —— TikZ 关系一律走 `<Comparison>`（principle 已规定）；正文专心讲 retikz
- **限制 当成「未来 roadmap」写** —— 只列**本例触到的** gap；与本例无关的 roadmap 别塞进来
- **限制 还写成 bullet 列表** —— 现在统一用表格（能力 / 限制 · 计划 · 现状 / 兜底 三列），计划列取 🚧 未来支持 / ❌ 不支持 / 🔧 优化方案；cell 内 `|` 记得转义
- **能力节列表里组件名不带 link** —— 第一列必须 markdown link 跳到对应 components/ 页
- **能力节第三列 step 数字裸写** —— 必须改写成 `[N](#<H3-slug>)` 锚链接，读者能从能力反向跳到对应 step；中文 H3 的 slug 别手写、用 github-slugger 跑一下确认
- **Prompt 给精确坐标 / 列 retikz 组件清单** —— prompt 只描述意图与视觉约束，不写"用 Path / Node / ..."这种 API 提示；让 LLM 自由发挥
- **`<ExamplePrompt>` 写了 textarea / 编辑** —— 它现在是**只读** + 复制 / 发送双按钮，没有就地编辑路径；要改 prompt 在 AI 面板里改
