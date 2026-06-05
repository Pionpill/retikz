# ADR-06：time scale（scaleUtc 刻度 / 格式 + 时间轴；UTC 语义，domain 用 epoch ms 进 IR）

- 状态：Proposed
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.4 scale（time）/ §3.9 guide](../../../../../architecture/plot-design.md) · 回溯：[alpha.2 ADR-02 d3-scale](../v0.1-alpha.2/02-d3-scale.md) · 依赖：[ADR-01 PositionScale](./01-band-scale.md) · 关联消费：[ADR-07 DSL](./07-bindings-dsl.md)

## 背景

折线 / 散点的 x 常是**时间**（日期 / 时间戳）。time scale 与 linear 类似（连续映射），但刻度要落在**人类可读的时间边界**（按天 / 月 / 年取整，而非均匀数值），标签按时间格式化（`Jan` / `2024-03` / `12:00`）。d3 `scaleUtc` 现成提供：domain 用 `Date`、`ticks(count)` 给时间感知刻度（自动选日 / 月 / 年粒度）、`tickFormat` 给多尺度时间标签。

**用 `scaleUtc`（UTC 语义）而非 `scaleTime`（本地时区）**：`scaleTime` 的刻度 / 标签随运行机器时区漂移——CI、作者机、用户机时区不同会让「月边界落在哪、标签写什么」变化，测试无法断言固定值（评审 P2）。alpha.3 固定 UTC，确定性、CI 安全；本地时区轴留后续可选。

引入 time 的关键约束：**IR 必须纯 JSON**（plot-design §4.4 / core-design），`Date` 不可序列化。故 IR 里 time domain 用 **epoch 毫秒**（number）表达；字段值在 lowering 时解析为时间戳（数值原样 / `Date.parse` 字符串），`scaleUtc` 在 lowering 内部用 `Date`（按 UTC 解释），**不进 IR**。time scale 与 linear 同为连续，套 [ADR-01](./01-band-scale.md) 的 `PositionScale`（`bandwidth=0`、`coordinate(value)=scale(new Date(ms))`）。

time 与柱状图主线正交（配折线 / 时间轴），故在依赖图里是独立叶子。

## 决策：scale union 加 time（domain 为 [startMs, endMs]）；lowering 用 d3 scaleUtc（UTC，环境无关），刻度 / 格式时间感知，纳入 PositionScale

`ScaleSchema` 加 `time` 成员：连续 scale，`domain?` 是 `[startMs, endMs]`（epoch 毫秒元组，省略则从字段时间戳 extent 推断）。lowering `resolveTimeScale` 用 `d3.scaleUtc()`，domain 传 `Date` 对象（按 UTC 解释）、range 同 linear（plot area）；刻度 / 标签走 `scale.ticks(count)` / `scale.tickFormat(count)`（UTC 时间感知）；包成 `PositionScale`（连续语义、`bandwidth=0`）。字段值解析：数值 → 当作 ms；字符串 → `Date.parse`（ISO）。

```ts
// packages/plot/plot/src/ir/scale.ts（再扩 union，承 ADR-01 / ADR-04）
export const PlotScale = { Linear:'linear', Band:'band', Point:'point', Ordinal:'ordinal', Time:'time' } as const;

export const TimeScaleSchema = z
  .object({
    type: z.literal(PlotScale.Time).describe('Discriminator: continuous time scale over epoch-millisecond instants'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z.tuple([z.number(), z.number()]).optional().describe('[startMs, endMs] epoch-millisecond extent; omit to infer from the bound field timestamps at lowering. Dates never enter the IR — only millisecond numbers'),
    nice: z.boolean().optional().describe('Round the domain outward to nice time boundaries (day / month / year); default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain instants to the range ends; default false'),
  })
  .describe('Time scale: continuous mapping from time instants (epoch ms) to range; ticks land on human-readable time boundaries');

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema, BandScaleSchema, PointScaleSchema, OrdinalScaleSchema, TimeScaleSchema])
  .describe('Scale union: linear / band / point / ordinal / time');
```

```ts
// packages/plot/plot/src/lower/scale.ts（示意）
import { scaleUtc } from 'd3-scale';
import { extent } from 'd3-array';

/** 字段值 → epoch ms（数值原样、字符串 Date.parse 按 ISO/UTC、Date 取 getTime） */
export const toTimestamp = (v: ScalarValue): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
  return null;
};

export const resolveTimeScale = (def, values: Array<number>, fallbackRange): PositionScale => {
  const [lo, hi] = def.domain ?? extentOr(values, [0, 1]);
  const scale = scaleUtc().domain([new Date(lo), new Date(hi)]).range([...fallbackRange]);
  if (def.nice) scale.nice();
  if (def.clamp) scale.clamp(true);
  return { coordinate: v => scale(new Date(toTimestamp(v) ?? lo)), bandwidth: 0, ticks: count => timeTicks(scale, count) };
};
```

理由：

1. **时间轴是折线 / 散点的常见 x**：没有 time scale，日期只能当裸数值（刻度落在丑陋的 ms 整数上、标签是大数字）。`scaleUtc` 给的「按日 / 月 / 年取整 + 多尺度格式」是自写极易出 bug 的部分（闰年 / 月长 / 取整），直接用 d3（续 alpha.2 ADR-02 的「不造轮子」）；UTC 还免掉 DST / 时区这层不确定。
2. **IR 用 epoch ms 守 JSON 纯净**：domain / 字段时间戳都是 number；`Date` 只活在 lowering 内部。AI 生成 / 持久化 IR 仍 100% JSON 可序列化（§4.4）。
3. **套 PositionScale、零分支扩散**：time 是连续 scale，`bandwidth=0`、`coordinate=scale(date)`，projector / guide 不必为 time 加分支——[ADR-01](./01-band-scale.md) 抽象的直接收益。
4. **解析宽容**：数值当 ms、ISO 字符串 `Date.parse`，覆盖最常见两种时间数据；复杂格式（自定义 parse pattern）留后续。

## 待决策点

- **domain 表达：epoch ms vs ISO 字符串**：选 **epoch ms（number 元组）**。理由：number 元组与 linear `domain` 同形、比较 / extent 直接；ISO 字符串可读但要 parse、且元组类型不齐。字段值仍接受 ISO 字符串（lowering parse），只是 **domain 声明**用 ms。
- **字段值解析策略**：数值 → ms；字符串 → `Date.parse`（ISO 8601）；解析失败（NaN）→ 该值跳过（同 mark 缺失值语义）。自定义 `d3-time-format` parse pattern 留后续（按需引 `d3-time-format`）。
- **是否引 `d3-time` / `d3-time-format`**：alpha.3 **先不显式引**——`scaleUtc.ticks()` / `tickFormat()` 内部已带默认时间刻度与格式（d3-scale 依赖 d3-time/d3-time-format）。自定义 interval（每 2 周）/ 自定义格式留后续再显式引。
- **nice 默认**：**不开**（沿用 linear，不悄改 domain）；用户 `nice:true` 才取整到时间边界。
- **时区：固定 UTC（`scaleUtc`）（拍板——评审 P2）**：alpha.3 用 UTC，刻度 / 标签不随 CI / 作者机 / 用户机时区漂移，测试可断言固定月边界 / 标签。本地时区轴留后续可选（加 `local?:boolean` 或独立 type，非破坏）。
- **time 作 band-like（按月分桶的柱）**：alpha.3 **不做**——「时间分箱柱」要 bin transform（不在 alpha.3）；time 仅作连续轴配折线 / 散点。柱的 x 用 band（类别串，即便类别是 "Jan"/"Feb"）。

## DSL 表面

> `<Plot>` 按字段类型选 time scale 在 [ADR-07](./07-bindings-dsl.md)。schema / vanilla 视角：

```ts
import { ScaleSchema, PlotScale } from '@retikz/plot';

// 时间 x（domain 从数据推断）
ScaleSchema.parse({ type:'time', name:'x' });
// 显式 domain（2024 全年，epoch ms）+ nice
ScaleSchema.parse({ type:'time', name:'x', domain:[1704067200000, 1735689599000], nice:true });

// 数据字段值可为 ms 数值或 ISO 串："2024-03-01" / 1709251200000 都接受
```

## 测试设计

`packages/plot/plot/tests/ir/scale.schema.test.ts`（扩）+ `tests/lower/scale.test.ts`（扩）覆盖：time schema accept/reject；ISO 串 / ms 数值解析；时间感知刻度（按月 / 年取整）；时间标签格式；domain 推断（extent）；nice 开关；非法时间串跳过；经 PositionScale 的连续语义（bandwidth=0）。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/ir/scale.ts`**（修改）：`PlotScale` 加 Time；`TimeScaleSchema`；`ScaleSchema` 升 5 成员 union。
- **`packages/plot/plot/src/lower/scale.ts`**（修改）：`resolveTimeScale` + `toTimestamp` + `timeTicks`；纳入 `PositionScale`。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：time scale 的域推断用时间戳 extent（字段值经 `toTimestamp`）。
- **对外 API**：`@retikz/plot` 公开 `TimeScaleSchema`，`PlotScale` 增 Time。
- **对 core**：无（time 在 lowering 内部用 Date，IR 仍纯 JSON——domain 是 ms number）。
- **被消费**：guide lowering 复用 `PositionScale.ticks`（时间刻度 / 标签）；[ADR-07](./07-bindings-dsl.md) 时间轴 demo。
- **文档**：time scale / 时间轴折线示例（[ADR-07](./07-bindings-dsl.md) 阶段补）。

## 不在本 ADR 范围

- **UTC 轴（scaleUtc）、显式时区** → 后续。
- **自定义时间 parse pattern / 自定义 tick interval / 自定义时间格式（d3-time-format）** → 后续。
- **time 分箱柱（bin transform + band）** → 后续（需 bin transform）。
- **log / pow / sqrt / quantize / threshold scale** → 后续。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/ir/**`（scale schema）+ `src/lower/**` → red。本 ADR 自评：`red`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/ir/scale.ts` | 改常量 | `PlotScale` | 加 `Time:'time'` | — | scale 判别值集补 time |
| `src/ir/scale.ts` | 新建 schema | `TimeScaleSchema` | `z.object({ type:'time', name, domain?, nice?, clamp? })` | — | 连续时间 scale（epoch ms） |
| `src/ir/scale.ts` | 新建字段 | `TimeScaleSchema.domain` | `z.tuple([z.number(),z.number()]).optional()` | undefined（推断） | [startMs,endMs]，省略=从字段时间戳 extent |
| `src/ir/scale.ts` | 新建字段 | `TimeScaleSchema.nice` | `z.boolean().optional()` | undefined（false） | 取整到时间边界 |
| `src/ir/scale.ts` | 新建字段 | `TimeScaleSchema.clamp` | `z.boolean().optional()` | undefined（false） | 越界钳到端点 |
| `src/ir/scale.ts` | 改 union | `ScaleSchema` | `z.discriminatedUnion('type',[Linear,Band,Point,Ordinal,Time])` | — | scale 升 5 成员 |

### 文件 scope

- `packages/plot/plot/src/ir/scale.ts`（修改）
- `packages/plot/plot/src/ir/index.ts`（修改：补导出）
- `packages/plot/plot/src/lower/scale.ts`（修改：resolveTimeScale + toTimestamp + timeTicks）
- `packages/plot/plot/src/lower/expand.ts`（修改：time 域推断走时间戳）
- `packages/plot/plot/tests/ir/scale.schema.test.ts`（扩）
- `packages/plot/plot/tests/lower/scale.test.ts`（扩）

### 测试象限

**Happy path**：

- `time_schema_valid`：`{ type:'time', name:'x' }` / 带 domain → 通过
- `time_parse_iso`：`'2024-03-01'` → 正确时间戳投影
- `time_parse_ms`：数值 ms → 原样投影
- `time_ticks_month_boundary`：跨数月 domain → 刻度落月初（UTC，确定性、不随测试机时区漂移）、标签时间格式

**边界**：

- `time_domain_inferred`：省略 domain → 从字段时间戳 extent
- `time_nice_toggle`：`nice:true` 扩到时间边界、省略不扩
- `time_single_instant`：domain 退化（start==end）→ 不崩（守 [ADR-01](./01-band-scale.md) single-datum 语义）
- `time_bandwidth_zero`：经 PositionScale → bandwidth=0（连续）

**错误路径**：

- `time_domain_non_number_rejected`：`domain:['2024','2025']`（字符串元组）→ 拒（tuple number）
- `time_bad_string_skipped`：字段值 `'not-a-date'` → `Date.parse` NaN → 跳过该值
- `scale_time_in_union`：旧的 unknown type 仍拒、time 现接受

**交互**：

- `time_through_positionscale`：time 经 `PositionScale.coordinate` 投影与 linear 同形（连续），projector 无需分支
- `time_feeds_axis`：time scale 的 `ticks` 喂 guide → 时间轴刻度 / 标签（复用 alpha.2 guide lowering）
- `time_line_endtoend`：time x + linear y 的折线端到端 → 点投影 + 时间轴对齐

### 依赖现有元素

- `d3-scale`（`scaleUtc`，alpha.2 已引入 d3-scale）—— **复用**：UTC 时间映射 / 刻度 / 格式。
- `d3-array`（`extent`）—— **复用**：时间戳域推断。
- [ADR-01 PositionScale](./01-band-scale.md)（`lower/scale.ts` / `project.ts`）—— **复用**：time 作连续 scale 纳入（bandwidth=0）。
- alpha.2 `scaleTicks` 模式（`lower/scale.ts`）—— **类比**：`timeTicks` 同形（values + labels），改用时间 ticks/format。
