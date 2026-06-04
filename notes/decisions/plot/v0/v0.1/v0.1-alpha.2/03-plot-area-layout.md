# ADR-03：绘图区布局（margin convention：整图 → 估算 label/axis 占位 → plot area；mark 改投影到 plot area）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §8 lowering](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 auto-tick](./02-auto-tick.md) · 改动：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-04 guide lowering](./04-guide-lowering.md)

## 背景

alpha.1 把数据直接投影到整张图 `[0, width] × [height, 0]`——因为没有轴。alpha.2 一旦画轴和刻度标签，这些**要占用画布边缘的空间**：x 轴的刻度数字在底部、y 轴的数字在左侧。若仍投影到整图，轴和 mark 会重叠、标签会被裁。

对齐用户拍板的模型：**`width × height` 是整图整体尺寸**，布局**由外向内**——先定整体 → 量 label 占位 → 减 axis 区 → **剩余矩形才是 plot area**，mark 自此投影到 plot area（经典 d3 margin convention）。label 实际像素宽要 `measureText`（core 在 compile 阶段做），而 plot lowering 跑在 compile **之前**（`lowerComposites` 第一步）拿不到真实度量——故按用户拍板用 **(a) 估算法**：字号 × 最长 label 字符数估宽；并**预留 margin 配置**让用户手动覆盖估算。

## 决策：按「有哪些 axis guide」估算 margin，缩出 plot area；mark 投影改到 plot area（无 guide 时 = 整图，向后兼容）

新增 `computePlotArea`：输入整图尺寸 + 哪些维度有 axis + 其刻度标签，输出 `{ plotArea, margins }`。margin **只在对应维度有 axis guide 时才留**——`hasXAxis` 留 bottom、`hasYAxis` 留 left（及防溢出的 top/right 小留白）。**无任何 axis guide → margin 全 0 → plot area = 整图**，于是 alpha.1 的无轴投影行为**逐字不变**（`bare` 同理）。`LowerPlotsOptions` 加 `margin?` / `fontSize?`：`margin` 覆盖估算值，`fontSize` 既用于估算、也用于 [ADR-04](./04-guide-lowering.md) 画 label 的真实字号（二者必须一致，否则估算与实绘对不上）。

mark 投影从「整图 range」改为「plot area range」（改 alpha.1 [ADR-06](../v0.1-alpha.1/06-plot-lowering.md) 的 `expand.ts` / `scale.ts`）：把 `resolveLinearScale` 拆成 **domain resolve（不依赖 range）** 与 **range 应用**两步——先 resolve domain → `computeTicks(domain)` → 估算 margin → 得 plot area → 用 plot area 的边作 range 建投影器。

```ts
// packages/plot/plot/src/lower/layout.ts
/** 估算用常量（plot lowering 在 compile 前、无 measureText，故估算） */
export const DEFAULT_FONT_SIZE = 11;       // label 字号（估算 + 实绘共用）
const CHAR_WIDTH_FACTOR = 0.6;             // 数字字宽 ≈ 0.6em
const TICK_LENGTH = 6;                     // 刻度线长
const LABEL_GAP = 4;                       // 刻度线 → label 间距

export type Rect = { x: number; y: number; width: number; height: number };
export type Margins = { top: number; right: number; bottom: number; left: number };

type PlotAreaInput = {
  hasXAxis: boolean;
  hasYAxis: boolean;
  xLabels: ReadonlyArray<string>;
  yLabels: ReadonlyArray<string>;
};
type PlotAreaOptions = { fontSize?: number; margin?: Partial<Margins> };

const maxLabelWidth = (labels: ReadonlyArray<string>, fontSize: number): number =>
  (labels.length === 0 ? 0 : Math.max(...labels.map(l => l.length))) * fontSize * CHAR_WIDTH_FACTOR;

/**
 * 由整图尺寸 + axis 占位估算 plot area（margin convention）
 * @description margin 仅在对应维度有 axis 时才留；无 axis → 全 0 → plot area = 整图（向后兼容 alpha.1）。
 *   用户 options.margin 逐边覆盖估算。估算用 fontSize × 字符数，不精确但对数字轴足够（用户可 margin 覆盖）。
 */
export const computePlotArea = (width: number, height: number, input: PlotAreaInput, options: PlotAreaOptions = {}): { plotArea: Rect; margins: Margins } => {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const auto: Margins = {
    top: input.hasYAxis ? fontSize * 0.5 : 0,                                  // y 轴最高 label 半行溢出
    right: input.hasXAxis ? maxLabelWidth(input.xLabels.slice(-1), fontSize) * 0.5 : 0, // x 轴最右 label 半宽溢出
    bottom: input.hasXAxis ? TICK_LENGTH + LABEL_GAP + fontSize : 0,
    left: input.hasYAxis ? TICK_LENGTH + LABEL_GAP + maxLabelWidth(input.yLabels, fontSize) : 0,
  };
  const m: Margins = { ...auto, ...options.margin };
  return {
    margins: m,
    plotArea: { x: m.left, y: m.top, width: width - m.left - m.right, height: height - m.top - m.bottom },
  };
};
```

`LowerPlotsOptions` 扩展（`expand.ts`，运行时选项、不进 IR）：

```ts
export type LowerPlotsOptions = {
  width?: number;
  height?: number;
  fontSize?: number;                 // 新增：label 字号（估算 + 实绘），默认 DEFAULT_FONT_SIZE
  margin?: Partial<Margins>;         // 新增：覆盖估算的 margin（逐边）
};
```

理由：

1. **margin 按 guide 存在与否估算 → 向后兼容**：无 axis guide 时 margin 全 0、plot area = 整图，alpha.1 的 mark 投影坐标**逐字不变**（既有 `lowerPlots.test.ts` 的投影断言不破），`bare` 也天然落在这条路径。
2. **估算法（a）+ 用户覆盖**：plot lowering 在 compile 前无 `measureText`，按字号 × 字符数估（数字 label 窄而可预测，够用）；不够精确时 `options.margin` 逐边手动覆盖——把控制权留给用户而非强求像素级自动。
3. **fontSize 单一来源**：估算与 [ADR-04](./04-guide-lowering.md) 实绘 label 用同一个 `fontSize`，避免「估算留 11px、实绘 14px」对不上。
4. **domain / range 拆分**：mark 与 guide 都要用 plot area 作 range，而 range 依赖 plot area、plot area 依赖 ticks、ticks 依赖 domain——故把 `resolveLinearScale` 拆成 domain resolve（先）与 range 应用（plot area 定后），消除循环。
5. **margin/fontSize 不进 IR**：与 `width`/`height` 同属渲染布局参数（[alpha.1 ADR-06](../v0.1-alpha.1/06-plot-lowering.md) 定 width/height 不进 IR），保持 IR 纯数据。

## 待决策点

- **估算常量值**：`fontSize=11` / `CHAR_WIDTH_FACTOR=0.6` / `TICK_LENGTH=6` / `LABEL_GAP=4`。都是经验值，可调；review 时若觉得轴太挤/太松改这里。
- **margin 配置位置**：放 `LowerPlotsOptions`（不进 IR，跟 width/height）vs `PlotSpec.margin`（进 IR）。倾向 **options**（布局是渲染参数，非数据；与 width/height 一致）。备选进 IR（若希望 margin 随 spec 持久化）。
- **top/right 防溢出小留白**：用「对侧最末 label 半宽/半高」估算（上面草案）vs 固定常量 vs 0。倾向估算（最贴）；嫌复杂可固定 `fontSize*0.5`。
- **CHAR_WIDTH_FACTOR 对非数字 label**：0.6 是数字经验值；将来 ordinal / 长文本 label 偏窄会裁。alpha.2 只有 linear 数字轴，够用；非数字 label 的估算留 alpha.3。
- **是否暴露 plotArea 给 anchor**：plot area 矩形将来是 `plot.plotArea` anchor（§14）。alpha.2 先算出来内部用，anchor 绑定留 alpha.5。
- **margin 之和 ≥ 尺寸（退化）**：定为**抛清晰错误**（plotArea 非正会一路出 `cx="NaN"`/负坐标坏图，与 alpha.1 [W1](../v0.1-alpha.1/roadmap.md) 的 width/height 校验同思路、同一致性）。备选静默夹到最小正值——但会出退化但「看似正常」的图，掩盖配置错误，不取。
- **右侧防溢出估算偏薄**（评审 W2）：`right` 用最末 x label 的半宽估算，proportional 字体 + `CHAR_WIDTH_FACTOR=0.6` 偏薄时最右刻度标签可能裁。out-of-box 由 `margin` 兜底；必要时调高 factor 或给 right 一个常量下限。

## DSL 表面

布局无独立用户表面；经 `LowerPlotsOptions` 暴露（[ADR-05](./05-guide-bindings-dsl.md) 的 `<Plot>` 透传）：

```tsx
// 默认估算
<Plot data={rows} width={480} height={300}> <LineMark x="month" y="revenue" /> <Axis dimension="x" /> <Axis dimension="y" /> </Plot>
// 手动覆盖左边距（y label 很长时）+ 调字号
<Plot data={rows} width={480} height={300} fontSize={12} margin={{ left: 64 }}> … </Plot>
```

## 测试设计

`packages/plot/plot/tests/lower/layout.test.ts`（新建）：无轴→margin 全 0、plot area=整图；有 x/y 轴→底/左留白、plot area 缩进；y label 越长 left 越大；`options.margin` 逐边覆盖估算；`fontSize` 影响占位。
`packages/plot/plot/tests/lower/lowerPlots.test.ts`（修改）：补「有 guides 时 mark 投影落在缩进 plot area」case；**确认无 guides 的既有投影断言不变**（向后兼容）。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/lower/layout.ts`**（全新）：`computePlotArea` / `Rect` / `Margins` / `DEFAULT_FONT_SIZE`。
- **`packages/plot/plot/src/lower/scale.ts`**（修改）：拆出 domain resolve 与 range 应用（供「先 domain → 算 plot area → 再 range」的顺序）；**domain resolve 必须保持 alpha.1 的 `def.domain ?? extent(values)` 推断逐字不变**（守 `domain_inferred_from_data` / `explicit_domain_range_respected` 测试），`resolveLinearScale` 以拆出的两步组合实现、对外行为不变。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：mark 投影 range 由整图改为 plot area；`LowerPlotsOptions` 加 `margin?` / `fontSize?`；编排顺序 domain → ticks → plotArea → range → 投影。（guide 子节点的产出在 [ADR-04](./04-guide-lowering.md)。）
- **`packages/plot/plot/src/lower/project.ts`**（可能修改）：投影器接受 plot area 派生的 range（若 alpha.1 的 `createCartesianProjector` 已按 range 参数化则无需改）。
- **对 IR / 对外公开 schema**：无（margin/fontSize 是 `LowerPlotsOptions` 运行时选项）。
- **被消费**：[ADR-04](./04-guide-lowering.md) 用 `plotArea` + `margins` 定位轴线 / 刻度 / 标签 / 网格；mark 与 guide 共享同一投影器。

## 不在本 ADR 范围

- **guide 几何怎么画（轴线 / tick / label / grid → core）** → [ADR-04](./04-guide-lowering.md)。
- **真实 measureText 精确布局** → 后续（需 core 支持 plot 两遍编译或 plot 自带 measurer）。
- **plot area 作 `plot.plotArea` anchor 绑定** → alpha.5。
- **非数字 label 的占位估算** → alpha.3（band/ordinal 轴）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/lower/**` → red。本 ADR 自评：`red`。

### Schema 改动

无 IR schema 改动。`LowerPlotsOptions`（TS 类型，**非** zod / 非 IR）新增 `fontSize?: number`、`margin?: Partial<Margins>`，是运行时布局选项、不进 IR。

### 文件 scope

- `packages/plot/plot/src/lower/layout.ts`（新建）
- `packages/plot/plot/src/lower/scale.ts`（修改：domain resolve / range 应用拆分）
- `packages/plot/plot/src/lower/expand.ts`（修改：投影到 plot area + 编排 + `LowerPlotsOptions` 扩展）
- `packages/plot/plot/src/lower/project.ts`（按需修改）
- `packages/plot/plot/tests/lower/layout.test.ts`（新建）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（修改：补 plot area 投影 case + 守无轴向后兼容）

### 测试象限

**Happy path**：

- `area_no_axis_is_full`：无 axis → margins 全 0、plotArea = `{x:0,y:0,width,height}`
- `area_xy_axis_insets`：有 x+y 轴 → bottom>0、left>0，plotArea 缩进
- `mark_projects_into_plot_area`：有 x+y 轴时 line/point 端点落在 plotArea 边界（非整图边）

**边界**：

- `area_y_label_width_scales`：y 轴 label 越长（`['1000']` vs `['1']`）→ left margin 越大
- `area_only_x_axis`：仅 x 轴 → 只 bottom>0、left=0
- `area_font_size_affects`：`fontSize=20` 比 `11` 占位更大

**错误路径 / 退化**：

- `area_margin_override_wins`：`options.margin={left:80}` → left=80（覆盖估算），其余仍估算
- `area_oversized_margin_throws`：margin 之和 ≥ width/height → plotArea 非正 → **抛清晰错误**（与 alpha.1 W1 的尺寸校验一致，不静默出 `NaN`/负坐标坏图）

**交互（向后兼容 + 跨 ADR）**：

- `legacy_no_guides_projection_unchanged`：alpha.1 那条无 guides 的 spec 投影坐标**逐字不变**（`[0,240]/[240,0]/[480,300]`）——守住 alpha.1 测试
- `mark_and_guide_share_projector`：同一 plotArea 下 mark 投影与 guide 刻度位置用同一映射（[ADR-04](./04-guide-lowering.md) 交叉验证的前置）

### 依赖现有元素

- [ADR-02 `computeTicks`](./02-auto-tick.md)（`packages/plot/plot/src/lower/ticks.ts`）—— **消费**：估算 margin 前先算 ticks 拿 label。
- alpha.1 `resolveLinearScale` / `createCartesianProjector`（`packages/plot/plot/src/lower/scale.ts` / `project.ts`）—— **修改 / 复用**：拆 domain/range、range 改 plot area。
- [alpha.1 ADR-06 `lowerPlots` / `LowerPlotsOptions`](../v0.1-alpha.1/06-plot-lowering.md)（`expand.ts`）—— **修改**：投影 range + 选项扩展。
- `Math` —— **引用**（max / floor）。
