# ADR-03：Canvas 动画播放与共享插值引擎

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[ADR-01 动画 IR](./01-timeline-animation-ir.md) · [ADR-02 SVG 播放](./02-svg-playback.md) · [ADR-04 runtime 控制](./04-runtime-control.md)

## 背景

Canvas 是即时模式，绘制完成后没有可挂载 CSS/WAAPI 的 retained node。AnimationTrack 必须在每一帧按绝对时间求值并重绘；rAF 时钟仍属于 runtime，Canvas renderer 只负责纯单帧。

## 决策

drawScene(ctx, scene, options?) 增加可选 options.time：

- 有 time 时，逐 primitive 对 animations 调用 evaluateTrack(track, time) 后绘制该时刻；无 time 时直接绘制静态 base，保持既有调用兼容
- evaluateTrack 处理 delay、duration、iterations/infinite、fill、direction、easing 和 keyframe 分段插值；数值线性插值，颜色使用 oklch，viewBox 对四个分量插值
- opacity 作用于 globalAlpha；fill/stroke 覆盖 paint；strokeWidth 写入 lineWidth；transform 作用于 context；pathDraw 只绘制路径的前 p 部分；viewBox 重算 meet-fit 映射
- origin 是命名 anchor 或局部点，缺省为几何中心。renderer 仍只做当前帧，不启动 rAF、不持有场景状态
- 内置 property 有内置插值和应用逻辑；custom property 使用 RenderOptions.animationProperties 的 interpolate/applyCanvas。未注册 custom property、无描边 pathDraw 或未注册 custom easing warning 并跳过该 track，渲染 base

## 兼容性与实现结果

time 是 additive 选项；没有 time 的 drawScene 行为保持兼容。Canvas 单帧求值和共享 evaluateTrack 已成为 SVG 截帧、WAAPI fallback 与 Canvas 的共同数学基础。

## 遗留风险

per-track visible/manual/onEvent 触发、完整数据过渡和 morph 仍需 runtime 或 Tier 2 语义；Canvas 不在 renderer 层自行解决。
