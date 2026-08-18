# ADR-02：SVG 动画播放——load 用 CSS，交互用 WAAPI

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[ADR-01 动画 IR](./01-timeline-animation-ir.md) · [ADR-04 runtime 控制](./04-runtime-control.md)

## 背景

Scene 携带完整 base 和 AnimationTrack。SVG 同时拥有可内联、无需 JS 的 CSS 动画和可由 runtime 控制的 WAAPI，二者按 trigger 分流最能保持 SSR 能力与交互控制。

## 决策

- load（默认）track 编译为 SVG 内联 style 中的 CSS @keyframes；SSR 字符串可自播且不需要 JavaScript
- visible、manual、{ onEvent } track 挂结构化 WAAPI 描述，由 DOM runtime 在挂载后接 IntersectionObserver、控制句柄或事件。SSR 字符串不播放这些 track，但保留描述；同一元素可以混用两类 track
- opacity、fill、stroke、strokeWidth 和 transform 通道映射到 SVG 属性/transform；origin 作为 transform 支点。pathDraw 用 pathLength、dasharray、dashoffset；无描边目标 warning 并跳过。根级 viewBox 用 wrapper group 的 transform 表示，不直接动画 SVG viewBox 属性
- 内置 easing 直接映射 CSS/WAAPI；自定义 easing 名由 RenderOptions.easings 提供。函数形式不能进入 CSS 时退到 WAAPI，未注册名称 warning 后以 linear 兜底
- CSS 颜色在编译阶段按 oklch 预采样中间帧以避免依赖 color-mix 兼容性；WAAPI 使用真实 oklch 插值
- animate:false 时不生成 style 或 WAAPI 描述，直接渲染完整 base。SVG capability 为 full；只有无映射 custom property、无描边 pathDraw 或无法表达的 custom easing 才 warning 并降级

## 兼容性与实现结果

SVG 的 load CSS、自定义 trigger WAAPI、根镜头 transform 和静态降级均已接入 descriptor/render/runtime 链路；原有无动画 SVG 输出保持不变。

## 遗留风险

通用 custom property 插值不属于 SVG 的内置映射；跨元素 sequence 和 runtime 共享时钟由 ADR-04 管理。
