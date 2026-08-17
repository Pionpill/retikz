# ADR-01：Path 任意折线的 roundedCorners

- 状态：Accepted（已实现；step label 倒角后重定位延后）
- 决策日期：2026-06-15
- 关联：[ADR-02 smooth step](./02-smooth-curve-through-points.md) · [ADR-03 contour shape](./03-core-contour-shape.md)

## 背景

已有 shape contour 可以倒角，但 Path 的任意开放折线仍只有尖角。lineJoin 只是描边渲染样式，不改变几何、bbox、连接点、填充区或弧长，不能替代几何圆角。

## 决策

Path 增加可选 roundedCorners >= 0。编译期仅对相邻 line-to-line 内部接缝插入 fillet arc；curve、arc、bezier 和 fold 相邻的接缝保持尖角。path 以 cycle 闭合时，闭合 seam 也纳入 fillet。半径按相邻段长度夹紧，省略/0 时完整保持原路径几何和命令。

倒角只产既有 PathCommand（line + arc），renderer 不新增 primitive；marks 按倒角后的弧长重采样。step label 仍按原 step 线段定位，因此靠近拐角的 label 可能贴近旧尖角，这是真实遗留行为。

## 兼容性与实现结果

roundedCorners 是可选 path 字段，未设置时完全兼容 lineJoin 和原有 Path。开放/闭合折线倒角已实现，React/Vanilla 透传同一字段。

## 遗留风险

per-corner 半径、运行中切换 sharp/rounded、curve-line/arc-line fillet、fold fillet 和 label 随倒角重定位仍未实现。
