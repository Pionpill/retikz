---
name: develop-document
description: Use when a retikz feature or user-visible behavior needs apps/docs updates, demos, API tables, sidebar or i18n changes after implementation, or when the change itself is documentation-first.
---

# Stage 4: 文档

把稳定实现转成用户能读、能跑、能对照的 docs 页面和 demo。用户 review 通常先看站点 demo，再看代码细节；文档不是可选项。

## 必读

- `apps/docs/AGENTS.md`
- `docs-doc-principle`
- 按页型继续读 `docs-doc-component` / `docs-doc-example` / `docs-doc-group` / `docs-doc-concept` / `docs-doc-blog`
- 需要独立审稿时读 `docs-doc-review`

## 输入

- ADR / TODO 与最终行为。
- `develop-test` 的 BLOCKING 修复结果、WARNING / INFO。
- 受影响的现有 docs 页面、demo、API 表、sidebar、i18n key。

## 先读现有 docs

用户可见改动必须先读相关现有页面，再决定更新还是新增：

- 改组件 / prop：读对应组件页 zh + en、demo、Related 指向页。
- 改 schema / IR：读 reference schema 页、使用该字段的组件页、概念页。
- 改 DSL / sugar：读所在组件页、示例页、入门路径中复用 demo。
- 改默认值 / 错误信息：全局搜索旧字段名、旧默认值、旧说法。

若判断无需改文档，在汇报中说明读了哪些页面以及为什么无需更新。

## 必落清单

按实际改动选择：

- 新 prop / IR 字段：说明、API 表行、至少一个 `<ComponentPreview>`、zh/en mdx 对齐。
- 新 kernel / sugar / plot 组件：页面、基础 + 进阶 demo、data 注册、i18n key。
- 行为 / 默认值变化：说明、API 表、demo 和“行为变化”提示。
- 删除 / 改名：删或改 API 表、说明、demo、站内链接。

demo 有可见文本时必须双语：`<name>.zh.demo.tsx` + `<name>.en.demo.tsx`；无文本可用 `<name>.demo.tsx`。

## 验证

按 `apps/docs/AGENTS.md` 的分级执行：

- 纯正文：`git diff --check` + 页面 / 链接验证。
- demo / data / i18n / import：docs 包 `tsc --noEmit` + 浏览器确认 demo。
- CI 等价路径：docs build。

## 完成标志

- 必落清单全部覆盖。
- zh / en mdx 结构对齐，展示文本 demo 已双语。
- sidebar / i18n / data 注册完整。
- demo 能在 docs 页面渲染出真实功能，不是占位。
- 向用户汇报时先给文档页路径和访问方式，再讲代码细节。
