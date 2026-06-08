# ADR-07：`FieldDef.order`——分类轴顺序 + 有序性参数（不复活 ordinal 类型，有序由参数判定）

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 roadmap](./roadmap.md) · 本里程碑 [ADR-01 数据模型](./01-data-model.md) / [ADR-03 type-driven scale](./03-type-driven-scale.md) · 前序：字段类型简化为 3 类（合并掉 ordinal，commit `30f2cce1`）· [plot-design.md §3.1 数据模型 / §3.5 scale](../../../../../architecture/plot-design.md)

## 背景

字段类型简化成 `continuous / categorical / temporal` 三类（commit `30f2cce1`），合并掉了 `ordinal`——代价是丢了「有序类别」语义：`categorical` 的轴/图例顺序**只能按数据出现序**（`inferCategoryDomain` 去重保序），用户无法控制。`['S','M','L','XL']` 这种本该有序的尺码，画出来全凭数据里第一次出现的次序，乱且不可控；想按字母 / 数值排序也没有开关。这是合并 ordinal 时欠的债，会很快成真实痛点（ggplot 的 factor level、Vega-Lite 的 `sort`、ECharts 的显式 domain 都把它当核心能力）。

**不复活 `ordinal` 类型**（那会让类型集重新膨胀、且与「3 类简单心智」决策冲突）。改用一个 **`FieldDef.order` 参数**：既给出顺序，又**由它是否设置来判定该分类是否有序**——一个参数解决「有序性」与「具体顺序」两件事。

## 决策：`FieldDef` 加可选 `order`（`'data' | 'ascending' | 'descending' | Array`），`order ≠ 'data'` 即视为有序，驱动 categorical 域排序

`order` 进 `data.model`、JSON 可序列化。scale 域解析（band/point 位置 + ordinal 颜色）读该字段的 `order` 决定类别顺序；`order` 非默认即表示「这个分类有序」（供后续有序图例 / 顺序色板）。

```ts
// FieldDefSchema 加：
//   order: z.union([
//     z.enum(['data', 'ascending', 'descending']),
//     z.array(z.union([z.string(), z.number()])).min(1),
//   ]).optional()
//   .describe('Category order for a categorical field: data appearance (default), ascending/descending sort, or an explicit value list. A non-default order marks the field as ordered')
```

DSL：

```tsx
<Plot data={rows} model={[
  { name: 'size',  type: 'categorical', order: ['S', 'M', 'L', 'XL'] }, // 显式有序
  { name: 'grade', type: 'categorical', order: 'ascending' },           // 升序排序
  { name: 'city',  type: 'categorical' },                               // 缺省 'data'：无序、按出现序
]}>{/* … */}</Plot>
```

语义：

- **`'data'`（默认）**：数据出现序去重（即现状），无序。
- **`'ascending' / 'descending'`**：对去重后的类别排序——全数值按数值比，否则按字符串 locale 比；该字段视为有序。
- **`Array`**：显式类别顺序作域；数据中出现、但不在数组里的值 → **追加到末尾**（见待决策点），该字段视为有序。
- **有序性 = `order` 非 `'data'`**：不另加 `ordered` 布尔——参数本身判定有序，符合「通过参数判断是否有序」。

### order 如何落到 scale（cross-review #2，钉死）

现 `resolvePositionScale(def, values, fallbackRange)` 只收**合并后的 values**、不知字段名（[scale.ts:304](../../../../../packages/plot/plot/src/lower/scale.ts)），而 `collectValues` 跨该 role 所有 mark 合并取值——order 挂 FieldDef，必须在**知道字段名的那一层**（`resolveScaleForRole`，[expand.ts:181](../../../../../packages/plot/plot/src/lower/expand.ts)）解析成域，再作为 `def.domain` 下传，而非改 `resolvePositionScale` 签名。规则照搬现成的 `roleFieldTypes` / 混类型 fail-loud 套路：

- **单字段绑该 role**：取该字段 `order`，按 order 算出有序类别域，注入 `scale.domain`（band/point/ordinal 同此域）。
- **多字段共该 role（不同字段不同 order）**：若解析出**冲突的 order**（≥2 个不同非默认 order）→ **fail-loud**（与「混类型 fail-loud」同档），提示显式给 scale domain。多字段同 order 或仅一个有 order → 用那个。
- **显式 scale `domain` 已给**：显式 domain **优先**，`order` 被忽略（domain 是更低层覆盖；不双重排序）。本 ADR 不新增 scale 级 domain，但既有 BandScale.domain 若存在则压过 order。
- **order 注入点**：在 `resolveScaleForRole` 内，派生/查表得到 `def` 后，若该 role 字段有 order 且 `def.domain` 未显式给 → 用 order + values 算 `orderedCategoryDomain` 填进 `def.domain`，再交 `resolvePositionScale`。`expand.ts` 把 `field→order` 与 `field→type` 同源透传（一并由 `prepareRows` / model 提供）。

理由：

1. **不膨胀类型集**：守「3 类简单心智」决策，有序作为分类字段的**可选属性**而非独立类型。`{ type:'categorical', order:[...] }` 即「有序类别」，裸字面量 `{type:'categorical'}` 仍是无序常态。
2. **一个参数两件事**：`order` 同时给「是否有序」与「具体顺序」，避免 `ordered:boolean` + `order` 两字段的冗余与不一致。
3. **挂 FieldDef 而非 scale**：order 是**字段的数据语义**（这一列类别本身有序），故同一字段无论用作位置（band）还是颜色（ordinal），顺序一致——挂 FieldDef 天然覆盖两处；scale 级显式 domain 留作更低层覆盖（不在本 ADR）。
4. **可序列化 / LLM 友好**：`order` 是枚举或数组、进 IR，spec 仍 100% JSON 可序列化、LLM 能生成。

## 已钉死（cross-review 合入 2026-06-07）

- **`order` 配非 categorical 字段 → fail-loud**（cross-review #3）：`order` 是 public schema 行为，不能留到实现期再选。`order` 只允许 resolved type 为 `categorical` 的字段；配 `continuous` / `temporal` → lowering **报错**（不静默忽略——忽略会让用户误以为排序生效，与 retikz fail-loud 取向冲突）。schema 层无法拦（type 可推断、可省），故在 lowering 解析 order→域时校验。
- **多字段同 role 冲突 order → fail-loud**：见上「order 如何落到 scale」。
- **显式 scale domain 压过 order**：见上。

## 待决策点 🔻

- **`Array` 漏项策略**：数据里有、order 数组没有的类别 → **追加末尾**（推荐，不丢数据）/ 丢弃 / fail-loud？倾向追加末尾 + 可选 warn。
- **混合类型排序**：`'ascending'` 下类别同时有 string 和 number → 比较规则（全数值才数值比，否则统一 `String()` locale 比）。倾向后者兜底。
- **null / 缺失类别位置**：排序时 null 类别（若存在）排首还是尾。倾向尾。

## 影响

- **IR schema**：`FieldDefSchema` 加 `order?`（**非破坏**，可选）。
- **lowering**：order **在 `resolveScaleForRole`（expand.ts）解析成有序域、注入 `def.domain`**（不改 `resolvePositionScale` 签名）；新增 `orderedCategoryDomain(values, order)` helper（scale.ts，复用 `inferCategoryDomain` 去重再排）；`expand.ts` 把 field→order 与 field→type 同源透传，并做「非 categorical 配 order」「同 role 冲突 order」「显式 domain 压过 order」三道判定。color 通道（`makeColorResolver` / `resolveOrdinalScale`）同样从该字段 order 取域，保证位置/颜色同序。
- **公开 API**：`model` 的 FieldDef 多 `order`。
- **文档站**：`grammar/data` 补「分类顺序」段（顺带说明「有序类别 = 给 order」，替代旧 ordinal 心智）。
- **core**：无。

## 不在本 ADR 范围

- **scale 级显式 `domain`**（band/point 直接给域数组）——更低层覆盖，留后续，避免与 FieldDef.order 双真源。
- **顺序色板 / 有序图例**（sequential palette、ordered legend 渲染）——order 给了「有序」信号，但消费它的视觉能力属 alpha.7+ 通道/图例工作。
- **`sortBy` 按另一字段聚合排序**（Vega-Lite `sort:{field,op}`）——需聚合，依赖 transform 家族，留后续。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/plot/plot/src/ir/data.ts`（IR schema）+ `lower/scale.ts` / `expand.ts`（域解析）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/data.ts` | 加 | `FieldDefSchema.order` | `z.union([z.enum(['data','ascending','descending']), z.array(z.union([z.string(),z.number()])).min(1)]).optional()` | `—`（默认 `'data'` 出现序、无序） | 分类字段类别顺序：出现序 / 升降序 / 显式列表；非默认即视为有序 |

### 文件 scope

- `packages/plot/plot/src/ir/data.ts`（修改：`FieldDefSchema.order`）
- `packages/plot/plot/src/lower/scale.ts`（新增：`orderedCategoryDomain(values, order)` helper；不改 `resolvePositionScale` 签名）
- `packages/plot/plot/src/lower/expand.ts`（修改：`resolveScaleForRole` 解析 field→order → 注入 `def.domain` + 三道判定；`makeColorResolver` 同源取 order；field→order 与 fieldTypes 同源透传）
- `packages/plot/plot/tests/lower/category-order.test.ts`（新建）
- `apps/docs/src/contents/plot/grammar/data/index.{zh,en}.mdx`（修改：分类顺序段）

### 测试象限

**Happy path**：
- `explicit_array_order`：`order:['S','M','L']` → band 域按数组序
- `ascending_sorts_numeric`：数值类别 `order:'ascending'` → 按数值升序
- `default_data_order_preserved`：不写 order / `'data'` → 出现序（与现状逐字等价）

**边界**：
- `array_missing_value_appended`：数据有、order 数组无的类别 → 追加末尾、不丢
- `ascending_mixed_falls_back_string`：类别混 string+number → 统一字符串比，不崩
- `single_category_order`：单一类别 + order → 正常

**错误路径**：
- `empty_array_order_rejected`：`order:[]` schema 拒（`.min(1)`）
- `order_on_continuous_throws`：`order` 配 `continuous` 字段 → lowering fail-loud（cross-review #3）
- `conflicting_order_same_role_throws`：同 role 两字段给不同非默认 order → fail-loud（cross-review #2）

**交互**：
- `order_applies_to_position_and_color`：同一有序字段既作 x(band) 又作 color(ordinal) → 两处类别序一致
- `order_with_type_driven_scale`：`{categorical, order}` + 省略 scale → 派生 band 且域按 order
- `explicit_domain_overrides_order`：scale 显式 `domain` + 字段 `order` 同在 → 用显式 domain（order 被忽略，cross-review #2）
- `order_json_roundtrip`：含 order 的 model `JSON.parse(JSON.stringify())` 后 schema parse 等价

### 依赖的现有元素

- `FieldDefSchema`（`ir/data.ts`）—— 扩展：加 `order`
- `inferCategoryDomain`（`lower/scale.ts`）—— 复用：`orderedCategoryDomain` 在其去重基础上排序
- `resolveScaleForRole` / `roleFieldTypes`（`lower/expand.ts`）—— 修改/复用：order 解析与「混类型 fail-loud」同层，注入 `def.domain`
- `resolveFieldTypes`（`lower/validate.ts`）/ `prepareRows`（`lower/expand.ts`）—— 引用：field→order 与 field→type 同源透传
- ADR-03 type-driven scale —— 协同：categorical 派生 band 时应用 order
