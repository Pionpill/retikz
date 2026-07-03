# ADR-04：Smooth regression transform

- 状态：Accepted
- 决策日期：2026-06-27
- Owner：plot
- 关联：[plot v0.1-alpha.13 roadmap](./roadmap.md) · [ADR-05](./05-stat-geom-surface.md)

## 背景

trend line / regression line 是 plot grammar 的基础统计能力，但不应该以 `RegressionMark` 或 chart preset 形式进入。alpha.13 需要先提供最小可测试的 smooth transform，让用户用 PathMark 自行表达回归线。

## 决策记录

新增内置 `smooth` transform，第一版只支持 linear regression。

稳定语义：

- 读取有限 `(x, y)` 数值对。
- 可按 `groupBy` 分组拟合。
- 输出 prediction sample rows，而不是直接输出图元。
- `xAs` / `yAs` 指定生成字段。
- `extent` 未给定时使用观测 x 范围。
- 退化输入 fail-loud，例如有效点不足、x 无变化或出现非有限数。
- 不输出 confidence band；置信区间需要后续独立统计 contract。

`PathMark` 消费 smooth 输出绘制趋势线，保持 stat = transform、geom = mark。

## 被否决方案

- 新增 `RegressionMark` / `SmoothMark`：会把统计和图形绑定。
- 第一版支持 loess / polynomial / confidence band：范围过大，难以在 alpha.13 做可靠 contract。
- 静默跳过退化 group：统计错误应可诊断，而不是生成看似正常的空线。

## 实现指针

- 发布版本：viz group `v0.1.0-alpha.13`。
- 验收范围：smooth transform schema、linear regression 数值测试、退化输入诊断、group 输出与 PathMark demo。
- 结构约束见 [ADR-05](./05-stat-geom-surface.md)：不新增 regression chart preset。

> 🔄 本文件压缩前完整施工蓝图 = `git show a1afbddcd7f916acacc98a6bc4be9b49a7cb0f33:_notes/decisions/graph/v0/v0.1/alpha.13/04-smooth-regression.md`（封板全文）。
