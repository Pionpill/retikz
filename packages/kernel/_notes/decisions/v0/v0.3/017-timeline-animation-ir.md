---
description: '动画轨道是可序列化的时间到属性值的描述，与宿主事件 handler 分开'
keywords: 'timeline animation ir'
---

# ADR-017：时间轴动画 IR 契约

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[ADR-018 SVG 播放](./018-svg-playback.md)、[ADR-019 Canvas 播放](./019-canvas-playback.md)、[ADR-020 runtime 控制](./020-runtime-control.md)、[ADR-021 动画 preset](./021-animation-presets.md)
- 后续决策：[kernel v0.5/074](../v0.5/074-animation-property-contract.md)

## 保留的决策

动画轨道是可序列化的时间到属性值的描述，与宿主事件 handler 分开。Scene 必须同时包含完整静止图；布局和包络不随播放瞬间重算。不能播放轨道不等于删去图元。

静止图是不能播放时的回退，不是关键帧求值失败后丢弃宿主。引入动画不改变静止态布局包络；viewBox 轨道与元素属性分别属于场景根和具体图元。

## 修订边界

早期开放的 property/easing 字符串及自定义插值不再是扩展入口。Core 定义封闭词汇与轨道，Render 求值并执行。
