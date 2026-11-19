---
description: '七个关键词是归一化比例的简写：at-start、very-near-start、near-start、midway、near-end、very-near-end、at-end 分别对应 0、⅛、¼、½、¾、⅞、1'
keywords: 'StepLabel、position、keyword、kind、StepLabel.position、midway、line'
---

# ADR-005：`StepLabel.position` 扩充（7 keyword + 任意 t 数值 + 多 kind 参数化规则）

- 状态：Partially Superseded
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../roadmap.md)
- 后续决策：[kernel v0.5/083](../v0.5/083-path-position-modes.md)

## 保留的决策

七个关键词是归一化比例的简写：at-start、very-near-start、near-start、midway、near-end、very-near-end、at-end 分别对应 0、⅛、¼、½、¾、⅞、1。数值允许精确定位，不必增加关键词。

## 修订边界

比例不总是曲线的步骤参数：参数比例与累计弧长是不同度量，原始几何与圆角后几何也可分别选择。不能把 midway 一概解释为可见曲线的弧长中点。
