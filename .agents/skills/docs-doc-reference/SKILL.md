---
name: docs-doc-reference
description: Use when writing or updating generated API reference or source-driven Schema reference pages, including export scope, translation artifacts, schema registry links and reference ownership.
---

# API 与 Schema 参考

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。两类参考是按需查询的契约资料，不声明阅读难度。页名和尾段固定，不因包复杂度升级底层。

## 分工与唯一真源

| 页面        | 契约真源                                              | 页面职责                                         |
| ----------- | ----------------------------------------------------- | ------------------------------------------------ |
| API 参考    | package exports、公开 barrel、TypeScript 签名与 JSDoc | 完整公开标识符、签名、参数、默认、返回与错误说明 |
| Schema 参考 | 公开 Zod schema 与 describe                           | 持久化 IR / 配置字段、类型、必填、默认和校验结构 |

开篇说明收录范围、公开入口并链接基础用法；主体按公开 owner / 标识符组织；需要时以延伸阅读收尾。不添加安装教程或内部执行章节。未公开的内部类型不得为生成参考而额外 export。

包参考拥有完整查询真源；组件参考可提供同一生成来源的局部视图，交叉链接指向唯一权威锚点。API 中的 schema 类型只给摘要并链接 Schema 参考，不复制全字段。没有独立 schema 的能力不创建占位页，也不为文档制造 schema。

组件 Schema 参考仅收录自身职责直接相关的公开 schema，按名称选择展示；不因属于同一包而全量生成或展开该包所有 schema。具体边界见 [Schema 参考](references/schema.md)。

配置参考在字段表前交代启用条件、默认值应用时机及省略值与显式值的区别；只描述该配置实际存在的语义。

## 按需读取

- API 生成、JSDoc 投影与英文翻译：[API 参考](references/api.md)
- ZodSchema、字段中文翻译与 registry：[Schema 参考](references/schema.md)

先核对当前脚本和注册器的真实能力。API 已有生成脚本；Schema 当前由 ZodSchema 读取源码渲染，中文说明写在 MDX。后续可在获准的工程任务中补生成与翻译产物，但不能把尚未落地的自动化写成现成命令。两类翻译都由 LLM 在编写或生成时完成并审阅，不在浏览器运行时翻译。

## 验证

核对公开导出、双语正文、引用锚点、实际字段覆盖和最新生成产物。API 按已有生成器检查缺译；Schema 对每个字段及匿名对象点路径检查中文说明，不能只看顶层摘要。生成检查不能证明语义正确，仍需对照源码。验证命令按 docs-doc-principle 与实际脚本执行，不虚构全仓 Schema 生成器。
