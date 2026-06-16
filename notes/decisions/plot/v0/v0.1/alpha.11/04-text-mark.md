# ADR-04：text mark——datum label 数据标签，优先挂宿主 Node.label、兜底新建带 `text` 的核心 Node

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §3.6 通道 / §3.7 mark 表（text=数据标签 label）](../../../../../architecture/plot-design.md) · [alpha.11 ADR-01：cell 几何投影](./01-cell-geometry-projection.md)（同 milestone，投影路径参照）

## 背景

plot-design §3.7 的首批 mark 表里，`text` 的语义是「数据标签 label」：在每个 datum 的位置放一段文本，把数据值（或任意字段串）直接写在图上。这是 grammar of graphics 里最常用的「直接标注」手段——柱顶写数值、散点旁写品类名、折线端点写系列名。现状 plot 的 mark union（`packages/plot/plot/src/ir/mark.ts`）有 point / line / interval / sector / area 五种，**没有任何 mark 能产出文本**，用户想给图加数据标签只能退回手写 core `Node{text}` 并自己算屏幕坐标，绕开了 plot 的 scale / coordinate 投影。

同类库对照：Observable Plot 的 `Plot.text(data, {x, y, text})` 把文本当成一个独立 mark，位置走与 dot 完全相同的 x/y 投影，只是渲染成字而非点；Vega-Lite 的 `mark: "text"` 同理，用 `text` encoding channel 绑定标签内容，`dx`/`dy` 做像素偏移；G2 的 `label` / `text` 也是「位置 = 数据点投影 + 文本内容 = 一个通道」。**共识是：text mark 几何上等同 point，差别只在 emit 文本而非 glyph，外加一个「文本内容」通道。**

retikz 的关键复用点是 §8.1 硬约束「mark 下沉的图元尽量是可连接的 core Node」+ alpha.9 的坐标系无关投影 `frame.projectRoles`。point mark 现状（`lower/mark.ts` 的 `lowerPoint`）已经把「逐行经 `datumAnchor`（内部走 `frame.projectRoles(roleValues)`）投影 → 建 core `Node{position}`」这条路走通且坐标系无关。text mark 的位置永远复用这条投影路径——投影逻辑零新增；差别只在「文本挂到哪个 Node」。

core 侧文本与标签能力**双载体已就绪**，且二者职责不同，决定了本 ADR 的下沉优先级：

- **`Node.text`（`TextBlockSchema`，`packages/core/core/src/ir/text.ts`）**：节点自身正文。当 text 存在时 node 参与文本度量、box 尺寸、TextPrim emit；适合「文本本身就是一个独立 Node」的自由文本场景。
- **`Node.label`（`NodeLabelSchema`，`node.ts:50`）**：挂在某个**既有 Node 边框周围**的附属标签，core 原生提供 `position`（8 方向枚举或数字角度）+ `distance`（离边距，默认 12）+ `textColor` + `font` + `rotate` + `keepUpright` + `pin`（引线 leader），且 **label 不参与 layout**、可挂多个（数组形）。这正是 grammar of graphics 里「直接标注」的标准载体：柱顶数值、散点品类名本质是「挂在 bar/point 这个 datum Node 上的标签」。

初版 ADR 把 datum label 下沉成「新建 Node + 内部 `text` + 手动 dx/dy/anchor」，等于在 plot 侧把 core `Node.label` 已有的「边框相对定位 + distance + 引线」重造了一遍——这是评审反馈①指出的最低优先级实现。core `Node.label` 不需要 plot 新能力，纯消费即可拿到边框相对定位 + 引线，因此本次修订把它提为首选下沉目标。

## 决策：text mark 优先把文本挂宿主 datum Node 的 `label`，无宿主时兜底新建带 `text` 的核心 Node；text 内容支持 field / value / format 三层 + 运行时 resolveLabel 逃生舱

text mark 的位置投影永远复用 point 同源路径（`datumAnchor` → `frame.projectRoles(roleValues)`，坐标系无关）。差别在文本「挂到哪个 Node」与「内容怎么来」，本 ADR 定两条决策线。

### 决策线 A：下沉优先级链——宿主 Node `label` > 新建 Node

按「文本是否绑定某个已下沉成 Node 的 datum」分两档，**优先级从高到低**：

- **① 宿主 datum Node 的 `label`（首选）**：当 label 标注的就是另一个位置 mark（point / interval / sector …）的 datum——而该 datum 已经下沉成一个 core `Node`——直接把文本挂到那个 Node 的 `label`（`NodeLabelSchema`：`position` 方位 + `distance` 离边距 + 可选 `pin` 引线 + `textColor`）。**零新建 Node**：边框相对定位、distance、引线全由 core 负责，IR 体积不增、标签天然贴着宿主图元。落地形态 = **给位置 mark（point / interval / …）加一个可选 `label` 配置通道**，lowering 该 mark 时给它产出的每个 datum Node 填上 `label`（单个或数组）。这是评审反馈①要求的首选路径，也是 grammar of graphics 「直接标注 = 图元的一部分」的语义本相。
- **② 新建独立 Node（兜底）**：仅当文本**没有宿主**（自由浮动文本、注解、不绑任何 datum mark 的说明文字）时，`<TextMark>` 才新建一个 core `Node` 承载文本。此时文本就是这个 Node 本身的正文，用 `Node.text`；位置经 point 同源投影写 `position`。需要相对偏移时优先用该 Node 自己的 `label`（仍走 core 边框相对定位），把手动 dx/dy 仅作微调逃生舱，不作首选造位手段。

**优先级链一句话：把文本作为既有宿主 Node 的 `label`（复用 core 边框定位 + distance + 引线）> 无宿主才新建独立 Node 承载文本。** 决不在 plot 侧手动用 dx/dy/anchor 重造 core 已有的边框相对定位。

**下沉目标始终是 core `Node`（其 `label` 或 `text`），不是 core Text primitive。** core 没有独立顶层 Text primitive 实体，文本的唯二载体就是 `Node.label` / `Node.text`；且 §8.1 要求图元尽量可连接——`Node` 自带 `boundaryPoint` / compass anchor / `label`，挂在宿主上还能被 `<Path>` 指向、再挂二级标注。两档都统一在 `colorGroupedScope` / `decorateDatum` / `attachMarkLayer` 现有装配管线下。

### 决策线 B：text 内容三层 + 运行时逃生舱

IR 必须 100% JSON 可序列化（不能存函数），故自定义 label 内容分「进 IR 的三层 + 不进 IR 的运行时一层」，与 plot 既有「IR 存声明、运行时注入解析器」机制（参见 `lower/field.ts` 的 `channelValue` / `resolveFieldPath` 字段解析、03-rule-mark ADR 的 `resolveField` 逃生舱模式）一脉相承：

- **`field`（进 IR）**：取该行字段值转字符串作标签（现状保留）。
- **`value`（进 IR）**：常量串，所有行同一标签（现状保留）。
- **`format`（进 IR，新增）**：可选格式串（数字 / 时间格式），JSON 安全。当 `field` 是数值 / 时间时按 `format` 输出标签（如 `1234.5` → `1,234.5`、时间戳 → `2026-06`）。format 串是声明、不是函数，进 IR 不破坏可序列化。
- **运行时 `resolveLabel(row) => string`（不进 IR，新增逃生舱）**：任意模板 / 拼接（如 `` `${name}: ${value}` ``）。**与 IR 字段解析同机制——运行时通过 compile / render options 注入**，不写进 PlotSpec，故不破坏 IR JSON 可序列化。是 `field` / `value` / `format` 都覆盖不了的完全自定义出口。

四者优先级（运行时高于声明、具体高于通用）：`resolveLabel` > `format`(套在 `field` 上) > `field` > `value`。`field` / `value` 仍互斥（schema refine）；`format` 仅在有 `field` 时有意义。

```ts
// ir/mark.ts —— PlotMark 加 Text 成员
export const PlotMark = {
  Point: 'point',
  Line: 'line',
  Interval: 'interval',
  Sector: 'sector',
  Area: 'area',
  /** 文本：自由文本兜底；datum label 首选挂宿主 mark 的 label 通道，无宿主才用本 mark 新建 Node */
  Text: 'text',
} as const;

// ir/encoding.ts —— 文本内容通道（field→字段值转串 / value→常量串 / format→格式串）
export const TextChannelSchema = z
  .object({
    field: z.string().min(1).optional().describe('Data path whose row value becomes the label string; mutually exclusive with value'),
    value: z.string().min(1).optional().describe('Constant label string for every datum (mutually exclusive with field)'),
    format: z.string().min(1).optional().describe('Optional JSON-safe format string (number / date) applied to a numeric or temporal field value before stringification; only meaningful together with field. A runtime resolveLabel(row) escape hatch (injected via options, never in the IR) overrides this for fully custom templates'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'text channel must set exactly one of `field` or `value`' })
  .describe('Text content channel: field → per-datum label string / value → a constant label / format → format string for a numeric or temporal field');

// ir/encoding.ts —— 位置 mark 承载宿主 label 的配置（对齐 core NodeLabelSchema 的 position / distance + 内容）
export const MarkLabelSchema = z
  .object({
    content: TextChannelSchema.describe('Label content channel (field / value / format)'),
    position: z.union([z.enum(AtDirection), z.number()]).optional().describe('Placement around the host datum node border: 8-direction enum or numeric angle (degrees); mirrors core NodeLabelSchema.position. Default above'),
    distance: z.number().nonnegative().optional().describe('Gap between the host node border and the label center (user units); mirrors core NodeLabelSchema.distance. Default 12'),
    pin: z.boolean().optional().describe('Draw a leader line from the host node border to the label (core NodeLabelSchema.pin). Default false'),
  })
  .describe('Datum label attached to a positional mark: lowered onto each datum Node.label (core border-relative placement), the preferred path over a standalone TextMark');

// 位置 mark（point / interval / …）的 encoding 或 mark 顶层加可选 label
//   —— lowering 时给每个 datum Node 填 NodeLabelSchema：零新建 Node、core 负责边框定位 + 引线

// TextMark 专属 encoding：位置(x/y/a/b/c) + 样式(color) + text 内容（兜底自由文本用）
export const TextEncodingSchema = EncodingSchema.extend({
  text: TextChannelSchema.describe('Required label content channel for the standalone TextMark fallback: field / value / format'),
}).describe('TextMark encoding: positional + color + the required text content channel (standalone free-text fallback)');

// ir/mark.ts —— TextMarkSchema（自由文本兜底；首选仍是给宿主 mark 加 label）
export const TextMarkSchema = z
  .object({
    type: z.literal(PlotMark.Text).describe('Discriminator: a standalone free-text label with no host datum, positioned like a point'),
    dx: z.number().finite().optional().describe('Fine-tuning horizontal offset (user units) from the projected anchor; positive = right. Prefer label position/distance; dx is an escape hatch. Default 0'),
    dy: z.number().finite().optional().describe('Fine-tuning vertical offset (user units) from the projected anchor; positive = screen-down. Prefer label position/distance. Default 0'),
    ...markBase,
    encoding: TextEncodingSchema,
  })
  .describe('Text mark: a standalone free-text label placed at each record (same projection as point), emitting a core Node carrying text. For labelling another mark’s datum prefer that mark’s label channel');
```

下沉装配（`lower/mark.ts`）：

```ts
// ① 宿主 label（首选）：位置 mark（point / interval / …）的 lowering 末尾，
//    若 mark.label 存在，给每个 datum Node 填 label = {
//      text: labelOf(row),                       // field / value / format / resolveLabel 解析后的串
//      position: mark.label.position,            // → core NodeLabelSchema.position（边框方位）
//      distance: mark.label.distance,            // → core NodeLabelSchema.distance（离边距）
//      pin: mark.label.pin ? true : undefined,   // → core 引线 leader
//    }
//    零新建 Node：core 负责边框相对定位 + distance + 引线。

// ② 新建 Node（兜底，lowerText）：逐行 point = datumAnchor(mark, row, frame)
//    → core Node{ position, text: labelOf(row) }；需偏移时优先用该 Node 自己的 label，dx/dy 仅微调。

// labelOf(row)：resolveLabel(row)（运行时注入，最高优先）
//   ?? applyFormat(resolveFieldPath(row, content.field), content.format)   // field + 可选 format
//   ?? content.value                                                       // 常量
// 无内容（field 解析 null/undefined 且无 value/resolveLabel）→ 跳过该行（同 point null 跳过语义）
// color：复用 colorGroupedScope，文本色走子 Scope nodeDefault 的 textColor（非 fill）
```

理由：

1. **几何零新增、与 point 同源**：两档下沉的位置都 100% 复用 `datumAnchor` → `frame.projectRoles` 这条已验证、坐标系无关的投影路径，不引入新坐标系分支，不碰 `lower/project.ts` / `lower/anchor.ts` 几何。
2. **优先挂宿主 Node `label`、兜底才新建——守 §8.1 且不重造轮子**：datum label 的最干净下沉是把文本作为既有宿主 Node 的一部分（`Node.label`），由 core 原生承担边框相对定位 + `distance` + `pin` 引线，**零新建 Node、IR 体积不随标签增长**，且标签可随宿主一并被 `<Path>` 指向。只有无宿主的自由文本才退到新建独立 `Node{text}`（兜底仍优先用该 Node 自身 `label` 做相对定位，不手动 dx/dy 造位）。这纠正了初版「一律新建 Node + 手动 dx/dy/anchor」在 plot 侧重造 core 已有能力的问题（评审①）。
3. **自定义 label 在 JSON IR 约束下的三层 + 运行时一层方案**：IR 不能存函数，故声明层给足 `field` / `value` / `format`（都 JSON 安全、AI 可生成、可序列化往返），完全自定义的模板拼接走运行时 `resolveLabel(row)` 逃生舱（不进 IR、运行时注入），与 plot 既有字段解析 / 03-rule-mark 的 `resolveField` 注入机制同源（评审②）。
4. **text 内容是独立通道、不藏进 type**：符合 plot-design §3.6「非位置通道（…text…）」与 encoding「字段 / 常量显式」原则；`field` / `value` 互斥延续 Channel 模式，`format` / `resolveLabel` 是其上的格式化与逃生扩展。

## 待决策点 🔻

- **宿主解析机制（datum 身份匹配 vs label 作为 host mark 的通道）**：「把文本挂到哪个 datum Node」有两条路。(a) `<TextMark>` 独立声明，lowering 期按某种 datum 身份（同 x/y 键、同序号）跨 mark 匹配回宿主 Node——需要一套跨 mark 的 datum 对齐规则，脆且歧义（多 mark 同位、键冲突）。(b) **label 直接作为宿主 mark 自己的通道 / 配置**（`<BarMark … label=…>`），lowering 该 mark 时就地给它产出的 datum Node 填 `label`，**无需跨 mark 匹配、无身份歧义**。倾向：**(b) 最干净**——首选路径就是「位置 mark 加 label 通道」，`<TextMark>` 只保留为「无宿主自由文本」的兜底，不承担「标注别的 mark」职责。
- **format 串的方言**：`format` 进 IR、必须 JSON 安全。待定具体方言：d3-format（数字）+ d3-time-format（时间）风格串，还是更小的自定义子集。倾向：对齐生态最广的 d3-format / d3-time-format 串语义，运行时按 field 值类型分派（数值走 number format、时间走 time format）；具体支持子集在 implement 期对齐 data.model 层已有的 format 能力后定。
- **`resolveLabel(row)` 的注入点**：运行时逃生舱不进 IR，需定注入通道。倾向与 plot 既有字段 / 解析器注入同点——经 compile / render options（如 `lowerPlots` / `renderPlot` 的 options 里按 mark id 或全局传 `resolveLabel`），与 03-rule-mark 的 `resolveField` 注入对齐；具体 key 形态（按 mark id map vs 单函数）在 implement 期与既有 options 形态对齐后定。
- **dx/dy 是否保留为微调**：首选用 core `label` 的 `position` / `distance` 表达放置，已取代手动定位。dx/dy 仅作「core 边框定位不够」时的像素级微调逃生舱。待定：是否在 v1 就暴露 dx/dy，还是先只给 position/distance、确有微调诉求再补。倾向：保留 dx/dy 但文档明确标为逃生舱、首选 position/distance。
- **text 通道在 schema 上必填 vs 可选**：自由文本 `<TextMark>` 没有内容就没有意义。倾向 `TextEncodingSchema.text` **必填**（非 optional），缺失在 schema 层即拒。宿主 label 通道（`MarkLabelSchema`）则整体可选（不加 label 即无标注），但一旦给出其 `content` 必填。倾向：TextMark.text 必填、宿主 label 整体可选。
- **font / 精细文本样式**：v1 文本色走 color 通道（→ Node `textColor` / label `textColor`），字号 / 字族 / 粗细等**不在本 ADR 暴露 prop**，归 Theme（alpha.15）统一管。倾向：基础色走 encoding，其余推后 Theme。

## DSL 表面

datum label 有两套优先级表面，**不要混用**，且各有 IR / React 两层：

- **priority-1（首选）：宿主 mark 加 `label` 通道**——给位置 mark（bar / point / …）一个 `label` 配置，lowering 时挂到该 mark 每个 datum 的 `Node.label`。用于「标注另一个 mark 的数据」。
- **priority-2（兜底）：独立 `<TextMark>`**——无宿主的自由浮动文本，新建 Node 承载 `text`。

### priority-1：宿主 mark 的 `label` 通道（首选）

IR 层：位置 mark 加 `label`（`MarkLabelSchema`：`content` 内容通道 + `position` / `distance` / `pin`，对齐 core `NodeLabelSchema`）：

```ts
// 柱顶数据标签 IR：label 挂到 interval 每个 datum Node 的 label，core 负责边框上方定位
{
  type: 'interval',
  encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
  label: {
    content: { field: 'revenue', format: ',.0f' }, // field + format：千分位整数
    position: 'above',                              // → core NodeLabelSchema.position
    distance: 6,                                    // → core NodeLabelSchema.distance
    pin: false,
  },
}
```

React 层（扁平 props，与 `marks.tsx` 现有 `<BarMark>` / `<PointMark>` 同风格）：

```tsx
// 柱顶数据标签：BarMark 自己带 label，core 把标签摆在柱顶边框上方，无需第二个 mark
<Plot data={sales}>   {/* coordinate 缺省 cartesian2D，可省 */}
  <BarMark x="month" y="revenue" label="revenue" labelPosition="above" labelDistance={6} />
</Plot>

// 散点旁标品类名 + 引线；坐标系无关——换 polar 标签自动跟到环上对应位置
<Plot data={points} coordinate="polar2D">
  <PointMark x="angle" y="radius" color="cat" label="label" labelPosition="right" labelPin />
</Plot>
```

自定义 label 内容三层 + 运行时逃生舱（React 层）：

```tsx
// format：数值 / 时间格式串（进 IR）
<BarMark x="month" y="revenue" label="revenue" labelFormat=",.0f" />

// resolveLabel：完全自定义模板，运行时注入、不进 IR
<BarMark x="month" y="revenue" resolveLabel={row => `${row.month}: ${row.revenue}`} />
```

### priority-2：独立 `<TextMark>`（自由文本兜底）

无宿主自由文本才用 `<TextMark>`；x / y / text / color 都是顶层 `string`：

```tsx
// 在 (x,y) 投影点放一段自由注解文本（不绑任何 datum mark）
<Plot data={points} coordinate="polar2D">
  <PointMark x="angle" y="radius" />
  <TextMark x="angle" y="radius" text="label" color="cat" />
</Plot>
```

对应 IR（PlotSpec.marks 成员，text 通道 field / value 互斥、可选 format）：

```ts
{
  type: 'text',
  encoding: {
    x: { field: 'angle' },
    y: { field: 'radius' },
    text: { field: 'label' },   // 内容通道：field → 该行字段值转串（可加 format）
    color: { value: '#333' },
  },
}
```

约定：React 层 `label="revenue"` / `text="label"` 顶层 string **默认按字段**解析（与 x/y/color 一致），装配成 IR 的 `{ field: 'revenue' }`；`labelFormat` / `labelPosition` / `labelDistance` / `labelPin` 摊进 IR 的 `MarkLabelSchema`，`resolveLabel` 不进 IR、经 options 运行时注入。常量文本的 React 便捷写法推后再定。两套别混、两层别混：IR 是嵌套通道对象、React 是扁平 props；priority-1 挂宿主、priority-2 才新建 Node。

## 测试设计

`packages/plot/plot/tests/lower/text-mark.test.ts`（新建）+ `ir` schema 测试覆盖：

- priority-1 宿主 label：位置 mark 带 `label` → 每个 datum Node 的 `label`（NodeLabelSchema）被填上，position / distance / pin 落到 core label，**零新建 Node**
- priority-2 兜底：无宿主 `<TextMark>` 逐行投影成带 `text` 的 core Node，位置与同 spec 的 point mark **逐字节同源**（除 shape/text 字段）
- text 通道 field → 字段值转串；value → 常量串；二者互斥（schema refine）；`format` 套在 field 上输出格式化串
- 运行时 `resolveLabel(row)` 逃生舱（options 注入）→ 标签内容覆盖 field/value/format
- 多坐标系（cartesian2D / polar2D / ternary2D / custom）下 text 都能投影（坐标系无关，不像 interval 受限）
- color 通道 → 文本色（textColor）按色分子 Scope

具体见下「实现契约 § 测试象限」。

## 影响

本 ADR 三包 lockstep 全补（plot core / plot-react / plot-vanilla 同一改动集交付），vanilla **无代码改动**——`renderPlot` mark 无关、纯 spec 驱动，新 text mark 经 schema 校验后自动经 `lowerPlots` → core，vanilla 侧零修改，其交付落在 SSR 测试 + docs demo。

- **Plot IR（plot core）**：`ir/mark.ts` 加 `PlotMark.Text` + `TextMarkSchema`，并入 `MarkSchema` discriminatedUnion；**给位置 mark（point / line / interval / area …）的 schema 加可选 `label` 配置**（承载 `MarkLabelSchema`，priority-1 宿主路径）。`ir/encoding.ts` 加 `TextChannelSchema`（含 `format`）+ `MarkLabelSchema`（对齐 core `NodeLabelSchema` 的 `position` / `distance` / `pin`）+ `TextEncodingSchema`。
- **lowering（plot core）**：`lower/mark.ts` 给现有位置 mark 的 lowering 末尾加「若 `mark.label` 存在，逐 datum Node 填 `label`（NodeLabelSchema：position / distance / pin / 解析后的 text）」装配（priority-1）；加 `lowerText`（镜像 `lowerPoint`，priority-2 兜底自由文本）。`lowerMark` 分发加 text 分支；text 坐标系无关，**不进** 1D / ternary / custom 的 interval fail-loud 网（与 point 同等放行）。`labelOf(row)` 解析：运行时 `resolveLabel(row)`（options 注入）> `field` + 可选 `format` > `value`。`lower/anchor.ts` 的 `channelForRole` / `datumAnchor` 对 text 走与 point 相同路径（落 `frame.projectRoles` 默认分支，可能零改动或仅加 text 判别）。
- **plot-react**：`components/marks.tsx` 给现有 `PointMark` / `BarMark` / … props 加 `label` / `labelPosition` / `labelDistance` / `labelPin` / `labelFormat`（扁平）+ `resolveLabel`（函数，运行时注入、不进 IR）；新增 `TextMark`（返回 null 的 `FC<TextMarkProps>`）+ `TextMarkProps`（扁平 props：x/y/text/color 顶层 string + dx/dy/id），priority-2 兜底。`components/build-plot-spec.ts` 的 `collectInto`：(1) 位置 mark 分支把 `label*` 扁平 props 装进 IR mark 的 `label`（`MarkLabelSchema`）、`resolveLabel` 收进 options 注入通道；(2) 加 `child.type === TextMark` 分支，扁平 props 摊进 IR text mark 的 `encoding`（text/x/y/color 各装 encoding，dx/dy 装 mark 顶层），text 几何同 point、走 `projectRoles`，**不进** interval fail-loud 网。`components/index.ts` + `src/index.ts` 两层 barrel 补 re-export `TextMark` + `TextMarkProps`。
- **plot-vanilla**：`render-plot.ts` 的 `renderPlot` mark 无关、纯 spec 驱动，**无代码改动**；交付 = `packages/plot/vanilla/tests/` 新增「宿主 label（Node.label）」+「自由 TextMark」两类带文本 label 的 SSR 渲染断言。
- **依赖 core**：priority-1 消费 `Node.label`（`NodeLabelSchema`：`position` / `distance` / `pin` / `textColor`）；priority-2 消费 `Node.text`（`TextBlockSchema`）+ Node 的 `textColor` / offset position；均仅消费、不改 core 内部。core 无需新能力。
- **文档站**：`apps/docs/src/contents/plot/...` 加 text / datum label mark 页（API 表 + 「柱顶标签 / 散点标注」demo + `.data.ts` / `.demo.tsx`）；zh / en 同步。
- **对外 API**：(1) 位置 mark 新增可选 `label` 配置（`MarkLabelSchema`：content + position/distance/pin）+ React `label*` props + `resolveLabel` 逃生舱（priority-1）；(2) 新增 IR text mark（`type:'text'` + `encoding.text` 含 `format`）与 React `<TextMark>` sugar（priority-2）；均纯新增，非 breaking。

## 不在本 ADR 范围

- **标签碰撞 / 防重叠（declutter）**：明确**推后**。纯函数 lowering 无文本度量（plot-design §13 第 5 条「lowering 里无文字度量」），自动避让 / 抽稀依赖字体 metrics、不可序列化，是后续 + 性能专项议题，不在本 ADR。
- **复杂数值格式化引擎 / 自定义 format 函数**：进 IR 的 `format` 只接 JSON 安全的格式串（d3-format / d3-time-format 风格）；需要任意函数式格式化走运行时 `resolveLabel(row)` 逃生舱（不进 IR）。把格式化做成独立可复用 transform 仍可作为后续专项，但本 ADR 已在 text 通道内提供 `format` + `resolveLabel` 两档自定义。
- **精细文本样式（font / 字号 / 字重 / 旋转）**：归 Theme（alpha.15）；本 ADR 仅暴露 color → textColor + label 的 position/distance/pin（+ dx/dy 微调）。
- **多行 / 富文本标签**：`Node.text` 支持多行 TextBlock，但 v1 text 通道只产单串；多行 / 富文本推后。
- **沿路径 / 沿轴排布的标签（line label / axis tick label）**：那是 guide / line mark 的衍生议题，不是 datum label。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（mark + encoding schema 改动）+ `packages/plot/plot/src/lower/**`（lowering 产物契约）。同时动 `packages/plot/react/src/components/**`（`marks.tsx` + `build-plot-spec.ts`，yellow 面）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `TextChannelSchema` | `z.object({ field?, value?, format? }).refine(field/value 互斥)` | — | text 内容通道（field/value/format） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `format` | `z.string().min(1).optional()`（TextChannelSchema 内） | — | 可选 JSON 安全格式串（数字/时间），仅与 field 同用 |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `TextChannel` | `z.infer<typeof TextChannelSchema>` | — | text 通道派生类型 |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `MarkLabelSchema` | `z.object({ content:TextChannelSchema, position?, distance?, pin? })` | — | 宿主 datum label 配置（对齐 core NodeLabelSchema） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `position`（label 内） | `z.union([z.enum(AtDirection), z.number()]).optional()` | `—`（缺省 above） | 标签相对宿主 Node 边框方位/角度（对齐 core） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `distance`（label 内） | `z.number().nonnegative().optional()` | `—`（缺省 12） | 标签离宿主边框距离（user units，对齐 core） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `pin`（label 内） | `z.boolean().optional()` | `—`（缺省 false） | 是否从宿主边框拉引线到标签（core leader） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `MarkLabel` | `z.infer<typeof MarkLabelSchema>` | — | 宿主 label 派生类型 |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `TextEncodingSchema` | `EncodingSchema.extend({ text: TextChannelSchema })` | — | TextMark 专属 encoding（兜底自由文本） |
| `packages/plot/plot/src/ir/encoding.ts` | 加 | `TextEncoding` | `z.infer<typeof TextEncodingSchema>` | — | TextMark encoding 派生类型 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `label`（位置 mark 内） | `MarkLabelSchema.optional()`（point / line / interval / area …） | — | priority-1：宿主 mark 的 datum label 配置 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `PlotMark.Text` | `'text'` const 成员 | — | text mark 判别串 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `TextMarkSchema` | `z.object({ type:literal(Text), dx?, dy?, id?, encoding:TextEncodingSchema })` | — | text mark schema（priority-2 自由文本） |
| `packages/plot/plot/src/ir/mark.ts` | 改 | `MarkSchema` | discriminatedUnion 加入 `TextMarkSchema` | — | union 纳入 text |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `TextMark` | `z.infer<typeof TextMarkSchema>` | — | text mark 派生类型 |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `dx` | `z.number().finite().optional()` | `—`（缺省 0） | TextMark 相对锚点水平微调（逃生舱，首选 label position/distance） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `dy` | `z.number().finite().optional()` | `—`（缺省 0） | TextMark 相对锚点垂直微调（逃生舱） |

字段名一旦写死，下游不允许改——需改回本 ADR 加条 / 开新 ADR。`MarkLabelSchema.position` 直接复用 core `AtDirection`（8 方向枚举）+ 数字角度（与 `NodeLabelSchema.position` 同形），`distance` / `pin` 同形对齐 core。运行时 `resolveLabel(row) => string` **不进 schema**（不可序列化），经 options 注入（注入点见待决策点）。

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改：给位置 mark（point / line / interval / area …）加可选 `label`（MarkLabelSchema）；加 `PlotMark.Text` / `TextMarkSchema` / 并入 `MarkSchema` / 派生类型）
- `packages/plot/plot/src/ir/encoding.ts`（修改：加 `TextChannelSchema`（含 `format`）/ `MarkLabelSchema` / `TextEncodingSchema` + 派生类型）
- `packages/plot/plot/src/lower/mark.ts`（修改：给现有位置 mark lowering 加「填 datum `Node.label`」装配（priority-1）；加 `lowerText`（priority-2 兜底），`lowerMark` 分发加 text 分支并把 text 排除出 1D/ternary/custom fail-loud 网；`labelOf(row)` 解析 resolveLabel > field+format > value）
- `packages/plot/plot/src/lower/anchor.ts`（修改：`channelForRole` / `datumAnchor` 对 text 走 point 同路径——若已落默认分支则零改动）
- `packages/plot/plot/src/lower/field.ts`（按需修改：`format` 套用与 `resolveLabel` 注入解析的接入点，复用 `resolveFieldPath` / `channelValue`）
- `packages/plot/plot/src/ir/index.ts` / `packages/plot/plot/src/index.ts`（按需补 re-export）
- `packages/plot/plot/tests/lower/text-mark.test.ts`（新建）
- `packages/plot/plot/tests/ir/*.test.ts`（修改：schema accept/reject 回归，含位置 mark label / format）
- `packages/plot/react/src/components/marks.tsx`（修改：给现有 `PointMark` / `BarMark` / … 加 `label` / `labelPosition` / `labelDistance` / `labelPin` / `labelFormat` + `resolveLabel`；加 `TextMark`（返回 null 的 `FC<TextMarkProps>`）+ `TextMarkProps`，扁平 props x/y/text/color 顶层 string + dx/dy/id）
- `packages/plot/react/src/components/build-plot-spec.ts`（修改：`collectInto` 位置 mark 分支装配 `label*` → IR mark `label`、`resolveLabel` 收进 options；加 `child.type === TextMark` 分支，扁平 props → IR text mark，text/x/y/color 摊进 encoding、dx/dy 装 mark 顶层；text 几何同 point 走 `projectRoles`，不进 interval fail-loud 网）
- `packages/plot/react/src/components/index.ts`（修改：barrel re-export `TextMark` + `TextMarkProps`）
- `packages/plot/react/src/index.ts`（修改：public API barrel re-export `TextMark` + `TextMarkProps`）
- `packages/plot/react/tests/*`（修改 / 新建：位置 mark `label*` props → IR mark `label` 装配 + `<TextMark>` props → IR text mark 装配测试）
- `packages/plot/vanilla/tests/*`（新建 / 修改：`renderPlot` 出「宿主 label」+「自由 TextMark」两类带文本 label 的 SVG 的 SSR 渲染断言；vanilla 源码不改）
- `apps/docs/src/contents/plot/...`（新建 / 修改：text / datum label mark 文档页 + `.data.ts` / `.demo.tsx`，zh / en 同步）

vanilla `render-plot.ts` 不在 scope（mark 无关、纯 spec 驱动，无代码改动）。偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与几何断言即可。

**Happy path（≥3）**：
- `label-host-node`（priority-1 首选）：位置 mark（interval）带 `label={ content:{field:'revenue'}, position:'above', distance:6 }` → 每个 datum Node 的 `label` 被填上对应 `NodeLabelSchema`（text/position/distance），**不新建额外 Node**
- `text-field-content`（priority-2 兜底）：`<TextMark text={{field:'revenue'}}>` → 每行 Node 的 `text` = 该行字段值转串，position = 同 spec point 的投影点
- `text-value-constant`：`text={{value:'label'}}` → 所有行 Node `text` 为同一常量串
- `text-position-parity-with-point`：同 x/y 的 TextMark 与 point mark，投影出的 Node `position` 逐字节相等（除 shape/text）

**边界（≥2）**：
- `text-field-null-skip`：text.field / label.content.field 解析出 null/undefined 的行 → 跳过（不产 Node / 不填 label），与 point 投影 null 跳过同语义
- `text-empty-rows`：空数据 / 全跳过 → `lowerText` 返回 null（不产空 Scope）

**错误路径（≥2）**：
- `text-channel-both-reject`：text / label.content 通道同时设 field 与 value → schema refine 拒
- `text-channel-neither-reject`：text 通道 field/value 都缺 → schema refine 拒（且 `encoding.text` 必填，整个缺 text 也拒）；宿主 `label.content` 给出时同样 field/value 必有一

**交互（≥2）**：
- `label-format`：`label.content.format`（如 `,.0f`）套在 field 上 → datum Node label 文本为格式化串
- `label-resolve-runtime`：运行时注入 `resolveLabel(row)` → 标签内容为模板拼接串，覆盖 field/value/format；且 IR 内不含函数（序列化往返不变）
- `text-polar-projection`：polar2D 下 text 经 `projectRoles` 投影到环上正确位置（坐标系无关，不 fail-loud，区别于 interval）
- `text-color-grouped-scope`：color 通道 → 文本色按色分子 Scope（textColor 落子 Scope nodeDefault，IR 体积 O(色数)）
- `label-pin-leader`：`label.pin=true` → 宿主 Node label 带引线（core `NodeLabelSchema.pin`）
- `text-dx-dy`：TextMark dx/dy 微调 → Node position 偏移正确（与无偏移基线对比）

**三包契约（plot-react 装配 + plot-vanilla SSR）**：
- `react-mark-label-assembly`（plot-react，priority-1）：`<BarMark x="month" y="revenue" label="revenue" labelPosition="above" labelDistance={6} labelFormat=",.0f" />` 扁平 props → IR interval mark 的 `label`（`MarkLabelSchema`：content `{ field:'revenue', format:',.0f' }`、position、distance），与手写 IR 等价（Sugar = Kernel）；`resolveLabel` prop 收进 options、不落 IR
- `react-textmark-encoding-assembly`（plot-react，priority-2）：`<TextMark x="month" y="revenue" text="revenue" color="cat" dy={-8} />` 扁平 props → IR text mark，断言 `type:'text'`、`encoding.text === { field:'revenue' }`、x/y/color 各落 encoding、dx/dy 落 mark 顶层，与手写 IR text mark 等价
- `vanilla-label-ssr`（plot-vanilla）：含「宿主 label」与「自由 TextMark」的 PlotSpec 经 `renderPlot` 出带文本 label（`<text>` 元素 + 内容串）的 SVG 字符串；证 vanilla spec 驱动、无代码改动即贯通三包

### 依赖的现有元素

- `lower/mark.ts` 的 `lowerPoint` / `colorGroupedScope` / `decorateDatum` / `attachMarkLayer` / `barLayer` 思路（`packages/plot/plot/src/lower/mark.ts`）—— `lowerText` 镜像 `lowerPoint` 装配；color 分组复用 `colorGroupedScope`。
- `lower/anchor.ts` 的 `datumAnchor` / `channelForRole` / `roleValues`（`packages/plot/plot/src/lower/anchor.ts`）—— text 走 point 同路径（`frame.projectRoles(roleValues)`）取屏幕点。
- `ir/encoding.ts` 的 `EncodingSchema` / `ChannelSchema` / `PointEncodingSchema`（`packages/plot/plot/src/ir/encoding.ts`）—— `TextEncodingSchema` extend `EncodingSchema` 加 text 通道，仿 `PointEncodingSchema` 扩展模式。
- `ir/mark.ts` 的 `PlotMark` / `markBase` / `positionalEncoding` / `MarkSchema`（`packages/plot/plot/src/ir/mark.ts`）—— 加成员 / 给位置 mark 加 `label` / schema / 并入 union。
- `lower/field.ts` 的 `channelValue` / `resolveFieldPath`（`packages/plot/plot/src/lower/field.ts`）—— 复用：解析 field 通道、`format` 套用与 `resolveLabel(row)` 运行时逃生舱接入点（同既有字段解析机制，参见 03-rule-mark 的 `resolveField`）。
- **core `Node.label`（`packages/core/core/src/ir/node.ts:50` 的 `NodeLabelSchema` + `NodeSchema.label`，单个或数组）—— priority-1 首选下沉目标：宿主 datum Node 填 `label`，由 core 原生承担 `position`（8 方向/角度）+ `distance` + `pin` 引线 + `textColor`，label 不参与 layout，仅消费不改 core。**
- core `Node.text`（`NodeSchema.text`，类型 `TextBlockSchema` 于 `packages/core/core/src/ir/text.ts`）—— priority-2 兜底下沉目标：无宿主自由文本产 `Node{ position, text }`，仅消费不改 core。
- core `Node` 的 `textColor` / offset position（`packages/core/core/src/ir/node.ts`）—— 承载 color → 文本色、TextMark dx/dy → 位置微调，仅消费。
