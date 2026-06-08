# ADR-02：一维坐标系族——cartesian1D（直线）+ polar1D（圆周）+ 1D 轴 guide

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 frame 角色泛化](./01-coordinate-frame-roles.md)（projectRoles + 必填角色校验 + 维度校验）· 复用：[alpha.4 polar 投影 / 角向 guide](../v0.1-alpha.4/01-coordinate-polar.md)

## 背景

[ADR-01](./01-coordinate-frame-roles.md) 把 frame 泛化成 N 通道角色后，**一维坐标系**（单一位置通道）成为第一批 1 通道消费者。一维坐标有**对称的两种**——空间载体是直线或圆周：

- **cartesian1D（直线）**：单一位置维落在一条轴线上，塌缩的第二屏幕维取固定基线。用例 **rug**（点化作轴上短刻记）/ **timeline**（事件沿线）/ **1D strip / dot plot**。
- **polar1D（圆周）**：单一角向位置维落在半径 r 的圆周上（角度编码值、半径固定）。用例**周期 / 循环数据**（24 小时钟面、星期轮、月份环——首尾相接的循环量）/ **环形 rug** / **极坐标点带**。

二者是降维的一对：`cartesian1D` = cartesian2D 去掉一维（直线），`polar1D` = polar2D 去掉 radius 通道、只留 angle（圆周）。同类库：ggplot2 `geom_rug`（直线 rug）；circular/周期可视化（R `circular`、time-of-day 时钟图）的角向 1D。共性是**只有一个位置维有数据意义**，差异只在「这条 1D 轴是直的还是弯成圆」。

**命名 = 空间几何、非 scale**（坐标系 scale-agnostic）：取名 `cartesian1D`（**非 `linear1D`**）——坐标系名描述空间（一维笛卡尔直线），与 cartesian2D / polar2D / polar1D 一致；其单轴与 cartesian2D 的轴一样**可配任意 scale**（log / sqrt / time / band），`log rug`、时间 `timeline` 都合法。`linear1D` 会错误暗示「仅线性 scale」，故弃用（plot-design §3.5 已同步改名）。

**polar1D 很便宜**：复用 [alpha.4](../v0.1-alpha.4/01-coordinate-polar.md) 的极坐标角向投影（`projectPolar` 在固定半径）+ 角向轴 guide，几何不从零造。把它和 cartesian1D 同 ADR 落（1D 坐标系族），因二者共享「单位置通道 + 1D guide」骨架，只在投影载体（直线 vs 圆）分叉。

一维坐标**不是 histogram**——histogram 是「1D 分箱（[alpha.11](../roadmap.md) transform）+ count 第二维」，本轮只出**一维空间底座**。

## 决策：`PlotCoordinate` 加 `cartesian1D`（单维 + 固定基线）与 `polar1D`（单角向 + 固定半径圆周），各配 1D 轴 guide；mark 矩阵以 point 为主

新增两个一维坐标系，frame 均 1 通道（`roles` 长度 1）：

- **cartesian1D**：角色 `x`（决策 ②，复用 x、不引新名）；`projectRoles([v])` → 水平 `[xScale(v), baseline]` / 垂直 `[baseline, yScale(v)]`；`orientation` 控轴向。1D 轴 = 沿基线直线轴（复用 cartesian 直线轴）。
- **polar1D**：角色 `angle`（复用 polar2D 的 x→angle 别名约定）；`projectRoles([v])` → `projectPolar(angleScale(v), R)`，R = 固定半径（可用半径的占比，默认 1=外圆）；`startAngle`/`endAngle` 控角向区间（默认整圆，可做半环 / 扇形弧带）。1D 轴 = 角向轴（刻度绕圆周，复用 alpha.4 angular axis）。

```ts
// ir/coordinate.ts —— PlotCoordinate 加两成员 + schema
// PlotCoordinate.Cartesian1D = 'cartesian1D'  /  PlotCoordinate.Polar1D = 'polar1D'
//
// Cartesian1DSchema: type / x? / orientation?（Cartesian1DOrientation：horizontal|vertical，默认 horizontal）
// Polar1DSchema:  type / angle? / radius?（圆周半径占可用半径比，0<r≤1，默认 1）/ startAngle?（默认 0）/ endAngle?（默认 360）
// CoordinateSchema union 追加二者
// 合法 guide dimension 集（ADR-01 契约）：cartesian1D = { x }；polar1D = { angle, x 别名 }
```

**mark 支持矩阵**（决策 ⑥）：本轮 **point** 为主——cartesian1D + point = 直线 rug 刻记、polar1D + point = 圆周上的点（环形 rug / 周期点）。`line`（沿轴 / 沿圆周连线）按需顺延；`interval` / `sector` / `area` 在一维 **fail-loud**（无对应一维几何）。

理由：

1. **1 通道双载体一次验收**：cartesian1D / polar1D 都是 ADR-01「N 通道角色」的 1 通道消费者，一次验证 projectRoles 在「单通道 + 直线 / 圆周」两种载体成立。
2. **polar1D 复用 alpha.4 不重造**：角向投影 + 角向轴现成，polar1D ≈「cartesian1D 把轴弯成圆」，同 ADR 共享 1D 骨架最省。
3. **复用 x/angle 角色零新概念**：cartesian1D 复用 x、polar1D 复用 angle（+x 别名），cartesian/polar spec 降维即得，无新角色名负担。
4. **支持矩阵 fail-loud**：interval/sector/area 在一维无几何意义，明确 fail-loud（ADR-01 验收口径②）。

## 待决策点 🔻

- **cartesian1D 塌缩维基线位置**：基线放中线、贴边、还是可配 `baseline`？倾向**默认贴一边**（水平→底边、垂直→左边，rug 沿轴边缘惯例），可配后续。
- **polar1D 半径语义**：`radius` 取「可用半径占比」（0<r≤1，默认 1 外圆）还是绝对 user units？倾向**占比**（与 polar2D innerRadius 同口径、随画布自适应）。圆周方向（顺/逆时针）默认顺 alpha.4 polar 约定。
- **周期量首尾相接**：polar1D 整圆时，分类 / 周期数据末值是否回到起点（如周日接周一）？倾向**整圆（endAngle−startAngle=360）时角向 scale 首尾不重叠均布**（band 退化点 scale 绕圆），与 alpha.4 polar 角向 band 一致。
- **rug 刻记几何**：point 在 1D 渲短刻记（垂直轴线 / 沿半径方向）还是小圆点？倾向**短刻记**（rug 惯例；cartesian1D 垂直基线、polar1D 沿半径方向），dot plot 圆点留后续。
- **line 是否本轮**：1D + line（沿轴 / 沿圆周折线）做不做？倾向**顺延**（point 覆盖主用例）。

## DSL 表面

```tsx
// 直线 rug（cartesian1D + point）
<Plot data={samples} coordinate="cartesian1D"><PointMark x="value" /></Plot>

// 环形 / 周期点（polar1D + point，24 小时绕圆）
<Plot data={events} coordinate="polar1D"><PointMark x="hourOfDay" /></Plot>
```

```ts
// vanilla / 原生 IR：半环 polar1D（仅上半圆）
{ coordinate: { type: 'polar1D', angle: 'hScale', radius: 1, startAngle: 180, endAngle: 360 },
  scales: [{ type: 'linear', name: 'hScale' }],
  marks: [{ type: 'point', encoding: { x: { field: 'hour' } } }],
  guides: [{ type: 'axis', dimension: 'angle' }] }
```

## 测试设计

`packages/plot/plot/tests/ir/coordinate.schema.test.ts`（扩）+ `tests/lower/coordinate-1d.test.ts`（新建）：cartesian1D 单维投影落轴线 + orientation；polar1D 角向投影落圆周 + radius/角向区间；1D 轴 / 角向轴 guide；point→刻记；interval/sector/area fail-loud；缺单维通道 fail-loud；非法维度 fail-loud。见「测试象限」。

## 影响

- **Plot IR**：`PlotCoordinate` 加 `Cartesian1D` / `Polar1D` + `Cartesian1DSchema` / `Polar1DSchema` + `Cartesian1DOrientation` 枚举，`CoordinateSchema` union 扩；纯增量。
- **lowering**：`lower/project.ts` 加 cartesian1D frame（roles=[x]、直线 + 基线）+ polar1D frame（roles=[angle]、固定半径圆周，复用 `createPolarFrame` / `projectPolar`）；`lower/layout.ts` 加 1D 占位（直线单轴留白 / 圆周圆心+半径）；`lower/guide.ts` 1D 直线轴 + 角向 1D 轴（复用 alpha.4）；`lower/{expand,mark}.ts` 接入 + mark 矩阵 fail-loud。
- **core**：无新依赖（刻记 / 圆周点下沉 core Node/Path）。
- **文档站**：坐标系页加 cartesian1D（rug/timeline）+ polar1D（环形/周期）demo（ADR-04）。
- **对外 API**：`coordinate="cartesian1D"|"polar1D"`（react/vanilla，ADR-04）；纯新增。

## 不在本 ADR 范围

- **histogram / 分箱** → alpha.11（一维只出空间底座）。
- **1D + line / area / interval / sector** → fail-loud（point 为主）；line 需求驱动。
- **dot plot 堆叠 / beeswarm / 环形堆叠** → 顺延。
- **ternary2D** → [ADR-03](./03-ternary2d.md)。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/coordinate.ts`（IR 契约）+ `lower/**`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/coordinate.ts` | 加 | `PlotCoordinate.Cartesian1D` | `'cartesian1D'` | — | 一维直线坐标系判别串 |
| `ir/coordinate.ts` | 加 | `PlotCoordinate.Polar1D` | `'polar1D'` | — | 一维圆周（角向）坐标系判别串 |
| `ir/coordinate.ts` | 加 | `Cartesian1DOrientation` | `as const 对象` | — | 轴向词表 horizontal / vertical |
| `ir/coordinate.ts` | 加 | `Cartesian1DSchema` | `z.object` | — | type / x? / orientation? |
| `ir/coordinate.ts` | 加 | `Cartesian1DSchema.orientation` | `z.nativeEnum(Cartesian1DOrientation)` | `'horizontal'`（lowering 给） | 轴向 |
| `ir/coordinate.ts` | 加 | `Polar1DSchema` | `z.object` | — | type / angle? / radius? / startAngle? / endAngle? |
| `ir/coordinate.ts` | 加 | `Polar1DSchema.radius` | `z.number().finite().gt(0).max(1)` | `1`（lowering 给） | 圆周半径占可用半径比 |
| `ir/coordinate.ts` | 加 | `Polar1DSchema.startAngle` / `endAngle` | `z.number().finite()` | `0` / `360`（lowering 给） | 角向区间（度） |
| `ir/coordinate.ts` | 改 | `CoordinateSchema` | `z.discriminatedUnion` | — | union 追加 Cartesian1D / Polar1D |
| `ir/coordinate.ts` | 加 | `Cartesian1DCoordinate` / `Polar1DCoordinate` | `z.infer` | — | 派生类型 |

### 文件 scope

- `packages/plot/plot/src/ir/coordinate.ts`（改）
- `packages/plot/plot/src/lower/project.ts`（改：cartesian1D + polar1D frame，polar1D 复用 createPolarFrame/projectPolar）
- `packages/plot/plot/src/lower/layout.ts`（改：1D 直线占位 + 圆周占位）
- `packages/plot/plot/src/lower/guide.ts`（改：1D 直线轴 + 角向 1D 轴）
- `packages/plot/plot/src/lower/{expand,mark}.ts`（改：两 1D 坐标系接入 + mark 矩阵 fail-loud）
- `packages/plot/plot/tests/ir/coordinate.schema.test.ts`（改）
- `packages/plot/plot/tests/lower/coordinate-1d.test.ts`（新建）

### 测试象限

**Happy path**：
- `cartesian1D point rug`：point + x → 各点落轴线、短刻记
- `polar1D point 圆周`：point + angle（x 别名）→ 各点落半径 R 圆周（[cx+R·cosθ, cy+R·sinθ]）
- `orientation / 半环`：cartesian1D vertical 沿 y；polar1D startAngle/endAngle 半环

**边界**：
- `polar1D 整圆周期`：整圆时角向均布、首尾不重叠
- `polar1D radius 占比`：radius=0.5 → 点落半径一半的圈
- `单数据点`：1 行 → 1 刻记 / 1 圆周点不崩

**错误路径**：
- `cartesian1D interval fail-loud`：cartesian1D + bar → 抛
- `polar1D sector fail-loud`：polar1D + sector → 抛
- `缺单维通道 fail-loud`：1D 无位置通道 → 抛（ADR-01 必填校验）
- `非法维度 fail-loud`：cartesian1D + `dimension:'angle'` / polar1D + `dimension:'y'` → 抛（合法集 cartesian1D={x}、polar1D={angle,x}）

**交互**：
- `1D × projectRoles`：消费 ADR-01 roles 长度 1 投影（cartesian1D=[x]、polar1D=[angle]，跨 ADR 锚点）
- `polar1D 复用 alpha.4`：polar1D 投影点 = polar2D 在固定 radius 的投影（复用 projectPolar 锚点）
- `1D × color`：rug / 圆周点 + categorical color → 按类着色（非位置通道仍工作）

### 依赖的现有元素

- `PlotCoordinate` / `CoordinateSchema`（`ir/coordinate.ts`）—— 扩展
- frame `roles` / `projectRoles`（[ADR-01](./01-coordinate-frame-roles.md) `lower/project.ts`）—— 消费（roles 长度 1）
- 必填角色 / 维度集校验（[ADR-01](./01-coordinate-frame-roles.md) `lower/expand.ts`）—— 消费
- `createPolarFrame` / `projectPolar` / 角向 axis guide（[alpha.4](../v0.1-alpha.4/01-coordinate-polar.md) `lower/project.ts` / `lower/guide.ts`）—— 复用（polar1D 固定半径投影 + 角向轴）
- cartesian 直线轴 guide（`lower/guide.ts`）—— 复用（cartesian1D 直线轴）
- `computePlotArea`（`lower/layout.ts`）—— 扩展（1D 直线 / 圆周占位）
