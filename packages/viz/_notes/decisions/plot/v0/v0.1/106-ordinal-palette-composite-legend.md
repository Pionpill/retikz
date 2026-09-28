---
description: 分类色标索引与组合图例共用颜色解析结果，为同一序列的不同图元分配主题颜色
keywords: 'ordinal、palette、legend、rangeIndex'
---

# ADR-106：分类色标索引与组合图例

- 状态：Accepted
- 决策日期：2026-09-28
- 关联：[分类颜色](./039-color-series.md) · [图例](./044-legend-guide.md) · [主题](./092-legend-palette-guide-theme.md)

## 背景

同一分类可以由点、线等多个图元共同表达。其颜色既可能共享，也可能需要按分类成对分配；图例必须表达这些图元实际采用的颜色。Chart 不能自行取得最终 Plot 主题色板或绕过 Plot 渲染图例。

## 决策

Ordinal scale 增加可选 `rangeIndex: { step, offset }`，成员默认分别为 1、0。第 i 个分类使用有效 range 的 `(i * step + offset) % length` 项。显式 range 优先于主题分类色板，索引规则作用于两者，不预先截取奇数项或偶数项，因此奇数长度的色板也保持精确循环。step 为正整数，offset 为非负整数；非法配置在 schema 边界拒绝。

LegendGuide 的 `symbols` 为非空数组，按声明顺序叠加 `kind: point | line`；每项提供具名 `scale` 或常量 `paint`，两者都有时 paint 优先。仅支持分类颜色图例，不支持连续或分箱图例；具名符号 scale 可来自 color、fill 或 stroke 等颜色通道，必须实际绑定且拥有相同有序 domain。

组合图例的通道/色标语义由 Plot 拥有，基于实际色标解析结果形成每个分类的多图形符号，不由 Chart 创建独立的图例绘图管线。分类标签与绘图共用 domain；显式颜色优先于映射色，缺失色标及不一致分类域必须显式报错。

Plot mark 的 `defaultColorIndex` 显式选择默认序列色板索引（非负整数）；此为作者的独立选择，不是持久化自动分配结果，补充 ADR-092 的分组分配契约。显式索引优先于 `defaultColorGroup`，不占用自动分组分配的槽位；该索引仅控制缺省颜色，不覆盖显式常量或字段颜色，也不改变绘制顺序。

Chart 只将系列 / 图元配色策略转换成 Plot 的色标、mark 和 guide 配置。内置 ordinal 与其他 scale 继续通过既有 scale Definition registry 解析；本决策不引入第二套颜色解析器或主题存储。

## 参考与边界

Vega legend 将 fill、stroke 等符号编码与 scale 分开，说明组合图例的视觉通道需要有明确来源。Retikz 继续以已解析的色标结果为颜色真源，不在图例中重复拟合 domain 或复制色板。D3 ordinal 的有序 domain / 循环 range 是现有实现基础，本决策在其输入 range 上表达索引变换。

本能力不改变序列分组、排序、位置、缺失值处理或 renderer；不提供单个 Chart 私有的色板算法。
