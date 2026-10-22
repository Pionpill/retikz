---
description: Core 纯几何按函数粒度下沉到 @retikz/math；背景：Core 的 geometry 公开面被多个 adapter 使用，但形状模块同时包含纯射线数学和 TikZ anchor/IR 语义
keywords: 'Core、retikz、math'
---

# ADR-002：Core 纯几何按函数粒度下沉到 @retikz/math

- 状态：Accepted（已实现）
- 决策日期：2026-06-13
- 关联：[ADR-001 math](./001-math-package-and-geometry-api.md) · [ADR-003 point 公开面](./003-point-polar-surface-fix.md)

## 背景

Core 的 geometry 公开面被多个 adapter 使用，但形状模块同时包含纯射线数学和 TikZ anchor/IR 语义。整文件搬迁会把业务类型带入 math，因此下沉必须按函数粒度完成。

## 决策

- 依赖方向为 core → math，math 不依赖 core；消费方从 math 公开入口直接导入纯几何函数和类型，Core 不维护重复导出
- Math 拥有点与向量、坐标变换、角度、圆弧、矩形轮廓以及由直线/圆弧组成的中立轮廓数据、圆角求解、命令构造与射线求交
- 居中矩形统一使用 Math 的 CenteredBox；轮廓命令不依赖 Core IR 或 Scene
- Core 保留 Anchor/Side、极坐标 IR 输入解析、连接面策略、路径弯曲默认值和编译错误语义
- 圆弧—圆弧接缝需要圆角时，Math 返回无解；Core 将无解转换为所属包的几何错误。构造命令和求交可复用同一轮廓的圆角结果
- 无实际消费者的形状 helper 与重复包装直接删除；具体 shape provider 通过 Math 计算实现自身契约

## 行为边界

几何计算与退化结果保持一致。Core 的连接包络仍遵循同心、同旋转及固定比例策略，不替换为自由中心的最小外接几何。命令数据由 Core 映射成绘图契约，Math 不承担编译、锚点或渲染职责。
