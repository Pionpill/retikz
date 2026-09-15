---
name: docs-doc-overview
description: Use when writing or restructuring a Retikz package overview page that introduces the package and links to its child documentation.
---

# 包总纲页写法

## 何时用本 skill

- 为包根节点写或重组总纲页，例如 `contents/kernel/packages/<package>/index.{zh,en}.mdx`
- 页面负责回答“这个包解决什么、是否需要安装、在 React / Vanilla 中怎样接入，以及接下来读什么”
- 动手前先读 [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 获取通用规则

不要把本 skill 用于组件家族、参考家族等通用分组落地页；这类页面继续使用 [`docs-doc-group`](../docs-doc-group/SKILL.md)。也不要把它套到叶子组件页、概念页或 API Reference。

## 定位：包入口，不是 API 目录

总纲页是包的第一个阅读入口。先用 frontmatter `description` 和一段正文说明它在系统中的职责、输入输出与不负责的边界，再让读者完成最小接入，并选择后续章节。

- H1 由 DocPage 渲染，正文不写 `# 标题`
- 先从 `package.json` 的 `exports`、公开 owner barrel 和真实 adapter 确认可导入入口；不要凭相邻包的形状虚构 React、Vanilla 或 Render 子入口
- 代码只展示公开 API 与可观察的最小闭环。深入配置、实现机制、扩展方式和完整 API 留给 child
- zh / en 成对维护，zh 为真源
- 包总纲页通常不放交互 demo；仅为理解职责所需的叙述图可以使用 `hideCode`

## 固定结构

按下列顺序写。`章节内容 / Contents` 必须是正文最后一个区块。

| 顺序 | 区块                                   | 要求                                                                                       |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | 开篇定位                               | frontmatter + 一段职责、边界与使用时机说明                                                 |
| 2    | 可选提示                               | 仅当包是可选能力、调试辅助或存在真实接入风险时，用 `<ComponentAlert>` 说明，而不是重复开篇 |
| 3    | `## 安装与使用` / `## Install and use` | 用 `<PackageManagerInstall packages="..." />` 给出 npm 包安装方式；随后按真实宿主说明接入  |
| 4    | `## 职责一览` / `## Responsibilities`  | 每个 child 一行，说明职责与何时阅读                                                        |
| 5    | `## 章节内容` / `## Contents`          | 用 `<LinkedSections items={[...]} />` 链接所有直接 child，且作为最后一个区块               |

不要用手写 `<LinkedCard>` grid 取代末尾的 `<LinkedSections />`。链接项的标题应与侧栏 i18n label 对齐，`url` 指向真实子页路由。

## 安装与使用

`<PackageManagerInstall>` 紧跟标题，安装包名来自真实 package / peer dependency 关系。需要安装 peer dependency 时，在组件前后解释它为何必需或何时可选；不要手写一组会漂移的 npm、pnpm、yarn 命令。

若同一能力同时支持 React 和 Vanilla，安装说明后先用一张简短表格概括两端的真实入口与接入位置，再用组合式 `DocTabs` / `DocTab` 展示两套完整接入，默认 React。每个分支组合 `DocSteps`，以“导入内容”（关键 import 及说明）和“接入渲染”（初始化、注入或调用及渲染代码）为基本结构，不固定步骤数量；按独立操作目标决定是否拆出其他步骤。共享安装、限制与比较放在 Tab 外。拆步标准和具体写法读 [`DocTabs / DocSteps`](../docs-doc-principle/references/doc-tabs-steps.md)。

- React 示例必须包含能力真正挂接到 JSX / Provider / Layout 或 renderer 的位置，以及最终可渲染的图或结果
- Vanilla 示例必须包含 authoring 输入、compile / render 调用位置与最终产物；不能止于创建 request、options 或 registry 对象
- 每段代码之后用一两句说明该端的注入点、共享范围和可观察结果
- 只有包确实只支持一端，或当前页面明确限定单一宿主时，才省略另一节；明确原因，不硬编不存在的 API

## 职责与章节索引

`职责一览` 是阅读路径，不是完整 API 清单。建议列为“文档 / 职责 / 适合何时查阅”（英文为 `Document | Responsibility | Read it when`），直接 child 各一行。

末尾 `<LinkedSections>` 的 items 与该表一一对应；避免在表或卡片之外再放第二组相同导航。新增、删除或移动 child 时，同步 data、i18n、职责表与 items 路由。

## 验证

按 [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 的纯 MDX 最小集执行：格式化、文档完整性检查与 `git diff --check`。若改了 frontmatter、MDX 组件或导航，额外在浏览器确认 zh/en、目录层级及末尾 `LinkedSections` 的卡片和链接。
