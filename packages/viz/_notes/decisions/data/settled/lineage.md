---
description: '“这行来自哪里”和“这个值经过哪些计算”是两类问题。'
keywords: 'DataLineageEvent、DataLineageRun、数据来源与计算追踪、model、data、TransformContext.lineage、rowSamples、calculationDetails、tagSourceIndex'
---

# 数据来源与计算追踪

## 设计目的

“这行来自哪里”和“这个值经过哪些计算”是两类问题。将来源与计算追踪分开，既能解释结果，也不必为每次普通执行把完整事件塞进业务行。

## 决策

`DataLineageEvent` 是追踪事件，`DataLineageRun` 汇集一次执行的追踪结果。

行来源回答“从哪几行来”，lineage 解释“经过哪些计算”。追踪是可选的运行时输出，不写入业务行或 JSON IR，也不改变变换结果。来源摘要与完整索引分开；字段流、统计操作、行样本和计算细节可分别开启。行样本与计算细节必须限制行数并指定非空字段白名单；使用 sink 不意味着必须在内存中保留全部事件。

## 历史记录

- Data v0.1：区分行来源、计算事件与有限采样（ADR-004）。
