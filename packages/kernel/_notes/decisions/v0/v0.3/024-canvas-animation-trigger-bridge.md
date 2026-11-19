---
description: Canvas 在同一个 Scene 时钟中按元素 id 激活动画，不为每个图元启动独立帧循环。
keywords: 'Canvas、per-id、onEvent、visible、manual、load、evaluateTrack'
---

# ADR-024：Canvas 动画触发桥——复用 per-id 虚拟时钟，补 onEvent / visible 接线与隔离测试

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) · [v0.3-ADR-020 runtime 播放控制](./020-runtime-control.md) · [v0.3-ADR-019 Canvas 播放](./019-canvas-playback.md) · [v0.3-alpha.3 水合](./008-hydration.md) · [v0.3-ADR-002 Canvas renderer](./002-canvas-renderer-and-react-canvas-mode.md)

## 决策

缺省和 `load` 轨道自动播放；`manual`、`visible` 和 `{ onEvent }` 未激活时不施加轨道，保留基础图形。runtime 管理激活态和局部时间，不写入 IR。一个 id 下的非自动播放轨道共享局部时间；播放、暂停、重启、停止或跳转不改变其他 id 的进度。

手动控制由事件上下文按 id 执行，组件外的播放句柄仍控制整图。事件命中先激活目标再调用用户回调；可见触发按图元映射到视口后的几何范围判定，无 DOM 时不自动激活。Canvas renderer 只对传入时刻求一帧。
