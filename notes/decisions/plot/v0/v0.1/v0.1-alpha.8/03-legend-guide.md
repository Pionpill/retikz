# ADR-03：legend guide——非位置 scale 的图例（swatch / 色带 ramp / 分箱）+ 估算布局占位

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.9 Guide / §13.1 结构上限](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 连续色阶](./01-continuous-color-scale.md) / [ADR-02 离散化 scale](./02-discretization-scale.md) + [alpha.7 size/opacity/shape](../v0.1-alpha.7/roadmap.md) · 关联：[alpha.2 axis guide](../v0.1-alpha.2/roadmap.md)（GuideSchema 升 union）

## 背景

alpha.7 把全部非位置通道（color / size / opacity / shape）收口成真 scale 通道，ADR-01/02 又补了连续色阶与离散化——但**没有任何图例**：读者看到一张按温度上色、按人口缩放的散点图，无从知道「红=多少度、大圈=多少人」。`GuideSchema` 自 alpha.2 起**只有 axis**（`ir/guide.ts`：`GuideSchema = AxisGuideSchema`，非 union），`PlotGuide` 仅 `Axis`。

legend 是 GoG 一等 guide（plot-design §3.9）：与 axis 并列、由 scale 派生、最终 lowering 成 core Node/Path/Scope。不同 scale 形态对应不同 legend 形态：

| scale | legend 形态 |
|---|---|
| ordinal（分类色）/ shape | 离散 swatch 列表（色块/形状 + 标签） |
| sequential / diverging（连续色） | 连续色带 ramp + 刻度 |
| quantize / threshold / quantile | 分箱 swatch（每档一块 + 区间标签） |
| size | 梯度符号（graduated symbols：几个代表性大小圈 + 值） |
| opacity | 梯度透明度条 |

四个评审 P1/P2 要点必须在本 ADR 钉死：

- **P1 ⑥ target 歧义**：一张 plot 可有多个 color scale、多个 mark 各绑 size/opacity/shape，且 alpha.7 的 size/opacity/shape 默认 scale **在 resolver 内部合成、未必物化进 `PlotSpec.scales`**（`lower/channel.ts` 的 `makeSizeResolver` 等只返回逐行函数 `(row)=>radius`，无 domain/range descriptor）。legend 拿不到 domain/range 就画不出。
- **P1 ⑦ 默认 axes 冲突**：`buildPlotSpec.ts:293` 现规则是「只要有任何 guide 就不加默认 axes」——加 `<Legend>` 会让默认 x/y 轴消失。
- **P2 ⑨ 标签契约**：连续 ramp / 时间色 / 分箱区间各需标签规则。
- **P2 ⑩ 占位**：legend 占空间，须先估尺寸再决定 plotArea，否则只能 overlay / 出界——牵动 `lower/layout.ts` / `expand.ts`。

## 决策：`GuideSchema` 升 discriminated union 加 legend；target = `channel` + 可选 `scale`；resolver 暴露可复用 scale descriptor；显式 Legend 不抑制默认 axes；估算布局 + 占位

**(1) IR：GuideSchema 升 union**（`ir/guide.ts` 已注释预留「type 判别位已在、升级非破坏」）：

```ts
// ir/guide.ts
export const PlotGuide = { Axis: 'axis', Legend: 'legend' } as const;

// 图例可视化的非位置通道关键字（暴露给用户；裸 'color' 同样可用）
export const LegendChannel = { Color: 'color', Size: 'size', Opacity: 'opacity', Shape: 'shape' } as const;

// LegendGuideSchema：
//   type: z.literal(PlotGuide.Legend)
//   channel: z.nativeEnum(LegendChannel)（图例可视化哪个非位置通道）
//   scale?: z.string()（消歧：多个同通道 scale 时指定 scale name；省略→该通道唯一 scale）  ← 决策 ⑥
//   title?: z.string()（图例标题；省略→用绑定字段名）
//   position?: 'right' | 'left' | 'top' | 'bottom'（默认 'right'）  ← 决策 ⑩
//   orient?: 'vertical' | 'horizontal'（默认按 position：左右→vertical、上下→horizontal）
//   tickCount?: z.number().int().positive()（连续 ramp 刻度数提示；离散无意义）  ← 决策 ⑨
//   tickLabels?: z.boolean()（省略 true）
// GuideSchema = z.discriminatedUnion('type', [AxisGuideSchema, LegendGuideSchema])
```

**(2) target = channel + 可选 scale**（决策 ⑥）：legend 按**它可视化哪个非位置通道**绑定（与 encoding 通道一一对应、用户心智一致）；`scale?` 在「同通道多 scale」时消歧（省略 = 该通道唯一 scale，多于一个且未指定 → fail-loud）。legend 渲染形态（swatch / ramp / 分箱）由 lowering **据绑定 scale 的类型自动选**，用户不手填形态。

**(3) resolver 暴露可复用 scale descriptor**（决策 ⑥ 配套，修 P1 核心）：alpha.7 `lower/channel.ts` 的 `makeSizeResolver` / `makeOpacityResolver` / `makeShapeResolver` 改成不仅返回逐行 `XxxOf` 函数，**同时产出 `ScaleDescriptor`**——含 `{ channel, scaleType, domain, range, field?, fieldType? }`，legend 据此画刻度 / swatch。color 的 descriptor 从 `PlotSpec.scales` 里的具名 color scale 取（已物化）。统一一个 `LegendSource` 注册表（lowering 内部，不进 IR）：通道 → descriptor，供 `lowerLegend` 查。

```ts
// lower/channel.ts —— 概念伪码（resolver 双产出）
export type ScaleDescriptor = {
  channel: LegendChannelType;
  scaleType: ScaleType;                 // 'ordinal' | 'sequential' | 'sqrt' | 'quantize' …
  domain: ReadonlyArray<number | string>;
  range: ReadonlyArray<number | string>; // 色串 / 半径 / 不透明度 / shape 名
  field?: string;                        // 绑定字段（legend 标题缺省）
  fieldType?: FieldType;                 // 标签 formatter 选型（决策 ⑨）
};
// makeSizeResolver(...) → { of: SizeOf, descriptor: ScaleDescriptor }（domain=[0,maxPositive], range=[MIN,MAX]_RADIUS）
```

**(4) 默认 axes 合并规则改 by-type**（决策 ⑦，修 P1）：`buildPlotSpec.ts:293` 从「有任何 guide 即清空默认」改成**按 guide `type` 分别判断默认补齐**——显式 `Axis` 才覆盖对应默认 `Axis`；`Legend` **不抑制**默认 axes。即：默认 axes 在「用户未显式声明同维 Axis」时仍补；Legend 与默认 axes 共存。

**(5) 估算布局 + 占位**（决策 ⑩，修 P2）：legend 占位牵动 `lower/layout.ts` 的 `computePlotArea`——按 position 在对应边**预留 legend 带宽**（宽度/高度用 `estimateLabelWidth`（已存在）+ swatch 尺寸估），再算 plotArea。`lowerLegend`（`lower/guide.ts` 新增）产 legend scope（swatch/ramp/分箱 + 标签），放在预留带内。标签 formatter **复用 axis 的 tick formatter 链**（决策 ⑨：数字格式 / temporal 格式 / 分箱区间标签），不另造。受**无文字度量**约束（plot-design §13.1）：估算式布局，标签过长溢出、文档明示，测量驱动自适应不做。

理由：

1. **target = channel + scale? 消歧又简单**：通道是用户心智锚点，scale? 兜多 scale 边界；形态自动选，用户不背 swatch/ramp 的区别。
2. **descriptor 是 legend 的地基**：size/opacity/shape 默认 scale 在 resolver 内合成，不暴露 descriptor legend 就是空中楼阁——这是 P1 的实质修复，反向规整 alpha.7 resolver 产物。
3. **Legend 不杀 axes**：把「有 guide 即清默认」改成 by-type，是 `<Legend>` 可用的前提，否则一加图例坐标轴就没了。
4. **诚实的结构上限**：估算非测量，承认 plot-design §13.1 的 JSON IR 无 text metrics 上限，不假装做自适应。

**实现校准（2026-06-08，与实现/测试对齐）**：

- **legend 矩形 = core Node（shape rectangle），非 Path**：swatch / ramp / 分箱色块下沉成 `{ type:'node', shape:'rectangle', minimumWidth/Height, fill }`，**与 bar mark 同款**（`lower/mark.ts` barStyle）。原本曾用单 step rectangle Path，但违反 core `PathSchema.children.min(2)`（self-contained rectangle step 仍受 min(2) 约束）——产出 core 非法 IR（adversarial 第一关 BLOCKING 抓出）。改 Node 既合 core schema 又符「一切可见物是 Node」理念，无需改 core。配 `ChildSchema` 合法性回归测试守约束。连续 ramp 用 core `linearGradient` paint server（Node.fill 接 PaintSpec，核验 core 支持）。
- **默认 axes 合并语义校准（决策 ⑦）**：实际落地为 **「显式 `Axis` 抑制默认 axes（保留既有 `dsl_explicit_axis_only` 行为不变）；`Legend` 不抑制默认 axes」**。决策 ⑦ 原文「显式 x 轴 → y 默认仍补」的 per-dimension 细化**未采纳**——既有 React 行为是「任一显式 Axis 即不补默认」，本轮只修 P1 真 bug（Legend 杀 axes），不改无关的既有 axis 行为。per-dimension 默认轴补齐留作未来增强（需同改 `dsl_explicit_axis_only` 期望）。
- **标题 Node**：决策 ⑨「省略 title → 用绑定字段名」**未物化成自动可见标题**——仅用户显式 `title` 时渲染标题 Node，省略时无标题。后续可补「字段名缺省标题」。
- **WARNING（backlog）**：`legend.scale` 指向「存在但类型不符」的 scale（如 color legend 指向位置 linear scale）时不做类型守卫、静默落 ordinal 退化（不崩、产合法 swatch），与决策 ⑥「fail-loud」略松。adversarial 第一关 WARNING，登记 backlog（补 legend.scale 类型一致性校验）。
- **占位落地为固定带宽**：决策 ⑩ 写「`estimateLabelWidth` + swatch 尺寸估」，实际 `legendReserveOf` 用固定 `LEGEND_BAND_EXTENT` 在对应边预留，不按标签长度估——长标签可能溢出（plot-design §13.1 允许）。后续可按标签宽细化。
- **ramp 刻度域取配置 domain（contract-audit W2 修）**：连续 ramp 的取色 / 刻度域显式 `domain` 优先（sequential `[min,max]`、diverging `[low,high]`），与实绘取色同基准；缺省回退数据 extent。早期曾固定取数据 extent，致显式 domain 时图例刻度与颜色错位，已修 + 回归测试。

## 待决策点 🔻

- **legend 显式 vs 自动派生**：本轮 legend **显式声明出**（`<Legend channel="color" />`，与 axis 一致）。自动派生（声明非位置通道即自动出 legend）留 alpha.14 theme 的 auto-guide。倾向显式（避免 lowering 隐式塞 guide 破坏 IR 自描述）。
- **size legend 代表值选取**：梯度符号取几个代表大小（如 domain 的 min/median/max 或 nice 3–4 档）？倾向 **nice 3 档**（min/mid/max 的 nice 值），与 axis tick 的 nice 同源。
- **连续 color ramp 实现**：色带用 core 渐变 paint server（`linearGradient`，core 已有）还是切 N 段纯色块近似？倾向 **core linearGradient**（平滑、真连续）——**须实现期核验 core paint server 用在 legend 矩形上的可用性**（roadmap core 依赖已标），不足走 next-core。
- **多 legend 排布**：多个 `<Legend>`（如 color + size 各一）同 position 时纵向堆叠？倾向同侧按声明序堆叠，跨 position 各占各边。
- **position 占位与 polar**：polar plot（默认无 axes）加 legend → 仅预留 legend 带、不受 axis 占位影响。倾向直接复用同一 `computePlotArea` 占位逻辑。

## DSL 表面

```tsx
// React：连续色散点 + 图例（显式声明，不影响默认 x/y 轴）
<Plot data={{ stations }}>
  <PointMark x="lon" y="lat" color="temperature" size="population" />
  <Legend channel="color" title="气温 ℃" />
  <Legend channel="size" position="bottom" />
</Plot>
```

```ts
// vanilla / 原生 IR：分箱色图例（消费 ADR-02 的 quantize scale）
{ type: 'legend', channel: 'color', scale: '__color', position: 'right', title: 'Density' }
```

## 测试设计

`packages/plot/plot/tests/lower/legend.test.ts`（新建）+ `tests/ir/guide.schema.test.ts`（扩）+ `react/tests/components/buildPlotSpec.test.tsx`（扩）覆盖：union 判别、各通道各 scale 形态派生、descriptor 产出、默认 axes 共存、占位、标签 formatter、多 legend、fail-loud。具体见「测试象限」。

## 影响

- **Plot IR**：`ir/guide.ts` `GuideSchema` 升 discriminatedUnion（**结构变化但非破坏**——axis 仍合法，type 判别位 alpha.2 已留）；`PlotGuide` 加 `Legend`、新增 `LegendChannel` + `LegendGuideSchema` + 派生类型。
- **lowering**：`lower/channel.ts` resolver 双产出（+ ScaleDescriptor）；`lower/guide.ts` 加 `lowerLegend`；`lower/layout.ts` `computePlotArea` 加 legend 占位；`lower/expand.ts` 串 legend source 注册 + 占位输入。
- **core**：legend swatch/标签下沉 core Node/Path/Scope；连续 ramp **可能用 core `linearGradient` paint server**（待实现期核验，不足走 next-core）。不改 core 内部。
- **文档站**：新增 legend 概念页 + 各形态 demo（分类色 swatch / 连续 ramp / 分箱 / size 梯度）；散点等页补 legend。
- **对外 API**：`GuideSchema` 升 union（非破坏）；新增 `<Legend>` React 组件 + vanilla spec；**修 `buildPlotSpec` 默认 axes 规则**（行为：加 Legend 不再吞掉默认 axes——属修 bug 方向，不破坏既有合法 spec）。

## 不在本 ADR 范围

- **legend 自动派生**（声明通道即自动出）→ alpha.14 theme auto-guide。
- **legend 交互**（hover 高亮 / 点击筛选）→ v0.3 交互线（依赖 core 水合）。
- **测量驱动自适应**（标签防重叠 / 宽度自适应 / 旋转）→ 结构上限，不做（plot-design §13.1）。
- **reference line / band 等其它 guide** → 后续（本轮只 axis + legend）。
- **legend 内排序 / 自定义 swatch 模板** → 顺延。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/guide.ts`（IR 契约，union 升级）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/guide.ts` | 加 | `PlotGuide.Legend` | `'legend'` | — | 图例 guide 判别串 |
| `ir/guide.ts` | 加 | `LegendChannel` | `as const 对象` | — | 图例可视化的非位置通道词表（color/size/opacity/shape） |
| `ir/guide.ts` | 加 | `LegendGuideSchema` | `z.object` | — | type/channel/scale?/title?/position?/orient?/tickCount?/tickLabels? |
| `ir/guide.ts` | 加 | `LegendGuideSchema.channel` | `z.nativeEnum(LegendChannel)` | — | 绑定的非位置通道 |
| `ir/guide.ts` | 加 | `LegendGuideSchema.scale` | `z.string().min(1).optional()` | — | 消歧 scale name（同通道多 scale 时） |
| `ir/guide.ts` | 加 | `LegendGuideSchema.position` | `z.enum([...])` | `'right'` | 图例位置（right/left/top/bottom） |
| `ir/guide.ts` | 改 | `GuideSchema` | `z.discriminatedUnion('type', [...])` | — | axis + legend（非破坏升 union） |
| `ir/guide.ts` | 加 | `LegendGuide`/`LegendChannelType` | `z.infer` / `ValueOf` | — | 派生类型 |

> `position` enum 用 `as const` 对象 + `z.nativeEnum` 沿 DrawWay 风格。`scale` 省略且该通道有多于一个 scale → lowering fail-loud。

### 文件 scope

- `packages/plot/plot/src/ir/guide.ts`（改：union 升级 + LegendGuideSchema）
- `packages/plot/plot/src/lower/channel.ts`（改：resolver 双产出 ScaleDescriptor）
- `packages/plot/plot/src/lower/guide.ts`（改：加 `lowerLegend` → swatch/ramp/分箱 scope）
- `packages/plot/plot/src/lower/layout.ts`（改：`computePlotArea` 加 legend 占位；`PlotAreaInput` 加 legend 带宽输入）
- `packages/plot/plot/src/lower/expand.ts`（改：legend source 注册 + 占位输入串联 + scale 消歧 fail-loud）
- `packages/plot/plot/tests/ir/guide.schema.test.ts`（改/新建：union + legend schema）
- `packages/plot/plot/tests/lower/legend.test.ts`（新建）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：默认 axes by-type 合并 `:293`；收集 `<Legend>`）
- `packages/plot/react/src/components/marks.tsx` 或新 `Legend.tsx`（新增 `<Legend>` 组件）
- `packages/plot/react/src/components/index.ts`（导出 Legend）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（改：Legend 不吞 axes + 收集）
- `apps/docs/src/contents/**`（legend 概念页 + 各形态 demo）

### 测试象限

**Happy path**：
- `ordinal legend swatch`：分类 color → 每类一 swatch + 标签
- `sequential ramp`：连续 color → 色带 ramp + nice 刻度
- `size 梯度符号`：size 通道 → 3 档代表圈 + 值

**边界**：
- `单类别 legend`：color 一个类别 → 一 swatch
- `quantile 分箱标签`：quantile scale → 每档区间标签（闭开口契约）
- `空 domain`：0 行 → legend 不崩（空或退化）

**错误路径**：
- `多 scale 未消歧`：两个 color scale + `<Legend channel="color">` 无 scale → fail-loud（提示加 scale）
- `legend 绑无效通道 scale`：channel 指向不存在的 scale name → fail-loud

**交互**：
- `Legend 不吞默认 axes`（修 P1 ⑦）：`<PointMark/>` + `<Legend/>`（无显式 Axis）→ 默认 x/y 轴**仍在** + legend
- `显式 Axis + Legend 共存`：显式一条 Axis + Legend → 该 Axis 覆盖默认、另一维默认补、legend 在
- `legend 占位`（P2 ⑩）：position='right' → plotArea 右侧收窄、legend 落预留带（非 overlay / 出界）
- `descriptor 复用`（P1 ⑥）：size resolver 产 descriptor `domain=[0,max] range=[2,20]` → legend 梯度符号读同一 descriptor（resolver 与 legend 一致）

### 依赖的现有元素

- `GuideSchema` / `AxisGuideSchema` / `PlotGuide` / `GuideDimension`（`ir/guide.ts`）—— 扩展（升 union）
- `makeSizeResolver` / `makeOpacityResolver` / `makeShapeResolver` + `SIZE_MIN/MAX_RADIUS` / `OPACITY_MIN` / `PLOT_SHAPE_PALETTE`（`lower/channel.ts`）—— 修改（加 descriptor 产出）
- `computePlotArea` / `estimateLabelWidth` / `Margins` / `PlotAreaInput` / `Rect`（`lower/layout.ts`）—— 修改（legend 占位）+ 复用（标签宽估算）
- `lowerGuide` / `GuideContext` / `LoweredGuide`（`lower/guide.ts`）—— 扩展（加 lowerLegend）
- axis tick formatter（`lower/guide.ts` / `lower/scale.ts` tick 链）—— 复用（legend 标签 formatter，决策 ⑨）
- color scale descriptor（[ADR-01](./01-continuous-color-scale.md) / [ADR-02](./02-discretization-scale.md) 的 sequential/diverging/离散化）—— 消费（ramp / 分箱形态）
- core `linearGradient` paint server（`packages/core/core/src/ir/...`）—— 可能消费（连续 ramp；实现期核验，不足走 next-core）
- `buildPlotSpec` guide 收集 + 默认 axes（`buildPlotSpec.ts:113`/`:293`）—— 修改（收 Legend + by-type 合并）
- `DEFAULT_GUIDES`（`buildPlotSpec.ts`）—— 引用（by-type 补齐基准）
