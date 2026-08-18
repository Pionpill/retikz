# ADR-05：具名动画 preset factory

- 状态：Accepted（preset 与等价测试已实现；文档动画页待补）
- 决策日期：2026-06-07
- 关联：[ADR-01 动画 IR](./01-timeline-animation-ir.md) · [ADR-02 SVG](./02-svg-playback.md) · [ADR-03 Canvas](./03-canvas-playback.md) · [ADR-04 runtime](./04-runtime-control.md)

## 背景

AnimationTrack 原语功能完整，但手写 keyframes 冗长且容易出错。preset 只是可逆的纯数据构造，不增加新能力，必须逐字段等价于手写 AnimationTrack。

## 决策

preset 是 framework-agnostic 的纯 factory，返回 IRAnimationTrack，而不是组件；它们可直接用于 Node/Path/Scope 的 animations 数组。公共 options 包含 duration、delay、easing、trigger；专属参数只表达现有 track 数据。

内置 preset 及默认语义：

| preset        | track                         | 默认值                               |
| ------------- | ----------------------------- | ------------------------------------ |
| fadeIn        | opacity 0→1                   | 400ms, ease-out                      |
| drawOn        | pathDraw 0→1                  | 600ms, ease-in-out                   |
| scaleIn       | scale from→1                  | from 0.8, 400ms, ease-out            |
| grow / growUp | scale 0→1 / scaleY 0→1        | growUp origin south, 500ms, ease-out |
| slideIn       | translateX/Y offset→0         | x, -20, 400ms, ease-out              |
| colorShift    | fill/stroke from→to           | fill, 400ms, ease-in-out；to 必填    |
| cameraTo      | root viewBox from→to          | 800ms, ease-in-out；两端必填         |
| pulse / spin  | scale 1→peak→1 / rotate 0→360 | infinite；peak 1.1 或 linear         |
| loop          | 包装既有 track                | iterations infinite                  |

intro preset 的末帧等于 base；循环 preset 按其循环语义播放。stagger 是纯数组 helper，仅叠加每项 delay，不建立完整 timeline DSL。React、Vanilla 和直接 IR 共享同一 factory，preset 输出不绕过 schema、播放或降级契约。

## 兼容性与实现结果

preset 作为 core 的 additive pure API 实现；React/Vanilla 可 re-export，已有 raw AnimationTrack 不受影响。

## 遗留风险

动画文档页仍待补；along-path、wipe、morph 和完整 sequence DSL 不属于 preset。
