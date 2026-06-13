# ADR-06：声明式 `FieldDef.format`——可序列化的字段值解析词表，让 `resolveField` 退为纯逃生舱

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-02 可移植契约](./02-data-portability.md)（coercion）/ [ADR-04 resolveField](./04-field-resolver.md)（函数逃生舱）/ [ADR-05 type 可选](./05-optional-field-type.md) · [plot-design.md §3.1 数据模型](../../../../../architecture/plot-design.md) · [core-design.md §7 AI 友好](../../../../../architecture/core-design.md)

## 背景

ADR-02 的内置 coercion 只认固定形态：`temporal` 收 `Date` / epoch ms / 严格 ISO，`continuous` 收 number / 严格数字串。碰上 `'2024/01/01'`、epoch **秒**、`'50%'` 这类常见非默认格式就 NaN→跳过。ADR-04 的 `resolveField` 给了自定义解析，但它是**运行时函数、不进 IR**——一旦用上，spec 就**丢了可序列化 / 可移植 / LLM 可生成**这条 retikz 核心价值（core-design §7）。

Vega-Lite 的对策是 `data.format.parse`：在 spec 里**声明式**写 `{ "date": "date", "ratio": "number" }`，甚至自定义日期格式 `"date:'%m/%d/%Y'"`——可序列化、LLM 能生成。retikz 缺这一层：常见自定义格式被迫走函数逃生舱，杀鸡用牛刀且破坏可移植性。

本 ADR 补**声明式 `format` 词表**：进 IR、可序列化、覆盖常见非默认格式；`resolveField` 从此只作真正任意逻辑的逃生舱。

## 决策：`FieldDef` 加可选 `format`（closed 字符串词表，**format 蕴含 type**），解析优先级 `resolveField.parse > FieldDef.format > 内置默认`

`format` 是按 `PlotFieldFormat`（`as const` 词表）取值的字符串，进 `data.model`、JSON 可序列化。lowering 时按 `(type, format)` 选内置 parser，喂 `normalizeRows`。

**`format` ↔ `type` 关系（钉死，cross-review #1）**：每个 format 词项**唯一绑定一个 type**（`epochSeconds`/`epochMillis`/`slashDate`/`iso` → `temporal`；`numberString`/`percent` → `continuous`）。由此：

- **`type` 省略 + 写 `format`**：format **蕴含** type——`{ name:'ratio', format:'percent' }` 等价 `{ name:'ratio', type:'continuous', format:'percent' }`，不再被推断误判成 categorical。format 是比推断更强的类型信号（仅次于显式 `type` / `resolveField.type`）。优先级：`resolveField.type > 显式 type > format 蕴含 > 推断`。
- **`type` 写了 + 与 format 蕴含的 type 冲突**（`{ type:'continuous', format:'slashDate' }`）：lowering **fail-loud**，不静默。
- **`type` 写了且兼容**：正常，format 选 parser。

这样 `format` 永不在「推断把它当 categorical」上失效——有 format 就有确定 type。

```ts
/** 字段值解析格式词表（暴露给用户；裸字面量同样可用）；按字段 type 校验兼容 */
export const PlotFieldFormat = {
  /** temporal：严格 ISO（默认，等价不写 format） */
  Iso: 'iso',
  /** temporal：数值/数值串按 epoch 秒 → ms */
  EpochSeconds: 'epochSeconds',
  /** temporal：数值/数值串按 epoch 毫秒 */
  EpochMillis: 'epochMillis',
  /** temporal：严格 YYYY/MM/DD 斜杠日期，按 UTC 零点转 epoch ms（不收 D/M/Y、M/D/Y 等地区歧义布局） */
  SlashDate: 'slashDate',
  /** continuous：宽松数字串（容前后空白 / 千分位逗号），默认仅严格数字串 */
  NumberString: 'numberString',
  /** continuous：百分比串 '50%' → 0.5 */
  Percent: 'percent',
} as const;
export type FieldFormat = ValueOf<typeof PlotFieldFormat>;

// FieldDefSchema 加：
//   format: z.nativeEnum(PlotFieldFormat).optional().describe('Declarative value-parsing format; must be compatible with type. Omit for the built-in default')
```

DSL：

```tsx
<Plot data={rows} model={[
  { name: 'createdAt', type: 'temporal', format: 'slashDate' },   // '2024/01/01' → epoch ms
  { name: 'ts',        type: 'temporal', format: 'epochSeconds' },// 1700000000 → *1000
  { name: 'ratio',     type: 'continuous', format: 'percent' },   // '50%' → 0.5
]}>{/* … */}</Plot>
```

理由：

1. **可序列化 / LLM 友好**：`format` 是字符串、进 IR，spec 仍 100% JSON 可序列化、可模板化、LLM 能生成——补回 `resolveField` 函数路径丢掉的核心价值（core-design §7）。常规自定义格式走声明式，`resolveField` 退为「词表覆盖不了的真任意逻辑」逃生舱。
2. **按 type 校验、fail-loud**：`format` 词表项绑定到兼容的 type（`epochSeconds` 只配 `temporal`、`percent` 只配 `continuous`），错配在 lowering 抛清晰错误，不静默。
3. **closed 词表而非任意 pattern 串**：先上**封闭枚举**覆盖高频场景，零新依赖；完整 strptime/d3-time-format pattern（`'%Y/%m/%d'`）留待 phase 2（需引 d3-time-format，catalog 登记）——见「不在本 ADR 范围」。
4. **统一解析优先级**：`resolveField.parse`（函数）> `FieldDef.format`（声明式）> 内置默认 coerce。三者都汇到 `normalizeRows` 的 per-field parser 槽。

## 已钉死（cross-review 合入 2026-06-07）

- **`slashDate` 只收严格 `YYYY/MM/DD`**：按 **UTC 零点**转 epoch ms。`DD/MM/YYYY`、`MM/DD/YYYY` 地区歧义布局**不收**——留 phase 2 完整 pattern 串（`'%d/%m/%Y'`）显式指定，避免「同一 `01/02/2024` 在不同环境解析成不同日期」的隐式歧义。（cross-review #6）
- **`format` 蕴含 `type`、冲突 fail-loud**：见上「决策」段；不存在「写了 format 却被推断成 categorical」的失效路径。（cross-review #1）


## 影响

- **IR schema**：`FieldDefSchema` 加 `format?`（**非破坏**，可选）；新增 `PlotFieldFormat` / `FieldFormat`。
- **lowering**：`coerce.ts` 加 `formatParser(type, format) → parser`；`normalizeRows` 的 per-field parser 槽接受「format 选出的内置 parser」（与 ADR-04 的 resolveField.parse 同槽，优先级 resolveField > format）；`expand.ts` / `validate.ts` 收集 format→parser 并做 type 兼容校验。
- **公开 API**：`model` 的 FieldDef 多一个声明式 `format`；`PlotFieldFormat` 导出。
- **文档站**：`grammar/data` 补「声明式 format」段（与 resolveField 段并列：声明式优先、函数兜底）。
- **core**：无。

## 不在本 ADR 范围

- **完整日期 pattern 串**（d3-time-format / strptime `'%Y/%m/%d'`）——需新依赖，phase 2 单独 ADR。
- **resolveField 函数逃生舱**——已是 ADR-04，本 ADR 只把它降为「词表外」兜底。
- **数字 locale / 千分位完整支持**——先 `numberString` 宽松版，完整 locale 留后续。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/data.ts` 与 `packages/plot/plot/src/lower/{coerce,validate,expand}.ts`，测试见 `packages/plot/plot/tests/lower/field-format.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.6/06-declarative-format.md`（封板全文）。
