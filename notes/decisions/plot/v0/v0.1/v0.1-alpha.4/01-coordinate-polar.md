# ADR-01：coordinate 抽象通用化 + polar2D 投影

> 本 milestone 的唯一真叶子：把 alpha.1~alpha.3 写死的 cartesian 投影抽象成「坐标系可插拔的中间层」，并补 polar2D 投影几何 + 完整 `ResolvedCoordinateFrame` 契约（供 ADR-02/03/04 共用）。
> 实现契约段的 schema 字段名 / 默认值为 **AI 提案、待人工 review 拍板**（develop-design：人工是设计阶段最终决策者）。

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 coordinate / §3.6 encoding / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

alpha.1~alpha.3 打通了 cartesian2D 的纵向闭环，但**坐标系是写死的**：`coordinate` IR 的 union 只有一个成员（`Cartesian2DSchema`），lowering 的投影 / range / layout / guide 几何全部假设笛卡尔——

- `lower/project.ts` 的 `Projector` 暴露 `xScale` / `yScale`，`createCartesianProjector` 直接 `[xScale.coordinate(x), yScale.coordinate(y)]`；
- `lower/expand.ts` 写死 `axisValues('x'/'y')`、fallback range `[0,width]` / `[height,0]`、`createCartesianProjector`；
- `lower/layout.ts` 的 `computePlotArea` 按矩形 margin 缩进；
- `lower/mark.ts` / `lower/guide.ts` 直接读 `project.xScale` / `project.yScale` 算矩形柱 / 直线轴。

polar2D 落地必须先把这些写死处抽象出来。grammar of graphics 的核心洞见（plot-design §8.3）正是：**scale**（值→归一化，坐标系无关）→ **coordinate**（归一化→2D 点，cartesian vs polar 差在此）→ **mark**（投影点 + 区间/带概念→几何）三层分离，加坐标系 O(1)、mark 自动适配。ggplot 的 `coord_*`、Observable Plot 的 projection 都按此组织；Vega 反例是把每坐标系几何塞进分立 mark（`rect` / `arc`），加坐标系 O(N_marks)。

retikz 已在 §8.3 拍定走 **(i) 投影整形**（mark 坐标系无关、coordinate 做投影整形）。本 ADR 是 (i) 的地基：把 cartesian 投影重构成可替换的 `CoordinateFrame`，补 polar 投影，并定义 02/03/04 共用的帧契约——若 polar 接入要大改 mark 内部，即证明抽象没切干净。

本 ADR 的可见产出是**极坐标散点**（point mark 经重投影自动适配 polar），验证 frame + 投影打通；interval→sector（ADR-02）、line/area（ADR-03）、polar guide（ADR-04）在帧契约之上各自落地。

## 决策：位置通道按坐标系角色解析（hybrid）+ 一次性解析出 `CoordinateFrame`，polar 投影复用 PositionScale 机制

三块组成：

### 1. 位置通道：hybrid（默认复用 x/y + 可选显式 angle/radius）

位置通道按坐标系「角色」解析：`x` / `y` 是通用别名，角色名通道（`angle` / `radius`）是可选显式覆盖。coordinate 声明它的两个位置角色 + 各角色绑定的 scale 名。

- `cartesian2D` 角色 = (horizontal, vertical)，绑定 `x` / `y` scale；
- `polar2D` 角色 = (angle, radius)，绑定 `angle` / `radius` scale；约定 **x→angle, y→radius**（对齐 ggplot `coord_polar` 默认：自变量轴绕圈、值轴往外）。

解析规则：`primary(angle) ← encoding.angle ?? encoding.x`、`secondary(radius) ← encoding.radius ?? encoding.y`。**默认复用 x/y**：一份 cartesian 折线 / 散点 spec 只改 `coordinate` 就渲成极坐标版（零改 encoding，正中 §8.3 (i)）；**需要可读性**时显式写 `angle` / `radius`（饼图作者按角度思考）。scale 绑定仍挂 coordinate（与 cartesian `coordinate.x/y` 命名 scale 一致），encoding 只给字段 / 常量。

### 2. polar2D 投影复用 PositionScale，无需新机制

关键简化：**polar 不引入新 scale 机制**。角向 scale 的 range 设成 `[startAngle, endAngle]`（度），径向 scale 的 range 设成 `[frame.innerRadius, outerRadius]`（user units；`frame.innerRadius = ir.innerRadius × outerRadius`，IR 存比例、frame 转单位，见下「innerRadius 语义」），都是现成的 `PositionScale`（`coordinate` / `bandwidth` / `ticks` / `setRange` 全可用）。投影只在最后加一步极坐标→笛卡尔：

```
project(angleValue, radiusValue):
  θ = angleScale.coordinate(angleValue)   // 度（band→band 中心、linear→线性映射）
  r = radiusScale.coordinate(radiusValue)
  if !finite(θ) || !finite(r): return null
  return [cx + r·cos(θ°), cy + r·sin(θ°)]   // 屏幕 y 向下，与 core polar 约定一致（0°=+x, 90°=+y）
```

band 当角向 scale → `bandwidth` 即角度宽（玫瑰 / 雷达轴的角向带）；linear 当角向 scale → 连续角度（饼图累积角的投影，累积值本身由 ADR-02 的 transform 派生）。

### 3. `CoordinateFrame`：lowering 一次性解析、02/03/04 共用

lowering 把坐标系解析成一个 `CoordinateFrame`（含两条 `PositionScale` + 投影函数 + 坐标系专属帧信息），**ADR-01 独占其定义与完整性**，02/03/04 只消费、不重算：

```ts
/** 解析后的坐标帧：lowering 算一次，mark / guide 共用同一帧（不各造临时投影框架） */
export type CoordinateFrame = CartesianFrame | PolarFrame;

export type CartesianFrame = {
  type: 'cartesian2D';
  plotArea: Rect;                 // 绘图区矩形（= guide frame）
  primary: PositionScale;         // x（水平）
  secondary: PositionScale;       // y（垂直）
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
};

export type PolarFrame = {
  type: 'polar2D';
  center: [number, number];       // 圆心（屏幕坐标）
  innerRadius: number;            // user units（环图内半径，0 = 实心）
  outerRadius: number;            // user units（可用外半径）
  startAngle: number;             // 度（角向 range 起）
  endAngle: number;               // 度（角向 range 止）
  primary: PositionScale;         // angle（range = [startAngle, endAngle] 度）
  secondary: PositionScale;       // radius（range = [innerRadius, outerRadius]）
  project: (angleValue: unknown, radiusValue: unknown) => [number, number] | null;
};
```

mark / guide 取点统一走 `frame.project(primaryValue, secondaryValue)`（坐标系无关）；需要区间 / 带 / 几何整形的 mark（ADR-02 的 sector、ADR-03 的连续路径、ADR-04 的 guide）按 `frame.type` 分支读 `center` / `outerRadius` / `bandwidth` 等帧信息——**这才是「mark 几何 = f(mark, coordinate)」的落点**，但帧本身只在 ADR-01 算一次。

polar2D 的 schema 草案（详见实现契约 § Schema 改动）：

```ts
// ir/coordinate.ts —— describe 一律英文
export const Polar2DSchema = z.object({
  type: z.literal(PlotCoordinate.Polar2D),
  angle: z.string().min(1),    // scale name driving the angle role
  radius: z.string().min(1),   // scale name driving the radius role
  startAngle: z.number().default(0),    // degrees; 0 = +x, sweeps toward +y (screen y-down), matching core polar
  endAngle: z.number().default(360),    // degrees; full circle by default
  innerRadius: z.number().min(0).lt(1).default(0),  // donut hole as a fraction of outer radius; 0 = solid
});
// CoordinateSchema = z.discriminatedUnion('type', [Cartesian2DSchema, Polar2DSchema])

// ir/encoding.ts —— 加两个可选角色通道
//   angle: ChannelSchema.optional()   // explicit angle channel (polar); falls back to x when omitted
//   radius: ChannelSchema.optional()  // explicit radius channel (polar); falls back to y when omitted
```

理由：

1. **(i) 投影整形的地基**：把投影做成可替换中间层，mark 取点坐标系无关，加坐标系 O(1)——这是 retikz 选 (i) 而非 Vega 式分立 mark 的全部价值，地基没切干净后面全废。
2. **polar 零新机制**：角 / 径复用 `PositionScale`（range = 角度区间 / 半径区间），band/linear/time 全自动适配，投影只多一步三角变换；不引入平行的 scale / tick / range 体系，IR 与 lowering 复杂度可控。
3. **hybrid 通道最贴 AI 与跨坐标系复用**：x/y 是 LLM 训练亲和的默认（cartesian spec 改 coordinate 即跨系），angle/radius 是显式可读覆盖；两者等价、裸字面量优先（§AI 友好性）。
4. **帧契约单点拥有**：02/03/04 共用同一 `CoordinateFrame`，杜绝各造临时投影框架的伪并行（评审 P1-1）。

## 待决策点 🔻（已冻结 2026-06-06，按人工 ack）

下列均已拍板，进实现按此执行，不再悬置：

- **x 与 angle 同时设的优先级 → 角色名通道优先 + 忽略别名**（dev 模式可 warn）：宽容、不打断生成。
- **cartesian2D 下出现 angle/radius 通道 → reject**（lowering 抛清晰错误）：catch 误用（angle 在笛卡尔无意义，多半写错坐标系）。
- **theta 翻转 / 方向 → 不做**：写死 x→angle、沿用 core `0°=+x` 约定；翻转 / 换向留后续非破坏放宽。
- **默认朝向 → `startAngle` 默认 0**（+x / 3 点钟）：与 core sector 约定一致、少惊喜；「起始 12 点钟」靠用户设 `startAngle: -90` 或后续 sugar。
- **innerRadius 语义 → IR 存 fraction `[0,1)`、frame 转 user units**（`frame.innerRadius = ir.innerRadius × outerRadius`），径向 scale range = `[frame.innerRadius, outerRadius]`，schema `z.number().min(0).lt(1)`。
- **`CoordinateFrame` 命名 → `primary` / `secondary` 统一角色**（mark 少分支）；方法签名（`projectRow` helper、polar 下 `bandwidth` 暴露形态）实现期定，不改字段语义。
- **partial-arc 紧包围盒 → out of scope**：ADR-01 用整圆 bbox 定 center / outerRadius，紧包围留后续。

## DSL 表面

> 本 milestone 01~04 是 `@retikz/plot` 核心内部能力，**不出 react/vanilla DSL**（authoring 表面集中 ADR-05，见 roadmap P2-1）。故此处给 **primitive PlotSpec**（用户 / LLM 写的 IR，喂 `lowerPlots`）：

```ts
// 极坐标散点：encoding 完全复用 x/y，只改 coordinate（零改 encoding，正中 (i)）
const polarScatter: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'points' },
  coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },   // startAngle/endAngle/innerRadius 取默认
  scales: [
    { name: 'a', type: 'linear' },   // 角向（range 由 frame 设成 [0,360]）
    { name: 'r', type: 'linear' },   // 径向（range 由 frame 设成 [0, outerRadius]）
  ],
  marks: [{ type: 'point', encoding: { x: { field: 'theta' }, y: { field: 'value' } } }],
};

// 等价的显式角色写法（可读性优先时）：
//   marks: [{ type: 'point', encoding: { angle: { field: 'theta' }, radius: { field: 'value' } } }]
```

`@retikz/plot-react` / `@retikz/plot-vanilla` 的 `coordinate="polar"` 表面 → **ADR-05**（见「不在本 ADR 范围」）。

## 测试设计

`packages/plot/plot/tests/` 覆盖：schema 接受 / 拒绝（polar2D 字段 + 默认值、angle/radius 通道）、通道角色解析（x 复用 / 显式覆盖 / 笛卡尔下 reject）、polar 投影几何（已知角半径 → 屏幕点）、point mark 极坐标端到端、cartesian 行为回归不变。具体象限见实现契约。

## 影响

- **lower/project.ts**：`Projector` 重构为 `CoordinateFrame`（cartesian 分支行为完全等价，新增 polar 分支）；`createCartesianProjector` → `resolveCoordinateFrame(coordinate, ...)`。
- **lower/expand.ts**：`axisValues('x'/'y')` 泛化为按坐标系角色收值；range / 投影器创建经 frame 解析；cartesian 路径产物 byte 级不变。
- **lower/layout.ts**：新增 polar layout（`computePolarFrame`：圆心 + outerRadius，整圆 bbox），**含角向标签留白估算**（outerRadius 预留外圈标签带）——layout 全归 ADR-01，ADR-04 只消费 frame、不回写 layout（评审 P1：杜绝 04 反向改 01）；cartesian `computePlotArea` 不动。
- **lower/mark.ts**：`point` 改用 `frame.project`（坐标系无关）；`interval` / `line` 暂保持 cartesian-only（polar 几何在 02/03），但取点路径不得写死笛卡尔假设。
- **IR**：`coordinate.ts` union 加 `polar2D`；`encoding.ts` 加 `angle` / `radius` 可选通道。无 breaking——cartesian spec 与既有 IR 完全兼容（新字段全可选 / 新 union 成员）。
- **core**：仅消费（point→circle），不依赖 core 新能力，不碰 core 内部。sector/arc 在 ADR-02 才用。
- **文档站**：本 ADR 不出用户文档（core-internal）；polar 文档随 ADR-05。

## 不在本 ADR 范围

- **interval→sector / sector mark（pie/donut）几何** → ADR-02（含累积角 transform）。
- **line / area polar 投影（弯弧）+ area mark + `closed`（雷达）** → ADR-03。
- **polar guide（angular/radial axis + 同心环/辐条 grid）** → ADR-04；本 ADR 只产 frame，不画轴网格。
- **`@retikz/plot-react` / `@retikz/plot-vanilla` 的 polar authoring 表面 + docs demo** → ADR-05（roadmap P2-1：01~04 core-internal）。
- **theta 翻转 / direction / 起始 12 点钟 / partial-arc 紧 bbox** → 见待决策点，倾向留后续非破坏放宽。
- **ternary / linear1D 坐标系** → 后续 milestone。

---

## 实现契约（必填）🔻

> schema 字段名 / 默认值为 AI 提案，**待人工 review 拍板**后冻结；冻结后下游 implement / test 不得改，需改回本 ADR 加条。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（coordinate / encoding schema）+ `packages/plot/plot/src/lower/**`（frame 契约——下沉到 core IR 的投影边界）。跨级取最高 → **red**。与「文件 scope」段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/coordinate.ts` | 加 | `PlotCoordinate.Polar2D` | `as const` 成员 `'polar2D'` | — | polar2D 判别串关键字（暴露给用户） |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.type` | `z.literal(PlotCoordinate.Polar2D)` | — | 判别字段：2D 极坐标 |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.angle` | `z.string().min(1)` | — | 驱动 angle 角色的 scale 名 |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.radius` | `z.string().min(1)` | — | 驱动 radius 角色的 scale 名 |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.startAngle` | `z.number().finite()` | `0` | 角向起始角（度，0°=+x） |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.endAngle` | `z.number().finite()` | `360` | 角向终止角（度，缺省整圆） |
| `ir/coordinate.ts` | 加 | `Polar2DSchema.innerRadius` | `z.number().finite().min(0).lt(1)` | `0` | 环图内半径（占外半径比例，0=实心） |
| `ir/coordinate.ts` | 改 | `CoordinateSchema` | union 加 `Polar2DSchema` | — | 坐标系 union 扩成 cartesian2D \| polar2D |
| `ir/encoding.ts` | 加 | `EncodingSchema.angle` | `ChannelSchema.optional()` | — | angle 位置通道（polar）；缺省回退 x |
| `ir/encoding.ts` | 加 | `EncodingSchema.radius` | `ChannelSchema.optional()` | — | radius 位置通道（polar）；缺省回退 y |

> 待决策点冻结后可能微调：`innerRadius` 若改 user units 则去掉 `.lt(1)`；笛卡尔下 angle/radius 若选 reject 则在 lowering 加守卫（非 schema 字段改动）。

### 文件 scope

- `packages/plot/plot/src/ir/coordinate.ts`（改）
- `packages/plot/plot/src/ir/encoding.ts`（改）
- `packages/plot/plot/src/lower/project.ts`（改 —— `CoordinateFrame` 契约 + cartesian 重构 + polar 投影）
- `packages/plot/plot/src/lower/expand.ts`（改 —— 角色化收值 / range / frame 解析）
- `packages/plot/plot/src/lower/layout.ts`（改 —— polar layout：圆心 + outerRadius）
- `packages/plot/plot/src/lower/scale.ts`（改 —— 视需要为 angle/radius 角色设 range；PositionScale 本体已通用）
- `packages/plot/plot/src/lower/mark.ts`（改 —— point 走 frame.project，坐标系无关）
- `packages/plot/plot/src/lower/index.ts`（视需要 re-export `CoordinateFrame`）
- `packages/plot/plot/tests/lower/project.test.ts`（新 —— frame 解析 + polar 投影几何）
- `packages/plot/plot/tests/lower/polar.test.ts`（新 —— polar point 端到端）
- `packages/plot/plot/tests/ir/coordinate.schema.test.ts`（改 —— polar2D accept/reject + 默认值）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（改 —— angle/radius 通道）

偏离白名单 → 加条或新开 ADR。

### 测试象限

> 沿用 plot alpha milestone 放宽：按复杂度适量、覆盖真实有意义的 accept/reject 与几何断言，不硬凑 9（见 roadmap「测试 case 规则」）。下列按四象限组织：

**Happy path**：

- `polar2D schema 最小接受`：`{ type:'polar2D', angle:'a', radius:'r' }` → 通过，startAngle=0 / endAngle=360 / innerRadius=0 默认填入。
- `角色解析复用 x/y`：polar + encoding 只给 x/y → angle←x、radius←y，投影正确。
- `polar 投影几何`：angle 0°、radius=domain max（→outerRadius）→ `[cx + outerRadius, cy]`（屏幕 y 向下）。
- `point mark 端到端`：polar + 多行 point → 每行 circle Node 落在对应极坐标点。

**边界**：

- `整圆 vs 半圆`：endAngle=360 vs endAngle=180 → 投影角度 range 随之缩放。
- `innerRadius>0`：radius domain min → innerRadius（而非圆心），max → outerRadius。
- `band 角向 scale`：角向用 band scale → 类别绕圆周等分、`bandwidth` = 角度宽。
- `空数据 / 非有限值`：投影 null 跳过（守 alpha.1 语义）。

**错误路径**：

- `polar2D 缺 angle/radius`：schema reject。
- `coordinate.angle 引用未定义 scale`：lowering 抛清晰错误。
- `ordinal scale 作角向位置通道`：`resolvePositionScale` 抛错（复用既有守卫）。
- `笛卡尔下出现 angle/radius 通道`：按待决策点冻结结果断言（reject 抛错 / 或忽略——二选一落定后测对应行为）。

**交互**：

- `cartesian 回归`：既有 cartesian 测试经新 frame 全绿、产物等价（frame 重构零行为改变）。
- `polar × color 编码`：polar point + color 字段 → 分色子 Scope 不受坐标系影响。

### 依赖的现有元素

- `PositionScale` / `resolvePositionScale`（`lower/scale.ts`）—— 复用：angle/radius 角色各建一个 PositionScale，range 设成角度 / 半径区间；ordinal 守卫沿用。
- `Projector` / `createCartesianProjector`（`lower/project.ts`）—— 重构进 `CoordinateFrame`（cartesian 行为等价）。
- `channelValue` / `resolveFieldPath`（`lower/field.ts`）—— 复用取值。
- `computePlotArea` / `Rect`（`lower/layout.ts`）—— cartesian 沿用；polar 新增 `computePolarFrame`（圆心 + outerRadius）。
- `Cartesian2DSchema` / `CoordinateSchema`（`ir/coordinate.ts`）、`EncodingSchema` / `ChannelSchema`（`ir/encoding.ts`）—— 扩展。
- core `circle` shape —— point mark 下沉目标（仅引用）；core `sector` / `arc` **不在本 ADR**（ADR-02）。
