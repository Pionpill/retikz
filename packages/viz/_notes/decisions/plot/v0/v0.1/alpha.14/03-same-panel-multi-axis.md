# ADR-03：same-panel multi-axis overlay

- 状态：Superseded
- 替代：[ADR-09](./09-composition-api-structure.md)；same-panel overlay 保留，绑定字段统一为 `coordinateView`
- 决策日期：2026-06-28
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.14 roadmap](./roadmap.md) · [ADR-01 coordinate composition registry](./01-coordinate-composition-registry.md) · [ADR-02 facet grid data routing](./02-facet-grid-data-routing.md)

## 背景

same-panel multi-axis overlay 解决的是“同一个 plot area 里，不同 mark 使用不同的位置 scale / coordinate，并各自拥有对应 axis”。典型例子是左右两个 y 轴：一条折线用温度 y scale，柱形用降雨量 y scale，二者共享 x 轴和同一个 panel。

这不是 facet。facet 会按数据字段拆成多个 panel；overlay 不拆数据、不复制 panel，只在同一 panel 内叠加多个 coordinate scope。它也不是 shared scaffold track：track 会分出不同局部 range；overlay 的默认语义是多个 scope 共享同一个 plotArea bbox。

ADR-01 已让 mark 和 axis guide 能通过 `coordinateScope` 绑定不同 scope。ADR-03 需要补齐 overlay scope 的布局语义、axis placement / offset、重复轴判定和 z-order 规则，使“多 scope 在同一 panel 内叠加”成为稳定能力。

## 决策：overlay scope 共享 target plotArea，axis guide 使用可扩展 placement

`composition.scopes[].placement.kind = 'overlay'` 表示该 scope 与 `target` scope 共享同一个 plotArea bbox。scope 自己仍拥有独立 coordinate operation 与 position scale 训练；mark 通过 `coordinateScope` 选择 scope；axis guide 通过 `coordinateScope` 与 `placement` 选择对应的轴位置。

```ts
const AxisPlacementKind = {
  Auto: 'auto',
  Side: 'side',
  Edge: 'edge',
} as const;

const AxisCardinalSide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;

type AxisCardinalSideValue = ValueOf<typeof AxisCardinalSide>;

type CoordinateScopePlacement = { kind: 'overlay'; target: string; zIndex?: number };

type AxisPlacementSpec =
  | { kind: 'auto' }
  | { kind: 'side'; side: AxisCardinalSideValue; offset?: number }
  | { kind: 'edge'; edge: string; offset?: number };

type AxisGuideSpec = {
  type: 'axis';
  dimension: string;
  coordinateScope?: string;
  placement?: AxisPlacementSpec;
};
```

规则：

1. overlay scope 的 plotArea 与 target scope 完全一致；它不参与 facet grid 排布，也不申请额外 panel。
2. `zIndex` 只影响同 panel 内 mark 层相对顺序；省略时按 `composition.scopes` 声明顺序。
3. axis guide 的 `placement` 决定 axis 放置方式。`{ kind: 'auto' }` 或省略时由 coordinate definition 根据 dimension 推断；`{ kind: 'side' }` 只用于支持 cardinal side 的坐标系；`{ kind: 'edge' }` 给 ternary / custom coordinate 这类“非上下左右”的 native axis edge 使用。
4. cartesian2D 中 `x` 只允许 top / bottom，`y` 只允许 left / right；ternary2D 的 `x` / `y` / `z` 默认走三角形三条 native edge，不把 `y` 强行压到 left / right。对 ternary 显式 cardinal side 应 fail-loud，提示使用 auto 或 coordinate-native edge。
5. 同一 `coordinateScope + dimension + placement key` 不允许重复 axis；同 dimension 但不同 scope 或不同 placement 可以共存。
6. grid 默认只来自 target scope 或显式 `grid: true` 的 guide；多个 overlay grid 的合并 / 避让策略由 ADR-05 统一。

理由：

1. `placement` 放在 axis guide 上，而不是 scope 上，因为“坐标如何投影”和“轴画在哪边”是不同职责。
2. overlay scope 共享 target plotArea，保留了 dual-axis 的直觉：两套 y scale 看同一张图，不产生额外面板。
3. `zIndex` 只约束同 panel mark 顺序，不变成通用 layout 系统。
4. 使用 ADR-01 的 `coordinateScope`，mark / guide / locator 都能共享同一个 scope identity。
5. axis placement 不是裸四方向字段，避免把 cartesian 的 left/right/top/bottom 泄漏到 ternary / polar / custom coordinate。

## 不在本 ADR 范围

- 不做 axis title、label 避让、side gutter / edge gutter 自动分配；ADR-05 处理。
- 不做非线性双轴数学换算提示；用户显式给两套 scale，retikz 不推断单位关系。
- 不做 linked brushing / tooltip。
- 不把 overlay 写进 facet schema。
