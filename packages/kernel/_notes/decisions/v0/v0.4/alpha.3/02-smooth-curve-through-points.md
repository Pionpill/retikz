# ADR-02：Path smooth step

- 状态：Accepted（已实现；cursor-less smooth 跳过 path 并发出 PATH_TOO_SHORT warning）
- 决策日期：2026-06-15
- 关联：[ADR-01 Path 圆角](./01-polyline-rounded-corners.md) · [alpha.1 math](../alpha.1/01-math-package-and-geometry-api.md)

## 背景

已有 curve、cubic、bend 需要用户手算控制点，缺少从点列生成平滑过点曲线的 Kernel step。外部 path generator 仍是用户/Tier 2 的扩展口，不内置算法替代其注册机制。

## 决策

新增 kind: smooth step：

- points 至少一个；当前 cursor 是隐式第一个 knot，曲线按顺序穿过 points，结束 cursor 为最后一个点，不另设 to
- 使用 centripetal Catmull-Rom（alpha=0.5）编译为既有 cubic Bezier 命令；tension 默认 1，正值控制曲线松紧；开放曲线两端用单侧切线
- 可选 label 沿生成的 cubic 命令定位；Vanilla 使用同一 IR/schema，React 仅透传
- smooth 没有前置 cursor 时跳过该 path 并发出 PATH_TOO_SHORT warning，不静默生成错误路径
- IR 只存 points、tension、label 等 JSON 数据，renderer 只看到既有 cubic command

## 兼容性与实现结果

新增 step 为 additive；既有 12 种 step 不变，smooth 已在 core/math/adapter 链路实现。

## 遗留风险

闭合周期样条、Hobby 算法、per-point tension、in/out 方向和数据采样绘图仍未定义。
