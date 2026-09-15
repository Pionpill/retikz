---
name: docs-doc-extension
description: Use when writing a custom capability tutorial that defines and registers a new Retikz Definition, including injection, authoring references and observable results; excludes simply using built-in extensions.
---

# 自定义用法

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。固定进阶难度，面向已会基础调用的扩展作者。仅调用现有扩展、调整参数或组合组件时使用 docs-doc-usage。

独立页按词典使用 custom 或 custom-<capability>，现有 meta.pageType 使用 extension；capability、audience 与 sourceOfTruth 按实际 owner 表达。页面不依赖 components 目录，也不再嵌入基础页的技术原理章节。

## 固定阅读主线

1. `## 适用边界`：何时应组合内置能力，何时需要新增能力；链接前置基础用法
2. 最小可运行结果：一个完整 ComponentPreview，Definition、注入与调用分文件时一起展示
3. `## 定义能力`：真实公开 defineXxx / Definition、稳定 key 与 JSON-safe 参数
4. `## 注入与使用`：两种宿主的真实 registry 入口、如何在输入中引用、最终可观察结果
5. `## 错误与限制`：按实现说明重复 key、未注册、参数约束与阶段限制，不凭模板虚构错误
6. `## 延伸阅读`：LinkedSections 链接 owner、实现原理与权威参考

“定义 → 注入 → 引用 → 结果”必须闭环。输入只保存 key 和可序列化参数，函数与 class 不进入 IR。内置与自定义是否共享 Definition、registry、resolver 和消费路径须核对源码；若真实能力采用不同扩展契约，明确说明，不编造 define API。

定义和使用应先于内部术语。简述作者必须知道的查找、优先级和失败规则；完整 registry 执行过程、编译阶段与缓存拆到 mechanism 或有明确名称的底层专题。完整 API / schema 不在教程重抄，只就近解释当前示例必要字段。

## 双宿主与示例

共同 Definition 放在 Tab 外，React / Vanilla 注入与使用按 DocTabs 契约切换；无宿主差异则共用真实 TypeScript 示例。带 controls 时读 docs-doc-control，保持 Definition 与注入源码可复制；注册冲突和不同结构用静态案例表达。

翻译、源码视图、文件结构及验证复用 docs-doc-principle。只描述当前公开能力与真实错误，不因文档需求扩大代码契约。
