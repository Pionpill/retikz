---
name: docs-doc-group
description: Use when writing a Retikz solution, package or component-family group landing page that explains scope and guides readers to child documents, with installation only for installable package entries.
---

# 分组总纲

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。解决方案、包和组件家族共用本页型，固定入门难度。分组根路径即总纲，不再另建 overview 子页。

## 结构

1. 开篇定位：description 与短正文说明解决什么问题、适合谁、成员怎样协作及职责边界
2. `## 职责一览`：用表格对照直接成员或章节的职责与阅读时机，默认三列“成员 / 职责 / 何时阅读”，首列按对象改为章节、组件或包；英文标题为 `Responsibilities at a glance`。表格负责横向比较，底部卡片负责导航，不互相替代
3. 整体认识：说明成员如何协作，至少提供一个贯穿场景的整体示例或关系图，并在图前后解释观察重点与结论；叙述图用 ComponentPreview hideCode，不展开完整调用链
4. 可安装包入口使用 `## 安装与使用`，完成最小接入；普通组件总纲不重复安装。已有用法 demo 时保留 ComponentPreview 源码入口，React / Vanilla 引入与调用直接查看示例，不另补重复的接入说明、DocTabs 或通用渲染片段；仅叙述图隐藏源码
5. 选择与边界：结合真实任务说明从哪部分开始、哪些问题由其他组负责；按需用短表或列表，不与下方卡片逐条重复
6. `## 章节内容`：LinkedSections 按导航顺序覆盖直接子页，作为最后区块

标题为分组对象名，标签与 frontmatter 对齐。包入口、方案简介与基础用法不互相复制：总纲说明归属和阅读路径，简介帮助选择方案，基础用法完成具体调用任务。

## 内容体量与侧重点

- 总纲不能只有导语和子页导航；读者不打开子页，也应能说清本组解决什么、成员怎样协作、从哪里开始
- 默认达到约一页的有效阅读体量；中文正文通常 400–700 字，配一张图或一个示例。字数与页长是检查信号，不是硬配额；不靠重复子页、参数字典、内部原理或放大留白撑页
- 概念组讲概念关系，组件组讲组合任务，包总纲讲职责与接入；即使子页面向底层读者，总纲仍先用通俗场景建立认识
- 贯穿示例只解释跨成员的共同问题；完整步骤、特殊分支与实现细节留给子页。既有合适图示可以复用，不另造同义示例

## 包的安装与接入

安装名、公开子路径和 peer dependencies 先从实际 package exports 与依赖关系核对。PackageManagerInstall 管理包管理器命令；共享安装放 Tab 外，宿主专属依赖放对应 Tab 内。两端步骤按 [DocTabs / DocSteps](../docs-doc-principle/references/doc-tabs-steps.md)，只支持单端或无框架差异时使用真实入口。

总纲接入示例到最小结果即停止，复杂配置、自定义 Definition、实现原理与完整参考留在独立子页。已有快速开始能承载完整安装时链接该入口，避免多个方案根页重复维护同一安装教程；实际可独立安装的包仍保留本包所需依赖与接入说明。

组件总纲的示例服务整体认识；完整接入步骤与详细配置留给快速开始或基础用法子页。

## 子页索引

子页按基础用法、专题、自定义、实现原理、API 参考、Schema 参考排序；不存在的任务不造空页。每张卡的 title 与目标页名一致，description 说明阅读目的，URL 指向真实路由。

组件家族可按成员职责比较；不要强制所有领域都套 Kernel / Sugar 列。Plot 的语法阶段、包的工具函数等按自身模型解释。分组不重复完整 props、字段词典或底层实现，必要的通用术语在首次出现时解释。

导航改动读 docs-doc-navigation；文档页与卡片验证按 docs-doc-principle。总纲固定入门是阅读规则，当前 children 节点不支持 difficulty 字段时不越过类型契约硬写。
