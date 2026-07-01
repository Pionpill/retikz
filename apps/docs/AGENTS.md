# apps/docs 工作指南

retikz 文档站。根 [`AGENTS.md`](../../AGENTS.md) 的全仓约定继承生效；本文件只补 docs 站特有结构、运行时约束和验证分级。

## 概览

- 用途：最终用户文档站 + 库开发调试入口。
- 部署：<https://pionpill.github.io/retikz/>
- 内容载体：MDX 双语（zh / en），运行时编译，不做 SSG。
- 技术栈：Vite、React 18、react-router 7、Tailwind v4、shadcn/ui vendored、lucide-react、react-i18next、MDX runtime、zustand、sonner。

## 目录与路由

```text
apps/docs/src/
  main.tsx              入口：StrictMode + BrowserRouter + i18n
  App.tsx               路由表与重定向
  contents/             MDX 正文与同级 demo
  data/                 module / sidebar / route 数据
  i18n/                 zh / en 文案与类型增强
  layout/doc-layout/    文档布局、Sidebar、DocPage、TOC、FooterNav
  components/ui/        shadcn vendored，不直接手改
  components/shared/    ComponentPreview、highlight-code、mdx-content
  components/icons/     品牌图标
  store/                zustand 持久化 store
  lib/                  cn() 等工具
  index.css             Tailwind v4 入口和主题变量
```

路由：

```text
/:moduleId
/:moduleId/:sectionId
/:moduleId/:sectionId/:pageId
/:moduleId/:sectionId/:pageId/:subPageId
```

URL 段、`data/` 节点 `id`、`contents/` 目录段三者强耦合，改一处必须同步其余两处。重定向逻辑在 `src/App.tsx`。

## 写文档先读 skill

docs 内容规则不复制在 AGENTS 中，按需动态加载：

- 通用规则：`.agents/skills/docs-doc-principle/SKILL.md`
- 组件页：`docs-doc-component`
- 示例页：`docs-doc-example`
- 分组落地页：`docs-doc-group`
- 概念页：`docs-doc-concept`
- blog：`docs-doc-blog`
- 文档评审：`docs-doc-review`
- 外站 markdown 转换：`docs-blog-converter`

关键不变量：

- 文档页面通常是 contents + data + i18n 三处协同。
- zh 是 source of truth，en 跟随；正文不再写 `# H1`，标题来自 frontmatter。
- 新 prop / IR 字段 / schema registry / public API 必须同步 API 表、说明和必要 demo。

## MDX 与 demo

- `MdxContent` 在浏览器端 compile + run，`useMdxSource()` 按路由和语言读取 raw MDX。
- `<ComponentPreview>` 负责 demo、源码、IR JSON 等展示；已有 demo 时正文不要重复粘完整代码。
- demo 有可见文本时写双语文件：`<name>.zh.demo.tsx` 与 `<name>.en.demo.tsx`；纯几何无文本可用单文件 `<name>.demo.tsx`。
- MDX 正文不主动加第三方外链。引用项目内文件时，给用户可点击的 GitHub URL；仅操作说明可保留 inline path。

## UI 与主题

- `components/ui/*` 是 shadcn vendored，不直接手改；自研复用组件放 `components/shared/`。
- Tailwind v4 入口是 `src/index.css`，使用 `@import 'tailwindcss';`、`@plugin`、`@custom-variant`、`@theme` 与 CSS variables；不要新增 v3 风格 `tailwind.config.js`。
- shadcn token 名（如 `--background`、`--foreground`、`--primary`、`--ring`、`--radius`、`--sidebar-*`）必须保留；新 token 同步 `:root` 和 `.dark`。
- 条件 class 用 `cn()`，不要手拼字符串。
- 主题状态由 `useThemeStore` 管理，并同步 `.dark` class 到 `<html>`；不要在业务代码里手动 toggle DOM class。

## i18n

- 语言：`zh` / `en`，fallback 为 `zh`。
- `zh` 定义 `I18nResources`，`en` 反向受类型约束；缺 key 应由类型检查暴露。
- 数据层 `label` 用完整 i18n path，调用方直接 `t(label)`，不要动态拼 key。

## 路径别名

- `@/*` -> `apps/docs/src/*`，由 `vite.config.ts` 与 `tsconfig.json` 同步声明。
- workspace 包通过 `@retikz/core`、`@retikz/react`、`@retikz/plot` 等导入；Vite 配置让 workspace 包走 HMR。

## Blog

blog 是 docs 站的顶层 module，路径为 `/blog/<sectionId>/<slug>`，复用 DocLayout 和 MDX 管线。

- 文章路径：`contents/blog/<sectionId>/<slug>/index.{zh,en}.mdx`。
- zh 必填；en 可选，缺失时页面 fallback 到 zh。
- frontmatter 额外需要 `date` 与 `tags`。
- 写作读 `docs-doc-blog`；要转掘金 / 公众号 / 知乎等外站 markdown 读 `docs-blog-converter`。

## 快捷键

- `Ctrl+L`：复制当前页 URL。
- `Ctrl+Alt+B`：切换右侧 TOC 抽屉。

## 常用命令

```bash
pnpm --filter @retikz/docs dev
pnpm --filter @retikz/docs build
pnpm --filter @retikz/docs lint
```

`apps/docs` 不发布 npm 包，可以用包内 build 脚本；packages 下仍按根 AGENTS 避免会污染源码树的 tsc 调用。

## 验证分级

| 改动类型 | 最小验证 |
| --- | --- |
| 只改 MDX 正文、表格、说明文字、站内链接 | `git diff --check` + 打开页面 / 关键链接 |
| 新增 / 修改 demo、data、helper、MDX import | `pnpm --filter @retikz/docs exec tsc --noEmit` + 浏览器确认 demo |
| 修改 `src/data` sidebar、`src/i18n`、schema registry | `pnpm --filter @retikz/docs exec tsc --noEmit` + 对应路由可访问 |
| 验证 CI / 发布产物等价路径 | `pnpm --filter @retikz/docs build` |

如果类型检查被无关未提交改动挡住，不要顺手修不相关范围；汇报阻塞文件和错误即可。
