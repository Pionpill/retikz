---
name: docs-doc-example
description: retikz 示例类文档（apps/docs/src/contents/<module>/examples/**/*.mdx）的页面结构规范——以经典 / 实用图表为载体循序渐进教读者用 retikz 能力。固定 6 段（引言含 hero / Prompt / 过程 / 能力 / Limitations / Related）、过程节 step 用 H3 进 TOC、demo 累加式拼搭、命名 <id>-NN-<theme>.demo.tsx、Prompt 节用 ExamplePrompt 组件（只读 + markdown + 复制/发送双按钮）。本 skill 只覆盖示例页特有规则；通用规则（三处协同、双语、写作风格、Comparison、宽度、阅读时间等）见 docs-doc-principle。retikz 专用。
---

# 示例类文档写法

## 何时用本 skill

- 在 `apps/docs/src/contents/<module>/examples/**` 下加 / 改示例页
- 即将动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则

本 skill 只覆盖**示例页特有**的页面结构、step 写法、demo 命名、Prompt 节、Limitations 节。其它一切（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间等）以 principle 为准。

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

```mdx
---
title: <example 名>
description: <一句话：建什么图 + 主要教什么能力>
---

## 引言
<2-3 句：本例目的、读者会学到什么、原图出处链接（如有）>

<ComponentPreview name="<id>-NN-<last-theme>" />   ← hero（复用最后一个 step 的 demo）

## Prompt

<ExamplePrompt
  short="..."          ← markdown，最小概括（默认显示）
  detailed={`...`}     ← markdown，完整 prompt（左下角「详细内容」按钮展开后替换 short 展示）
/>

## 过程

### Step 1：<主题>
<2-3 句讲解；本 step 引入的关键能力以 markdown link 跳到 components/ 对应页>
<ComponentPreview name="<id>-01-<theme>" />

### Step 2 ...
... (累加，平铺，### 进 TOC——每个 step 都能从右侧目录跳转)

## 能力
| 组件 | 在本例中扮演的角色 | 主要 step |
| --- | --- | --- |
| [Path](.../draw/path) | 单位圆主体 + 扇形 | 1, 4 |
| ...

## Limitations
- 🚧 grid 算子：未来计划支持
- 🚧 投影 target：未来计划支持
- ❌ inline LaTeX 数学排版：暂不支持

## Related
- [相关组件 / 概念 / sister example]
```

**6 段顺序固定**，缺哪段都不行——除非：
- Limitations 全部为空可整节省略
- Related 没合适项可整节省略

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
| Helpers | **内联**在每个 demo——ComponentPreview 源码视图只显示 `.demo.tsx` 本体，要求每个 demo 独立可读 |
| Hero 复用 | 引言里 hero `<ComponentPreview>` 复用最后一个 step 的 demo（不另起 `-final` 文件） |
| 颜色字面值 | demo 里的 `stroke` / `fill` / `bg` 等 **必须用字面量颜色**——优先命名色，默认用 `orange` / `teal` / `red` / `green` 做强调，灰阶只保留 `gray` / `lightgray` / `dimgray`，并尽量不用 `black` / `white`；只有需要精确对齐时才用 hex / oklch。不能用 `var(--border)` / `var(--background)` 等 CSS 自定义属性。预览工具条可下载 SVG，CSS var 在新上下文里无定义 → fallback 成黑，下载后图变样 |
| DSL 选择 | **默认用 Sugar `<Draw way={[...]}>`，不用 Kernel `<Path><Step /></Path>`**。`way` 数组 1 行就能表达 line / curve / cubic / bend / step (fold) / cycle / label，比 Kernel 的多行 children 更短、与 components/draw/* 例子风格一致。例外：示例**本身**就是教 `<Path>` / `<Step>` Kernel 用法、或需要 fill + 闭合（`DrawWay.Cycle`）的填充形状 |

### 累加式的代价与好处

每个 step 的 demo 都包含之前所有内容，最后一个 demo 最肥（基本是完整图）。代价是**代码会复制**——但好处更大：

- 读者点开任意 step 的"查看源码"，拿到的就是该阶段的**可运行完整版本**，可直接复制改造
- ComponentPreview 视觉上呈现"图在生长"，比"每 step 一个孤立小图"更有教学感
- 不需要把 helpers 拆到独立模块——每个 demo 自包含

### 命名示例

karl-circle 一页的 demo 文件清单（7 step 中粒度）：

```
karl-circle-01-circle.demo.tsx          # 单位圆
karl-circle-02-axes.demo.tsx            # + 坐标轴 + 端点 label + 命名锚
karl-circle-03-ticks.demo.tsx           # + 刻度 + 网格
karl-circle-04-wedge.demo.tsx           # + 30° 扇形 + α label
karl-circle-05-sin-cos.demo.tsx         # + sin / cos 红蓝线（label `sin α` / `cos α` 是通用数学符号，不分 zh/en）
karl-circle-06-tan.demo.tsx             # + tan 橙线 + 辅助射线（label `tan α = sin α / cos α` 同上）
karl-circle-07-info.zh.demo.tsx         # + 右侧信息框（含「即 π/6 弧度」等本地化散文，分 zh）
karl-circle-07-info.en.demo.tsx         # 同上 en
```

引言 hero 直接 `<ComponentPreview name="karl-circle-07-info" />`，最后一个 step 的 ComponentPreview 同样 name——一份 demo 用两次。

## Prompt 节

每个示例页都有一个 `## Prompt` 节，让读者：
1. 看到「这张图用一段自然语言怎么说」
2. 一键发送站内 AI 对话面板预填 prompt 跑 LLM
3. 或一键复制带 retikz 上下文的可移植 prompt，粘到任意外部 AI 工具（Claude Code / Cursor / ChatGPT 等）

### 形态：`<ExamplePrompt>` 组件

```mdx
## Prompt

<ExamplePrompt
  short="**画 30° 角下 sin / cos / tan 几何关系示意图**：单位圆 + 带箭头坐标轴 + 刻度 + 绿色填充扇形 + 红/蓝/橙三色函数线 + 右侧多色信息说明框。"
  detailed={`**绘制单位圆三角函数示意图**

**几何**

- 单位圆 r = 1cm
- 坐标轴 -1.5 → 1.5，带箭头
- 刻度：x 轴 [-1, -1/2, 1]，y 轴 [-1, -1/2, 1/2, 1]
- 30° 扇形（以原点为圆心、半径 0.3cm）

**函数线**

- sin α 红色：从 (cos30°, sin30°) 垂直到 x 轴
- cos α 蓝色：投影点 → 原点
- tan α 橙色：从 (1, 0) 竖到 (1, tan30°)

**颜色**

- 扇形：浅绿填充 + 深绿描边
- sin: red, cos: teal, tan: orange

**标注**

- α 在扇形内（极坐标 15°, 0.22cm）
- 三条线各自带函数名 label
- 右侧多行信息框，每行单独着色`}
/>
```

### UI 行为

`<ExamplePrompt>` 是**只读**展示，不允许就地编辑（要改 prompt 在 AI 对话面板里改 / 复制后改）：

- **默认显示 `short`**（markdown 渲染）
- **左下角「详细内容 ⌄」**按钮——有 `detailed` 时才出现，点开把内容切换为 `detailed`（markdown 渲染），再点收起
- **右下角两个按钮**：
  - **「复制」**——把当前可见的 prompt **前置一段 retikz 上下文**（站点 llms.txt URL + `@retikz/react` / `@retikz/core` 用法提示）后写入剪贴板。用户粘到外部 AI 工具时即使无 retikz 训练数据也能正确响应
  - **「发送到 AI 对话」**——调 `useAiChatStore.setOpen + fillDraftAndFocus`，把当前可见内容（**不带**外部上下文头——站内 system prompt 已注入）推到聊天面板输入区由用户自行 send

### Prompt 写作要点

- **`short`**：markdown，一句话能讲完。重点是「画什么」，不是「怎么画」。可用 `**bold**` 强调关键短语
- **`detailed`**：markdown，3-7 个分类（如「几何」/「颜色」/「标注」/「文字」），分类标题用 `**bold**`，每类下 bullet 列表 ≤ 5 行
- **避免**给精确坐标——让 LLM 有发挥空间。给意图 + 约束，不给坐标
- **`detailed` 可省略**——简单 example 单 `short` 即可
- 双语：zh.mdx 与 en.mdx 各自写一份 `short` / `detailed`——两边语义对齐，不强求逐字翻译
- Prompt 内容**不要列 retikz 组件清单**（如「用 Path / Step / Draw / Node」）——这种限定 LLM 用什么 API 反而压表达空间；复制按钮的上下文头已经提示 AI 可用任意 `@retikz/*` API + 让它查 llms.txt，文档化任何具体能力都是反模式

## 能力节

`## 能力` 节用 3 列表格汇总本例用到了哪些组件、各自在图里扮演什么角色、主要出现在哪个 step：

```mdx
## 能力

| 组件 | 在本例中扮演的角色 | 主要 step |
| --- | --- | --- |
| [Path](/core/components/draw/path) | 单位圆主体 + 30° 扇形 | [1](#步骤-1画单位圆), [4](#步骤-4画-30-扇形--α-标签) |
| [Draw](/core/components/draw/overview) | 坐标轴 + sin/cos/tan 三色线 | [2](#步骤-2加坐标轴--端点标签--命名锚), [5](#步骤-5sin-α-红线--cos-α-蓝线), [6](#步骤-6tan-α-橙线--辅助射线) |
| [Node](/core/components/node/overview) | 轴端点 label + 刻度文字 + α 标签 + 信息框 | [2](#步骤-2加坐标轴--端点标签--命名锚), [3](#步骤-3加网格--刻度), [4](#步骤-4画-30-扇形--α-标签), [7](#步骤-7右侧多色信息说明框) |
| [Coordinate](/core/components/node/coordinate) | 命名 x/y 轴端点 + tan 交点 t | [2](#步骤-2加坐标轴--端点标签--命名锚), [6](#步骤-6tan-α-橙线--辅助射线) |
```

两条强约束：

- **第一列**必须是 markdown link 跳到对应 `components/` 页——示例页面定位是 showcase + 教学，跳走查 API 是天然动作
- **第三列**每个 step 数字必须是页内锚链接，跳到「过程」节里对应 H3——读者从「能力」反查"这个组件在第几步出现"时一键跳过去，比让他自己滚屏找快得多

锚 slug = rehype-slug 对 H3 标题文本运行 [github-slugger](https://github.com/Flet/github-slugger) 的输出。中文 / 含 + - / 全角符号的 H3，slug 不直观；写之前用一行 node 跑一遍：

```bash
cd apps/docs && node -e "import('github-slugger').then(({default: S}) => { const s = new S(); console.log(s.slug('步骤 4：画 30° 扇形 + α 标签')); })"
# => 步骤-4画-30-扇形--α-标签
```

要点：

- 全角冒号 `：`、`+`、`°`、em-dash `—`、半角冒号 `:` 一律被剥掉
- 空格 ` ` → `-`；被剥掉的标点周围的空格仍各自变 `-`，所以 ` + ` 会变成 `--`（两个连字符）
- 中文字符、希腊字母（`α`）、半角连字符 `-` 都保留

## Limitations 节

示例图中**用 retikz 实现不了 / 实现得绕**的能力沉到这一节，与正文分离不打断教学节奏：

```mdx
## Limitations

- 🚧 grid 算子：未来计划支持。本例用 `.map()` 手画 5 横 5 竖替代
- 🚧 投影 target（`(A |- B)`）：未来计划支持。本例手算 `cm(cos30, 0)` 兜底
- 🚧 inline color span 文本：未来计划支持（LineSpec 加 `spans` 字段）。本例用 LineSpec 行级 `fill` 兜底，只能整行换色
- ❌ inline LaTeX 数学排版（`$\frac{1}{2}$`）：暂无计划。本例用 `"1/2"` 纯文本兜底
```

- 🚧 = 未来计划支持（大多数 gap 在这里）
- ❌ = 明确不支持（少见；多数 example 这一类为空，整条 bullet 省略即可）
- 每条格式：`<图标> <能力名>：<状态说明>。本例如何兜底`
- 不要写"未来支持的话会让代码简化为 XXX"——简化方案不属于教程本身

## 阅读时间

教程类，目标 ≤ 10 分钟。超过就拆子页（如 example 太大，可拆成「基础版 / 完整版」两页，或按主题拆「Karl 单位圆 - 几何篇 / 装饰篇」）。

7-9 step + 引言 + Prompt + 能力 + Limitations + Related 一般在 8-10 分钟以内。

## 与组件页的边界

容易混淆的几个点：

| 写在哪 | 内容 |
| --- | --- |
| `components/draw/overview` 的 `## 例子` 节 | 围绕 `<Draw>` 单组件的多种能力（直线 / 曲线 / 箭头 / 折角…）的小 demo，每个 demo 几行 |
| `examples/karl-circle` 整页 | 用 `<Draw>` + `<Node>` + `<Coordinate>` + `<Path>` 等多个组件组合出一张完整图，循序渐进教过程 |

简单判断：单组件能讲完 → 组件页 Examples 子节；多个组件协同 → 示例页。

## Draw way 速查

示例 demo 写 edge 时不要嵌 `<Path><Step kind="...">` —— 用 `<Draw way={[...]}>`。way 数组各 step kind 的 sugar 写法：

```tsx
import { Draw, DrawWay } from '@retikz/react';

// 直线: 直接放两个 target
<Draw way={['A', 'B']} arrow="->" />

// 折角（fold）: '-|' = 先横后竖 / '|-' = 先竖后横
<Draw way={['A', '|-', 'B']} arrow="->" />

// 二次贝塞尔（curve）: { curve: [cx, cy] } infix
<Draw way={['A', { curve: [50, -30] }, 'B']} arrow="->" />

// 三次贝塞尔（cubic）: { cubic: [[c1x, c1y], [c2x, c2y]] }
<Draw way={['A', { cubic: [[40, -20], [60, 30]] }, 'B']} arrow="->" />

// 弧形简记（bend）: { bend: 'left' | 'right', angle?: number }
<Draw way={['A', { bend: 'right', angle: 45 }, 'B']} arrow="->" />

// 边标注 label: { label: 'text' } 或 { label: { text, position, side } } infix（修饰下一段）
<Draw way={['A', { label: 'midway' }, 'B']} arrow="->" />

// 多段串联: 串多个 infix 算子，每个修饰下一段
<Draw way={[
  'A',
  { curve: [40, -30] }, [80, -10],   // 第 1 段 quadratic
  { curve: [60, 40] }, 'B',          // 第 2 段 quadratic，端点 auto-clip 到 B 边框
]} arrow="->" />

// 闭合（filled）: DrawWay.Cycle 闭回起点
<Draw way={['A', 'B', 'C', DrawWay.Cycle]} fill="#ff0" />
```

**端点写 node id 字符串** —— retikz 编译期自动按"toward 方向射线"算 border 锚点；写裸坐标会让箭头偏离节点边框。

## 常见错误（示例页特有）

- **6 段顺序错乱** —— 严格按"引言 / Prompt / 过程 / 能力 / Limitations / Related"；缺哪段除非整节为空否则不许
- **section 标题写成 `## AI Prompt`** —— 用 `## Prompt`，AI 是工具不是主语
- **demo 非累加** —— 每个 step 的 demo 必须包含之前所有内容，不能只画"本 step 新增"的孤立小图
- **demo 文件名缺序号** —— 必须 `<id>-NN-<theme>.demo.tsx`，NN 两位 0 补齐（`-01-` 而非 `-1-`）
- **demo 之间共用 helpers 模块** —— ComponentPreview 源码视图只显示 `.demo.tsx` 本体，shared helpers 用户看不到；每个 demo 内联 helpers
- **过程节用 `####` 而非 `###`** —— H4 不入 TOC，读者无法跳到具体 step；统一用 `###`
- **过度拆 zh/en demo** —— 只在文本**实际不同**时才拆；`sin α` / `α` / `f(x)` 这种通用符号留单文件
- **demo 颜色用 CSS var**（`var(--border)` / `var(--muted)` 等） —— 工具条 SVG 下载在新上下文里 var 解析失败 fallback 成黑；颜色统一用字面量（hex / oklch / 命名色）。需要 light/dark 适配的"装饰性"色（grid help line / 背景遮罩）取浅色字面值（如 `#e5e7eb` / `#ffffff`），下载后在白底文档里仍然好看
- **demo 用 `<Path><Step />` 而非 `<Draw way={[...]}>`** —— 示例 edge 一律走 Draw sugar（way 数组 1 行就能表达），Kernel Path 仅在示例**本身**教 Path/Step 内部或需要 fill+cycle 时用；理由见 demo 文件约定的「DSL 选择」行
- **正文里散落 TikZ 对照** —— TikZ 关系一律走 `<Comparison>`（principle 已规定）；正文专心讲 retikz
- **Limitations 当成「未来 roadmap」写** —— 只列**本例触到的** gap；与本例无关的 roadmap 别塞进来
- **能力节列表里组件名不带 link** —— 第一列必须 markdown link 跳到对应 components/ 页
- **能力节第三列 step 数字裸写** —— 必须改写成 `[N](#<H3-slug>)` 锚链接，读者能从能力反向跳到对应 step；中文 H3 的 slug 别手写、用 github-slugger 跑一下确认
- **Prompt 给精确坐标 / 列 retikz 组件清单** —— prompt 只描述意图与视觉约束，不写"用 Path / Node / ..."这种 API 提示；让 LLM 自由发挥
- **`<ExamplePrompt>` 写了 textarea / 编辑** —— 它现在是**只读** + 复制 / 发送双按钮，没有就地编辑路径；要改 prompt 在 AI 面板里改
