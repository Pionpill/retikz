---
name: docs-doc-usage
description: Use when writing Retikz basic usage, named usage topics, extended usage, or compact single-page component documentation.
---

# 基础、专题与扩展用法

先读 [文档总则](../docs-doc-principle/SKILL.md)，按其中条件加载公共规则；本入口只选择当前页型需要的细节。

小体量组件合页直接遵循 [页型词典的合页结构](../docs-doc-principle/references/page-contract.md#小体量组件合页)，不叠加普通用法页骨架；按实际内容读取 reference / mechanism skill 的对应规则。

独立用法页共同阅读 [章节结构](references/structure.md)，然后只选当前模式：

| 页面     | 细节                                                         |
| -------- | ------------------------------------------------------------ |
| 基础用法 | [basic](references/basic.md)：最小入口与常用任务             |
| 专题用法 | [topic](references/topic.md)：有明确前置的单一任务           |
| 扩展用法 | [extended](references/extended.md)：已有能力的组合与高级选项 |

调用已有能力不因标题含“扩展”而进入自定义或实现原理页；新 Definition 的定义和注册才使用 docs-doc-extension，内部执行使用 docs-doc-mechanism。

Standard composite 再读 [专项契约](references/standard-composite.md)。
