# ADR-03：Group / Scope 级视觉效果延期边界

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-01](./01-drawing-complete-alpha4-closeout.md)

## 背景

alpha.4 的 `shadow` / `blendMode` 作用于 Node 主 shape、Path 主路径和端点箭头，不作用于 Text、label、pin、GroupPrim 或 Scope 整体。该边界避免把 SVG group filter、blend isolation 和 Canvas offscreen composite 混入图元级能力

## 决策

图元级 effect 保持现状；Scope 只能通过 `nodeDefault` / `pathDefault` 给子元素提供默认 effect，不能把整个 Scope 当合成层投影或混合。未来 group / scope effect 必须同时定义：

- `GroupPrim` 或组合层的 effect 字段与 authoring surface
- SVG group filter / isolation 与 Canvas offscreen composite
- layout overflow、Scope bbox / anchor、hit-test 和 animation 合成顺序

Blur、mask、named layer 不随 group effect 自动进入 Scope，它们拥有不同的 composition 语义

## 兼容性与最终结果

alpha.8 不新增 `IRScope.shadow`、`GroupPrim.shadow` 或 blend isolation；既有图元级行为和不支持边界保持，不提供隐式降级

## 遗留边界

整组投影、含文字卡片投影、组内先合成再混合、离屏失败和 shadow 外溢命中区域仍需独立 ADR
