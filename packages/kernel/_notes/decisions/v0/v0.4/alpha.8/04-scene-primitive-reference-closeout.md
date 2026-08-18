# ADR-04：ScenePrimitive reference 与发布文案收口

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-01](./01-drawing-complete-alpha4-closeout.md) · [ADR-03](./03-group-scope-effect-boundary.md)

## 背景

alpha.4 已把 `shadow` / `blendMode` 加到 Scene 可渲染主几何 primitive，但 reference 容易只呈现常见的 fill、stroke、opacity；发布文案也必须准确描述 shadow 对 scene viewBox 的影响

## 决策

ScenePrimitive reference 必须明确：

1. `RectPrim`、`EllipsePrim`、`PathPrim` 支持 `shadow?: ResolvedDropShadow` 与 `blendMode?: BlendModeValue`
2. `TextPrim` 不支持图元级 `shadow` / `blendMode`
3. `GroupPrim` 目前只拥有 group 结构字段，不支持 group-level effect
4. effect 不改变 hit area
5. SVG filter region 使用 `userSpaceOnUse`，并按 shadow 外扩后的 scene viewBox 表达当前行为

该 ADR 只负责 reference 与历史发布文案对账，不回写 alpha.4 的设计记录，也不改变 runtime

## 兼容性与最终结果

文档真源与当前 effect 字段、Text / Group 边界和 filter region 口径一致；IR、Scene、compile、render、React 和 Vanilla 行为不变

## 遗留边界

组级 effect、额外 filter 类型、hit area 改变与新的 Scene primitive 字段不属于本收口
