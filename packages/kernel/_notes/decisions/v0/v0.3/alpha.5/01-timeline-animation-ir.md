# ADR-01：时间轴动画 IR 契约

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[ADR-02 SVG 播放](./02-svg-playback.md) · [ADR-03 Canvas 播放](./03-canvas-playback.md) · [ADR-04 runtime 控制](./04-runtime-control.md) · [ADR-05 动画 preset](./05-animation-presets.md)

## 背景

动画是可序列化的“时间到属性值”数据，和水合的 handler 函数正交。它应进入 IR，使 SSR、AI 和各 renderer 都能消费；播放控制、回调和环境判断留在 runtime。compile 不应知道目标后端，也不应解释或插值动画。

## 决策

Node、Path、Scope 各增加 animations: AnimationTrack[]，Scene 根增加 animations 以承载 viewBox。每个 track 包含：

- property：内置 opacity、fill、stroke、strokeWidth、translateX、translateY、rotate、scale、scaleX、scaleY、pathDraw、viewBox，或开放的自定义字符串
- keyframes：至少一个 at/value，at 在 0..1 且升序；内置 property 对 value 做类型收窄，custom property 接受任意 JSON
- duration > 0；delay >= 0；iterations > 0 或 infinite；direction 为 normal/reverse/alternate/alternate-reverse；fill 默认为 forwards
- easing 接受内置名称、cubic-bezier 四元组或自定义名称；trigger 默认为 load，也可为 visible、manual 或 { onEvent: string }；transform 可选 origin（命名 anchor 或局部坐标点）

Schema 负责 track 的 JSON、数值、keyframe 顺序和 property/value 校验。compile 负责上下文规则：viewBox 只能位于 Scene 根，元素级 viewBox 或根级非 viewBox 发出 ANIMATION_INVALID_PROPERTY warning 并丢弃该 track，不丢整图。

核心不变量是静止-终态一致：

- compile 产出的 Scene 是完整的静态 base，tracks 只作为播放数据透传到对应 ScenePrimitive；布局、bbox 和 viewBox 按静止态计算，动画瞬时溢出不改变它们
- intro track 的末帧应等于 base，不能播放时仍显示完整最终图；循环或无终态 track 的降级值是 track 外的静止 base
- 不支持动画、animate:false、prefers-reduced-motion 和静态截帧都走“跳过 tracks、渲染 base”的语义。renderer 遇能力不足时 warning 并降级，不 throw、不丢图

动画字段不进 every-X 默认，也不跨 Scope 继承。回调函数不进 IR；onEvent 只保存事件名。renderer 可注册自定义 property/easing，未注册时由消费端 warning 并将该 track 降级到 base。

## 兼容性与实现结果

animations 是可选、JSON-safe 的 additive Scene 能力；compile 保持 renderer-agnostic，IR 与 Scene 始终携带完整 tracks。SVG、Canvas 和 runtime 的消费契约分别由 ADR-02 至 ADR-04 承接。

## 遗留风险

along-path、clip 动画、path morph、完整 sequence DSL 和按 property 的能力矩阵未在本契约中定义。
