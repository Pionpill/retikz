---
name: develop-document
description: Use when synchronizing Retikz user-visible behavior with documentation after implementation, or coordinating a documentation-first change across pages, demos, navigation and generated references.
---

# 文档同步流程

## 入口

先读 apps/docs/AGENTS.md 与 docs-doc-principle；由其页型词典选择主写作 skill，不在本流程维护第二套模板。导航或路由重构额外读 [navigation](../docs-doc-principle/references/navigation.md)；完稿规范与读者检查读 docs-doc-review。

## 确定范围

从实际实现、测试契约与已批准任务确认受影响文档。旧正文用于查事实和链接，不作为新结构标准；读取对应 zh/en、demo 和权威参考，决定更新、拆页或新增。仅修改 skill 的任务不要求同步迁移已有正文或实现检查器。

- API / props：同步示例中必要说明与生成参考，避免手写完整副本
- Schema / IR：更新权威 schema registry、字段翻译和对应使用说明
- 默认、错误与 DSL 行为：搜索旧说法和引用，修改受影响的教程、示例与参考
- 新能力：建立总纲、基础用法与确有内容的后续页；不按模板凑齐所有页型
- 删除或改名：同步正文、data、双语、站内链接、生成配置与注册器；路由按统一词典调整

新 demo 使用单份 tsx 与同名 i18n 字典，controls 可见文案共用该字典；具体文件与预览规则由 principle 的 ComponentPreview reference 拥有。

## 验证与交付

按实际改动执行 apps/docs/AGENTS.md 的分级门禁；Oxfmt 格式化，检查 diff、双语、路由和引用，再做所需类型检查、测试与真实页面验证。完整 API 先生成再翻译审阅与重新生成；Schema 按当前源码驱动流程核对全部字段翻译，不假定已有页面生成器。

提交 Docs 改动前运行 check:static；check:build 与 check:runtime 仅在用户要求时执行。只改 skills 时验证 skill 元数据、引用与规则一致性，不为验证新规范要求全仓旧文档立刻合规。

交付说明改了哪些规范或页面、如何验证、剩余实际工作。暂存、提交、发布与 subagent 仍按已批准范围，不由本流程自动授权。
