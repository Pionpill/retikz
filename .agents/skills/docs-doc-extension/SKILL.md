---
name: docs-doc-extension
description: Use when documenting a retikz Definition/defineXxx extension path, registry injection, lookup, validation, or built-in/custom shared consumption, either as a standalone guide or an owner-page section.
---

# 扩展指南写法

## 何时使用

- 页面教读者注册自定义 shape、boundary、clip、arrow、pattern、path kind、path generator、animation property 或 composite
- 页面位于 `components/**`，但主任务是扩展机制而不是内置组件 API
- 动手前先读 `docs-doc-principle`；分组落地页仍走 `docs-doc-group`；页面含 controls 时再读 `docs-doc-control`

## 独立页还是组件页小节

先按读者任务决定承载位置：

| 条件                                                                | 承载方式                        |
| ------------------------------------------------------------------- | ------------------------------- |
| 能力跨多个组件、拥有独立注入/错误契约，或扩展作者会单独查阅         | 独立扩展页                      |
| 扩展点只服务一个 owner，定义和注入很短，离开 owner 页面没有独立任务 | 组件页 `How it works` 或专门 H3 |

独立扩展页在 `data/<module>.ts` 节点声明 `meta.pageType: 'extension'`，并写清 `capability`、`audience: 'extension-author'` 与 `sourceOfTruth`。嵌入组件页时不增加伪页面，但仍必须覆盖“定义 → 注入 → 引用 → registry/错误”，并链接 runtime 扩展索引；不要因为篇幅短只留 happy path。

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
6. `## API 参考`：只列当前页直接使用的公开面，并按 `docs-doc-principle` 的“导出概览 → 核心契约 → 重要闭合集合”组织
7. `## 相关`：链接所在能力页、runtime 扩展索引和相邻扩展指南

开头先给一个最小可运行结果；Definition、注入和使用分属不同文件时，用一个多文件 `ComponentPreview` 展示完整闭环

## 交互式 demo

参数变化属于同一语义时可以使用 controls，具体契约统一走 [`docs-doc-control`](../docs-doc-control/SKILL.md)。扩展页仍必须提供可复制的 Definition、注入和使用源码；结构变化、错误路径和 registry collision 保留静态案例。

## 双语与验证

- zh 是真源，en 的标题层级、表格列、demo 和错误案例对齐
- 检查节点 `meta.pageType`、目录、路由和 i18n 同步
- 修改 data、controls 或 demo 时运行 docs `tsc --noEmit` 与相关 Vitest；纯正文至少运行 `git diff --check` 并逐条验证链接

## 常见错误

- 把扩展页强套组件页六段结构，导致 define、注入和消费链路被拆散
- 窄扩展点另起一篇空洞页面，或复杂扩展点塞进组件页导致无法独立查阅
- 只展示自定义实现，不证明它与内置项共享 registry
- 把函数或 class 写进 IR；IR 只能保存 key 和 JSON-safe 参数
- 只讲 happy path，不写重复 key、未注册和校验失败
- 在 runtime 扩展索引重复整篇教程
