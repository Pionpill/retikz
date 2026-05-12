---
name: docs-doc-write
description: 用于在 retikz 文档站新增、编辑或翻译 mdx 文档（`apps/docs/src/contents/**/*.mdx`）、在 `apps/docs/src/data` 中注册页面或栏目、以及同步 `apps/docs/src/i18n` 下中英文案。retikz 专用，其它项目可忽略。
---

# 写 retikz 文档

## 总览

retikz 文档站，1 个页面 = **3 处同步改动**：内容（`contents/`）、注册（`data/`）、文案（`i18n/`）。漏一处会 404、菜单不显示、或标题变成 i18n key 字符串。

中文是源语言，英文跟随；mdx 走 shadcn/ui 风格，但 demo 用我们自己的 `<ComponentPreview>`。

## 使用时机

- 加 / 改 / 翻译 `apps/docs/src/contents/**` 下的 mdx
- 在 `apps/docs/src/data/*.ts` 里注册或调整页面节点
- 同步 `apps/docs/src/i18n/locales/{zh,en}.ts` 的标题、菜单等文案

## 三处协同的目录

```
apps/docs/src/
  contents/<moduleId>/<sectionId>/<pageId>[/<subPageId>]/
    zh.mdx                # 中文正文（必填）
    en.mdx                # 英文正文（必填）
    <demo-name>.demo.tsx  # 被 <ComponentPreview name="..."> 引用（按需）
  data/
    module.ts             # 顶层 module 列表（core / flow / plot）
    core.ts               # core module 的 sections + pages 树
    interface.ts          # Section / Page / SubPage / I18nKey 类型
  i18n/locales/
    zh.ts                 # 文案源（I18nResources = typeof zh）
    en.ts                 # 英文，由 I18nResources 类型反向约束
```

路由：`/:moduleId/:sectionId/:pageId(/:subPageId)?`。URL 段 == 目录段 == 数据节点 `id`，三处必须严格一致。

## 加叶子页面：完整步骤

以加 `core/profile/get-start` 为例（已有 `core` module 与 `profile` section）：

1. **i18n key 先行**（类型才能通）
   - `i18n/locales/zh.ts`：在 `core` 命名空间下加 `getStart: '快速开始'`
   - `i18n/locales/en.ts`：相同位置加 `getStart: 'Get Started'`
2. **加内容**
   - `contents/core/profile/get-start/zh.mdx` + `en.mdx`
   - 顶部 frontmatter：`title`（与 i18n label 一致）+ `description`（一句话，渲染在 H1 下方）
3. **注册数据**
   - `data/core.ts` 找到 `id: 'profile'` 的 section，往 `pages` 里加：
     ```ts
     { id: 'get-start', label: 'core.getStart' }
     ```
   - `id` 必须等于目录段；`label` 是完整 i18n 路径，由 `I18nKey` 类型约束（拼错编译就报）

加分组（带 children 的非叶子）：在父节点加 `children: Array<SubPage>`，分组本身不导航，URL 命中分组时会重定向到第一个子项；分组**没有** mdx 文件。

## 漏改对照

| 漏掉 | 现象 |
| --- | --- |
| i18n key | TS 编译失败：`label` 类型不匹配 `I18nKey` |
| mdx 文件 | 进入页面看到 `{{title}} —— v0.1 alpha 内容补充中。` 占位 |
| data 注册 | 侧边栏看不到；URL 直访 → "页面不存在" |
| zh.mdx / en.mdx 缺一份 | 切到该语言时回退到另一份；不算错但要补 |

## 中英规则

**zh 是 source of truth；en 跟随。**

- 编辑文档时若 zh / en 已不同步：以 zh 重写 en
- 翻译可在不损失语义前提下本地化（标题、列表数量、表格列保持一致）
- **代码与 zh.mdx 不一致**：停下来询问用户，不要自行选边——两边都过期的情况都见过
- 新增 i18n key：先加 `zh.ts`，再加 `en.ts`，顺序固定

## 写作风格

**文字尽量精简——没人喜欢一直看文字。** 能用表格 / 示例 / 代码块表达的，不要写成段落。

| 表达对象 | 优先形式 |
| --- | --- |
| 对比、属性、配置、状态映射 | **表格** |
| 用法 / 效果 / 视觉展示 | **`<ComponentPreview>`** |
| API、签名、配置片段、命令 | **代码块** |
| 步骤、并列要点 | **有序 / 无序列表** |
| 概念阐释、必要的"为什么" | **段落（≤ 3 行；超过就拆 bullet 或表格）** |

其它原则：

- **客观、中性**：不写"竞品 X 做不到 / 我们更好"这类防御性 / 攻击性段落；同类项目作为隐晦提及一次即可，不要反复点名对比
- **一段话讲完不要拆两段**；逻辑断点用空行不用副标题
- **能放例子就放例子**：`<ComponentPreview>` 一个胜过三段描述
- **避免冗余形容词**："非常 / 极其 / 显著 / 强大"等没有信息量的词去掉

## DSL 优先，IR 克制

retikz 文档面向**用户**——用户写的是 DSL（`<Tikz>` / `<Node>` / `<Path>` / `<Draw>` 等 JSX）。正文以 DSL 用法为主；IR 是底层的持久化 / AI 生成中间表示，对用户**默认隐藏**，只在以下场景下出现：

- 介绍页 / 设计哲学页里讲整体架构
- 持久化、`<Tikz ir={...}>` 直喂、AI 接入相关章节
- 该组件的行为只能借 IR 解释清楚（如"Sugar 编译期展开为 Kernel"这种 Sugar 与 Kernel 关系的引子）

普通用法页**不要**为了"完整"硬塞 IR JSON 节录或字段表——`<ComponentPreview>` 的 IR Tab 已经把"想看的人能看"留好了，不必正文复述。编译器内部（`compileToScene` / Scene primitive）一律不进用户文档。

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

## 文档宽度限制

文档正文最大宽度 **640px**（`max-w-160`）；表格 `<td>` 默认 `whitespace-nowrap`——**单元格不会自动换行**，过长会触发横向滚动。

应对策略：

- **优先压缩内容**：单元格写关键词不写整句；长解释挪到表格外的段落 / bullet
- **必要时用 `<br />` 软断行**（MDX 原生支持）：

  ```mdx
  | 列 1 | 列 2 |
  | --- | --- |
  | A | 第一行<br />第二行 |
  ```
- **3 列以内 + 每格 ≤ 12 个中文字 / 25 个英文字符** 通常能在 640px 内安全显示；超出就用 `<br />` 拆或改排版
- 单元格内有 `|` 用 `\|` 转义

代码块、URL、超长英文术语在窄屏同样会破版——能简化就简化。

## 文档结构（组件页）

参考：<https://ui.shadcn.com/docs/components/spinner>（简单）/ <https://ui.shadcn.com/docs/components/radix/alert-dialog#usage>（复杂）

组件页固定 4 段，**按下面顺序**出现：

| section | 必需 | 内容 |
| --- | --- | --- |
| `## 用法 / Usage` | ✅ | 两个**纯代码块**（不放 `<ComponentPreview>`）：`import` + 一个最小 JSX 骨架 |
| `## 组合 / Composition` | 可选 | 仅 compound 组件需要——展示组件之间的父子关系 |
| `## 例子 / Examples` | 可选 | 多子节，每子节一个 `<ComponentPreview>` 演示一种属性 / 变体 / 风格 |
| `## API 参考 / API Reference` | 可选 | 4 列表（`属性 / 类型 / 默认值 / 描述` / `Prop / Type / Default / Description`），无默认填 `—`，属性名 + 类型用反引号包；多组件合一页时按组件分子节 |

frontmatter `title` + `description` 始终在；H1 由 DocPage 渲染，正文**不要**再写 `# 标题`。zh 用中文小节标题、en 用英文，但层级、子节数、表格列数保持对齐。

### Usage 写法

shadcn 同款，import 与最小骨架分两个代码块（**只显示代码，不放 ComponentPreview**）：

````mdx
## 用法

```tsx
import { Path, Step } from '@retikz/react';
```

```tsx
<Path stroke="currentColor">
  <Step kind="move" to="a" />
  <Step kind="line" to="b" />
</Path>
```
````

骨架展示组件名 / props / children 形态，不要求可运行——`<ComponentPreview>` 留给 Examples 段。

### Composition 适用

| 组件 | 是否写 Composition |
| --- | --- |
| `<Tikz>` | ✅ 容器，children 是 Kernel/Sugar |
| `<Path>` | ✅ 必须配 `<Step>` 子节点 |
| `<Node>` `<Draw>` | ❌ 单组件 |
| `<Step>` | ❌ 只作 `<Path>` 子节点；写在父组件页里 |

### 入口页 / 概念页例外

- **入口页**（`profile/introduction`、`profile/get-start`）有自己的章节布局（介绍 / 安装 / 步骤……），不强制走上面 4 段
- **概念页**（`concepts/*`）按概念走子节，配 `<ComponentPreview hideCode>` 当叙述插图

## Reference 词典页（`<ZodSchema>`）

`apps/docs/src/contents/core/reference/schema/<page>/index.{en,zh}.mdx` 下的页面用 **`<ZodSchema name="XxxSchema" descriptions={{...}} />`** 渲染字段表。Reference 词典是 IR schema 查询入口，跟"组件页"4 段结构无关。当前结构：4 个合并页（scene / entity / path / placement），每页一个或多个 H2/H3 + `<ZodSchema>` 块。

### name prop

变量名要在 `apps/docs/src/lib/schema-registry.ts` 注册（含 9 个顶层 + 10 个 Step 变体 + 2 个 Target 变体）。组件按 identity 反查 Zod schema 实例并自动出表 —— 字段名 / 类型 / 必填 / 英文描述都来自源码 `.describe()`。

### descriptions prop（中文 mdx 必填）

zh.mdx 用 `descriptions={{ 字段名: '中文释义' }}` 覆盖每个字段的英文描述。漏写则降级到英文 + 控制台 warn。**en.mdx 不传 descriptions**，全走 `.describe()` 英文源码。

### 嵌套 object 字段必须用点路径覆盖

字段类型是 **anonymous object**（即非注册表里的 schema，例：`NodeSchema.font` 嵌套 FontSchema、Step 各 variant 的 `label` 嵌套 StepLabelSchema）时，表格会**平铺**这些子字段为相邻匿名子行。子行描述也吃 zh.mdx 的 descriptions —— **必须用点路径**：

```tsx
<ZodSchema name="NodeSchema" descriptions={{
  font: '节点内文本的字体规格（family / size / weight / style，均可选）',
  'font.family': 'CSS font-family 字符串，如 "serif" / "monospace"',
  'font.size': '字号（用户单位）；未填走渲染器默认',
  'font.weight': 'CSS font-weight：keyword `normal`/`bold` 或数字 100..900',
  'font.style': 'CSS font-style：`normal` / `italic` / `oblique`',
}} />
```

漏写嵌套子字段 → 中文页该子行显示英文 `.describe()`（视觉残留）。控制台对每个漏写路径都会 warn。

### 哪些字段会被平铺？

判定条件：**父字段是顶层 object 字段 + 子 schema 不在 schema-registry**。检查方法：

1. 看 `packages/core` 源码，字段类型为 `XxxSchema.optional()` / `XxxSchema` 且 `XxxSchema = z.object({...})`，再确认 XxxSchema 不在 `schema-registry.ts` 21 项里 → 会被平铺
2. 开 dev server 看控制台 `[ZodSchema] ... no .describe() and no override` —— 列出所有漏写路径

目前需要翻译嵌套子字段的位置（**新加 schema / 字段时要重新检查**）：

| 父 schema.字段 | 嵌套 schema | 子字段 |
| --- | --- | --- |
| `NodeSchema.font` | FontSchema | family, size, weight, style |
| 8 个 step variant 的 `label`（Line / Fold / Curve / Cubic / Bend / Arc / CirclePath / EllipsePath） | StepLabelSchema | text, position, side |

union / array 内部的 object 不会被平铺（如 `NodeSchema.label` 是 union），保持折叠类型签名形态。

### 合并页 URL 锚点（rehype-slug 自动 id）

合并页（`path` / `placement` / `entity`）内多个 schema 用 H2/H3 标题分隔，rehype-slug 自动生成 id：

- `## Position` → `#position`
- `### Move` → `#move`
- `### CirclePath` → `#circlepath` —— **camelCase 不会插连字符**

注册表 URL 必须与自动 slug 对齐，否则 walker 输出的跨页 Link 会断。如要改 schema 名（如 `CirclePath` → `Circle Path`），rehype-slug 输出会变成 `circle-path`，registry 也得同步改。

### 加新 schema 到 Reference

1. 确认 schema 在 `@retikz/core` `index.ts` 已 export
2. `apps/docs/src/lib/schema-registry.ts` 加一行（含 schema instance + label + URL；URL 是合并页 + `#anchor` 或独立页）
3. 在合适的合并页 mdx 加 H2/H3 + `<ZodSchema name="..." descriptions={{...}} />`；zh 必须含所有字段（+ 嵌套点路径）；en 只写 `<ZodSchema name="..." />`
4. **如果是新增独立页**（不属于现有 4 合并页）：在 `data/core.ts` reference section 加 children 条目 + i18n 加 `core.refXxxSchema` key
5. 跑 `pnpm --filter @retikz/docs build` + dev 看控制台 warn

## 与 shadcn 的差异

| | shadcn/ui | retikz |
| --- | --- | --- |
| Demo 引用组件 | `<ComponentPreview name=...>` + `<ComponentSource name=...>` | 仅 `<ComponentPreview name=...>`（合二为一） |
| Demo 文件名 | `<name>-demo.tsx` | `<name>.demo.tsx`（**点号**后缀） |
| Demo 位置 | 集中在 `registry/` | mdx **同级目录** |
| Demo 形态 | 任意 React 组件 | `default export` 的**纯 FC**，**不能用 hooks**（IR 视图会调用一次该组件） |
| 双语 | 单语言 | 同目录 `zh.mdx` + `en.mdx` |
| 代码 Tab | React 源码 | React 源码 + IR JSON（自动算） |

`ComponentPreview` props：
- `name: string` —— 同级 `<name>.demo.tsx` 的 stem，必填
- `align?: 'center' | 'start' | 'end'` —— 渲染区垂直对齐，默认 `center`
- `componentClassName?: string` —— 覆盖渲染区容器样式（如想去掉默认 `h-72 p-10`）
- `hideCode?: boolean` —— 隐藏底部 View Code / 源码 / IR 面板，默认 `false`；**叙述性插图**（说明性的图表、流程图、概念示意）必须开 `hideCode`，**演示组件用法**保持默认

## MDX 可用元素

- GFM markdown（表格、列表、引用、链接、围栏代码块）全部支持
- 围栏代码块带语言后会上语法高亮；写 `` ```tsx showLineNumbers `` 开行号
- 行内 `<a href>`：`/` 开头自动走 react-router `<Link>`；`http(s)://` 开头自动 `target="_blank"`
- 自定义 JSX：
  - `<ComponentPreview ... />` —— 所有 demo 页用
  - `<ZodSchema ... />` —— 仅 Reference 词典页用，详见上文「Reference 词典页」

## Quick Reference

| 任务 | 改动 |
| --- | --- |
| 加叶子页 | i18n × 2 + `contents/.../{zh,en}.mdx` + 在 `data/<module>.ts` 注册 `{ id, label }` |
| 改正文 | `contents/.../{zh,en}.mdx`（双语都要） |
| 改菜单 / 标题文案 | `i18n/locales/{zh,en}.ts`（双语都要） |
| 加一个 demo | 同级写 `<name>.demo.tsx` + 在 mdx 里 `<ComponentPreview name="<name>" />` |
| 加菜单图标 | `data/core.ts` 的 `Page.icon`（仅一级 Page 支持） |
| 新建 module | `data/module.ts` 加条目 + 新建 `data/<module>.ts` + i18n 加新命名空间 |
| 加分组节点 | 父节点加 `children`；分组本身不写 mdx |
| 加新 IR schema 字典 | 注册到 `lib/schema-registry.ts` + 合适合并页加 `<ZodSchema>` 块（含 zh 嵌套点路径） |

## Common Mistakes

- **mdx 顶部又写 `# 标题`** —— H1 走 frontmatter，再写一遍会出现两个标题
- **demo 用 hooks** —— `ComponentPreview` 的 IR 视图会直接 `Component({})` 调用一次，hooks 在非渲染路径中会触发 React 错误
- **demo 文件名写成 `<name>-demo.tsx`** —— 我们用 `.demo.tsx`，glob 匹配不到，会显示 "Demo not found"
- **`<ComponentPreview src=...>`** —— 沿用 shadcn 写法。我们的 prop 是 `name`，不接受 `src`
- **`<ZodSchema>` 漏写嵌套字段点路径** —— `Node.font` / Step 各 variant 的 `label` 等嵌套 object 必须用 `'font.family'` / `'label.text'` 等点路径补完所有子字段中文，否则中文页该子行残留英文 `.describe()`
- **`<ZodSchema>` 的 name 不在 registry** —— 渲染会显示 "Unknown schema" 红框；新加 schema 必须先在 `apps/docs/src/lib/schema-registry.ts` 注册
- **只加一边 i18n** —— `en.ts: I18nResources = typeof zh` 类型反向约束，少一个 key 就编译失败
- **`label` 写成 `'core/getStart'` 或 `'getStart'`** —— 必须是 `'<ns>.<key>'` 完整路径，`I18nKey` 类型会卡你
- **改 `id` 不改目录** —— `id` 决定 URL 段、决定 mdx 加载路径、决定 sidebar 的 key，三者强耦合
- **写成连续的大段文字** —— 优先表格 / 示例 / 代码块；段落超过 3 行就拆
- **写防御性 / 攻击性内容** —— "竞品做不到 / 我们更好"等段落直接删，正向表述自身能力即可
- **普通用法页大段讲 IR 结构 / 字段** —— IR 是后端 / AI 用的隐藏层，正文说 DSL 即可；要看 IR 的用户点 `<ComponentPreview>` 的 IR tab
- **塞 jpg / png / Mermaid / 截图当演示** —— 演示用 `<ComponentPreview>` + retikz 自绘；ASCII 框图作辅助叙述可以

## 验证

加完一页之后，最少跑这两步：

```bash
pnpm --filter @retikz/docs build   # 类型 + 产物，能挡 i18n 缺 key、label 类型错
pnpm --filter @retikz/docs dev     # 浏览器打开新页，确认中英、demo、TOC、菜单都对
```
