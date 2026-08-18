# ADR-02：Canvas 2D renderer 与 React Canvas 模式

- 状态：Accepted（已实现；gradient、pattern、image、clip、marker、`currentColor`、主题响应、文本基线、弧方向和尺寸对齐均已支持）
- 决策日期：2026-05-29
- 关联：[ADR-01 SVG descriptor](./01-svg-descriptor-contract.md) · [ADR-03 Vanilla runtime](./03-vanilla-runtime-and-dependency-graph.md) · [ADR-05 renderer 重打包](./05-renderer-repackage.md)

## 背景

Canvas 是与 SVG 并列的第二条 Scene 输出路径。它是即时模式，应该直接向 `CanvasRenderingContext2D` 发命令，不能经过 SVG，也不能复制 compile 或维护另一份场景语义。React 需要在不改变默认行为的前提下选择后端。

## 决策

- `drawScene(ctx, scene, options?)` 消费已编译 Scene 并以无状态方式执行 `save`、绘制和 `restore`；`renderToCanvas(canvas, scene, options?)` 负责取得 context、DPR/viewBox 变换与清屏后调用它
- Canvas 不生成 `SvgNode`，不持有画布、不 compile、不启动时钟；布局和测量由共同的 `compileToScene` 与 `browserMeasurer` 完成
- React 继续使用同一份 Scene：默认 `<Layout>` 为 SVG，`renderer="canvas"` 才走 Canvas，因而是 additive opt-in；不新增平行的 `<SvgLayout>` / `<CanvasLayout>` 组件
- `@retikz/render/canvas` 与 `@retikz/render/svg` 并列，Canvas 不依赖 SVG。核心图元和变换使用 Canvas 原生语义；所有后端能力不足的情况必须可诊断地 warning 并降级，不得静默成功但不绘制

## 兼容性与实现结果

原独立 `@retikz/canvas` 已并入 `@retikz/render/canvas`。Canvas renderer 与 React `renderer` 分支已落地，默认 SVG 和既有 React API 不变；调用 `drawScene(ctx, scene)` 不提供时间或动画选项时保持静态绘制行为。

## 遗留风险

Node Canvas 导出、分层/脏矩形增量渲染和 Canvas 交互定位属于后续 runtime 能力，不改变本 ADR 的单帧、无状态边界。
