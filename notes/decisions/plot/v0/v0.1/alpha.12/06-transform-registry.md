# ADR-06：transform registry —— IR transform operations 与 runtime transform definitions 分层；两处 switch 收敛为 registry；公开 `defineTransform` + `options.transformDefinitions` 扩展点

- 状态：Proposed
- 决策日期：2026-06-18
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [同里程碑 ADR-01 bin/aggregate（`<Transform>` 表面源头）](./01-bin-aggregate.md) · [ADR-02 derive/normalize/jitter](./02-derive-normalize-jitter.md) · [ADR-03 mark registry](./03-mark-abstraction-registry.md) · [ADR-05 coordinate registry（同范式样板·三联首篇）](./05-coordinate-registry.md) · [ADR-07 scale registry（同范式样板）](./07-scale-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

> 本 ADR 是「开放扩展 registry 三联」（coordinate 05 / transform 06 / scale 07）的第二篇：ADR-05 收敛 coordinate、本 ADR 收敛 transform、ADR-07 收敛 scale，均开放公开扩展（ADR-03 mark 仅内部收敛不开放）。下方「分名分层 / CustomSchema 排除内置 / 闭合 union + lowering 校验 / options 注入」诸硬规则为三联共享。

> ⚠️ 草案：本 ADR 由 2026-06-18 设计讨论产出、并据同日多 LLM 评审反馈修订一轮（分名分层 / schema 收口 / provenance 契约 / 字段契约 / React 表面对齐 ADR-01）。实现契约为 AI 起草建议稿，待人工 review 后定稿。
> 本 ADR 同时动引擎层（`transform/` + `pipeline/` + `interaction/`）、IR schema（`ir/transform/` + `ir/plot.ts`）与公开表面（`@retikz/plot` 导出 + react `<Plot transformDefinitions>` + docs）。与 ADR-03 不同——ADR-03 只立内部 mark registry、**不开放**公开 `registerMark`；本 ADR 在 registry 收敛之外**一并开放**公开扩展点，理由见「背景」末段。

## 名词分层（贯穿全文，先立后用）

本 ADR 最核心的纠正：**「数据变换 operation」与「变换处理器 definition」是两层不同的东西，必须分名分层**，否则公开 API 一落地就和现有 `core scope.transforms`（几何变换）/ `dataTransforms`（ADR-01 数据管线直传）/ `<Transform>`（ADR-01 声明组件）互相踩。

| 层 | 名称 | 形态 | 进 IR？ | 投递方式 | 谁定义的 |
| --- | --- | --- | --- | --- | --- |
| **transform operation** | `spec.transform[i]` | `{ kind, ...config }` 纯 JSON | **是** | `<Transform kind="...">`（ADR-01 组件）/ `dataTransforms` 直传（ADR-01）/ 手写 spec | ADR-01/02 已落地 |
| **transform definition** | `TransformDefinition` | `{ schema, inputFields?, outputFields?, apply }` 运行时对象（含函数） | **否** | `lowerPlots options.transformDefinitions` / `<Plot transformDefinitions={[...]}>` | **本 ADR 新增** |
| core 几何 transform | `scope.transforms` | translate / rotate（`@retikz/core` ScopeProps） | 是（core IR） | `<Plot transforms>`（`PlotPanelProps`，`Plot.tsx:7`） | core 既有，**不占用** |

- **operation 的 React authoring 表面已由 ADR-01 拍定，本 ADR 不新增组件、不延后**：自定义 kind 的 operation 经**同一个** `<Transform kind="regression" x="year" y="value" />` 或 `dataTransforms` 直传（见「影响」对 build-plot-spec 的小扩展）。为让类型层与 schema 放宽一致，React 的 `TransformProps` 与 `dataTransforms` 从内置 `Transform` 放宽为 `TransformOperation`；导出的 `Transform` 类型仍保留为内置 7-union，供内部穷尽处理使用。
- **本 ADR 只新增 definition 注入口**，命名 `transformDefinitions`——与 `transforms`（几何）、`dataTransforms`（operation 直传）三者全程不撞名。

## 背景

`transform` 层现有 7 个内置变换：`sort` / `stack`（alpha.3）+ `bin` / `aggregate` / `normalize` / `derive-interval` / `jitter`（alpha.12 ADR-01/02）。它们的分派**写死在两个并行 `switch(transform.kind)`**：

- `applyTransforms`（`transform/transform.ts:62`）—— 按 kind 折叠应用，7 个 case。
- `collectTransformFields`（`transform/transform.ts:19`）—— 另一个并行 switch，告诉 data 模块每个 transform **读哪些源字段**、**产哪些派生字段**（`pipeline/source-fields.ts` → `prepareRows`（`expand.ts:1138`）→ strict model 校验，派生字段从校验集排除）。
- locator（`interaction/locate.ts:84`）复用 `applyTransforms`，命中预演与渲染走同一通道。

两个结构问题：

- **内置统计变换是长尾，写不完。** 回归 / kde / cluster / boxplot / loess / quantile / 自定义平滑……每个专业领域都有自己的统计算子。全塞进 core plot 既会让内置集无限膨胀、又永远覆盖不全；官方也不该为长尾承担稳定语义 + 文档 + 测试负担。用户要的是**扩展点**，而非更长的内置清单。
- **两个 switch 是手写并行分派，与仓库既有注册范式不一致。** core 的 Tier 2 composite 经 `defineComposite` + `CompileOptions.composites` 注册分派（`composites/define.ts`、`compile/composite.ts`）；plot 自定义坐标系经 `options.coordinates` 工厂注册（`pipeline/expand.ts`）。transform 没有等价接口，「加一个 transform 要回头同时改两个 switch」，且无法被用户扩展。ADR-03 已把 mark 分派收敛进内部 registry——transform 是同一动作的另一半。

GoG 与同类库都不把统计当封闭集合：Vega/Vega-Lite 开放 transform 类型表、Observable Plot 是可组合函数、G2 的 transform / 统计 geometry 可注册扩展。

**为什么 transform 开放公开扩展点、而 ADR-03 mark registry 不开放（有意的不对称）：** mark 是相对**封闭**的几何基元集（6 个已覆盖数据几何全谱），自定义 mark 注入契约体量大且缺明确长尾需求，故 ADR-03 只立内部 registry。transform 相反——统计长尾是**当下明确的现实需求**（驱动本 ADR 的原始诉求即「内置永远写不完」）。两个 registry 的开放节奏按「是否存在长尾扩展需求」分别判。项目处 0.x、本里程碑未发布，按最优设计推进、不为旧写法保留别名。

## 决策：两 switch 收敛为 registry；内置 7 个降为内置注册项；公开 `defineTransform` + `options.transformDefinitions` 注入（对齐 composite/coordinate），IR operations 与 runtime definitions 分层

### (1) `TransformDefinition` + `defineTransform`：对齐 `defineComposite`，含 provenance 上下文与字段契约

```ts
// transform/registry.ts（示意；definition 是运行时对象、含函数，永不进 IR）

/** apply 上下文：暴露 provenance helper，让改行数 / 生成行 transform 维持 datum 溯源 + locator 语义 */
type TransformContext = {
  /** 读单行源序标记（行级 provenance；未开 provenance 时恒 undefined） */
  readSourceIndex: (row: ExternalRow) => number | undefined;
  /** 读组级源序标记（bin / aggregate 类输出行的来源行集合） */
  readSourceIndices: (row: ExternalRow) => Array<number> | undefined;
  /** 给一个改行数输出行打组级源序标记（best-effort：成员行无标记 / 未开 provenance 时原样返回） */
  groupProvenance: (out: ExternalRow, members: Array<ExternalRow>) => ExternalRow;
};

type TransformDefinition<TOperation extends TransformOperation = TransformOperation> = {
  /** 完整 operation schema：必须是 ZodObject 且 `kind` 为 z.literal（registry 据此提取注册键，运行时校验形态） */
  schema: ZodType<TOperation>;
  /** 该 operation 消费的源字段名 → 纳入 strict model 校验集（必须存在于 data.model） */
  inputFields?: (operation: TOperation) => Array<string>;
  /**
   * 该 operation 产出的派生字段名 → 从 strict model 校验集排除。
   * **硬契约**：凡产出、且会被下游 mark / 后续 transform 消费的字段，在声明 data.model 时**必须**在此登记，
   * 否则该字段被 strict model 当未知源字段提前 fail-loud（与内置 stack 的 startField/endField、bin 的 binStart 等同理）。
   */
  outputFields?: (operation: TOperation) => Array<string>;
  /** 真正执行；**必须纯且确定**（同输入恒同输出）——否则破坏 SSR / locator parity。ctx 提供 provenance helper */
  apply: (rows: Array<ExternalRow>, operation: TOperation, context: TransformContext) => Array<ExternalRow>;
};

/** 注册一个 transform，保留 apply / fields 对 operation 的强类型（对齐 core defineComposite） */
const defineTransform = <TOperation extends TransformOperation>(def: TransformDefinition<TOperation>): TransformDefinition =>
  def as TransformDefinition;
```

三个相对首版的关键修正（均源自评审）：

- **`apply` 恢复 `ctx` 参（provenance 契约）**：内置 bin / aggregate 现在经 `withGroupProvenance`（`group.ts:59`）给输出行打 `SOURCE_INDICES`（`provenance.ts:23`），mark 下沉读出写进 `datumMeta.sourceIndices`（`provenance.ts:116`、`mark/mark.ts:160`）。自定义改行数 transform 必须能做同样的事，否则产出行丢 provenance、locator / per-datum meta 静默降级。**provenance 支持等级**（写进文档 + 测试）：
  - **保行数 + 透传行对象**（`{ ...row, newField }`）：`SOURCE_INDEX`（symbol 键）随 object spread 自动存活（`provenance.ts:35` 注释），逐行 provenance **零成本自动保留**。
  - **改行数（reduce / 分箱）**：用 `ctx.groupProvenance(out, members)` 给每个输出行挂组级来源，与内置 bin / aggregate 等价。
  - **生成行（如回归拟合线，无 1:1 源行）**：无源行可挂，provenance 天然降级为「仅 transformedIndex 可定位、无 sourceIndex」——这是固有语义、文档显式说明，非缺陷。
- **`collectFields` 拆为 `inputFields` / `outputFields`（纯函数返数组）**：不向用户暴露内部 `FieldCollector` 类型；输入 / 输出双向语义显式。`outputFields` 的「产出且被消费必须登记」是硬契约（见上 JSDoc），registry 适配层把 `inputFields` 写进 collector、`outputFields` 写进 derived 集。
- **`schema` 运行时形态校验**：类型层留 `ZodType<TOperation>`（对齐 composite 的 `CompositeDefinition['schema']` 同款宽类型），首次 `resolveTransformRegistry` 时 `extractKind` 校验「`ZodObject` 且 `kind` 为 `z.literal`」，否则注册期 throw 清晰错（mirror `compile/composite.ts:20` 的 `extractKey`）。

内置 7 个的 schema 已满足（均 `z.object({ kind: z.literal(PlotTransform.x), ... })`），直接复用 `ir/transform/transform.ts` 现有 schema，零重写；`apply*`（`group.ts` / `row.ts`）函数体不变，仅把现散在 `collectTransformFields` 大 switch 里的字段收集逻辑拆成各 definition 的 `inputFields` / `outputFields`。

### (2) registry 解析：内置为底 + definition 注入合并，冲突 / 未注册一律 throw

照 `lowerComposites`（`compile/composite.ts:47`）每次 lowering 现建一张表：

```ts
const BUILTIN_TRANSFORMS: ReadonlyArray<TransformDefinition> = [sortDef, stackDef, binDef, aggregateDef, normalizeDef, deriveIntervalDef, jitterDef];

const resolveTransformRegistry = (custom?: Array<TransformDefinition>): Map<string, TransformDefinition> => {
  const registry = new Map<string, TransformDefinition>();
  for (const def of BUILTIN_TRANSFORMS) registry.set(extractKind(def.schema), def);
  for (const def of custom ?? []) {
    const kind = extractKind(def.schema);
    if (registry.has(kind)) throw new Error(`lowerPlots: duplicate transform registration: '${kind}'`);
    registry.set(kind, def);
  }
  return registry;
};
```

- **kind 冲突 → throw**（含自定义撞内置、两自定义互撞）：mirror composite「Array 注入、撞名是调用方错误」。plot lowering 当前无 `onWarn` 通道，静默 last-wins 覆盖危险；放宽到「覆盖内置 = last-wins」是后续非破坏动作（待决策点）。
- **未注册 kind → throw**（**不是** composite 的 warn + skip）：transform 是**结构性**算子——改下游所有 mark / scale / guide 读的数据。未知 kind 静默跳过会产出「能渲染但语义错误」的图、且破坏 locator parity。复用 `compile/composite.ts:40` 自身论证的分界：**结构 / 定位类基元 fail-fast、可选高层节点 warn+skip**。transform 属前者。

`applyTransforms` / `collectTransformFields` 改为：查表 → 命中则 `definition.schema.parse(operation)` 精确校验（含 default 填充）→ 调 `apply` / `inputFields` / `outputFields`；未命中 throw。registry 在 `prepareRows`（expand + locator 共享入口）从 `options.transformDefinitions` 解析一次并回传，保证两条路用同一张表（parity by construction）。

### (3) IR schema：闭合 union 静态精确校验内置 + 仅未知 kind passthrough

`ir/transform/transform.ts` 仍是 schema **静态单一真源**，**不**由 registry 动态组装（`ir/` 不反向依赖运行时）。内置 `TransformSchema` 保持闭合 `z.discriminatedUnion('kind', [7])`。自定义 kind 经一个**排除全部内置 kind** 的 passthrough 占位接纳——精确校验延到 lowering（用 definition 的 schema）：

```ts
// ir/transform/transform.ts（新增；TransformSchema 7-union 不变）
const BUILTIN_TRANSFORM_KINDS = new Set<string>(Object.values(PlotTransform));

const CustomTransformSchema = z
  .object({
    kind: z
      .string()
      .min(1)
      .refine(k => !BUILTIN_TRANSFORM_KINDS.has(k), { message: 'custom transform kind must not collide with a built-in transform kind' }),
  })
  .passthrough()
  .describe('Custom transform operation: kind is any non-built-in identifier; its config is validated at lowering time against the matching TransformDefinition supplied via options.transformDefinitions');

const TransformOperationSchema = z.union([TransformSchema, CustomTransformSchema]);
type TransformOperation = z.infer<typeof TransformOperationSchema>;
```

**为什么 `kind` 必须排除内置**（评审 BLOCKING）：若 passthrough 不排除内置 kind，`{ kind:'bin' }`（内置 kind 但字段非法）会先被闭合 `TransformSchema` 拒、再被 passthrough 接住、通过**静态** `PlotSpecSchema.parse`，把「zod 是单一真源」退化为「静态合法但 lowering 必炸」。排除后：内置 kind 恒由闭合 union 静态精确校验（字段非法即在 parse 抛），**只有真正未知的 kind 才 passthrough** 到 lowering 期 registry 校验。

`PlotSpecSchema.transform`（`ir/plot.ts:42`）从 `z.array(TransformSchema)` 改 `z.array(TransformOperationSchema)`。导出的 `Transform`（= 内置 7-union）**不变**——内部 7 个 apply / 穷尽处理仍用精确 `Transform`；registry 分派与 spec 字段用 `TransformOperation`。含自定义 kind 的 spec 因此能过 `PlotSpecSchema.parse` 且 JSON round-trip 不丢字段。

理由：

1. **options 注入是仓库既有范式，不另造平行全局单例。** composite / coordinate / resolveField 都走 options 投递运行时函数；全局 `registerTransform()` 单例会是与 core 平行的新机制（违反 AGENTS.md「不绕开 core 另造平行能力」），且有 import 顺序 / tree-shaking / SSR 跨实例隐患。options 注入还让 **locator parity 天然且显式**——`locate.ts` 本就吃 `options`，definition 走同一通道。
2. **`apply` 纯 + 确定 + provenance 契约**：jitter 的 seed + mulberry32（`row.ts:121`）是确定性先例；`ctx.groupProvenance` 是溯源契约。两者一起守 SSR / locator / per-datum meta。
3. **闭合 union（排除内置 kind）+ lowering 期精确校验**复用 composite 已验证的范式，内置静态校验精确性零损失，仅未知 kind 延后。

## 待决策点 🔻

- **`inputFields` / `outputFields` 合一 vs 拆分（已按评审定为拆分）**：评审指出首版「单 `collectFields` + 可选 + 测 `不报错`」会误导实现。**已定拆分**为两个纯函数返数组，并把「产出且被消费必须登记 `outputFields`」立为硬契约。留待决策的只剩：是否提供一个 `deriveFields(operation)` 便捷糖（输入输出一把出）——倾向**不提供**（两函数已够、YAGNI）。
- **kind 冲突放宽**：本轮全 throw（含覆盖内置）。是否放宽「自定义覆盖内置 = last-wins」以替换内置 `bin`？倾向**先全 throw**；override 需求出现再放宽，届时先给 plot lowering 引入 `onWarn`（覆盖应 warn、非静默），属非破坏增量。
- **自定义 kind 经 `<Transform>` 的 build-plot-spec 透传形态**：`<Transform kind="regression" x="year" y="value" />` 的非内置 kind，build-plot-spec 按「kind + 扁平剩余 props 原样拼成 operation config」透传（lowering 期 definition.schema 校验）。倾向**扁平透传**（与内置 `<Transform>` 同形、无需为每个自定义 kind 写映射）；是否需要 props 白名单 / 保留字（如 `key`）后续按需。
- **`extractKind` 形态校验时机**：在首次 `resolveTransformRegistry` 期 throw（mirror composite `extractKey` 在 `lowerComposites` 内），`defineTransform` 仅类型层 helper、不运行时校验。

## DSL 表面

```ts
import { z } from 'zod';
import { defineTransform, renderPlot } from '@retikz/plot';

// definition：运行时处理器，拟合函数活在这里、永不进 IR
const regression = defineTransform({
  schema: z.object({
    kind: z.literal('regression'),
    x: z.string().min(1),
    y: z.string().min(1),
    asX: z.string().min(1).optional(),
    asY: z.string().min(1).optional(),
  }),
  inputFields: operation => [operation.x, operation.y],                       // 消费的源字段 → 进 strict model 校验
  outputFields: operation => [operation.asX ?? 'x', operation.asY ?? 'y'],    // 产出 → 从校验排除（被 mark 消费且声明 model 时必填）
  apply: (rows, operation, context) => linearFit(rows, operation, context),    // 纯 + 确定；生成拟合行 → 无 1:1 源行、provenance 降级
});

// operation：纯 JSON，进 spec.transform——只有数据、无函数
const spec = {
  namespace: 'plot', type: 'plot',
  data: { reference: 'sales' },
  transform: [{ kind: 'regression', x: 'year', y: 'value' }], // 自定义 operation，与内置 sort/bin… 同形
  // ...scales / coordinate / marks
};

// definition 经 options.transformDefinitions 注入；内置 7 个恒可用
renderPlot(spec, { sales: rows }, { transformDefinitions: [regression] });
```

```tsx
// React：operation 走 ADR-01 既有 <Transform>（含自定义 kind）；definition 走新 transformDefinitions（不撞 transforms / dataTransforms）
<Plot data={rows} transformDefinitions={[regression]}>
  <Transform kind="regression" x="year" y="value" />
  <PointMark x="year" y="value" />
  <PathMark x="year" y="value" />
</Plot>
```

## 测试设计

`packages/plot/plot/tests/transform/registry.test.ts`（新建）+ `tests/lower/transform.test.ts`（既有，加 registry parity）+ `tests/lower/data-portability.test.ts`（既有，加自定义 kind round-trip）+ `tests/interaction/*`（locator parity / 自定义 provenance）覆盖：

- 内置 7 个经 registry 分派与旧 switch 产物逐字节等价（apply + 字段收集两路）
- 自定义 transform 经 `options.transformDefinitions` 注入后 apply / inputFields / outputFields 生效
- 未注册 / kind 冲突 / 自定义 config 不合 schema / schema 形态非法 → 各自清晰 throw
- 内置 kind 字段非法在**静态** `PlotSpecSchema.parse` 即抛（CustomTransformSchema 不接住）；未知 kind 过静态、lowering 校验
- strict model 下：自定义产出字段**登记** outputFields → 通过；**不登记** → strict 拒（文档化失败模式）
- 改行数自定义 transform 用 `ctx.groupProvenance` → datumMeta.sourceIndices 与 locator 落点正确
- locator 与 lowering 用同一 `transformDefinitions` → parity

具体见「实现契约 § 测试象限」。

## 影响

- **`transform/transform.ts`**：`applyTransforms` / `collectTransformFields` 两 switch → registry 查表（入参加已解析 registry）；未注册 throw。
- **新增 `transform/registry.ts`**：`TransformDefinition` / `TransformContext` / `defineTransform` / `extractKind` / `resolveTransformRegistry` / `BUILTIN_TRANSFORMS`（7 内置注册项）。
- **`transform/group.ts` / `transform/row.ts`**：`apply*` 函数体不变（bin/aggregate 内部 `withGroupProvenance` 改由 `ctx.groupProvenance` 复用同逻辑）；现散在 `collectTransformFields` 的字段收集逻辑拆成各 definition 的 `inputFields` / `outputFields`。
- **`ir/transform/transform.ts`**：加 `BUILTIN_TRANSFORM_KINDS` / `CustomTransformSchema`（kind 排除内置）/ `TransformOperationSchema` / `TransformOperation`；`Transform`（内置 7-union）不变。
- **`ir/plot.ts:42`**：`transform` 字段 `TransformSchema` → `TransformOperationSchema`。
- **`pipeline/expand.ts`**：`LowerPlotsOptions` 加 `transformDefinitions?: Array<TransformDefinition>`；`prepareRows` 解析 registry 一次并回传，传给 `collectSourceFields` + 回传给 `applyTransforms` 调用方。
- **`pipeline/source-fields.ts`**：`collectSourceFields` 加 registry 入参，透传给 `collectTransformFields`。
- **`interaction/locate.ts`**：用 `prepareRows` 回传的同一 registry 跑 `applyTransforms`（parity）。
- **`@retikz/plot` 导出**：`defineTransform` / `TransformDefinition` / `TransformContext` / `TransformOperation`。
- **react `Plot.tsx`**：`PlotCommonProps`（经 `LowerPlotsOptions`）自动获得 `transformDefinitions`，`lowerPlotOptionsOf`（`Plot.tsx:74`）透传——与 `coordinates` 同处、同写法；**不**改动 `transforms`（几何）。`dataTransforms` 的元素类型从 `Transform` 放宽为 `TransformOperation`，以便程序化直传自定义 kind。
- **react `components/transform.tsx` + `build-plot-spec.ts`**：ADR-01 的 `<Transform kind="...">` 组件扩展为接受**非内置 kind**，`TransformProps` 从 `Transform` 改为 `TransformOperation`；build-plot-spec 按「kind + 扁平 props 透传成 operation」装配（不为每个自定义 kind 写映射）；operation 校验延到 lowering。**operation authoring 表面不新增、不延后**（纠正首版「本轮只 `<Plot transforms>` 透传、`<Transform>` 后续」与 ADR-01/02 已定决策的冲突）。
- **vanilla**：`renderPlot` 第三参即 `LowerPlotsOptions`，加 `transformDefinitions` 后自动生效（仅类型 / 测试）。
- **文档站**：transform 章节加「自定义 transform / `defineTransform`」小节 + provenance 支持等级说明 + 一个回归 demo；双语同步。
- **⚠️ 注意（非 BREAKING）**：`Transform` 导出类型不变；`PlotSpec['transform']` 元素类型从精确 7-union 放宽为 `TransformOperation`（含 `{ kind: string; ... }`，kind 排除内置）。检查对 `PlotSpec.transform` 元素做穷尽 `switch` 的消费方，确保有 default 或改用 `Transform` 窄化。core 无新依赖、不触 core IR 契约。

## 不在本 ADR 范围

- **具体新增统计 transform**（regression / kde / boxplot / loess…）：本轮只立扩展点，不补长尾内置。alpha.13 stat 项**作为 registry 注册项**接入、不再堆 switch。
- **operation authoring 新表面**：operation 走 ADR-01 既有 `<Transform>` / `dataTransforms`，本 ADR 不引入新 operation 组件，仅扩 build-plot-spec 接受自定义 kind。
- **跨运行时 portable definition schema 注册中心**：本轮自定义 schema 经 `options.transformDefinitions` 在 lowering 期校验，足够；跨进程纯 JSON 端独立校验中心后续。
- **override 内置 = last-wins**：本轮冲突 throw。
- **mark registry 公开 `registerMark`**：ADR-03 范围、按其节奏。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字后定稿。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（`ir/transform/transform.ts` + `ir/plot.ts`）+ `packages/plot/*/src/index.ts`（导出 `defineTransform`）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/transform/transform.ts` | 加 | `BUILTIN_TRANSFORM_KINDS` | `Set<string>`（= `Object.values(PlotTransform)`） | — | 内置 kind 集，供 CustomTransformSchema 排除（非 zod、模块常量） |
| `ir/transform/transform.ts` | 加 | `CustomTransformSchema` | `z.object({ kind: z.string().min(1).refine(非内置) }).passthrough()` | — | 自定义 transform 占位：kind 为非内置标识、config 透传；lowering 期按 definition.schema 精确校验 |
| `ir/transform/transform.ts` | 加 | `TransformOperationSchema` | `z.union([TransformSchema, CustomTransformSchema])` | — | spec 层 transform operation：内置精确 7-union ∪ 自定义占位 |
| `ir/transform/transform.ts` | 加 | `TransformOperation` | `z.infer<typeof TransformOperationSchema>` | — | transform operation 类型（内置 ∪ 自定义） |
| `ir/transform/transform.ts` | 不变 | `TransformSchema` / `Transform` | `z.discriminatedUnion('kind', [7])` | — | 内置 7-union 保持闭合、类型精确（内部穷尽处理用它） |
| `ir/plot.ts` | 改 | `PlotSpecSchema.transform` | `z.array(TransformOperationSchema).optional()` | — | transform 管线接受自定义 kind（原 `z.array(TransformSchema)`） |
| `react/components/transform.tsx` | 改 | `TransformProps` | `TransformOperation` | — | React `<Transform>` 接受内置与自定义 kind；内置 kind 仍由 lowering / schema 精确校验 |
| `react/Plot.tsx` | 改 | `PlotDslProps.dataTransforms` | `Array<TransformOperation>` | — | 程序化 operation 直传接受自定义 kind，与 `<Transform>` 同一表面 |

> 运行时 `TransformDefinition` / `TransformContext` / `defineTransform` / `LowerPlotsOptions.transformDefinitions` 是**行为对象、不进 IR**，故不在 zod schema 表，见「文件 scope」。
> 字段名一旦写死，下游不允许改；需改回本 ADR 加条或开新 ADR。

### 文件 scope

- `packages/plot/plot/src/ir/transform/transform.ts`（改：加 Custom/Operation schema + 内置 kind 集 + 类型；`TransformSchema` 不动）
- `packages/plot/plot/src/ir/plot.ts`（改：`transform` 字段换 `TransformOperationSchema`）
- `packages/plot/plot/src/transform/registry.ts`（新建：`TransformDefinition` / `TransformContext` / `defineTransform` / `extractKind` / `resolveTransformRegistry` / `BUILTIN_TRANSFORMS`）
- `packages/plot/plot/src/transform/transform.ts`（改：两 switch → registry 查表；未注册 throw）
- `packages/plot/plot/src/transform/group.ts`（改：bin / aggregate 的 `inputFields` / `outputFields` 下沉为 definition；`apply*` 经 `ctx.groupProvenance` 复用现 `withGroupProvenance` 逻辑）
- `packages/plot/plot/src/transform/row.ts`（改：sort / stack / normalize / derive-interval / jitter 的 `inputFields` / `outputFields` 下沉为 definition；`apply*` 不变、按签名加 ctx）
- `packages/plot/plot/src/transform/index.ts`（改：导出 `defineTransform` / 类型）
- `packages/plot/plot/src/pipeline/provenance.ts`（改：抽 `withGroupProvenance` 为可复用、构造 `TransformContext` 的 helper；或在 registry 适配层组装 ctx）
- `packages/plot/plot/src/pipeline/expand.ts`（改：`LowerPlotsOptions.transformDefinitions`、`prepareRows` 解析并回传 registry、传参）
- `packages/plot/plot/src/pipeline/source-fields.ts`（改：`collectSourceFields` 加 registry 入参）
- `packages/plot/plot/src/interaction/locate.ts`（改：用 `prepareRows` 回传 registry 跑 `applyTransforms`）
- `packages/plot/plot/src/index.ts`（改：re-export `defineTransform` / `TransformDefinition` / `TransformContext` / `TransformOperation`）
- `packages/plot/react/src/Plot.tsx` + `components/transform.tsx` + `components/build-plot-spec.ts`（改：`transformDefinitions` 经 `LowerPlotsOptions` 透传；`dataTransforms` / `<Transform>` 接受 `TransformOperation`；非内置 kind 扁平透传）
- `packages/plot/plot/tests/transform/registry.test.ts`（新建）· `tests/lower/transform.test.ts`（改）· `tests/lower/data-portability.test.ts`（改）· `tests/interaction/*`（改 / 新建）
- `apps/docs/src/contents/.../transform/*.mdx` + `*.demo.tsx`（改 / 新建：`defineTransform` 章节 + provenance 等级 + demo，双语）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，覆盖真实有意义的 accept/reject 与产物断言。

**Happy path（≥ 3）**：

- `builtin_dispatch_parity`：7 内置经 registry 分派，`applyTransforms` + 字段收集产物与旧 switch 逐字节等价
- `custom_transform_apply`：注册 `regression`、spec 含 `{ kind:'regression', x, y }` → `apply` 生效、产派生字段
- `custom_output_fields_strict_pass`：data.model 声明下，自定义产出字段经 `outputFields` 登记 → strict 校验通过、mark 正常消费

**边界（≥ 2）**：

- `empty_definitions_option`：`options.transformDefinitions` 省略 → 仅内置可用、行为与现状一致
- `custom_generated_rows_provenance_degrade`：生成行 transform（无 1:1 源行）→ datumMeta 仅 transformedIndex、无 sourceIndex（语义符合、不报错）

**错误路径（≥ 2）**：

- `unknown_kind_throws`：spec 含未注册 kind → lowering throw 清晰错（非静默 skip）
- `duplicate_kind_throws`：`transformDefinitions` 与内置同 kind / 两自定义同 kind → throw
- `custom_schema_reject`：自定义 config 不满足 definition.schema（如 `regression` 缺 `x`）→ lowering throw zod 错
- `builtin_bad_field_static_reject`：`{ kind:'bin' }` 缺 `field` → **静态** `PlotSpecSchema.parse` 即 throw（CustomTransformSchema 不接住）
- `custom_missing_output_fields_strict_reject`：data.model 下自定义产出字段**未**登记 `outputFields` → strict model 拒该字段（文档化失败模式）
- `malformed_schema_throws`：definition.schema 非 ZodObject / `kind` 非 literal → `resolveTransformRegistry` throw

**交互（≥ 2）**：

- `locator_parity_custom`：`createPlotLocator` 与 `lowerPlots` 用同一 `transformDefinitions` → datum 落点一致
- `custom_group_provenance_meta`：改行数自定义 transform 用 `ctx.groupProvenance` → datumMeta.sourceIndices 正确、locator 命中
- `custom_then_builtin_chain`：`[custom, sort]` 链式——自定义改行数后内置 `sort` 正常接力
- `portable_roundtrip`：含自定义 kind 的 spec `JSON.stringify → parse → PlotSpecSchema.parse` round-trip 不丢字段

### 依赖的现有元素

- `applyTransforms` / `collectTransformFields`（`transform/transform.ts`）—— 修改：两 switch → registry 查表
- `applyBin` / `applyAggregate`（`transform/group.ts`）· `applySort` / `applyStack` / `applyNormalize` / `applyDeriveInterval` / `applyJitter`（`transform/row.ts`）—— 引用：内置 definition 的 `apply`，函数体不动（按签名加 ctx）
- `withGroupProvenance`（`group.ts:59`）· `SOURCE_INDEX` / `SOURCE_INDICES` / `readSourceIndex` / `readSourceIndices` / `tagSourceIndex`（`pipeline/provenance.ts`）· `datumMeta`（`provenance.ts:99`）—— 引用 / 抽取：组装 `TransformContext`、内置 provenance 复用、自定义 provenance 契约来源
- `binOutputFields` / `aggregateOutputField`（`transform/group.ts`）· `DEFAULT_*_FIELD` 常量—— 引用：内置 definition 的 `outputFields` 复用派生字段名推断
- `FieldCollector` / `createFieldCollector`（`data`）—— 引用：registry 适配层把 `inputFields` 写进 collector
- `TransformSchema` + 7 子 schema · `PlotTransform`（`ir/transform/transform.ts`）—— 引用：内置 definition 的 schema 直接复用、`BUILTIN_TRANSFORM_KINDS` 来源
- `LowerPlotsOptions` / `prepareRows` / `collectSourceFields` / `resolveFrame`（`pipeline/`）—— 修改：加 `transformDefinitions`、registry 解析 + 回传
- `createPlotLocator`（`interaction/locate.ts`）—— 修改：用同一 registry 保 parity
- `defineComposite`（`core composites/define.ts`）· `lowerComposites` / `extractKey`（`core compile/composite.ts`）· `options.coordinates`（`pipeline/expand.ts`）—— 参照：`defineTransform` / registry 范式、键提取、dup（throw）/ 未注册（throw）策略
- `PlotPanelProps`（`Pick<ScopeProps,'transforms'>`，`Plot.tsx:7`）· `dataTransforms`（`Plot.tsx:53`，改 `Array<TransformOperation>`）· `<Transform>`（ADR-01，`TransformProps` 改 `TransformOperation`）· `build-plot-spec`—— **避让 / 复用**：几何 `transforms` 与 operation `dataTransforms` 不占用，operation authoring 复用 ADR-01 `<Transform>`，definition 注入用新 `transformDefinitions`
