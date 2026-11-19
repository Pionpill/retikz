---
description: '中心线模式按宽度分布及 center/left/right 对齐派生两侧边界；显式边界模式直接使用 upper/lower'
keywords: 'Ribbon、Path.ribbon、width、start、interpolation'
---

# ADR-016：Ribbon 边界、对齐与采样语义

- 状态：Partially Superseded
- 决策日期：2026-06-25
- 关联：[ADR-015](./015-ribbon.md)、[ADR-021](./021-path-kind-registry.md)
- 后续决策：[kernel v0.4/021](021-path-kind-registry.md)

## 保留的决策

中心线模式按宽度分布及 center/left/right 对齐派生两侧边界；显式边界模式直接使用 upper/lower。采样应由几何契约决定，不能因换后端而改变轮廓。

center 将宽度分配在中心线两侧，left/right 将带放在方向确定的一侧；边界模式不应再从宽度 profile 反推作者已明确给出的边界。

## 修订边界

这两种输入模式保留在 Path 的 ribbon 参数中，而非独立 Ribbon 实体。
