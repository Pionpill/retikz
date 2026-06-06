# ADR-03：连续 mark（area 新建 + line/area polar 投影 + closed 雷达）

> 在 ADR-01 的 `CoordinateFrame` 之上落「连续」家族：新建 area mark（线↔baseline 区域，cartesian + polar），line / area 在 polar 投影成弯弧 Path，加 `closed`（首尾相连）支撑雷达 / 填充雷达。下沉 core `Path`。
> schema 字段名 / 默认值 AI 提案，待人工 review 拍板。

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [ADR-01](./01-coordinate-polar.md) · [plot-design.md §3.7 mark / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

ADR-02 的 sector 家族下沉成参数化 Node。但**连续 mark（line / area）跨多数据点、无参数化形态**（§8.3）：它们由 coordinate 逐点投影成 `Path`，连接靠 datum 锚点。alpha.1~alpha.3 的 line 已是「投影点 → move/line steps」，但写死直边、且只有 cartesian。

polar 落地带来两个新问题：

1. **直边在极坐标失真**：数据空间里一条「常半径、角度渐变」的边，投影到极坐标屏幕空间是**弧**，不是直线。直接连两个投影点得到的是**弦**。§8.3 明确「直边采样弯成弧」——段内采样中间点、逐点投影，让数据空间直边在屏幕上弯成弧。
2. **雷达需要闭合**：plot-design §3.7「line + polar2D + closed → 雷达」。雷达是首尾相连的多边形（折线轮廓），填充雷达再叠 fill——需要 `closed`。

同时 area mark 一直缺位（alpha.3 显式推迟）：area = 线与 baseline（或另一条线）间的可填充区域，cartesian 是标准面积图、polar 下是环带 / 扇面填充。

## 决策：line/area 投影点成 Path，polar 段内采样弯弧；新增 area mark（line↔baseline 区域）；line/area 加 `closed`

三块：

### 1. 连续 mark 逐点投影 + polar 段内采样（仅连续角轴）

line / area 顶点经 `frame.project` 投影。**采样规则按角向 scale 类型分**（这是 P1 修正要点——分类值之间不能插值）：

- **连续角轴**（angle scale = linear / time）：相邻两顶点间在 **scale 输出的角度空间**（度）+ 半径空间线性插值 N 个中间点、逐点反投影，使数据空间「常半径变角」的边在屏幕弯成弧。**不在原始数据空间插值**（数据可能是非数值 / 非等距）。
- **分类角轴**（angle scale = band / point）：类别之间无中间值，**不采样、走弦**（顶点直连）。
- **`closed`（雷达）**：恒为多边形轮廓，**不采样、走弦**（雷达本就是折线多边形）。

cartesian 永不采样（直边即直边，零开销、行为等价 alpha.3）。

```
buildPath(orderedRows):
  vertices = rows.map(project)                 // 顶点（坐标系无关）
  if frame.type == polar2D && angleScale 连续 && !closed:
    points = densifyInAngleSpace(vertices, frame, SAMPLES)   // 在 [θ,r] 空间插值后反投影，非数据空间
  else points = vertices                       // 分类角轴 / closed / cartesian：走弦
  steps = [move(points[0]), ...line(points[1:]), ...(closed ? [close] : [])]
```

### 2. area mark（新）：线↔baseline 区域

area = 上沿折线 + baseline 回边 + 闭合，下沉成可填充 `Path`。cartesian baseline 默认 0（一条水平基线）；polar baseline 默认 0（径向内界 / 圆心方向）。

```
lowerArea:
  top    = 上沿投影点（同 line，polar 采样）
  bottom = baseline 投影点（沿同 primary 序、secondary=baseline）逆序
  Path{ fill, children: [move(top[0]), ...line(top[1:]), ...line(bottom), close] }
```

### 3. `closed`：line / area 首尾相连

`closed: true` 在路径尾部加回到首点的闭合（core `close` step / cycle）。**雷达** = line + polar + closed（多边形轮廓，段内不采样或采样均可——多边形用弦）；**填充雷达** = area + polar + closed，或 closed line + fill。

schema 草案（详见实现契约）：

```ts
// ir/mark.ts —— describe 英文
export const AreaMarkSchema = z.object({
  type: z.literal(PlotMark.Area),       // 'area'
  order: z.string().min(1).optional(),  // connection order field (data order if omitted)
  series: z.string().min(1).optional(), // split into one area per series
  baseline: z.number().optional(),      // baseline value the area fills down to; default 0
  closed: z.boolean().optional(),       // connect last point back to first; default false
  ...markBase,
});
// LineMarkSchema 加  closed: z.boolean().optional()   // radar polygon when polar + closed
// MarkSchema = z.discriminatedUnion('type', [Point, Line, Interval, Sector, Area])
```

理由：

1. **连续 mark 坐标系无关 + 投影整形**：line/area 不分坐标系几何分支，靠 `frame.project` + 段内采样适配 polar；加坐标系不改 mark 主体（守 (i)）。
2. **采样弯弧是连续 mark 的唯一正解**：无参数化形态、跨多点，只能逐点投影；段内采样把数据空间直边正确弯成屏幕弧。
3. **`closed` 是雷达的最小增量**：一个布尔 + 尾部闭合 step，复用既有投影；不为雷达另立 mark。
4. **area 复用 line 投影**：area = 上沿（line）+ baseline 回边，最大化复用、cartesian/polar 同构。

## 待决策点 🔻

- **弦 vs 弧（已定）**：分类角轴（band/point）与 `closed` 雷达走弦（不采样）；仅**连续角轴**（linear/time）采样、且在 **scale 后角度空间**插值（非原始数据空间）。剩余开放：**采样密度**——固定 N（如每段 16 点，倾向）vs 按角度跨度自适应（角差大才密采）vs 暴露 `samples` prop。
- **雷达 = closed line vs closed area**：填充雷达走「closed line + fill」（轮廓+填充一体）vs area baseline=圆心。倾向 **closed line + 可选 fill** 为主、area-to-center 作等价路径（ADR-02 roadmap 待决策点 radar 填充已提）。
- **area baseline 形态**：常量 baseline（倾向，default 0）vs 双线 area（line↔line，band）。双线留后续。
- **area / line series + polar**：多系列雷达（多边形叠放）几何按系列拆子 Path（沿用 alpha.3 多系列 line）。
- **closed 在 cartesian 的语义**：cartesian + closed = 闭合多边形（合法但少用）→ 允许、不特判。

## DSL 表面

> core-internal（authoring → ADR-05）；primitive PlotSpec：

```ts
// 极坐标折线（段内采样弯弧）：encoding 复用 x/y，仅改 coordinate
const polarLine: PlotSpec = {
  namespace:'plot', type:'plot', data:{ reference:'series' },
  coordinate:{ type:'polar2D', angle:'a', radius:'r' },
  scales:[{ name:'a', type:'linear' }, { name:'r', type:'linear' }],
  marks:[{ type:'line', encoding:{ x:{ field:'t' }, y:{ field:'v' } } }],
};

// 雷达：closed line + polar（多边形轮廓）；填充雷达加 area 或 fill
const radar: PlotSpec = {
  namespace:'plot', type:'plot', data:{ reference:'metrics' },
  coordinate:{ type:'polar2D', angle:'axis', radius:'score' },
  scales:[{ name:'axis', type:'point' }, { name:'score', type:'linear' }],
  marks:[{ type:'line', closed:true, encoding:{ x:{ field:'dim' }, y:{ field:'value' } } }],
};

// 面积图（cartesian）：
//   marks:[{ type:'area', baseline:0, encoding:{ x:{field:'date'}, y:{field:'val'} } }]
```

## 测试设计

line/area cartesian 投影回归、polar 段内采样（弧点落在圆上）、area baseline 回边 + 填充、closed 闭合、雷达多边形、多系列。具体见实现契约。

## 影响

- **lower/mark.ts**：`lowerLine` 加 `closed` + polar 采样；新增 `lowerArea`。
- **lower/project.ts**：新增段内采样 helper（数据空间插值 + 逐点投影）。
- **lower/expand.ts**：area 的 baseline 纳入半径 / y 域（同 interval baseline）。
- **ir/mark.ts**：union 加 `area`；line / area 加 `closed`（非破坏，可选）。
- **core**：消费 `Path` + `close` step，不改 core。
- 文档：随 ADR-05。

## 不在本 ADR 范围

- polar guide → ADR-04；sector 家族 → ADR-02。
- authoring 表面 + docs → ADR-05。
- 双线 area（line↔line band）、曲线插值（基数 / 单调样条）、area 堆叠 → 后续。

---

## 实现契约（必填）🔻

> schema 字段名 / 默认值 AI 提案，待人工 review 冻结。

### Level

`red`（动 `ir/**` + `lower/**`）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/mark.ts` | 加 | `PlotMark.Area` | `as const` 成员 `'area'` | — | area 判别串关键字 |
| `ir/mark.ts` | 加 | `AreaMarkSchema.type` | `z.literal(PlotMark.Area)` | — | 判别字段：线↔baseline 区域 |
| `ir/mark.ts` | 加 | `AreaMarkSchema.order` | `z.string().min(1).optional()` | 数据序 | 连接顺序字段 |
| `ir/mark.ts` | 加 | `AreaMarkSchema.series` | `z.string().min(1).optional()` | — | 多系列拆分字段 |
| `ir/mark.ts` | 加 | `AreaMarkSchema.baseline` | `z.number().optional()` | `0` | 区域填充到的基线值 |
| `ir/mark.ts` | 加 | `AreaMarkSchema.closed` | `z.boolean().optional()` | `false` | 首尾相连（填充雷达） |
| `ir/mark.ts` | 加 | `LineMarkSchema.closed` | `z.boolean().optional()` | `false` | 首尾相连（polar = 雷达多边形） |
| `ir/mark.ts` | 改 | `MarkSchema` | union 加 `AreaMarkSchema` | — | mark union 扩 area |

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（改）
- `packages/plot/plot/src/lower/mark.ts`（改 —— lowerLine closed + polar 采样、lowerArea）
- `packages/plot/plot/src/lower/project.ts`（改 —— 段内采样 helper）
- `packages/plot/plot/src/lower/expand.ts`（改 —— area baseline 入域）
- `packages/plot/plot/tests/lower/mark.test.ts`（改 —— area / closed / 采样）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（改 —— area / closed accept/reject）

### 测试象限

**Happy path**：

- `cartesian area`：baseline 0 → 上沿 + 底边闭合的填充 Path。
- `polar line 采样`：两顶点大角差 → 段内采样点落在投影弧上（半径插值正确）。
- `closed line`：尾部回首点闭合。
- `雷达`：line + polar + point scale 角向 + closed → 闭合多边形顶点落在各轴。

**边界**：

- `<2 点 line/area`：返回 null（不成线）。
- `cartesian line N=0`：不采样，产物等价 alpha.3。
- `空数据`：layer null。

**错误路径**：

- `area 非有限值`：跳过该点（守投影 null 语义）。
- `polar + ordinal 角向 scale`：复用 ADR-01 守卫抛错。

**交互**：

- `cartesian line/area 回归`：既有 line 测试全绿、产物不变（采样 N=0）。
- `多系列 area/line`：series 拆多子 Path、各取系列色。
- `area × color`：填充按 color。

### 依赖的现有元素

- `lowerLine` / `buildLineSteps`（`lower/mark.ts`）—— 扩展 closed + 采样、复用于 area 上沿。
- `CoordinateFrame.project`（ADR-01，`lower/project.ts`）—— 逐点投影 + 采样基础。
- `compareByPath`（`lower/field.ts`）—— order 排序。
- core `Path` / `Step`（`close`）（`packages/core/core/src`）—— 下沉目标，仅消费。
