# ADR-07：scale registry —— IR scale ops 与 runtime scale definitions 分层；position / channel 两族分派收敛为 registry；公开 `defineScale` + `options.scaleDefinitions` 扩展点

- 状态：Accepted（核心已实现，2026-06-19；一处 React 糖与一处通道实现细节按 staged 处理，见下）
- 决策日期：2026-06-18
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [ADR-03 mark registry](./03-mark-abstraction-registry.md) · [ADR-05 coordinate registry（同范式样板·三联首篇）](./05-coordinate-registry.md) · [ADR-06 transform registry（同范式样板）](./06-transform-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

> ⚠️ 草案：本 ADR 由 2026-06-18 设计讨论产出，复用 ADR-06 transform 多 LLM 评审沉淀的硬规则（分名分层 / CustomSchema 排除内置 type / 闭合 union + lowering 期校验 / options 注入保 parity）。实现契约为 AI 起草建议稿，待人工 review + 多 LLM 评审后定稿。
> 本 ADR 是「开放扩展 registry 三联」（coordinate 05 / transform 06 / scale 07）的第三篇（末篇）：ADR-05 收敛 coordinate、ADR-06 收敛 transform、本 ADR 收敛 scale，均开放公开扩展（ADR-03 mark 仅内部收敛不开放）。scale 集成面（coordinate 投影 / guide 刻度 / legend 形态 / 类型派生 / compat）比 transform 广，故公开契约比 ADR-06 多一层（legend + compat）。

## 实现状态（2026-06-19，alpha.12）

落地内容与本文设计一致，**两处与草案的偏差需备注**：

1. **命名：`ScaleOp` → `ScaleOperation`。** 与 ADR-05 `CoordinateOperation` / ADR-06 `TransformOperation` 对齐（不用 `Op` 缩写）：schema 名 `ScaleOperationSchema`、类型 `ScaleOperation`、泛型参数 `TScaleOperation`、本地变量 `operation`。本文正文为草案期写法，以代码命名为准。
2. **channel 单一来源的实现取「同 definition 确定性重算」而非「共享单实例」。** mark 取色（`makeColorResolver`）与 legend（`resolveColorLegend`）各自调用同一 `resolveChannelScale(operation, values, ctx, registry)`：definition 纯且确定，相同入参产相同 `ChannelScaleResolution`（`of` / `legendForm` / `domain` / `range` / `edges`），故「实绘 / legend 同源、不漂移」由 definition 纯性保证，代价是各算一次（非共享实例）。原因：共享单实例需把每 (scaleName, field) 的解析缓存穿过 expand → legend 两段，改动面与回归风险更大；当前实现以更低风险达成同源契约。后续若出现性能或多绑定歧义诉求，再引入 per-spec 解析缓存。
3. **builtin scale operation 在 `parseScaleOperation` 直接透传、不再二次 schema parse。** 内置 op 已是精确 `Scale`（`PlotSpecSchema` 静态校验 + `resolve*` 运行时深校验，如 finite domain / 升序断点 / 正 log 域），透传以保留信息化错误消息；仅自定义 op 走 `definition.schema` 深解析 + JSON 双校验。与 ADR-05/06 对内置也 reparse 略有差异，原因是 scale 的 `resolve*` 携带丰富运行时校验、reparse 会以泛化 ZodError 抢先吞掉。

**staged（未随本次落地，已记入版本 roadmap）：** React `<Scale type={customType} ...config>` 糖的自定义 type + 扁平 config 透传。现状：自定义 scale 经**程序化路径**全可用——`<Plot spec={...} scaleDefinitions={[...]} colorSchemes={{...}}>`、`renderPlot(spec, data, { scaleDefinitions, colorSchemes })`、`buildPlotSpec` options 直传；React **声明式 `<Scale>` 糖**仍只接受内置 `PositionScaleType`。原因：`build-plot-spec` 的 scale 装配（`collectExplicitScales` / `buildCartesianXScale` / `buildAngleScale` / band 冲突校验）按内置类型枚举编排，放宽为携带 config 的自定义 op 透传需改动其多函数并补等价性测试，风险高于其余部分，按「channel last + flagged」原则单列。

## 名词分层（贯穿全文，先立后用）

沿用 ADR-06 的核心纠正：**「scale op」与「scale definition」是两层不同的东西，必须分名分层**，否则公开 API 一落地就和现有 `spec.scales` / `<Scale>` 组件撞名。

| 层 | 名称 | 形态 | 进 IR？ | 投递方式 | 谁定义的 |
| --- | --- | --- | --- | --- | --- |
| **scale op** | `spec.scales[i]` | `{ type, name, ...config }` 纯 JSON | **是** | `<Scale dimension=... type=...>`（既有组件）/ 手写 spec；coordinate / channel 按 `name` 引用 | 既有 |
| **scale definition** | `ScaleDefinition` | `{ family, schema, resolve, ... }` 运行时对象（含函数） | **否** | `lowerPlots options.scaleDefinitions` / `<Plot scaleDefinitions={[...]}>` | **本 ADR 新增** |
| **color scheme** | `options.colorSchemes` | `Record<name, (t:number)=>string>` interpolator | **否**（IR 只存 scheme 名串） | `options.colorSchemes` / `<Plot colorSchemes>` | **本 ADR 新增（color 子轴）** |

- **op 的 React authoring 表面复用既有 `<Scale>` 组件**（扩展为接受自定义 `type` 扁平透传，见「影响」），本 ADR 不新增 op 组件。
- **definition 注入口命名 `scaleDefinitions`**——与 `spec.scales`（op 数组）、`<Scale>`（op 组件）、core scope 几何 prop 全程不撞名（ADR-06 命名冲突教训）。

## 背景

`scale` 层现有 13 个内置类型（`ir/scale/scale.ts` 的 `PlotScale` 闭枚举 + `ScaleSchema` 闭合 `discriminatedUnion`），分两大异构族：

- **position 族**（linear / band / point / time / log / pow / sqrt）：value → 坐标数值，产 `PositionScale`（coordinate / bandwidth / ticks / range / setRange，`scale.ts:68`），喂 coordinate 投影 + guide 刻度。
- **channel 族**（ordinal / sequential / diverging / quantize / threshold / quantile）：value → 视觉量（颜色串），产 `ColorScaleEvaluator`（`scale.ts:248`），喂 color 通道 + legend。

分派写死在**多处并行 switch / 硬编码类型集**：

- `resolvePositionScale`（`scale.ts:638`）—— position 族 switch，13 路（非 position 类型逐一 throw）。
- `makeColorResolver`（`expand.ts:733`）—— channel 族 switch，按 `def.type` 选 resolveSequential / Diverging / Quantize / Threshold / Quantile；ordinal 另路。
- `deriveScale`（`scale.ts:586`）—— field type → 默认 scale 类型（type-driven 选型 switch）。
- `assertScaleFieldCompatible`（`scale.ts:602`）/ `assertBaselineScaleCompatible`（`scale.ts:624`）—— 硬编码「连续 / 分类 / 非线性」scale 类型集。
- legend：`expand` 据 `ScaleDescriptor.scaleType`（`channel.ts:29`「决定 legend 形态」）选 `form: 'swatch' | 'ramp'`（`guide.ts:549`）。
- `SCHEME_INTERPOLATORS`（`scale.ts:189`）+ `PlotColorScheme` 闭枚举（`ir/scale/scale.ts:45`）—— 命名配色闭表（独立小长尾）。

两个结构问题（与 transform 同构）：

- **内置 scale / 配色是长尾，写不完。** symlog / 双对数 / 自定义分箱 / 雷达半径 scale、品牌色阶 / 自定义 interpolator scheme……专业可视化的 scale / 配色诉求无穷。全塞内置既膨胀又覆盖不全。
- **分派写死、与仓库注册范式不一致。** core composite 经 `defineComposite` + options 注册、plot 坐标系经 `options.coordinates` 注册、transform 经 ADR-06 `options.transformDefinitions` 注册——scale 没有等价接口，「加一个 scale 要同时改 5 处 switch / 硬编码集」，且无法被用户扩展。

GoG 与同类库都把 scale 当可扩展轴：Vega scale 类型 + scheme 开放、Observable Plot scale options 丰富、d3-scale 本身是开放函数族。

**为什么本轮开公开扩展（而 ADR-03 mark 没开）：** mark 是封闭几何基元集、缺明确长尾；scale / 配色长尾是明确现实需求（symlog / 品牌色阶等）。与 ADR-06 transform 同理由开放。项目处 0.x、本里程碑未发布，按最优设计推进、不留别名。

## 决策：position / channel 两族分派收敛为 registry；内置 13 个降为注册项；公开 `defineScale`（family 判别）+ `options.scaleDefinitions` + `options.colorSchemes`（对齐 composite / coordinate / transform）

### (1) `ScaleDefinition`：family 判别（position vs channel），承载各族异构契约

scale 不是单一 `apply`——position 产坐标数值、channel 产颜色，**产出契约不同**，故 definition 按 `family` 判别（这是本 ADR 与 ADR-06 单一 `apply` 的本质差异）：

```ts
// scale/registry.ts（示意；definition 是运行时对象、含函数，永不进 IR）

/** channel resolve 的共享上下文：value 强转 + 自定义 scheme 解析（**固定公开契约，非待决策**）。values 一律传 raw 原始值，由 definition 自行强转 */
type ChannelResolveContext = {
  /** 绑定字段类型（continuous / temporal / categorical / undefined）；definition 据此选强转方式 */
  fieldType?: PlotFieldTypeValue;
  /** 原始值 → 有限数（非有限 → null）；复用内置数值强转 */
  toNumber: (value: unknown) => number | null;
  /** 原始值 → epoch ms（temporal 字段；非法 → null）；复用内置 coerceTimestamp */
  coerceTimestamp: (value: unknown) => number | null;
  /** scheme 名 → interpolator（先查内置 SCHEME_INTERPOLATORS、再查 options.colorSchemes；未注册 throw） */
  resolveColorScheme: (name: string) => (t: number) => string;
};

/** channel resolve 的产出：实绘 evaluator + legend 同源 descriptor + legend 形态（单一来源，杜绝 domain/range/scheme 重算漂移） */
type ChannelResolution = {
  /** 逐行视觉量：数据值 → 颜色串；非法 → undefined（调用方回退默认） */
  of: (value: unknown) => string | undefined;
  /** legend 与实绘共读的**同一** descriptor（domain / range / field；scaleType 为本 scale 的 type 串） */
  descriptor: ScaleDescriptor;
  /** legend 形态：ramp（连续色带）/ swatch（离散块）——替代「legend 按 scaleType 闭集判 form」 */
  legendForm: 'ramp' | 'swatch';
};

/** position 族：value → 坐标，喂 coordinate 投影 + guide 刻度（经 PositionScale 接口） */
type PositionScaleDefinition<Def extends ScaleOp = ScaleOp> = {
  family: 'position';
  /** 完整 op schema：必须 ZodObject 且 `type` 为 z.literal（registry 据此提取注册键，运行时校验形态） */
  schema: ZodType<Def>;
  /**
   * 字段兼容**谓词**（替代 assertScaleFieldCompatible 的「拒绝规则」集语义——单值 fieldKind 表达不了）。
   * 内置：连续 scale（linear/time/log/pow/sqrt）实现「仅拒 categorical」（同时接 continuous + temporal）、band/point 实现「仅拒 temporal」。
   */
  isFieldCompatible: (fieldType: PlotFieldTypeValue) => boolean;
  /**
   * 能否作 interval / area 的值轴（baseline 含 0）；替代 assertBaselineScaleCompatible。默认 true，log/pow/sqrt → false。
   * ⚠️ v0.1 最小契约：现行 baseline guard 仅按 mark 类型 + 假设 interval/area baseline 含 0；后续若需按 def/domain/baseline/mark role 精判，升为 predicate（AGENTS.md 临时设计——本 ADR Accepted 封板前把此项同步进版本 roadmap）。
   */
  allowsBaseline?: boolean;
  /** 建 PositionScale（coordinate / bandwidth / ticks / range / setRange 全实现）；guide 经 ticks() 自动适配，无需额外 guide 契约 */
  resolve: (def: Def, values: Array<unknown>, fallbackRange: readonly [number, number]) => PositionScale;
};

/** channel 族：value → 视觉量（颜色），喂 color 通道 + legend；resolve **单次**产出 evaluator + descriptor + legendForm */
type ChannelScaleDefinition<Def extends ScaleOp = ScaleOp> = {
  family: 'channel';
  schema: ZodType<Def>;
  /** 字段兼容谓词（如 sequential 接 continuous + temporal、ordinal 接 categorical） */
  isFieldCompatible: (fieldType: PlotFieldTypeValue) => boolean;
  /** 单次建 ChannelResolution：实绘 evaluator + legend 同源 descriptor + legendForm（**不拆 resolve/legend 两函数**，守「实绘 / legend 同源」现有约束，`channel.ts:24`） */
  resolve: (def: Def, values: Array<unknown>, ctx: ChannelResolveContext) => ChannelResolution;
};

type ScaleDefinition<Def extends ScaleOp = ScaleOp> = PositionScaleDefinition<Def> | ChannelScaleDefinition<Def>;

/** 注册一个 scale，保留 resolve 对 Def 的强类型（对齐 core defineComposite / defineTransform） */
const defineScale = <Def extends ScaleOp>(def: ScaleDefinition<Def>): ScaleDefinition => def as ScaleDefinition;
```

要点（含本轮评审的四处修正）：

- **`family` 是核心判别**：registry 按 `type` 建表，`family` 路由到 position 解析（`resolvePositionScale` 内）还是 channel 解析（`makeColorResolver` 内）。两条解析通路都改 registry 查表。
- **position 族无 legend 契约**：position scale 喂 guide / axis，而 guide 经 `PositionScale.ticks()` 已完全抽象——自定义 position scale 实现 ticks() 即被 guide 渲染，无需额外 guide 契约。这是 scale 集成面里唯一已被现有接口吸收的部分。
- **channel `resolve` 单次产出 evaluator + descriptor + legendForm（评审 BLOCKING）**：不拆 `resolve()` / `legend()` 两函数——现有约束是「resolver 与 legend 共读同一 descriptor」（`channel.ts:24`），拆开会让 custom scale 重算 domain/range/scheme、legend 与实绘漂移。legend form 由 `legendForm` 显式给（不再按 `scaleType` 闭集判）。
- **compat 降为 per-definition 谓词 / 标志（评审 BLOCKING）**：`isFieldCompatible(fieldType)` 谓词替代 assertScaleFieldCompatible 的拒绝规则集（单值表达不了「连续 scale 接 continuous + temporal、仅拒 categorical」）；`allowsBaseline` 标志替代 assertBaselineScaleCompatible 的非线性集。registry 据此校验，不再硬编码类型枚举。
- **`ChannelResolveContext` 固定为公开契约（评审 BLOCKING）**：`fieldType` + `toNumber` / `coerceTimestamp` 强转 helper + `resolveColorScheme(name)`；values 一律 raw、definition 自转。**不留待决策**——它是 public runtime API。
- **`ScaleDescriptor.scaleType` 放宽为 string，legend form 只读 `ChannelResolution.legendForm`（评审 BLOCKING）**：现 `scaleType: PlotScaleValue` 闭合（`channel.ts:30`），custom type 无法合法返回 descriptor。改 `scaleType: string`（descriptor 是 lowering 内部类型、不进 IR，放宽无 IR 影响）；legend form 不写进 descriptor，统一由 `ChannelResolution.legendForm` 给出，form 判别职责移出 scaleType。
- **`type` 提取 + 形态校验**：从 `schema.shape.type`（z.literal）提取注册键，首次 resolve 期校验「ZodObject + type literal」否则 throw（mirror composite `extractKey`、transform `extractKind`）。
- **`ScaleDefinition` 泛型自洽（评审 WARNING）**：`type ScaleDefinition<Def extends ScaleOp = ScaleOp> = PositionScaleDefinition<Def> | ChannelScaleDefinition<Def>`（与 ADR-06 `TransformDefinition<Op>` 同形）。
- **`resolve` 纯且确定**：scale 天然纯（value→输出），无随机；与现有 `resolve*` 函数同性质，无新约束。

内置 13 个直接复用 `ir/scale/scale.ts` 现有 schema + `scale.ts` 现有 `resolve*` 函数，零重写——仅包成 `defineScale({ family, schema, resolve, ... })` 注册项。

### (2) registry 解析：内置为底 + definition 注入合并，冲突 / 未注册一律 throw

照 `lowerComposites` / ADR-06 `resolveTransformRegistry` 每次 lowering 现建一张 `type → ScaleDefinition` 表：

```ts
const resolveScaleRegistry = (custom?: Array<ScaleDefinition>): Map<string, ScaleDefinition> => {
  const registry = new Map<string, ScaleDefinition>();
  for (const def of BUILTIN_SCALES) registry.set(extractType(def.schema), def);  // 13 内置
  for (const def of custom ?? []) {
    const type = extractType(def.schema);
    if (registry.has(type)) throw new Error(`lowerPlots: duplicate scale registration: '${type}'`);
    registry.set(type, def);
  }
  return registry;
};
```

- **type 冲突 → throw**（含自定义撞内置、两自定义互撞）：mirror composite / transform。
- **未注册 type → throw**：scale 是结构性的（coordinate 投影 / 通道取色都依赖它），未知 type 无法投影、必须 fail-fast（与 transform 未注册 throw 同理；非 composite 的 warn+skip）。
- scale 按 `name` 引用（coordinate.x = scaleName、channel.scale = scaleName）：per-spec `scaleByName` 映射不变，registry 只负责 `type → definition`（行为），不持有 name。
- registry 在 `prepareRows` / `resolveFrame` 共享路径从 `options.scaleDefinitions` 解析，expand 与 locator 用同一张表（**locator parity by construction**——`resolveFrame` 已被 `createPlotLocator` 复用，scale 投影单一真源）。

### (3) IR schema：闭合 union 静态精确校验内置 + 仅未知 type passthrough

`ir/scale/scale.ts` 仍是 schema 静态单一真源，**不**由 registry 动态组装。内置 `ScaleSchema` 保持闭合 13-`discriminatedUnion`；自定义 type 经**排除全部内置 type** 的 passthrough 占位接纳，精确校验延到 lowering（mirror ADR-06 评审 BLOCKING——passthrough 必须排除内置，否则吞掉内置 scale 的非法配置、退化静态校验）：

```ts
const BUILTIN_SCALE_TYPES = new Set<string>(Object.values(PlotScale));

const CustomScaleSchema = z
  .object({ type: z.string().min(1).refine(t => !BUILTIN_SCALE_TYPES.has(t), { message: 'custom scale type must not collide with a built-in scale type' }), name: z.string().min(1) })
  .passthrough()
  .describe('Custom scale op: type is any non-built-in identifier; its config is validated at lowering time against the matching ScaleDefinition supplied via options.scaleDefinitions');

const ScaleOpSchema = z.union([ScaleSchema, CustomScaleSchema]);
type ScaleOp = z.infer<typeof ScaleOpSchema>;
```

`PlotSpecSchema.scales`（`ir/plot.ts`）从 `z.array(ScaleSchema)` 改 `z.array(ScaleOpSchema)`。导出的 `Scale`（内置 13-union）不变——内部 resolve*/穷尽处理仍用精确 `Scale`；registry 与 spec 字段用 `ScaleOp`。含自定义 type 的 spec 过 `PlotSpecSchema.parse` 且 JSON round-trip 不丢字段。

### (4) 自定义命名配色 scheme（color 子轴）

`PlotColorScheme` 闭枚举 + `SCHEME_INTERPOLATORS` 闭表是独立小长尾——用户想要品牌色阶 / d3 之外的 interpolator。开 `options.colorSchemes?: Record<string, (t: number) => string>`（name→interpolator 纯函数表，无 schema / type 提取，故用 `Record` 而非 Array<Definition>——区别于 coordinate/transform/scale 的 typed-op 注册；详见 ADR-05「Record/Array 边界」；interpolator 函数不进 IR，IR 只存 scheme 名串）。为避免自定义 scheme 在静态 `PlotSpecSchema.parse` 阶段被 `z.enum(PlotColorScheme)` 拦住，IR 的各 `scheme` 字段从闭合 enum 改为 `ColorSchemeNameSchema = z.string().min(1)`；`PlotColorScheme` 与 `SCHEME_INTERPOLATORS` 仍保留为内置 scheme 名单。lowering 解析 `scheme` 名时：先查内置 `SCHEME_INTERPOLATORS`、再查 `options.colorSchemes`，未命中 throw。sequential / diverging / quantize / threshold / quantile 与自定义 channel scale 均可引用自定义 scheme 名。

理由：

1. **options 注入是仓库既有范式**（composite / coordinate / transform），不另造全局单例；locator parity 经 `resolveFrame` 复用天然成立。
2. **family 判别准确切分异构产出**：position（坐标 + ticks，喂 coordinate/guide）vs channel（颜色 + legend）契约不同，强行统一成单一 `resolve` 会丢信息；family 让两族各自完整、registry 单表。
3. **闭合 union（排除内置 type）+ lowering 期精确校验 + per-definition compat 标志**复用 ADR-06 已评审范式，内置静态精确性零损失、硬编码类型集消解为 registry 元数据。

## 待决策点 🔻

- **（已定，移出待决策）channel value 强转 + scheme 上下文**：固定为 `ChannelResolveContext`（`fieldType` + `toNumber` / `coerceTimestamp` + `resolveColorScheme`），values 一律 raw、definition 自转。详见「决策 (1)」——它是 public runtime API，不悬空。
- **自定义 scale 是否参与 type-driven `deriveScale` 默认派生**：倾向**否**——`deriveScale`（field type → 默认 scale）保持内置（continuous→linear、temporal→time、categorical→band）。自定义 scale 仅显式 `<Scale type="...">` / spec 引用，不自动派生（避免「两个自定义 scale 都声称 continuous 默认」的歧义）。需求出现再加「派生优先级」元数据。
- **position 族 fallbackRange / setRange 契约**：自定义 position scale 必须实现 `setRange`（expand 在 plotArea 定后收敛 range，`expand.ts:649`）。倾向把 `PositionScale` 接口原样作契约（已是 coordinate/guide 唯一消费面），文档强调五个成员全实现，缺一 fail（运行时 duck-typing 或类型层强约束）。
- **channel 族覆盖 size/opacity/shape 隐式通道 scale 否**：`channel.ts` 的 size（sqrt）/ opacity（linear）/ shape（ordinal 调色板）是**通道编码逻辑**、内部合成 scale，不经 `spec.scales`。倾向**不纳入本轮**——本 ADR 开「具名 scale（coordinate + color 通道引用）」registry；隐式通道 scale 保持内置（见「不在范围」）。
- **type 冲突放宽 / extractType 时机**：与 ADR-06 同——本轮冲突 throw、`extractType` 首次 resolve 期校验。

## DSL 表面

```ts
import { z } from 'zod';
import { defineScale, renderPlot, type PositionScale } from '@retikz/plot';

// 自定义 symlog position scale：value → 坐标，喂 coordinate + guide
const symlog = defineScale({
  family: 'position',
  schema: z.object({ type: z.literal('symlog'), name: z.string().min(1), constant: z.number().positive().optional(), domain: z.tuple([z.number(), z.number()]).optional() }),
  isFieldCompatible: fieldType => fieldType !== 'categorical',
  allowsBaseline: true,                                   // symlog 过 0，可作值轴
  resolve: (def, values, fallbackRange): PositionScale => buildSymlogPositionScale(def, values, fallbackRange),
});

// op：纯 JSON，进 spec.scales——只有配置、无函数
const spec = {
  namespace: 'plot', type: 'plot',
  data: { reference: 'series' },
  scales: [{ type: 'symlog', name: 'y', constant: 1 }],   // 自定义 op，与内置 linear/band… 同形
  coordinate: { type: 'cartesian2D', y: 'y' },
  // ...marks
};

// definition + 自定义配色经 options 注入；内置 13 个 + 内置 scheme 恒可用
renderPlot(spec, { series: rows }, {
  scaleDefinitions: [symlog],
  colorSchemes: { brand: t => `hsl(210, 80%, ${100 - t * 60}%)` },
});
```

```tsx
// React：op 走既有 <Scale>（含自定义 type）；definition 走新 scaleDefinitions（不撞 scales）
<Plot data={rows} scaleDefinitions={[symlog]} colorSchemes={{ brand: brandInterpolator }}>
  <Scale dimension="y" type="symlog" />
  <PathMark x="t" y="v" />
</Plot>
```

## 测试设计

`packages/graph/plot/tests/scale/registry.test.ts`（新建）+ `tests/lower/scale*.test.ts`（既有，加 registry parity）+ `tests/lower/data-portability.test.ts`（自定义 type round-trip）+ `tests/interaction/*`（locator parity）+ legend 测试覆盖：

- 13 内置经 registry 分派与旧 switch 产物逐字节等价（position 投影 + channel 取色两路）
- 自定义 position scale 注入后 coordinate 投影 + guide ticks 生效；自定义 channel scale 取色 + legend（ramp/swatch）生效
- 未注册 / type 冲突 / 自定义 config 不合 schema / schema 形态非法 → 各自清晰 throw
- 内置 type 字段非法在静态 `PlotSpecSchema.parse` 即抛（CustomScaleSchema 不接住）；未知 type 过静态、lowering 校验
- `isFieldCompatible` / `allowsBaseline` 驱动 compat：自定义 scale 配错字段类型 / 作非法值轴 → fail-loud
- 自定义 colorScheme 名解析；未注册 scheme 名 → throw
- locator 与 lowering 用同一 `scaleDefinitions` → 投影落点 parity

具体见「实现契约 § 测试象限」。

## 影响

- **`scale/registry.ts`（新建）**：`ScaleDefinition`（position | channel 判别）/ `ChannelResolveContext` / `defineScale` / `extractType` / `resolveScaleRegistry` / `BUILTIN_SCALES`（13 内置注册项）。
- **`scale/scale.ts`**：`resolvePositionScale` switch → registry 查表（按 family='position' 路由）；`resolve*` 函数体不变（包成注册项）；`deriveScale` 保持内置；`assertScaleFieldCompatible` / `assertBaselineScaleCompatible` 改读 registry 的 `isFieldCompatible` / `allowsBaseline`；`SCHEME_INTERPOLATORS` 解析加 `options.colorSchemes` 回退。
- **`scale/channel.ts`**：size/opacity/shape 隐式通道 scale **不变**（不纳入本轮）。`ScaleDescriptor` 改动（评审 BLOCKING）：`scaleType: PlotScaleValue` → `scaleType: string`（放宽接纳自定义 type；descriptor 是 lowering 内部类型、不进 IR）；legend form 不进 descriptor，统一由 `ChannelResolution.legendForm` 提供。
- **`pipeline/expand.ts`**：`makeColorResolver` channel switch → registry 查表（family='channel'，调 `def.resolve` 单次产出 evaluator + descriptor + legendForm）；`LowerPlotsOptions` 加 `scaleDefinitions?: Array<ScaleDefinition>` + `colorSchemes?: Record<string, (t:number)=>string>`；`prepareRows` / `resolveFrame` 解析 registry 并贯穿。
- **`guide/guide.ts`**：legend form 选择从「据 `scaleType` 闭集判」改为「据 `ChannelResolution.legendForm` 判」——内置 13 个行为等价，自定义 channel scale 据此可渲染 legend，且 descriptor 与实绘同源（不重算）。
- **`ir/scale/scale.ts`**：加 `BUILTIN_SCALE_TYPES` / `CustomScaleSchema`（type 排除内置）/ `ScaleOpSchema` / `ScaleOp`；`scheme` 字段改读 `ColorSchemeNameSchema = z.string().min(1)` 以允许自定义 scheme 名；`ScaleSchema` / `Scale`（内置 13-union）不变。
- **`ir/plot.ts`**：`scales` 字段 `ScaleSchema` → `ScaleOpSchema`。
- **`interaction/locate.ts`**：经 `resolveFrame` 复用同一 registry（parity），多数情况无需直接改（registry 已贯穿 resolveFrame 入参）。
- **`@retikz/plot` 导出**：`defineScale` / `ScaleDefinition` / `PositionScaleDefinition` / `ChannelScaleDefinition` / `ChannelResolveContext` / `ScaleOp`（`PositionScale` 已导出）。
- **react `Plot.tsx` + `components/scales.tsx` + `build-plot-spec.ts`**：`scaleDefinitions` / `colorSchemes` 经 `LowerPlotsOptions` 透传（mirror `coordinates`）。`<Scale>` 的 `type` 从闭合 `PositionScaleType` 放宽为 **`PositionScaleType | (string & {})`**（评审 WARNING）——`string & {}` 既接受任意自定义 type 串、又**保留内置 type 的自动补全提示**；非内置 type 走「`type` + 扁平剩余 props 透传成 op」（lowering 期 definition.schema 校验），`buildPositionScale` / `buildColorScale` 对未识别 type 透传不报错。
- **vanilla**：`renderPlot` 第三参即 `LowerPlotsOptions`，加 `scaleDefinitions` / `colorSchemes` 后自动生效（仅类型 / 测试）。
- **文档站**：scale 章节加「自定义 scale / `defineScale`（position vs channel 两族）」+「自定义配色 scheme」小节 + legend 契约说明 + demo；双语同步。
- **⚠️ 注意（非 BREAKING）**：`Scale` 导出类型不变；`PlotSpec['scales']` 元素类型从精确 13-union 放宽为 `ScaleOp`（含 `{ type: string; name: string; ... }`，type 排除内置）。检查对 `spec.scales` 元素做穷尽 `switch` 的消费方，确保有 default 或改用 `Scale` 窄化。core 无新依赖、不触 core IR 契约。

## 不在本 ADR 范围

- **具体新增 scale 类型 / 配色**（symlog / radial / 品牌色阶…）：本轮只立扩展点，不补长尾内置。
- **size / opacity / shape / strokeWidth 隐式通道 scale 公开化**：这些是通道编码逻辑（内部合成 sqrt/linear/ordinal），不经 `spec.scales`、不在本轮 registry；本 ADR 开「具名 scale（coordinate + color 通道按 name 引用）」扩展。后续按需另立。
- **自定义 scale 参与 type-driven `deriveScale` 默认派生**：本轮自定义 scale 仅显式引用，`deriveScale` 保持内置默认。
- **op authoring 新组件**：op 走既有 `<Scale>`，本 ADR 仅扩其接受自定义 type。
- **跨运行时 portable definition schema 注册中心**：本轮经 `options.scaleDefinitions` 在 lowering 期校验，足够。
- **type 冲突 = last-wins 覆盖内置**：本轮冲突 throw。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review + 多 LLM 评审后定稿。

### Level

`red`

判级：动 `packages/graph/plot/src/ir/**`（`ir/scale/scale.ts` + `ir/plot.ts`）+ `packages/graph/*/src/index.ts`（导出 `defineScale`）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/scale/scale.ts` | 加 | `BUILTIN_SCALE_TYPES` | `Set<string>`（= `Object.values(PlotScale)`） | — | 内置 scale type 集，供 CustomScaleSchema 排除（非 zod、模块常量） |
| `ir/scale/scale.ts` | 加 | `ColorSchemeNameSchema` | `z.string().min(1)` | — | scheme 名称字段：内置 scheme 与自定义 `options.colorSchemes` 名称都可静态通过；未注册名 lowering 期 fail-loud |
| `ir/scale/scale.ts` | 改 | `*.scheme` | `ColorSchemeNameSchema.optional()`（替代 `z.enum(PlotColorScheme).optional()`） | 各 scale 现有默认不变 | color scheme 字段从闭合内置枚举放宽为非空字符串，支持自定义命名配色 |
| `ir/scale/scale.ts` | 加 | `CustomScaleSchema` | `z.object({ type: z.string().min(1).refine(非内置), name: z.string().min(1) }).passthrough()` | — | 自定义 scale 占位：type 为非内置标识 + name；config 透传；lowering 期按 definition.schema 精确校验 |
| `ir/scale/scale.ts` | 加 | `ScaleOpSchema` | `z.union([ScaleSchema, CustomScaleSchema])` | — | spec 层 scale op：内置精确 13-union ∪ 自定义占位 |
| `ir/scale/scale.ts` | 加 | `ScaleOp` | `z.infer<typeof ScaleOpSchema>` | — | scale op 类型（内置 ∪ 自定义） |
| `ir/scale/scale.ts` | 不变 | `ScaleSchema` / `Scale` / `PlotScale` | `z.discriminatedUnion('type', [13])` | — | 内置 13-union 保持闭合、类型精确 |
| `ir/plot.ts` | 改 | `PlotSpecSchema.scales` | `z.array(ScaleOpSchema)` | — | scale 列表接受自定义 type（原 `z.array(ScaleSchema)`） |

> 运行时 `ScaleDefinition` / `defineScale` / `LowerPlotsOptions.{scaleDefinitions,colorSchemes}` 是行为对象、不进 IR，故不在 zod schema 表，见「文件 scope」。
> 字段名一旦写死，下游不允许改；需改回本 ADR 加条或开新 ADR。

### 文件 scope

- `packages/graph/plot/src/ir/scale/scale.ts`（改：加 Custom/Op schema + 内置 type 集 + 类型；`scheme` 字段放宽为 `ColorSchemeNameSchema`；`ScaleSchema` union 成员不变）
- `packages/graph/plot/src/ir/plot.ts`（改：`scales` 字段换 `ScaleOpSchema`）
- `packages/graph/plot/src/scale/registry.ts`（新建：`ScaleDefinition` / `ChannelResolveContext` / `defineScale` / `extractType` / `resolveScaleRegistry` / `BUILTIN_SCALES`）
- `packages/graph/plot/src/scale/scale.ts`（改：`resolvePositionScale` → registry 查表；compat assert 读 registry 元数据；scheme 解析加 colorSchemes 回退；`resolve*` 包成注册项）
- `packages/graph/plot/src/scale/channel.ts`（改：`ScaleDescriptor.scaleType` 放宽为 string；隐式通道 scale 不动）
- `packages/graph/plot/src/scale/index.ts`（改：导出 `defineScale` / 类型）
- `packages/graph/plot/src/pipeline/expand.ts`（改：`makeColorResolver` → registry 查表；`LowerPlotsOptions.{scaleDefinitions,colorSchemes}`；`prepareRows` / `resolveFrame` 解析 + 贯穿 registry）
- `packages/graph/plot/src/guide/guide.ts`（改：legend form 据 `ChannelResolution.legendForm` 选，非 scaleType 闭集）
- `packages/graph/plot/src/interaction/locate.ts`（改 / 验证：经 resolveFrame 用同一 registry 保 parity）
- `packages/graph/plot/src/index.ts`（改：re-export `defineScale` / 类型）
- `packages/graph/plot-react/src/Plot.tsx` + `components/scales.tsx` + `components/build-plot-spec.ts`（改：`scaleDefinitions` / `colorSchemes` 透传；`<Scale>` 接受自定义 type 扁平透传；build*Scale 透传自定义 type）
- `packages/graph/plot/tests/scale/registry.test.ts`（新建）· `tests/lower/scale*.test.ts`（改）· `tests/lower/data-portability.test.ts`（改）· `tests/interaction/*`（改）· legend 测试（改 / 新建）
- `apps/docs/src/contents/.../scale/*.mdx` + `*.demo.tsx`（改 / 新建：`defineScale` 两族 + 自定义 scheme + demo，双语）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，覆盖真实有意义的 accept/reject 与产物断言。

**Happy path（≥ 3）**：

- `builtin_position_parity`：7 position 内置经 registry 分派，PositionScale 投影 + ticks 与旧 switch 逐字节等价
- `builtin_channel_parity`：6 channel 内置经 registry 分派，ColorScaleEvaluator + legend form 与旧 switch 等价
- `custom_position_scale_projects`：注册 symlog、spec 含 `{ type:'symlog', name:'y' }` → coordinate 投影 + guide ticks 生效

**边界（≥ 2）**：

- `custom_channel_legend_ramp_swatch`：自定义 channel scale `resolve()` 产 `legendForm: 'ramp' | 'swatch'` → legend 各自正确渲染，且 descriptor 与 `of()` 实绘同源（同一 domain/range，不漂移）
- `custom_color_scheme_resolves`：`options.colorSchemes.brand` 被 sequential `scheme:'brand'` 引用 → 取色生效

**错误路径（≥ 2）**：

- `unknown_scale_type_throws`：spec 引用未注册 type → lowering throw 清晰错（非静默）
- `duplicate_scale_type_throws`：`scaleDefinitions` 与内置同 type / 两自定义同 type → throw
- `builtin_bad_field_static_reject`：`{ type:'linear', name:'y', domain:['a','b'] }` → 静态 `PlotSpecSchema.parse` 即抛（CustomScaleSchema 不接住）
- `custom_field_compatible_predicate_fails`：自定义 position scale `isFieldCompatible` 拒绝 categorical 字段 → fail-loud
- `custom_baseline_incompatible_fails`：`allowsBaseline:false` 的自定义 scale 作 interval 值轴 → fail-loud
- `unknown_color_scheme_throws`：引用未注册 scheme 名 → throw
- `malformed_scale_schema_throws`：definition.schema 非 ZodObject / `type` 非 literal → `resolveScaleRegistry` throw

**交互（≥ 2）**：

- `locator_parity_custom_scale`：`createPlotLocator` 与 `lowerPlots` 用同一 `scaleDefinitions` → 投影落点一致
- `custom_position_with_guide`：自定义 position scale + `<Axis>` → ticks / 标签经 PositionScale.ticks() 正确渲染
- `custom_channel_with_legend`：自定义 channel scale + `<Legend>` → swatch/ramp + descriptor domain/range 正确
- `portable_roundtrip`：含自定义 type 的 spec `JSON.stringify → parse → PlotSpecSchema.parse` round-trip 不丢字段

### 依赖的现有元素

- `resolvePositionScale`（`scale/scale.ts:638`）· `makeColorResolver`（`expand.ts:733`）—— 修改：两族 switch → registry 查表
- `resolveLinearScale` / `resolveBandScale` / `resolvePointScale` / `resolveTimeScale` / `resolveLogScale` / `resolvePowScale` / `resolveSqrtScale` / `linearPositionScale` / `bandPositionScale` / `pointPositionScale` / `timePositionScale` / `continuousPositionScale`（`scale/scale.ts`）—— 引用：position 内置 definition 的 `resolve`
- `resolveOrdinalScale` / `resolveSequentialColorScale` / `resolveDivergingColorScale` / `resolveQuantizeColorScale` / `resolveThresholdColorScale` / `resolveQuantileColorScale` / `sampleSchemeColors`（`scale/scale.ts`）—— 引用：channel 内置 definition 的 `resolve`（单次产 evaluator + descriptor + legendForm）
- `PositionScale` / `TickSet` / `ColorScaleEvaluator`（`scale/scale.ts`）· `ScaleDescriptor`（`scale/channel.ts`）—— 引用：position / channel definition 的产出契约
- `deriveScale` / `assertScaleFieldCompatible` / `assertBaselineScaleCompatible`（`scale/scale.ts`）—— 修改：compat 改读 registry `isFieldCompatible` / `allowsBaseline`；deriveScale 保持内置
- `SCHEME_INTERPOLATORS` / `PlotColorScheme` / `ColorSchemeNameSchema`（`scale/scale.ts` / `ir/scale/scale.ts`）—— 修改 / 引用：scheme schema 放宽为非空字符串，解析加 colorSchemes 回退；`BUILTIN_SCALE_TYPES` 来源 `PlotScale`
- `ScaleSchema` + 13 子 schema（`ir/scale/scale.ts`）—— 引用：内置 definition 的 schema 直接复用
- `LegendInput.form` / `lowerLegend`（`guide/guide.ts:544`）· `ScaleDescriptor`（`channel.ts:26`，`scaleType` 放宽 string）—— 修改：form 据 `ChannelResolution.legendForm` 选，descriptor 实绘 / legend 同源
- `LowerPlotsOptions` / `prepareRows` / `resolveFrame` / `createPlotLocator`（`pipeline/` / `interaction/`）—— 修改：加 options + registry 贯穿，parity
- `<Scale>` / `ScaleProps` / `buildPositionScale` / `buildColorScale`（react `components/scales.tsx` / `build-plot-spec.ts`）—— 修改：接受自定义 type 透传
- `defineComposite`（core）· ADR-06 `defineTransform` / `resolveTransformRegistry` · `options.coordinates`（`expand.ts`）—— 参照：`defineScale` / registry / options 注入范式、键提取、dup / 未注册策略
