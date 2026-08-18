# ADR-03：Density transform

- 状态：Accepted
- 决策日期：2026-06-26
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [ADR-05](./05-stat-geom-surface.md)

## 背景

density plot 需要把原始样本转换成连续采样点，再交给 path/area 类 mark 绘制。若新增 `DensityMark`，统计计算、采样密度、曲线闭合与图形表达会被绑成一个 preset，不利于 grammar 组合。

## 决策记录

新增内置 `density` transform。它按 group 对输入数值做 KDE 采样，输出生成行，再由 `PathMark` 等抽象 mark 消费。

稳定语义：

- 默认 kernel 为 Gaussian。
- 默认 bandwidth 使用 Silverman 规则；显式 positive bandwidth 可处理退化 group。
- `extent` 控制采样区间；未给定时从观测值推导。
- `sampleCount` 控制输出采样点数量。
- `xAs` 与 `densityAs` 指定生成字段名。
- 输出只包含 group key 与生成字段，不复制无意义的原始行字段。
- provenance 通过 group provenance 追踪到参与统计的源行集合。

area/density visual 由 `PathMark` 的曲线与 baseline closure 表达，不新增 region/density chart preset。
