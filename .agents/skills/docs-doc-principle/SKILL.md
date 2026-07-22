---
name: docs-doc-principle
description: Use when changing any retikz apps/docs content, route data, i18n, demo, SourceLinks, or schema reference before loading the matching page-type skill.
---

# retikz 文档总原则

本 skill 只保留所有文档任务都需要的共享契约。页型结构、controls、Reference 和预览源码规则按任务动态加载，不在这里重复。

## 必读顺序

1. 先读 `apps/docs/AGENTS.md` 与本 skill
2. 再按页型只读一个主 skill：
   - 组件页：[`docs-doc-component`](../docs-doc-component/SKILL.md)；Standard Tier 2 composite 组件页继续读 `docs-doc-standard-composite`
   - 扩展指南：[`docs-doc-extension`](../docs-doc-extension/SKILL.md)
   - 示例页：[`docs-doc-example`](../docs-doc-example/SKILL.md)
   - 分组落地页：[`docs-doc-group`](../docs-doc-group/SKILL.md)
   - 概念页：[`docs-doc-concept`](../docs-doc-concept/SKILL.md)
   - blog：[`docs-doc-blog`](../docs-doc-blog/SKILL.md)
3. 仅在命中条件时继续加载：
   - 带 controls：[`docs-doc-control`](../docs-doc-control/SKILL.md)
   - 使用 `<ComponentPreview>` 的源码视图、多文件或数据文件：[`references/component-preview.md`](references/component-preview.md)
   - 位置、引用、边界或教学辅助线 demo：[`references/demo-visual-language.md`](references/demo-visual-language.md)
   - Reference / `<ZodSchema>`：[`references/reference-pages.md`](references/reference-pages.md)
   - 叙述图：[`docs-figure-contract`](../docs-figure-contract/SKILL.md)；解释实现流程再读 `docs-figure-logic`
   - 完稿评审：[`docs-doc-review`](../docs-doc-review/SKILL.md)

不要为“可能用到”预读所有资源；按页面真实内容加载。

## 三处协同

一个普通页面通常同时涉及：

```text
apps/docs/src/modules/docs/
  contents/<moduleId>/<sectionId>/<pageId>/index.{zh,en}.mdx
  data/<moduleId>.ts

apps/docs/src/i18n/locales/{zh,en}.json
```

URL 段、`data` 节点 `id` 与 `contents` 目录段必须一致。新增或移动页面时同步正文、data、i18n 和全仓站内链接；不要只移动文件。

- 普通文档 zh/en 必须成对；zh 是 source of truth，en 跟随
- blog 允许只有 zh，具体规则由 `docs-doc-blog` 拥有
- 新 i18n key 先加 zh，再加 en；data 的 `label` 使用完整 i18n path
- 分组节点有自己的 `index.{zh,en}.mdx`，不默认重定向首个 child
- 带 children 的路由 id 优先单个英文词；多词叶子页才使用连字符

## 读者与内容权重

默认读者会 React / TypeScript，但不熟 TikZ、IR、几何术语和项目历史。先讲场景和行为，再命名概念；先给用户路径，再放可跳过的内部机制。

写作前从当前实现、测试和能力域 completeness 文档确认：

1. 根问题与核心抽象
2. 本页对象的职责和不负责的边界
3. 输入、处理、产物与下游消费是否闭环
4. 内置与自定义是否共用 Definition、registry、resolver 和消费路径

正文按能力语义组织，不按 prop 或视觉变体数量组织。边框色、背景色、线宽、透明度、字号等通用视觉属性只简要说明，并收进 API 表或一个 controls playground；只有改变语义、结构、组合、所有权、错误或编译机制的差异才值得独立章节或静态 demo。

## 写作规则

- 段落尽量不超过 3 行；步骤用列表，映射和选择用表格，用法用 demo 或代码块
- H1 由 frontmatter 渲染，正文不再写 `# 标题`
- `frontmatter.description` 要能脱离页面独立说明根问题、核心职责或使用入口，不写“本页介绍”
- 中文标题不机械附括号英文；必须识别的 API、schema、类型名保留原名
- 生僻术语在每页首次出现时就近解释
- 正文保持中性，不写“竞品做不到 / 我们更强”；生态对照放 `<Comparison>`，隐藏后正文仍自洽
- mdx 正文默认不加第三方外链；项目仓库内延伸阅读使用可点击的 GitHub 完整 URL。blog 的例外由 `docs-doc-blog` 定义
- 不把本地文件路径当普通读者可用的延伸阅读

## DSL、IR 与图示

用户正文优先展示 DSL（如 `<Layout>`、`<Node>`、`<Path>`、`<Draw>`）。普通用法页不为了“完整”重复 IR JSON 或编译器内部；IR 只在架构、持久化、AI 接入或必须用它解释公开行为时出现。

所有功能 demo 和叙述图都用 retikz 自绘：同级 demo + `<ComponentPreview>`。不使用截图、PNG/JPG/GIF、Mermaid、Excalidraw 或 draw.io 代替功能展示。叙述图默认 `hideCode`；可复制用法保留源码。

关系、流程或架构图的具体画法由 `docs-figure-contract` 拥有，本 skill 只决定是否需要图。

## API 与源码真源

API 参考按需使用“公开导出概览 → 核心契约 → 重要闭合集合”：

1. 只列本页完成任务直接需要的公开导出
2. props、Definition、options 等核心契约再展开字段表
3. 影响选择的 enum、const object、内置 Definition 或 registry 才单列闭合集合

文档里的函数、类型和常量名必须是从所属包公开入口可导入的真实标识符。不要把概念简称、内部类型或 owner 深层 export 冒充公共 API。写 API 表前沿着“组件 Props / schema → owner barrel → package root”核对；宿主组件页还要检查同 owner barrel 的 Provider、Context、hook 与 helper，避免漏掉用户完成任务所需的伴随导出。

共享或继承 props 不在每页复制完整字段表：用一行说明公开共享契约及其职责，并链接到唯一权威页；本页只展开新增或重定义的字段。

机制说明先写用户可观察行为，再用 `<SourceLinks>` 给直接实现入口。每项 `path` 使用仓库相对路径，行号范围最小且必须仍支撑正文结论；源码链接不能替代解释。

## 文档宽度

正文最大宽度 800px，表格单元格默认不换行。表格优先 3 列以内；过长内容用 `<br />` 或拆出正文。MDX 表格中的 union `|` 写成 `\|`，同一字段的多个类型放在同一行内用 `<br />` 分隔。

## 页面新增速查

新增叶子页时同步：

1. `apps/docs/src/i18n/locales/{zh,en}.json`
2. `apps/docs/src/modules/docs/contents/.../index.{zh,en}.mdx`
3. `apps/docs/src/modules/docs/data/<moduleId>.ts`
4. 相关 sidebar、Related、LinkedCard 与正文链接

分组落地页、扩展页和 blog 的额外元数据由对应页型 skill 定义。

`introduction` / `get-start` 等入口页按读者任务组织，不强套组件或示例页结构，但仍服从本 skill 的三处协同、双语、写作权重与验证规则。

## 验证

先运行机械一致性检查，再做页面语义和视觉判断：

```bash
node .agents/skills/docs-doc-principle/scripts/check-doc-integrity.mjs --scope <module-or-subtree>
```

脚本检查普通页面双语配对、双语标题层级、站内路由与锚点、`SourceLinks` 文件/行号、`ComponentPreview` 主 demo 文件；它不能判断 API 描述是否符合实现、SourceLinks 是否真正支撑结论、demo 是否可读，因此不能替代源码核对和浏览器检查。

按改动范围选择最小有效验证：

| 改动                                    | 最小验证                                                   |
| --------------------------------------- | ---------------------------------------------------------- |
| 纯 MDX 正文、表格、站内链接             | 完整性脚本 + Prettier + `git diff --check` + 关键页面/链接 |
| frontmatter、标题、MDX 组件、LinkedCard | 上述检查 + 浏览器确认 zh/en、TOC、菜单                     |
| demo、data、helper、MDX import          | 上述检查 + docs `tsc --noEmit` + 浏览器确认 demo           |
| docs data、i18n、schema registry        | 上述检查 + docs `tsc --noEmit` + 对应路由/Schema           |
| CI 或产物等价验证                       | docs build                                                 |

新建 `*.demo.tsx` 时按 [`ComponentPreview 按需契约`](references/component-preview.md) 的新文件规则验证，不依赖旧 dev session 的热更新状态。

完成前还要人工确认：

- 核心功能、通用功能和边界的篇幅权重合理
- API 名可从公共入口导入，默认值与实现一致
- SourceLinks 覆盖真正的决策分支，不只是浅层入口
- 页面、demo、controls 在真实宽度下可读，错误态中没有 `Demo ... not found` 或 `Unknown schema`
- zh/en 语义对齐，而不只是标题数量相同
