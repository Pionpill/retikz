# apps/docs

retikz 的文档站。本文件是 AI / 贡献者修改本子包时的基本指南。
**根 `AGENTS.md` 的全仓约定（commit、TS、React 组件、抽象分层等）继承生效，本文件只补 docs 站特有的内容。**

## 概览

- 用途：给最终用户看的文档站 + 库开发的运行时调试入口（workspace HMR）
- 部署：<https://pionpill.github.io/retikz.doc/>
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
    │   ├── module.ts        # 顶层 module 列表（core / flow / plot）
    │   ├── core.ts          # core module 的 sections + pages 树
    │   └── interface.ts     # Section / Page / SubPage / I18nKey 类型
    ├── contents/            # 文档正文（mdx）+ demo（.demo.tsx），双语并列
    │   └── <moduleId>/<sectionId>/<pageId>[/<subPageId>]/index.{zh,en}.mdx
    ├── store/               # zustand 持久化 store
    │   ├── useThemeStore.ts # light/dark，同步 .dark class 到 <html>
    │   └── useTocStore.ts   # 右侧 TOC 开关
    ├── layout/DocLayout/    # 主布局：Sidebar + Header + Outlet + 全局快捷键
    ├── pages/doc-page/      # 文档页渲染器（DocPage / Actions / FooterNav / hooks）
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
[`.agents/skills/docs-doc-write/SKILL.md`](../../.agents/skills/docs-doc-write/SKILL.md)，写文档前先读它。

## 状态管理（zustand）

| Store           | 持久化 key     | 职责                                                                  |
| --------------- | -------------- | --------------------------------------------------------------------- |
| `useThemeStore` | `retikz-theme` | `theme: 'light' \| 'dark'`，setter 同时把 `.dark` class 切到 `<html>` |
| `useTocStore`   | `retikz-toc`   | `tocOpen: boolean`，右侧 TOC 抽屉开关                                 |

两者都用 `zustand/middleware` 的 `persist` 写到 `localStorage`。`useThemeStore` 的 `onRehydrateStorage` 在恢复时把 theme 重新刷到 DOM——保证刷新后不闪烁。

## 主题

shadcn 暗色靠 `<html class="dark">` 触发。明暗切换走 `useThemeStore.setTheme`，**不要手动操作 DOM**。颜色变量在 `src/index.css` 中以 CSS 变量形式定义；新增主题色 / 调色应在 css 这一层做。

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

- **不要引用项目外的内容，包括通过超链接跳转**——mdx 正文里不主动加任何指向项目仓库 / 文档站之外的链接（zod 官网、RFC、第三方库主页、自家 GitHub 仓库 blob 链接等都算外链）。需要的话由维护者自己加。

## 全局快捷键

挂在 `DocLayout` 一级，覆盖所有页面：

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

直接跳到 [`.agents/skills/docs-doc-write/SKILL.md`](../../.agents/skills/docs-doc-write/SKILL.md)。
