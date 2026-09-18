---
name: docs-doc-extension
description: Use when documenting definition, registration, and use of a new Retikz custom capability.
---

# 自定义能力教程

先读 [文档总则](../docs-doc-principle/SKILL.md)，按其中条件加载公共规则；本入口只选择当前页型需要的细节。

读 [自定义教程结构](references/authoring.md)。固定进阶，使用 custom 或 custom-<capability>；meta.pageType 沿用实际 extension 契约。

必须闭合“定义 → 注入 → 引用 → 可观察结果”，核对真实公开注册方式和错误行为。不为模板虚构 define API，也不把仅调用内置扩展称为自定义。

本页相关属性由公共 ComponentProps 契约渲染，选择定义函数、Definition/type、宿主注册入口和引用字段。
