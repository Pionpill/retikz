---
name: docs-doc-extension
description: retikz 扩展指南页型。用于解释 Definition、defineXxx、registry、宿主注入与统一消费链路；页面可以位于 components 能力分组，但由 data 节点 meta.pageType=extension 显式标记。
---

# 扩展指南写法

## 何时使用

- 页面教读者注册自定义 shape、boundary、clip、arrow、pattern、path kind、path generator、animation property 或 composite
- 页面位于 `components/**`，但主任务是扩展机制而不是内置组件 API
- 动手前先读 `docs-doc-principle`；分组落地页仍走 `docs-doc-group`

扩展页必须在 `data/<module>.ts` 的节点上声明 `meta.pageType: 'extension'`，并写清 `capability`、`audience: 'extension-author'` 与对应 `sourceOfTruth`

## 页面职责

扩展指南回答五个问题：为什么现有能力不够、扩展契约拥有什么、怎样定义、怎样注入、编译或运行时怎样消费。它不重复所在组件页的全部用法，也不把 runtime reference 改写成教程

内置与自定义必须经过相同的 Definition、registry、resolver 和消费路径；如果该能力不适用 define-registry，正文要明确原因和替代契约

## 推荐结构

按顺序组织，确实不适用的小节可合并，但不能遗漏对应问题：

1. `## 适用边界`：解决什么、不解决什么、何时应组合现有能力
2. `## 定义能力`：最小 `XxxDefinition` / `defineXxx` 示例，说明 key 与 JSON-safe 参数
3. `## 注入宿主`：`CompileOptions`、`<Layout>` 或 domain adapter 的注入入口
4. `## 执行机制`：用短流程或叙述图说明 registry 合并、lookup、校验和消费阶段
5. `## 错误与限制`：重复 key、未注册、非法 payload、后端或阶段限制
6. `## API 参考`：只列当前页直接使用的类型和字段
7. `## 相关`：链接所在能力页、runtime 扩展索引和相邻扩展指南

开头先给一个最小可运行结果；Definition、注入和使用分属不同文件时，用一个多文件 `ComponentPreview` 展示完整闭环

## 交互式 demo

参数变化属于同一语义时，优先使用 `PreviewControlContract`：

- `canonicalValues` 固定无交互环境、截图和测试状态
- `presets` 只放有明确语义的组合，不把任意参数排列都做成 preset
- `relatedApis` 列出控件直接解释的公开 API
- 结构变化、错误路径和 registry collision 保留独立静态案例

控件不能代替源码：动态 demo 仍要提供可复制的 Definition、注入和使用代码

## 双语与验证

- zh 是真源，en 的标题层级、表格列、demo 和错误案例对齐
- 检查节点 `meta.pageType`、目录、路由和 i18n 同步
- 修改 data、controls 或 demo 时运行 docs `tsc --noEmit` 与相关 Vitest；纯正文至少运行 `git diff --check` 并逐条验证链接

## 常见错误

- 把扩展页强套组件页六段结构，导致 define、注入和消费链路被拆散
- 只展示自定义实现，不证明它与内置项共享 registry
- 把函数或 class 写进 IR；IR 只能保存 key 和 JSON-safe 参数
- 只讲 happy path，不写重复 key、未注册和校验失败
- 在 runtime 扩展索引重复整篇教程
