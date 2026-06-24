# ADR-09：开放自定义字段解析格式 —— FieldFormat registry，把 data 层唯一的具名解析枚举补成 defineXxx 对等

- 状态：Accepted（实现 2026-06-19；@retikz/plot 1169 测试 + @retikz/plot-react 146 测试全过）
- 决策日期：2026-06-19
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [前置：ADR-06 transform registry](./06-transform-registry.md) · [对照：ADR-07 scale registry](./07-scale-registry.md) · [对照：ADR-08 mark registry](./08-mark-custom-registry.md) · [plot-design.md §8](../../../../../architecture/plot-design.md)

## 背景

alpha.12 把可扩展语法层逐个做成「内置与自定义经同一 registry 分派」：coordinate（ADR-05）、transform（ADR-06）、scale（ADR-07）、mark（ADR-08）都给出了 `defineXxx` + `resolveXxxRegistry` + `options.xxxDefinitions` + IR passthrough 的同构四件套。`contract`（抽象）/ `providers`（内置 def + registry）/ `pipeline`（消费）的三层拆分也按这个范式收敛。

`packages/graph/plot/src/data` 是当时**明确缓置**的一层（plot AGENTS.md 记「data/guide/interaction 暂无 define 机制」）。复审 data 层后确认：它整体**不是** registry 形状——`DataModel`/`FieldDef` 是声明式配置、infer→coerce→normalize→validate 是固定管线、`resolveField`/`resolveLabel` 是运行时函数逃生舱（任意函数本就不该塞进具名注册表）。但其中**恰有一处**是真正的 define 缝：**字段解析格式 `PlotFieldFormat`**。

`PlotFieldFormat` 是一个封闭枚举（`iso` / `epochSeconds` / `epochMillis` / `slashDate` / `numberString` / `percent`），每个成员在 `data/coerce.ts` 里硬绑一个 `(impliedType + parser)`：`FORMAT_IMPLIED_TYPE` 记录 + `formatParser` switch。这正是「一组具名声明式 parser」——和 transform kind / mark type 同构。它今天的扩展故事很别扭：用户想加自定义解析（货币、`'1.2万'`、地区日期…）**只能走 `resolveField.parse` 这条按字段、无 schema 判别、还强制额外声明 type 的逃生舱**（`data/resolve.ts` 那条「parse 无 type 且 model 未声明 → fail-loud」就是它的摩擦点）。format 想复用、想进 IR 当判别串、想内置与自定义同表分派，现状都做不到。

## 决策：format 升级为 FieldFormat registry，data 层补齐第五个 defineXxx

照 ADR-06/07/08 的范式，但**按 format 的形态裁剪**——format 是一个**字符串判别**（写在 `FieldDef.format`），不是带 `type`/`kind` 字段的 operation 对象，所以 definition 比前四个更薄：

```ts
// contract/format.ts —— 抽象：definition 类型 + 工厂
export type FieldFormatDefinition = {
  name: string;                              // 注册键 = IR 中 FieldDef.format 串
  impliedType: PlotFieldTypeValue;           // 省略 type 时覆盖推断 / 显式 type 冲突则 fail-loud
  parse: (raw: unknown) => ParsedFieldValue; // 原始值 → canonical 值
};
export const defineFieldFormat = (def: FieldFormatDefinition): FieldFormatDefinition => def;

// schemas/data.ts —— IR 放宽：照 CustomMark/CustomTransform passthrough
export const BUILTIN_FIELD_FORMATS = new Set<string>(Object.values(PlotFieldFormat));
export const isBuiltinFieldFormat = (format: string): format is PlotFieldFormatValue => BUILTIN_FIELD_FORMATS.has(format);
export const CustomFieldFormatSchema = z.string().min(1).refine(name => !BUILTIN_FIELD_FORMATS.has(name), { message: '...' });
export const FieldFormatSchema = z.union([z.enum(PlotFieldFormat), CustomFieldFormatSchema]); // FieldDef.format 用它

// providers/format —— 内置 6 个 def + registry（resolveFormatRegistry）+ 编排（collectFormatFields 改走 registry）
```

`pipeline/expand.ts` 的 `prepareRows` 把 `resolveFormatRegistry(options.formatDefinitions)` 解析出的 registry 喂给 `collectFormatFields`；`format` 未注册 / 与显式 type 冲突均 fail-loud。优先级不变：format parser 垫底、`resolveField.parse` 命中同字段时仍覆盖（`resolveField` 保持「真正动态 / 跨源」逃生舱定位，不再是加格式的唯一路）。

理由：

1. **补齐 data 层的扩展缺口，且只补该补的那一处**：format 是 data 层唯一「具名 + 可枚举 + 可注册」的解析操作；`fieldType`（横切 scale 选型 / coordinate / guide，封闭概念轴）与 `resolveField`/`resolveLabel`（任意函数 hook）都不是 registry 形状，本 ADR **不动**。这符合仓库「先识别通用模型与边界，确实只能局部处理时说明为什么不抽象」。
2. **复用同一注册 / 解析 / 消费机制**：`defineFieldFormat` / `resolveFormatRegistry` / `options.formatDefinitions` / IR `z.union([Builtin, Custom])` 与前四个完全同构；内置 6 个 format 从「coerce.ts 里的 switch 分支」降为「providers/format 里的注册项」，内置与自定义同表分派，无私有白名单。
3. **不引入 bypass cast、不破坏 JSON 可序列化**：IR 仍只存 `{ name, format: '<name>' }` 串，parser 留运行时 definition；放宽后的 `FieldDef.format` 静态类型从 `PlotFieldFormatValue` 宽到 `string`，由 registry 在 lowering 收窄。

## 与前四个的差异（按 format 形态裁剪）🔻

- **判别是裸字符串，非 operation 对象**：definition 的注册键直接是 `def.name`，**无需 `extractXxxKind` 从 ZodObject 提取**（transform/mark 要从 `z.literal` 抽 kind）。
- **无泛型擦除，故无 `AnyFieldFormatDefinition`**：`parse: (raw: unknown) => ParsedFieldValue` 不带 operation 泛型，`FieldFormatDefinition` 本身即「any」，`options.formatDefinitions` 直接用 `Array<FieldFormatDefinition>`。刻意不为对称而造一个空壳 Any 类型。
- **`resolveField.parse` 逃生舱保留并降级**：它仍服务「按数据集动态决定解析 / 同名字段跨源不同解析」等 registry 表达不了的场景；format registry 接管「具名、可复用、可进 IR」的那一类。二者优先级不变（resolveField > format）。

## DSL 表面

```tsx
// 自定义 format：定义 impliedType + parse，经 options 注入，data.model 写格式名
const currency = defineFieldFormat({
  name: 'currency',
  impliedType: 'continuous',
  parse: raw => (typeof raw === 'string' ? Number(raw.replace(/\./g, '').replace(',', '.')) : NaN),
});

<Plot
  spec={{ namespace: 'plot', type: 'plot',
          data: { reference: 'd', model: [{ name: 'price', format: 'currency' }] },
          coordinate: { type: 'cartesian2D', x: 'month', y: 'price' },
          scales: [{ type: 'linear', name: 'month' }, { type: 'linear', name: 'price' }],
          marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'price' } } }] }}
  data={{ d: rows }}
  formatDefinitions={[currency]}
/>;
```

## 测试设计

`packages/graph/plot/tests/lower/field-format.test.ts`（扩展现有内置 format 测试）覆盖：

- 内置回归：现有 slashDate/epochSeconds/percent/numberString/format-implies-type/type-mismatch 行为逐字段不变（registry 化不改内置语义）。
- 自定义：`defineFieldFormat` 经 `options.formatDefinitions` 注入 → `parse` 被调、`impliedType` 在省略 type 时覆盖推断；自定义与显式 type 冲突 fail-loud。
- registry：内置 percent + 自定义 currency 同 model 各按各自 def 解析；自定义撞内置名 / 两自定义同名 throw；`resolveFormatRegistry()` 恰 6 个内置。
- fail-loud 迁移：未注册的 format 串 schema accept（视作自定义名）但 lowering throw `not registered`；空串 schema reject。
- 公共 barrel：`defineFieldFormat` / `resolveFormatRegistry` / `collectFormatFields` / `BUILTIN_FORMATS` / `BUILTIN_FORMAT_DEFINITIONS_BY_NAME` 暴露。

## 影响

- **`schemas/data.ts`**：加 `BUILTIN_FIELD_FORMATS` / `isBuiltinFieldFormat` / `CustomFieldFormatSchema` / `FieldFormatSchema` / `FieldFormatValue`；`FieldDef.format` 从 `z.enum(PlotFieldFormat)` 改 `FieldFormatSchema`（`PlotFieldFormat` 枚举保留，仍是内置名来源）。
- **`contract/format.ts`**（新建）：`FieldFormatDefinition` + `defineFieldFormat`；`contract/index.ts` barrel 加 `./format`。
- **`providers/format/`**（新建）：`definitions.ts`（6 内置 def + `BUILTIN_FORMATS` + `BUILTIN_FORMAT_DEFINITIONS_BY_NAME` + `resolveFormatRegistry`，从 coerce.ts 迁入 4 个 parser 辅助函数）+ `orchestrate.ts`（`collectFormatFields` 改走 registry 入参）；`providers/index.ts` barrel 加 `./format`。
- **`data/coerce.ts`**：删 `FORMAT_IMPLIED_TYPE` / `formatImpliedType` / `formatParser` / 4 个 parser 辅助（迁 providers/format）；保留 `coerceValue` / `coerceTimestamp` / `ParsedFieldValue`（默认 type 驱动 coercion，与 format 无关）。
- **`data/normalize.ts`**：删 `collectFormatFields`（迁 providers/format/orchestrate）。
- **`pipeline/expand.ts`**：`LowerPlotsOptions` 加 `formatDefinitions?: Array<FieldFormatDefinition>`；`prepareRows` 解析 `formatRegistry` 并喂 `collectFormatFields`；`collectFormatFields` 改从 `../providers` 引入。
- **`react/Plot.tsx`**：`lowerPlotOptionsOf` 透传 `formatDefinitions`（经 `LowerPlotsOptions` 自动到达）。
- **公共 barrel `index.ts`**：导出 `defineFieldFormat` + `FieldFormatDefinition` 类型 + `resolveFormatRegistry` / `collectFormatFields` / `BUILTIN_FORMATS` / `BUILTIN_FORMAT_DEFINITIONS_BY_NAME`。
- **core**：无新依赖、不触 core IR 契约。
- **⚠️ 类型（非运行时 BREAKING）**：`FieldDef.format` 静态类型从 `PlotFieldFormatValue` 宽到 `string`；纯 TS 写内置 format 不受影响（内置名仍是合法 string）。schema 行为变化：未知 format 串过去 `z.enum` parse 期 reject，现 accept 为自定义名、改在 lowering fail-loud（与 mark/transform passthrough 一致）。
- **文档站**：plot/grammar/data 补「自定义字段格式」节（defineFieldFormat + formatDefinitions），与 coordinate/scale/transform/mark 的自定义节对齐。

## 不在本 ADR 范围

- **`fieldType` 开放**：测量类型（continuous/temporal/categorical）横切 scale 选型 / coordinate / guide，是封闭概念轴，开放代价远大于收益，不做。
- **`resolveField` / `resolveLabel` registry 化**：任意函数 hook 不是具名注册表形状，保留函数逃生舱；format registry 接管其中「具名解析」那一子集。
- **guide / interaction 层 define 机制**：仍按 roadmap 缓置，需求驱动另立。
