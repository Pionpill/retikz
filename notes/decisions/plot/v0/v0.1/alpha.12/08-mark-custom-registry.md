# ADR-08：开放自定义 mark —— CustomMark IR passthrough + 类型无关下沉，补齐 mark 与 coordinate/scale/transform 的扩展对等

- 状态：Proposed
- 决策日期：2026-06-19
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [前置：ADR-03 抽象 mark 模型 + mark registry](./03-mark-abstraction-registry.md) · [对照：ADR-06 transform registry](./06-transform-registry.md) · [对照：ADR-07 scale registry](./07-scale-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

## 背景

alpha.12 把四个可扩展语法层都做成「内置与自定义经同一 registry 分派」：coordinate（ADR-05）、transform（ADR-06）、scale（ADR-07）都给出了 `defineXxx` + `resolveXxxRegistry` + `options.xxxDefinitions` + IR `z.union([Builtin, CustomXxxSchema]).passthrough()` 的完整四件套，用户可注册自定义 type 并写进 PlotSpec。

mark 落后一步。ADR-03 立了内部 `MarkDefinition` + `MARK_REGISTRY`，但**明确推迟**了公开扩展：「本轮不开放公开 registerMark API、也不做 schema registry……公开自定义 mark 时再引入」。本仓后续重构（contract/providers 拆分）已补上运行时机制——`defineMark` / `AnyMarkDefinition` / `resolveMarkRegistry` / `lowerPlots(options.markDefinitions)` / React `<Plot markDefinitions>` 都已落地，`lowerMark` / `collectMarkFields` 也改成 registry 分派。但**机制处于「就位但休眠」**：`schemas/mark.ts` 的 `MarkSchema` 仍是严格的 `z.discriminatedUnion('type', [6 内置])`，`PlotSpec.marks` 只收内置 type，自定义 mark 根本走不进 spec，`markDefinitions` 无处分派。

直接把 `PlotSpec.marks` 放宽到 `z.union([MarkSchema, CustomMarkSchema])` 会暴出一片类型错误：`pipeline/expand.ts` 与 `interaction/locate.ts` 是围绕严格内置 `Mark` 判别 union 写的，直接读 `mark.encoding.x` / `mark.type === PlotMark.Interval`，而 passthrough 的 `CustomMark`（`type: string`）会污染判别 union 收窄——`mark.type === PlotMark.Point` 无法把 CustomMark 排除干净，内置专属字段访问全报错。对比 coordinate/scale/transform 之所以干净：它们的下沉逻辑**全部走 Definition 分派**，expand 从不按内置 type 收窄读字段；mark 的位置值收集、interval bounds、link 端点等还硬编在 expand.ts 里。

## 决策：IR 加 CustomMark passthrough + 把 expand 的 mark 读取改成类型无关

两步：(1) IR 层照 transform/scale 加 `CustomMarkSchema` + `MarkOperationSchema`，`PlotSpec.marks` 收 `MarkOperation`；(2) 把 `pipeline/expand.ts` / `interaction/locate.ts` 里对 mark 的读取改成**类型无关**——通用通道（位置 x/y、color）经统一访问器读取，内置专属几何（interval bounds、link 端点、reference 取向）用 `isBuiltinMark` 类型守卫门控，自定义 mark 自然落到「point 样的位置贡献 + 经 registry 下沉」。

```ts
// schemas/mark.ts —— 照 CustomTransformSchema / CustomScaleSchema
export const BUILTIN_MARK_TYPES = new Set<string>(Object.values(PlotMark));

export const CustomMarkSchema = z
  .object({
    type: z.string().min(1).refine(t => !BUILTIN_MARK_TYPES.has(t), { message: 'custom mark type must not collide with a built-in mark type' }),
    encoding: EncodingSchema.optional(), // 复用共享 encoding：自定义 mark 用同一套 x/y/color 通道参与 scale 推断
  })
  .passthrough()
  .superRefine(jsonSerializableCheck);

export const MarkOperationSchema = z.union([MarkSchema, CustomMarkSchema]);
export type CustomMark = z.infer<typeof CustomMarkSchema>;
export type MarkOperation = z.infer<typeof MarkOperationSchema>;

// providers/mark —— 类型守卫，让 expand 能把内置专属分支收窄干净
export const isBuiltinMark = (mark: MarkOperation): mark is Mark => BUILTIN_MARK_TYPES.has(mark.type);
```

`expand.ts` 改动要点：

- `node.marks` 类型变 `Array<MarkOperation>`；遍历它的函数（`collectValues` / `roleChannelOf` / `roleFieldTypes` / `resolveRoleOrder` / `assertRequiredPositionChannels` / mark 层 `map` / legend 收集）入参改 `MarkOperation`。
- 通用通道访问统一走 `markEncoding(mark): Encoding | undefined`（自定义 mark 的 encoding 与内置共享 `EncodingSchema`）与现有 `markColorChannel`，不再直接 `mark.encoding`。
- 内置专属几何分支（`mark.type === PlotMark.Interval` 读 `bounds`、`PlotMark.Link` 读 `source/target`、`PlotMark.Reference` 取向）前置 `isBuiltinMark(mark)` 守卫，把 union 收窄到精确内置 Mark；自定义 mark 不命中任何内置分支，按通用位置通道（x/y）贡献 scale 域、经 `lowerMark` 的 registry 分派到其 `MarkDefinition.lower`。
- `lowerMark` / `collectMarkFields` 已 registry 分派（前序提交），本轮只把入参类型对齐 `MarkOperation` 并由 `markRegistry`（= `resolveMarkRegistry(options.markDefinitions)`）解析。

理由：

1. **补齐四层扩展对等**：coordinate/scale/transform 都已是「同一 registry、内置与自定义平权、IR passthrough」，mark 是唯一缺口；本 ADR 让 `defineMark` 机制从「休眠」变「可用」，无新增平行机制。
2. **类型无关下沉是正确方向**：mark 的几何随 `mark × coordinate` 解释（ADR-03 主线）；expand 不该按内置 type 硬读字段。改成「通用通道统一读 + 内置几何守卫门控」后，自定义 mark 与内置走同一条收集 / 投影 / 下沉路径，杜绝 N_mark 特判。
3. **不引入 bypass cast**：放宽 `PlotSpec.marks` 后用 `isBuiltinMark` 类型守卫做收窄，而非 `as unknown` 绕过——符合仓库「不用 bypass cast」硬规则。

## 待决策点 🔻

- **自定义 mark 的位置值贡献**：本轮自定义 mark 经**共享 `EncodingSchema` 的 x/y 通道**参与 scale 域收集（与 point/path 同路径）。需要自定义 bounds / 特殊域贡献（如自定义 interval 类）的 mark 暂不支持——倾向后续给 `MarkDefinition` 加可选 `collectPositionValues` 钩子（见「不在本 ADR 范围」）。
- **required-channel 校验**：自定义 mark 是否强制 x/y？倾向**不强制**——由 `MarkDefinition` 自行在 `lower` 内 fail-loud（内置 point/path/region/interval 的必填性保持现状坐标系级校验）。
- **React 创作入口**：v0.1 自定义 mark 经 `<Plot spec={...} markDefinitions={[...]}>`（spec 入口）创作；是否提供通用 `<Mark type=...>` 组件留待 chart/react 层 ADR（见「不在本 ADR 范围」）。

## DSL 表面

```tsx
// 自定义 mark：定义 lower 行为 + 经 spec 入口写进 PlotSpec
const halfBar = defineMark({
  type: 'half-bar',
  collectFields: (mark, fields) => fields.addChannel(mark.encoding?.x) ?? fields.addChannel(mark.encoding?.y),
  lower: (mark, rows, frame, channels, prov) => lowerHalfBars(mark, rows, frame, channels, prov),
});

<Plot
  spec={{ namespace: 'plot', type: 'plot', data: { reference: 'd' }, coordinate: { type: 'cartesian2D', x: 'cat', y: 'val' },
          scales: [{ type: 'band', name: 'cat' }, { type: 'linear', name: 'val' }],
          marks: [{ type: 'half-bar', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }] }}
  data={{ d: rows }}
  markDefinitions={[halfBar]}
/>;
```

## 测试设计

`packages/graph/plot/tests/lower/mark-registry.test.ts`（新建）覆盖：

- schema：`MarkOperationSchema` accept 自定义 type + 内置；自定义 type 撞内置（`'point'`）reject；非 JSON-safe（函数 / NaN）reject。
- registry：`resolveMarkRegistry([custom])` 注册内置 + 自定义；自定义撞内置 type throw；两自定义同 type throw；未注册 type 经 lowerPlots fail-loud。
- 下沉：自定义 mark 经 `markDefinitions` 注入 → 其 `lower` 被调、产出 core IR；自定义 mark 的 x/y 参与 scale 域（与内置 point 同域）。
- 等价性：现有内置 mark demo（point/path/interval/…）在 `MarkOperation` 放宽后 Scene 几何逐字节等价（回归网）。

## 影响

- **`schemas/mark.ts`**：加 `BUILTIN_MARK_TYPES` / `CustomMarkSchema` / `MarkOperationSchema` + `CustomMark` / `MarkOperation` 类型；`MarkSchema` 不变（仍内置 6 union）。
- **`schemas/plot.ts`**：`PlotSpec.marks` 从 `z.array(MarkSchema)` 改 `z.array(MarkOperationSchema)`；`PlotSpec` 推导出的 `marks` 变 `Array<MarkOperation>`。
- **`providers/mark`**：加 `isBuiltinMark` 类型守卫；`MarkDefinition.type` 已是 `string`（前序提交）。
- **`pipeline/expand.ts`**：mark 遍历 / 通道读取改类型无关（`markEncoding` 访问器 + `isBuiltinMark` 守卫）；行为对内置不变。
- **`interaction/locate.ts`**：mark 入参对齐 `MarkOperation`；自定义 mark 非 datum-bearing（type 不在 point/interval）→ locator 自然跳过。
- **core**：无新依赖、不触 core IR 契约。
- **⚠️ 类型（非运行时 BREAKING）**：`PlotSpec.marks` 静态类型从 `Mark[]` 变 `MarkOperation[]`；纯 TS 创作内置 spec 不受影响（内置 Mark 仍是 MarkOperation 成员）。
- **文档站**：plot/grammar/mark 补「自定义 mark」节（defineMark + markDefinitions），与 coordinate/scale/transform 的自定义节对齐。

## 不在本 ADR 范围

- **`MarkDefinition.collectPositionValues` / 自定义 bounds 钩子**：自定义 mark 经特殊域贡献（如自定义区间类 mark 把两字段纳入连续域）留待需求驱动；本轮自定义 mark 只经共享 x/y 通道贡献位置域。
- **通用 `<Mark type=...>` React 组件**：v0.1 自定义 mark 走 spec 入口；通用创作组件归 react/chart 层 ADR。
- **把内置 interval/link/reference 几何也收进 MarkDefinition**：本轮只让自定义 mark 走通用路径 + 内置守卫门控；内置专属几何仍在 expand.ts（彻底收进 Definition 是更大的重构，需求驱动另立）。

---

## 实现契约（必填）🔻

### Level

`red`

判级：动 `packages/graph/plot/src/schemas/**`（mark / plot schema）+ `packages/graph/plot/src/pipeline/**`（下沉到 core IR 的契约边界）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `schemas/mark.ts` | 加 | `BUILTIN_MARK_TYPES` | `Set<string>` | — | 内置 mark type 集合（= `Object.values(PlotMark)`），自定义 mark type 不能与之冲突 |
| `schemas/mark.ts` | 加 | `CustomMarkSchema` | `z.object({type,encoding?}).passthrough()` | — | 自定义 mark operation：type 为非内置标识符，运行时由 `markDefinitions` 的 MarkDefinition 解释；encoding 复用共享 EncodingSchema |
| `schemas/mark.ts` | 加 | `MarkOperationSchema` | `z.union([MarkSchema, CustomMarkSchema])` | — | mark operation union：内置 ∪ 自定义 type passthrough |
| `schemas/plot.ts` | 改 | `PlotSpecSchema.marks` | `z.array(MarkOperationSchema).min(1)` | — | mark 图层：内置 mark 配置或自定义 type passthrough，运行时由 MarkDefinition 校验 |

### 文件 scope

- `packages/graph/plot/src/schemas/mark.ts`（加 CustomMark / MarkOperation）
- `packages/graph/plot/src/schemas/plot.ts`（marks 放宽）
- `packages/graph/plot/src/providers/mark/mark.ts`（加 `isBuiltinMark`）
- `packages/graph/plot/src/pipeline/expand.ts`（mark 读取类型无关化）
- `packages/graph/plot/src/interaction/locate.ts`（mark 入参对齐 MarkOperation）
- `packages/graph/plot/tests/lower/mark-registry.test.ts`（新建）
- `apps/docs/src/contents/plot/grammar/mark/**`（自定义 mark 节，按需）

### 测试象限

> plot alpha milestone 放宽：按复杂度覆盖真实 accept/reject 与几何断言。

**Happy path（≥ 3）**：

- `custom_mark_schema_accepts`：`MarkOperationSchema` accept `{ type:'half-bar', encoding:{...} }`
- `custom_mark_lower_dispatched`：经 `markDefinitions` 注入 → 自定义 `lower` 被调、产 core IR
- `custom_mark_x_contributes_scale_domain`：自定义 mark 的 x/y 与内置 point 同域参与 scale 推断

**边界（≥ 2）**：

- `custom_mark_no_encoding`：自定义 mark 无 encoding → 不贡献位置域、不崩
- `builtin_marks_equivalence`：内置 mark demo 在 MarkOperation 放宽后 Scene 逐字节等价

**错误路径（≥ 2）**：

- `custom_mark_type_collision_rejected`：`{ type:'point' }` 走 CustomMark 分支 reject（撞内置）
- `unregistered_custom_mark_fails_loud`：spec 含自定义 type 但未传 markDefinitions → lowerPlots fail-loud
- `duplicate_mark_registration_throws`：`resolveMarkRegistry` 自定义撞内置 / 两自定义同 type → throw

**交互（≥ 2）**：

- `custom_and_builtin_marks_share_scale`：自定义 mark + 内置 line 同 plot，共享 y scale 域
- `custom_mark_locator_skipped`：自定义 mark 非 datum-bearing，locator datum 解析跳过、不崩

### 依赖的现有元素

- `MarkSchema` / `PlotMark` / `EncodingSchema`（`schemas/mark.ts` / `encoding.ts`）—— 扩展：加 Custom/Operation union，复用共享 encoding
- `CustomTransformSchema` / `CustomScaleSchema`（`schemas/transform.ts` / `scale.ts`）—— 参照：passthrough 形态对齐
- `MarkDefinition` / `defineMark` / `resolveMarkRegistry` / `lowerMark` / `collectMarkFields`（`contract/mark.ts` / `providers/mark`）—— 引用：registry 机制（前序提交）已就位，本轮只对齐入参类型
- `resolveFrame` / `collectValues` / `roleChannelOf` / `markColorChannel`（`pipeline/expand.ts`）—— 修改：mark 读取类型无关化
- `LowerPlotsOptions.markDefinitions`（`pipeline/expand.ts`）—— 引用：自定义 definition 注入入口（前序提交）
