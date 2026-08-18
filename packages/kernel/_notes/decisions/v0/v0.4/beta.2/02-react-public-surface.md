# ADR-02：React 包根公共面收口

- 状态：Accepted
- 决策日期：2026-07-11
- 关联：[renderer repackage](../../v0.3/alpha.1/05-renderer-repackage.md)

## 背景

React 包根曾聚合 Kernel、Render 和 Sugar。Canvas host、SVG binding、defs wrapper、browser measurer 以及 renderer-neutral 转发只服务 `<Layout>` 内部，却因根出口获得了没有文档契约的 semver 承诺

## 决策

`@retikz/react` 根入口只聚合 Kernel 与 Sugar；Render 是包内实现 owner，通过其稳定的内部 owner barrel 供 `<Layout>` 消费，但不进入 React 根公共面或 React npm 子路径

从 React 根移除：`CanvasHost`、`CanvasHostProps`、`ArrowMarker`、`ClipDefs`、`PaintDefs`、`renderPrim`、`RenderContext`、`svgToReact`、`browserDefaultFontFamily`、`browserMeasurer`、`buildPathD`、`buildTransform`、`formatViewBox` 等 renderer internals。公开 Kernel、Sugar、extension contract、Props 以及 `<Layout>` 的 SVG / Canvas 行为保持

迁移规则：renderer-neutral helper 从 `@retikz/render/svg` 使用；自定义 renderer 消费 `@retikz/render`；Canvas host、defs、SVG binding 和 browser measurer 不提供 React 公共替代。0.x 不保留 alias 或 deprecated bridge

## 行为、失败语义与兼容性

根入口的公共 export 收窄不改变 `<Layout>` 的渲染行为；包内复用仍经明确 owner barrel，内部实现不因测试或转发而成为 public API。未来 React 专属 renderer 扩展须另立稳定子路径，不能重新从根入口透出

## 最终结果与遗留边界

React 根公共面已只表达 authoring 与互操作能力，Render 负责 renderer owner。内部 host 可继续复用，但其 npm 可见性和 semver 契约不在本 ADR 内开放
