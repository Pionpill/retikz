# ADR-06：Connected Scatter 的 Point + Path 配方

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-05](./05-bubble.md)

## 背景

Connected Scatter 用点表示观察值，同时按稳定顺序连接它们，强调二维轨迹。连接不是可关闭的装饰；只有 Point 或只有 Path 都不再是该 type。

## 决策：`connected-scatter` 固定 points 与 connection 两个核心 Mark

```ts
type ConnectedScatterChartSpec = ChartCommon & {
  type: 'connected-scatter';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    order: string;
    series?: string;
    color?: IRPlotChannel;
  };
  mark?: ConnectedPointPatch;
  components?: {
    connection?: ConnectedPathPatch;
  };
};
```

recipe 生成：

- `mark.connection`：id=`__chart.connected-scatter.mark.connection` 的 Path，读取 x / y，`order` 来自 encoding.order，`series` 可选
- `mark.points`：id=`__chart.connected-scatter.mark.points` 的 Point，读取相同 x / y
- 绘制顺序固定为 connection 在前、points 在后

`mark` patch 调整 points，并直接复用 ADR-04 排除了 `coordinateView` 的 strict Point patch。`components.connection` 不是对非 strict `PathMarkSchema` 直接 `omit/partial`，而是用 `z.strictObject` 从 Path 字段重建，只允许 `curve`、`connectNulls`、`strokeWidth`、`opacity`、`lineCap`、`lineJoin`、`roundedCorners`、`fill`、`stroke`、`strokeOpacity`、`fillRule`、`thickness`、`marks`、`dashPattern`、`shadow`、`blendMode` 与 `label`。`type`、`id`、`encoding`、`order`、`series`、`closed`、`closure`、`transform`、`coordinateView`、`anchorId`、`zIndex`、`rotate`、`scale` 不能进入 patch，避免撤销连接拓扑、排序、主 view、前后层级与 locator 语义。

recipe 逐字复用 ADR-04 的 coordinate、x / y guides 与 style / presentation fragments；除仅有 `series` 时的隐式 ordinal color scale 外，`scales` 仍为空。两个 Mark 的 color 必须写入 Plot 正式 `encoding.color`，不能写成顶层 MarkValue。固定顺序为：

```ts
[
  {
    type: 'path',
    id: '__chart.connected-scatter.mark.connection',
    order: spec.encoding.order,
    closed: false,
    ...(resolvedSeries ? { series: resolvedSeries } : {}),
    encoding: {
      x: spec.encoding.x,
      y: spec.encoding.y,
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
  {
    type: 'point',
    id: '__chart.connected-scatter.mark.points',
    encoding: {
      x: spec.encoding.x,
      y: spec.encoding.y,
      ...(resolvedColorChannel ? { color: resolvedColorChannel } : {}),
    },
  },
];
```

series / color 七种情况固定为：

| 输入                    | Path `series` | 两个 Mark 的 `encoding.color`                                         | recipe scale / 诊断                                                                                                           |
| ----------------------- | ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 均省略                  | —             | —                                                                     | 无                                                                                                                            |
| 仅 series               | series field  | `{field:series,scale:'__chart.connected-scatter.scale.series-color'}` | 生成同名 ordinal scale；只接受 categorical / 未声明类型字段，continuous / temporal 沿用 Plot scale-field incompatibility 诊断 |
| 仅 color constant       | —             | `{value:color}`                                                       | 单 Path，常量色                                                                                                               |
| 仅 color field          | color field   | 原样 `{field,scale?}`                                                 | Path 显式按 color field 分组；无 scale 的 continuous / temporal color 沿用 Plot 诊断                                          |
| series + constant color | series field  | `{value:color}`                                                       | 按 series 分组，所有组使用相同常量色                                                                                          |
| series = color field    | series field  | 原样 `{field,scale?}`                                                 | Plot 使用同一字段分组与着色                                                                                                   |
| series != color field   | series field  | 原样 `{field,scale?}`                                                 | Plot 数据期校验每个 series 内 color 恒定，否则 fail-loud                                                                      |

Chart 不合成复合分组 key，也不提前扫描 runtime rows。color 使用 ADR-04 strict schema 与 MarkValue 映射。

若 `series` 在 data model 中声明为 continuous / temporal，用户必须显式补 `encoding.color:{field:series,scale:<compatible-color-scale>}` 与对应 top-level scale；此时进入 `series = color field` 分支。把任意标量强制解释为类别属于 Plot owner 的 scale capability，Chart 不复制 ordinal 算法。

coordinate shorthand 时保留 `coordinate`、不生成 `composition`，Path、Point 与两条 axes 都省略 `coordinateView`。composition 时复用 ADR-04 的 `resolveCoordinateScopeRegistry` 和 `roles === ['x','y']` 校验，保留 `composition`、不生成 `coordinate`，并把 Path、Point 与两条 axes 的 `coordinateView` 全部固定为 `composition.defaultView`。custom coordinate definition 继续来自与 `lowerPlots` 同一份 `LowerChartsOptions.plot.coordinates`。

`validateCore` 在 merge 后逐项检查：

1. 前两个 marks 按顺序精确为 reserved-id Path 与 Point，追加 marks 只能位于其后
2. Path `order` 等于 `encoding.order`、`closed === false`，两个 Mark 的 x / y bindings deep-equal
3. 七种矩阵下 Path `series` 与两个 Mark 的 `encoding.color` deep-equal 上表结果
4. 仅 series 分支存在 reserved-name ordinal scale且两个 color bindings 引用它；其它分支不要求该 scale
5. shorthand 下两个 Mark 都无 `coordinateView`；composition 下都等于 defaultView

任一不变量破坏统一抛 `core-recipe-violation`。显式 `closed:false` 保证 Cartesian 与 Polar 都是开放轨迹，坐标切换只改变 role projection。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "connected-scatter",
  "data": { "reference": "trajectory" },
  "encoding": {
    "x": { "field": "efficiency" },
    "y": { "field": "quality" },
    "order": "year",
    "series": "product"
  },
  "components": {
    "connection": { "curve": "linear" }
  }
}
```

## 测试设计

- exact recipe：Path 在 Point 前，二者共享 roles
- order / series：稳定分组与排序
- invariant：两个核心 marks 均不可撤销

## 影响

- 扩展 ChartSpec union 与 type-specific `components`
- inspection 首次记录多个核心 semantic targets
- docs 新增 Connected Scatter canonical 页面

## Chart 封装完备性检查

- 核心 recipe：Point + Path + order
- 表现性调整：Point / Path 样式、curve、guide
- coordinate：两种 Mark 共用同一 Plot frame / roles
- extension：root transform 先于两个 marks；额外 marks 追加
- 本轮结论：组合 Plot 现有 Point / Path

## 不在本 ADR 范围

- 仅 Line 或仅 Scatter
- order 自动猜测、时间解析或路径优化
- 多 view / animation trail

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 ChartSpec variant 与组件 patch schema。

### Schema 改动

| 文件                                                  | 操作 | 字段名                  | 类型                               | 默认值 | describe 中文摘要 |
| ----------------------------------------------------- | ---- | ----------------------- | ---------------------------------- | ------ | ----------------- |
| `packages/viz/chart/src/schemas/connected-scatter.ts` | 新增 | `type`                  | `z.literal('connected-scatter')`   | —      | type 判别值       |
| 同上                                                  | 新增 | `encoding.x` / `y`      | `ChannelSchema`                    | —      | 共享位置角色      |
| 同上                                                  | 新增 | `encoding.order`        | `z.string().min(1)`                | —      | 必需路径顺序字段  |
| 同上                                                  | 新增 | `encoding.series`       | `z.string().min(1).optional()`     | —      | 可选路径分组字段  |
| 同上                                                  | 新增 | `encoding.color`        | ADR-04 strict color union optional | —      | 点线共享颜色      |
| 同上                                                  | 新增 | `mark`                  | Point patch optional               | —      | points patch      |
| 同上                                                  | 新增 | `components.connection` | Path patch optional                | —      | connection patch  |
| `packages/viz/chart/src/schemas/chart.ts`             | 修改 | root union              | 加入 Connected Scatter             | —      | 扩展封闭 union    |

### 文件 scope

- `packages/viz/chart/src/schemas/connected-scatter.ts`
- `packages/viz/chart/src/schemas/chart.ts`
- `packages/viz/chart/src/providers/recipes/connected-scatter.ts`
- `packages/viz/chart/src/providers/recipes/index.ts`
- `packages/viz/chart/tests/**/connected-scatter*`
- `packages/viz/chart-react/tests/connected-scatter.test.tsx`
- `packages/viz/chart-vanilla/tests/connected-scatter.test.ts`
- `apps/docs/**`（Connected Scatter 中英文 canonical 页面 / demo）

### 测试象限

**Happy path（≥ 3）**

- 最小 spec 精确生成 Path + Point
- order 进入 Path 且绘制顺序固定
- series 同时作用于 Path 分组与颜色默认
- 七种 series / color 组合生成上文精确 Point / Path encoding；仅 series 时同时生成 reserved ordinal scale

**边界（≥ 2）**

- 单 datum 保留两个核心 Mark，Path lowering 可无可见 segment
- 重复 order 值遵守 Plot 稳定排序

**错误路径（≥ 2）**

- 缺 order 被 schema 拒绝
- connection patch 尝试改 type / order / encoding 被拒绝
- series != color field 且同一 series 内颜色不恒定时由 Plot 数据期校验失败
- series-only 但 data model 将字段声明为 continuous / temporal 时沿用 Plot scale-field incompatibility 诊断
- custom coordinate 缺失、roles 非 `['x','y']`，或 composition defaultView 不兼容时 `core-recipe-violation`

**交互（≥ 2）**

- root filter transform 对 points 与 connection 使用同一结果 rows
- Polar2D coordinate 下两个 Mark 仍共享 Plot role projection
- composition / custom coordinate 下两个 Mark 与 axes 固定共享 default view
- inspection 含稳定 `mark.connection` / `mark.points` targets 与 sources；reserved id 冲突失败
- 无 presentation 时返回裸 Plot identity；有 presentation 时包裹 Standard FlexLayout，Point datum locator、Path series locator、provenance 与 lineage payload 保持
- ADR-04 Kernel gate 解除后，JSON / React / Vanilla 对同一输入生成 exact-equal ChartSpec、resolved PlotSpec 与 final composition；gate 前只执行 core resolver 测试

### 依赖的现有元素

- Plot Point / Path Mark schemas 与 definitions
- Path `order`、`series`、curve 与 mark ordering
- Plot `encoding.color`、ordinal scale、series 内 color 恒定校验
- ADR-04 的 x / y、coordinate / composition / guide fragments与 Kernel gate
