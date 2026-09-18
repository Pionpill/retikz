---
name: docs-doc-principle
description: Use when writing or reviewing Retikz documentation, demos, figures, controls, or navigation. Routes to page-type skills and shared contracts.
---

# 文档总则

先读 `apps/docs/AGENTS.md`，确认读者任务、语义 owner 和获准范围。以当前公开入口、实现与测试核对事实；旧文案和 ADR 不代替当前行为。只改 skills 时不迁移现有文档或 demo。

## 选择入口

先按 [页型词典](references/page-contract.md) 确定页型、名称与难度，再读一个主写作入口；不要加载整套 skills。

| 阅读任务                           | 主入口                                       |
| ---------------------------------- | -------------------------------------------- |
| 简介、首次接入、更新日志           | [入口页](../docs-doc-entry/SKILL.md)         |
| 解决方案、包、组件家族总纲         | [分组页](../docs-doc-group/SKILL.md)         |
| 基础、专题、扩展用法：调用已有能力 | [用法页](../docs-doc-usage/SKILL.md)         |
| 定义并注册新能力                   | [自定义页](../docs-doc-extension/SKILL.md)   |
| 概念、约束、设计取舍               | [概念页](../docs-doc-concept/SKILL.md)       |
| 内部执行、数据变化、源码导览       | [实现原理](../docs-doc-mechanism/SKILL.md)   |
| API、Schema 或公开 JSDoc           | [参考与注释](../docs-doc-reference/SKILL.md) |
| 分步教程、成品展示                 | [示例](../docs-doc-example/SKILL.md)         |
| 作者博客                           | [博客](../docs-doc-blog/SKILL.md)            |
| 独立文档审查                       | [评审](../docs-doc-review/SKILL.md)          |

站点 React/UI 开发使用 [develop-docs](../develop-docs/SKILL.md)，实现后的文档同步使用 [develop-document](../develop-document/SKILL.md)，外站转换使用 [docs-blog-converter](../docs-blog-converter/SKILL.md)。

## 按条件加载

命中条件即在修改对应内容前读取；同一任务已读且未变化的文件不重复读。reference 中的相对链接以其所在目录解析，命令默认从仓库根运行。

| 当前任务涉及                            | 必读 reference                                                      |
| --------------------------------------- | ------------------------------------------------------------------- |
| 新建、移动页面或调整侧栏                | [导航与路由](references/navigation.md)                              |
| 文档站文件归属、目录或导入变化          | [代码结构](references/code-structure.md)                            |
| ComponentPreview、源码视图、多文件 demo | [预览契约](references/component-preview.md)                         |
| controls、presets、交互试验场           | [Controls](references/controls.md)                                  |
| 调整 demo 高度、面板宽度或裁切          | [尺寸测量](references/preview-sizing.md)                            |
| 接入方式、安装、宿主切换                | [DocTabs / DocSteps](references/doc-tabs-steps.md)                  |
| 章节涉及可集中回查的公开成员            | [相关属性](references/component-props.md)                           |
| 文中 API、公开常量或 SourceLinks        | [文中 API](references/inline-api.md)                                |
| 章节索引或延伸阅读                      | [LinkedSections](references/linked-sections.md)                     |
| 功能 demo 的辅助线、坐标或比较参照      | [Demo 视觉语义](references/demo-visual-language.md)                 |
| 叙述性结构、关系或流程图                | [插图契约](references/figure-contract.md)                           |
| 解释实现流程、依赖、映射或状态演进      | 插图契约 + [逻辑图](references/figure-logic.md)                     |
| Standard composite                      | [Standard 专项](../docs-doc-usage/references/standard-composite.md) |

## 共性约束

- 普通文档 zh/en 成对，zh 为写作真源；博客语言例外由博客入口规定。公开签名、JSDoc、schema 与默认值仍以源码为契约真源。
- contents、data、i18n 协同；URL 段、目录段和 data id 对齐。共享概念与完整 API/Schema 各有唯一 owner。
- 开篇说明问题与可观察结果；段落围绕一个观点，术语首次出现就近解释。步骤用列表，重复比较用表格，不按行数或字数强行拆段。
- H1 来自 frontmatter；description 脱离页面也能说明职责或使用入口。小节按读者任务命名，不按 prop 数量分节。
- 可复制例子使用真实公开导入和最上层 Source IR；不把内部 Canonical 或 lower 结果展示为用户写法。
- 公开判别字段有多种写法时，demo 前用紧凑表格解释可选形式、代码与可观察差异；demo 后的总结表不重复该表。
- 算法关系用 MDX MathJax 公式；代码块用于真实代码。普通文档的生态对照放 Comparison，隐藏后正文仍自洽。
- 图形与功能展示使用 retikz + ComponentPreview。叙述图隐藏源码并设置图型；普通用法 demo 不设置叙述图 type。具体文件与图型规则见对应 reference。
- 正文默认不主动加第三方外链；项目文件使用可点击 GitHub URL，站内导航使用真实路由。博客引用规则单独定义。
- 正文约 800px，表格优先保持少列；长说明拆到正文，MDX 表格中的 union 竖线须转义。

## 完成条件

实际文档改动按 [验证规则](references/validation.md) 执行机械检查、源码核对与真实页面检查；脚本通过不代表可读性或契约语义通过。新增页面或重写主线的读者评审按获批计划执行，不由 skill 自动授权调度。

仅改 skill：验证 frontmatter、相对引用、被合并入口残留和典型任务分流；移动脚本还要检查路径解析并运行已有测试。交付说明实际验证范围，不宣称未执行的模型遵循率测试通过。
