# ADR-01：Ribbon 可变宽度路径

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- Owner：core
- 关联：[kernel v0.4-alpha.6 roadmap](./roadmap.md) · [ADR-02](./02-ribbon-boundary-and-alignment.md) · [ADR-03](./03-ribbon-arc-cap.md) · [ADR-05](./05-ribbon-label.md) · [ADR-07](./07-path-kind-registry.md)

## 背景

Sankey、alluvial、flow map 等图形需要“有宽度的关系边”：同一条关系既有走向，又有可变宽度。早期 plot 如果直接把它降成普通 path、renderer primitive 或专用 chart mark，会让宽度采样、边界闭合、label 与 provenance 都散落在上层包里，违背“底层能力来自 core”的原则。

## 决策记录

本 ADR 确立 core 必须拥有 renderer-agnostic 的 variable-width band path 能力。该能力应保持 JSON-safe，能从中心线与宽度 profile 推导出闭合轮廓，并最终下沉为普通 Scene path primitive。

后续 ADR-07 将公开契约从独立 `type: "ribbon"` 收敛为 `type: "path", kind: "ribbon"`。因此本 ADR 的稳定结论是能力归属与几何边界，不保留独立 `IRRibbon` 公共实体。

保留结论：

- ribbon 是 core path-like 能力，不是 plot 私有输出，也不是 renderer 私有 primitive。
- 输入必须可序列化，不能依赖函数、ReactNode 或 class instance。
- renderer 只消费最终闭合 path primitive，不理解 Sankey、alluvial 或 ribbon 布局语义。
- 宽度、采样、边界与 label 语义由后续 ADR 补齐，并在 ADR-07 合并进 Path kind registry。

## 被否决方案

- 扩展普通 `Path.strokeWidth`：stroke 宽度无法表达两侧边界、端点 cap 与可独立命中的带状区域。
- 使用 `ShapeDefinition` 自定义形状：shape 更适合 node-like 封闭图形，不能自然复用 path 的 routing、step 与 relation host 语义。
- 新增 renderer `RibbonPrim`：会把几何 contract 下放到各 renderer，破坏 Scene 的 renderer-agnostic 边界。
- 让 plot 输出 raw path primitive：会绕开 core 的 schema、provenance 与 label host。

## 实现指针

- 最终公开契约见 [ADR-07](./07-path-kind-registry.md)：`Path.kind = "ribbon"`，参数位于 `Path.ribbon`。
- 发布版本：kernel group `v0.4.0-alpha.6`。
- 验收范围：`packages/kernel/core` 的 path/ribbon schema、compile 与 geometry 测试，以及 `packages/kernel/react` / `packages/kernel/vanilla` 的 authoring 消费。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:notes/decisions/kernel/v0/v0.4/alpha.6/01-ribbon.md`（封板全文）。
