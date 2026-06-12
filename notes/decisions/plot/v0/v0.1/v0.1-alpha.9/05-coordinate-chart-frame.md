# ADR-05：坐标系 = 可报局部标架（frameAlong）的 chart —— 收编实验性 custom coordinate，为曲线轴 / 法丛 / 多 plot 组合立契约

- 状态：Proposed
- 决策日期：2026-06-09
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.5 CoordinateSystem / §8.3 投影分层 / §3.9 Guide](../../../../../architecture/plot-design.md) · 前身：[alpha.4 ADR-01 coordinate 抽象](../v0.1-alpha.4/01-coordinate-polar.md)（polar 逼出 frame）· [alpha.9 ADR-01 frame N 通道泛化](./01-coordinate-frame-roles.md)（projectRoles 立）· 收编对象：实验性 custom coordinate spike（next-plot commit `ed2bdec9` / `92fd91cb`，"API 待 ADR 定稿"）

> 评审：已并入一轮 develop-design 多 LLM 评审（挑刺 + 替代方案视角）。采纳 5 条并折进各段——P0「roles.length ≠ 内禀维度」→ 把标架拆成三层、本轮只交付**单 role 轴标架**；P0「normal-offset 测试无落地消费方」→ 删该 case、换成「2D custom 的 x 轴仍有切向法向」；P1「createCustomFrame 签名不一致」→ 定稿 options 对象；P1「origin === projectRoles 引用相等不成立」→ 改分量数值近似 + null 一致；P2「custom roles schema 边界」→ 明确限 mark channel 名。

## 背景

alpha.4 用 polar 逼出 `CoordinateFrame`（scale 归一化 → 投影 → mark 几何的可替换中间层）；alpha.9 ADR-01 把它泛化成「N 通道角色」：每个 frame 带 `roles: ReadonlyArray<DimensionRole>` + `projectRoles(values) => [x, y] | null`。`projectRoles` 本质就是微分几何里的参数化映射 γ：**参数空间（roles，自由度 = `roles.length`）→ 屏幕点**。一维曲线（sin / 圆周 / Bezier）= 1 个 role，二维（cartesian / polar / ternary）= 2~3 个 role——「维度由自由度决定」已经在 `roles` 数组里成立。

随后一次实验性 spike（next-plot，未走 ADR）加了一个通用扩展点：IR 存 `{ type:'custom', name, roles, params }`（JSON 安全），投影函数 γ 由运行时 `coordinates` 工厂注入（不进 IR），并实现了 `lowerCustomAxis`——沿 `projectRoles` **数值差分密采样**画曲线轴。它证明了 `projectRoles` 足以表达任意坐标系几何，但留下三处未定的契约债，正是本 ADR 要清的：

1. **曲线轴靠数值差分猜切向**：`lowerCustomAxis` 现在用有限差分重建轴的局部方向来摆刻度 / 标签。这等价于在事后近似 γ 的雅可比 Dγ，不精确、且每个消费方各猜一遍。**真正的统一原语是 γ 的局部标架（雅可比的列）**，应当被显式声明而非反复猜。

2. **「在曲线上绘图」无契约**：后续要做的多 plot 组合（例「某段圆弧上衍生一个新图」），子图被放进父坐标系的一块子流形（弧）上，需要父坐标系在锚点报出 `{ 原点, 切向, 法向 }` 才能摆放子图。这与「沿法向偏移的 mark」（法丛 / normal bundle）是同一个构造的不同粒度——前者法向纤维里装一整张子图、后者装一个标量偏移。两者都缺一个可查询的局部标架。

3. **custom coordinate 是未定稿的公开面**：实验性的 `CustomCoordinateSchema` / `createCustomFrame` / `CustomCoordinateFactory` 已经从 `@retikz/plot` 导出，属红级公开 API，却没有 ADR 背书、没说清边界（仅 point？曲线轴算不算稳定？工厂签名定了吗）。

同类库对照（同 alpha.4/9 流程）：Vega-Lite / Observable Plot **无坐标系抽象**（flat cartesian + arc mark + 独立 geo projection），是 scale-centric；ggplot2 `coord_*` 是全局变换、不暴露可查询局部标架。**没有现成库把坐标系做成「可报局部标架的参数化流形」**——这正是 retikz 把 `Node` / `Step` 做成坐标系无关图元后能往下走的一层。

本 ADR **不新增内建坐标系、不改投影数值**：把实验性 custom 扩展点正式化，并给 `CoordinateFrame` 立一个**单 role 轴标架契约 `frameAlong`**，让曲线轴现在就用、法丛 / 组合将来从同源的更高层标架派生。3D 与多 plot 组合本轮**只留缝、不实现**（见「不在本 ADR 范围」）。

## 决策：`CoordinateFrame` 加可选 `frameAlong(role, params) => { origin, tangent }`，正式化 custom coordinate，曲线轴改吃 frameAlong（缺则回落数值采样）

**(1) 单 role 轴标架契约（本轮交付物，避免把「自由度 = roles.length」打穿语义）**。坐标系几何有三个层次，按需要逐层暴露；本轮只立**最浅的一层**：

- **完整 chart 雅可比 Dγ**（`m × n`，`n = roles.length`）：整张坐标系的全微分。ternary 是 `n=3` 个 role 投到 `m=2`（实际像维数受 `a+b+c=const` 约束为 2），桥是 `n=2` 投 `m=2`——**「内禀维数」是 chart 的事、不等于 `roles.length`**。完整 Dγ 留组合 / 真法丛用，本轮不做。
- **单 role 轴标架（本轮）**：对某一个位置角色 `role`，固定其余角色、只让它变化，得到一条**嵌在屏幕里的 1D 轴曲线** γ_role(t)；其切向 = ∂γ/∂role、法向 = 切向转 90°。**无论坐标系总共几个 role，轴曲线永远是 1D、在 2D 屏幕里余维 1、永远有切向 + 法向**——这正是曲线轴刻度 / 标签需要的，且不与「2D chart」冲突（桥 `roles=['x','y']`，它的 x 轴仍是 1D 曲线、照样有切向法向）。**这消除了上版「2D 满秩无法向余量」与曲线轴需求的冲突**（评审 P0）。
- **子流形标架**（弧 / 法丛纤维）：未来多 plot 组合 / 沿法向偏移 mark 用，本轮不做。

`CoordinateFrame` 增加一个**可选**方法 `frameAlong`：给定一个角色 + 一组参数（按 `roles` 序，同 `projectRoles` 入参），报出该角色轴曲线在该点的局部标架——原点 + 切向（屏幕空间）。法向由唯一消费方（曲线轴 guide）对切向转 90° 导出，不入契约。

```ts
// lower/project.ts —— 单 role 轴曲线标架（本轮）
/** 某角色轴曲线在某点的局部标架：原点 + 切向（屏幕空间）。法向 = 切向转 90°，由 guide 导出 */
export type AxisFrame = {
  origin: [number, number];   // γ(values)
  tangent: [number, number];  // ∂γ/∂role 在 values 处（沿该角色轴曲线的切向，原始幅值）
};

export type CoordinateFrame = {
  type: CoordinateType;
  roles: ReadonlyArray<DimensionRole>;
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /** 可选：报某角色轴曲线的局部标架。缺省 → 曲线轴对 projectRoles 数值差分回落（现状行为，零回归） */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
  // …各坐标系自有字段
};
```

**(2) 正式化 custom coordinate**。把实验性 spike 的公开面定为正式契约：IR `CustomCoordinateSchema = { type:'custom', name, roles, params? }`（100% JSON，γ 不在内；`roles` 限 mark channel 名 `x/y/a/b/c`，不含 polar 的 `angle/radius`——见评审 P2 与 Schema 表）；运行时经 `<Plot coordinates={{ name: factory }}>` / `lowerPlots(options.coordinates)` 注入工厂（镜像 `resolveField` / `data` 的「运行时逃生舱、不进 IR」模式）。`createCustomFrame` 第三参**定稿为 options 对象** `createCustomFrame(roles, projectRoles, options?)`，`options = { roleScales?, frameAlong? }`——替代 spike 的第三位裸 `roleScales` map，避免位置参数继续膨胀、向后加字段友好（spike 的 demo / 测试随之迁移，未发布无外部成本，评审 P1）。工厂可**选择**在 options 里给 `frameAlong`（解析切向）；不给则曲线轴走数值采样回落。

**(3) 曲线轴 = frameAlong 的下游**。`lowerCustomAxis` 改为：优先用 `frameAlong(dimension, …)` 取轴线上各采样点的原点 + 切向（精确），缺 `frameAlong` 时回落到现有数值差分；刻度沿切向落、标签沿法向（切向转 90°）偏移。**built-in cartesian/polar 的 guide lowering 本轮不动**（它们已正确、零回归）——`frameAlong` 是给曲线 / 自定义坐标系的扩展缝，不是强制重写既有轴。

理由：

1. **一族同源原语解锁三件事**。曲线轴（沿 role 采 `frameAlong` → 折线 + 刻度沿切向 + 标签沿法向）、法丛偏移（沿轴法向偏移 d）、弧上衍生子图（锚点取标架 → 拼仿射 Scope 放子图）——都属「查询坐标系局部几何」这一族。本轮只落最浅的**单 role 轴标架**；法丛 / 组合各自取更高层（子流形标架 / 完整雅可比），但入口同源——**先做曲线轴不堵死后两者**。这正是 alpha.4/9 「加坐标系的成本集中在 frame、不散进每个 mark」原则的延续。
2. **不破 IR 铁律、不堵未来**。γ / `frameAlong` 是函数 → 永远在运行时工厂，不进 IR；IR 只存 custom 的 `{name, roles, params}`（JSON）与（将来）camera 数值。3D（环境升 3 维 + camera + Scene 深度排序）与多 plot 组合（消费子流形标架的 Scope 放置）都是这族局部几何原语的**下游**，不是它的前置——现在定契约不堵将来。
3. **零回归 + 给实验性公开面背书**。`frameAlong` 可选，缺省回落到现状数值采样，built-in 坐标系逐字不变；同时把已经导出的 custom API 从「实验性待定稿」收成有 ADR、有边界（本轮仅 point、曲线轴可用、无网格）的正式契约。

## 待决策点 🔻

> 本 ADR 的待决策点已全部拍板（人工接受倾向，2026-06-09），列此留 trail；实现按下列定稿执行。

- **切向尺度 = 原始幅值**（已定）：`AxisFrame.tangent` 是 ∂γ/∂role 的原始幅值（带「该 role 走一单位在屏幕上多长」），非单位向量；消费方需要方向时自行归一化，退化零向量由消费方 guard。
- **法向朝向 = 逆时针（左手法向）**（已定）：法向 = 切向逆时针转 90°；guide 后续可加 side 反转，本轮取此确定默认、文档写明。
- **built-in 本轮不实现 `frameAlong`**（已定）：cartesian/polar/1D/ternary 本轮不给解析 `frameAlong`（曲线轴对它们无意义、走既有 axis lowering）；只立契约 + custom / 曲线轴消费 + 数值回落，built-in 的 `frameAlong` 待组合 / 法丛落地按需补。
- **`frameAlong` 入参与 `projectRoles` 同形**（已定，评审 P1）：按 `roles` 序传值 + 多一个 `role` 参数；`origin` 与 `projectRoles(p)` **分量数值近似相等**（非引用相等），`projectRoles` 为 null 时同返 null。
- **`createCustomFrame` 第三参 = options 对象**（已定，评审 P1）：`{ roleScales?, frameAlong? }`，替代 spike 裸 `roleScales`。

## DSL 表面

> 表层默认不变：`<Plot coordinate="cartesian2D" | "polar2D">` 照旧，99% 图表不碰下面这些。`frameAlong` / custom 是 opt-in 扩展。

```tsx
// react：自定义「桥」坐标系——x 沿抛物拱、y 竖直；工厂可选回传 frameAlong 让曲线轴精确
import { createCustomFrame, type CustomCoordinateFactory } from '@retikz/plot';

const bridge: CustomCoordinateFactory = ctx => {
  const xScale = ctx.linearScaleFor('x', [0, ctx.width]);
  const yScale = ctx.linearScaleFor('y', [ctx.height - 30, 30]);
  const archHeight = ctx.params.archHeight ?? 60;
  const projectRoles = ([x, y]: ReadonlyArray<unknown>): [number, number] | null => {
    const sx = xScale.coordinate(x);
    const sy = yScale.coordinate(y);
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) return null;
    const t = sx / ctx.width;
    return [sx, sy - archHeight * (1 - (2 * t - 1) ** 2)];
  };
  // 可选 frameAlong(role, values)：报该角色轴曲线的原点 + 切向（x 轴沿拱、y 轴竖直）→ 曲线轴精确、不靠差分
  return createCustomFrame(['x', 'y'], projectRoles, { roleScales: { x: xScale, y: yScale } /*, frameAlong */ });
};

<Plot data={grid} coordinate={{ type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: 60 } }} coordinates={{ bridge }}>
  <PointMark x="x" y="y" />
  <Axis dimension="x" />  {/* 沿投影画弯曲 x 轴：有 frameAlong 用解析切向，无则数值采样 */}
  <Axis dimension="y" />
</Plot>
```

```ts
// vanilla：等价 builder（custom 坐标系 + 工厂经 lowerPlots options 注入）
const [def] = lowerPlots(datasets, { width: 420, height: 220, coordinates: { bridge } });
def.expand(spec); // spec.coordinate = { type:'custom', name:'bridge', roles:['x','y'], params:{ archHeight:60 } }
```

## 测试设计

`packages/plot/plot/tests/lower/custom-coordinate.test.ts`（扩：现有 10 case 之上加 frameAlong 契约）+ `tests/lower/coordinate-frame.test.ts`（扩：built-in 回归）覆盖：

- `frameAlong` 原点与 `projectRoles` 分量近似相等（容差内）、null / 非有限行为一致、切向方向沿轴曲线
- 曲线轴优先吃 `frameAlong`、缺则回落数值差分仍出弯曲轴；**2D custom（桥）的 x 轴仍有切向法向、标签沿轴法向偏移**（评审 P0 替代 case）
- custom 既有 fail-loud（未注册工厂 / 缺角色 / 非法 guide 维度 / 非 point mark）回归
- custom × color 子 scope、built-in cartesian/polar 零回归（parity）

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **runtime frame 契约扩**：`lower/project.ts` 加 `AxisFrame` 类型 + `CoordinateFrame.frameAlong?`；`createCustomFrame` 第三参定稿为 options 对象 `{ roleScales?, frameAlong? }`（替代 spike 裸 `roleScales`）。**纯增量**，既有 frame 不实现 `frameAlong` 则行为不变。
- **guide lowering**：`lower/guide.ts` 的 `lowerCustomAxis` 改吃 `frameAlong`（带数值差分回落）；built-in 轴 lowering 不动。
- **IR**：`CustomCoordinateSchema` 从实验性转正式（字段不变，仅 ADR 背书 + `roles` 边界写清）；**无新 IR 字段**（`frameAlong` 是函数、不进 IR）。
- **公开 API**：`@retikz/plot` 的 `createCustomFrame` / `CustomCoordinateFactory` / `CustomCoordinateContext` / `AxisFrame` 转正式导出；React `<Plot coordinates>` prop、`coordinate={{type:'custom',…}}` 转正式。⚠️ `createCustomFrame` 第三参由裸 `roleScales` 改 options 对象，spike 的实验性调用需迁移（仅本仓 demo / 测试，未发布，无外部迁移成本）。
- **core**：无新 core 依赖（曲线轴仍下沉到 core Path/Node，同 alpha.9）。3D 深度排序与组合 Scope 才需 core，本轮不做。
- **文档站**：`grammar/coordinate` 的「自定义坐标系（实验性）」段从实验性 alert 升为正式说明 + frameAlong 解释（zh/en 同步）。

## 不在本 ADR 范围

- **完整 chart 雅可比 Dγ + 子流形标架**：本轮只做单 role 轴标架；完整 Dγ（`m×n`，组合 / 真法丛用）与子流形标架（弧 / 法丛纤维）留后续 ADR，入口与 `frameAlong` 同源。
- **3D 坐标系**：环境维升 3、camera（纯数值、将来进 IR）、Scene 深度排序（core/render）——roadmap 明确 **gating 于 core 三维坐标**，core 没有前不在 plot 做。本 ADR 只保证 `frameAlong` 契约不因升 3 维而推翻（升维只动 γ 输出与新增 view 段，不动「报轴曲线标架」这一契约）。
- **多 plot 组合 / 弧上衍生子图**：消费子流形标架在锚点拼仿射 Scope 放子图——属 core 的 composite + Scope（`next-core`）。本 ADR 不做放置机制。
- **曲线精确嵌入**（子图每点过父 γ、肉眼跟着弧弯）：默认走仿射标架近似，精确嵌入 opt-in，留组合 ADR。
- **built-in 坐标系的解析 `frameAlong`**：cartesian/polar/1D/ternary 本轮可不实现（曲线轴对它们无意义、它们走既有 axis lowering）；组合 / 法丛落地时按需补。
- **法丛 mark（沿法向偏移的几何）**：本轮不做；轴法向已能从单 role 切向导出，但**没有公开的 normal-offset mark 消费方**——故不立「请求法向偏移 fail-loud」这类无入口的契约 / 测试（评审 P0-2）。
- **网格（grid）for 曲线 / 自定义坐标系**：本轮曲线轴只出轴线 + 刻度 + 标签，无网格。

---

## 实现契约（必填）🔻

> 本段是下游 implement / test / document / wrapup 的硬契约。⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草的**建议稿**，待人工 review 签字 + 红级 ADR 的多 LLM 评审后定稿。

### Level

`red`

判级：触及 `packages/plot/plot/src/ir/coordinate.ts`（custom IR 正式化）+ `packages/plot/*/src/index.ts`（公开导出 `createCustomFrame` / 类型）→ red。runtime frame 契约（`lower/project.ts`）+ guide（`lower/guide.ts`）本是 yellow，跨级取最高 → **red**。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/coordinate.ts` | 正式化（字段不变） | `CustomCoordinateSchema` | `z.object({ type: z.literal('custom'), name, roles, params? })` | — | 自定义坐标系：name 引用运行时工厂，roles 声明位置角色，params 为数值参数；投影函数不进 IR |
| `packages/plot/plot/src/ir/coordinate.ts` | 确认边界（评审 P2） | `roles` | `z.array(z.enum(['x','y','a','b','c'])).min(1)` | — | custom roles 限 mark channel 名（x/y/a/b/c），**不含 polar 的 angle/radius**——圆周 / 曲线类 custom 用 x/y 作参数名，几何由 projectRoles 决定，不复用 polar 角色 |

无新增 IR 字段（`frameAlong` / γ 是函数，运行时工厂，不进 IR）。`roles` 限 `x/y/a/b/c` 是**有意限制**（评审 P2）：custom 角色只是 mark channel 绑定名，polar 的 `angle/radius` 是内建坐标系的角色别名、不向 custom 开放。

### 文件 scope

- `packages/plot/plot/src/ir/coordinate.ts`（修改：custom 正式化 + describe 收口）
- `packages/plot/plot/src/lower/project.ts`（修改：`AxisFrame` 类型 + `CoordinateFrame.frameAlong?` + `createCustomFrame` 第三参定稿 options 对象）
- `packages/plot/plot/src/lower/guide.ts`（修改：`lowerCustomAxis` 吃 frameAlong + 数值回落）
- `packages/plot/plot/src/lower/expand.ts`（修改：`CustomCoordinateContext` 透传 / 构造 frameAlong 所需上下文，按需）
- `packages/plot/plot/src/index.ts`（修改：正式导出 `AxisFrame` 等）
- `packages/plot/react/src/Plot.tsx` / `components/buildPlotSpec.ts`（修改：custom 表面正式化，随 createCustomFrame 签名改同步）
- `packages/plot/plot/tests/lower/custom-coordinate.test.ts`（修改：加 frameAlong 契约 case + 迁 createCustomFrame 调用到 options 对象）
- `packages/plot/plot/tests/lower/coordinate-frame.test.ts`（修改：built-in 回归）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（修改：custom 表面 case）
- `apps/docs/src/contents/plot/grammar/coordinate/index.{zh,en}.mdx`（修改：实验性 → 正式 + frameAlong 说明）
- `apps/docs/src/contents/plot/grammar/coordinate/coordinate-custom-bridge.demo.tsx`（修改：迁 options 对象 + 示范 frameAlong，按需）

### 测试象限

> plot alpha milestone 放宽：按复杂度适量、覆盖真实有意义的 accept/reject 与几何断言，不硬凑 9。

**Happy path**：

- `framealong_origin_matches_project_roles`：`frameAlong(role, p).origin` 与 `projectRoles(p)` **逐分量近似相等**（容差 1e-6），且 `projectRoles(p)` 为 null 时 `frameAlong` 同样返回 null（评审 P1，非引用相等）
- `framealong_tangent_along_axis_curve`：解析切向方向与「固定其余角色、沿该角色数值差分」所得方向在容差内一致
- `curved_axis_consumes_framealong`：工厂回传 `frameAlong` → 曲线轴刻度切向取自解析切向（与差分近似一致）、轴线折线 ≥ 4 步

**边界**：

- `framealong_null_when_projection_null`：越界参数（投影返回 null）→ `frameAlong` 返回 null、曲线轴跳过该采样点不抛
- `degenerate_tangent_guarded`：切向退化为零向量（导数为 0）→ 法向导出不产生 NaN（消费方 guard）

**错误路径**（复用 spike 既有 fail-loud 作回归，不新造无入口的契约）：

- `unknown_factory_fails_loud`：`coordinate.name` 无对应注册工厂 → fail-loud
- `missing_required_role` / `invalid_guide_dimension` / `non_point_mark` fails_loud：缺必填角色 / 非法 guide 维度 / 非 point mark → fail-loud（既有行为，正式化后保持）

**交互**：

- `curved_axis_normal_uses_axis_tangent_even_when_custom_roles_are_2d`：2D custom（桥，`roles=['x','y']`）→ x 轴仍画成弯曲轴线、刻度标签沿**轴曲线法向**（切向转 90°）偏移（评审 P0-2 替代 `normal_offset` case，验证「2D chart 的单 role 轴仍有切向法向」）
- `custom_framealong_with_color_subscopes`：custom + categorical color → 仍分色子 Scope（既有行为保留）
- `builtin_cartesian_polar_zero_regression`：cartesian2D / polar2D 既有 guide / mark lowering 产物逐字不变（parity 基准）

### 依赖的现有元素

- `CoordinateFrame` / `projectRoles` / `DimensionRole`（`lower/project.ts`）—— 扩展：加 `frameAlong?` + `AxisFrame`
- `createCustomFrame` / `CustomFrame` / `CustomCoordinateFactory` / `CustomCoordinateContext`（`lower/project.ts`，实验性 spike）—— 修改：正式化 + 第三参定稿 options 对象（含可选 `frameAlong`）
- `lowerCustomAxis` / `polylinePath` / `CUSTOM_AXIS_SAMPLES`（`lower/guide.ts`，实验性 spike）—— 修改：吃 frameAlong + 数值回落
- `CustomCoordinateSchema` / `PlotCoordinate.Custom`（`ir/coordinate.ts`，实验性 spike）—— 修改：转正式
- `LowerPlotsOptions.coordinates` / `resolveFrame`（`lower/expand.ts`）—— 引用 / 按需扩 context
- core `Path` / `Node` / `Scope`（`packages/core/core`）—— 仅消费：曲线轴下沉目标，不改 core 内部
