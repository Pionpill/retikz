# ADR-01：coordinate 抽象通用化 + polar2D 投影

> 本 milestone 的唯一真叶子：把 alpha.1~alpha.3 写死的 cartesian 投影抽象成「坐标系可插拔的中间层」，并补 polar2D 投影几何 + 完整 `ResolvedCoordinateFrame` 契约（供 ADR-02/03/04 共用）。

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 coordinate / §3.6 encoding / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md](../../../../../architecture/core-design.md)

> **实现期修订（review pass，2026-06-06，以本节为准）**：原「hybrid 位置通道（默认 x/y + 可选 angle/radius）」**已废**——改为 **位置通道仅 `x` / `y`、且必填**，无 angle/radius 通道；坐标系把 x/y 重解释为 angle/radius（纯 ggplot 模型）。理由：双形态对 LLM 有歧义，且 zod `refine` 不进 JSON Schema、约束不了 constrained-decoding 生成；x/y 必填则**形状层**即可结构性约束生成。连带变更：encoding 拆 `PositionEncodingSchema`(x/y 必填) + `StyleEncodingSchema`(color)，**sector 用样式-only 编码**（无 x/y）；删除 `assertEncodingChannels` 跨字段校验（schema 已结构性强制，无需运行时校验）；运行时类型 `CoordinateFrame`（非 `ResolvedCoordinateFrame`），`PolarFrame` 另含 `continuousAngle` / `projectPolar`（ADR-03 段内采样用）。**下文 §1、待决策点、schema 表中凡涉及 angle/radius 通道 / x+angle 优先级 / hybrid 的部分，一律以本修订为准。** DSL 简写见 ADR-05（`coordinate="polar2D"`）。

## 背景

alpha.1~alpha.3 打通了 cartesian2D 的纵向闭环，但**坐标系是写死的**：`coordinate` IR 的 union 只有一个成员（`Cartesian2DSchema`），lowering 的投影 / range / layout / guide 几何全部假设笛卡尔——

- `lower/project.ts` 的 `Projector` 暴露 `xScale` / `yScale`，`createCartesianProjector` 直接 `[xScale.coordinate(x), yScale.coordinate(y)]`；
- `lower/expand.ts` 写死 `axisValues('x'/'y')`、fallback range `[0,width]` / `[height,0]`、`createCartesianProjector`；
- `lower/layout.ts` 的 `computePlotArea` 按矩形 margin 缩进；
- `lower/mark.ts` / `lower/guide.ts` 直接读 `project.xScale` / `project.yScale` 算矩形柱 / 直线轴。

polar2D 落地必须先把这些写死处抽象出来。grammar of graphics 的核心洞见（plot-design §8.3）正是：**scale**（值→归一化，坐标系无关）→ **coordinate**（归一化→2D 点，cartesian vs polar 差在此）→ **mark**（投影点 + 区间/带概念→几何）三层分离，加坐标系 O(1)、mark 自动适配。ggplot 的 `coord_*`、Observable Plot 的 projection 都按此组织；Vega 反例是把每坐标系几何塞进分立 mark（`rect` / `arc`），加坐标系 O(N_marks)。

retikz 已在 §8.3 拍定走 **(i) 投影整形**（mark 坐标系无关、coordinate 做投影整形）。本 ADR 是 (i) 的地基：把 cartesian 投影重构成可替换的 `CoordinateFrame`，补 polar 投影，并定义 02/03/04 共用的帧契约——若 polar 接入要大改 mark 内部，即证明抽象没切干净。

本 ADR 的可见产出是**极坐标散点**（point mark 经重投影自动适配 polar），验证 frame + 投影打通；interval→sector（ADR-02）、line/area（ADR-03）、polar guide（ADR-04）在帧契约之上各自落地。

## 决策：位置通道仅 x/y（坐标系重解释）+ 一次性解析出 `CoordinateFrame`，polar 投影复用 PositionScale 机制

三块组成：

### 1. 位置通道：仅 `x` / `y`（必填），坐标系重解释

位置通道**只有 `x` / `y`、两者必填**（无 angle/radius 通道）。坐标系声明两个位置角色 + 各角色绑定的 scale 名，并把 x/y 重解释为对应角色：

- `cartesian2D` 角色 = (horizontal, vertical)：x→水平、y→垂直；
- `polar2D` 角色 = (angle, radius)：**x→angle、y→radius**（对齐 ggplot `coord_polar` 默认：自变量轴绕圈、值轴往外）。

解析规则：`primary ← encoding.x`、`secondary ← encoding.y`，投影由 coordinate（frame）做。一份 cartesian 折线 / 散点 spec **只改 `coordinate` 就渲成极坐标版**（零改 encoding，正中 §8.3 (i)，纯 ggplot 模型）。`encoding` 拆 `PositionEncodingSchema`(x/y 必填) + `StyleEncodingSchema`(color)；**x/y 必填**使 JSON Schema 在 constrained-decoding 下结构性约束 LLM 生成。scale 绑定仍挂 coordinate（与 `coordinate.x/y` 命名 scale 一致），encoding 只给字段 / 常量。

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

// ir/encoding.ts —— 位置/样式拆分；位置通道仅 x/y 必填（无 angle/radius）
//   PositionEncodingSchema = { x: ChannelSchema, y: ChannelSchema }   // 必填，坐标系重解释为 angle/radius
//   StyleEncodingSchema    = { color: ChannelSchema.optional() }       // 非位置通道
//   EncodingSchema = PositionEncodingSchema.merge(StyleEncodingSchema) // 位置 mark 用；sector 用 StyleEncodingSchema
```

理由：

1. **(i) 投影整形的地基**：把投影做成可替换中间层，mark 取点坐标系无关，加坐标系 O(1)——这是 retikz 选 (i) 而非 Vega 式分立 mark 的全部价值，地基没切干净后面全废。
2. **polar 零新机制**：角 / 径复用 `PositionScale`（range = 角度区间 / 半径区间），band/linear/time 全自动适配，投影只多一步三角变换；不引入平行的 scale / tick / range 体系，IR 与 lowering 复杂度可控。
3. **位置通道仅 x/y 必填最利 AI 与跨坐标系复用**：单一形态无歧义、x/y 必填进 JSON Schema 约束生成（refine 不进 JSON Schema、约束不了），cartesian spec 改 coordinate 即跨系（纯 ggplot），无「选错通道」之虞。
4. **帧契约单点拥有**：02/03/04 共用同一 `CoordinateFrame`，杜绝各造临时投影框架的伪并行（评审 P1-1）。

## 不在本 ADR 范围

- **interval→sector / sector mark（pie/donut）几何** → ADR-02（含累积角 transform）。
- **line / area polar 投影（弯弧）+ area mark + `closed`（雷达）** → ADR-03。
- **polar guide（angular/radial axis + 同心环/辐条 grid）** → ADR-04；本 ADR 只产 frame，不画轴网格。
- **`@retikz/plot-react` / `@retikz/plot-vanilla` 的 polar authoring 表面 + docs demo** → ADR-05（roadmap P2-1：01~04 core-internal）。
- **theta 翻转 / direction / 起始 12 点钟 / partial-arc 紧 bbox** → 见待决策点，倾向留后续非破坏放宽。
- **ternary / linear1D 坐标系** → 后续 milestone。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/plot/v0/v0.1/alpha.4/01-coordinate-polar.md`（封板全文）。
