# ADR-01：数据模型类型层——字段类型集补全 + 缺省推断 + encoding 字段引用/类型校验

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.1 Data / §3.2 Dimension / §3.6 Encoding](../../../../../architecture/plot-design.md) · 前身：[alpha.1 ADR-02 DataRef/DataModel](../v0.1-alpha.1/02-plot-data.md) · 下游：ADR-02（数据模型可移植契约）/ ADR-03（type-driven scale）

> **逻辑字段前提**：本 ADR 把 `data.model` 的字段 `name` 视为**逻辑标识**，encoding 引用逻辑名。「逻辑名 → 物理数据路径」的绑定期映射（`fieldMaps`）与「同 PlotFieldType 不同 JS 表示」的值强制（coercion）由 [ADR-02](./02-data-portability.md) 负责；无 `fieldMaps` 时逻辑名 = 物理路径（恒等），即当前行为。本 ADR 的校验与推断按逻辑名工作。

## 背景

[alpha.1 ADR-02](../v0.1-alpha.1/02-plot-data.md) 埋下 `data.model`——字段名 + 测量类型（`PlotFieldType`：quantitative / nominal / ordinal / temporal），当时明说「先放全集、零成本，alpha.1 lowering 仅消费 quantitative」。五个 alpha 过去，这层一直**半消费**：

1. **类型没驱动 scale**：现在 scale 类型靠用户**显式声明** + coordinate 按名绑定（`expand.ts` 的 `requireScaleDef`）；`data.model` 的 `type` 字段几乎不影响 lowering。结果是最小 spec 也得手写每个 scale。
2. **`model` 缺省时无推断**：alpha.1 ADR-02 说「不给则绑定期从外部数据推断」，但**推断逻辑从未实现**——没有 `model` 时字段类型无从得知。
3. **无校验**：encoding 引用了 `model` 里不存在的字段、或字段类型与用途冲突，都不报错。
4. **类型集不全**：阶段二要补的 `proportion`（pie value / ternary a/b/c，[v0 roadmap](../../roadmap.md) §3.2）尚缺。

阶段二把 `data.model` 升级成**承重的类型层**：它是 type-driven scale 选型（ADR-03）、guide 格式化、以及后续非位置通道（alpha.7+）的**单一类型真源**。本 ADR 是阶段二的**结构性地基**（上游、改了牵连下游），故排第一。

同类库参照：**Vega-Lite** 字段必带 `type`（quantitative/temporal/ordinal/nominal），并有 auto type detection；**Observable Plot / ggplot** 从数据列推类型（R column class / JS typeof）。共识是：**类型是 scale / guide / 通道行为的来源**，显式声明优先、缺省从数据推。

## 决策：把字段类型解析成「用户源字段 → FieldType」的单一映射（有 model = strict 全声明；无 model = 全推断；引用 fail-loud）

本 ADR 产出一个**纯函数解析步**，在 lowering ingest 期把「`data.model`（可选）+ 绑定数据 + **用户源字段集**」解析成一份 `Map<logicalField, FieldType>`，作为 ADR-02（coercion 选型）/ ADR-03（scale 选型）及后续的类型真源；同时补全类型集、加引用校验。

> **strict / infer 二选一**（评审 P1）：声明 `model` ⇒ **strict**——所有用户源字段引用必须在 `model` 列出；不声明 `model` ⇒ **全推断**。**不存在「部分声明 + 部分推断」混合**（消除「字段未列出时回退推断」的歧义）。

**(1) 字段类型集补 `proportion`**（`interval` 不加为 field type，见待决策点）：

```ts
export const PlotFieldType = {
  Quantitative: 'quantitative', // 连续可度量数值 → linear
  Nominal: 'nominal',           // 无序分类 → band/point(位置) · ordinal(颜色)
  Ordinal: 'ordinal',           // 有序分类 → 保序离散
  Temporal: 'temporal',         // 日期/时间戳 → time
  Proportion: 'proportion',     // 归一比例 [0,1]（pie value / ternary a/b/c）→ linear domain [0,1]
} as const;
export type FieldType = ValueOf<typeof PlotFieldType>;
```

**(2) 字段分类（strict 校验范围的关键，评审 P1）**：lowering 里的字段引用分三类，**只有「用户源字段」参与 model strict 校验与类型解析**：

| 类别 | 来源 | 例 | 参与 model strict？ |
|---|---|---|---|
| **用户源字段** | 引用外部数据集 | encoding `x.field` / `y.field` / `color.field` + mark `order` / `series` + **transform 输入** `Sort.field` / `Stack.x` / `Stack.y` / `Stack.groupBy` | ✅ 校验 + 解析 |
| **transform 输出 / 内部派生字段** | transform / lowering 合成 | `Stack.startField` / `endField`、mark `y0Field` / `y1Field`、sector `startField` / `endField`（默认 `y0`/`y1`）；未来 aggregate 输出 | ❌（不来自源、类型已知 = 数值） |

派生 / 输出字段不来自源、类型已知，**不**对 model 校验。「用户源字段集」= 扫所有 mark 的 encoding `field` + `order` + `series` + 所有 transform 的输入字段（`Sort.field` / `Stack.x` / `Stack.y` / `Stack.groupBy`）；**排除**常量 `value` 通道、transform 输出（`startField`/`endField`）、mark/sector 的 `y0Field`/`y1Field`/`startField`/`endField` 等派生引用。

**(3) 缺省推断**——纯函数 `inferFieldType(values) → FieldType`，**仅在无 `model` 时**对用户源字段用：

- **双阈值抽样**（防百万数据暗中全扫）：最多扫前 **1000 行**、最多收 **100 个非空标量**，够数即停；
- `Date` 实例 **或** 严格 ISO 字符串（`YYYY-MM-DD` 或带 `Z`/offset 的 ISO datetime）→ `temporal`；**拒绝** `YYYY/MM/DD`、裸数字串 `'5'`、无时区的模糊 datetime（与 ADR-02 temporal coercion **同一套 guard 正则**，杜绝误判）；
- `number`（有限）→ `quantitative`；
- `boolean` / 其余 `string` → `nominal`；
- 没采到标量 / 全非标量 → `nominal`（最安全：只判等）；
- **`proportion` 不自动推断**（语义意图，数值默认 quantitative）——只能经显式 `model` 声明；
- **`ordinal` 不自动推断**——数据无法区分有序/无序，一律 `nominal`，ordinal 必须显式 `model`。

**(4) 类型解析（单一真源）**——`resolveFieldTypes(model, rows, userSourceFields) → Map<logicalField, FieldType>`：

- **有 model（strict）**：每个用户源字段**必须**在 `model` 声明 → 用声明类型；
- **无 model（全推断）**：每个用户源字段 `inferFieldType`（在 `rows` 抽样）；
- 二选一，无混合。

**(5) 自洽 / 引用校验（fail-loud）**：

- **有 model = strict**：用户源字段引用**必须**在 `model` 找到同名声明 → 否则抛 `unknown field "<name>" (data.model declared; all referenced source fields must be listed)`；
- `model` **无重复字段名** → 否则抛 `duplicate field "<name>" in data.model`；
- **无 model**：跳过引用校验（无声明可校验，全推断）；
- 字段类型 ↔ scale 兼容性校验（如 nominal 配 linear）**归 ADR-03**（scale 选型时校验）。

理由：

1. **单一类型真源**：所有下游（coercion / scale 选型 / guide 格式化 / 未来通道）只读这份 `Map`，杜绝「各处各自从 model 或数据猜类型」的漂移——alpha.6 作为「结构性地基」的意义。
2. **strict / infer 二选一**：避免「半声明」歧义（声明了 model 却允许引用未声明字段，校验形同虚设）；要显式契约就全声明（strict），要省事就全推断。
3. **只校验用户源字段**：派生 / transform 输出字段不来自源、强行对 model 校验会误报（如 stack 的 `y0`/`y1` 永远不在 model 里）。
4. **推断守 AI 友好**：LLM 生成 spec 常省 model，全推断让其仍正确；`proportion` 不自动推断避免把普通数值误当比例。
5. **fail-loud**：声明 model 却引用不存在字段是 spec bug，早炸早好（对齐 alpha.5 `datumIdField` 风格）。
6. **temporal 用正则 guard 而非裸 `Date.parse`**：`Date.parse('5')` 在多数引擎返回有效值，会把数值误判时间——必须收窄（也与 ADR-02 temporal coercion 的 guard 保持一致）。


## DSL 表面

> 注：组合 DSL 入口的 `model` prop 由 [ADR-02 React/vanilla API 段](./02-data-portability.md) 定义（`<Plot data={rows}>` 现无 model 面）；本 ADR 用它示意类型层效果。spec 入口则 model 在 `spec.data.model`。

```tsx
// (a) DSL 入口 + model prop：声明类型，scale/guide 由类型派生（ADR-03），LLM 不看数据即知字段
<Plot data={rows} model={[
  { name: 'quarter', type: 'temporal' },
  { name: 'share',   type: 'proportion' },
]}>
  <LineMark x="quarter" y="share" />   {/* 无需手写 scale：quarter→time、share→linear[0,1] */}
</Plot>

// (b) 无 model：类型从数据推断（quarter 字符串日期→temporal、value 数值→quantitative）
<Plot data={rows}><LineMark x="quarter" y="value" /></Plot>

// (c) 声明 model = strict：引用未列出字段 → 编译期 fail-loud
<Plot data={rows} model={[{ name: 'quarter', type: 'temporal' }, { name: 'value', type: 'quantitative' }]}>
  <LineMark x="quater" y="value" />   {/* throw: unknown field "quater" */}
</Plot>
```

vanilla builder 对等（同一 IR）：`plot(spec, datasets)`，`spec.data = { reference, model }` —— `model` / encoding 字段进 IR，解析在 `lowerPlots` 内，两套 authoring 共享类型层。

## 测试设计

`packages/plot/plot/tests/lower/data-model.test.ts` 覆盖：

- 缺省推断各类型（temporal / quantitative / nominal）
- 显式 model 优先于推断
- 引用未声明字段 / 重复字段名 fail-loud
- proportion 经 model 声明、不被自动推断
- temporal guard（数值 `5` 不误判 temporal）

具体 case 见下「实现契约 § 测试象限」。

## 影响

- **IR**：`PlotFieldType` 加 `Proportion`（additive、非 breaking）；`data.ts` schema describe 微调。
- **lowering**：新增 `collectUserSourceFields`（扫 mark encoding `field` + `order` + `series` + transform `Sort.field` / `Stack.x` / `Stack.y` / `Stack.groupBy`，排除派生/输出字段）+ `resolveFieldTypes` + `inferFieldType` 解析步，接进 `expand.ts` ingest（在 scale 解析前产出类型 `Map`，供 ADR-02 coercion / ADR-03 scale 选型消费）；新增 strict 引用校验。**alpha.6 ADR-01 本身不改 scale 选型**（仍走现有显式声明），只产出类型映射 + 校验——scale 选型在 ADR-03 接入。
- **core**：无（纯 plot 内）。
- **文档站**：`data` / data-model 概念页补 `proportion` + 推断规则 + 校验行为；放 alpha.6 develop-document 阶段。
- **对外 API**：`data.model[].type` 多一个合法值 `'proportion'`；引用错字段从「静默」变「报错」（行为收紧，但属修正非 breaking——原本就是 bug spec）。

## 不在本 ADR 范围

- **数据模型可移植契约**：逻辑名→物理路径的 `fieldMaps` 映射、按 PlotFieldType 的值强制（coercion）、换源场景 → ADR-02。
- **type-driven scale 选型**（按类型派生 scale）+ 类型↔scale 兼容校验 → ADR-03。
- **`interval` 双通道编码**（xStart/xEnd）→ alpha.9+。
- **新 scale 类型**（log/pow/quantize/gradient）→ alpha.7-8。
- **值级校验**（声明 temporal 但值不可解析）→ 暂不做（沿用跳过语义，见待决策点）。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/data.ts` 与 `packages/plot/plot/src/lower/{infer,validate,expand}.ts`，测试见 `packages/plot/plot/tests/lower/data-model.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/v0.1-alpha.6/01-data-model.md`（封板全文）。
