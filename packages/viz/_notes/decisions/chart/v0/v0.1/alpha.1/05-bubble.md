# ADR-05：Bubble 的不可撤销 size 语义

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04](./04-scatter.md)

## 背景

Bubble 与普通 Scatter 共用 Point Mark，但 size 数据角色是持续成立的类型身份。只有视觉上把点画大、或允许用户把 size 改成常量，不能构成 Bubble。

## 决策：`bubble` 固定 Point + field-bound size

```ts
type BubbleChartSpec = ChartCommon & {
  type: 'bubble';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    size: { field: string; scale?: string };
    color?: IRPlotChannel;
    opacity?: IRPlotOpacityChannel;
    shape?: IRPlotShapeChannel;
  };
  mark?: BubblePointPatch;
};
```

recipe 复用 Scatter 的 x / y scale、coordinate 与 guide，并增加：

- `mark.main`：id=`__chart.bubble.mark.main` 的 Point，field-bound size 直接写入 Point 正式 `size`
- size scale name 为 `encoding.size.scale ?? 'size'`；recipe 生成同名 `{type:'sqrt',name}`，同名用户 scale 按 ADR-01 替换后复验
- `mark.main.size` 固定为 `{kind:'field',value:encoding.size.field,scale:name}`
- `guide.size` 固定为 `{type:'legend',channel:'size'}`，属于可替换的表现性默认；当前 Plot size descriptor 不携带 `scaleName`，默认 legend 只能按唯一 size descriptor 绑定

Bubble 的 `encoding.size` 只允许 field，不允许 constant value。`BubblePointPatchSchema` 从 Point patch 中继续移除 `size`，防止局部配置撤销必需 size mapping；用户可以通过名为 `size` 的显式 scale 调整 range，但不能移除 size role。

Bubble `validateCore` 在 Chart resolution 阶段验证：

1. `mark.main` 存在、type=point、id 与 semantic target 不变
2. size 为 field binding且字段等于 `encoding.size.field`
3. size 引用的 scale 存在且 type=`sqrt`
4. scale name 等于 `encoding.size.scale ?? 'size'`

缺 scale、非 sqrt、改字段或核心 Point 破坏统一抛 `core-recipe-violation`。未知自定义 size scale 不接受，因为 Bubble 的面积感知语义需要 sqrt。

现有 Plot 在 size 字段全部为零时返回内建最小半径，显式 sqrt range 不参与该 degenerate case。alpha.1 接受此 Plot 现状，不承诺全零数据可通过 range 区分大小，也不在 Chart 补算法。

当前 Plot 也不能用 `guide.scale` 消歧具名 size descriptor。若用户追加另一个 field-bound size Mark，默认 size legend 会按 Plot 现有多 descriptor 诊断失败；用户可用顶层 `guides` 整体替换默认 guides、暂时不绘制 size legend，或避免在同一 Plot 中引入第二个 size descriptor。Chart 不修补 Plot channel / legend pipeline；具名 size legend 的完整消歧能力留给独立 Plot owner ADR。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "bubble",
  "data": { "reference": "countries" },
  "encoding": {
    "x": { "field": "income" },
    "y": { "field": "lifeExpectancy" },
    "size": { "field": "population" },
    "color": { "field": "region" }
  }
}
```

## 测试设计

- schema：field-only size 与 Bubble-specific mark patch
- recipe：sqrt scale、Point size、legend
- invariant：任何覆盖后 size mapping 仍有效

## 影响

- 扩展 ChartSpec union
- 复用 Scatter adapter，无 Bubble 私有 runtime
- docs 新增 Bubble canonical 页面

## Chart 封装完备性检查

- 核心 recipe：Point + x / y + field-bound size
- 可调整：size scale range、legend、Point 其它样式
- 不可调整：Point type、size role / field mapping 的存在性
- extension：可追加其它 marks，但不能替换主 Point
- 本轮结论：组合 Plot Point 与 size channel 现有能力

## 不在本 ADR 范围

- packed bubble / circle packing
- 只有常量半径的 Scatter pattern
- size 数据清洗或负值补偿算法

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 ChartSpec variant。

### Schema 改动

| 文件                                       | 操作 | 字段名                                 | 类型                                | 默认值 | describe 中文摘要        |
| ------------------------------------------ | ---- | -------------------------------------- | ----------------------------------- | ------ | ------------------------ |
| `packages/viz/chart/src/schemas/bubble.ts` | 新增 | `type`                                 | `z.literal('bubble')`               | —      | Bubble 判别值            |
| 同上                                       | 新增 | `encoding.x` / `y`                     | `ChannelSchema`                     | —      | 二维位置角色             |
| 同上                                       | 新增 | `encoding.size`                        | field-only size schema              | —      | 不可撤销的数量大小角色   |
| 同上                                       | 新增 | `encoding.color` / `opacity` / `shape` | 对应 Plot schema optional           | —      | 可选 Point 视觉角色      |
| 同上                                       | 新增 | `mark`                                 | `BubblePointPatchSchema.optional()` | —      | 不含 size 的 Point patch |
| `packages/viz/chart/src/schemas/chart.ts`  | 修改 | root union                             | 加入 Bubble                         | —      | 扩展封闭 type union      |

### 文件 scope

- `packages/viz/chart/src/schemas/bubble.ts`
- `packages/viz/chart/src/schemas/chart.ts`
- `packages/viz/chart/src/providers/recipes/bubble.ts`
- `packages/viz/chart/src/providers/recipes/index.ts`
- `packages/viz/chart/tests/**/bubble*`
- `packages/viz/chart-react/tests/bubble.test.tsx`
- `packages/viz/chart-vanilla/tests/bubble.test.ts`
- `apps/docs/**`（Bubble 中英文 canonical 页面 / demo）

### 测试象限

**Happy path（≥ 3）**

- 最小 Bubble 生成 Point + field size + sqrt scale
- 显式 size scale range 调整气泡范围
- color 与 size 同时生成各自 legend descriptor；无 `scale` 的默认 size legend 绑定唯一 size descriptor

**边界（≥ 2）**

- size 字段全零使用 Plot 内建最小半径；显式 range 不承诺生效
- 单 datum size 仍生成确定性半径

**错误路径（≥ 2）**

- 缺 size 或 size 使用 constant value 被 schema 拒绝
- mark patch 试图设置 size / type / encoding 被拒绝
- 缺 size scale、替换为非 sqrt、改 size field、删除主 Point 均由 validateCore 拒绝

**交互（≥ 2）**

- 追加 Interval 背景后 Point 与 size mapping 仍存在
- Polar2D coordinate 下 size 仍是与位置正交的 Point channel
- JSON / React / Vanilla 对同一 Bubble 输入生成 exact-equal ChartSpec / PlotSpec / final composition
- inspection 稳定记录 `mark.main`、`scale.size` 与表现性 `guide.size`；scale override 只改变 `scale.size` source，顶层 guides replacement 则移除默认 `guide.size`
- 追加第二个 field-bound size descriptor 时沿用 Plot 多 scale 诊断；整体替换 guides 可显式移除默认 size legend

### 依赖的现有元素

- ADR-04 Scatter recipe fragments
- Plot `PointMarkSchema`、Size channel / sqrt scale、无 scale selector 的唯一 descriptor size legend
- Plot field validation 与 scale inference
