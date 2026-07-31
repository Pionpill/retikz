# ADR-07：Regression 的 mark-local Smooth 配方

- 状态：Proposed（core variant 可设计；public adapters / docs 受 ADR-04 Kernel gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-06](./06-connected-scatter.md)

## 背景

Regression 同时展示原始散点与拟合趋势。Plot 的 Smooth transform 会输出采样后的趋势 rows；若把它放在 Plot root，原始散点也会被替换，破坏该 type。

Plot 已支持 mark-local transform，因此趋势计算应只属于 trend Path。

## 决策：Point 读取原始 rows，Path 通过 mark-local Smooth 读取派生 rows

```ts
type RegressionChartSpec = ChartCommon & {
  type: 'regression';
  encoding: {
    x: { field: string };
    y: { field: string };
    series?: string;
    color?: StrictColorChannel;
  };
  mark?: RegressionPointPatch;
  components?: {
    trend?: {
      transform?: RegressionSmoothPatch;
      mark?: RegressionPathPatch;
    };
  };
};
```

recipe 生成：

- `mark.points`：id=`__chart.regression.mark.points` 的原始 Point
- `transform.trend`：位于 trend Path 的 Smooth，x / y 来自 field-bound encoding，输出 `__chart.regression.trend.x` / `__chart.regression.trend.y`
- `mark.trend`：id=`__chart.regression.mark.trend`，读取输出字段的 Path；series 映射到 Smooth `groupBy` 与 Path `series`

Regression 的 x / y 是 strict `{field:string}`，不能使用 constant 或位置 binding 上无效的 `scale`。用户可调整 Smooth `method`、`sampleCount`、`extent`，但不能修改 kind、输入 / 输出字段或把 transform 移到 root。

color constant 同时应用于 points / trend。color field 必须等于 `series`，或在省略 series 时自动成为 Smooth `groupBy` 与 Path `series`；这保证 Smooth 输出保留颜色分组字段，不依赖代表 row 猜测颜色。series 与不同 color field 的组合在 Chart schema 阶段拒绝。

marks 数组固定先画 trend、后画 points：

```ts
[
  {
    type: 'path',
    id: '__chart.regression.mark.trend',
    order: '__chart.regression.trend.x',
    closed: false,
    ...(resolvedSeries ? { series: resolvedSeries } : {}),
    transform: [
      {
        kind: 'smooth',
        x: spec.encoding.x.field,
        y: spec.encoding.y.field,
        ...(resolvedSeries ? { groupBy: [resolvedSeries] } : {}),
        ...smoothPatch,
        xAs: '__chart.regression.trend.x',
        yAs: '__chart.regression.trend.y',
      },
    ],
    encoding: {
      x: { field: '__chart.regression.trend.x' },
      y: { field: '__chart.regression.trend.y' },
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
  {
    type: 'point',
    id: '__chart.regression.mark.points',
    encoding: {
      x: { field: spec.encoding.x.field },
      y: { field: spec.encoding.y.field },
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
];
```

省略 `method` 表示 Plot 当前默认 linear；patch 若给出 method，必须通过 `SmoothMethodSpecSchema`。`RegressionSmoothPatch` 是只允许 `method`、`sampleCount`、`extent` 的 strict object。`RegressionPointPatch` 复用 ADR-04 strict Point patch；`RegressionPathPatch` 复用 ADR-06 的纯表现 strict allowlist，不允许 `connectNulls`，也不允许 type、id、order、series、closed、closure、encoding、transform、coordinateView、anchorId、zIndex、rotate、scale。

series / color 输入矩阵固定为：

| 输入                    | Smooth `groupBy` | Path `series` | 两个 Mark 的 `encoding.color`          | 结果                                                                                         |
| ----------------------- | ---------------- | ------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| 均省略                  | —                | —             | —                                      | 单组拟合                                                                                     |
| 仅 series               | `[series]`       | series        | reserved ordinal scale 的 series field | categorical / untyped series 自动着色；continuous / temporal 需显式 color + compatible scale |
| 仅 color constant       | —                | —             | `{value}`                              | 单组、常量色                                                                                 |
| 仅 color field          | `[color.field]`  | color.field   | 原样 `{field,scale?}`                  | 按 color 分组拟合                                                                            |
| series + constant color | `[series]`       | series        | `{value}`                              | 按 series 分组、统一颜色                                                                     |
| series = color field    | `[series]`       | series        | 原样 `{field,scale?}`                  | 同字段分组与着色                                                                             |
| series != color field   | —                | —             | —                                      | Chart schema 拒绝                                                                            |

仅 series 时生成 `__chart.regression.scale.series-color` ordinal scale；字段类型边界和显式恢复路径与 ADR-06 一致。color field 无显式 scale 且为 continuous / temporal 时沿用 Plot 诊断。

## Smooth 数据边界

Smooth 对每个 group 只保留运行时为有限 number 的 x/y pair。每组必须至少有两个 pair，且 x 至少有两个不同值；空数据、全无效、相同 x、或多组中任一组不满足时，Plot fail-loud，整个 Chart 不产生部分结果。无效 pair 可以被忽略，但剩余 pairs 仍需满足上述条件。Chart 不捕获 Smooth 错误来只保留 points，也不新增 temporal / categorical coercion；输入在 root transform / Plot field normalization 后是否为有限 number，以 Plot 当前数据链为准。

## Coordinate / composition 与核心复验

缺省 `scales:[]`。coordinate shorthand 与 composition 均先用 Plot `resolveCoordinateScopeRegistry` 找 active/default operation，再用 `resolveCoordinateRegistry(options.plot?.coordinates)` 查询 definition并要求 `roles === ['x','y']`；同一 `options.plot` 原样传给 `lowerPlots`。shorthand 下 trend、points 与两条 axes 都省略 `coordinateView`；composition 下全部固定为 `defaultView`。Path 显式 `closed:false`，Polar 只改变投影，不闭合趋势。

`validateCore` 复验 marks 前两项顺序与 reserved ids、Point / Path type、Path order / closed、mark-local Smooth exact IO / groupBy / scope、原始与派生 encoding、series / color 矩阵、reserved series scale和两个 Mark 的同一 view。任一破坏抛 `core-recipe-violation`。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "regression",
  "data": { "reference": "measurements" },
  "encoding": {
    "x": { "field": "temperature" },
    "y": { "field": "yield" }
  },
  "components": {
    "trend": {
      "transform": { "sampleCount": 96 },
      "mark": { "strokeWidth": { "kind": "constant", "value": 2 } }
    }
  }
}
```

## 测试设计

- schema：field-only x / y、trend patches
- rows：points 保留原 rows，trend 使用 Smooth rows
- invariant：Smooth 与 Path 不可撤销

## 影响

- 扩展 ChartSpec union
- inspection 增加 transform target
- docs 新增 Regression canonical 页面

## Chart 封装完备性检查

- 核心 recipe：Point + mark-local Smooth + Path
- Data / Plot owner：拟合由 Plot Smooth definition 执行，Chart 不补算法
- extension：root transforms 先作用于共同输入，Smooth 再仅作用于 trend
- parity：所有配置 JSON-safe，无 adapter-only callback
- 本轮结论：组合 Plot 现有 mark-local transform

## 不在本 ADR 范围

- 新回归算法、置信区间、统计显著性
- runtime callback method
- 把 fitted rows 暴露为第二根 dataset

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 ChartSpec variant。

### Schema 改动

| 文件                                           | 操作 | 字段名                       | 类型                               | 默认值 | describe 中文摘要                |
| ---------------------------------------------- | ---- | ---------------------------- | ---------------------------------- | ------ | -------------------------------- |
| `packages/viz/chart/src/schemas/regression.ts` | 新增 | `type`                       | `z.literal('regression')`          | —      | Regression 判别值                |
| 同上                                           | 新增 | `encoding.x` / `y`           | strict field-only channel          | —      | Smooth 输入字段                  |
| 同上                                           | 新增 | `encoding.series`            | `z.string().min(1).optional()`     | —      | 拟合分组字段                     |
| 同上                                           | 新增 | `encoding.color`             | ADR-04 strict color union optional | —      | points / trend 共享颜色          |
| 同上                                           | 新增 | `mark`                       | strict Point patch optional        | —      | 原始 points patch                |
| 同上                                           | 新增 | `components.trend.transform` | strict Smooth patch optional       | —      | 仅 method / sampleCount / extent |
| 同上                                           | 新增 | `components.trend.mark`      | strict Path style patch optional   | —      | trend Path 样式                  |
| `packages/viz/chart/src/schemas/chart.ts`      | 修改 | root union                   | 加入 Regression                    | —      | 扩展封闭 union                   |

### 文件 scope

- `packages/viz/chart/src/schemas/regression.ts`
- `packages/viz/chart/src/schemas/chart.ts`
- `packages/viz/chart/src/providers/recipes/regression.ts`
- `packages/viz/chart/src/providers/recipes/index.ts`
- `packages/viz/chart/tests/**/regression*`
- `packages/viz/chart-react/tests/regression.test.tsx`
- `packages/viz/chart-vanilla/tests/regression.test.ts`
- `apps/docs/**`（Regression 中英文 canonical 页面 / demo）

### 测试象限

**Happy path（≥ 3）**

- 最小 spec 生成原始 Point 与带 Smooth 的 trend Path
- sampleCount / extent 只 patch 隐式 Smooth
- series 同时生成 groupBy 与分组 Path
- 七种 series / color 输入得到上表结果或稳定 schema 诊断

**边界（≥ 2）**

- 每组恰好两个 finite pair 且 x 不同，满足最低拟合输入
- invalid pair 被忽略后仍有足够 pair 时成功

**错误路径（≥ 2）**

- x / y constant 或 `scale` 被 strict schema 拒绝
- trend patch 试图改 kind、x、y、xAs、yAs 或移除 transform 被拒绝
- 空数据、全无效、相同 x、或多组任一坏组沿用 Plot fail-loud，不能返回只有 points 的部分结果
- series != color field 被 Chart schema 拒绝

**交互（≥ 2）**

- root filter 后 points 和 Smooth 共享过滤结果，但仅 trend 接收采样 rows
- 自定义 Path style / color scale 不改变 Smooth lineage
- inspection 稳定记录 `mark.points`、`transform.trend`、`mark.trend` value / source 与 reserved ids
- presentation 前后 Point datum locator 使用 root-transformed rows，trend Path series locator、Smooth group provenance 与 lineage payload 保持
- ADR-04 Kernel gate 解除后 JSON / React / Vanilla 对 ChartSpec、resolved PlotSpec 与 final composition exact parity；gate 前只实现 core variant

### 依赖的现有元素

- Plot `SmoothTransformSchema` / definition
- Plot mark-local transform pipeline
- Plot coordinate scope / definition registries
- Point / Path Mark definitions、field resolver、locator、provenance 与 lineage
