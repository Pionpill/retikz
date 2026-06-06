# ADR-04：polar guide（angular / radial axis + 同心环 / 辐条 grid）

> 在 ADR-01 的 `CoordinateFrame` 之上落极坐标 guide：angular axis（刻度绕圆周）、radial axis（刻度沿辐条）、polar grid（同心环 + 角向辐条）。**只做 guide 几何、消费 ADR-01 的 frame，不定 layout。** 下沉 core `Path`（弧 / 直段）+ `Node`（标签）。
> schema 改动极小（仅 GuideDimension 加成员）；字段名 AI 提案，待人工 review。

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [ADR-01](./01-coordinate-polar.md) · [plot-design.md §3.9 guide / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

alpha.2 的 guide 把 axis / grid 下沉成**直线段**：x 轴底部横线 + 竖刻度、y 轴左侧竖线 + 横刻度、grid 跨绘图区直线。这套几何在 polar 完全不适用：

- **angular axis**（角向轴）：刻度沿**圆周**分布（每个角度刻度一个标签绕圈摆），轴线是外圆 / 弧。
- **radial axis**（径向轴）：刻度沿**一条辐条**（从圆心向外）分布，轴线是一条半径线。
- **polar grid**：径向刻度 → **同心圆环**；角向刻度 → **角向辐条**（圆心到外圆的射线）。

alpha.2 已为此预留：`GuideDimension` 的 describe 明说「其它坐标系按自身定位维度扩展成员（如 polar 的 radius / angle）」。本 ADR 兑现：guide 维度按坐标系角色解释（沿用 ADR-01 的 hybrid——polar 下 x→angular、y→radial，亦可显式 angle/radius），lowering 按 `frame.type` 产两套几何。

guide 最终同样 lowering 成 core `Node` / `Path`（§3.9）——同心环 / 弧用 core `Path` 的 `arc` step，辐条 / 半径轴用直段，标签用 `Node` text。

## 决策：guide 维度按角色解释；lowerGuide 按 frame.type 分支产 polar 几何；layout 留白由 ADR-01 frame 提供

### 1. guide 维度角色化（极小 IR 改动）

`GuideDimension` 加 `Angle` / `Radius` 成员（非破坏，describe 已预告）。维度→坐标系角色：polar 下 `x` 或 `angle` → angular 轴、`y` 或 `radius` → radial 轴（与 ADR-01 通道 hybrid 一致：默认复用 x/y、可显式 angle/radius）。

### 2. lowerGuide 按 frame.type 产几何

`lower/guide.ts` 的 `lowerGuide` 按 `frame.type` 分支；cartesian 走 alpha.2 既有直线几何（不变），polar 走——

```
angular axis（angle 维）:
  轴线  = 外圆弧（Path arc，半径 frame.outerRadius，startAngle→endAngle）
  刻度  = 每个 angle tick：圆周点向外短刻度线（Path 直段）
  标签  = 每个 tick：圆周外侧 Node text（位置 = center + (outerRadius+gap)·(cosθ,sinθ)）
  grid（angle tick）= 圆心→外圆的辐条（Path 直段，每 tick 一条）

radial axis（radius 维）:
  轴线  = 一条辐条（center → 外圆，沿基准角，默认 startAngle）
  刻度  = 每个 radius tick：辐条上短横刻度
  标签  = 每个 tick：辐条旁 Node text（位置 = 投影点偏移）
  grid（radius tick）= 同心圆环（Path arc 整圈 / [startAngle,endAngle]，每 tick 一个半径）
```

刻度值 / 标签复用 ADR-01 frame 的 `PositionScale.ticks`（角向 band → 每类别一刻度落角带中心；径向 linear → scaleTicks）。z-order 沿用 alpha.2：grid 垫底、mark、axis 压顶。

### 3. layout 完全归 ADR-01（本 ADR 零触碰 layout）

极坐标的圆心 / outerRadius / 角向标签外圈留白**全部由 ADR-01 的 `computePolarFrame` 算定**（roadmap P1-1：frame 单点拥有）。本 ADR **完全不碰 `lower/layout.ts`**，只读 frame 给定的 `center` / `outerRadius` / `innerRadius` 画 guide——杜绝执行顺序上 04 反向修改 01 的 layout（评审 P1）。角向标签所需的尺寸常量（字号 / gap）与估算逻辑一并落在 ADR-01 的 `computePolarFrame` 里；ADR-04 的标签只按 frame 已留白的 outerRadius 外侧定位，不参与留白计算。

理由：

1. **guide 几何 = f(guide, coordinate)**：与 mark 同理，guide 不写死直线，按 frame.type 产直线 / 弧；加坐标系不改 guide 主体。
2. **维度角色化复用 hybrid**：guide 维度与位置通道同一套 x/y↔angle/radius 角色映射，认知一致、IR 改动最小（仅加枚举成员）。
3. **frame 单点拥有杜绝伪并行**：guide 不自算圆心 / 半径，全取 ADR-01 frame——04 与 02/03 真并行（评审 P1-1）。
4. **复用 core Path arc**：同心环 / 弧轴用 core 既有 `arc` step，不在 plot 造曲线机制。

## 待决策点 🔻（已冻结 2026-06-06，按人工 ack）

- **radial axis 基准角 → 默认 `startAngle`**（辐条画在角向起始角），不做可配 `at`（留后续）。
- **angular axis 轴线形态 → 外圆弧**（[startAngle,endAngle] 弧）。
- **角向标签防重叠 → 全摆**（不抽稀 / 不旋转，防重叠留后续）。
- **grid → 跟随各自维度 axis 的 `grid` 布尔**：radius axis `grid:true` → 同心环、angle axis `grid:true` → 角向辐条；沿用 alpha.2 `grid` 子属性。
- **维度命名 → angle/radius 与 x/y 都接受**（hybrid，polar 下 x→angular、y→radial），文档以 angle/radius 为主示例。
- **角向标签留白**：归 ADR-01 `computePolarFrame`（评审 P1）；若 ADR-01 未实际预留致标签溢出，实现期最小补进 `computePolarFrame`（ADR-01 scope）并记录，不在 guide 里回写 layout。

## DSL 表面

> core-internal（authoring → ADR-05）；primitive PlotSpec：

```ts
// 极坐标折线 + 角向轴(类别绕圈) + 径向轴(值，带同心环网格)
const polarWithAxes: PlotSpec = {
  namespace:'plot', type:'plot', data:{ reference:'series' },
  coordinate:{ type:'polar2D', angle:'a', radius:'r' },
  scales:[{ name:'a', type:'point' }, { name:'r', type:'linear' }],
  marks:[{ type:'line', closed:true, encoding:{ x:{ field:'dim' }, y:{ field:'value' } } }],
  guides:[
    { type:'axis', dimension:'angle' },                 // 类别绕圆周
    { type:'axis', dimension:'radius', grid:true },     // 值刻度沿辐条 + 同心环网格
  ],
};
```

## 测试设计

angular axis 圆周刻度 / 标签位置、radial axis 辐条刻度、同心环 grid（arc）、角向辐条 grid、band 角向刻度落角带中心、cartesian guide 回归不变。具体见实现契约。

## 影响

- **lower/guide.ts**：`lowerGuide` 加 polar 分支（弧轴 / 辐条 / 同心环 / 角向辐条）；`GuideContext` 收 `CoordinateFrame`（替代 projectX/projectY/plotArea 的 cartesian 专用形态）。
- **lower/expand.ts**：`assertUniqueAxisDimension` 容纳 angle/radius；guideContext 传 frame。
- **lower/layout.ts**：**本 ADR 不碰**（polar 角向标签留白估算归 ADR-01 的 `computePolarFrame`，评审 P1）。
- **ir/guide.ts**：`GuideDimension` 加 `Angle` / `Radius`（非破坏）。
- **core**：消费 `Path` `arc` step + `Node` text，不改 core。
- 文档：随 ADR-05。

## 不在本 ADR 范围

- mark 几何（sector / 连续）→ ADR-02 / 03；frame / layout 决策 → ADR-01。
- authoring 表面 + docs → ADR-05。
- legend（与 color scale 配套）、轴标题、刻度旋转 / 抽稀防重叠 → 后续。

---

## 实现契约（必填）🔻

> schema 字段名 AI 提案，待人工 review 冻结。

### Level

`red`（动 `lower/**` —— guide lowering 下沉契约；`ir/guide.ts` 加枚举成员）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/guide.ts` | 加 | `GuideDimension.Angle` | `as const` 成员 `'angle'` | — | polar 角向定位维度 |
| `ir/guide.ts` | 加 | `GuideDimension.Radius` | `as const` 成员 `'radius'` | — | polar 径向定位维度 |

> `dimension` 字段类型已是 `z.nativeEnum(GuideDimension)`，加成员即自动接受 angle/radius（非破坏）。无其它字段改动。

### 文件 scope

- `packages/plot/plot/src/ir/guide.ts`（改 —— GuideDimension 加成员）
- `packages/plot/plot/src/lower/guide.ts`（改 —— polar 分支几何 + GuideContext 收 frame）
- `packages/plot/plot/src/lower/expand.ts`（改 —— guideContext 传 frame、维度容纳）
- `packages/plot/plot/tests/lower/guide.test.ts`（改 —— polar axis / grid 几何）
- `packages/plot/plot/tests/ir/guide.schema.test.ts`（改 —— angle/radius dimension accept）

### 测试象限

**Happy path**：

- `angular axis 刻度`：point 角向 scale → 每类别刻度落圆周角带中心、标签在圆外。
- `radial axis 刻度`：linear 径向 → 辐条上刻度，值→半径正确。
- `同心环 grid`：radius axis grid:true → 每 radius tick 一个 arc 整圈。
- `角向辐条 grid`：angle axis grid:true → 每 angle tick 一条圆心→外圆射线。

**边界**：

- `半圆（startAngle/endAngle 非整圆）`：弧轴 / 同心环只画 [startAngle,endAngle]。
- `单刻度`：单环 / 单辐条。
- `tickLabels:false`：无标签、仍出轴线刻度。

**错误路径**：

- `重复同维度 axis`：`assertUniqueAxisDimension` 抛错（含 angle/radius）。
- `polar 下 dimension 引用的角色无 scale`：抛清晰错误。

**交互**：

- `cartesian guide 回归`：既有直线轴 / grid 测试全绿、产物不变。
- `polar axis × mark`：guide 刻度投影与 mark 用同一 frame（严格对齐）。
- `grid 垫底 + axis 压顶`：z-order 同 alpha.2。

### 依赖的现有元素

- `lowerGuide` / `GuideContext` / `segmentsToPath`（`lower/guide.ts`）—— 扩展 polar 分支、改吃 frame。
- `CoordinateFrame`（ADR-01）—— 读 `center` / `outerRadius` / `innerRadius` / `startAngle` / `endAngle` / `PositionScale.ticks` / `project`。
- `GuideDimension` / `AxisGuideSchema`（`ir/guide.ts`）—— 加成员、维度复用。
- `estimateLabelWidth`（`lower/layout.ts`）—— 仅**读取**用于标签定位估宽，不改 layout（polar 留白归 ADR-01）。
- core `Path`（`arc` step）+ `Node`（text）—— 下沉目标，仅消费。
