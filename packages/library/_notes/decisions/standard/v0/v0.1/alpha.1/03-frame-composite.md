# ADR-03：将 Frame 加入 Standard Tier 2 composite

- 状态：Superseded（由 [ADR-04](./04-frame-header-composition.md) 替代公开契约）
- 决策日期：2026-07-21
- 替代日期：2026-07-23
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

可视分组需要根据一组 Node 的真实布局自动计算边界，再绘制外框与标题。Core `Scope` 只拥有逻辑分组、局部 transform、样式级联和命名空间，不自行绘制边框；调用方手写固定坐标会在内容或文字变化后失效。

## 历史决策

首版 `standard.frame` 保存稳定 id、均匀 gap、嵌套 border style、可选 label 和至少一个 Core Node child。它通过 Core composite lowering 生成：

1. 延迟引用 Scope bounds 的 rectangle Path
2. 承载原始 Node children 的 Scope
3. 可选的透明 label carrier Path

边框依靠 Core 延迟 target resolution 读取随后完成的 Scope bounds，并按 gap 外扩。Frame 不复制 Node 测量，不新增 Scene primitive、renderer 分支或私有 layout registry。React `<Frame>` 与 Vanilla `frame()` 通过既有 Tier 2 adapter 在当前图贡献同一 `FrameDefinition`。

首版 direct child 只允许 Core Node，因为当时 Scope synthetic bounds 只对 NodeLayout 有完整证据。Path、Coordinate、Scope 与 foreign composite 不会被静默接受或估算。

## 被否决的方案

- 调用方维护固定边框坐标：内容变化后无法保持正确 bounds
- 在 Standard 复制文本或 shape 测量：会形成与 Core 漂移的第二套几何真源
- 修改 renderer 绘制 Frame：可视分组可完全 lower 为既有 Scope、Path 与文字
- 首版宣称支持任意 IR child bounds：当时缺少可靠的通用 child-bounds contract

## 被替代原因

首版 `label` 只是 Path label 字符串，不能复用 Core Node 的文本、shape、font、style、label、meta 与 animation 行为；`gap` 同时承担边框外扩语义，嵌套 `border` 又把 Frame 自身视觉字段隐藏在第二层对象中。

ADR-04 在 Core anchor-to-anchor placement 可用后，将 Frame 重构为“border + body Scope + Node-like Title / Description”，并用 `padding` 与 `gap` 分离边框外扩和 header 排列。v0.x 不保留首版 `label` / `border` / 旧 `gap` alias。

## 最终实现与验证摘要

- 首版证明了 Scope bounds、延迟 Path target 与 Tier 2 adapter 足以闭合可视分组，不需要 Core 或 renderer 新机制
- schema、lowering、Node child 限制、adapter identity 与未注册 composite 诊断均有自动化证据
- 该实现随后由 ADR-04 的最终 Frame 公开契约替换；ADR-03 仅保留为设计演进记录

## 遗留边界

- 最终 Frame 的 header、padding、corner radius、z-index 与保留 id 契约以 ADR-04 为准
- 通用 Stack / Align / Distribute、任意 child layout、交互 / selection / collapse 不属于本历史决策
