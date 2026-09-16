---
name: docs-doc-usage
description: Use when writing basic usage or named usage topics for Retikz components, functions, packages or grammar stages in any solution; excludes defining new registry capabilities and internal execution explanations.
---

# 基础与专题用法

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。用于教读者调用现有能力，不依赖 components 目录。基础及普通使用专题固定入门；独立的进阶内容改用 docs-doc-mechanism，不能在本模板堆内部机制后仅改难度。

## 页面骨架

1. 开篇：说明解决什么、最小输入与可观察结果
2. `## 基础用法`：优先复用 ComponentPreview 的用法源码；未覆盖的调用按页型词典选择共用示例或 React / Vanilla DocTabs；组件不重复安装命令，链接方案快速开始。按需配一个无 controls 的最小 ComponentPreview
3. 按实际语义命名的使用章节：从常见任务到组合和边界；专题页开篇明确前置用法与本页新增任务，不重复整套教程
4. `## 错误与限制`：存在跨示例限制时集中收束；影响正确调用的约束仍就近解释
5. `## 延伸阅读`：LinkedSections 指向前提、自定义、实现原理与权威参考

不强制独立“例子”或 API 表章节。必要字段可就近简述；完整参考与内部执行过程拆到独立页。基础用法页使用该标题即可，避免再套同名 H3。

## 接入与示例

- 复用 [DocTabs / DocSteps](../docs-doc-principle/references/doc-tabs-steps.md)；双端都到真实产物，不能把 import 加空 JSX 当完整用法。无宿主差异的 TypeScript 能力共用示例
- 使用 ComponentPreview 时读 [预览契约](../docs-doc-principle/references/component-preview.md)；单份图组件与 i18n 字典，真实入口可复制，展示 Source IR 而非内部 Canonical
- 每个示例围绕一个语义、结构、组合关系或用户可见边界；先说明要观察什么，再给示例与必要解释
- 同一任务仅参数变化时使用 docs-doc-control，不为 stroke、fill、字号各起一节；不同结构或错误行为不能被 controls 吞掉
- 开放参数与可选组合不自动叫“自定义”；调用内置 ShapeDefinition 仍是用法，编写并注册新 Definition 才走 docs-doc-extension
- 通用 props 指向共享权威页，当前例子只解释必要字段；对象、常量与公开标识符核对规则见 [文中 API](../docs-doc-principle/references/inline-api.md)

## 数值计算用法

- 说明输入单位、坐标空间、参数与距离的区别及退化返回值；调用必需的精度与边界留在用法页，详细推导归原理页
- 复杂度注明最坏、平均或摊还及其前提；数学结果等价用公式或逐值比较，不用 JavaScript 对象引用相等表达

## 专题拆分

值得独立查阅、拥有明确调用任务的主题可拆为具体语义页，不按 demo 数量拆页。新专题与基础页保持明确前后关系；深入执行、缓存、编译分支等归底层专题。读者必须知道的引用顺序、失败条件与优先级在用法页保留简短结论，再链接原理。

Standard Tier 2 composite 的公开入口、持久化和预览闭环额外读 [Standard 补充规则](references/standard-composite.md)。其他领域复用自身包契约，不再复制主页型模板。
