---
description: '把每个散点都注册成具名节点，才能查询它的位置或来源，代价过高。'
keywords: 'PlotLocator、图元身份与按需定位、mark、scope-aware、meta、plotId、plot、Scope、provenance、sourceIndex、Scope.id、datum'
---

# 图元身份与按需定位

## 设计目的

把每个散点都注册成具名节点，才能查询它的位置或来源，代价过高。这里区分可连接的身份、来源元数据和按需定位，让查询大量数据点不意味着扩大命名空间。

## 决策

`PlotLocator` 是按需解析图元位置与来源的查询契约，不是逐点注册表。

整图、mark 层与 series 可拥有结构句柄；显式命名不依赖 provenance 开关。局部 id 不自动穿透 Scope；未命名的 plot 不虚构带前缀的公共句柄。meta 只描述来源，不参与连接、几何或渲染。

默认不生成来源元数据或逐点 id。开启结构来源记录不等于开启逐行记录；datum 元数据区分变换后行序和可选的原始行序，派生行没有唯一来源时不伪造索引。只有独立图元能直接携带自身的 datum 元数据，一条 series Path 不因此拆成逐点图元。

显式指定 `datumIdField` 时，缺字段或值重复是配置错误。只需定位而非连接时，由 locator 按需计算，不为整份数据注册 id。

locator 与 lowering 共用变换后的数据、布局、投影和逐行锚点语义，以绘图坐标返回位置、来源元数据及已有的可连接 id。无需开启逐点 provenance，不向 IR 写入索引或生成额外句柄。

datum 按变换后行序定位，缺省选择首个含位置的 mark；直接索引单行与按 series 聚合不同：series 的位置是该组实际绘制行的锚点质心，需计入其 k 行，而非取第一行或包围盒中心。

未知地址、错误的 plot 前缀、越界或未绘制的行、无有效行的 series 均返回 `null`。已配置的 datum id 缺失或重复则在构造时报告，不视为查询未命中。由屏幕位置反查 datum 的 hit-test 不属于 locator。

数据 key 标识实例，mark 身份标识它由哪组图元生成；仅有数据 key 不足以唯一定位连接对象。锚点几何归 Core，Plot 建立从数据实例到图元身份的关联。

完整图元 lineage 只作为可选运行时结果返回，不写入 IR 或 Scene meta；轻量来源记录与完整追踪独立，不开启追踪时不应增加逐点负担。

## 历史记录

- Plot v0.1：区分连接句柄、来源元数据、按需定位与追踪（ADR-026、ADR-027、ADR-069、ADR-103）。
