# apps/docs

retikz 的文档站。本文件是 AI / 贡献者修改本子包时的基本指南。
**根 `AGENTS.md` 的全仓约定（commit、TS、React 组件、Tailwind v4、目录与文件命名、抽象分层等）继承生效，本文件只补 docs 站特有的内容。**

## 概览

- 用途：给最终用户看的文档站 + 库开发的运行时调试入口（workspace HMR）
- 部署：<https://pionpill.github.io/retikz/>
- 内容载体：MDX 双语（zh / en），运行时编译，不做 SSG

## 技术栈

- Vite + `@vitejs/plugin-react` + `@tailwindcss/vite`（Tailwind 4，CSS-only 配置）
- React 18 + react-router 7
- shadcn/ui new-york + slate（vendored 在 `components/ui/`）+ lucide-react
- react-i18next + LanguageDetector（zh / en）
- `@mdx-js/mdx` 运行时编译（remark-gfm / remark-frontmatter / rehype-slug / rehype-mdx-code-props）
- zustand（持久化 store）+ sonner（toast）+ react-syntax-highlighter

## 目录布局

```
apps/docs/
├── components.json          # shadcn 配置（new-york / slate / 别名 @/components 等）
├── vite.config.ts           # 别名 @ → src；optimizeDeps.exclude 让 workspace 包走 HMR
├── index.html
└── src/
    ├── main.tsx             # 入口：StrictMode + BrowserRouter，加载 i18n
    ├── App.tsx              # 路由表 + 重定向（module / section / 默认入口）
    ├── i18n/                # 国际化
    │   ├── index.ts         # i18next 初始化 + LANGS 常量 + Lang 类型
    │   ├── i18next.d.ts     # CustomTypeOptions 类型增强（t() 自动补全）
    │   └── locales/{zh,en}.ts
    ├── data/                # 路由 + 侧边栏数据
    │   ├── module.ts        # 顶层 module 列表（core / blog / about）
    │   ├── core.ts          # core module 的 sections + pages 树
    │   ├── blog.ts          # blog module 的 sections（设计理念 / 开发历程）
    │   ├── about.ts         # about module 的 sections（总览 / 发布 / 开发者）
    │   └── interface.ts     # Section / Page / SubPage / I18nKey 类型
    ├── contents/            # 文档正文（mdx）+ demo（.demo.tsx），双语并列
    │   └── <moduleId>/<sectionId>/<pageId>[/<subPageId>]/index.{zh,en}.mdx
    ├── store/               # zustand 持久化 store
    │   ├── useThemeStore.ts # light/dark，同步 .dark class 到 <html>
    │   └── useTocStore.ts   # 右侧 TOC 开关
    ├── layout/doc-layout/   # 主布局 + 文档页渲染（Sidebar / Outlet / DocPage / Actions / FooterNav / hooks）
    ├── components/
    │   ├── ui/              # shadcn vendored —— 不要手改
    │   ├── shared/          # 自研：component-preview / highlight-code / mdx-content
    │   └── icons/           # 品牌图标（GitHub、ChatGPT、Claude…）
    ├── hooks/use-mobile.ts  # shadcn 的视口断点 hook
    ├── lib/utils.ts         # cn() = clsx + tailwind-merge
    └── index.css            # Tailwind 4 入口 + 主题 css 变量
```

## 路由

```
/                                          → 默认入口（首 module 首 section 首 page）
/:moduleId                                 → 重定向到该模块首页
/:moduleId/:sectionId                      → 重定向到该栏目首页
/:moduleId/:sectionId/:pageId              → DocPage（3 段叶子）
/:moduleId/:sectionId/:pageId/:subPageId   → DocPage（4 段叶子）
*                                          → 回首页
```

URL 段 == 数据节点 `id` == `contents/` 目录段，三者强耦合，改一处必须三处一起改。
路由表与重定向逻辑都在 `src/App.tsx`。

## 三大数据点

- `contents/` —— mdx 正文 + 同级 `*.demo.tsx`
- `data/` —— 注册到侧边栏 / 路由的节点树
- `i18n/` —— 菜单标题 / UI 文案

加 / 改 / 翻译文档时三处常**同时改动**。具体步骤、骨架模板、易错点全部抽到
[`.agents/skills/docs-doc-principle/SKILL.md`](../../.agents/skills/docs-doc-principle/SKILL.md)，写文档前先读它；具体页型规范按需再读
[`docs-doc-component`](../../.agents/skills/docs-doc-component/SKILL.md) / [`docs-doc-example`](../../.agents/skills/docs-doc-example/SKILL.md)。

## 状态管理（zustand）

| Store           | 持久化 key     | 职责                                                                  |
| --------------- | -------------- | --------------------------------------------------------------------- |
| `useThemeStore` | `retikz-theme` | `theme: 'light' \| 'dark'`，setter 同时把 `.dark` class 切到 `<html>` |
| `useTocStore`   | `retikz-toc`   | `tocOpen: boolean`，右侧 TOC 抽屉开关                                 |

两者都用 `zustand/middleware` 的 `persist` 写到 `localStorage`。`useThemeStore` 的 `onRehydrateStorage` 在恢复时把 theme 重新刷到 DOM——保证刷新后不闪烁。

## 主题

shadcn 暗色靠 `<html class="dark">` 触发。明暗切换走 `useThemeStore.setTheme`，**不要手动操作 DOM**。颜色变量在 `src/index.css` 中以 CSS 变量形式定义；新增主题色 / 调色应在 css 这一层做。

## Tailwind

docs 站是全仓**唯一**用 Tailwind 的子包，版本为 v4（`tailwindcss@^4.2.4` + `@tailwindcss/vite`）。根 AGENTS.md 的 Tailwind v4 语法规则全部适用，这里补 docs 站具体落点：

- **入口**：`src/index.css`，开头是 `@import 'tailwindcss';` + `@plugin "tailwindcss-animate";` + `@custom-variant dark (&:is(.dark *));`——这套是 v4 写法，不要改成 v3 的 `@tailwind base/components/utilities`
- **没有 `tailwind.config.js`**：所有 design tokens（`--background` / `--foreground` / `--primary` / `--radius` 等）和 dark mode 变体都在 `src/index.css` 用 CSS 变量 + `@theme` / `@custom-variant` 维护——别新建 JS 配置文件
- **dark 触发器**：`@custom-variant dark (&:is(.dark *))` —— `<html class="dark">` 一加，`dark:bg-foo` / `dark:text-bar` 即生效。切 dark 走 `useThemeStore.setTheme`，不要手动 toggle class
- **shadcn vendored token 名**（`--background` / `--foreground` / `--primary` / `--primary-foreground` / `--ring` / `--radius` / `--sidebar-*` 等）必须保留，shadcn 组件硬绑这些名字；新加 token 时在 `:root` 和 `.dark` 都补一份
- **颜色用 `oklch(...)`**：现有 design tokens 用 oklch（如 `--background: oklch(1 0 0)`），新加颜色优先 oklch，不要混进 hex / rgb
- **`cn()` 来自 `lib/utils.ts`**（`clsx` + `tailwind-merge`）；条件组合 class 用 `cn(...)`，不要手拼字符串 / 三元嵌套
- **shadcn vendored 组件（`components/ui/*`）禁动**——其中的 Tailwind class 是 shadcn 生成的成品，要调样式在外层 wrapper 上覆盖或用 `cn()` 合并

## 国际化

- 语言：`['zh', 'en']`（`LANGS` 常量），`fallbackLng: 'zh'`
- 探测顺序：`localStorage('retikz-lang')` → `navigator`
- **zh 是 source of truth**：`I18nResources = typeof zh`，`en.ts: I18nResources = ...` 反向约束；缺 key 编译报错
- `t(key)` 类型安全：`i18next.d.ts` 把资源结构注进 `CustomTypeOptions`，IDE 自动补全
- 数据层 `label` 用完整路径（如 `'core.introduction'`），调用方 `t(label)` 直接用，**不要拼接** `` t(`<ns>.${id}`) ``

## UI 组件分层

```
components/
├── ui/        # shadcn vendored —— 不要手改（沿用根 AGENTS.md「React 组件规范」最后一条）
├── shared/    # 自研复用组件
│   ├── component-preview/   # MDX 用的 Demo + 源码 + IR JSON 切换卡片
│   ├── highlight-code/      # CodeBlock + 行内 HighlightedCode
│   └── mdx-content/         # MdxContent（运行时编译）+ MdxToc + 元素映射表
└── icons/     # 品牌 SVG（lucide 未收录的）
```

加新 shadcn 组件：`pnpm dlx shadcn@latest add <name>`，配置由 `components.json` 提供。

## 路径别名

- `@/*` → `apps/docs/src/*`（`vite.config.ts` 与 `tsconfig.json` 同步声明）
- 跨子包：`@retikz/core` / `@retikz/react`（`optimizeDeps.exclude` 让它们走 HMR）

## MDX 管线

`MdxContent` 用 `@mdx-js/mdx` 在浏览器端 `compile()` + `run()` 拿组件，`source` 变化就重编译：

1. `useMdxSource()` 按路由 + 当前语言查 `import.meta.glob('contents/**/*.mdx', { query: '?raw' })`，缺当前语言时按 `LANGS` 顺序回退
2. `MdxContent` 编译并提取 frontmatter；`title` 由 `DocPage` 渲染为 H1，`description` 为副标题
3. 元素映射表 `components.tsx`：标题 / 列表 / 表格走 Tailwind 重写；行内 link 按 `/` / `http(s)` 自动选 react-router `<Link>` 或新窗口 `<a>`；`<ComponentPreview>` 在此注入

H1 走 frontmatter，**mdx 正文里不要再写 `# 标题`**。

## 文档内容规范

- **不引用第三方外链**——mdx 正文里不主动加任何指向第三方网站的链接（zod 官网、RFC、第三方库主页、博客等）。需要时由维护者自己加。
- **不要在 mdx 中暴露项目结构路径（文件名 / 目录路径）**——文档站用户看不到也点不到这些路径。例如不要写"详见 `notes/architecture/core-design.md` §1.2"或"参 `.agents/skills/flow-alpha/SKILL.md`"——用户读到这种描述只能去仓库 / 本地手动找。
  - 如果确实要引用项目仓库内的文件（设计文档 / SKILL / AGENTS.md / ADR 等），**用 GitHub 完整 URL 作超链接**，让用户能点进去：
    ```mdx
    详见 [core-design.md §1.2](https://github.com/Pionpill/retikz/blob/main/notes/architecture/core-design.md)
    ```
    GitHub URL 是这条规则的**例外**——它指向项目自家 repo，对用户来说是可达的"项目延伸阅读"，与第三方外链性质不同。
  - 仅与"项目目录约定"相关的纯文字描述（如"ADR 起新文件用 `cp _template.md ...`"这种命令示例）可以保留路径作为 inline code，不需要超链接——因为这是给已经在用 retikz 的人看的操作说明
- **demo 含展示文本（节点标签 / 标注文字 / 任何会渲染到 SVG 的字符串）必须双语并行**：写两份文件 `<name>.zh.demo.tsx` + `<name>.en.demo.tsx`，分别用中文 / 英文文案。`ComponentPreview` 按当前 i18n 语言自动挑对应文件，找不到再回退到无 lang 后缀的 `<name>.demo.tsx`。
- **demo 含展示文本（节点标签 / 标注文字 / 任何会渲染到 SVG 的字符串）必须双语并行**：写两份文件 `<name>.zh.demo.tsx` + `<name>.en.demo.tsx`，分别用中文 / 英文文案。`ComponentPreview` 按当前 i18n 语言自动挑对应文件，找不到再回退到无 lang 后缀的 `<name>.demo.tsx`。
  - 纯几何 / 形状演示（无任何文字）继续用单文件 `<name>.demo.tsx`，不需要双份
  - 双份 demo 内 JSX 结构必须保持一致（同样的 props、同样的 `<TikZ>` size、同样的 layout）；只换文本字面量
  - mdx 一侧 `<ComponentPreview name="..."/>` 不需要改——name 不带 lang 后缀，由 ComponentPreview 自己解析
  - 反例：英文 mdx 里的 demo 出现"北 / 南 / 东 / 西"等中文，会让英语用户困惑、demo 截图也不一致

## 博客分区（blog module）

retikz 站点除了 docs 之外还挂了一个 **blog** 顶层 module，URL 形如 `/blog/<sectionId>/<pageId>`，复用 DocLayout / sidebar / mdx 管线，零新组件。

- 文章路径：`contents/blog/<sectionId>/<slug>/index.{zh,en}.mdx`；**zh 必填**，en 可选——缺 en 时 `useMdxSource` 自动 fallback 到 zh，并由 DocPage 在文章顶部渲染一条"暂无英文版"提示
- frontmatter 比 docs 多两个字段：`date`（必填，ISO `YYYY-MM-DD`）和 `tags`（必填，1-3 个字符串）；DocPage 仅在 `:moduleId === 'blog'` 时把它们渲染为标题下的元数据条
- 当前两个 section：`design`（设计理念）/ `journey`（开发历程）；以后扩节直接在 [`src/data/blog.ts`](src/data/blog.ts) 加新 Section + i18n key
- 想跨平台搬运（掘金 / 公众号）时手抄 mdx 正文——站内**不做导出工具**
- AI 翻译辅助流程：作者写完 `index.zh.mdx`，由 AI 译出 `index.en.mdx` 初稿，作者 review 后入版本

**写 blog 文章前先读** [`.agents/skills/docs-doc-blog/SKILL.md`](../../.agents/skills/docs-doc-blog/SKILL.md)（受众 / 篇幅 / 段落风格 / `<ComponentPreview>` 优先 / 双语术语 review / 系列拆分 / 跨平台手抄约束 / 与 docs 的差异）。通用规则（三处协同 / Comparison / 表格宽度等）继承自 [`docs-doc-principle`](../../.agents/skills/docs-doc-principle/SKILL.md)。

设计 spec：[`notes/decisions/core/2026-05-17-blog-section-spec.md`](https://github.com/Pionpill/retikz/blob/main/notes/decisions/core/2026-05-17-blog-section-spec.md)（含 markdown 导出方案——已废弃，改为手抄 mdx）。

## 全局快捷键

挂在 `doc-layout` 一级，覆盖所有页面：

- `Ctrl+L` —— 复制当前页 URL（toast 提示）
- `Ctrl+Alt+B` —— 切换右侧 TOC 抽屉

## 常用命令

```bash
pnpm --filter @retikz/docs dev      # 开发服务器（端口 5173，自动开浏览器）
pnpm --filter @retikz/docs build    # tsc -b && vite build（CI 把关）
pnpm --filter @retikz/docs lint     # ESLint
```

注：apps/docs 不发布产物，可以用 `tsc -b`，不会触发根 AGENTS.md 中"`tsc` 污染源码树"的问题（那条针对 `packages/*`）。

## 写文档？

总原则先看 [`.agents/skills/docs-doc-principle/SKILL.md`](../../.agents/skills/docs-doc-principle/SKILL.md)；写组件页另读 [`docs-doc-component`](../../.agents/skills/docs-doc-component/SKILL.md)，写示例页另读 [`docs-doc-example`](../../.agents/skills/docs-doc-example/SKILL.md)。
