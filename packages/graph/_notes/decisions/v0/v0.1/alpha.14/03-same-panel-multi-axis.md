# ADR-03：same-panel multi-axis overlay

- 状态：Accepted（实现字段以 ADR-09 为准）
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

type CoordinateScopePlacement =
  | { kind: 'overlay'; target: string; zIndex?: number };

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
5. grid 默认只来自 target scope 或显式 `grid: true` 的 guide；多个 overlay grid 的合并 / 避让策略由 ADR-05 统一。

理由：

1. `placement` 放在 axis guide 上，而不是 scope 上，因为“坐标如何投影”和“轴画在哪边”是不同职责。
2. overlay scope 共享 target plotArea，保留了 dual-axis 的直觉：两套 y scale 看同一张图，不产生额外面板。
3. `zIndex` 只约束同 panel mark 顺序，不变成通用 layout 系统。
4. 使用 ADR-01 的 `coordinateScope`，mark / guide / locator 都能共享同一个 scope identity。
5. axis placement 不是裸四方向字段，避免把 cartesian 的 left/right/top/bottom 泄漏到 ternary / polar / custom coordinate。

## 待决策点 🔻

- **`AxisGuide.placement` 是否在 ADR-03 落地**：本草案倾向落地最小 union。双轴用 `placement.kind = 'side'` 表达 left / right；ternary / custom 坐标使用 `auto` 或 `edge`，不把所有坐标系压成四方向。
- **overlay scope 是否允许 chain**：本草案允许 A overlay B、C overlay A，但 normalize 时需要解析到同一个 root plotArea。自引用和环必须 fail-loud。
- **grid 默认策略**：本草案倾向 overlay guide 不自动画 grid，只有 `grid: true` 才画；多 grid 视觉合并交给 ADR-05。
- **不同 coordinate 类型 overlay**：本草案允许 cartesian 与 polar / custom overlay，只要它们共享 bbox；语义由用户负责，lowering 不做“合理性”判断。
- **axis placement 枚举实现方式**：所有 placement kind / cardinal side 都用 const object enum（`AxisPlacementKind`、`AxisCardinalSide`）+ `z.enum(X)`，不写散落裸字符串 union。

## DSL 表面

左右 y 轴 overlay：

```ts
const spec = {
  type: 'plot',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xDay' },
    { type: 'linear', name: 'yTemp' },
    { type: 'linear', name: 'yRain' },
  ],
  composition: {
    defaultScope: 'temp',
    scopes: [
      {
        id: 'temp',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' },
        placement: { kind: 'root' },
      },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yRain' },
        placement: { kind: 'overlay', target: 'temp' },
      },
    ],
  },
  marks: [
    { type: 'path', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    { type: 'interval', coordinateScope: 'rain', encoding: { x: { field: 'day' }, y: { field: 'rainfall' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } },
    { type: 'axis', dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'right' } },
    { type: 'axis', dimension: 'x', coordinateScope: 'temp', placement: { kind: 'side', side: 'bottom' } },
  ],
};
```

## 测试设计

`packages/graph/plot/tests/composition/same-panel-multi-axis.test.ts` 覆盖：

- 两个 cartesian2D overlay scope 共享 plotArea bbox。
- 两个 mark 绑定不同 coordinateScope，y domain / projection 各自独立。
- left / right y axis 同时存在，axis layer 不按 duplicate dimension 报错。
- ternary2D 三个 axis 省略 placement 时落到三条 native edge，而不是 left / right。
- 同一 scope + dimension + placement key 重复 axis 报错。
- overlay target 缺失、自引用、环引用 fail-loud。
- overlay scope zIndex 改变 mark 层顺序。
- x 轴只声明在 target scope 时不自动复制到 overlay scope。
- custom coordinate overlay 仍走 coordinate registry。
- JSON round-trip 保留 `placement` / `offset` / `zIndex`。

## 影响

- `CoordinateScopePlacementSchema` 需要扩展 overlay payload 的 `zIndex` 与环检测。
- `AxisGuideSchema` 新增 `placement`。
- guide duplicate 检查从“dimension 唯一”改为“coordinateScope + dimension + placement key 唯一”。
- `resolveFrame` / guide lowering 需要知道 axis placement；cartesian guide 使用 cardinal side，ternary guide 使用 native edge。
- overlay scope 共享 plotArea，但 mark scale/domain 仍独立训练。

## 不在本 ADR 范围

- 不做 axis title、label 避让、side gutter / edge gutter 自动分配；ADR-05 处理。
- 不做非线性双轴数学换算提示；用户显式给两套 scale，retikz 不推断单位关系。
- 不做 linked brushing / tooltip。
- 不把 overlay 写进 facet schema。

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。

原因：扩展 PlotSpec / AxisGuide schema，并改变 guide duplicate 校验、frame 布局和 mark z-order。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/graph/plot/src/schemas/plot/schema.ts` | 改 | `composition.scopes[].placement.zIndex` | `z.number().optional()` | scope 声明顺序 | overlay scope 内 mark 层 z-order 提示 |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `AxisPlacementKind` | `as const` value object + `z.enum(AxisPlacementKind)` | 无 | axis placement 判别枚举：auto / side / edge |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `AxisCardinalSide` | `as const` value object + `z.enum(AxisCardinalSide)` | 无 | cartesian cardinal side 枚举：top / right / bottom / left |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `axis.placement` | `AxisPlacementSchema.optional()` | `{ kind: 'auto' }` | axis 放置方式：coordinate 自动、cardinal side 或 native edge |
| `packages/graph/plot/src/schemas/guide/schema.ts` | 加 | `axis.placement.offset` | `z.number().nonnegative().optional()` | `0` | 同 placement key 多 axis 的额外偏移量 |

### 文件 scope

- `packages/graph/plot/src/schemas/plot/schema.ts`
- `packages/graph/plot/src/schemas/guide/schema.ts`
- `packages/graph/plot/src/pipeline/**`
- `packages/graph/plot/src/features/guide/**`
- `packages/graph/plot/src/providers/coordinate/**`
- `packages/graph/plot/tests/composition/same-panel-multi-axis.test.ts`
- `packages/graph/plot/tests/lower/guide.test.ts`
- `apps/docs/src/contents/graph/**`（文档阶段）

### 测试象限

**Happy path**：

- `left right y axes`：左右 y 轴同时 lower。
- `mark scope projections`：两个 mark 使用不同 y scale。
- `shared plot area`：overlay scope 与 target scope bbox 一致。

**边界**：

- `single overlay no guide`：overlay scope 没有 axis guide 仍可只画 mark。
- `zIndex order`：zIndex 改变 mark 层顺序。
- `placement omitted defaults`：cartesian x/y side 推断稳定，ternary x/y/z edge 推断稳定。

**错误路径**：

- `duplicate axis same placement`：同 scope + dimension + placement key 重复报错。
- `ternary rejects cardinal side`：ternary2D 显式 side placement 报错，auto / edge 合法。
- `overlay target missing`：target 未注册报错。
- `overlay cycle`：overlay 引用环报错。

**交互**：

- `facet plus overlay`：facet panel 内可拥有 overlay scope，数据不跨 panel。
- `custom coordinate overlay`：custom coordinate 可 overlay root scope。
- `grid explicit only`：overlay grid 只有显式 `grid: true` 才生成。

### 依赖的现有元素

- ADR-01 `coordinateScope`：mark / guide 绑定入口。
- ADR-02 facet panel：overlay 后续可嵌入 panel scope。
- `AxisGuideSchema` / `lowerGuide`：扩展 axis placement。
- coordinate providers：需要按 coordinate-native placement 输出 axis。
- core `Scope` z-order：plot 只调整 children 顺序。
