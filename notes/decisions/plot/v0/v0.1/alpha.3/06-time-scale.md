# ADR-06：time scale（scaleUtc 刻度 / 格式 + 时间轴；UTC 语义，domain 用 epoch ms 进 IR）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.4 scale（time）/ §3.9 guide](../../../../../architecture/plot-design.md) · 回溯：[alpha.2 ADR-02 d3-scale](../alpha.2/02-d3-scale.md) · 依赖：[ADR-01 PositionScale](./01-band-scale.md) · 关联消费：[ADR-07 DSL](./07-bindings-dsl.md)

## 背景

塑造决策的硬约束：

- 折线 / 散点的 x 常是**时间**。time 与 linear 同为连续映射，但刻度要落在**人类可读的时间边界**（按天 / 月 / 年取整，而非均匀数值）、标签按时间格式化（`Jan` / `2024-03` / `12:00`）。`scaleUtc` 现成给 domain 用 `Date`、`ticks(count)` 时间感知刻度（自动选粒度）、`tickFormat` 多尺度标签——闰年 / 月长 / 取整自写极易出 bug。
- **IR 必须纯 JSON**（plot-design §4.4 / core-design），`Date` 不可序列化——故 time domain 进 IR 用 **epoch 毫秒**，`Date` 只活在 lowering 内部。
- time 与柱状图主线正交（配折线 / 时间轴），依赖图里是独立叶子。

## 决策：scale union 加 time（domain 为 [startMs, endMs]）；lowering 用 d3 scaleUtc（UTC，环境无关），刻度 / 格式时间感知，纳入 PositionScale

`ScaleSchema` 加 `time` 成员：连续 scale，`domain?` 是 `[startMs, endMs]`（epoch 毫秒元组，省略则从字段时间戳 extent 推断）。lowering `resolveTimeScale` 用 `d3.scaleUtc()`，domain 传 `Date` 对象（按 UTC 解释）、range 同 linear（plot area）；刻度 / 标签走 `scale.ticks(count)` / `scale.tickFormat(count)`（UTC 时间感知）；包成 `PositionScale`（连续语义、`bandwidth=0`、`coordinate(value)=scale(new Date(ms))`）。字段值解析：数值 → 当作 ms；字符串 → `Date.parse`（ISO 8601）；解析失败（NaN）→ 该值跳过（同 mark 缺失值语义）。真源见 `plot/src/lower/scale.ts` / `plot/src/ir/scale.ts`。

判别串沿用 `PlotScale` 风格（`Time:'time'`，裸 `'time'` 等价可用）：

```ts
export const PlotScale = { Linear:'linear', Band:'band', Point:'point', Ordinal:'ordinal', Time:'time' } as const;
```

理由：

1. **时间轴是折线 / 散点的常见 x**：没有 time scale，日期只能当裸数值（刻度落在丑陋的 ms 整数上、标签是大数字）。`scaleUtc` 给的「按日 / 月 / 年取整 + 多尺度格式」是自写极易出 bug 的部分（闰年 / 月长 / 取整），直接用 d3（续 alpha.2 ADR-02 的「不造轮子」）；UTC 还免掉 DST / 时区这层不确定。
2. **IR 用 epoch ms 守 JSON 纯净**：domain / 字段时间戳都是 number；`Date` 只活在 lowering 内部。AI 生成 / 持久化 IR 仍 100% JSON 可序列化（§4.4）。
3. **套 PositionScale、零分支扩散**：time 是连续 scale，`bandwidth=0`、`coordinate=scale(date)`，projector / guide 不必为 time 加分支——[ADR-01](./01-band-scale.md) 抽象的直接收益。
4. **解析宽容**：数值当 ms、ISO 字符串 `Date.parse`，覆盖最常见两种时间数据；复杂格式（自定义 parse pattern）留后续。

### 已拍板的取舍

- **domain 表达：epoch ms（number 元组）而非 ISO 字符串**：number 元组与 linear `domain` 同形、比较 / extent 直接；ISO 字符串可读但要 parse、元组类型不齐。字段值仍接受 ISO 字符串（lowering parse），只 **domain 声明**用 ms。
- **时区固定 UTC（`scaleUtc`）而非 `scaleTime`（本地时区）**：`scaleTime` 的刻度 / 标签随运行机器时区漂移——CI、作者机、用户机时区不同会让「月边界落在哪、标签写什么」变化，测试无法断言固定值。固定 UTC 确定性、CI 安全；本地时区轴留后续可选（加 `local?:boolean` 或独立 type，非破坏）。
- **不显式引 `d3-time` / `d3-time-format`**：`scaleUtc.ticks()` / `tickFormat()` 内部已带默认时间刻度与格式。自定义 interval（每 2 周）/ 自定义格式留后续再显式引。
- **nice 默认不开**（沿用 linear，不悄改 domain）；用户 `nice:true` 才取整到时间边界。
- **time 不作 band-like（按月分桶的柱）**：「时间分箱柱」要 bin transform；time 仅作连续轴配折线 / 散点，柱的 x 用 band（类别串，即便类别是 "Jan"/"Feb"）。

## 不在本 ADR 范围

- **自定义时间 parse pattern / 自定义 tick interval / 自定义时间格式（d3-time-format）** → 后续（按需显式引 d3-time-format）。
- **本地时区轴（scaleTime / `local?`）** → 后续可选。
- **time 分箱柱（bin transform + band）** → 后续（需 bin transform）。
- **log / pow / sqrt / quantize / threshold scale** → 后续。

---

> **实现指针**：level `red`（动 `plot/src/ir/**` scale schema + `src/lower/**`）、非 breaking（time 是新增 union 成员，旧 scale 不变）。对外 API：`@retikz/plot` 公开 `TimeScaleSchema`、`PlotScale` 增 `Time`；对 core 无影响（IR domain 是 ms number，`Date` 不进 IR）。
> - 真源以代码为准：`TimeScaleSchema` / `ScaleSchema`（`plot/src/ir/scale.ts`）、`resolveTimeScale` / `toTimestamp` / `timeTicks`（`plot/src/lower/scale.ts`，基于 `d3-scale` `scaleUtc` + `d3-array` `extent`）；time 域推断走时间戳 extent 见 `plot/src/lower/expand.ts`。复用 [ADR-01](./01-band-scale.md) `PositionScale`（time 作连续 scale、bandwidth=0）。
> - 测试见 `plot/tests/ir/scale.schema.test.ts`（time schema accept/reject、domain 非 number 拒）与 `plot/tests/lower/scale.test.ts`（ISO / ms 解析、月边界刻度 UTC 确定性、时间标签、domain 推断、nice 开关、非法串跳过、bandwidth=0、经 PositionScale 与 linear 同形、time 折线端到端）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope / DSL 表面）见本 ADR git 历史。

> 🔖 封板压缩 commit `82295fcc`；压缩前完整施工蓝图 = `git show 82295fcc^:notes/decisions/plot/v0/v0.1/alpha.3/06-time-scale.md`。
