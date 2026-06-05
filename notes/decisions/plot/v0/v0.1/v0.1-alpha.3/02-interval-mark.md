# ADR-02：interval(bar) mark（baseline→value 矩形，bandwidth 定柱宽，下沉 rectangle Node）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.7 mark / §4.5 mark 构造](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-05 encoding/mark](../v0.1-alpha.1/05-plot-encoding-mark.md) · [alpha.1 ADR-06 lowering](../v0.1-alpha.1/06-plot-lowering.md) · 依赖：[ADR-01 band scale](./01-band-scale.md) · 消费方：[ADR-05 relation](./05-relation.md)

## 背景

alpha.1 有 `point`（散点）/ `line`（折线）两种 mark。柱状图需要第三种：**interval（bar）**——从一条 **baseline**（通常值 0）到数据值的矩形区间（plot-design §3.7：interval/bar = 「从 baseline 到 value 或 start/end 的区间」）。在 cartesian2D 竖直柱里：x 是分类（[ADR-01](./01-band-scale.md) band scale，柱宽 = `bandwidth`），y 从 baseline 到 value。

bar 是 alpha.3 主线产物。本 ADR 只做**单系列竖直柱**：一个类别一根柱、统一颜色、baseline=0。分组 / 堆叠 / 横向柱 / 自定义 baseline / start-end 区间（甘特）留 [ADR-05](./05-relation.md) 与后续。

**核心实现选择——bar 下沉成什么 core 图元**：core `PathSchema.children` 要求 `.min(2)` step，单个 `rectangle` step 的 path 不合法；逐柱 4-step path 体积大。而 core **rectangle Node**（`shape:'rectangle'` + `minimumWidth` + `minimumHeight` + `padding:0`，position=矩形中心）无 step 数约束、一柱一 Node、最省 IR——与 alpha.1 散点用 circle Node 同构。故 **bar = rectangle Node**。

## 决策：interval mark 进 MarkSchema；每柱下沉成一个 padding:0 的 rectangle Node，宽=bandwidth、高=|baseline→value|

`MarkSchema` 加 `interval` 成员（`type` 判别位，非破坏）。encoding 复用现有 `x`（band 类别）/ `y`（数值）位置通道，无新字段。lowering 对每行：x 中心 = band scale 的 `coordinate(category)`、柱宽 = `bandwidth`；y 端点 = `yScale.coordinate(0)`（baseline，clamp 进 range）与 `yScale.coordinate(value)`；柱 = 中心在 `[xc, (yBase+yVal)/2]`、`minimumWidth=bandwidth`、`minimumHeight=|yBase−yVal|` 的 rectangle Node。共享样式（shape / padding0 / fill / 无描边）上提到图层 Scope 的 `nodeDefault`（沿用 alpha.1「Scope 承载共享、Node 只留几何」原则）。

```ts
// packages/plot/plot/src/ir/mark.ts（扩 union）
export const PlotMark = {
  Point: 'point',
  Line: 'line',
  /** 区间：从 baseline 到 value 的矩形（柱状图 / 甘特） */
  Interval: 'interval',
} as const;

export const IntervalMarkSchema = z
  .object({
    type: z.literal(PlotMark.Interval).describe('Discriminator: a rectangular interval from a baseline to the value (bar)'),
    ...markBase, // id? + encoding
  })
  .describe('Interval mark: bar from baseline (0) to the value; width taken from the band scale');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, LineMarkSchema, IntervalMarkSchema])
  .describe('Mark union; extensible to area / sector / rule / text in later alphas');
```

```ts
// packages/plot/plot/src/lower/mark.ts（interval 分支，示意）
if (mark.type === 'interval') {
  const bandwidth = project.xBandwidth;            // 来自 ADR-01 PositionScale
  const yBase = project.yCoordinate(0);            // baseline=0 投影（clamp 进 range）
  const nodes: Array<IRNode> = [];
  for (const row of rows) {
    const xc = project.xCoordinate(row);           // band 中心
    const yv = project.yCoordinate(row);           // 值投影
    if (xc === null || yv === null) continue;
    nodes.push({
      type: 'node',
      position: [xc, (yBase + yv) / 2],
      minimumWidth: bandwidth,
      minimumHeight: Math.abs(yBase - yv),
    });
  }
  if (nodes.length === 0) return null;
  return {
    type: 'scope',
    // padding 0 + 无描边，让 minimumWidth/Height 即真实柱尺寸；fill 用 currentColor（color 编码见 ADR-04）
    nodeDefault: { shape: 'rectangle', padding: 0, strokeWidth: 0, fill: 'currentColor' },
    children: nodes,
  };
}
```

理由：

1. **rectangle Node 最省 IR、与既有 mark 同构**：一柱一 Node（vs 4-step path），共享样式上提 Scope；core rectangle Node 的 `minimumWidth/Height` 正好表达「显式柱尺寸」，`padding:0` 让盒子 = 柱本身。绕开 `PathSchema.children.min(2)` 对单矩形的拒绝。
2. **复用 band scale 的 `bandwidth` / `coordinate`**（[ADR-01](./01-band-scale.md)）：柱宽 / 柱位单一真源就是 x band scale，与该轴刻度严格对齐，不另算。
3. **baseline=0 投影 + clamp**：`yScale.coordinate(0)` 给柱底；值有正负时柱自然分布在 baseline 两侧（`minimumHeight=|yBase−yVal|`、中心取两端中点）。clamp 守 range 边界（与 alpha.2 投影一致）。
4. **encoding 零新增**：interval 复用 x/y，降低 schema 面与 LLM 负担；baseline / 横向 / start-end 等扩展留后续可选字段（非破坏）。

## 待决策点

- **下沉成 rectangle Node vs Path rectangle step**：选 **rectangle Node**（理由见上）。Path 方案受 `children.min(2)` 限制、单柱要凑步数，且矩形 step 的 fill 在 path 级、与「逐柱样式」张力大。代价：依赖 core Node 的 `minimumWidth/Height + padding:0` 精确等于柱尺寸——**实现时加几何断言测试锁定**（盒子 = 柱、不被默认 padding 撑大，类比 alpha.1 散点 `minimumSize` 的 W 修复）。
- **baseline 取值**：alpha.3 固定 **0**；可配置 baseline / 对数轴 baseline / start-end 双端 encoding（甘特）留后续（非破坏加 `baseline?` / `y2?`）。
- **value 缺失 / 非有限 / 类别缺失**：该行**跳过**（不产 Node），与 alpha.1 mark 投影返回 null 的跳过语义一致；全跳过 → 图层 null。
- **0 值柱**：`yVal === yBase` → `minimumHeight=0`。倾向**仍产 Node**（高度 0，渲染为零高矩形 / 不可见），不特殊剔除；若渲染端对 0 尺寸 Node 有问题，则跳过——实现时验证。
- **柱描边**：默认 `strokeWidth:0`（纯填充柱，主流默认）；描边 / 圆角（`roundedCorners`）留后续样式字段。
- **柱宽是否减 padding**：柱宽直接用 `bandwidth`（band scale 的 paddingInner 已在 [ADR-01](./01-band-scale.md) 留出柱间缝）；bar 层不再二次缩。

## DSL 表面

> 面向用户的 `<BarMark>` 在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { MarkSchema, PlotMark } from '@retikz/plot';

// 单系列柱：x 分类、y 数值
MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } });

// 进 PlotSpec：x 绑 band scale、y 绑 linear
// { ..., scales:[{type:'band',name:'x'},{type:'linear',name:'y'}],
//   coordinate:{type:'cartesian2D',x:'x',y:'y'},
//   marks:[{ type:'interval', encoding:{ x:{field:'month'}, y:{field:'revenue'} } }] }
```

## 测试设计

`packages/plot/plot/tests/ir/mark.schema.test.ts`（扩）+ `tests/lower/lowerPlots.test.ts`（扩）覆盖：interval schema accept/reject；柱宽 = bandwidth、柱位 = band 中心；柱高 = |baseline−value|、柱中心正确；baseline=0 投影；负值柱跨 baseline；缺失值跳过；全跳过 → 空图层；与 point/line 共存于一 PlotSpec。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/mark.ts`**（修改）：`PlotMark` 加 Interval；`IntervalMarkSchema`；`MarkSchema` 升 3 成员 union。
- **`packages/plot/plot/src/lower/mark.ts`**（修改）：加 interval 分支（rectangle Node 图层）。
- **`packages/plot/plot/src/lower/project.ts`**（依赖 [ADR-01](./01-band-scale.md)）：projector 暴露 `xBandwidth` / `xCoordinate` / `yCoordinate`，interval 消费。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：axisValues 对 interval 的 x（分类）/ y（连续）按 [ADR-01](./01-band-scale.md) 分流收集；baseline=0 纳入 y 域（保证 0 在 range 内、柱从底起）。
- **对外 API**：`@retikz/plot` 公开 `IntervalMarkSchema`，`PlotMark` 增成员。
- **对 core**：无（仍下沉到既有 rectangle Node，不依赖 core 新能力）。
- **被消费**：[ADR-05](./05-relation.md) 在此基础上加 dodge（切子带 + 偏移）/ stack（消费 y0/y1）。
- **文档**：柱状图示例（[ADR-07](./07-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **分组（dodge）/ 堆叠（stack）柱、多系列** → [ADR-05](./05-relation.md)。
- **颜色编码（按字段着色）** → [ADR-04](./04-color-scale.md)（本 ADR 柱统一 currentColor）。
- **横向柱（y 分类 / x 数值）、自定义 baseline、start-end 双端区间（甘特）、圆角 / 描边样式** → 后续。
- **area / sector / rule / text mark** → 后续。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（mark schema）+ `src/lower/**`（mark 下沉契约）→ red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/mark.ts` | 改常量 | `PlotMark` | 加 `Interval:'interval'` | — | mark 类型判别值集补 interval |
| `src/ir/mark.ts` | 新建 schema | `IntervalMarkSchema` | `z.object({ type:'interval', ...markBase })` | — | 区间柱 mark（复用 id?/encoding，无新字段） |
| `src/ir/mark.ts` | 改 union | `MarkSchema` | `z.discriminatedUnion('type',[Point,Line,Interval])` | — | mark 升 3 成员 |

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改）
- `packages/plot/plot/src/ir/index.ts`（修改：补导出）
- `packages/plot/plot/src/lower/mark.ts`（修改：interval 分支）
- `packages/plot/plot/src/lower/expand.ts`（修改：baseline=0 入 y 域 + 分类 x 收集）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（扩）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（扩：柱几何断言）

### 测试象限

**Happy path**：

- `interval_schema_valid`：`{ type:'interval', encoding:{ x:{field:'m'}, y:{field:'r'} } }` → 通过
- `bar_width_is_bandwidth`：3 类别、range 宽 300、paddingInner 0 → 每柱 `minimumWidth ≈ 100`
- `bar_height_from_baseline`：value=10、baseline=0、yScale → `minimumHeight = |y(0)−y(10)|`
- `bar_center_position`：柱中心 x = band 中心、y = (yBase+yVal)/2

**边界**：

- `bar_negative_value`：value<0 → 柱跨 baseline（中心在 baseline 下方、高=|.|）
- `bar_zero_value`：value=0 → `minimumHeight=0`（按决策仍产 Node）
- `bar_single_category`：单类别 → 一根占满 band 宽的柱
- `bar_baseline_in_domain`：y 域含 0（即便所有值>0，柱仍从 0 起，不从 min 起）

**错误路径**：

- `interval_missing_encoding_rejected`：缺 `encoding` → schema 拒
- `bar_missing_value_skipped`：某行 y 字段缺失 / 非有限 → 跳过该柱
- `bar_all_missing_null_layer`：全行无效 → 图层 null（不产空 Scope）

**交互**：

- `bar_with_point_coexist`：同 PlotSpec 含 interval + point → 两图层各自正确，共享 scale/coordinate
- `bar_uses_band_axis_alignment`：柱中心与 band 轴刻度（[ADR-01](./01-band-scale.md)）逐柱对齐
- `bar_node_box_equals_bar`：rectangle Node 的可视盒 = 柱尺寸（padding:0 生效、不被默认 padding 撑大）

### 依赖现有元素

- [ADR-01 band scale / PositionScale](./01-band-scale.md)（`lower/scale.ts` / `project.ts`）—— **依赖**：柱宽=bandwidth、柱位=coordinate。
- core `NodeSchema`（`shape:'rectangle'` / `minimumWidth` / `minimumHeight` / `padding` / `fill`，`packages/core/core/src/ir/node.ts`）—— **消费**：柱下沉目标，仅用既有字段不改 core。
- alpha.1 `lowerMark`（`lower/mark.ts`）—— **修改**：加 interval 分支，沿用「Scope 承载共享样式」原则。
- alpha.1 `markBase` / `EncodingSchema`（`ir/mark.ts` / `ir/encoding.ts`）—— **复用**：interval 不加新 encoding 字段。
