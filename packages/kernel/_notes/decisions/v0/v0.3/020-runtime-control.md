---
description: '播放控制与渲染一帧是两种操作'
keywords: 'runtime、trigger'
---

# ADR-020：runtime 播放控制、trigger 与静态截帧

- 状态：Partially Superseded
- 决策日期：2026-06-07
- 关联：[ADR-018 SVG 播放](./018-svg-playback.md)、[ADR-019 Canvas 播放](./019-canvas-playback.md)、[alpha.3 hydration](./008-hydration.md)
- 后续决策：[kernel v0.3/024](024-canvas-animation-trigger-bridge.md)、[kernel v0.4/040](../v0.4/040-animation-enabled-override.md)

## 保留的决策

播放控制与渲染一帧是两种操作。宿主拥有时钟、启动和停止，renderer 按给定状态绘制；无须让每个图元各自启动循环。

## 修订边界

Canvas 不再只限 load，按 id 的触发桥接入事件及可见性。省略动画开关时跟随系统；显式 true 或 false 优先于系统偏好。
