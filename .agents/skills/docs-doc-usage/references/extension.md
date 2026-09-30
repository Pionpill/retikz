# 拓展包组件文档

适用于 `@retikz/extension` 中多个并列的内置组件、Definition 或预设共用一页的文档。以 [shape 文档](../../../../apps/docs/src/modules/docs/contents/library/extension/shape/index.zh.mdx) 为结构范本，参数和能力仍以当前公开源码为准；包简介、快速开始、设计理念、自定义能力和独立原理专题各走原有页型。

## 章节结构

开篇用一段话说明本页提供哪些能力及可观察结果。正文依次为：

1. `## 接入方式` / `## Using this topic`：说明真实导入与装配入口，给无 controls、`hideCode` 的最小预览，再用 [DocTabs](../../docs-doc-principle/references/doc-tabs-steps.md) 展示实际支持的 React / Vanilla / IR 写法；只在入口确实存在时使用四栏
2. 每个并列能力单设 H2，标题按读者识别的功能命名；不要再设“例子”总节，也不把并列能力压成 H3。每节依次放用途与关键区别、就地 `ComponentPreview`、API / Schema 参考。演示提供能观察本节参数效果的 controls
3. `## 延伸阅读` / `## Further reading`：有相关主题时用 `LinkedSections` 收尾，不为凑结构放空节

每个能力的参考使用一组 `DocTabs`，默认 API，另一项为 Schema；没有独立、可公开访问的参数 Schema 时只展示实际存在的参考，不造占位 Tab。API Tab 内用 H4 写真实的参数类型或公开属性名，然后给入口说明和当前能力自己的 `字段 | 类型 | 说明` 表；Schema Tab 内用 H4 写真实 Schema 标识符，再用 `<ZodSchema>` 展示该 Schema。两种语言保留相同标识符、Tab value 和章节顺序。字段以公开类型、JSDoc 与 Schema 为准，遵循 [参考规则](../../docs-doc-reference/SKILL.md)；同一 Schema 被多个能力使用时保留其真实名称，不伪造能力专属 Schema。每节应能独立查阅，不用“同上”代替参数说明。

这一结构只规定并列能力的阅读顺序与就地展示，不要求把完整包 API 手写进各节；包级完整参考仍由现有生成来源维护。影响正确使用的装配条件和限制写在接入方式或对应能力旁，不只藏在参考表中。仅更新本规则不自动迁移现有页面。
