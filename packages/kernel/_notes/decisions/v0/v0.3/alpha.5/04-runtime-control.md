# ADR-04：runtime 播放控制、trigger 与静态截帧

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[ADR-02 SVG 播放](./02-svg-playback.md) · [ADR-03 Canvas 播放](./03-canvas-playback.md) · [alpha.3 hydration](../alpha.3/01-hydration.md)

## 背景

renderer 已能按 CSS/WAAPI 或给定 time 产生动画帧，但 rAF、trigger、reduced-motion、控制句柄和静态截帧依赖环境，属于 Vanilla/React runtime，不属于纯 render。

## 决策

- Canvas runtime 为一个 Scene 维护共享 rAF 时钟，反复调用 drawScene({ time })；per-track delay 在 evaluateTrack 内处理。没有 infinite track 时结束在 settled 帧，有 infinite 时持续
- SVG 的 load 由 CSS 自播；visible/manual/onEvent 由 runtime 读取 WAAPI 描述并连接 IntersectionObserver、控制 API 或 hydration 事件
- Canvas 在当前契约中只自动播放 load/缺省 track；visible/manual/onEvent 一律按 base 绘制，避免与共享 Scene 时钟一起意外自动播放。per-track Canvas trigger 另行扩展
- animate:false 或 reduced-motion 统一关闭 CSS/WAAPI 和 Canvas rAF，渲染完整 base
- drawScene({ time: t }) 提供 Canvas 单帧截帧。SVG 的 renderToSvgString({ at: t }) 仍未实现，不能在 ADR 中宣称已具备
- React 与 Vanilla 均支持动画自动播放和静态开关；Vanilla 另提供 Scene 级 play/pause/seek 等控制，handler 回调仍不进入 IR

## 兼容性与实现结果

共享 clock、reduced-motion 检测、SVG WAAPI 接线、Vanilla mountCanvas 和 React Canvas rAF 已落地；静态路径在无动画时保持兼容。

## 遗留风险

SVG 静态截帧、Canvas 的 visible/manual/onEvent、React per-element manual ref 和 adapter 层自定义 animation registry 仍缺失；它们是明确缺口，不应被状态行覆盖。
