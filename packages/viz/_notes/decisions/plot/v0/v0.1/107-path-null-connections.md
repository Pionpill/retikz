---
description: 开放 Path 的缺值连接采用独立描边样式，connectNulls 统一连接开关和样式配置
keywords: 'Path、connectNulls、缺值、描边'
---

# ADR-107：Path 缺值连接样式

- 状态：Accepted
- 决策日期：2026-09-28

## 决策

开放 Path 的 `connectNulls` 接受 boolean 或描边配置对象。省略或 false 在无效投影点处断开；true 与空对象均启用连接，缺口连接段默认 dashPattern 为 [6, 4]。对象开放 stroke、strokeWidth、strokeOpacity、dashPattern、dashOffset、lineCap、lineJoin，不包含数据、排序、分组、曲线或填充配置。

正常连续段保持原样式；缺口段继承正常路径描边，再应用默认虚线和对象显式值。连续无效行形成一个缺口，只连接其两侧的有效观测；首尾无效行不外推，缺失的整行不会仅因位置间隔较大而被推断出来。

分段发生在 series 分组和 order 排序之后，以实际坐标投影是否有效为依据。每个连续段与缺口段分别复用 Path 的 curve 与 coordinate 投影能力，不跨缺口维持样条切线连续性，不生成观测点或统计插值。标签、装饰和定位延续分段 Path 的既有语义。

本决策只扩展开放、无区域填充的轨迹。闭合轮廓、closure 和带填充的路径仍使用原有 boolean 连接行为；对象配置在这些上下文中明确拒绝，不能静默丢弃样式。极坐标默认闭合，需显式 closed: false 才使用独立缺口样式。

## 能力归属

Plot 拥有缺值识别、分段与样式应用，Core 提供已有 Path 描边和曲线能力。Chart Connected Scatter 直接复用 Plot 字段并透传；React、Vanilla 和直接 IR 使用同一契约，不引入 adapter 专属语义。正常段默认实线仍来自已有样式规则，显式虚线不被强制改回实线。

## 影响

开放路径的 connectNulls: true 从单条连续路径变为正常段与默认虚线缺口段，不保留旧行为兼容开关。颜色、分组、排序及点位置不变。
