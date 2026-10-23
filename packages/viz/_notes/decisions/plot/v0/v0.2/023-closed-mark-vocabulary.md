---
description: 封闭 Plot 图元类型并移除自定义 Mark 注册入口，复合图元独立演进
keywords: Mark、封闭类型、注册、复合图元、能力边界
---

# ADR-023：封闭 Mark 类型集合

- 状态：Accepted
- 决策日期：2026-10-22
- 替代关系：替代 [064](../v0.1/064-mark-custom-registry.md) 的自定义 Mark 契约，修订 [020](./020-mark-encoding-properties.md) 与 [021](./021-unified-mark-position-inputs.md) 的 Mark 扩展边界
- 关联：[版本规划](./roadmap.md)

## 背景

任意 Mark lowering 回调模糊了领域图元、数据计算、坐标与通用几何的职责。当前需求明确选择移除这一扩展入口，不以尚未设计的复合图元作为前提。

## 决策

Plot 的 Mark 仅包含 Point、Path、Interval、Relation。MarkSchema 是封闭判别联合，IRPlotMark 是统一类型，未知 type 在 JSON 解析入口失败。删除独立的 custom schema、开放 operation 类型、defineMark、类型提取及运行时 Mark 注册 API，definitions 不再接受 marks。

内置图元的行为分派仅是内部实现契约，不向宿主暴露可注入的 Mark 定义。字段收集、实例来源、域贡献、定位和下沉均消费同一个内置类型集合。字段、常量、边界位置及标签等既有内置图元能力保持不变。

Coordinate、Scale、Channel、Transform 等已有扩展能力保留；Core composite 的能力不变。几何表达缺口回到相应能力所有者，不能通过任意 Mark 回调绕开边界。

## 复合图元

复合图元未来独立设计，本次不新增入口、不承诺其数据或布局契约，也不以它承接自定义 Mark 作为移除条件。Relation 的后续替代仍取决于内置图元几何能力，与本决策无关。

## 影响

这是公开 API 的破坏性收敛，不保留兼容别名或开放配置兜底。JSON、Vanilla、React、Chart 与文档统一使用封闭 Mark 集合；原自定义图元调用方需要使用现有内置图元或直接使用下层绘图能力。
