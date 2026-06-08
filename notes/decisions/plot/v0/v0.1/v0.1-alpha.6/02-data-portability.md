# ADR-02：数据模型作为可移植契约——逻辑字段 + 绑定期 fieldMaps 映射 + 按 PlotFieldType 值强制

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.1 Data / §8.2 数据绑定](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 数据模型类型层](./01-data-model.md) · 前身：[alpha.1 ADR-02 DataRef/DataModel](../v0.1-alpha.1/02-plot-data.md)

## 背景

「数据不进 IR」（plot-design §3.1）的红利本应是：**spec 是可移植产物，数据源可换**。但 alpha.1~5 的绑定是「encoding 字段名 = 物理数据路径，直取」——换个字段名不同、或同字段不同 JS 表示的数据源，spec 就得改。本 ADR 把 `data.model` 从「类型声明」升级成**跨数据源契约**，解决三条换源需求：

1. **同名同类型换源**：新数据源字段名 + 类型与 model 一致 → 直接用新数据出图。
2. **不同名 + 自定义映射**：新数据源字段名与 model 不一致，但允许用户给映射（类型相同）→ 仍能出图。
3. **不同 JS 类型但同 PlotFieldType**：新数据源字段名、JS 类型都不同，但都归同一 `PlotFieldType`（如 temporal 的 `Date` vs ISO 串 vs epoch 数）→ 仍能出图。

三条的共同前提是**声明了 model**（都说「类型相同 / 同一 PlotFieldType」=model 的声明）。故本 ADR 的核心判断：**model 是可移植性的开关**——声明 model，spec 即跨源可移植（恒等 / 映射 / 强制三档）；不声明，退回当前「物理名直取 + 推断」（ADR-01）。

同类思路：Vega-Lite 的 spec 与 `data` 分离（named datasets、可换 `data`）；BI 工具（Tableau / Looker）普遍有「逻辑字段 ↔ 物理列」的语义层。retikz 因「数据不进 IR」天然具备分离基础，本 ADR 补上**适配层**。

## 决策：逻辑字段模型 + 绑定期 `fieldMaps`（逻辑名→物理路径）+ 按 PlotFieldType 值强制

三个机制，分别解决三需求；都在 lowering 绑定期、**不进 IR**（spec 保持源无关）。

**(1) 逻辑字段模型（解决需求 1）**：`data.model` 的字段 `name` 是**逻辑标识**，encoding 引用逻辑名（ADR-01 已按逻辑名校验 / 推断）。无映射时逻辑名 = 物理路径（恒等），故「同名同类型」数据源直接生效——`lowerPlots` 换个同形 `datasets[ref]` 即重新出图，spec 与 model 不变。

**(2) 绑定期 `fieldMaps`（解决需求 2）**：`lowerPlots` 的 options 增 `fieldMaps`，逻辑名 → 物理路径，**不进 IR**：

```ts
type FieldMap = Record<string, string>;             // 逻辑字段名 → 物理数据路径('a.b.c')
type FieldMaps = Record<string, FieldMap>;          // 数据集 reference → 该集的字段映射
// LowerPlotsOptions 增： fieldMaps?: FieldMaps

lowerPlots(datasets, { fieldMaps: { sales: { quarter: 'period', share: 'ratio' } } });
// encoding x="quarter"（逻辑）→ 物理路径 'period' → resolveFieldPath(row, 'period')
```

解析：物理路径 = `fieldMaps[ref]?.[logical] ?? logical`（缺省恒等）。**映射值只允许非空路径串**（支持 `a.b.c`）——不支持函数、不支持数组展开、不做计算（值变换留 alpha.11 transform/derive）。

**`fieldMaps` 校验（fail-loud）**：
- **仅在声明 `model` 时可用**（评审 P1）：无 `model` 却传 fieldMaps → throw（无逻辑字段契约，改名无所指）；
- `fieldMaps[ref]` 的**逻辑名必须在该 plot 的 `data.model`** → 否则 throw；
- `ref` **须在 `datasets`** → 否则 throw；datasets 里未被本 plot 用到的 ref 不管。

**(3) 按 PlotFieldType 值强制 / coercion（解决需求 3）**：每个 `PlotFieldType` 配一套「原始 JS 值 → 规范值」强制，路径取值后、喂 scale 前统一：

| PlotFieldType | 接受的 JS 表示 | 规范化为 | 非法值 |
|---|---|---|---|
| quantitative | `number` / **严格数字串**（trimmed 十进制 / 科学计数；**拒** 空串·`Infinity`·`NaN`·hex·带单位串） | `number` | → NaN，跳过 |
| proportion | 同 quantitative；**越界 [0,1] 原样保留**（不 clamp、不跳过；clamp 交 ADR-03 scale option） | `number` | → NaN，跳过 |
| temporal | `Date` / epoch `number` / 严格 ISO 串 | epoch ms（**扩展** `toTimestamp`：现实现不收 `Date`、裸 `Date.parse` 过宽，需加 `Date` 分支 + 与 ADR-01 一致的严格 ISO guard） | → null，跳过 |
| nominal / ordinal | `string` / `number` | string key（`String(v)`） | 其余跳过 |

非法值沿用 alpha.1「→ NaN/null 跳过该 datum」语义，不报错。

**(4) 统一字段访问 = ingest 归一化（评审 P1）**：(2)(3) **不是「喂 scale 前才做」**——字段读取散在 transform（直读 `op.y`）/ scale / mark / anchor（`channelValue` 直读）/ locator / provenance 多处；若只在 scale 前 coerce，数字串进 stack 会被当 0。故在 **ingest 一次性**把每个用户源字段「(fieldMap) 解析物理路径 → 按 resolved `FieldType`（ADR-01 类型 `Map`）coerce」写成 **canonical rows**（扁平、逻辑名键、已强制值）；**全下游统一读 canonical rows（按逻辑名）**，无第二处 coerce。transform 派生字段（stack `y0`/`y1`）叠加在 canonical 之上、本就是数值。归一化须**保留 alpha.5 provenance 的 source-index 标记**（`SOURCE_INDEX` symbol 随行转移到 canonical row）。

**三需求兑现**：① = (1) 恒等绑定；② = (2) fieldMaps；③ = (3) coercion；统一性 = (4) ingest 归一化。三者正交叠加：换个字段名不同、Date 存日期的源，给 `fieldMaps` + 靠 temporal coercion，spec 零改。

理由：

1. **spec 源无关、可移植**：逻辑模型 + 绑定期适配让同一 spec 跑不同源——「数据不进 IR」的兑现，也利于 LLM 复用 spec 模板。
2. **三档渐进**：同名同类型零配置（恒等）；改名给 fieldMaps；换表示靠 coercion。每档独立、按需启用。
3. **适配层在数据世界、不进 IR**：`fieldMaps` / coercion 都在 `lowerPlots` 绑定期，IR 仍 100% JSON-safe、源无关。
4. **coercion 让 PlotFieldType 成真正的类型契约**：类型定义「接受哪些表示」，而非绑死单一 JS 类型——这正是需求 3 的本质。
5. **统一访问器，杜绝半 coerce**：ingest 归一化是**唯一** coerce 点，transform / scale / mark / locator 全读 canonical rows——根治「数字串在 stack 被当 0」类 bug（评审 P1）。
6. **temporal 收口**：扩展现有 `toTimestamp`（加 `Date` 分支 + 严格 ISO guard）成统一 temporal coercion，与 ADR-01 推断 guard **同一套正则**，不打架（评审 P2）。

## 文档型 / 嵌套数据支持与错误处理

retikz「数据不进 IR、外部数据是任意可嵌套 JS」（plot-design §3.1）意味着**关系型二维表与文档型（MongoDB / 嵌套 JSON）一视同仁**：encoding `field`（及 `fieldMaps` 物理路径）是点路径 accessor，`resolveFieldPath` 逐段下钻。逻辑模型 + fieldMaps 把「逻辑字段 → 嵌套文档路径」打通（`fieldMaps: { city: 'address.city' }`）。约束只有一条：**路径叶子必须是标量**（`ScalarValueSchema`）。文档型数据的失败模式与处理：

| 情形 | 行为（错误处理方案） |
|---|---|
| 嵌套对象路径 `a.b.c` | `resolveFieldPath` 逐段解析到标量叶子 ✓（已支持） |
| 字段缺失（异构文档某行没该字段） | 路径 → `undefined` → coerce → null/NaN → **跳过该 datum**，不报错（异构文档常态） |
| 叶子是非标量（object / array） | coerce 判为非法 → **跳过**，**绝不 `String(obj)`**（ingest 归一化是唯一 coerce 点，order / compare 也读 canonical，根治 `"[object Object]"` 脏值） |
| 路径中途穿过数组（`items.price`，items 是数组） | 返回 `undefined` → 跳过；**数组 unwind / flatten 不在 alpha.6**（属 transform，alpha.11），不静默瞎猜、文档明示「需先 flatten」 |
| 同字段跨文档 JS 类型不一（schemaless） | 按 resolved `FieldType` coerce：能强制则用、不能则跳过（需求 3 的本质） |
| strict 模式下大量被跳过 | 可选 `validateData`（见待决策点）抽样校验、fail-loud 提示「字段缺失 / 非标量 / 类型不符比例过高」，把「静默空图」变「明确报错」 |

要点：**非标量叶子与数组路径都收敛到「跳过 + 不伪造」**，配合可选 `validateData` 让「为什么图是空的」可诊断——这是文档型数据的主要错误处理保证。

## 待决策点 🔻

> 原待决策点已于 2026-06-07 多 LLM 评审**全部拍板、并入决策**，无悬置项：
>
> - `fieldMaps` 落点 = **`LowerPlotsOptions.fieldMaps`**（datasets 保持纯数据，映射是绑定期适配层）；
> - quantitative 数字串：**收但严格**（trimmed 十进制/科学计数；拒空串·Infinity·NaN·hex·带单位，决策 (3)）；
> - proportion 越界：**原样保留**（不 clamp 不跳过；clamp 交 ADR-03 scale option）；
> - 数据一致性校验：**默认关**，`validateData?: boolean | { sampleRows?: number }`，开启后抽样 **fail-loud**（**不做 warn**——库里 warn 不确定、不好测）；
> - fieldMaps 未知逻辑名 / 未知 ref / 无 model：**fail-loud**（决策 (2)）。

## DSL 表面

```ts
// 同一 spec + model，三种数据源都能出图：
const spec = buildPlotSpec(/* model: [{name:'quarter',type:'temporal'},{name:'value',type:'quantitative'}] */);

// 源 A：同名同类型（需求 1）—— 零配置
lowerPlots({ sales: [{ quarter: '2024-01-01', value: 120 }] });

// 源 B：字段名不同（需求 2）—— 给 fieldMaps
lowerPlots({ sales: [{ period: '2024-01-01', amount: 120 }] },
           { fieldMaps: { sales: { quarter: 'period', value: 'amount' } } });

// 源 C：JS 类型不同但同 PlotFieldType（需求 3）—— quarter 是 Date 对象、value 是数字串，coercion 兜
lowerPlots({ sales: [{ quarter: new Date('2024-01-01'), value: '120' }] });
```

React / vanilla 具体 API（评审 P1，当前 `Plot.tsx` 只显式转发列举的 options、DSL 入口无 model 面）：

- **spec 入口** `<Plot spec={…} data={datasets} fieldMaps={…} />`：`model` 在 `spec.data.model`；`fieldMaps` 是 `LowerPlotsOptions` 字段，已含在 `PlotCommonProps`，但 `Plot.tsx` 需把它**加进解构（line 46）+ 转发给 `lowerPlots`（line 63）**（现仅转发 `provenance` 等显式项）。`fieldMaps` 按数据集 reference 键。
- **组合 DSL 入口** `<Plot data={rows} model={…} fieldMap={…}>…</Plot>`：`data` 是单数据行数组（内部包成 `{__plot: rows}`）。需给 `PlotDslProps` 加 **`model?`**（注入内部构造的 `spec.data.model`）+ **`fieldMap?`**（单数据集的**扁平** `{逻辑名: 物理路径}`，内部映射到 `__plot` ref，不让用户写内部 ref 名）。
- **vanilla** `plot(spec, datasets, { fieldMaps })`：builder option 对等转发，与 react 共享同一 `LowerPlotsOptions`。`fieldMaps` / `model` 都属绑定期/spec，不进 Scene IR。

## 测试设计

`packages/plot/plot/tests/lower/data-portability.test.ts` 覆盖：

- 恒等绑定换源（需求 1）
- fieldMaps 改名后正确取值（需求 2）
- 各 PlotFieldType coercion（Date/ISO/epoch → temporal；数字串 → quantitative；需求 3）
- fieldMaps fail-loud（未知逻辑名）
- 非法值跳过（不报错）

具体见「实现契约 § 测试象限」。

## 影响

- **IR**：无（`fieldMaps` / coercion 都不进 IR）。
- **lowering**：`LowerPlotsOptions` 增 `fieldMaps`（TS 类型，非 IR schema）；新建 `coerce.ts`（按类型强制）+ ingest **归一化步**（resolve fieldMap + coerce → canonical rows）；扩展 `toTimestamp`（加 `Date` 分支 + 严格 ISO guard）。**关键：归一化在 transform 之前**，全下游（transform / scale / mark / anchor / locator / provenance）读 canonical rows。归一化须保留 `SOURCE_INDEX` 标记。现有无 fieldMaps 的 spec 行为不变（恒等 + coercion 对已支持表示等价；数字串进 stack 等场景从「被当 0」修正为正确）。
- **core**：无。
- **文档站**：data 概念页加「可移植契约 / 换源 / fieldMaps / 类型容错」一节 + demo（三源同 spec）。
- **对外 API**：`lowerPlots` options 增 `fieldMaps`（可选、additive，需 model）；`@retikz/plot-react` `Plot.tsx` 转发 `fieldMaps` + DSL 入口加 `model`/`fieldMap` props；`-vanilla` 对等。coercion 让此前因 JS 类型不符被跳过的值现在能渲染（行为放宽、非 breaking）。

## 不在本 ADR 范围

- **值变换函数**（逻辑字段 = 物理字段的计算式）→ transform / derive（alpha.11），`fieldMaps` 只改名。
- **type-driven scale 选型 / 类型↔scale 校验** → ADR-03。
- **远程 / 流式数据源、大数据采样** → 后续。
- **运行时响应式换源（不重 lower）** → v0.1 之后交互/性能轴。

---

## 实现契约（必填）🔻

> AI 起草的施工蓝图提案，待人工 review + 多 LLM 评审定稿。

### Level

`red`——动 `packages/plot/plot/src/index.ts` 导出面（`LowerPlotsOptions` 扩字段）+ lowering 取值契约。

### Schema 改动

无 IR schema 改动。`fieldMaps` 是 `LowerPlotsOptions` 的 TS 字段（绑定期、不进 IR）：

| 文件 | 操作 | 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|---|---|
| `plot/src/lower/expand.ts` | 加 | `LowerPlotsOptions.fieldMaps` | `Record<string, Record<string,string>>?` | 省略=全恒等 | 数据集 reference → (逻辑字段名 → 物理数据路径)；需 model |
| `plot/src/lower/expand.ts` | 加 | `LowerPlotsOptions.validateData` | `boolean \| { sampleRows?: number }?` | `false` | 开启后抽样校验绑定数据（字段缺失 / 非标量 / 类型不符）→ fail-loud；默认关、**不 warn** |

### 文件 scope

- `packages/plot/plot/src/lower/coerce.ts`（新建：按 PlotFieldType 值强制）
- `packages/plot/plot/src/lower/expand.ts`（改：ingest 归一化（fieldMap + coerce → canonical rows，置于 transform 前）；`LowerPlotsOptions` 加 `fieldMaps` / `validateData`；fieldMaps 校验（逻辑名∈model、ref∈datasets、无 model 报错）；归一化保留 `SOURCE_INDEX`）
- `packages/plot/plot/src/lower/scale.ts`（改：扩展 `toTimestamp` 收 `Date` + 严格 ISO guard）
- `packages/plot/plot/src/lower/field.ts`（按需：逻辑名→物理路径解析 helper）
- `packages/plot/plot/src/index.ts`（改：`LowerPlotsOptions` / `FieldMaps` 类型重导出，按需）
- `packages/plot/react/src/Plot.tsx`（改：解构 + 转发 `fieldMaps`）+ `packages/plot/react/src/components/*`（DSL 入口加 `model` / `fieldMap` props，注入构造的 spec）
- `packages/plot/vanilla/src/*`（改：builder 透传 `fieldMaps`）
- `packages/plot/plot/tests/lower/data-portability.test.ts`（新建）

> 归一化置于 transform 前，故 transform / anchor / mark / locator **无需逐处改取值逻辑**——它们读的 row 已是 canonical。只需确认这些阶段消费的是归一化后的行集（expand 内串接点）。

### 测试象限

**Happy path**：

- `identity_swap_same_schema`：同名同类型新数据 → 正常出图（需求 1）
- `fieldmap_renames_resolve`：fieldMaps `{quarter:'period'}` → 取 `period` 值（需求 2）
- `coerce_temporal_variants`：同字段 Date / ISO串 / epoch 数 三源 → 同结果（需求 3）

**边界**：

- `coerce_numeric_string_strict`：quantitative `'120'` → 120；`''` / `'12px'` / `'0xFF'` / `'Infinity'` → 跳过
- `proportion_out_of_range_kept`：proportion `1.5` → 原样 1.5（不 clamp 不跳过）
- `missing_fieldmap_is_identity`：无 fieldMaps → 逻辑名当物理名（恒等，回归现有行为）
- `validate_data_off_by_default`：默认不校验绑定数据；开 `validateData` 后字段缺失比例过高 → fail-loud

**错误路径**：

- `fieldmap_unknown_logical_throws`：fieldMaps 写了 model 没有的逻辑名 → throw
- `fieldmap_without_model_throws`：传 fieldMaps 但未声明 model → throw（fieldMaps 需 model，评审 P1）
- `invalid_value_skipped_not_thrown`：值无法强制（temporal 字段是 `'abc'`）→ 跳过该 datum，不报错

**交互**：

- `fieldmap_plus_coercion`：改名 + 异表示叠加（period 是 Date）→ 正确（需求 2+3 正交）
- `coerce_before_transform_stack`：quantitative 字段是数字串 `'5'`、interval stack → 归一化在 transform 前 coerce，stack 累加得 5 而非 0（评审 P1 的关键回归）
- `normalization_preserves_provenance`：归一化后 `SOURCE_INDEX` 仍能回指原始行（与 alpha.5 provenance 协同）

### 依赖的现有元素

- `toTimestamp`（`plot/src/lower/scale.ts`）—— **修改**：加 `Date` 分支 + 严格 ISO guard（现不收 Date、裸 Date.parse 过宽）
- `resolveFieldPath`（`plot/src/lower/field.ts`）—— 引用：物理路径取值（归一化期）
- `PlotFieldType` + ADR-01 `resolveFieldTypes`（产出的类型 `Map`）—— 引用：按 resolved 类型选 coercion（强依赖 ADR-01）
- `SOURCE_INDEX` / provenance 标记（`plot/src/lower/provenance.ts`，alpha.5）—— 引用：归一化须转移到 canonical row
- `LowerPlotsOptions`（`plot/src/lower/expand.ts`）—— 扩展：加 `fieldMaps`
- 无 core 依赖
