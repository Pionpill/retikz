# ADR-04：Scatter 首个 Canonical Type

- 状态：Proposed（core variant 可实施；public adapters / release group 受 ADR-01 Kernel gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-chart-infrastructure.md) · [ADR-03](./03-presentation-standard-layout.md)

## 背景

Scatter 是最小的二维关系图，也是验证 Chart 基础设施的首个 type。它只需要 Point Mark、两个位置角色和 Plot 已有的 scale / coordinate / guide 能力，适合作为公开 `ChartSpecSchema` 的第一个 variant。

Scatter 不能退化为 `type + x + y` 的一次性 sugar。用户仍需使用 Plot 的 transform、scale、coordinate、guide、theme、layout、mark style 与追加 marks。

## 决策：`scatter` 固定 Point 主 Mark 与 x / y 核心角色

```ts
type ScatterChartSpec = ChartCommon & {
  namespace: 'chart';
  type: 'scatter';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    color?: { field: string; scale?: string } | { value: string };
    size?: IRPlotSizeChannel;
    opacity?: IRPlotOpacityChannel;
    shape?: IRPlotShapeChannel;
  };
  mark?: ScatterPointPatch;
};
```

recipe 生成：

- `mark.main`：id=`__chart.scatter.mark.main` 的 Point Mark
- `scales`：空数组；位置 scale 继续由 Plot 根据 bound field / data model 推断
- `coordinate.main`：`{type:'cartesian2D'}`
- `guide.x` / `guide.y`：`{type:'axis', dimension:'x'}` / `{type:'axis', dimension:'y'}`

Point 的 exact core fragment 是：

```ts
{
  type: 'point',
  id: '__chart.scatter.mark.main',
  encoding: { x: spec.encoding.x, y: spec.encoding.y },
}
```

视觉角色的 exact 映射：

| Chart encoding | Chart schema                     | Point Mark 输出                                                         |
| -------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `color.field`  | non-empty field + optional scale | `color:{kind:'field',value:field,scale?}`                               |
| `color.value`  | non-empty string，禁止其它 JSON  | `color:{kind:'constant',value}`                                         |
| `size`         | 直接复用 `SizeChannelSchema`     | field -> `size:{kind:'field',value:field,scale?}`；value -> constant    |
| `opacity`      | 直接复用 `OpacityChannelSchema`  | field -> `opacity:{kind:'field',value:field,scale?}`；value -> constant |
| `shape`        | 直接复用 `ShapeChannelSchema`    | field -> `shape:{kind:'field',value:field}`；value -> constant          |

`mark` patch 最后覆盖这些可选视觉字段。x / y 始终由 recipe 写入，mark patch 无法接触。所有转换完成后必须通过 PointMarkSchema 与 PlotSpecSchema 二次校验；非法 constant 在 Chart encoding schema 阶段失败。

## Coordinate / composition normalization

- 缺省 Cartesian2D；显式 Cartesian2D / Polar2D 缺 scale ref 时继续由 Plot inference 解析
- coordinate shorthand 的 exact 结果保留 `coordinate`、不生成 `composition`；Point 与两条 axis guide 均省略 `coordinateView`，由 `resolveCoordinateScopeRegistry` 解析到 `default`
- Polar2D 的 coordinate operation 保持 `angle` / `radius` 字段，Point encoding 与 axis guide dimension 仍为 `x` / `y`；Plot 的 Polar2D definition 以相同 roles 完成投影
- Cartesian1D / Polar1D 以 `core-recipe-violation` 拒绝
- custom coordinate 从 `LowerChartsOptions.plot.coordinates` 解析；该数组必须原样传给同一 host 的 `lowerPlots(..., options.plot)`，definition 缺失或 `roles` 不精确等于 `['x', 'y']` 时以 `core-recipe-violation` 拒绝
- composition 复用 Plot `resolveCoordinateScopeRegistry`；必须能找到 `defaultView` 对应 scope，且该 scope 的内置或自定义 definition `roles` 精确等于 `['x', 'y']`
- composition 的 exact 结果保留 `composition`、不生成 `coordinate`；Point 与两条 axis guide 都显式写入 `coordinateView: composition.defaultView`
- 显式 scale 只有被 coordinate / composition 引用时才影响位置；未引用 scale 不由 Chart 猜测重绑定

`mark` 是 `PointMarkSchema` 去掉 `type`、`id`、`encoding`、`transform`、`coordinateView` 后的 partial patch。用户不能替换 Point、核心 x / y encoding 或主 view；可通过 Chart encoding、mark patch 与追加 Plot marks 完整调整视觉表达。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "scatter",
  "data": { "reference": "iris" },
  "encoding": {
    "x": { "field": "sepalLength" },
    "y": { "field": "petalLength" },
    "color": { "field": "species", "scale": "speciesColor" }
  },
  "mark": { "opacity": { "kind": "constant", "value": 0.65 } }
}
```

## 测试设计

- schema：首个 discriminated union variant 与核心角色
- recipe：精确 Point / scale / coordinate / guide 输出
- parity：JSON / React / Vanilla 与 presentation 组合

## 影响

- 首次公开 `ChartSpecSchema`、`IRChartSpec` 与 `createChartSpec`
- 三个 adapter 首次提供可运行 Chart
- 把三个包从 `private` skeleton 切为 `retikz.releaseGroup='chart'` 的 publishable `0.1.0-alpha.1`
- docs 新增 Chart 起步页与 Scatter canonical 页面

上述 public export、adapter、release-group 和 docs 接线全部以 ADR-01 Kernel gate 已 Accepted / implemented 为硬前置；gate 前只实现 Scatter core variant。切为 publishable 也不表示允许在 alpha.1 中途发包，真正 publish 仍需完成 milestone 全部退出条件并另获发布授权。

## Chart 封装完备性检查

- 核心 recipe：Point + x / y，不可撤销
- 表现性默认：axes、theme、palette 可替换
- Plot extension：root transforms、scales、coordinate / composition、guides、marks
- coordinate：Point 经 Plot coordinate roles 投影，不绑定 Cartesian renderer
- traceability：`mark.main` 记录 type-default / user-override 来源
- 本轮结论：完全组合 Plot 现有能力

## 不在本 ADR 范围

- size 必需语义（Bubble）
- 点间连接、拟合线、range 或 jitter
- scatter matrix / facet type；用户可直接使用 Plot composition
- ADR-01 Kernel embeddable dependency gate 未解除前的 public adapter、release group 与自动混合嵌入

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为首次导出 ChartSpec schema 与公共入口。

### Schema 改动

| 文件                                        | 操作 | 字段名                                | 类型                                                     | 默认值 | describe 中文摘要        |
| ------------------------------------------- | ---- | ------------------------------------- | -------------------------------------------------------- | ------ | ------------------------ |
| `packages/viz/chart/src/schemas/scatter.ts` | 新增 | `type`                                | `z.literal('scatter')`                                   | —      | Scatter 判别值           |
| 同上                                        | 新增 | `encoding.x` / `encoding.y`           | `ChannelSchema`                                          | —      | 必需二维位置角色         |
| 同上                                        | 新增 | `encoding.color`                      | strict field/string-value union optional                 | —      | 可选颜色角色             |
| 同上                                        | 新增 | `encoding.size` / `opacity` / `shape` | 对应 Plot channel schema optional                        | —      | 可选 Point 视觉角色      |
| 同上                                        | 新增 | `mark`                                | `ScatterPointPatchSchema.optional()`                     | —      | Point 主 Mark 稀疏 patch |
| `packages/viz/chart/src/schemas/chart.ts`   | 新增 | root union                            | `z.discriminatedUnion('type', [ScatterChartSpecSchema])` | —      | 首个公开 ChartSpec       |

### 文件 scope

- `packages/viz/chart/src/schemas/scatter.ts`
- `packages/viz/chart/src/schemas/chart.ts`
- `packages/viz/chart/src/providers/recipes/scatter.ts`
- `packages/viz/chart/src/providers/recipes/index.ts`
- `packages/viz/chart/src/pipeline/resolve-chart.ts`
- `packages/viz/chart/src/index.ts`
- `packages/viz/chart/package.json`、`packages/viz/chart-react/package.json`、`packages/viz/chart-vanilla/package.json`
- `packages/viz/chart-react/src/Chart.tsx`、`packages/viz/chart-react/src/chart-runtime.ts`
- `packages/viz/chart-react/src/embedded-runtime.ts`、`packages/viz/chart-react/src/index.ts`
- `packages/viz/chart-vanilla/src/spec/{types,helpers,index}.ts`
- `packages/viz/chart-vanilla/src/adapter/{chart-adapter,index}.ts`
- `packages/viz/chart-vanilla/src/runtime/{render-chart,index}.ts`、`packages/viz/chart-vanilla/src/index.ts`
- `packages/viz/chart*/tests/**/scatter*`
- `scripts/release-groups.config.mjs`、`pnpm-lock.yaml`
- `apps/docs/**`（Chart 起步与 Scatter 中英文页面 / demo）

### 测试象限

**Happy path（≥ 3）**

- x / y 最小 spec 解析为 `Point + scales:[] + Cartesian2D + x/y axis guides` 的精确 PlotSpec；integration 再证明 Plot lowering 推断两个 position scales
- color / size / opacity / shape 映射到 Point 正式 channel / style
- mark patch 与 theme / preset 按统一优先级合并

**边界（≥ 2）**

- 单 datum 仍生成合法 Point
- Polar2D coordinate 复用相同 x / y recipe 并由 Plot 投影

**错误路径（≥ 2）**

- 缺 x 或 y 被 Scatter schema 拒绝
- mark patch 尝试携带 type、id、encoding、transform 或 coordinateView 被 strict schema 拒绝
- 视觉角色非法 constant 在 Chart schema 失败
- 1D coordinate、缺失 custom coordinate definition、非 `['x', 'y']` roles 或 composition defaultView 不兼容时 `core-recipe-violation`

**交互（≥ 2）**

- 追加 Interval Mark 不替换 Point，resolved PlotSpec 同时含两者
- presentation 包裹前后 Point provenance / datum locator 一致
- Kernel gate 解除后 Chart + Plot + Standard 混合入口共用同一 Plot dataset / definition group
- reserved id 冲突失败；inspection 的 `mark.main` 区分 default / override / extension
- Kernel gate 解除后 JSON / React / Vanilla 生成 exact-equal ChartSpec 与 PlotSpec

### 依赖的现有元素

- `PointMarkSchema` / Point MarkDefinition——核心 Mark 与 patch 真源
- strict color union、Size / Opacity / Shape channel schemas——视觉角色绑定
- Plot `resolveCoordinateScopeRegistry`、`LowerPlotsOptions.coordinates`、position scale inference、Cartesian2D / Polar2D coordinate 与 axis guides——默认配方与 custom definition 真源
- ADR-01–03 resolver、style、presentation 主链
