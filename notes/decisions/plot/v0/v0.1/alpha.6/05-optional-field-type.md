# ADR-05：`FieldDef.type` 改可选——部分声明 model，name-only 字段自动推断（解耦「字段存在」与「测量类型」）

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-01 数据模型](./01-data-model.md)（strict / infer 二选一，本 ADR 放宽成部分声明）· [ADR-04 resolveField](./04-field-resolver.md)（优先级链衔接）· [plot-design.md §3.1 数据模型](../../../../../architecture/plot-design.md)

## 背景

`FieldDefSchema`（`packages/plot/plot/src/ir/data.ts`）当前要求 `{ name, type }` 两字段都填，`type` 必填。而 `resolveFieldTypes`（`packages/plot/plot/src/lower/validate.ts`）是**非此即彼**：声明了 `model` → 全用声明类型（缺字段名抛 strict unknown）；无 `model` → 全部 `inferFieldType` 推断（ADR-01 拍板「model strict / infer 二选一，无混合」）。

这把 `model` 强行绑死了两件**本应分开**的事：

1. **「这个字段存在 / 进 strict 契约 / 可 `fieldMaps` 移植」** —— 由 `name` 承载；
2. **「它是什么测量类型」** —— 由 `type` 承载。

后果：要拿 strict 校验 + 可移植性（① 的价值），就**必须连每个字段的 type 一起写全**。一份 20 字段、其中只有 1 个数值枚举要点名 `categorical`、1 个要点名 `temporal` 的数据，被迫把另外 18 个一目了然的字段也逐个声明类型——啰嗦且没必要。Vega-Lite 的 field 同样可只给 `field` 不给 `type`（由数据推断），二者不强绑。

## 决策：`FieldDefSchema.type` 改 `.optional()`，`resolveFieldTypes` 按字段「声明优先、否则推断」，strict 仍按 name 守

`type` 省略即「该字段进 strict 契约（name 已列），但类型留给数据推断」。`resolveFieldTypes` 把现有两条全有/全无的路合并到**字段粒度**：strict 仍按 `name` 集合校验（不削弱 ADR-01 fail-loud），类型则**有声明用声明、无声明走 `inferFieldType`**。

```ts
// ir/data.ts：type 必填 → 可选
type: z.nativeEnum(PlotFieldType).optional()
  .describe('Field measurement type; omit to infer from the bound dataset at lowering')

// lower/validate.ts resolveFieldTypes（model 分支重写）：
const declaredNames = new Set(model.map(f => f.name));                 // strict 按 name
const declaredTypes = new Map(model.flatMap(f => (f.type ? [[f.name, f.type] as const] : [])));
for (const field of userSourceFields) {
  if (!declaredNames.has(field)) {
    throw new Error(`lowerPlots: unknown field "${field}" (data.model is declared; all referenced source fields must be listed)`);
  }
  map.set(field, declaredTypes.get(field) ?? inferFieldType(rows, field)); // 声明优先、否则推断
}
// 重名校验保留（按 name，不论有无 type）
```

理由：

1. **解耦正交关注点**：`name` 管「存在 / strict / 可移植」，`type` 管「测量语义」。二者本就独立，现状的强绑只是实现便利。放开后支持「部分声明」这一最常见诉求（多数字段一目了然、少数要点名）。
2. **strict 不破**：strict 的「引用字段必须在 model」检查按 `name` 集合成立，与 type 是否填**无关**——name-only 字段照样满足 strict，引用未列字段照样 fail-loud（守 ADR-01）。
3. **非破坏**：required → optional 向后兼容，所有现存「全量 type」spec 仍合法、行为逐字不变。
4. **与 ADR-04 优先级链自洽**：统一为 **`resolveField.type` > `model.type`（若写） > 推断**。name-only 字段在 `resolveField` 的 `context.declaredType` 即 `undefined`，resolver 仍可决策；不命中则推断。

代价（诚实记，影响 describe 措辞）：

- **削弱「model 不看数据就能校验 / 派生」**：带 `type` 的字段仍 data-free；**name-only 字段需 lowering 时拿数据推断**。`DataModelSchema` 的 describe（"...scale-type inference without seeing the data"）改成「仅对显式 `type` 的字段成立；name-only 字段在 lowering 时按数据推断」。
- **削弱 LLM / spec 自描述**：name-only 字段的类型不在 spec 里、依赖运行时数据。要让 LLM 不看数据就全懂、spec 完全可移植，仍应填全 `type`——本特性是 **opt-in 的部分类型化**，不鼓励都省。


## DSL 表面

```tsx
// 20 字段里只点名 2 个特殊的，其余进 strict + 可移植但类型自动推断
<Plot data={rows} model={[
  { name: 'createdAt', type: 'temporal' },    // 非 ISO/特殊，需点名
  { name: 'statusCode', type: 'categorical' }, // 数值枚举，需点名
  { name: 'revenue' },                          // name-only → 推断 continuous
  { name: 'region' },                           // name-only → 推断 categorical
]}>
  <LineMark x="createdAt" y="revenue" series="region" order="createdAt" />
</Plot>
```

## 测试设计

`packages/plot/plot/tests/lower/data-model.test.ts`（扩展现有 `resolveFieldTypes` 段）+ `packages/plot/plot/tests/ir/data.schema.test.ts`（`type` 可省 accept）。落地测试见实现指针。

## 影响

- **IR schema**：`FieldDefSchema.type` required → optional（**非破坏**）；`FieldDefSchema.type` / `DataModelSchema` 的 describe 改写（type 可省 → 推断）。
- **lowering**：`resolveFieldTypes`（`lower/validate.ts`）model 分支重写为「strict 按 name + 类型声明优先否则推断」；引用 `inferFieldType`。
- **公开 API**：`model` 字段定义可只给 `name`（用户可见、非破坏放宽）。
- **文档站**：`apps/docs/src/contents/plot/grammar/data` 补「部分声明 model：只点名特殊字段、其余推断」段，并修正「model = 不看数据就能校验」的措辞为「仅对显式 type 字段」。
- **core**：无。
- **与 ADR-04 协同**：优先级链 `resolveField.type > model.type > infer` 跨两 ADR 成立；实现时同一处取值。

## 不在本 ADR 范围

- **声明式 `format` 词表**（ADR-04 已列后续）——与本 ADR 正交。
- **「可移植性是否必须有 type」的强约束改动**——本 ADR 只让 type 可省；fieldMaps 移植本就只需 name，不在此扩。
- **推断质量提升**（更聪明的类型嗅探）——沿用 ADR-01 的抽样推断，不在本 ADR 动。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/data.ts` 与 `packages/plot/plot/src/lower/validate.ts`，测试见 `packages/plot/plot/tests/lower/data-model.test.ts` 和 `packages/plot/plot/tests/ir/data.schema.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.6/05-optional-field-type.md`（封板全文）。
