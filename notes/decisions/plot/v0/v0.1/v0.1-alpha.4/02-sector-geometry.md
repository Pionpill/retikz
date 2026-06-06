# ADR-02：sector 几何（polar interval→径向柱/玫瑰 + sector mark 饼图/环图）

> 在 ADR-01 的 `CoordinateFrame` 之上落「区间 / 扇形」家族：interval 在 polar 下成 sector（径向柱 / 玫瑰），新增 sector mark（饼图 / 环图）。两者都下沉 core 参数化可连接 `sector` Node。**累积角是 transform 阶段职责**，不进 mark。
> schema 字段名 / 默认值 AI 提案，待人工 review 拍板。

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [ADR-01](./01-coordinate-polar.md) · [plot-design.md §3.3 transform / §3.7 mark / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

ADR-01 把投影抽象成 `CoordinateFrame`、补了 polar 投影与极坐标散点。接下来最吃几何的是**区间类 mark**：cartesian 下 interval 是矩形（alpha.3 已实现），polar 下同一 interval 应成**扇形**（环楔）——这正是 §8.3 (i)「同一 mark 不同坐标系不同几何」的核心样例。

core v0.3-alpha.4 已补齐参数化可连接 `sector` shape（params `{ innerRadius, outerRadius, startAngle, endAngle }`，0°=+x / 90°=+y 屏幕 y 向下；带 apex / centroid / outer-arc-mid 等锚点）。故 (i) 不再受限于「采样弯曲 Path」：区间 mark 经 coordinate 投影成 sector 参数、下沉成**精确几何 + 可连接 + 省 IR** 的 Node，优于纯采样 Path。

两类「扇形」语义需分清（都下沉 core `sector`，但角 / 径来源不同）：

| 俗名 | mark | 角度来源 | 半径来源 |
|---|---|---|---|
| 径向柱 / 玫瑰图（rose / coxcomb） | **interval**（polar 下） | band 切分（类别等分角带） | baseline→value（半径编码值） |
| 饼图 / 环图（pie / donut） | **sector**（新 mark） | value 累积（累积角界） | 常量（内→外半径满铺） |

关键分层约束（plot-design §3.3 / §13.1）：**饼图的「value → 累积角界」是 transform 阶段职责**，发生在 scale / coordinate / mark 之前——与 alpha.3 堆叠柱「stack transform 产 y0/y1、interval mark 读 y0/y1」完全同构。绝不在 sector mark 内建累积（否则 transform 分层破裂、与 stack 重复造轮子）。

## 决策：interval 按 frame.type 投影整形成 sector；新增 sector mark 读 transform 派生的累积角界；累积复用泛化后的 stack transform

三块：

### 1. interval 在 polar 下下沉成 sector（lowering，无 IR 改动）

`lower/mark.ts` 的 `lowerInterval` 按 `frame.type` 分支：cartesian 走既有矩形；polar 走 sector——

```
for each row（angle 用 band scale 切类别）:
  [aStart, aEnd] = 该类别的 band 角带（angleScale band 起止，度）
  innerR = radiusScale.coordinate(baseline=0)     // 半径基线（frame.innerRadius）
  outerR = radiusScale.coordinate(value)
  Node{ position: frame.center,
        shape: { type:'sector', params:{ innerRadius:min(innerR,outerR), outerRadius:max(innerR,outerR),
                                          startAngle:aStart, endAngle:aEnd } },
        fill }
```

dodge（band 内分系列）→ 角带再切子角带；stack（堆叠径向）→ 半径从 y0 到 y1（读 stack 派生字段，与 cartesian 堆叠柱同源）。所有 sector 共享 `position = frame.center`，差异全在 params——IR 体积 O(行数) 但每 Node 极小。

### 2. sector mark（新）：饼图 / 环图，读累积角界

新增 `sector` mark：角度区间来自 transform 派生的累积界字段（与堆叠 interval 读 y0/y1 同构），半径常量（满铺 `frame.innerRadius`→`frame.outerRadius`，环图由 ADR-01 的 `coordinate.innerRadius` 决定）。

```
for each row:
  [v0, v1] = (row[startField], row[endField])     // 累积值界（来自 stack/cumulate transform）
  startAngle = angleScale.coordinate(v0)          // 角向 linear scale: [0,total] → [startAngle,endAngle] 度
  endAngle   = angleScale.coordinate(v1)
  Node{ position: frame.center,
        shape:{ type:'sector', params:{ innerRadius:frame.innerRadius, outerRadius:frame.outerRadius,
                                         startAngle, endAngle } },
        fill }   // 每片颜色由 color 编码（类别 → ordinal）
```

### 3. 累积角 = 泛化后的 stack transform

复用 alpha.3 的 `stack`，**放宽 `x` / `groupBy` 为可选**：缺省时单链累积（按数据序对 `y` 累加，产 `startField`/`endField` 界），正好喂饼图。sector mark 读 `startField`/`endField`（默认 `y0`/`y1`，与堆叠 interval 一致）。角向 linear scale 的 domain 取 `[0, 累积总值]`，range 由 ADR-01 frame 设成 `[startAngle, endAngle]` 度——累积值→角度的映射落在 scale + coordinate，mark 只读界、不算累积。

schema 草案（详见实现契约）：

```ts
// ir/mark.ts —— describe 英文
export const SectorMarkSchema = z.object({
  type: z.literal(PlotMark.Sector),     // 'sector'
  startField: z.string().min(1).optional(),  // cumulative lower-bound field (matches transform startField; default "y0")
  endField: z.string().min(1).optional(),    // cumulative upper-bound field (default "y1")
  ...markBase,                                // id + encoding（color 区分扇片）
});
// MarkSchema = z.discriminatedUnion('type', [Point, Line, Interval, Sector])

// ir/transform.ts —— 泛化 stack
//   StackTransformSchema.x      → .optional()   // omit = single cumulative chain over all rows
//   StackTransformSchema.groupBy→ .optional()   // omit = accumulate in data order
```

理由：

1. **(i) 投影整形在区间 mark 的精确落点**：interval 不带坐标系几何分支，由 coordinate（frame.type）整形成矩形 / 扇形；加坐标系不动 mark。
2. **下沉参数化可连接 Node 优于采样 Path**：精确弧、自带 core 锚点（apex/centroid/outer-arc-mid，为 alpha.5 命中扇区预留）、IR 省。
3. **累积守 transform 分层**：与 stack 同构、复用同一 op，杜绝 mark 内建 transform 的重复与破裂。
4. **interval 与 sector 分工清晰**：半径编码值（玫瑰）vs 角度编码值（饼图）是两种语义，各归 interval / sector，不靠魔法参数混用。

## 待决策点 🔻（已冻结 2026-06-06，按人工 ack）

- **累积 → 泛化 alpha.3 `stack`**（`x`/`groupBy` 转可选，缺省单链累积），不新增 cumulate op：少一个 op、与堆叠柱同源。
- **sector 角界字段命名 → 复用 `y0`/`y1`**（与堆叠 interval 同构、单一约定），不另起 startAngle/endAngle 字段名（避免与 coordinate 的同名混淆）。
- **sector 累积触发 → primitive 显式 transform**（与堆叠 interval 一致、分层显式可组合）；DSL `<SectorMark>` 自动装配（ADR-05 已定，sugar 层）。
- **value 跨 baseline（负值径向柱）→ swap**（保证 `outerRadius>innerRadius` 满足 core 硬约束），不 reject。
- **环图内半径来源 → `coordinate.innerRadius`**（单一来源），sector mark 不自带 innerRadius 覆盖。

## DSL 表面

> core-internal（authoring 表面 → ADR-05）；此处给 primitive PlotSpec：

```ts
// 玫瑰图（径向柱）：interval + polar，半径编码值、角度按类别 band 等分
const rose: PlotSpec = {
  namespace:'plot', type:'plot', data:{ reference:'sales' },
  coordinate:{ type:'polar2D', angle:'cat', radius:'val' },
  scales:[{ name:'cat', type:'band' }, { name:'val', type:'linear' }],
  marks:[{ type:'interval', encoding:{ x:{ field:'month' }, y:{ field:'amount' }, color:{ field:'month' } } }],
};

// 饼图：cumulate(stack) transform 产 y0/y1 → sector mark 读界、角度编码值
const pie: PlotSpec = {
  namespace:'plot', type:'plot', data:{ reference:'share' },
  transform:[{ kind:'stack', y:'value' }],          // x/groupBy 省略 = 单链累积
  coordinate:{ type:'polar2D', angle:'a', radius:'r', innerRadius:0 },  // innerRadius>0 = 环图
  scales:[{ name:'a', type:'linear' }, { name:'r', type:'linear' }],
  marks:[{ type:'sector', encoding:{ color:{ field:'label' } } }],      // 读 y0/y1
};
```

## 测试设计

interval polar→sector 参数（角带 / 半径基线→值）、sector mark 累积角界投影、泛化 stack 单链累积、dodge/stack 径向、color 分扇片、cartesian interval 回归不变。具体见实现契约。

## 影响

- **lower/mark.ts**：`lowerInterval` 加 polar 分支（产 sector Node）；新增 `lowerSector`。
- **lower/transform.ts**：`stack` 支持 x/groupBy 缺省的单链累积。
- **lower/expand.ts**：角向 linear scale domain 取 `[0, 累积总值]`（sector）；interval polar 的半径域含 baseline。
- **ir/mark.ts**：union 加 `sector`；**ir/transform.ts**：stack 的 x/groupBy 转可选（非破坏——既有堆叠柱仍传 x/groupBy）。
- **core**：消费 `sector` shape（`shape:{type:'sector',params}`），不改 core。
- 文档：随 ADR-05。

## 不在本 ADR 范围

- polar guide（角向 / 径向轴网格）→ ADR-04。
- 连续 mark（line/area polar、area mark、closed/雷达）→ ADR-03。
- authoring 表面 + docs → ADR-05。
- 嵌套多环 donut（sector series 多层）、扇形 label 引线 → 后续。

---

## 实现契约（必填）🔻

> schema 字段名 / 默认值 AI 提案，待人工 review 冻结。

### Level

`red`（动 `ir/**` + `lower/**`）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/mark.ts` | 加 | `PlotMark.Sector` | `as const` 成员 `'sector'` | — | sector 判别串关键字 |
| `ir/mark.ts` | 加 | `SectorMarkSchema.type` | `z.literal(PlotMark.Sector)` | — | 判别字段：扇形（饼/环） |
| `ir/mark.ts` | 加 | `SectorMarkSchema.startField` | `z.string().min(1).optional()` | `'y0'` | 累积下界字段（配 transform startField） |
| `ir/mark.ts` | 加 | `SectorMarkSchema.endField` | `z.string().min(1).optional()` | `'y1'` | 累积上界字段（配 transform endField） |
| `ir/mark.ts` | 改 | `MarkSchema` | union 加 `SectorMarkSchema` | — | mark union 扩 sector |
| `ir/transform.ts` | 改 | `StackTransformSchema.x` | `→ .optional()` | — | 缺省 = 全行单链累积 |
| `ir/transform.ts` | 改 | `StackTransformSchema.groupBy` | `→ .optional()` | — | 缺省 = 按数据序累加 |

> 待决策点冻结可能微调：字段命名（y0/y1 vs startAngle/endAngle）、是否改用新 `cumulate` transform（则 transform 表换成新成员）。

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（改）
- `packages/plot/plot/src/ir/transform.ts`（改）
- `packages/plot/plot/src/lower/mark.ts`（改 —— interval polar 分支 + lowerSector）
- `packages/plot/plot/src/lower/transform.ts`（改 —— stack 单链累积）
- `packages/plot/plot/src/lower/expand.ts`（改 —— sector 角向 domain / interval 半径域）
- `packages/plot/plot/tests/lower/mark.test.ts`（新 / 改 —— sector 几何）
- `packages/plot/plot/tests/lower/transform.test.ts`（改 —— 单链累积）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（改 —— sector accept/reject）

### 测试象限

**Happy path**：

- `interval polar→sector`：单系列径向柱 → 每行 sector，角带按类别等分、outerRadius=radiusScale(value)。
- `sector mark 饼图`：stack 产 y0/y1 → sector 角界 = angleScale(y0/y1)，整圆铺满。
- `泛化 stack 单链`：`{kind:'stack', y:'value'}`（无 x/groupBy）→ 行序累积 y0/y1。
- `环图`：coordinate.innerRadius>0 → sector innerRadius=frame.innerRadius。

**边界**：

- `单类别 / 单扇片`：interval 单类别占整角带；sector 单行占整圆。
- `value=baseline`：径向柱高 0（outerRadius≈innerRadius，按待决策点 swap/skip）。
- `空数据`：无 sector，layer null。

**错误路径**：

- `sector mark 缺累积界字段`：读不到 y0/y1 → 抛清晰错误（与堆叠 interval 同）。
- `core sector 约束违反`（outerRadius≤innerRadius 且未 swap）：按冻结策略断言。

**交互**：

- `cartesian interval 回归`：既有矩形柱 / dodge / stack 测试全绿、产物不变。
- `dodge 径向`：band 内多系列 → 子角带切分。
- `sector × color`：扇片按 color 字段分色。

### 依赖的现有元素

- `lowerInterval` / `barStyle` / `colorGroupedScope`（`lower/mark.ts`）—— 扩展加 polar 分支。
- `applyTransforms` / stack（`lower/transform.ts`）—— 泛化单链累积。
- `CoordinateFrame`（ADR-01，`lower/project.ts`）—— 读 `center` / `innerRadius` / `outerRadius` / `angleScale.bandwidth` / `radiusScale.coordinate`。
- `PositionScale`（`lower/scale.ts`）—— band 角向 bandwidth、linear 角向累积投影。
- core `sector` shape（`packages/core/core/src/shapes/sector.ts`）—— 下沉目标，`shape:{type:'sector',params}`，仅消费。
