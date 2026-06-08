# ADR-02：通用「通道 → scale」抽象 + size 通道（仅 PointMark，radius scale）

- 状态：Proposed
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.3 Aesthetics / §3.4 Scale](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 连续 scale 家族](./01-continuous-scale-family.md)（size 派生到 sqrt）· 下游：[ADR-03 color·series](./03-color-series.md)（color 迁入本 resolver）

## 背景

alpha.7 要补第一个非位置视觉通道 `size`，但当前结构有两处障碍：

1. **通道 → scale 处理未抽象**：位置通道（x/y）那套「按名绑定 scale + 无声明时按字段类型派生 + 类型↔scale 兼容 fail-loud」散落在 `lower/expand.ts` / `lower/scale.ts`；color 通道在 `makeColorResolver`（`expand.ts:372`）里**另写一套且恒走 ordinal**。再加 size 若各写各的，opacity / shape（ADR-04/05）还要再抄一遍。
2. **encoding 被所有 mark 共享**：`EncodingSchema = PositionEncoding.merge(StyleEncoding)`（`ir/encoding.ts:48`）被 point/line/interval/area **共用**，sector 直接用 `StyleEncodingSchema`（`ir/mark.ts:118`）。若把 `size` 加进全局 `StyleEncodingSchema`，会泄漏到 line/area/bar/sector——这些 mark 的「尺寸」语义各不相同（strokeWidth / 柱宽 / 扇形…），变成「schema 合法但语义不明」。且 `ChannelSchema.value` 是 `string | number | boolean | null`（`ir/data.ts:84`），size 常量会允许非数值。

size 的感知语义（已拍板 ①③）：**仅作用 PointMark**，是 **radius scale**——半径 ∝ √值（面积 ∝ 值，感知正确）；默认 domain `[0, maxPositive]`；core 换算细节（当前 `pointStyle` 的 `minimumSize: POINT_SIZE / Math.SQRT2`，`lower/mark.ts:69`）**不外泄给 IR 用户**。

同类库：**ggplot2** `scale_size` 按面积（radius ∝ √）、data→size 1..6；**Observable Plot** `r` 默认 sqrt、0→0、Q1→3px、偏向 `[0, max]` domain；**Vega-Lite** size 默认对 quantitative 走 linear-on-value（感知偏弱）。retikz 取 ggplot/Observable 的面积正确路线。

## 决策：抽出可复用「通道 → scale」resolver；size 仅加在 PointMark 专属 encoding，语义为 radius scale、默认派生到 sqrt

**(1) 通道 → scale 通用 resolver**：把「channel（field/value/scale）+ 字段类型 + scale 注册表」解析成「行 → 标量输出」映射器的逻辑，提炼成 `lower/channel.ts` 的纯函数，参数化「该通道接受的 scale 族 + 默认派生规则」。位置通道、color（[ADR-03](./03-color-series.md)）、size 共用之；opacity / shape（[ADR-04](./04-opacity-channel.md) / [ADR-05](./05-shape-channel.md)）直接复用。

**(2) size 通道仅进 PointMark**：不动全局 `StyleEncodingSchema`；给 PointMark 一份**专属 encoding** = `EncodingSchema` 扩 `size`。size channel 的 `value` 限 **number**（不复用宽松 `ScalarValueSchema`）。

```ts
// ir/encoding.ts —— size 专属 channel（value 限数值）+ PointMark 专属 encoding
export const SizeChannelSchema = z.object({
  field: z.string().min(1).optional().describe('Data path bound to the size channel; resolves to a numeric magnitude mapped through a radius (sqrt) scale'),
  value: z.number().finite().nonnegative().optional().describe('Constant final radius in px, bypassing the scale entirely (mutually exclusive with field)'),
  scale: z.string().min(1).optional().describe('Optional sqrt-scale name (only meaningful with field); omitted → a default radius (sqrt) scale is synthesized'),
}).refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'size channel must set exactly one of field / value' })
  .describe('Size channel (PointMark only): field → glyph radius via a sqrt scale; value → a constant final radius (px) that bypasses the scale');

// PointMark 专属 encoding：位置 + 样式(color) + size
export const PointEncodingSchema = EncodingSchema.extend({
  size: SizeChannelSchema.optional().describe('Optional size channel: data-driven glyph radius via a sqrt scale'),
}).describe('PointMark encoding: positional + color + optional size');
// ir/mark.ts：PointMarkSchema 的 encoding 改用 PointEncodingSchema（其余 mark 不变）
```

**(3) size = radius scale，派生到 sqrt（ADR-01）**：`size.field` 默认合成一个 `sqrt` scale（`PlotScale.Sqrt`，名 `__size_<field>`），domain `[0, maxPositive]`、range `[SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]`（px 常量）。**不新增 `PlotScale.Size` / `Radius` 类型**。**`size.value` 是最终半径（px）、绕过 scale**——它是常量视觉量，不参与 domain 推断 / 边界规则（那些只对 `size.field` 生效）。

**(4) ③ 边界契约**：默认 domain `[0, maxPositive]`；**无正值 → 所有点 `SIZE_MIN_RADIUS`**；**仅一个正值 → 映射到 range 上界**；**负值 fail-loud**；**显式 domain 含负数 → 拒绝**。负值校验在 **size resolver / size scale resolver**（读 canonical value 后做**通道级**校验）——`lower/coerce.ts` **不改**全局 continuous 语义（负值对 continuous 字段本身合法）。

**(5) core 换算 + per-datum 半径**：lowering 把 resolver 算出的半径（px）写入 core circle node 的尺寸字段（现 `pointStyle` 的 `minimumSize`，含 ÷√2 外接补偿）——**√2 / minimumSize 是 core 换算，不进 Plot IR 用户视野**。注意 per-datum 半径**打破** `colorGroupedScope`（`lower/mark.ts:46`）「同色共享 nodeDefault」的前提：半径随 datum 变时，**半径落到每个 node 自身**（node 级尺寸），而非子 Scope 的 nodeDefault；无 size 通道时维持现有按色分组。

理由：

1. **抽象先于第二通道**：size 是第二个非位置通道，此刻提炼 resolver 成本最低、收益覆盖 color + opacity / shape 全部通道。
2. **size 不污染其它 mark**：PointMark 专属 encoding 把「size 只对散点有意义」编码进类型，line/area/bar/sector 写 size 直接 schema 拒绝。
3. **面积正确 + 真源复用**：radius 走 ADR-01 的 sqrt，感知正确且与显式 sqrt 轴同一实现。

### 通道扩展定位：内置 curated 集 + 留注册表接缝

本轮通道集（position / size / color）是**内置 curated 集**，IR 层为闭集——对齐 [plot-design §11](../../../../../architecture/plot-design.md)「`coordinate` / `mark` / `scale`（通道同理）走**注册表**、不写死枚举」的**「先内置，后开放自定义」**策略。本 ADR 的**通用通道→scale resolver 即未来 `ChannelDefinition` 注册表的内部接缝**：resolver 参数化「该通道接受的 scale 族 + 默认派生 + lower 到哪个 core 视觉属性」，将来注册表只是把这组参数从内置常量改为运行时注入。

注册表对外开放时沿用 core 的**「配置 / 数据 / 函数」三分**（plot-design §6）——自定义通道定义**带函数、经 `CompileOptions` / `lowerPlots` options 运行时注入、不进 JSON IR**（IR 按通道名引用，函数定义运行时给），与 core 自定义 `shape`（IR 写名、几何函数注入）同构。硬约束：任何非位置通道终须 lower 到 core 已有视觉属性（fill / stroke / strokeWidth / opacity / shape 参数…），不能凭空发明 core 不识别的视觉效果（那要先补 core）。**现在就要任意视觉控制**的用户掉到 **Kernel**（`<Node>` / `<Path>`，直接写 core IR）——retikz 版的「Vega-Lite → Vega」逃生舱。本轮**只留接缝、不开放注册**。

## 待决策点 🔻

- **React `size` prop 形态**：本轮 `PointMarkProps.size?: string`（字段路径）。常量半径（`size={number}`）属样式，暂不进 DSL（IR 仍支持 `size.value`）。倾向只收字段。
- **range px 常量取值**：`SIZE_MIN_RADIUS` / `SIZE_MAX_RADIUS` 暂定 `2` / `20`（user units，对齐 `POINT_SIZE=10` 量级）。倾向此值，可在实现期微调（非契约）。
- **size 与 series 的关系**：PointMark 无 series（point 已按 datum 着色/定尺寸），size 纯 per-datum，不与 series 交互。无悬念。

## DSL 表面

```tsx
// React：bubble 散点——半径编码 population 字段（面积正确）
<Plot data={{ cities }}>
  <PointMark x="lng" y="lat" size="population" color="region" />
</Plot>
```

```ts
// vanilla / 原生 IR：size 通道 + 默认 sqrt 派生（省略 scale → 自动合成）
renderPlot(
  { type: 'plot', data: { reference: 'cities' },
    coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    scales: [{ type: 'linear', name: '__x' }, { type: 'linear', name: '__y' }],
    marks: [{ type: 'point', encoding: {
      x: { field: 'lng' }, y: { field: 'lat' },
      size: { field: 'population' },           // → 自动 sqrt radius scale
    } }] },
  { cities },
);
```

## 测试设计

`packages/plot/plot/tests/lower/size-channel.test.ts` + `lower/channel-resolver.test.ts` + `tests/ir/encoding.schema.test.ts` 覆盖：通道 resolver 抽象、size 半径几何、③ 边界退化、schema 拒绝（size 在非 point / value 非数值或负）、与 color 交互。具体见下「测试象限」。

## 影响

- **Plot IR**：`ir/encoding.ts` 加 `SizeChannelSchema` / `PointEncodingSchema`；`ir/mark.ts` 仅 `PointMarkSchema` 改用 `PointEncodingSchema`（其余 mark encoding 不变）。
- **lowering**：新建 `lower/channel.ts`（通用 resolver）；`lower/mark.ts` `lowerPoint` 接 size → per-node 半径 + core 换算；`colorGroupedScope` 在有 size 时退为 per-node 尺寸。
- **core**：size 落到 core circle 现有尺寸字段（`minimumSize`），**仅消费**。若实现期发现 core circle 不支持 per-node 半径表达 → 按 AGENTS.md「子组遇 core 能力不足先补 core」走 `next-core`，不在 plot 自造。
- **文档站**：散点页加 bubble demo + `<PointMark size>` API 行；scale 页提 size 用 sqrt。
- **对外 API**：`<PointMark>` 加 `size?` prop；IR PointMark encoding 加 `size`。**非 breaking**（纯新增可选）。

## 不在本 ADR 范围

- **size 作用于 line(strokeWidth) / bar(width) / area / sector**（① S1 范围外）→ 顺延。
- **categorical → 离散 size 档**（D1）→ 顺延 / 需求驱动；本轮仅 continuous→size。
- **opacity / shape 通道**（复用本 resolver）→ 同属 alpha.7，见 [ADR-04](./04-opacity-channel.md) / [ADR-05](./05-shape-channel.md)（2026-06-08 从 alpha.8 前移）。
- **常量半径的 React `size={number}` 表面** → 后续（IR 已支持 `size.value`）。
- **自定义通道注册表（`ChannelDefinition` 对外开放）** → 另立里程碑（plot-design §11「先内置，后开放自定义」）；本轮 resolver 仅留接缝，用户要任意视觉控制走 Kernel（`<Node>` / `<Path>`）。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/encoding.ts` / `ir/mark.ts`（IR 契约）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/encoding.ts` | 加 | `SizeChannelSchema` | `z.object`（field?/value?/scale?）| — | size 通道：数值字段经 sqrt 半径 scale → glyph 半径 |
| `ir/encoding.ts` | 加 | `SizeChannelSchema.value` | `z.number().finite().nonnegative().optional()` | — | 常量最终半径 px（绕过 scale；与 field 互斥）|
| `ir/encoding.ts` | 加 | `PointEncodingSchema` | `EncodingSchema.extend({size})` | — | PointMark 专属：位置 + color + 可选 size |
| `ir/mark.ts` | 改 | `PointMarkSchema.encoding` | `PointEncodingSchema` | — | point 用专属 encoding（含 size）|
| `ir/encoding.ts` | 加 | `SizeChannel` / `PointEncoding` | `z.infer` | — | 派生类型 |

> 其余 mark（line/interval/sector/area）encoding **不动**——size 不进全局 `StyleEncodingSchema`。

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（改）
- `packages/plot/plot/src/ir/mark.ts`（改：仅 PointMark）
- `packages/plot/plot/src/lower/channel.ts`（新建：通用通道→scale resolver）
- `packages/plot/plot/src/lower/mark.ts`（改：lowerPoint size + per-node 半径）
- `packages/plot/plot/src/lower/scale.ts`（改：size 默认 sqrt scale 合成 + ③ 边界）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（改：SizeChannel accept/reject）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（改：PointMark 含 size、其它 mark 拒 size）
- `packages/plot/plot/tests/lower/size-channel.test.ts` / `lower/channel-resolver.test.ts`（新建）
- `packages/plot/react/src/components/marks.tsx`（改：`PointMarkProps.size?`）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：point 装 size encoding）
- `apps/docs/src/contents/**`（散点页 bubble demo + API）

### 测试象限

**Happy path**：
- `size field → radii`：size 绑数值字段 → 各点半径按 √(value) 比例
- `bubble + color`：size + color 同点 → 半径与颜色独立生效
- `default sqrt 合成`：省略 scale → 自动 sqrt radius scale，domain [0,max]
- `size.value 常量半径`：`size: { value: 8 }` → 所有点固定 8px，绕过 scale

**边界**：
- `无正值 → 最小半径`：全 0 或空正值（且无负值）→ 所有点 `SIZE_MIN_RADIUS`，不报错
- `单正值 → range 上界`：仅一个正值 → 该点最大半径
- `空数据`：0 行 → 不崩、无 node

**错误路径**：
- `负值 fail-loud`：size 字段含负值 → 抛错（通道级，非 coerce）
- `显式负 domain 拒绝`：size scale domain 含负数 → 拒绝
- `size 在非 point mark`：line/area/bar encoding 写 size → schema 拒绝
- `size.value 非数值 / 负`：`size: { value: 'big' }` 或 `{ value: -3 }` → schema 拒绝

**交互**：
- `size + sqrt 轴`：size 复用 ADR-01 sqrt 实现 → 半径映射与显式 sqrt 一致
- `size 打破 colorGroupedScope`：size + color 多点 → 半径落 per-node、颜色仍按色分组（IR 体积/结构断言）

### 依赖的现有元素

- `EncodingSchema` / `StyleEncodingSchema` / `ChannelSchema`（`ir/encoding.ts`）—— 扩展（PointMark 专属 encoding；不动全局 Style）
- `PointMarkSchema`（`ir/mark.ts:51`）—— 修改 encoding
- `PlotScale.Sqrt` / `SqrtScaleSchema`（[ADR-01](./01-continuous-scale-family.md)）—— 消费（size 派生目标）
- `lowerPoint` / `pointStyle` / `colorGroupedScope`（`lower/mark.ts`）—— 修改（per-node 半径 + core 换算）
- core circle node 尺寸字段（`minimumSize`，core IR）—— 消费（lowering 目标，不改 core）
- `makeColorResolver`（`lower/expand.ts:372`）—— 迁移到通用 resolver（与 [ADR-03](./03-color-series.md) 协同）
