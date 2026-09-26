---
description: List 索引使用统一 index 配置，支持方向相对位置和独立文本样式，保持单元格与索引测量职责分离
keywords: List、index、索引、文本样式、before、after
---

# ADR-033：List 索引呈现

- 状态：Accepted
- 决策日期：2026-09-22
- 关联：[roadmap](./roadmap.md) · [ADR-030](./030-list-map-presentation.md)
- 替代 ADR-030 中索引字段与固定位置的决策，其余容器契约不变

## 背景与决策

索引需要放在列表两侧，并与单元格文字分别设置外观。Standard 的 List 拥有索引顺序、侧边位置与占位，文字继续复用 Core Node 的测量和绘制。索引配置统一为 `index`，不保留独立开关和起始编号字段。

## 公开契约

`index` 接受布尔值或配置对象。省略或 false 隐藏；true 与空对象均显示默认索引。配置对象包含：

- `position: 'before' | 'after'`，默认 before。横排对应上方／下方；竖排对应左侧／右侧，与条目顺序无关。
- `start`，默认 0，必须为非负整数。
- `style`，复用 Node 的 font、textColor、color、opacity 字段。font 按字段覆盖整体 style 的 font，textColor 默认继承整体文字颜色；其余语义沿 Core 样式继承。单格覆盖不影响索引。

例如：`index: { position: 'after', start: 1, style: { font: { size: 12 }, textColor: 'gray' } }`。

React、Vanilla、直接 IR 与 data 输入表达同一契约。Source 保持 JSON-safe，factory 和 adapter 不物化省略的默认字段。

## 布局与行为

索引条尺寸由真实文字测量决定，参与容器 allocation，不改变单元格宽高与同轴顺序。before 为索引预留起始侧空间，after 放在最大单元格横截面之后，间距沿用 layout.gap。每个编号在对应单元格沿排列轴居中；不同尺寸的格仍共享同一条索引带。

索引不登记单元格身份，容器 label 与引用边界仍基于包含索引带的整体 allocation。索引隐藏不保留空间，空列表不产生索引或间隙。整体变换与裁切作用于索引，单格裁切不裁切索引。

## 失败与兼容性

非法位置、编号、样式字段在 Source schema 边界失败。尺寸与 proposal 失败沿用现有诊断，不另建 renderer 或 adapter 分支。

移除 showIndex、indexStart；旧字段在外部解析入口被拒绝，不提供兼容别名。所有仓库消费者与中英文参考同时迁移。
