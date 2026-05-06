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

## 文档结构（参考 shadcn/ui）

- 简单组件参考：<https://ui.shadcn.com/docs/components/spinner>
- 复杂组件参考：<https://ui.shadcn.com/docs/components/sidebar>

骨架（按需裁剪）：

1. frontmatter `title` + `description`（H1 由 DocPage 从 `title` 渲染，**不要再写 `#`**）
2. `## 概述 / Overview`（仅复杂组件）
3. `## 一个最小例子 / A Minimal Example` → `<ComponentPreview name="minimal-example" />`
4. `## 安装 / Installation`（仅入口/介绍页）
5. `## 用法 / Usage`：分小节展示属性、组合、变体；每个变体一个 `<ComponentPreview>`
6. `## API 参考 / API Reference`：用 markdown 表格列 props（name / type / default / description）

zh 用中文标题、en 用英文标题，但 Markdown 层级、列表条目数、表格列数保持对齐。

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

## MDX 可用元素

- GFM markdown（表格、列表、引用、链接、围栏代码块）全部支持
- 围栏代码块带语言后会上语法高亮；写 `` ```tsx showLineNumbers `` 开行号
- 行内 `<a href>`：`/` 开头自动走 react-router `<Link>`；`http(s)://` 开头自动 `target="_blank"`
- 唯一的自定义 JSX：`<ComponentPreview ... />`

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

## Common Mistakes

- **mdx 顶部又写 `# 标题`** —— H1 走 frontmatter，再写一遍会出现两个标题
- **demo 用 hooks** —— `ComponentPreview` 的 IR 视图会直接 `Component({})` 调用一次，hooks 在非渲染路径中会触发 React 错误
- **demo 文件名写成 `<name>-demo.tsx`** —— 我们用 `.demo.tsx`，glob 匹配不到，会显示 "Demo not found"
- **`<ComponentPreview src=...>`** —— 沿用 shadcn 写法。我们的 prop 是 `name`，不接受 `src`
- **只加一边 i18n** —— `en.ts: I18nResources = typeof zh` 类型反向约束，少一个 key 就编译失败
- **`label` 写成 `'core/getStart'` 或 `'getStart'`** —— 必须是 `'<ns>.<key>'` 完整路径，`I18nKey` 类型会卡你
- **改 `id` 不改目录** —— `id` 决定 URL 段、决定 mdx 加载路径、决定 sidebar 的 key，三者强耦合

## 验证

加完一页之后，最少跑这两步：

```bash
pnpm --filter @retikz/docs build   # 类型 + 产物，能挡 i18n 缺 key、label 类型错
pnpm --filter @retikz/docs dev     # 浏览器打开新页，确认中英、demo、TOC、菜单都对
```
