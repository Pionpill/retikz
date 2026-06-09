# ADR-08：数据健壮性——统一归一化（消两模式割裂）+ 非法/缺失值策略 + bigint ingest

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-01 数据模型](./01-data-model.md) / [ADR-02 可移植契约](./02-data-portability.md)（coercion / validateData）/ [ADR-04 resolveField](./04-field-resolver.md) · [core-design.md §4.4 IR 可序列化](../../../../../architecture/core-design.md)

## 背景

三个数据层健壮性短板（cross-review / 库对比里反复点到）：

1. **归一化两模式割裂**：`prepareRows` 现在「有 model 或 resolver 命中才归一化，否则原始行」（[expand.ts](../../../../../packages/plot/plot/src/lower/expand.ts) ADR-04 门控）。同一份数据，加不加 model 走两条路（canonical vs raw），下游靠各 scale 自己 coerce 兜（time scale 认 ISO 串、linear 只认真数）——行为割裂、难预测。
2. **非法/缺失值策略单薄**：coercion 失败就静默跳过；`validateData` 只能抽样二元 fail-loud，不报**哪个字段、多少非法/缺失**。脏数据导致空图时，用户无从诊断。
3. **`bigint` 静默丢**：`classify` / `coerceNumber` 不认 `bigint`（DB int64、JSON reviver 可能产出）→ 推断与 ingest 两处无声蒸发。

## 决策：① 统一恒归一化（去门控）；② 加 `invalid` 策略 + validateData 字段级报告；③ bigint 进 ingest（不进 IR 标量）

### ① 恒归一化

去掉 `model !== undefined || resolverHit` 门控，**总是**按解析出的 `fieldTypes`（无 model 时即推断类型）跑 `normalizeRows`。下游统一读 canonical、无第二处 coerce，行为单一可预测。对干净数据（数字是数、日期是 Date/ISO/epoch）产物等价；只是无 model 路径也提前 coerce 成 canonical。

> 与类型推断的歧义无关：`'120'` 仍推断成 categorical（数值串语义不定，须 model/format/resolveField 才当数值）——本条只消除「归一化跑不跑」的割裂，不改推断语义。

### ② 非法/缺失值策略

`LowerPlotsOptions` 加 `invalid?: 'skip' | 'error'`（运行时、不进 IR）。

**检查范围（cross-review #5，钉死）**：仅「**用户源字段 ∩ 当前 spec 实际参与的字段**」（即 `collectUserSourceFields(spec)`——encoding/mark/transform 输入，排除派生输出），不全表瞎扫。

**阶段语义（对齐现有 normalize→validate→transform 管线，cross-review #5）**：

- **`'skip'`（默认）**：归一化阶段对非法值写 **NaN/undefined 哨兵**（即现状 `coerceValue`），**不删行**——下游各 mark 自行跳过非法几何（`coordinate(value)` 返 NaN 即丢点）。删行会破坏 `stack`/`sort` 等依赖全行集 / 行序的 transform（normalize 在 transform 之前），故恒不删行。
- **`'error'`**：在 **`validateBoundData`（transform 之前那道，expand.ts:446）** 对上述字段集**全量**校验，遇任一非法/缺失即 fail-loud（比 validateData 抽样更严）。置于 transform 前 → 错误定位到原始源字段、不被 transform 改写干扰。

`validateData`（抽样档）增强：报错信息带**字段级非法/缺失计数**（`field "x": 3/100 invalid, 2/100 missing`），把「为什么空图」变明确诊断。

### ③ bigint ingest

`classify(bigint) → continuous`；`coerceNumber` 认 `bigint`，但**只收 `Number.isSafeInteger(Number(value))`**（cross-review #4，钉死）：超 `Number.MAX_SAFE_INTEGER` 的 BigInt 转 number 仍是有限值、只是**静默丢精度**——这种「看着成功实则错」最坑，故按 `invalid` 策略当**非法值**处理（skip 跳过 / error 报错），不静默接受损精度的近似值。`Number(value)` 落在 safe 区间才接受。**不进 `ScalarValueSchema`**——`bigint` 非 JSON 可序列化（`JSON.stringify(1n)` 抛），进 IR 会破 round-trip（core-design §4.4）；它只是 ingest 阶段的运行时输入，转成 number 后才进下游。

```ts
// classify：number / bigint → continuous
// coerceNumber：typeof 'bigint' → Number.isSafeInteger(Number(value)) ? Number(value) : NaN（按 invalid 策略处理）
// LowerPlotsOptions：invalid?: 'skip' | 'error'
```

理由：

1. **单一 canonical 路径**：恒归一化去掉「加不加 model 走两条路」的认知负担与 bug 面；下游只读 canonical。
2. **可诊断 > 静默**：字段级 invalid/missing 报告 + `'error'` 策略，把脏数据从「空图猜谜」变「明确报错」，守 retikz fail-loud 取向。
3. **bigint 收口但不污染 IR**：运行时 ingest 认 bigint，IR 标量集不变——既不丢数据，又守 JSON 可序列化红线。

## 已钉死（cross-review 合入 2026-06-07）

- **bigint 只收 safe integer**（cross-review #4）：`Number.isSafeInteger(Number(value))` 才接受；超出按 `invalid` 策略当非法值，不静默接受损精度近似。消解了正文「Number(value)」与测试「超 MAX_SAFE → NaN」的口径矛盾。
- **`invalid` 检查范围 = spec 参与的用户源字段**（cross-review #5）：`collectUserSourceFields(spec)`，不全表扫。
- **`'skip'` 不删行、写哨兵**（cross-review #5）：归一化阶段对非法值写 NaN/undefined、保留整行供 transform（stack/sort）；下游 mark 跳非法几何。`'error'` 在 `validateBoundData`（transform 前）全量校验参与字段。


## 影响

- **lowering**：`expand.ts` prepareRows 去门控（恒归一化）+ `invalid:'error'` 在 `validateBoundData` 对 `collectUserSourceFields` 全量校验；`coerce.ts` `coerceNumber` 认 safe-integer bigint（超出→NaN 走 invalid 策略）、`validateBoundData` 出字段级计数；`infer.ts` `classify` 认 bigint→continuous。
- **公开 API（非破坏）**：`LowerPlotsOptions.invalid`；react `<Plot invalid>` / vanilla 透传（vanilla 自动）。
- **IR**：**无 schema 改动**（invalid 运行时；bigint 不进 IR 标量）。
- **文档站**：`grammar/data`「数据有问题时」段补 `invalid` 策略 + 字段级诊断；说明 bigint 自动转。
- **core**：无。

## 不在本 ADR 范围

- **`'zero' / 'impute'` 等统计型缺失处理**——属 transform / 统计语义，留后续。
- **per-field / per-mark invalid 覆盖**——先全局。
- **`bigint` 进 IR 标量**——破 JSON 可序列化，永不收；只 ingest 转 number。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/lower/{expand,coerce,infer}.ts` 与 React `invalid` options 透传，测试见 `packages/plot/plot/tests/lower/data-robustness.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/v0.1-alpha.6/08-data-robustness.md`（封板全文）。
