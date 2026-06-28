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

## 被否决方案

- 新增 `DensityMark`：会把 transform 和 geom 绑定。
- 输出所有原始字段：统计生成行无法代表单一原始 datum，复制字段会误导 provenance。
- bandwidth 只允许自动推导：退化或极小样本 group 需要显式带宽才能 fail-loud 地工作。

## 实现指针

- 发布版本：graph group `v0.1.0-alpha.13`。
- 验收范围：density transform schema、KDE 数值边界、group provenance、PathMark 消费与 docs density demo。
- 结构约束见 [ADR-05](./05-stat-geom-surface.md)：不新增 `DensityPlot` / `DensityMark`。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:notes/decisions/graph/v0/v0.1/alpha.13/03-density-transform.md`（封板全文）。
