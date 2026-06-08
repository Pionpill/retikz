# ADR-09：扩宽 temporal 推断识别器——认空格分隔的带时区 ISO datetime（SQL 时间戳），归一化空格→T

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-01 数据模型](./01-data-model.md)（temporal 推断严格 ISO 的原始决策）/ [ADR-06 声明式 format](./06-declarative-format.md)（歧义格式走声明）· [core-design.md §7 AI 友好](../../../../../architecture/core-design.md)

## 背景

ADR-01 把 temporal 推断钉死在严格 ISO（`YYYY-MM-DD` / 带时区 ISO datetime），拒一切歧义形态——`YYYY/MM/DD`（D/M/Y vs M/D/Y）、裸数字串（epoch vs 计数 / ID）、无时区 datetime（本地时区歧义、跨环境解析不一）。这条保守是对的：歧义格式无法安全自动判断，必须走声明（`type` / `format` / `resolveField`，ADR-04/06）。

但有一类**地区无关、无歧义**的写法被一并拒了：**空格分隔的带时区 ISO datetime**——`2024-01-01 12:00:00Z`、`2024-01-01 12:00:00+08:00`。这是 SQL / Postgres 时间戳的常见序列化形态：日期部分仍是无歧义 `YYYY-MM-DD`、且**带显式时区**（不踩无时区的本地歧义坑），只是分隔符是空格而非 `T`。强迫用户为这种字段额外写 `type:'temporal'` 是无谓摩擦。

> **边界澄清**：本 ADR **只扩宽无歧义形态的自动推断**，不引入任何"全局推断配置开关"。歧义格式（slashDate / epoch / 无时区 datetime）继续走声明（`format` / `resolveField`），理由见「不在本 ADR 范围」。

## 决策：`isIsoDateString` 接受 `[T ]` 作日期/时间分隔符（仍强制时区）；`toTimestamp` 解析前归一化空格→T

两处**单点**改动（temporal 推断与 coercion 共用同一 guard，改一处全生效）：

1. `isIsoDateString`（`lower/infer.ts`）的 datetime 正则把分隔符 `T` 放宽为 `[T ]`（`T` 或单个空格），**时区段保持强制**（`Z` / `±HH:MM`）。`YYYY-MM-DD` 纯日期正则不变；无时区 datetime 仍拒。
2. `toTimestamp`（`lower/scale.ts`）字符串路径在 `Date.parse` 前把分隔空格归一化成 `T`（`value.replace(' ', 'T')`）——ECMAScript 规范只保证 `T` 分隔的跨引擎一致解析，空格分隔属实现自定义；归一化后确定、环境无关。

`coerceValue(_, temporal)` 与 `formatParser('iso')` 都经 `toTimestamp`，自动继承；inference 的 `classify` 经 `isIsoDateString`，自动继承。无需改 `coerce.ts`。

## 理由

1. **无歧义 + 带时区 = 可安全自动判断、跨环境一致**：日期部分 `YYYY-MM-DD` 不歧义、强制时区消除本地时间歧义，与现有"严格 ISO"实质同档，只差一个分隔符。
2. **单 guard 单 parse 点**：识别（`isIsoDateString`）与解析（`toTimestamp`）各只一处改，不增第二套时间逻辑、不破坏"推断 guard 即 coercion guard"的单一来源。
3. **守住保守红线**：歧义形态（slashDate / epoch / 无时区 datetime）仍拒于自动推断、只走声明——本 ADR 不松这条，只补一个明确无歧义的缺口。

## 不在本 ADR 范围（关键边界）

- **全局推断配置开关**（运行时"把这些也当时间"的 option）——**不做**。它只能是运行时选项、不进 IR，会破坏"spec 自描述"（同 spec + 同数据，换运行时配置推断结果不同 → 不可移植 / LLM 契约受损）；且想自动认的格式恰是歧义格式（slashDate / epoch），自动认 = 重踩 D/M/Y 坑。需要按字段定制 → 走 `resolveField`（已是标注好的运行时逃生舱，ADR-04）。
- **无时区 datetime**（`2024-01-01T12:00:00` / `2024-01-01 12:00:00`）——继续拒（本地时区歧义、跨环境不一），与 ADR-01 一致。
- **紧凑 ISO**（`20240101` / `20240101T120000Z`）——`20240101` 与裸数字（ID / 编码）歧义，整个紧凑族不收；要用走声明。
- **斜杠日期 / epoch 秒·毫秒**——走 `format`（ADR-06）/ `resolveField`（ADR-04），非本 ADR。

## 影响

- **lowering**：`infer.ts` 识别器 + `scale.ts` `toTimestamp` 两处微调；`coerce.ts` / `formatParser` 经 `toTimestamp` 自动继承。
- **IR**：**无 schema 改动**。
- **公开行为（非破坏，纯放宽）**：原本被推断成 categorical 的"空格分隔带时区 ISO"字段，现推断成 temporal；原本声明 temporal 却因空格被判 NaN 跳过的值，现正确解析。不影响任何既有被接受的形态。
- **文档站**：`grammar/data` 的"推断是尽力而为"提示补一句"空格分隔的带时区写法（SQL 时间戳）也认"。
- **core**：无。

---

## 实现契约（必填）🔻

### Level

`黄`——动 `lower/infer.ts`（识别器正则）+ `lower/scale.ts`（`toTimestamp` 归一化），**无 IR schema 改动**、纯放宽（非破坏）。

### Schema 改动

无。

### 文件 scope

- `packages/plot/plot/src/lower/infer.ts`（修改：`ISO_DATETIME_RE` 分隔符 `T` → `[T ]`）
- `packages/plot/plot/src/lower/scale.ts`（修改：`toTimestamp` 字符串路径 `Date.parse(value.replace(' ', 'T'))`）
- `packages/plot/plot/tests/lower/iso-recognizer.test.ts`（新建）
- `apps/docs/src/contents/plot/grammar/data/index.{zh,en}.mdx`（修改：ComponentAlert 微调）

### 测试象限

**Happy path**：
- `space_tz_inferred_temporal`：`'2024-01-01 12:00:00Z'` 无 model → 推断 temporal
- `space_offset_inferred_temporal`：`'2024-01-01 12:00:00+08:00'` → 推断 temporal
- `space_form_parses_equal_to_T`：空格形 epoch ms 与等价 `T` 形逐字相等

**边界**：
- `date_only_unchanged`：`'2024-01-01'` 仍推断 temporal（纯日期正则不动）
- `strict_T_datetime_unchanged`：`'2024-01-01T12:00:00Z'` 行为不变
- `fractional_seconds_space`：`'2024-01-01 12:00:00.123Z'`（空格 + 小数秒）正确解析

**错误路径**：
- `no_timezone_space_rejected`：`'2024-01-01 12:00:00'`（无时区）→ 非 temporal（推断 categorical）
- `slash_still_not_temporal`：`'2024/01/01'` 仍非 temporal
- `compact_numeric_not_temporal`：`'20240101'` 仍非 temporal（与裸数字歧义）

**交互**：
- `declared_temporal_space_value_parses`：声明 `type:'temporal'` + 空格值 → 经 lowering 得正确 epoch ms
- `format_iso_accepts_space`：`format:'iso'` + 空格带时区值 → 经 `formatParser` 解析（继承 `toTimestamp`）

### 依赖的现有元素

- `isIsoDateString` / `classify` / `inferFieldType`（`lower/infer.ts`）—— 修改识别器（推断侧）
- `toTimestamp`（`lower/scale.ts`）—— 解析前归一化空格→T
- `coerceValue` / `formatParser`（`lower/coerce.ts`）—— 经 `toTimestamp` 自动继承，**不改**
