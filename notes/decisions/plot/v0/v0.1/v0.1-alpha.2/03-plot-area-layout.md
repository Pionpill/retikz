# ADR-03：绘图区布局（margin convention：整图 → 估算 label/axis 占位 → plot area；mark 改投影到 plot area）

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §8 lowering](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 d3-scale](./02-d3-scale.md) · 改动：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

塑造决策的硬约束：

- alpha.1 把数据直接投影到整张图 `[0,width] × [height,0]`（无轴）。alpha.2 一旦画轴和刻度标签，它们**要占画布边缘**（x 刻度数字在底、y 数字在左）；仍投影到整图会让轴与 mark 重叠、标签被裁。
- 用户拍板模型：**`width × height` 是整图整体尺寸**，布局**由外向内**——定整体 → 量 label 占位 → 减 axis 区 → 剩余矩形才是 plot area，mark 自此投影到 plot area（经典 d3 margin convention）。
- label 真实像素宽要 `measureText`（core 在 compile 阶段做），而 plot lowering 跑在 compile **之前**（`lowerComposites` 第一步）拿不到真实度量——故用户拍板用**估算法**：字号 × 最长 label 字符数估宽，并**预留 margin 配置**让用户手动覆盖。

## 决策：按「有哪些 axis guide」估算 margin，缩出 plot area；mark 投影改到 plot area（无 guide 时 = 整图，向后兼容）

`computePlotArea`：输入整图尺寸 + 哪些维度有 axis + 其刻度标签，输出 `{ plotArea, margins }`。margin **只在对应维度有 axis guide 时才留**——`hasXAxis` 留 bottom、`hasYAxis` 留 left（及防溢出的 top/right 小留白）。**无任何 axis guide → margin 全 0 → plot area = 整图**，于是 alpha.1 的无轴投影行为**逐字不变**（`bare` 同理）。`LowerPlotsOptions` 加 `margin?` / `fontSize?`（运行时布局选项，**不进 IR**，与 width/height 同列）：`margin` 逐边覆盖估算值，`fontSize` 既用于估算、也用于 [ADR-04](./04-guide-lowering.md) 画 label 的真实字号——**二者必须同一来源**，否则估算与实绘对不上。

mark 投影从整图 range 改为 plot area range（改 alpha.1 `expand.ts`）：利用 d3-scale 可分步设 range——先按 domain 建 `scaleLinear` → `scaleTicks` 拿 labels（ticks 只依赖 domain + count、不依赖 range）→ 估算 margin → 得 plot area → `scale.range([...plot area 边])` → 投影 mark 与 guide。这条 domain→ticks→plotArea→range 的拆分消除了「range 依赖 plotArea、plotArea 依赖 ticks、ticks 依赖 domain」的循环。

**guide 框取 scale 实际 range**：guide 轴线 / 刻度 / 网格不直接用 margin 算出的 plotArea 边，而用 `xScale.range()` / `yScale.range()` 的**实际输出区间**派生 frame——无显式 range 时二者相同；用户给某 scale 显式 `range`（不被 plot area 覆盖）时，轴线/网格随实际绘制区走、与刻度/mark 严格对齐，不因显式 range 错位。

估算常量（经验值，`plot/src/lower/layout.ts`）：`DEFAULT_FONT_SIZE=11`、`CHAR_WIDTH_FACTOR=0.6`（数字字宽 ≈ 0.6em）、`AXIS_TICK_LENGTH=6`、`AXIS_LABEL_GAP=4`。后三者 + `estimateLabelWidth` 导出供 [ADR-04](./04-guide-lowering.md) 复用，避免跨文件复制常量/算法（`estimateLabelWidth` 单一来源：left margin 与 y label 水平偏移都调它）。真源见 `plot/src/lower/layout.ts`、`plot/src/lower/expand.ts`。

理由：

1. **margin 按 guide 存在与否估算 → 向后兼容**：无 axis guide 时 margin 全 0、plot area = 整图，alpha.1 mark 投影坐标逐字不变，`bare` 天然落这条路径。
2. **估算法 + 用户覆盖**：lowering 在 compile 前无 `measureText`，按字号 × 字符数估（数字 label 窄而可预测，够用）；不够精确时 `options.margin` 逐边手动覆盖——把控制权留给用户而非强求像素级自动。
3. **fontSize 单一来源**：估算与 [ADR-04](./04-guide-lowering.md) 实绘 label 用同一 `fontSize`，避免「估算留 11px、实绘 14px」对不上。
4. **margin/fontSize 不进 IR**：与 width/height 同属渲染布局参数（alpha.1 ADR-06 定 width/height 不进 IR），保持 IR 纯数据。

### 退化处理

- **margin 之和 ≥ 尺寸**：定为**抛清晰错误**（plotArea 非正会一路出 `cx="NaN"`/负坐标坏图，与 alpha.1 尺寸校验同思路）。否决静默夹到最小正值——会出退化但「看似正常」的图，掩盖配置错误。
- **用户 margin 逐边校验有限非负**：`NaN`（`NaN <= 0` 为 false、会漏过尺寸守卫）/ 负值（让 plot area 比画布还宽、图元跑出画布）同样抛清晰错误，不静默出坏坐标。

## 不在本 ADR 范围

- **guide 几何怎么画（轴线 / tick / label / grid → core）** → [ADR-04](./04-guide-lowering.md)。
- **真实 measureText 精确布局** → 后续（需 core 支持 plot 两遍编译或 plot 自带 measurer）。
- **plot area 作 `plot.plotArea` anchor 绑定**（§14）→ alpha.5（alpha.2 先内部算出来用）。
- **非数字 label 的占位估算**（`CHAR_WIDTH_FACTOR=0.6` 是数字经验值，ordinal / 长文本偏窄会裁）→ alpha.3（band/ordinal 轴）。
- **margin 配置进 IR（`PlotSpec.margin`，随 spec 持久化）** → 否决，当前放 `LowerPlotsOptions`（布局是渲染参数、非数据，与 width/height 一致）；如未来需持久化再议。

---

> **实现指针**：level `red`（动 `plot/src/lower/**`）、非 breaking（无 guides 投影逐字不变）。
> - 真源以代码为准：`computePlotArea` / `Rect` / `Margins` / `estimateLabelWidth` / `DEFAULT_FONT_SIZE` / `AXIS_TICK_LENGTH` / `AXIS_LABEL_GAP`（`plot/src/lower/layout.ts`）；mark 投影改 plot area + 编排顺序 + `LowerPlotsOptions.fontSize`/`margin`（`plot/src/lower/expand.ts`）；投影器（`plot/src/lower/project.ts`）。`margin`/`fontSize` 是运行时选项（TS 类型，非 zod、不进 IR）。
> - 测试见 `plot/tests/lower/layout.test.ts`（无轴 margin 全 0、有轴缩进、y label 越长 left 越大、margin 逐边覆盖、超尺寸抛错）与 `plot/tests/lower/lowerPlots.test.ts`（守 alpha.1 无 guides 投影 + 有 guides 落 plot area）。
> - 完整原文（草案代码 / 待决策点 / 测试象限）见本文件 git 历史。
