---
description: Plot locator 按逻辑地址正向解析实际绘制位置与来源，不预注册逐点锚点。
keywords: 'datum、locator、mark.ts、nodeIndex、createPlotLocator、datumAnchor'
---

# ADR-027：datum locator 命中预演——逻辑地址 → 位置/元素的确定性正向解析纯函数，不逐点预注册

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.5 roadmap](./roadmap.md) · [plot-design.md §7 anchor / §8.1 id 绑定与可连接性（locator 段）](../../../../architecture/plot-design.md) · [ADR-026 scope-aware id 绑定 + meta 透传](./026-scope-id-meta.md)

## 决策

locator 与 lowering 共用变换后的数据、布局、投影和逐行锚点语义，以绘图坐标返回位置、来源元数据及已有的可连接 id。无需开启逐点 provenance，不向 IR 写入索引或生成额外句柄。

datum 按变换后行序定位，缺省选择首个含位置的 mark；直接索引单行与按 series 聚合不同：series 的位置是该组实际绘制行的锚点质心，需计入其 k 行，而非取第一行或包围盒中心。

未知地址、错误的 plot 前缀、越界或未绘制的行、无有效行的 series 均返回 `null`。已配置的 datum id 缺失或重复则在构造时报告，不视为查询未命中。由屏幕位置反查 datum 的 hit-test 不属于 locator。
