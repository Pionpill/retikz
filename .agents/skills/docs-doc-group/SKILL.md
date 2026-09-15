---
name: docs-doc-group
description: Use when writing a Retikz solution, package or component-family group landing page that explains scope and guides readers to child documents, with installation only for installable package entries.
---

# 分组总纲

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。解决方案、包和组件家族共用本页型，固定入门难度。分组根路径即总纲，不再另建 overview 子页。

## 结构

1. 开篇定位：description 与短正文说明解决什么问题、适合谁、成员怎样协作及职责边界
2. 可选叙述图：确需展示家族关系时用 ComponentPreview hideCode，不放完整调用流程或函数清单
3. 可安装包入口的 `## 安装与使用`：PackageManagerInstall + React / Vanilla DocTabs，完成最小接入；普通组件家族不放安装
4. 可选职责比较：需要帮助读者区分成员时用简短表格，不与下方卡片逐条重复
5. `## 章节内容`：LinkedSections 按导航顺序覆盖直接子页，作为最后区块

标题为分组对象名，标签与 frontmatter 对齐。包入口、方案简介与基础用法不互相复制：总纲说明归属和阅读路径，简介帮助选择方案，基础用法完成具体调用任务。

## 包的安装与接入

安装名、公开子路径和 peer dependencies 先从实际 package exports 与依赖关系核对。PackageManagerInstall 管理包管理器命令；共享安装放 Tab 外，宿主专属依赖放对应 Tab 内。两端步骤按 [DocTabs / DocSteps](../docs-doc-principle/references/doc-tabs-steps.md)，只支持单端或无框架差异时使用真实入口。

总纲接入示例到最小结果即停止，复杂配置、自定义 Definition、实现原理与完整参考留在独立子页。已有快速开始能承载完整安装时链接该入口，避免多个方案根页重复维护同一安装教程；实际可独立安装的包仍保留本包所需依赖与接入说明。

## 子页索引

子页按基础用法、专题、自定义、实现原理、API 参考、Schema 参考排序；不存在的任务不造空页。每张卡的 title 与目标页名一致，description 说明阅读目的，URL 指向真实路由。

组件家族可按成员职责比较；不要强制所有领域都套 Kernel / Sugar 列。Plot 的语法阶段、包的工具函数等按自身模型解释。分组不重复完整 props、字段词典或底层实现，必要的通用术语在首次出现时解释。

导航改动读 docs-doc-navigation；文档页与卡片验证按 docs-doc-principle。总纲固定入门是阅读规则，当前 children 节点不支持 difficulty 字段时不越过类型契约硬写。
