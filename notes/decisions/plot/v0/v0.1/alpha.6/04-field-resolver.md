# ADR-04：可插拔字段解析 `resolveField`——运行时逃生舱按字段覆盖类型 + 自定义值解析，不进 IR

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-01 数据模型](./01-data-model.md) / [ADR-02 可移植契约](./02-data-portability.md) · [plot-design.md §3.1 数据模型 / §8.3 投影分层](../../../../../architecture/plot-design.md) · [core-design.md §4.4 IR 可序列化](../../../../../architecture/core-design.md) · 前序：字段类型简化为 `continuous` / `categorical` / `temporal`（commit `30f2cce1`）

## 背景

plot 的数据层把「用户外部数据 → canonical 行」分两段：① `resolveFieldTypes`（`packages/plot/plot/src/lower/expand.ts`）定每个字段的测量类型——有 `model` 用声明、无 `model` 走 `inferFieldType` 抽样推断；② `normalizeRows` / `coerceValue`（`packages/plot/plot/src/lower/coerce.ts`）按类型把原始值强制成 canonical 值（temporal→epoch ms、continuous→number、categorical→string|number）。类型与解析都**只认内置规则**，用户无从介入。三类真实需求因此落空：

- **非 ISO 日期 / 自定义日期格式**：`temporal` 的 `toTimestamp` 只接受 `Date` / epoch ms / 严格 ISO（`YYYY-MM-DD` 或带时区 ISO datetime）。`'2024/01/01'`、epoch 秒、`'2024Q1'` 一律 NaN→静默跳过。用户没有挂自定义 parser 的口子。
- **数值枚举想当类别**：`status: 0/1/2` 这种数值编码的类别。声明 `model` 的 `type: 'categorical'` 已能解决（`coerceCategory` 原样保留有限 number），但**无 model 时**（推断模式）数值一律 `continuous`，没有不写整份 model 就单点纠偏的手段。
- **`bigint` 静默丢弃**：`classify` / `coerceNumber` 都不认 `bigint`（DB int64、JSON reviver 可能产出）→ 推断与 ingest 两处无声蒸发。

同类库的做法：Vega-Lite 在 field/encoding 上有声明式 `format` / `timeUnit`（可序列化）；d3 靠 `d3-time-format` 等运行时函数解析。retikz 的约束是 **IR 必须 100% JSON 可序列化、不准含函数**（core-design §4.4）——所以「任意 parse 函数」**不能进 `model`/IR**，只能活在运行时层（与 `fieldMaps` / `validateData` 同类的 `lowerPlots` 选项）。本 ADR 落「运行时逃生舱」这条；声明式 `format` 词表（可序列化、LLM 友好）作为互补线留后续。

## 决策：运行时 `resolveField(field, context) => { type?, parse? }`，按字段覆盖类型 + 自定义值解析，不进 IR

新增 `LowerPlotsOptions.resolveField`：运行时函数，按字段名（带数据集上下文）返回「类型覆盖 + 可选值解析器」。类型是字段级决策（喂第一段 `resolveFieldTypes`），解析是值级动作（喂第二段 `normalizeRows`），二者拆开正好贴现有两段管线。

```ts
/** 运行时 canonical 值（注意 ≠ IR 的 ScalarValue：不含 boolean / null） */
export type ParsedFieldValue = string | number | undefined;

/** 单字段解析结果（运行时，不进 IR） */
export type FieldResolution = {
  /** 覆盖最终字段类型；省略 → 用 model 声明 / 自动推断 */
  type?: FieldType;
  /** 覆盖内置 coercion：原始值 → canonical 值；返回 undefined 跳过该值。
   *  必须返回与最终 type 同形的值（temporal/continuous→number、categorical→string|number），否则下游守卫跳过 */
  parse?: (raw: unknown) => ParsedFieldValue;
};

export type LowerPlotsOptions = {
  // …已有 width / height / fontSize / margin / fieldMaps / validateData
  /** 程序化字段解析逃生舱（运行时函数，不进 IR）。返回 undefined → 回退 model/推断 + 内置 coerce */
  resolveField?: (
    field: string,
    context: { dataReference: string; physicalPath: string; declaredType?: FieldType },
  ) => FieldResolution | undefined;
};
```

理由：

1. **per-field 返「类型 + parser」而非 per-value 返 `FieldType`**：类型是字段属性（`resolveFieldTypes` 一次定），解析是逐行动作（`normalizeRows`）。`=> FieldType` 只插第一段，管不到值解析——返回 `temporal` 后值仍被默认 coercer 拒掉。值访问在 `parse(raw)` 里给足；per-value 分类会引入「同字段不同值判出不同类型」的聚合歧义，把 scale/guide 语义搞乱，**故不做**。
2. **不进 IR**：函数违背 IR 可序列化红线（core-design §4.4），落 `LowerPlotsOptions`、与 `fieldMaps`/`validateData` 同层。持久化 spec 丢掉它是预期——可移植 / LLM 场景用 `model` + 后续声明式 `format` 词表。
3. **带数据集上下文**：`fieldMaps` 已按 `dataReference` 分组（expand.ts）；同名字段跨源可能不同解析，故 context 必带 `dataReference`，并给 `physicalPath`（fieldMap 解析后的物理路径）+ `declaredType`（model 声明，便于 resolver 基于已声明类型决策）。
4. **`ParsedFieldValue ≠ ScalarValue`**：IR 的 `ScalarValue = string|number|boolean|null`（字面量标量概念），但 canonical 行 / scale 实际只接受 `string|number|undefined`（`coerceValue` 签名）。parse 返 boolean/null 视为非法跳过，别让 IR 字面量概念污染运行时 canonical。

不变量（强约束，下游必须守）：

- **优先级 `resolveField.type > model > infer`**，但 **model strict 不破**：`resolveField` 能盖已声明字段的类型，**不能**让未在 model 声明的字段通过 strict 校验——catch-all resolver 不得把拼错字段洗成合法字段（守本里程碑 ADR-01 data-model 的 strict fail-loud）。strict 的「字段必须声明」检查在 resolver 之前、独立成立。
- **normalize 门控放宽**：现 `normalizeRows` 契约是「仅 model 在时调用」（coerce.ts）。改成 **有 model 或任一字段命中 resolver → 进 canonical normalize**。否则无 model 的 `{ type:'categorical' }` / `{ type, parse }` 用法不生效。
- **render 与 locator 同源**：`createPlotLocator`（`packages/plot/plot/src/lower/locate.ts`）也走归一化；上一轮 cross-review 的 P2 即「locator 与 render 对 fieldMaps 行为必须一致」。`resolveField` 必须在两条路同样生效，否则命中坐标与画出的点用不同解析。
- **`parse` 单独出现需类型来源**：`{ parse }` 无 `type` 的合理语义是「类型沿用 model、只换解析」。**无 model 时类型来源不清**（自定义日期 parse 成 epoch number 会被误当 continuous）→ 要求：`{ parse }` 单独出现必须有 model 声明该字段；否则必须同时给 `type`，违反 fail-loud。
- **覆盖后的类型贯穿下游**：`resolveField.type` 盖类型后，`assertScaleFieldCompatible` 等用的是**覆盖后**的类型（实现时注意取值时序，别拿 model 旧类型校验）。


## DSL 表面

```tsx
<Plot
  data={rows}
  model={[{ name: 'createdAt', type: 'temporal' }, { name: 'statusCode', type: 'categorical' }]}
  resolveField={(field) => {
    // 自定义日期格式：类型 + 解析一起给，避开「标了 temporal 但值被默认 coercer 静默丢」
    if (field === 'createdAt') return { type: 'temporal', parse: raw => Date.parse(String(raw).replaceAll('/', '-')) };
    // 只换解析、类型沿用 model（statusCode 已声明 categorical）
    if (field === 'bigCount')  return { type: 'continuous', parse: raw => Number(raw) }; // 顺手收掉 bigint 静默丢
    return undefined; // 其余走 model/推断 + 内置 coerce
  }}
>
  <LineMark x="createdAt" y="bigCount" order="createdAt" />
</Plot>
```

## 测试设计

`packages/plot/plot/tests/lower/field-resolver.test.ts` 覆盖类型覆盖、自定义 parse、门控、strict 守恒、locator 同源、与 fieldMaps 交叉。落地测试见实现指针。

## 影响

- **lowering 管线**：`resolveFieldTypes`（加 resolver 优先级 + strict 守恒）、`normalizeRows` / `coerceValue`（门控放宽 + parse 钩子）、`createPlotLocator`（同源透传）、`validateData`（可选 parse 输出校验）。
- **公开 API（用户可见，新增非破坏）**：`LowerPlotsOptions.resolveField` + 导出 `FieldResolution` / `ParsedFieldValue` 类型；`@retikz/plot-react` `<Plot resolveField>` prop、`@retikz/plot-vanilla` `renderPlot(spec, data, { resolveField })` 透传。
- **IR**：**无 schema 改动**——`resolveField` 是运行时函数、不进 IR（守可序列化红线）。
- **文档站**：`apps/docs/src/contents/plot/grammar/data` 补「自定义解析 / resolveField」段 + demo。
- **core**：无（纯 plot 数据层，不碰 core）。

## 不在本 ADR 范围

- **声明式 `format` 词表**（`{ name, type:'temporal', format:'epoch-s'|'YYYY/MM/DD' }`，可序列化、LLM 友好、进 model/IR）——互补线，单独 ADR。
- **per-value 分类**（`(field, value) => FieldType` 内容嗅探）——见决策理由 1，不做。
- **值重映射 / 标签化**（`0→'低'`）——显示格式化 / guide label 概念，与值强制无关，另议。
- **`bigint` 作为一等标量进 `ScalarValueSchema`**——本 ADR 仅让用户经 `parse` 自行收口 bigint；是否把 bigint 纳入内置 `coerceNumber` / 标量 schema 另议。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/lower/{expand,coerce,locate,infer}.ts`、plot public export 与 React/vanilla options 透传，测试见 `packages/plot/plot/tests/lower/field-resolver.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.6/04-field-resolver.md`（封板全文）。
