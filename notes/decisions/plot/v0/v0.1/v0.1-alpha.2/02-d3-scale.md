# ADR-02：采用 d3-scale 作 scale / 刻度 / 格式化基础（回溯 alpha.1 自写 linear）

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.5 scale / §3.9 guide / §13（plot 可拉 d3-scale）](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-03 布局](./03-plot-area-layout.md) · [ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

塑造决策的硬约束：

- 坐标轴 / 网格要落在「好看的刻度」上（`[0,9.7]` 该画 0/2/4/6/8 而非每隔 1.94），并带格式化标签——即 scale + auto-tick。alpha.1 为「最薄闭环」**自写**了 13 行 linear（手算 `domain→range` + `extent`）；本 ADR 原打算继续自写 nice-tick 算法。
- **plot 是 Tier 2、可依赖 d3**——「运行时只准 zod」是 **core** 的白名单，plot 不进 core；plot-design §13 本就预期「图表会拉 d3-scale / 颜色映射」。`d3-scale` 的 `scaleLinear` 现成提供 domain/range/clamp/nice/ticks/tickFormat/invert：`scale.ticks(count)` 是成熟 1/2/5×10ⁿ 算法、`scale.tickFormat(count)` 是去尾零 + 自适应精度。alpha.3 的 band/time/ordinal/log 与颜色映射也都在 d3-scale 家族。自写既多 bug 又重复造轮子。

## 决策：plot 自 alpha.2 起以 d3-scale 为 scale/tick/format 基础；alpha.1 自写 linear 回溯重构为 scaleLinear

`resolveLinearScale` 重写为基于 `d3.scaleLinear()`（domain 经 `d3-array` `extent` 推断或显式给定、range 由坐标系/plot area 给）；刻度与标签直接取 `scale.ticks(count)` / `scale.tickFormat(count)`。删除自写的 `linear` / `linearTicks` / `formatTickLabel` / `computeTicks`，原计划的 `lower/ticks.ts` 作废。plot 包加 `d3-scale` + `d3-array` 运行时依赖（catalog 登记）；**d3 只在 lowering 内部算、不进 IR**（IR 仍纯 JSON，core/render 不碰 d3）。返回的 d3 `ScaleLinear` 本身可作 `(value)=>number` 调用，投影器照常用，并暴露 `.ticks`/`.tickFormat` 供 guide。新增 `scaleTicks(scale, count)` 产 `{ values, labels }`、`DEFAULT_TICK_COUNT = 5`。真源见 `plot/src/lower/scale.ts`。

理由：

1. **不重复造轮子**：`scale.ticks` = 成熟 1/2/5×10ⁿ、`scale.tickFormat` = 去尾零 + 自适应精度（比自写 `toFixed` 稳）；nice / clamp / invert 白拿。
2. **为 alpha.3 铺路**：band/time/ordinal/log + 颜色映射都在 d3-scale 家族，统一一套基础，避免每加一种 scale 自写一遍。
3. **plot 本就允许依赖 d3**（plot-design §13）；core 的 zod 白名单不约束 Tier 2。
4. **不污染 IR**：scale / tick 计算只在 lowering 内部产像素 / 刻度；IR 仍是纯 JSON 的 core `Scope/Node/Path`，AI 一等公民契约不动。
5. **回溯统一**：alpha.1 自写 linear 是「最薄闭环」临时物，本就该并入 d3-scale；趁 alpha.2 要加 ticks/format/nice（自写成本陡增）一次纠偏。

### 向后兼容守的边界

- **`d0===d1`（single datum）**：alpha.1 自写 `linear` 在 domain 退化时取 range 中点 `(r0+r1)/2`。`d3.scaleLinear().domain([a,a])` 行为不同（可能给 `range[0]`），故在 `resolveLinearScale` 对 `d0===d1` 显式取中点兜一层，守住 alpha.1 `lower_single_datum_point` 测试。
- **空 values** → domain 回退 `[0,1]`（保留 alpha.1 fallback）。
- **degenerate / 反向 / 非有限 domain** → 行为以 d3 为准（d3 `ticks` 对 `[a,a]`→`[a]`、支持反向 domain），用测试锁定实际行为、不再自定义。
- **`nice` 默认不开**（沿用 alpha.1 optional 语义），用户显式 `nice:true` 才扩展 domain——不悄改既有投影。

## 不在本 ADR 范围

- **band / time / ordinal / log scale、颜色映射**（d3-scale 家族）→ alpha.3+。
- **自定义 tick 数组 / 自定义 d3-format formatter / 科学计数 / 千分位** → 后续（d3-format 支持，按需暴露）。
- **刻度怎么画（轴线 / tick / label）与位置（plot area）** → [ADR-04](./04-guide-lowering.md) / [ADR-03](./03-plot-area-layout.md)。

---

> **实现指针**：level `red`（动 `plot/src/lower/**` + plot 包依赖）、非 breaking（守 alpha.1 投影 / single-datum 行为）。
> - 真源以代码为准：`resolveLinearScale` / `scaleTicks` / `TickSet` / `DEFAULT_TICK_COUNT`（`plot/src/lower/scale.ts`，基于 `d3-scale` + `d3-array`）；d3 是 lowering 内部依赖、不进 IR / 不进包 barrel。`d3-scale` / `d3-array` 版本在 `pnpm-workspace.yaml` catalog。
> - 测试见 `plot/tests/lower/scale.test.ts`（映射与 alpha.1 等价、nice 刻度、去尾零标签、tickCount 密度、single-datum 中点、空集 extent、退化/非有限 domain 锁定）与 `plot/tests/lower/lowerPlots.test.ts`（守 alpha.1 投影逐字不变）。
> - 完整原文（d3 子包选择 / 测试象限 / 文件 scope）见本文件 git 历史。

> 🔖 封板压缩 commit `7acbf962`；压缩前完整施工蓝图 = `git show 7acbf962^:notes/decisions/plot/v0/v0.1/v0.1-alpha.2/02-d3-scale.md`。
