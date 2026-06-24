# ADR-01：bin + aggregate transform——Statistics 基础的「改行数」规约变换（连续分箱 + 分组聚合）

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[alpha.12 roadmap](./roadmap.md) · [ADR-02：derive + normalize + jitter](./02-derive-normalize-jitter.md) · [plot v0.1 roadmap](../roadmap.md)「Statistics 基础」行 · [plot-design.md §3.1/§3.3 数据管线 / §7 transform 模块 / §5.2 Primitive API](../../../../../architecture/plot-design.md) · [alpha.11 ADR-02：rect mark](../alpha.11/02-rect-mark.md)「binned heatmap 显式区间边」钩子

## 背景

grammar of graphics 的 **Statistics（统计变换）** 是数据管线（plot-design §3.1 / §3.3 / 表 §一行 1）中位于 mark 之前、scale 之后域推断之前的一层：把数据行按统计规则重写，再喂位置 / 颜色编码。现状 plot 的 transform 层（`packages/graph/plot/src/ir/transform.ts`）只有 alpha.3 的 `sort`（稳定重排）与 `stack`（组内累加派生 `[y0,y1]`）——**两者都保行数**（N 行进、N 行出，只重排或追加标量字段）。缺了「**改行数**」的规约变换，plot 画不出最基础的统计图：

- **histogram（直方图）**：连续字段先分箱（N 个观测 → M 个箱），再数每箱频数。没有 bin，cartesian1D「histogram 底座」（alpha.9）只有空壳、没有分箱数据来源。
- **分组聚合柱 / 折线**：原始明细（每笔订单一行）按类别 groupBy 后求 sum / mean / count（N 笔 → M 类），再画柱。没有 aggregate，用户得在 plot 之外手动 reduce，违背「数据 → transform → mark」的 GoG 管线。
- **histogram 渲染契约**：bin 产出 `binStart`/`binEnd`/`binValue` 之后，必须有一个 mark 能把「连续 x 区间 × 高度」画成直方柱——band scale 的柱（interval 取 `bandwidth`）画的是分类等宽柱，画不出「连续 x 轴上 `[binStart, binEnd]` 紧贴排列、宽度随箱边变化」的直方图。alpha.11 rect ADR-02 把 interval / rect 的「显式区间边」（`x0/x1` / `y0/y1`）deferred 并 **gate 于 bin transform**；bin 一旦落地，这条 gate 即可解开。
- **binned heatmap（2D 直方图 / 密度热图）**：bin 产出的箱边同样是 rect 「连续轴分箱热图」显式区间 cell 的数据来源（rect 的 `x0/x1/y0/y1` 仍由 rect 后续 ADR 解锁，本 ADR 只交付数据来源 + interval 的连续 x 区间柱）。

同类库对照：Observable Plot 的 `Plot.binX` / `Plot.groupX`（reducer = count / sum / mean…）、Vega-Lite 的 `bin: true` + `aggregate`、G2 的 `transform: [{ type: 'bin' }, { type: 'group' }]`、ggplot 的 `stat_bin` / `stat_summary`——都是「连续 → 离散箱」与「groupBy + reduce」两件正交的事。retikz 的差异点是 §3.3 硬约束：**IR 必须 100% JSON 可序列化**——reducer 不能是函数，只能是可序列化的枚举关键字（sum / mean / count / min / max）；分箱策略（箱数 / 箱宽 / 边界）也得是 JSON 数值参数，不塞函数。

「改行数」是本轮（与 ADR-02 的「保行数」派生类相对）的核心新语义：现状 `applyTransforms`（`lower/transform.ts`）的两个 op 都 `rows.length` 不变，bin / aggregate **打破这条隐式不变量**——这要求 transform 链顺序、与 scale 域推断（`expand.ts` 用 transform 后的 rows 推域）、与 `collectUserSourceFields`（strict model 校验只认用户源字段、不认派生字段）的协同必须显式定清，否则派生出的箱字段会被误当用户源字段送进 model 校验而 fail-loud。

## 决策：新增 `bin` / `aggregate` 两个「改行数」transform op，均产出**派生字段**（不进 strict model 用户源集，但被消费的输入字段进）；同时给 interval mark 加 `x0Field`/`x1Field` 连续 x 区间柱（histogram 渲染落地）；React 表面统一走 `<Transform>` 声明组件 + `<Plot transforms>`，5 个 transform 共用这一个 surface，**不再为新 transform 走 mark-prop 自动装配**

`PlotTransform` 加 `Bin` / `Aggregate` 两成员（`as const` + `ValueOf`，与现有 `Sort` / `Stack` 同风格），各自 schema 判别字段 `kind`，并入 `TransformSchema` 判别 union。`applyTransforms`（`lower/transform.ts`）加两条 reduce 分支，两者均 `rows.length` 可变（N → M）。

**histogram 渲染（interval x0/x1 区间柱，本 ADR 落地）**：bin 产出 `binStart`/`binEnd`/`binValue` 后，由 interval mark 渲染「连续 x 区间 × 高度」的直方柱——给 `IntervalMarkSchema` 加 `x0Field`/`x1Field` 两个可选字段（连续 x 区间柱）：设了 x0/x1 时，lowering 把 cell 的 **primary** 取 `[coordinate(x0), coordinate(x1)]`（连续 x 区间，对应 bin 的 `binStart`/`binEnd`）而非 band 的 `bandwidth`；**secondary（y 高度）照旧**取 `coordinate(baseline)..coordinate(value)`。这正是 alpha.11 ADR-02 deferred、gate 于 bin 的那条；bin 落地即解 gate。histogram 因此走连续 x 轴：`<BarMark x0="binStart" x1="binEnd" y="binValue" />`。x0/x1 与 band primary 互斥（设 x0/x1 走连续区间分支，否则走 band bandwidth 旧路），未设 x0/x1 时 interval 行为完全不变（与 stack 的 `y0Field`/`y1Field` 同模式：可选派生字段、缺省走旧路）。

```ts
// ir/transform.ts —— PlotTransform 增成员（裸串同样可用，与 sort/stack 一致）
export const PlotTransform = {
  Sort: 'sort',
  Stack: 'stack',
  /** 连续字段分箱：N 行观测 → M 箱，每箱产出 start/end 边界 + 箱内规约值（histogram 底座 / rect 显式区间边来源） */
  Bin: 'bin',
  /** 分组聚合：groupBy 字段分组 + 规约（sum/mean/count/min/max）→ 每组一行（改行数） */
  Aggregate: 'aggregate',
} as const;

// bin transform：连续 field → 离散箱；边界策略三选一（thresholds 显式 / step 箱宽 / count 箱数，互斥），nice 对齐
export const BinTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Bin).describe('Discriminator: bin a continuous field into discrete intervals (changes row count)'),
    field: z.string().min(1).describe('Continuous source field to bin; its value range is the binning domain unless extent is set'),
    // 边界策略：三者互斥，至多一个；全缺 → 默认按 count 箱数（见默认值）
    count: z.number().int().positive().optional().describe('Target number of bins; mutually exclusive with step / thresholds; default 10 when no strategy is set'),
    step: z.number().positive().optional().describe('Fixed bin width in data units; bins tile the domain from the lower bound; mutually exclusive with count / thresholds'),
    thresholds: z.array(z.number()).min(1).optional().describe('Explicit interior boundaries (sorted ascending); K thresholds yield K+1 edges (extent endpoints fill the ends) and K+1 bins; mutually exclusive with count / step'),
    extent: z.tuple([z.number(), z.number()]).optional().describe('Override binning domain [min, max]; default = observed min/max of field'),
    nice: z.boolean().optional().describe('Round bin boundaries to human-friendly values (count strategy only); default true'),
    reduce: z.enum(['count', 'sum', 'mean', 'min', 'max']).optional().describe('Per-bin reducer over reduceField; default count (frequency)'),
    reduceField: z.string().min(1).optional().describe('Numeric field reduced per bin; required for sum/mean/min/max, ignored for count'),
    startField: z.string().min(1).optional().describe('Output field for each bin lower edge; default "binStart"'),
    endField: z.string().min(1).optional().describe('Output field for each bin upper edge; default "binEnd"'),
    valueField: z.string().min(1).optional().describe('Output field for the per-bin reduced value; default "binValue"'),
  })
  .describe('Bin transform: partition a continuous field into N intervals, emitting exactly N rows (one per bin, including empty bins whose reduced value is 0) with [start, end] edges and a reduced value');

// aggregate transform：groupBy 一或多个字段 + 规约一字段 → 每组一行（改行数）
export const AggregateTransformSchema = z
  .object({
    kind: z.literal(PlotTransform.Aggregate).describe('Discriminator: group rows and reduce to one row per group (changes row count)'),
    groupBy: z.array(z.string().min(1)).min(1).describe('Categorical key fields; rows sharing all key values form one group (group keys are carried onto the output row)'),
    reduce: z.enum(['sum', 'mean', 'count', 'min', 'max']).describe('Reducer applied within each group'),
    field: z.string().min(1).optional().describe('Numeric field reduced per group; required for sum/mean/min/max, ignored for count'),
    as: z.string().min(1).optional().describe('Output field for the reduced value; default = reduce + capitalized field (e.g. "sumRevenue"), or "count" for count'),
  })
  .describe('Aggregate transform: groupBy + reducer, producing one output row per group carrying group keys plus the reduced value');

export const TransformSchema = z
  .discriminatedUnion('kind', [SortTransformSchema, StackTransformSchema, BinTransformSchema, AggregateTransformSchema])
  .describe('Data transform op applied before scale / mark; ordered pipeline. sort / stack preserve row count; bin / aggregate reduce it');
```

lowering（`lower/transform.ts`，加两条纯函数分支）：

```ts
// applyBin：按策略算箱边 → 把 field 值落箱 → 每个箱产一行（携 startField/endField/valueField + 该箱代表键）
//   - 边界：thresholds 显式优先（K thresholds → 用 extent 端点补齐成 K+1 条边 → K+1 个箱）；否则 step 箱宽平铺；否则 count 箱数（nice 默认对齐到友好刻度）
//   - 域来源：extent 显式优先，否则取 field 观测 min/max（与 scale 连续域同源逻辑，复用 collectNumericDomain 思路）；extent 端点也用来补 thresholds 两端
//   - reduce=count → valueField = 箱内行数；sum/mean/min/max → 对 reduceField 规约
//   - 空箱保留产行（valueField=0；缺省语义）——histogram 需连续 x 轴上每个箱都有柱位（哪怕高度 0），故 count:N → N 个箱（含空箱）
const applyBin = (rows: Array<ExternalRow>, op: BinTransform): Array<ExternalRow> => { /* ... */ };

// applyAggregate：按 groupBy 全键分组（多键 = 复合键，稳定按首次出现序）→ 每组一行
//   - 输出行携 groupBy 各键的值（组标识，下游位置编码读它）+ as 字段（规约值）
//   - count 不需 field；sum/mean/min/max 缺 field → fail-loud（无被聚合量）
const applyAggregate = (rows: Array<ExternalRow>, op: AggregateTransform): Array<ExternalRow> => { /* ... */ };
```

`collectUserSourceFields`（`lower/validate.ts:61`）补两条分支，严守「**被消费的输入字段进 strict model 集、派生输出字段不进**」（与 stack 的 `field/x/y/groupBy` 进、`startField/endField` 不进完全同模式）：

```ts
// bin：field（被分箱的源字段）+ reduceField（被规约的源字段，若有）进；startField/endField/valueField 不进
// aggregate：groupBy 各键 + field（被规约源字段，若有）进；as 不进
```

理由：

1. **改行数是 Statistics 层的本质能力，必须进 transform 而非 mark / scale**——histogram 与分组柱是 GoG 最基础的两张图，没有「N→M 规约」就只能让用户在 plot 外手动 reduce，破坏「data → transform → mark」管线（plot-design §3.1）。把规约放 transform 层，下游 mark / scale / guide 全部无感（仍是「行 → 几何」），符合 §7「transform 是数据层、与几何正交」。
2. **派生字段不进 strict model 用户源集，是现有契约的直接延伸**——`collectUserSourceFields` 已经把 `Stack.startField/endField` 排除在 strict 校验外（`validate.ts:14`），bin/aggregate 的输出字段（`binStart`/`binValue`/`as`）同理：它们是 transform **产出**的，用户 model 里不会声明，若误进 strict 集会立刻 `unknown field` fail-loud。但**被消费的输入字段必进**（bin 的 `field`、aggregate 的 `groupBy`/`field`），否则漏过数据契约校验。这条「输入进、输出不进」是本 ADR 与 collectUserSourceFields 协同的硬规则。
3. **scale 域推断天然吃 transform 后的 rows**——`expand.ts` 域推断用的是 `applyTransforms` 之后的 `rows`（`expand.ts:1172`），所以 bin 产出的 `binStart..binEnd`、aggregate 产出的 `as` 值会自动进域；下游 mark（如 rect 读 `x0Field=binStart`、bar 读 `y=binValue`）的位置编码绑这些派生字段即可。无需为派生字段单开域推断路径。
4. **React 表面统一收敛到一个通用 `<Transform kind="...">` 声明组件，不再扩张 mark-prop 自动装配**——现状 stack 由 `<BarMark stack>` / `<SectorMark>` **隐式装配**（`build-plot-spec.ts:317/335`）是历史便利，但 bin / aggregate 是「先于 mark、改行数」的独立数据步骤，与具体 mark 解耦：同一份 binned 数据可同时喂 rect + line。继续走 mark-prop 会逼出 `<BarMark bin step={5} aggregate="sum">` 这种把数据步骤糊进几何 prop 的反模式。**本 ADR 定一个通用 `<Transform kind="...">` 声明组件 + `<Plot transforms={[...]}>` 直传，作为本轮 5 个 transform（sort / stack / bin / aggregate + ADR-02 的 derive / normalize / jitter）共用的唯一 authoring surface**：`<Transform>` 组件在本 ADR 落地、服务所有 kind（按 `kind` 判别扁平 props）；ADR-02 的 transform 复用本 `<Transform>`，不另造组件。两条路（声明组件 + transforms 直传）并存，让 transform 成为可显式排序、可复用的管线节点（与 IR 的 `transform: Array<Transform>` 一一对应，等价性清晰）。

## 待决策点 🔻

- **transform 的 React authoring 表面（已定）**：定 (a) 通用 `<Transform kind="..." .../>` 声明子组件 + (c) `<Plot transforms={[...]}>` 直传 IR 数组并存，明确放弃 (b) mark-prop 自动装配（如 `<BarMark bin>`）。理由见决策理由 4。(a) `<Transform>` 作 `collectInto` 认得的子组件（与 `<Axis>`/`<Scale>` 同列，装进 `collected.transforms`）；(c) `<Plot transforms>` 直接拼到收集结果前（用户完全掌控顺序）。**stack 的 `<BarMark stack>` / `<SectorMark>` 自动装配现状保留**（0.x 不为兼容造负担，但 stack 的隐式装配已是既成事实且 ADR-02 normalize 接它，本轮不动；新 transform 一律走 (a)/(c)）。
- **`<Transform>` 与自动装配 stack 的去重规则（已定）**：当用户管线里**已显式存在一个 stack transform**（经 `<Transform kind="stack">` 或 `<Plot transforms>` 直传）时，`build-plot-spec` **抑制 `<BarMark stack>` / `<SectorMark>` 的 auto-stack 装配**（不再二次注入 stack op，避免对同一组数据堆叠两次）。装配顺序：显式 transforms（含显式 stack）在前，auto-stack 仅在「无显式 stack」时补在后。这条写进 build-plot-spec 装配契约（见实现契约「transform 执行顺序 / 装配」段）。
- **bin 边界策略（三选一互斥，倾向已定）**：`thresholds`（显式边界）> `step`（箱宽）> `count`（箱数）三者互斥，schema 层 `.optional()` + lowering 校验「至多设一个，全缺 → `count` 默认 10」。`nice`（边界对齐友好刻度）**仅对 count 策略生效**（step/thresholds 已是用户显式给定，不二次圆整），缺省 `true`。域来源：`extent` 显式 > field 观测 min/max。**倾向：count + nice 为默认主路径**（最常用、最省心），step/thresholds 为进阶旋钮。
- **aggregate 输出字段命名（覆盖原字段 vs 新字段名，倾向已定）**：**倾向新字段名、不覆盖原字段**。`as` 缺省 = `reduce` + 首字母大写 `field`（如 `sum` over `revenue` → `sumRevenue`），count 缺省 = `"count"`。理由：覆盖原字段会让「原始值」与「规约值」共名、破坏可追溯性，且 groupBy 键字段需原样保留（下游位置编码读组标识）。bin 同理：`startField`/`endField`/`valueField` 默认 `binStart`/`binEnd`/`binValue`，均新字段。
- **改行数 transform 与 collectUserSourceFields / scale 域的协同（已定，非待决策）**：**输入字段进 strict model 集、派生输出字段不进**（见决策理由 2）。bin: `field` + `reduceField` 进、`startField`/`endField`/`valueField` 不进；aggregate: `groupBy` 各键 + `field` 进、`as` 不进。scale 域推断用 transform 后 rows（`expand.ts:1172`），派生字段自动进域、无需单开路径。
- **transform 执行顺序 / 装配（已定）**：管线按声明序折叠（`applyTransforms` reduce）。改行数 op 之后再接保行数 op（如 bin → sort 箱、aggregate → stack 组）语义自洽；但**保行数 op（stack）依赖的字段被前序改行数 op 抹掉则 fail-loud**（如 aggregate 掉 series 字段后再 stack groupBy=series 会找不到字段）。**不在 schema 层硬约束顺序**（GoG 管线本就线性自由组合），靠 lowering 各 op 自身的字段缺失 fail-loud 兜底；文档给「先 bin/aggregate 后 sort/stack」的推荐顺序。`build-plot-spec` 装配序：`<Plot transforms>` 直传在最前、`<Transform>` 收集结果次之、auto-stack 最后补——**且 auto-stack 仅在显式 transforms 不含 stack 时注入（B4 去重，避免二次堆叠）**。

## DSL 表面

两套表面别混：**IR 形态**是 JSON 可序列化的 transform op（进 `spec.transform` 数组）；**React sugar 形态**是 `<Transform>` 声明组件或 `<Plot transforms>` 直传。

### IR 形态（进 IR，JSON 可序列化）

```ts
// histogram：连续 measurement 分 20 箱（nice 边界）、每箱计数 → interval 读 binStart/binEnd（连续 x 区间柱）+ binValue（高度）
{ kind: 'bin', field: 'measurement', count: 20, reduce: 'count' }
//   产出每箱（含空箱 binValue 0）：{ binStart, binEnd, binValue, measurement: <箱代表值> }

// 分组聚合柱：按 region 求 revenue 总和 → 每 region 一行
{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'totalRevenue' }
//   产出每组：{ region: <键值>, totalRevenue: <sum> }
```

### React sugar 形态（`<Transform>` 声明组件 + `<Plot transforms>` 直传）

```tsx
// histogram：<Transform> 声明分箱（kind="bin"），bar 读派生的 binStart/binEnd 作连续 x 区间柱（连续 x 轴）+ binValue 作高度
<Plot data={samples} model={model}>
  <Transform kind="bin" field="measurement" count={20} />
  <BarMark x0="binStart" x1="binEnd" y="binValue" />
</Plot>

// 分组聚合柱：先 aggregate 求每 region 的 revenue 总和，再画柱（柱读组键 + 规约值）
<Plot data={orders} model={model}>
  <Transform kind="aggregate" groupBy={['region']} reduce="sum" field="revenue" as="totalRevenue" />
  <BarMark x="region" y="totalRevenue" />
</Plot>

// 直传形态（完全掌控顺序）：等价于上方两段
<Plot data={orders} transforms={[{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue', as: 'totalRevenue' }]}>
  <BarMark x="region" y="totalRevenue" />
</Plot>
```

> 接 alpha.11 钩子：bin 产出 `binStart`/`binEnd` 正是「显式区间边」的数据来源。本 ADR 已落地 **interval 的 `x0Field`/`x1Field`**（连续 x 区间柱，histogram），解开 alpha.11 ADR-02 gate 于 bin 的那条 interval/rect deferred 项中的 interval 部分；**rect 的 `x0/x1/y0/y1`（binned heatmap 显式区间边）仍由 rect 后续 ADR 解锁**，本 ADR 只为它交付 bin 这个数据来源。

## 测试设计

`packages/graph/plot/tests/lower/transform.test.ts`（扩展现有）+ `packages/graph/plot/tests/ir/transform.test.ts`（schema 分支）+ `packages/graph/plot/tests/lower/validate.test.ts`（用户源字段集）覆盖：

- bin：三种边界策略（count / step / thresholds）的箱边、空箱跳过、reduce 五种规约、nice 对齐、extent 覆盖域
- aggregate：单 / 多键 groupBy、五种 reducer、`as` 默认 / 显式命名、组键原样保留
- 改行数：bin/aggregate 后 `rows.length` 为箱数 / 组数（与输入不同）
- collectUserSourceFields：bin `field`/`reduceField` 进、输出字段不进；aggregate `groupBy`/`field` 进、`as` 不进
- 错误路径：sum/mean/min/max 缺 field（aggregate）/ reduceField（bin）→ fail-loud；bin 边界策略多设 → fail-loud
- 交互：transform 链顺序（aggregate → stack、bin → sort）；scale 域取派生字段；React `<Transform>` / `<Plot transforms>` 装配出等价 IR

具体见下「实现契约 § 测试象限」。

## 影响

- **Plot IR**：`ir/transform.ts` 加 `BinTransformSchema` / `AggregateTransformSchema` / `PlotTransform.Bin` / `PlotTransform.Aggregate` / 派生类型 / 并入 `TransformSchema` union；`ir/mark.ts` `IntervalMarkSchema` 加 `x0Field` / `x1Field`（连续 x 区间柱，histogram 渲染）（red：动 `ir/**`）。
- **lowering**：`lower/transform.ts` 加 `applyBin` / `applyAggregate` 两条 reduce 分支（改行数纯函数，含组级 provenance meta）；`lower/validate.ts` `collectUserSourceFields` 加 bin/aggregate 分支（输入字段进、输出不进）；`lower/{anchor,mark}.ts` interval 分支在设了 `x0Field`/`x1Field` 时 primary 取连续区间 `[coord(x0),coord(x1)]`、secondary 高度照旧。**`expand.ts` 域推断无需改**——已用 transform 后 rows（`expand.ts:1172`），派生字段（含 binStart/binEnd）自动进域。
- **改行数不变量 + provenance 组级映射（已定）**：现状 `applyTransforms` 隐含「行数不变」（sort/stack），bin/aggregate 显式打破。下游 provenance（`sourceIndex`/`transformedIndex`，plot-design §13.4）：聚合 / 分箱产出的每个 datum 对应**一组源行**而非单行。**决策：bin/aggregate 输出行的 provenance meta 记「组键 + 源行索引集合」（`Array<number>` 而非单 `sourceIndex`）**——聚合 datum 代表该箱 / 该组，是组级身份。datum locator 在聚合 mark 上随之降级为**组级 locator**（locator 指向该箱 / 组的源行集合，单源行 locator 在改行数 op 后不再适用）。这不是「断链」，而是「单源 → 组级」的语义降级；精确字段形态与 provenance 模块对齐留实现期，但「meta 指向源行集合、locator 组级」是本 ADR 定死的契约（见测试边界）。
- **依赖 core**：无——transform 是纯数据层，不下沉 core IR、不消费 core 新能力。
- **三包 lockstep 同步交付**（plot / plot-react / plot-vanilla 同一改动集）：
  - **plot**（red）：IR + lowering，如上。
  - **plot-react**（yellow 面）：`components/` 加 **通用 `<Transform kind="...">` 声明组件**（`FC<TransformProps>` 返回 null，扁平 props 按 kind 判别，服务全部 5 个 transform kind，含 ADR-02 复用）；`build-plot-spec.ts` `collectInto` 加 `<Transform>` 分支（装进 `collected.transforms`）+ `buildPlotSpec` 接 `options.transforms`（`<Plot transforms>` 直传，拼到自动装配 stack 之前）；**B4 去重：当显式 transforms（含 `<Transform kind="stack">` / 直传 stack）已含 stack 时，抑制 `<BarMark stack>` / `<SectorMark>` 的 auto-stack 注入，不二次堆叠**；`marks.tsx` 的 `BarMark` 加 `x0`/`x1` props（→ interval `x0Field`/`x1Field`，histogram 连续 x 区间柱）；barrel 导出 `Transform` + `TransformProps`。
  - **plot-vanilla**：**无代码改动**——`renderPlot(spec, data)` transform 无关、纯 spec 驱动，bin/aggregate 经 IR + lowering 自动生效。交付 = vanilla SSR 渲染测试（histogram + 分组聚合柱 spec → 出柱）。
- **文档站**：transform 文档新增 bin / aggregate 两节（改行数语义、边界策略、reducer、派生字段、与 sort/stack 对照）+ histogram demo + 分组聚合柱 demo（含 vanilla SSR）；`<Transform>` 组件页 + `<Plot transforms>` prop 说明；zh / en 同步。
- **对外 API**：纯新增 transform op + `<Transform>` 组件 + `<Plot transforms>` prop，非 breaking。

## 不在本 ADR 范围

- **normalize / derive-interval / jitter**（保行数派生 / 调整）：ADR-02。
- **interval 的连续 x 区间柱（`x0Field`/`x1Field`）：本 ADR 已落地**（histogram 渲染契约，见决策段），不在「不在范围」。
- **rect 的显式区间边 prop**（`x0Field`/`x1Field`/`y0Field`/`y1Field`）：bin 是其数据来源，但 rect prop 本身由 rect 后续 ADR 解锁（alpha.11 ADR-02 已挪此项「不在范围」）；本 ADR 只交付 bin 这个数据来源。
- **filter transform**（行筛选，也改行数）：plot-design §7 列了 filter，但本轮聚焦 bin/aggregate，filter 后续按需。
- **2D bin（binX × binY 同时分箱）**：本轮 bin 单字段分箱；二维直方图的双轴分箱（喂 binned heatmap）后续可由两条 bin op 或专门 2D bin op 表达，留后续。
- **density / smooth(回归) / quartile**：alpha.13（plot-design / roadmap 已排）。
- **provenance 组级映射的精确字段形态**：组级语义本 ADR 已定（meta 记组键 + 源行索引集合、locator 组级降级，见「影响」段），但 meta 的精确字段名 / 序列化形态与 provenance 模块对齐留实现期 / 后续。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/graph/plot/src/ir/transform.ts`（加 `BinTransformSchema` / `AggregateTransformSchema` + 并入 `TransformSchema` union）+ `packages/graph/plot/src/ir/mark.ts`（`IntervalMarkSchema` 加 `x0Field`/`x1Field`，histogram 连续 x 区间柱），改 Plot IR schema → 动 `ir/**`。同时动 `packages/graph/plot/src/lower/{transform,validate,anchor,mark}.ts`（改行数 lowering + 用户源字段集 + interval 连续区间 primary，属 yellow 面）+ `packages/graph/plot-react/src/components/**`（`<Transform>` + build-plot-spec + BarMark x0/x1，yellow 面）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/ir/transform.ts` | 加 | `PlotTransform.Bin` | `as const` 成员 `'bin'` | — | 连续分箱 transform 判别串（改行数） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `PlotTransform.Aggregate` | `as const` 成员 `'aggregate'` | — | 分组聚合 transform 判别串（改行数） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.kind` | `z.literal(PlotTransform.Bin)` | — | 判别字段：连续字段分箱（改行数） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.field` | `z.string().min(1)` | — | 被分箱的连续源字段（其值域 = 分箱域，除非设 extent） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.count` | `z.number().int().positive().optional()` | `10`（无策略时） | 目标箱数；与 step / thresholds 互斥 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.step` | `z.number().positive().optional()` | — | 固定箱宽（数据单位）；与 count / thresholds 互斥 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.thresholds` | `z.array(z.number()).min(1).optional()` | — | 显式内部箱边（升序）；与 count / step 互斥 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.extent` | `z.tuple([z.number(), z.number()]).optional()` | 观测 min/max | 覆盖分箱域 [min,max] |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.nice` | `z.boolean().optional()` | `true` | 箱边对齐友好刻度（仅 count 策略） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.reduce` | `z.enum(['count','sum','mean','min','max']).optional()` | `'count'` | 每箱规约器（count = 频数） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.reduceField` | `z.string().min(1).optional()` | — | 被规约数值字段；sum/mean/min/max 必填、count 忽略 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.startField` | `z.string().min(1).optional()` | `'binStart'` | 箱下界输出字段 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.endField` | `z.string().min(1).optional()` | `'binEnd'` | 箱上界输出字段 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransformSchema.valueField` | `z.string().min(1).optional()` | `'binValue'` | 每箱规约值输出字段 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransformSchema.kind` | `z.literal(PlotTransform.Aggregate)` | — | 判别字段：分组聚合（改行数） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransformSchema.groupBy` | `z.array(z.string().min(1)).min(1)` | — | 分组键字段（多键 = 复合键；组键原样携到输出行） |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransformSchema.reduce` | `z.enum(['sum','mean','count','min','max'])` | — | 组内规约器 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransformSchema.field` | `z.string().min(1).optional()` | — | 被规约数值字段；sum/mean/min/max 必填、count 忽略 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransformSchema.as` | `z.string().min(1).optional()` | `reduce`+大写`field`（count → `'count'`） | 规约值输出字段 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `BinTransform` | `z.infer<typeof BinTransformSchema>` | — | bin transform 派生类型 |
| `packages/graph/plot/src/ir/transform.ts` | 加 | `AggregateTransform` | `z.infer<typeof AggregateTransformSchema>` | — | aggregate transform 派生类型 |
| `packages/graph/plot/src/ir/transform.ts` | 改 | `TransformSchema` | `discriminatedUnion` 增 `BinTransformSchema` / `AggregateTransformSchema` | — | transform union 并入 bin / aggregate |
| `packages/graph/plot/src/ir/mark.ts` | 加 | `IntervalMarkSchema.x0Field` | `z.string().min(1).optional()` | — | 连续 x 区间柱下界字段（histogram：读 bin 的 binStart）；与 band primary 互斥，设则 primary 取 [coord(x0),coord(x1)] |
| `packages/graph/plot/src/ir/mark.ts` | 加 | `IntervalMarkSchema.x1Field` | `z.string().min(1).optional()` | — | 连续 x 区间柱上界字段（histogram：读 bin 的 binEnd）；与 x0Field 配对 |

字段名写死，下游不得改——需改回本 ADR 加条 / 开新 ADR。`count` / `step` / `thresholds` 互斥与「sum/mean/min/max 必填 field/reduceField」是 lowering 期校验（schema 层各字段 `.optional()`，不在 zod 层做跨字段约束，保 schema 简单）。

### 文件 scope

- `packages/graph/plot/src/ir/transform.ts`（修改：加 `PlotTransform.Bin`/`Aggregate` + `BinTransformSchema`/`AggregateTransformSchema` + 派生类型 + 并入 `TransformSchema`）
- `packages/graph/plot/src/lower/transform.ts`（修改：加 `applyBin`/`applyAggregate` 改行数纯函数 + `applyTransforms` switch 加两分支 + 默认输出字段名常量）
- `packages/graph/plot/src/lower/validate.ts`（修改：`collectUserSourceFields` 加 bin/aggregate 分支——输入字段进、派生输出字段不进，`validate.ts:61` 的 transform 循环）
- `packages/graph/plot/tests/lower/transform.test.ts`（修改：bin/aggregate lowering case）
- `packages/graph/plot/tests/ir/transform.test.ts`（修改 / 新建：schema accept/reject 分支）
- `packages/graph/plot/tests/lower/validate.test.ts`（修改：用户源字段集断言）
- `packages/graph/plot/tests/lower/mark.test.ts`（或 interval 测试文件，修改：interval `x0Field`/`x1Field` 连续 x 区间柱 cell 断言 + 未设 x0/x1 走 band 旧路回归）
- `packages/graph/plot/tests/ir/mark.test.ts`（修改：interval `x0Field`/`x1Field` schema accept 分支）
- `packages/graph/plot-react/src/components/transform.tsx`（新建：通用 `Transform`（返回 null 的 `FC<TransformProps>`，服务全部 5 个 kind）+ `TransformProps`——按 `kind` 判别的扁平 props）
- `packages/graph/plot-react/src/components/build-plot-spec.ts`（修改：加 `Transform` import + `collectInto` `<Transform>` 分支（→ `collected.transforms`）+ `buildPlotSpec` 接 `BuildPlotSpecOptions.transforms`（`<Plot transforms>` 直传，拼到自动装配 stack 之前））
- `packages/graph/plot-react/src/components/index.ts`（修改：barrel re-export `Transform` + `TransformProps`）
- `packages/graph/plot-react/src/index.ts`（修改：public API barrel re-export）
- `packages/graph/plot-react/src/Plot.tsx`（修改：`<Plot transforms>` prop 透传给 buildPlotSpec，按现有 `<Plot>` 入口形态）
- `packages/graph/plot/src/ir/mark.ts`（修改：`IntervalMarkSchema` 加 `x0Field`/`x1Field`——连续 x 区间柱，histogram 渲染来源；与 band primary 互斥）
- `packages/graph/plot/src/lower/anchor.ts` + `packages/graph/plot/src/lower/mark.ts`（修改：interval lowering 在设了 `x0Field`/`x1Field` 时 primary 取 `[coord(x0),coord(x1)]` 连续区间而非 band bandwidth，secondary 高度照旧；未设则走旧 band 路）
- `packages/graph/plot-react/src/components/marks.tsx`（修改：`BarMark`（interval）props 加 `x0`/`x1`——映射到 `x0Field`/`x1Field`，与现有扁平 props 同风格）
- `packages/graph/plot-vanilla/tests/`（新建：`renderPlot` 出 histogram + 分组聚合柱 SVG 的 SSR 断言；vanilla 不改 `src/`）
- `apps/docs/src/contents/plot/.../transform`（修改 / 新建：bin / aggregate 双语 mdx + histogram demo + 分组聚合柱 demo + `<Transform>` / `<Plot transforms>` 说明）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与数据断言即可，不硬凑 9。

**Happy path（≥3）**：
- `bin-count-histogram`：`{kind:'bin', field, count:10, reduce:'count'}` → **恰 10 箱（count:N → N 个箱，含空箱）**、每箱 `binStart`/`binEnd`/`binValue`=频数、nice 边界对齐、**空箱 `binValue`=0 仍产行**
- `aggregate-groupby-sum`：`{kind:'aggregate', groupBy:['region'], reduce:'sum', field:'revenue', as:'total'}` → 每 region 一行，携 `region` 键 + `total`=组内和
- `bin-step-and-thresholds`：step 箱宽平铺；**thresholds 显式内部边界：K thresholds + extent 端点补齐 → K+1 条边 → K+1 个箱**（与 count 策略互斥分支）
- `interval-x0x1-histogram`（`tests/lower/mark` 或 interval 测试）：interval 设 `x0Field='binStart'`/`x1Field='binEnd'` + 连续 x scale → primary cell = `[coord(binStart),coord(binEnd)]`（连续区间、紧贴排列）而非 band bandwidth、secondary 高度=`coord(0)..coord(binValue)`；未设 x0/x1 时仍走 band bandwidth 旧路（回归）

**边界（≥2）**：
- `bin-empty-and-single`：空数据 → 0 箱（空数组）；单值 / 单观测 → 退化箱（start=end 或单箱），不崩；中间空箱保留（`binValue`=0）
- `aggregate-multikey-and-count`：多键 groupBy（复合键）正确分组；`reduce:'count'` 无 field 时 `as` 默认 `'count'`、值=组行数
- `aggregate-bin-provenance-group-level`：聚合 / 分箱产出 datum 的 provenance meta **指向源行集合（组键 + 源行索引数组）而非单 `sourceIndex`**；断言 datum locator 为组级（代表该箱 / 组的多源行），单源行 locator 不再适用

**错误路径（≥2）**：
- `aggregate-missing-field-fail-loud`：`reduce:'sum'` 缺 `field` → fail-loud（无被聚合量）
- `bin-conflicting-strategy-fail-loud`：同时设 `count` + `step`（或三者多于一个）→ fail-loud（边界策略互斥）

**交互（≥2）**：
- `transform-chain-aggregate-then-stack`：aggregate 改行数后接 stack（保行数）→ 链顺序正确折叠、stack 在聚合结果上累加；scale 域取派生字段（`expand.ts` 用 transform 后 rows）
- `user-source-fields-split`：`collectUserSourceFields` 对 bin/aggregate——输入字段（bin `field`/`reduceField`、aggregate `groupBy`/`field`）进 strict 集、派生输出字段（`binStart`/`binValue`/`as`）不进（误进会 `unknown field` fail-loud）
- `auto-stack-suppressed-by-explicit-stack`（`packages/graph/plot-react`）：显式 stack（`<Transform kind="stack">` / `<Plot transforms>`）存在时 `<BarMark stack>` 的 auto-stack 不再注入，最终 `spec.transform` 只含一个 stack op（B4 去重，不二次堆叠）

**三包同步（plot-react + plot-vanilla）**：
- `transform-react-build-plot-spec`（`packages/graph/plot-react`）：`<Transform kind="bin" .../>` + `<Plot transforms={[...]}>` → 正确 transform IR 数组（与手写 `spec.transform` 等价）的 build-plot-spec 装配断言；**通用 `<Transform>` 服务全部 kind**；放弃 mark-prop 自动装配（`<BarMark bin>` 不被识别）；`<BarMark x0="binStart" x1="binEnd" y="binValue" />` → interval IR `x0Field`/`x1Field` 装配正确
- `transform-vanilla-ssr`（`packages/graph/plot-vanilla`）：`renderPlot(spec, data)` 喂 histogram spec（bin + interval x0/x1 连续 x 区间柱）+ 分组聚合柱 spec（aggregate）→ 出含连续 x 区间直方柱 / 聚合柱的 SVG 字符串 SSR 断言（vanilla 不改代码，纯 spec 驱动）

### 依赖的现有元素

- `ir/transform.ts` 的 `PlotTransform` / `SortTransformSchema` / `StackTransformSchema` / `TransformSchema`（`packages/graph/plot/src/ir/transform.ts`）—— 扩展 `PlotTransform` 加成员、并入 union；仿 stack 的 `startField`/`endField` 派生字段命名风格。
- `ir/mark.ts` 的 `IntervalMarkSchema`（`y0Field`/`y1Field` 模式，`packages/graph/plot/src/ir/mark.ts:117`）—— 仿 stack y0/y1 派生字段写法加 `x0Field`/`x1Field`（连续 x 区间柱）；`lower/anchor.ts` 的 interval cell 构造分支接 x0/x1 连续区间 primary（仿 secondary 连续区间取 `coordinate(...)`）。
- `lower/transform.ts` 的 `applyTransforms` / `applySort` / `applyStack` / `DEFAULT_START_FIELD` / `DEFAULT_END_FIELD`（`packages/graph/plot/src/lower/transform.ts`）—— `applyTransforms` switch 加 bin/aggregate 分支；复用 `resolveFieldPath` / `isFiniteNumber` / `inferCategoryDomain`（`lower/field` / `lower/scale`）落箱 / 分组 / 取值。
- `lower/validate.ts` 的 `collectUserSourceFields`（`packages/graph/plot/src/lower/validate.ts:61` 的 transform 循环）—— 加 bin/aggregate 分支，严守「输入进、派生输出不进」（仿 stack 已排除 `startField`/`endField`）。
- `lower/expand.ts` 的 `applyTransforms` 调用点 + 域推断（`packages/graph/plot/src/lower/expand.ts:1172` / `:241` / `:250`）—— **仅引用不改**：域推断已用 transform 后 rows，bin/aggregate 派生字段自动进域。
- `build-plot-spec.ts` 的 `collectInto` / `Collected.transforms` / `BuildPlotSpecOptions`（`packages/graph/plot-react/src/components/build-plot-spec.ts`）—— 加 `<Transform>` 收集分支 + `transforms` option；保留现有 stack 自动装配（`:317`/`:335`），新 transform 不走自动装配；显式 stack 存在时抑制 auto-stack（B4 去重）。
