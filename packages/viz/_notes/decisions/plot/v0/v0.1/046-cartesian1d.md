---
description: 'cartesian1D 将一个角色投影到直线，polar1D 将一个角色投影到圆周'
keywords: 'cartesian1D、polar1D、guide、linear1D、orientation、angle'
---

# ADR-046：一维坐标系族——cartesian1D（直线）+ polar1D（圆周）+ 1D 轴 guide

- 状态：Partially Superseded
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md)、[plot-design §3.5 CoordinateSystem](../../../../architecture/plot-design.md)、[ADR-045 frame 角色泛化](./045-coordinate-frame-roles.md)、[alpha.4 polar 投影 / 角向 guide](./021-coordinate-polar.md)
- 后续决策：[plot v0.1/105](105-ternary2d-removal.md)

## 保留的决策

cartesian1D 将一个角色投影到直线，polar1D 将一个角色投影到圆周。两者不需要伪造第二个数据字段，轴的方向应服从实际一维空间。

直角一维投影的未用维度落在基线；极坐标一维以一个角度角色与固定半径投影，半径按可用半径的比例给出，角度区间可以不是整圆。

## 修订边界

一维坐标继续有效；与之并列规划的内置 ternary2D 后来移除，自定义投影走统一扩展契约。
