# ADR-05：coordinate registry —— IR coordinate ops 与 runtime coordinate definitions 分层；`resolveFrame` 六路 bespoke 分支收敛为 registry；内置 5 个降为注册项；公开 `defineCoordinate` + `options.coordinates`（改 Array 形态）扩展点

- 状态：Proposed
- 决策日期：2026-06-18
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [ADR-03 mark registry](./03-mark-abstraction-registry.md) · [ADR-06 transform registry（同范式样板）](./06-transform-registry.md) · [ADR-07 scale registry（同范式样板）](./07-scale-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

> ⚠️ 草案：本 ADR 由 2026-06-18 设计讨论产出，复用本 registry 三联同期多 LLM 评审沉淀的硬规则（分名分层 / CustomSchema 排除内置 type / 闭合 union + lowering 期校验 / options 注入保 parity；详见 ADR-06/07）。实现契约为 AI 起草建议稿，待人工 review + 多 LLM 评审后定稿。
> 本 ADR 是 alpha.12「**开放扩展 registry 三联**」（coordinate 05 / transform 06 / scale 07）的**首篇**：三篇各把一族内置分派收敛为 registry 并开放公开扩展点；ADR-03 mark registry 仅内部收敛、不开放（有意不对称）。coordinate 列为首篇，因其**最基础**（mark / guide / locator 全部投影都经它）且**收敛难度最高**，先把统一 `resolve` 契约在它身上立稳，能为 transform / scale 两篇去险。
> **与 transform/scale 的本质不对称（先讲后用）**：transform 的 7 内置、scale 的 13 内置在收敛前**各自已是统一 `apply` / `resolve`**，降为注册项是机械动作；coordinate 的 5 内置在 `resolveFrame`（`pipeline/expand.ts:390-648`）里是 **~260 行逐类型 bespoke 分支**（cartesian 解析 x/y scale + 直线轴；polar 把 angle range 设成度数 + 弧轴；ternary 重心归一化 + 三角轴），**不是统一接口**。本 ADR 的核心工作量正是把这六路 bespoke 抽成统一 `resolve(op, ctx)` 契约——这是三篇里最大的一块重构、也是主要风险点（见「背景」末段与「待决策点」）。

## 名词分层（贯穿全文，先立后用）

立本 registry 三联的共同核心纠正：**「coordinate op」与「coordinate definition」是两层不同的东西，必须分名分层**。coordinate 这里还有一处历史包袱要一并清理——见下表注。

| 层 | 名称 | 形态 | 进 IR？ | 投递方式 | 谁定义的 |
| --- | --- | --- | --- | --- | --- |
| **coordinate op** | `spec.coordinate` | `{ type, ...config }` 纯 JSON | **是** | `<Plot coordinate=...>` / `<Cartesian>` 等组件 / 手写 spec | 既有 |
| **coordinate definition** | `CoordinateDefinition` | `{ schema, roles, resolve }` 运行时对象（含函数） | **否** | `lowerPlots options.coordinates` / `<Plot coordinates={[...]}>` | **本 ADR 重构** |

- **op 的 React authoring 表面复用既有坐标系组件 / `coordinate` prop**（扩展为接受自定义 `type` 扁平透传，见「影响」），本 ADR 不新增 op 组件。
- **definition 注入口沿用 `coordinates`**——但**形态从 `Record<name, Factory>` 改为 `Array<CoordinateDefinition>`**（registry 从 schema 提 `type` 为键），与后两篇 `transformDefinitions` / `scaleDefinitions` 的 Array<Definition> 形态对齐。这是本 ADR 的命名动机：现状 `coordinates: Record<string, CustomCoordinateFactory>`（`expand.ts:215`）与三联将立的两个 `*Definitions` 形态不一致，三个公开扩展点应同形。
- **顺带清理 `{type:'custom', name}` 间接层**：现状自定义坐标系的 IR 是 `{ type:'custom', name, roles, params }`（固定 `'custom'` 字面量 + 单独 `name` 二次引用 + 行内 `roles`/`params`），与 scale/transform「自定义 `type`/`kind` 直接当判别串」不一致。本 ADR 让自定义坐标系**直接用自己的 `type` 串**（`{ type:'arch', ...config }`），删 `'custom'` 判别成员与 `name` 间接层；`roles` 上移到 definition（坐标系投影哪些角色是定义固有属性、非每实例数据）。

## 背景

`coordinate` 层现有 6 个 `PlotCoordinate` 枚举成员（`ir/coordinate/coordinate.ts:8`）：5 个真实内置（cartesian2D / polar2D / cartesian1D / polar1D / ternary2D）+ 1 个 `custom` 占位。分派写死在**多处并行 bespoke 逻辑**：

- `resolveFrame` 六路 `if/else`（`expand.ts:390/458/508/566/593/614`）—— 每路自解析角色 scale、自算布局（`computePlotArea` / `computePolarCoordinate` / `computeTernaryFrame` / 满画布）、自定 position scale 的 range、自建 `GuideContext` 并下沉轴层。**唯一统一的是 custom 路**（`expand.ts:593-613`）：经 `coordinates?.[name]` 工厂查表 → `ResolvedCoordinate`。
- `coordinate/constants.ts`：`POSITION_ROLES` / `REQUIRED_POSITION_CHANNELS` / `VALID_GUIDE_DIMENSIONS` 三张按内置 type 键的硬编码表（custom 走行内 `coordinate.roles`）。
- `assertValidGuideDimensions`（`expand.ts:124`）/ `assertRequiredPositionChannels`（`expand.ts:128`）—— 据 type 在「constants 表」与「行内 roles」间二分。

三个结构问题（与 transform/scale 同构，加一条 coordinate 独有）：

- **内置坐标系是长尾，写不完。** 平行坐标 / 地图投影（墨卡托等）/ 对数极坐标 / 双曲 / 蛇形 timeline / 矩阵树图坐标……专业可视化的坐标几何无穷。全塞 `PlotCoordinate` 枚举既膨胀又覆盖不全。
- **分派写死、与仓库注册范式不一致。** core composite 经 `defineComposite` + options 注册——coordinate 现状**有** custom 工厂注入口，但①是 `Record` 形态、与三联将立的两个 `*Definitions` 不齐，②内置不走它、仍是 bespoke 分支。「加一个坐标系要在 `resolveFrame` 加一路 + 改三张 constants 表」，内置无法被用户以同一范式扩展。
- **（coordinate 独有）公开扩展形态已存在但与同期新立的不统一。** 若放任 coordinates 是 Record、transform/scale 是 Array，四个扩展点（含 core composite）会有两种公开风格。本 ADR 在 0.x 收敛期统一为 Array<Definition>（`colorSchemes`（ADR-07）是 name→interpolator 的纯函数表、无 schema/type 提取需求，**合理保留 Record**，见「Record/Array 边界」）。

GoG 与同类库都把坐标系当可扩展轴：Vega projection 开放、Observable Plot 的 projection options + d3-geo 投影族、G2 的 coordinate 可注册。

**为什么本轮开公开扩展（与 ADR-06/07 同节奏）：** 坐标几何长尾是明确现实需求；项目处 0.x、本里程碑未发布，按最优设计推进、不留别名 / 不为 `Record` 旧形态保桥接。

**主要风险（本 ADR 独有，须显式承认）：** 把六路 bespoke 抽成统一 `resolve(op, ctx)`，`ctx` 要喂齐「角色取值 + 角色 scale 解析 + position scale 构建 + 布局 + guide 下沉」全部共享能力，**context 表面较大**。缓解：六路抽取是**行为保持的机械搬迁**（逐字节 parity 测试守恒），且六路已被验证共享同一骨架（收集角色值 → 解析角色 scale + 兼容校验 → 算布局/plotArea → 建 position scale → 建 frame → 自建 GuideContext 下沉轴层）；context 表面大小本身列为待决策点（公开 curate vs 全暴露）。

## 决策：`resolveFrame` 六路 bespoke 收敛为 registry；内置 5 个降为注册项；公开 `defineCoordinate` + `options.coordinates`（Array 形态）+ 自定义 `type` 直接判别（对齐 composite / transform / scale）

### (1) `CoordinateDefinition` + `defineCoordinate`：单一 `resolve` 契约（无 family；产出契约六路同形）

coordinate 不像 scale 需要 family 判别——六路虽布局策略不同，但**产出契约一致**（都产 `frame + plotArea + gridLayers + axisLayers`），差异在「resolve 内部调哪些 ctx helper」，故单一 `resolve` 即可：

```ts
// coordinate/define.ts（示意；definition 是运行时对象、含函数，永不进 IR）

/** resolve 上下文：六路 bespoke 共享的全部能力，registry 适配层从 resolveFrame 现有闭包组装 */
type CoordinateResolveContext = {
  /** 整图宽 / 高（user units） */
  width: number;
  height: number;
  /** label 字号 + 逐边 margin 覆盖 */
  fontSize: number;
  margin?: Partial<Margins>;
  /** legend 预留带宽（plotArea 据此收窄；polar/ternary 满画布时退化为不收窄） */
  legendReserve: LegendReserve;
  /** provenance 上下文（透传给 lowerGuide） */
  provenance?: ProvenanceContext;
  /**
   * 按角色收集所有 mark 的通道原始值（替代 resolveFrame 内 collectValues 闭包）。
   * includeBaseline：值轴从 baseline(0) 起（interval span/extent + region baseline 纳入连续域）。
   */
  collectRoleValues: (role: DimensionRole, opts?: { includeBaseline?: boolean }) => Array<unknown>;
  /** 角色 scale 解析（含 order 注入 + 兼容校验，复用 resolveScaleForRole）；省略 scaleName → 按字段类型派生 */
  resolveScaleForRole: (role: DimensionRole, scaleName: string | undefined, values: Array<unknown>) => Scale;
  /** 按 def + range 建 PositionScale（复用 ADR-07 registry 后的 resolvePositionScale） */
  buildPositionScale: (def: Scale, values: Array<unknown>, range: readonly [number, number]) => PositionScale;
  /** 值轴非线性兼容校验（interval/area baseline 含 0）——cartesian/polar 值轴调用 */
  assertBaselineScaleCompatible: (scaleType: string, marks: ReadonlyArray<Mark>) => void;
  /** 本 plot 的 axis guides（已按 isAxisGuide 过滤 + 唯一维度校验入口）；definition 自建 GuideContext 后下沉 */
  axisGuides: ReadonlyArray<AxisGuide>;
  lowerGuide: (guide: AxisGuide, ctx: GuideContext, provenance?: ProvenanceContext) => LoweredGuide;
  /** 曲线轴下沉（自定义 / 曲线坐标系沿投影采样轴线）；roleScales 缺省则不画 */
  lowerCustomAxis: (frame: ResolvedCustomCoordinate, guide: AxisGuide, fontSize: number, provenance?: ProvenanceContext) => LoweredGuide;
};

/** resolve 产出：mark / guide 共用的投影帧 + plotArea + 已下沉的网格 / 轴层（与现 ResolvedFrame 同形） */
type CoordinateResolution = {
  frame: ResolvedCoordinate;
  plotArea: Rect;
  gridLayers: Array<IRScope>;
  axisLayers: Array<IRScope>;
};

type CoordinateDefinition<Op extends CoordinateOp = CoordinateOp> = {
  /** 完整 op schema：必须 ZodObject 且 `type` 为 z.literal（registry 据此提取注册键，运行时校验形态） */
  schema: ZodType<Op>;
  /**
   * 该坐标系投影的位置角色序（替代 constants 三表的内置硬编码 + custom 行内 roles）。
   * 驱动 required-channel / guide-dimension 校验；roles 是坐标系固有属性、非每实例数据，故上移到 definition。
   */
  roles: ReadonlyArray<DimensionRole>;
  /** 真正解析：op + 共享上下文 → frame + plotArea + guide 层。**必须纯且确定**（守 SSR / locator parity） */
  resolve: (op: Op, ctx: CoordinateResolveContext) => CoordinateResolution;
};

/** 注册一个 coordinate，保留 resolve 对 Op 的强类型（对齐 defineComposite / defineTransform / defineScale） */
const defineCoordinate = <Op extends CoordinateOp>(def: CoordinateDefinition<Op>): CoordinateDefinition =>
  def as CoordinateDefinition;
```

要点：

- **单一 `resolve`、无 family**：六路产出同形，不需 scale（ADR-07）那样的 position/channel 判别。布局差异（矩形 plotArea vs 极坐标满画布 vs 三角）由各 definition 在 `resolve` 体内自行编排（内置 definition 在包内直接 import `computePlotArea` / `computePolarCoordinate` / `computeTernaryFrame`，不污染公开 context——见「context 表面」待决策点）。
- **`roles` 上移 definition**：`constants.ts` 三张内置表 + custom 行内 `roles` 统一为 `definition.roles`。`assertRequiredPositionChannels` / `assertValidGuideDimensions` 改读已解析 definition 的 `roles`（registry 先解析、再校验）。
- **`resolve` 拥有 guide 下沉**：guide 构造是坐标系特定的（cartesian 填 projectX/Y + ticks；polar 加 angularTicks/radialTicks/frame；ternary 加 ternaryVertices；custom 走 lowerCustomAxis），故 definition 自建 `GuideContext` 并调 `ctx.lowerGuide` / `ctx.lowerCustomAxis`，返回 gridLayers/axisLayers。
- **`type` 提取 + 形态校验**：从 `schema.shape.type`（z.literal）提取注册键，首次 resolve 期校验「ZodObject + type literal」否则 throw（mirror composite `extractKey`、transform `extractKind`、scale `extractType`；实现 helper 命名为 `extractCoordinateType`）。
- **`resolve` 纯且确定**：坐标系投影天然纯（无随机）；与现有 bespoke 分支同性质，无新约束。

内置 5 个直接复用 `ir/coordinate/coordinate.ts` 现有 schema + 现有 `create*Coordinate` 构造器（`coordinate/cartesian.ts` / `polar.ts` / `ternary.ts`），零重写——`resolve` 体即把对应 `resolveFrame` 分支**逐行搬入**（行为保持，parity 守恒）。

### (2) registry 解析：内置为底 + definition 注入合并，冲突 / 未注册一律 throw

照 `lowerComposites` / ADR-06 `resolveTransformRegistry` / ADR-07 `resolveScaleRegistry` 每次 lowering 现建一张 `type → CoordinateDefinition` 表：

```ts
const BUILTIN_COORDINATES: ReadonlyArray<CoordinateDefinition> = [cartesian2DDef, polar2DDef, cartesian1DDef, polar1DDef, ternary2DDef];

const resolveCoordinateRegistry = (custom?: Array<CoordinateDefinition>): Map<string, CoordinateDefinition> => {
  const registry = new Map<string, CoordinateDefinition>();
  for (const def of BUILTIN_COORDINATES) registry.set(extractCoordinateType(def.schema), def);
  for (const def of custom ?? []) {
    const type = extractCoordinateType(def.schema);
    if (registry.has(type)) throw new Error(`lowerPlots: duplicate coordinate registration: '${type}'`);
    registry.set(type, def);
  }
  return registry;
};
```

- **type 冲突 → throw**（含自定义撞内置、两自定义互撞）：mirror composite / transform / scale。
- **未注册 type → throw**（**不是** composite 的 warn + skip）：coordinate 是**最结构性**的基元——mark / guide / locator 全部投影依赖它，未知 type 无法投影、必须 fail-fast。复用 transform/scale 同分界。
- registry 在 `resolveFrame`（expand + locator 共享入口，`interaction/locate.ts:96` 已复用）从 `options.coordinates` 解析一次，expand 与 locator 用同一张表（**locator parity by construction**——`resolveFrame` 是 mark 下沉与 locator 的单一投影真源）。

### (3) IR schema：闭合 union 静态精确校验内置 + 仅未知 type passthrough；删 `custom` 判别成员

`ir/coordinate/coordinate.ts` 仍是 schema 静态单一真源，**不**由 registry 动态组装。内置 `CoordinateSchema` 收为闭合 **5**-`discriminatedUnion`（删 `CustomCoordinateSchema` 成员）；自定义 type 经**排除全部内置 type** 的 passthrough 占位接纳，精确校验延到 lowering（mirror ADR-06/07 评审 BLOCKING——passthrough 必须排除内置，否则吞掉内置坐标系的非法配置、退化静态校验）：

```ts
// PlotCoordinate 删 Custom 成员（5 个内置保留）
const BUILTIN_COORDINATE_TYPES = new Set<string>(Object.values(PlotCoordinate)); // 删 Custom 后即 5 个

const CustomCoordinateSchema = z
  .object({ type: z.string().min(1).refine(t => !BUILTIN_COORDINATE_TYPES.has(t), { message: 'custom coordinate type must not collide with a built-in coordinate type' }) })
  .passthrough()
  .describe('Custom coordinate op: type is any non-built-in identifier; its config is validated at lowering time against the matching CoordinateDefinition supplied via options.coordinates. Position roles come from the definition, not the op.');

const CoordinateOpSchema = z.union([CoordinateSchema, CustomCoordinateSchema]);
type CoordinateOp = z.infer<typeof CoordinateOpSchema>;
```

`PlotSpecSchema.coordinate`（`ir/plot.ts`）从 `CoordinateSchema` 改 `CoordinateOpSchema`。导出的 `Coordinate`（内置 5-union）不变——内部穷尽处理仍用精确 `Coordinate`；registry 与 spec 字段用 `CoordinateOp`。含自定义 type 的 spec 过 `PlotSpecSchema.parse` 且 JSON round-trip 不丢字段。

> **删 `PlotCoordinate.Custom` + `{type:'custom',name,roles,params}`（0.x 破坏）**：自定义坐标系不再写 `{type:'custom', name:'arch', roles:['x'], params:{archHeight:20}}`，改写 `{type:'arch', archHeight:20}`（`roles` 由 `archDef.roles` 给、`archHeight` 由 `archDef.schema` 校验）。0.x + 里程碑未发布，不留 `custom` 别名 / 迁移桥接（AGENTS.md 0.x 政策）。

理由：

1. **options 注入是仓库既有范式**（composite / transform / scale），Array<Definition> 与三联另两篇同形；locator parity 经 `resolveFrame` 复用天然成立。
2. **单一 `resolve` 契约准确容纳六路**：产出同形（frame + plotArea + guide 层），布局差异内化到 resolve 体；强行加 family 反而无依据。
3. **闭合 union（排除内置 type）+ lowering 期精确校验**复用 ADR-06/07 已评审范式，内置静态精确性零损失、`constants.ts` 三表消解为 `definition.roles`。

## Record / Array 边界（统一后仍并存的一处，须说明）

统一后 plot 公开扩展点的注入形态：

| 扩展点 | 形态 | 为何 |
| --- | --- | --- |
| `composites`（core） / **`coordinates`（05，本 ADR 改）** / `transformDefinitions`（06） / `scaleDefinitions`（07） | **`Array<Definition>`** | 都是**带 schema 的 typed op**：registry 从 schema 提 `kind`/`type`/`name` 为键，op 进 IR 需精确校验 |
| `colorSchemes`（07） | **`Record<name, (t:number)=>string>`** | 是 **name→interpolator 的纯函数表**，无 op、无 schema、无 type 提取；IR 只存 scheme 名串。Record 是其正确形态、**不**改 Array |
| `resolveField` / `resolveLabel`（既有） | 函数 / `Record<markId, fn>` | 逃生舱，非 typed-op 注册，保持现状 |

即：**「带 schema 的 op 注册」一律 Array<Definition>，「纯函数查表」保持 Record**。三联中 scale（ADR-07）的 `colorSchemes` 即按此表述（Record 用于纯函数表，与本 ADR 把 coordinates 改 Array 不冲突）。

## 待决策点 🔻

- **`CoordinateResolveContext` 公开表面大小**：内置 definition 在包内可直接 import 布局 helper（`computePlotArea` 等），无需进 context；但自定义 definition 只能用 context 暴露的。倾向**公开 context 只暴露坐标系无关的共享能力**（canvas/style + `collectRoleValues` + `resolveScaleForRole` + `buildPositionScale` + guide 下沉），**不**把 `computePlotArea`/`computePolarCoordinate`/`computeTernaryFrame` 列入公开契约。结论：本轮自定义 coordinate v1 明确沿用**满画布 plotArea + 自拼投影**，不会自动获得 cartesian 那种 margin / legend reserve 收窄；需要这类布局能力时后续另开高级 layout helper。
- **`roles` 静态 vs 数据相关**：内置 roles 全静态（cartesian2D=[x,y]、ternary2D=[x,y,z]…），故放 `definition.roles` 字段足够。若未来某坐标系 roles 依赖 op config（如可配维数的平行坐标），升为 `roles: (op) => DimensionRole[]`（mirror ADR-06 `inputFields(op)`）。倾向**先静态字段**、需求出现再升函数。
- **type 冲突放宽 / extractCoordinateType 时机**：与 ADR-06/07 同——本轮冲突 throw、`extractCoordinateType` 首次 resolve 期校验。
- **自定义坐标系 cell 类 mark 支持**：现状 custom 经 `ResolvedCustomCoordinate.projectCell`（`coordinate/types.ts`）可选支持 interval/sector；保留该可选契约不变，definition.resolve 产 `ResolvedCustomCoordinate` 时按需带 `projectCell`。不在本 ADR 扩展（沿用 alpha.5 既定）。

## DSL 表面

```ts
import { z } from 'zod';
import { defineCoordinate, createCustomCoordinate, renderPlot, type CoordinateResolution } from '@retikz/plot';

// 自定义 arch 坐标系：x 角色沿拱形轴线投影
const arch = defineCoordinate({
  schema: z.object({ type: z.literal('arch'), x: z.string().min(1).optional(), archHeight: z.number().positive().default(20) }),
  roles: ['x'],
  resolve: (op, ctx): CoordinateResolution => {
    const values = ctx.collectRoleValues('x');
    const scaleDef = ctx.resolveScaleForRole('x', op.x, values);
    const scale = ctx.buildPositionScale(scaleDef, values, [0, ctx.width]);
    const frame = createCustomCoordinate(['x'], ([v]) => projectAlongArch(scale, v, op.archHeight, ctx), { roleScales: { x: scale } });
    // 曲线轴：工厂回传 roleScales，按维度画 path-aware 轴
    const gridLayers = [], axisLayers = [];
    for (const guide of ctx.axisGuides) {
      const lowered = ctx.lowerCustomAxis(frame, guide, ctx.fontSize, ctx.provenance);
      if (lowered.gridLayer) gridLayers.push(lowered.gridLayer);
      if (lowered.axisLayer) axisLayers.push(lowered.axisLayer);
    }
    return { frame, plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height }, gridLayers, axisLayers };
  },
});

// op：纯 JSON，进 spec.coordinate——只有配置、无函数
const spec = {
  namespace: 'plot', type: 'plot',
  data: { reference: 'series' },
  coordinate: { type: 'arch', x: 'xScale', archHeight: 30 },   // 自定义 op，与内置 cartesian2D… 同形、type 直接判别
  scales: [{ type: 'linear', name: 'xScale' }],
  // ...marks
};

// definition 经 options.coordinates（Array）注入；内置 5 个恒可用
renderPlot(spec, { series: rows }, { coordinates: [arch] });
```

```tsx
// React：coordinate prop 接受自定义 type；definition 走 coordinates（Array 形态）
<Plot data={rows} coordinate={{ type: 'arch', x: 'xScale', archHeight: 30 }} coordinates={[arch]}>
  <Scale dimension="x" type="linear" name="xScale" />
  <PathMark x="t" y="v" />
</Plot>
```

> ⚠️ **`<Plot coordinates>` prop 形态从 `Record` 变 `Array`**（`Plot.tsx:79`）。0.x 破坏；既有写 `coordinates={{ arch: archFactory }}` 的调用需改 `coordinates={[archDef]}`、且工厂改写成 definition。

## 测试设计

`packages/plot/plot/tests/coordinate/registry.test.ts`（新建）+ `tests/lower/coordinate*.test.ts`（既有，加 registry parity）+ `tests/lower/data-portability.test.ts`（自定义 type round-trip）+ `tests/interaction/*`（locator parity）覆盖：

- 5 内置经 registry 分派与旧 bespoke 分支产物**逐字节等价**（frame + plotArea + gridLayers + axisLayers 四产物，cartesian2D / polar2D / cartesian1D / polar1D / ternary2D 各一组）
- 自定义 coordinate 注入后投影 + guide（曲线轴）生效；`{type:'arch',...}` 直接判别、`roles` 取自 definition
- 未注册 / type 冲突 / 自定义 config 不合 schema / schema 形态非法 → 各自清晰 throw
- 内置 type 字段非法在静态 `PlotSpecSchema.parse` 即抛（CustomCoordinateSchema 不接住）；未知 type 过静态、lowering 校验
- locator 与 lowering 用同一 `coordinates` registry → 投影落点 parity（含自定义坐标系）

具体见「实现契约 § 测试象限」。

## 影响

- **`coordinate/define.ts`（新建）**：`CoordinateDefinition` / `CoordinateResolveContext` / `CoordinateResolution` / `defineCoordinate` / `extractCoordinateType` / `resolveCoordinateRegistry` / `BUILTIN_COORDINATES`（5 内置注册项）。
- **`coordinate/cartesian.ts` / `polar.ts` / `ternary.ts`**：各加对应内置 `CoordinateDefinition` 注册项；`resolve` 体把现 `resolveFrame` 对应分支逐行搬入（行为保持）；`create*Coordinate` 构造器不变。
- **`coordinate/define.ts` / `coordinate/types.ts`**：`createCustomCoordinate` 随 definition 入口收敛到 `define.ts`；`ResolvedCustomCoordinate` / `projectCell` 作为运行时帧契约收敛到 `types.ts`；删 `CustomCoordinateFactory` / `CustomCoordinateContext`（其能力并入 `CoordinateResolveContext`）。
- **`coordinate/constants.ts`**：删 `POSITION_ROLES` / `REQUIRED_POSITION_CHANNELS` / `VALID_GUIDE_DIMENSIONS` 三张内置硬编码表（roles 上移 `definition.roles`）；校验改读已解析 registry。
- **`pipeline/expand.ts`**：`resolveFrame` 六路 `if/else`（`:390-648`）→ registry 查表 + `definition.resolve(op, ctx)`；组装 `CoordinateResolveContext`（把现 `collectValues` / `resolveScaleForRole` 闭包 + 布局/guide 能力包进 ctx）；`assertValidGuideDimensions` / `assertRequiredPositionChannels` 改读 registry `roles`；`LowerPlotsOptions.coordinates` 类型 `Record<string, CustomCoordinateFactory>` → `Array<CoordinateDefinition>`；`ResolveFrameParams.coordinates` 同改；registry 解析一次贯穿 expand + locator。
- **`ir/coordinate/coordinate.ts`**：`PlotCoordinate` 删 `Custom` 成员；删 `CustomCoordinateSchema`（旧 name/roles/params 形态）；`CoordinateSchema` 收为 5-union；加 `BUILTIN_COORDINATE_TYPES` / 新 `CustomCoordinateSchema`（type 排除内置 passthrough）/ `CoordinateOpSchema` / `CoordinateOp`；`Coordinate`（内置 5-union）不变。
- **`ir/plot.ts`**：`coordinate` 字段 `CoordinateSchema` → `CoordinateOpSchema`。
- **`interaction/locate.ts`**：`options.coordinates` 类型随之改 Array；经 `resolveFrame` 复用同一 registry（parity），多数无需额外改。
- **`@retikz/plot` 导出**：加 `defineCoordinate` / `CoordinateDefinition` / `CoordinateResolveContext` / `CoordinateResolution` / `CoordinateOp`；删 `CustomCoordinateFactory` / `CustomCoordinateContext`（`index.ts:9` 区）；`createCustomCoordinate` / `ResolvedCustomCoordinate` 保留。
- **react `Plot.tsx`**：`coordinates` prop `Record` → `Array<CoordinateDefinition>`（`Plot.tsx:79`，经 `LowerPlotsOptions` 透传，mirror 三联另两篇 `transformDefinitions`/`scaleDefinitions`）；`coordinate` prop / 坐标系组件接受自定义 `type` 扁平透传（lowering 期 definition.schema 校验）。
- **vanilla**：`renderPlot` 第三参即 `LowerPlotsOptions`，`coordinates` 改 Array 后自动生效（仅类型 / 测试）。
- **文档站**：coordinate 章节加「自定义坐标系 / `defineCoordinate`」小节 + `CoordinateResolveContext` 契约说明 + 一个 arch / 自定义坐标系 demo；说明自定义 coordinate v1 使用满画布 plotArea、不自动吃 margin / legend reserve 收窄；自定义坐标系迁移说明（`{type:'custom',name}` → `{type:<customType>}`、`coordinates` Record→Array）；双语同步。
- **⚠️ 注意（0.x BREAKING）**：① `options.coordinates` / `<Plot coordinates>` 形态 Record→Array；② 自定义坐标系 IR `{type:'custom',name,roles,params}` → `{type:<customType>,...config}`，删 `PlotCoordinate.Custom`；③ `PlotSpec['coordinate']` 元素类型从精确 5-union(+custom) 放宽为 `CoordinateOp`。`Coordinate` 导出类型不变。检查对 `spec.coordinate` 做穷尽 `switch` 的消费方（确保有 default 或用 `Coordinate` 窄化）。core 无新依赖、不触 core IR 契约。

## 不在本 ADR 范围

- **具体新增坐标系**（平行坐标 / 地图投影 / 对数极坐标…）：本轮只立扩展点 + 收敛内置，不补长尾内置。
- **`CoordinateResolveContext` 布局 helper 公开化**：本轮自定义 coordinate v1 沿用满画布 plotArea，不自动获得 margin / legend reserve 收窄；`computePlotArea` 等不进公开 context。
- **roles 数据相关化**（`roles:(op)=>`）：本轮静态字段。
- **自定义坐标系 cell 类 mark 契约扩展**：沿用 alpha.5 `projectCell` 既定。
- **跨运行时 portable definition schema 注册中心**：本轮经 `options.coordinates` 在 lowering 期校验，足够。
- **type 冲突 = last-wins 覆盖内置**：本轮冲突 throw。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review + 多 LLM 评审后定稿。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（`ir/coordinate/coordinate.ts` + `ir/plot.ts`）+ `packages/plot/*/src/index.ts`（导出 `defineCoordinate`、删 `CustomCoordinateFactory`）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/coordinate/coordinate.ts` | 删 | `PlotCoordinate.Custom` | `'custom'` 枚举成员 | — | 删自定义判别成员（自定义改 type 直接判别） |
| `ir/coordinate/coordinate.ts` | 删 | `CustomCoordinateSchema`（旧） | `{type:'custom',name,roles,params}` | — | 删 name/roles/params 间接形态 |
| `ir/coordinate/coordinate.ts` | 加 | `BUILTIN_COORDINATE_TYPES` | `Set<string>`（= `Object.values(PlotCoordinate)`，删 Custom 后 5 个） | — | 内置 coordinate type 集，供 CustomCoordinateSchema 排除（非 zod、模块常量） |
| `ir/coordinate/coordinate.ts` | 加 | `CustomCoordinateSchema`（新） | `z.object({ type: z.string().min(1).refine(非内置) }).passthrough()` | — | 自定义 coordinate 占位：type 为非内置标识；config 透传；roles 取自 definition；lowering 期按 definition.schema 精确校验 |
| `ir/coordinate/coordinate.ts` | 加 | `CoordinateOpSchema` | `z.union([CoordinateSchema, CustomCoordinateSchema])` | — | spec 层 coordinate op：内置精确 5-union ∪ 自定义占位 |
| `ir/coordinate/coordinate.ts` | 加 | `CoordinateOp` | `z.infer<typeof CoordinateOpSchema>` | — | coordinate op 类型（内置 ∪ 自定义） |
| `ir/coordinate/coordinate.ts` | 改 | `CoordinateSchema` / `Coordinate` | `z.discriminatedUnion('type', [5])`（删 Custom 成员） | — | 内置 5-union 保持闭合、类型精确（内部穷尽处理用它） |
| `ir/plot.ts` | 改 | `PlotSpecSchema.coordinate` | `CoordinateOpSchema` | — | coordinate 接受自定义 type（原 `CoordinateSchema`） |

> 运行时 `CoordinateDefinition` / `CoordinateResolveContext` / `CoordinateResolution` / `defineCoordinate` / `LowerPlotsOptions.coordinates`(Array) 是行为对象、不进 IR，故不在 zod schema 表，见「文件 scope」。
> 字段名一旦写死，下游不允许改；需改回本 ADR 加条或开新 ADR。

### 文件 scope

- `packages/plot/plot/src/ir/coordinate/coordinate.ts`（改：删 Custom 成员/旧 schema，加 Custom/Op schema + 内置 type 集 + 类型；`CoordinateSchema` 收 5-union）
- `packages/plot/plot/src/ir/plot.ts`（改：`coordinate` 字段换 `CoordinateOpSchema`）
- `packages/plot/plot/src/coordinate/define.ts`（新建：`CoordinateDefinition` / `CoordinateResolveContext` / `CoordinateResolution` / `defineCoordinate` / `createCustomCoordinate` / `extractCoordinateType` / `resolveCoordinateRegistry` / `BUILTIN_COORDINATES`）
- `packages/plot/plot/src/coordinate/cartesian.ts` / `polar.ts` / `ternary.ts`（改：各加内置 `CoordinateDefinition` 注册项，resolve 搬入对应分支；构造器不变）
- `packages/plot/plot/src/coordinate/types.ts`（改：收纳 `ResolvedCustomCoordinate` 运行时帧契约；`ResolvedCoordinate` union 保留自定义分支）
- `packages/plot/plot/src/coordinate/constants.ts`（改：删三张内置 roles/guide-dim 表）
- `packages/plot/plot/src/coordinate/index.ts`（改：导出 `defineCoordinate` / 类型）
- `packages/plot/plot/src/pipeline/expand.ts`（改：`resolveFrame` 六路 → registry 查表 + `resolve`；组装 `CoordinateResolveContext`；校验改读 registry roles；`LowerPlotsOptions.coordinates` / `ResolveFrameParams.coordinates` 改 Array；registry 解析贯穿）
- `packages/plot/plot/src/interaction/locate.ts`（改：`coordinates` 改 Array；经 resolveFrame 用同一 registry 保 parity）
- `packages/plot/plot/src/index.ts`（改：re-export `defineCoordinate` / 类型；删 `CustomCoordinateFactory` / `CustomCoordinateContext`）
- `packages/plot/react/src/Plot.tsx` + `components/build-plot-spec.ts`（改：`coordinates` prop Record→Array 透传；`coordinate` prop / 坐标系组件接受自定义 type 扁平透传）
- `packages/plot/plot/tests/coordinate/registry.test.ts`（新建）· `tests/lower/coordinate*.test.ts`（改）· `tests/lower/data-portability.test.ts`（改）· `tests/interaction/*`（改）
- `apps/docs/src/contents/.../coordinate/*.mdx` + `*.demo.tsx`（改 / 新建：`defineCoordinate` 章节 + context 契约 + demo + 迁移说明，双语）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，覆盖真实有意义的 accept/reject 与产物断言。

**Happy path（≥ 3）**：

- `builtin_cartesian2d_parity`：cartesian2D 经 registry 分派，frame + plotArea + grid/axis 层与旧 bespoke 逐字节等价
- `builtin_polar_ternary_parity`：polar2D / polar1D / ternary2D / cartesian1D 经 registry 分派，四产物与旧 bespoke 等价
- `custom_coordinate_projects`：注册 `arch`、spec 含 `{ type:'arch', x, archHeight }` → 投影 + 曲线轴生效、`roles` 取自 definition

**边界（≥ 2）**：

- `empty_coordinates_option`：`options.coordinates` 省略 → 仅内置可用、行为与现状一致
- `custom_no_axis_no_rolescales`：自定义坐标系 resolve 不带 roleScales → 不画轴（语义符合、不报错）

**错误路径（≥ 2）**：

- `unknown_coordinate_type_throws`：spec 引用未注册 type → lowering throw 清晰错（非静默）
- `duplicate_coordinate_type_throws`：`coordinates` 与内置同 type / 两自定义同 type → throw
- `builtin_bad_field_static_reject`：内置 type 字段非法（如 cartesian2D 的 x 非串）→ 静态 `PlotSpecSchema.parse` 即抛（CustomCoordinateSchema 不接住）
- `custom_schema_reject`：自定义 config 不满足 definition.schema → lowering throw zod 错
- `malformed_coordinate_schema_throws`：definition.schema 非 ZodObject / `type` 非 literal → `resolveCoordinateRegistry` throw
- `custom_missing_required_channel_throws`：自定义 `roles:['x','y']` 但 mark 缺 y 通道 → required-channel 校验 throw（读 definition.roles）

**交互（≥ 2）**：

- `locator_parity_custom_coordinate`：`createPlotLocator` 与 `lowerPlots` 用同一 `coordinates` → 投影落点一致（含自定义坐标系）
- `custom_coordinate_with_guide`：自定义 position 坐标系 + `<Axis>` → 曲线轴经 lowerCustomAxis 正确渲染
- `portable_roundtrip`：含自定义 type 的 spec `JSON.stringify → parse → PlotSpecSchema.parse` round-trip 不丢字段

### 依赖的现有元素

- `resolveFrame`（`pipeline/expand.ts:257`）· 六路 bespoke 分支（`:390/458/508/566/593/614`）—— 修改：六路 → registry 查表 + `definition.resolve`
- `collectValues` / `resolveScaleForRole`（`expand.ts` 闭包）· `resolvePositionScale`（`scale/scale.ts`，ADR-07 后经 registry）· `assertBaselineScaleCompatible`—— 引用 / 抽取：组装 `CoordinateResolveContext`
- `computePlotArea` / `computePolarCoordinate` / `computeTernaryFrame`（`pipeline/layout`）—— 引用：内置 definition resolve 体内布局（包内 import，不进公开 context）
- `createCartesianCoordinate` / `createCartesian1DCoordinate` / `createPolarCoordinate` / `createPolar1DCoordinate` / `createTernary2DCoordinate` / `createCustomCoordinate`（`coordinate/*.ts`）—— 引用：内置 / 自定义 definition resolve 产 frame
- `lowerGuide` / `lowerCustomAxis`（`guide/`）· `GuideContext` / `EMPTY_TICKS` / `TickSet`—— 引用：definition resolve 内 guide 下沉
- `POSITION_ROLES` / `REQUIRED_POSITION_CHANNELS` / `VALID_GUIDE_DIMENSIONS`（`coordinate/constants.ts`）· `assertRequiredPositionChannels` / `assertValidGuideDimensions`（`expand.ts:124/128`）—— 修改：三表删除，校验改读 `definition.roles`
- `CoordinateSchema` + 5 子 schema · `PlotCoordinate`（`ir/coordinate/coordinate.ts`）—— 引用 / 修改：内置 definition 的 schema 直接复用、`BUILTIN_COORDINATE_TYPES` 来源；删 Custom 成员
- `ResolvedCoordinate` / `ResolvedCustomCoordinate` / `DimensionRole` / `AxisFrame`（`coordinate/types.ts`）—— 引用：resolve 产出契约
- `LowerPlotsOptions` / `ResolveFrameParams` / `ResolvedFrame` / `createPlotLocator`（`pipeline/` / `interaction/`）—— 修改：`coordinates` 改 Array、registry 贯穿、parity
- `defineComposite`（core）· ADR-06 `defineTransform` / `resolveTransformRegistry` · ADR-07 `defineScale` / `resolveScaleRegistry`—— 参照：`defineCoordinate` / registry / options 注入范式、键提取、dup / 未注册策略
