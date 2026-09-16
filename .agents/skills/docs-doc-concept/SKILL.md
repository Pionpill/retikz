---
name: docs-doc-concept
description: Use when writing Retikz basic concepts, core constraints or design philosophy in any solution; distinguishes mental models and design choices from source-level execution explanations.
---

# 概念文档

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。按任务分类，不要求 concepts 路径：基础概念固定入门，核心概念与设计理念固定进阶；输入到输出的内部执行过程归 docs-doc-mechanism，固定底层。概念分组根页使用 docs-doc-group。

## 三种概念任务

| 类型     | 回答的问题           | 写作边界                               |
| -------- | -------------------- | -------------------------------------- |
| 基础概念 | 调用前必须知道什么   | 从场景、可观察图形与最少术语开始       |
| 核心概念 | 公开模型遵守什么约束 | 解释模型、关系、不变量、选择和常见误解 |
| 设计理念 | 为什么用这样的抽象   | 解释职责、边界和取舍；不展开源码调用链 |

设计理念不能把内部实现细节伪装成使用前提。需要源码逐阶段解释时拆成独立原理页。概念页引用 ADR 核对设计，但当前行为仍以实现为据。

允许用最小代码与必要字段解释概念；定义、注入与运行闭环归自定义教程，执行阶段与内部状态流转归原理页。“可以跳过”提示不能替代职责拆分。

## 组织

开篇说明读者会遇到的问题；随后按概念命名 H2，不强制固定小节数量。每个小节先用普通语言说明含义，再引入专名，用图、表或最小 demo 解释关系，最后说明边界与误解。必要前提在使用前就近解释，不前置无用术语表。

按当前领域建立模型：Kernel 的坐标与图元、Plot 的数据到视觉映射、runtime 的执行关系分别解释。Kernel / Sugar 等仅是领域词汇，不是跨方案固定分类列。

- 结构、层次、关系或流程需要叙述图时用 retikz + ComponentPreview hideCode，读取 docs-figure-contract；图前给观察重点，图后收束结论
- 演示公开行为的最小 demo 保留源码；完整调用教程链接 usage，完整契约链接 API / Schema 参考
- 不为说明概念复制全局编译管线、安装步骤或完整字段表；共享概念保持唯一权威页
- 末尾使用 `## 延伸阅读` 与 LinkedSections，链接最相关的用法、原理和参考

## 检查

读者能否说清概念解决什么、与相邻概念如何区分、如何影响实际调用；固定难度是否与内容深度相符。发现原理混入时拆内容，不只改标签。双语、导航、demo 与视觉验证按 docs-doc-principle。
