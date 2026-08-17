# ADR-06：hydration handler 的 renderer-neutral context

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[alpha.3 hydration](../alpha.3/01-hydration.md) · [ADR-01 动画 IR](./01-timeline-animation-ir.md) · [ADR-04 runtime 播放](./04-runtime-control.md) · [alpha.4 meta](../alpha.4/08-meta-provenance.md)

## 背景

alpha.3 handler 只有原生 event，无法读取命中元素的 id、meta、几何，也不能命令式控制动画。SVG 有 DOM target，Canvas 只有 id 和坐标，两端需要统一但不能暴露不一致的 primitive 对象。

## 决策

handler 签名升级为 (event, context)，第二参数 additive；旧的只接 event 或不接参数的函数仍可用。HydrationContext 表示按 user id 聚合的语义元素，而非单个 primitive：

- id、可选 meta、renderer、root、可选 scene 和指针在 Scene 坐标中的 point
- 可选 geometry：同 id 全部图元的并集 bbox 与 center
- element：SVG 为命中的 DOM Element，Canvas 为 null
- animation controls：play、pause、restart、stop、seek，可选 id 指定其他元素；没有 runtime/scene 时为 no-op

同一 id 的多个平铺 primitive 必须聚合，meta 取共享图元的值，geometry 取并集；不暴露 primitive type，因为多图元没有单一答案。SVG 从 id 索引 DOM/CSS/WAAPI 动画，Canvas 在当前版本只提供 scene 级粗粒度控制，restart 可整图重绘。

SVG 的 transform/camera/text wrapper 可能没有 data-retikz-id。承载动画的 wrapper 在有 id 时打 data-retikz-animation-owner，context 控制按 owner 与 data-retikz-id 一并查找 getAnimations，覆盖 CSSAnimation 和 WAAPI。camera 属 Scene 级，不走 element context。

createHydrationController 通过 buildContext(event, id) 始终传入 context。Vanilla mountSvg/mountCanvas 和 React Layout/CanvasHost 构造富 context；standalone hydrate 没有 Scene 时仍提供最小 context（id、element、root、point、renderer），meta、geometry、scene 缺省，animation methods no-op。调用方传入 scene 后才可获得富 context。

推荐 manual track 与 context.animation.play/restart 配合；回调仍只在 runtime 存在，不写回 IR。

## 兼容性与实现结果

handler 第二参数为 additive，SVG/Canvas 的 id 聚合、provenance、几何和动画控制接线已按上述模型落地；两端回调写法保持一致。

## 遗留风险

Canvas per-id 动画、handler 修改 IR、返回值/阻止默认语义和新事件类型不属于本 ADR；context 继续只承载只读 runtime 信息和动画控制。
