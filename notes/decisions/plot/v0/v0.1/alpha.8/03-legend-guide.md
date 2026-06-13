# ADR-03：legend guide——非位置 scale 的图例（swatch / 色带 ramp / 分箱）+ 估算布局占位

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.8 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.9 Guide / §13.1 结构上限](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 连续色阶](./01-continuous-color-scale.md) / [ADR-02 离散化 scale](./02-discretization-scale.md) + [alpha.7 size/opacity/shape](../alpha.7/roadmap.md) · 关联：[alpha.2 axis guide](../alpha.2/roadmap.md)（GuideSchema 升 union）

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
- **多 LLM review 后续修（Accepted 后）**：三处 review findings 已修 + 回归测试：
  - **P1 sector color legend**：`resolveColorLegend` 此前跳过 `PlotMark.Sector`，致饼/环图 `<Legend channel="color">` 抛「无绑定 color scale」或出空图例。sector 的 `color.field` 同 point/bar 按 datum 着色（ADR-01 B/C），已纳入 color 绑定收集。
  - **P1 shape glyph**：shape legend 条目带 `entry.shape` 但 `lowerLegend` 此前只画矩形 swatch、不应用形状，致 `<Legend channel="shape">` 渲成清一色矩形。已让 shape 条目的 swatch 画成编码的 glyph（circle/rectangle/diamond）。
  - **P2 legend.scale 类型守卫**：`legend.scale` 此前只校验存在、不校验是 color scale，`scale: 'x'`（位置 linear）会落空 ordinal 出空图例。已加 `COLOR_SCALE_TYPES` 守卫——color legend 绑非颜色 scale（位置 linear/band/point/time/log/pow/sqrt）即 fail-loud（了结原 adversarial 第一关 legend.scale WARNING，不再 backlog）。
- **占位落地为固定带宽**：决策 ⑩ 写「`estimateLabelWidth` + swatch 尺寸估」，实际 `legendReserveOf` 用固定 `LEGEND_BAND_EXTENT` 在对应边预留，不按标签长度估——长标签可能溢出（plot-design §13.1 允许）。后续可按标签宽细化。
- **ramp 刻度域取配置 domain（contract-audit W2 修）**：连续 ramp 的取色 / 刻度域显式 `domain` 优先（sequential `[min,max]`、diverging `[low,high]`），与实绘取色同基准；缺省回退数据 extent。早期曾固定取数据 extent，致显式 domain 时图例刻度与颜色错位，已修 + 回归测试。


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

`packages/plot/plot/tests/lower/legend.test.ts`（新建）+ `tests/ir/guide.schema.test.ts`（扩）+ `react/tests/components/buildPlotSpec.test.tsx`（扩）覆盖：union 判别、各通道各 scale 形态派生、descriptor 产出、默认 axes 共存、占位、标签 formatter、多 legend、fail-loud。落地测试见实现指针。

## 影响

- **Plot IR**：`ir/guide.ts` `GuideSchema` 升 discriminatedUnion（**结构变化但非破坏**——axis 仍合法，type 判别位 alpha.2 已留）；`PlotGuide` 加 `Legend`、新增 `LegendChannel` + `LegendGuideSchema` + 派生类型。
- **lowering**：`lower/channel.ts` resolver 双产出（+ ScaleDescriptor）；`lower/guide.ts` 加 `lowerLegend`；`lower/layout.ts` `computePlotArea` 加 legend 占位；`lower/expand.ts` 串 legend source 注册 + 占位输入。
- **core**：legend swatch/标签下沉 core Node/Path/Scope；连续 ramp **可能用 core `linearGradient` paint server**（待实现期核验，不足走 next-core）。不改 core 内部。
- **文档站**：新增 legend 概念页 + 各形态 demo（分类色 swatch / 连续 ramp / 分箱 / size 梯度）；散点等页补 legend。
- **对外 API**：`GuideSchema` 升 union（非破坏）；新增 `<Legend>` React 组件 + vanilla spec；**修 `buildPlotSpec` 默认 axes 规则**（行为：加 Legend 不再吞掉默认 axes——属修 bug 方向，不破坏既有合法 spec）。

## 不在本 ADR 范围

- **legend 自动派生**（声明通道即自动出）→ alpha.15 theme auto-guide。
- **legend 交互**（hover 高亮 / 点击筛选）→ v0.3 交互线（依赖 core 水合）。
- **测量驱动自适应**（标签防重叠 / 宽度自适应 / 旋转）→ 结构上限，不做（plot-design §13.1）。
- **reference line / band 等其它 guide** → 后续（本轮只 axis + legend）。
- **legend 内排序 / 自定义 swatch 模板** → 顺延。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/guide.ts`、`packages/plot/plot/src/lower/{channel,guide,layout,expand}.ts` 与 `packages/plot/react/src/components/`，测试见 `packages/plot/plot/tests/{ir/guide.schema,lower/legend}.test.ts` 和 `packages/plot/react/tests/components/buildPlotSpec.test.tsx`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.8/03-legend-guide.md`（封板全文）。
