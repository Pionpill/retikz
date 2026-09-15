---
name: docs-doc-entry
description: Use when writing a Retikz solution introduction, quick start or changelog page; these fixed beginner entry pages are distinct from group overviews and individual capability tutorials.
---

# 快捷入口文档

先读 docs-doc-principle 和 [页型词典](../docs-doc-principle/references/page-contract.md)。三个入口固定入门难度，不以包实现复杂或发布内容深奥升级难度。

## 简介

用 description 与首段说明解决的问题、适用对象、边界与代表性结果。按能力意义组织少量章节；解释与相邻方案的选择关系，末尾用延伸阅读链接快速开始。不要重复根页的全部章节索引、完整 API 清单或内部架构。

## 快速开始

目标是从未接入到第一个可观察结果：必要前提 → 安装与使用 → 最小结果说明 → 延伸阅读。真实支持双宿主时使用 PackageManagerInstall 与 React / Vanilla DocTabs；每端闭合 import、接入和结果，不只创建配置对象。过程仅引入完成本例必需的概念；后续能力链接专题或组件基础用法。

普通 TypeScript 工具无宿主差异时使用共同入口，不编造 React 包或 JSX。安装、Tab 与步骤的固定写法见 [DocTabs / DocSteps](../docs-doc-principle/references/doc-tabs-steps.md)。

## 更新日志

沿用实际发布数据、版本分组和已有 changelog 渲染组件，不手写另一套历史。先写变化及用户影响，再补必要技术细节和相关文档入口；代码标识符与版本号保持准确。版本详情同样固定入门难度，不能因内容来自技术发布记录而沿用维护者叙事；深入机制链接底层页。

日志可能由 data 与渲染器提供，不为满足文件数量新增空 MDX。没有发布记录时如实说明，不虚构版本或变更。

## 检查

- 三入口名称、顺序、路径和难度符合词典
- 简介帮助选择，快速开始能跑通，更新日志来自真实记录
- 两种接入支持情况准确；共享限制不藏在一个 Tab 内
- 不因入口新增顺带重写所有下游页面
