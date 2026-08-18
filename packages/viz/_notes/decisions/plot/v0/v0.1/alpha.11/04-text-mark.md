# ADR-04：text mark——datum label 数据标签，优先挂宿主 Node.label、兜底新建带 `text` 的核心 Node

- 状态：Superseded
- 替代：[alpha.12 ADR-03](../alpha.12/03-mark-abstraction-registry.md) 与 [alpha.13 ADR-07](../alpha.13/07-mark-label-surface.md)；独立 text mark 已并入 `PointMark` 文本 glyph，宿主标签统一走 mark label surface
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §3.6 通道 / §3.7 mark 表（text=数据标签 label）](../../../../../architecture/plot-design.md) · [alpha.11 ADR-01：cell 几何投影](./01-cell-geometry-projection.md)（投影路径参照）

## 背景（塑造决策的硬约束）

- plot-design §3.7 把 `text` mark 的语义定为「数据标签 label」：在每个 datum 位置写一段文本（柱顶数值、散点品类名、折线端点系列名）。原 mark union 只有 point / line / interval / sector / area，没有任何 mark 能产文本——用户只能退回手写 core `Node{text}` 并自算屏幕坐标，绕开 plot 的 scale / coordinate 投影。
- §8.1 硬约束：mark 下沉的图元尽量是可连接的 core `Node`。`Node` 自带 `boundaryPoint` / compass anchor / `label`，能被 `<Path>` 指向、再挂二级标注。
- 位置投影已有坐标系无关通路：point mark 走 `datumAnchor → frame.projectRoles(roleValues)`。text mark 的位置永远复用此路，几何零新增。
- core 文本能力是**双载体**，职责不同，决定下沉优先级：
  - `Node.text`（`TextBlockSchema`）：节点自身正文，参与文本度量 / box 尺寸；适合「文本本身就是一个独立 Node」的自由文本。
  - `Node.label`（`NodeLabelSchema`）：挂在某个**既有 Node 边框周围**的附属标签，core 原生提供 `position`（8 方向枚举 / 数字角度）+ `distance` + `pin` 引线 + `textColor`，**不参与 layout**、可挂多个（数组）。这正是「直接标注」的标准载体。
- IR 必须 100% JSON 可序列化，自定义 label 内容不能存函数。
- 同类库共识（Observable Plot `Plot.text`、Vega-Lite `mark:"text"`、G2 `label`）：text mark 几何上等同 point，差别只在 emit 文本而非 glyph，外加一个「文本内容」通道。

## 决策

text mark 的位置投影复用 point 同源路径（坐标系无关）。差别在文本「挂到哪个 Node」与「内容怎么来」，分两条决策线。

### 决策线 A：下沉优先级链——宿主 Node `label` > 新建 Node

- **① 宿主 datum Node 的 `label`（首选）**：当 label 标注的就是另一个位置 mark（point / interval / sector …）已下沉成的 core `Node`——直接把文本挂到那个 Node 的 `label`（边框相对定位 + `distance` + 可选 `pin` 引线 + `textColor`）。**零新建 Node**：定位 / 离边距 / 引线全由 core 负责，IR 体积不随标签增长，标签天然贴宿主图元、可随宿主被 `<Path>` 指向。落地形态 = **给位置 mark 加一个可选 `label` 配置通道**，lowering 该 mark 时给每个 datum Node 填 `label`。
- **② 新建独立 Node（兜底）**：仅当文本**无宿主**（自由浮动文本、注解）时 `<TextMark>` 才新建 core `Node` 承载 `Node.text`，位置经 point 同源投影写 `position`。需相对偏移时优先用该 Node 自己的 `label`，手动 dx/dy 仅作微调逃生舱。

**下沉目标始终是 core `Node`（其 `label` 或 `text`），不是 core Text primitive**——core 没有独立顶层 Text 实体，文本唯二载体就是 `Node.label` / `Node.text`。决不在 plot 侧用 dx/dy/anchor 重造 core 已有的边框相对定位。

被否决：初版「datum label 一律新建 Node + 内部 `text` + 手动 dx/dy/anchor」。理由——等于在 plot 侧把 core `Node.label` 已有的「边框相对定位 + distance + 引线」重造一遍；core `Node.label` 纯消费即可拿到这些能力，无需 plot 新能力，故提为首选。

### 决策线 B：text 内容三层（进 IR）+ 运行时逃生舱（不进 IR）

与 plot 既有「IR 存声明、运行时注入解析器」机制（`lower/field.ts` 的 `channelValue` / `resolveFieldPath`；03-rule-mark 的 `resolveField`）一脉相承：

- **`field`（进 IR）**：取该行字段值转字符串作标签。
- **`value`（进 IR）**：常量串，所有行同一标签。
- **`format`（进 IR）**：可选 JSON 安全格式串（数字 / 时间），仅在有 `field` 时有意义。串是声明、非函数，不破坏可序列化。方言对齐 d3-format / d3-time-format 风格，运行时按 field 值类型分派。
- **运行时 `resolveLabel(row) => string`（不进 IR，逃生舱）**：任意模板 / 拼接。经 compile / render options 注入、不写进 IRPlot，故不破坏 IR JSON 可序列化。是声明三层都覆盖不了的完全自定义出口。

优先级（运行时高于声明、具体高于通用）：`resolveLabel` > `format`(套在 `field` 上) > `field` > `value`。`field` / `value` 互斥（schema refine）；`format` 仅与 `field` 同用。

**字面形态本身就是决策的最小片段**——内容通道字段名与互斥关系（下游字段名不可改）：

```ts
// TextChannelSchema：field / value 互斥（refine），format 仅与 field 同用
{ field?: string; value?: string; displayFormat?: string }
// MarkLabelSchema：宿主 datum label 配置，position/distance/pin 对齐 core NodeLabelSchema
{ content: TextChannel; position?: AtDirection | number; distance?: number; pin?: boolean }
// TextEncodingSchema = EncodingSchema.extend({ text: TextChannelSchema })  // text 必填
// TextMarkSchema：{ type: 'text'; dx?: number; dy?: number; ...markBase; encoding: TextEncoding }
// 位置 mark（point/line/interval/area…）schema 加可选 label: MarkLabelSchema
```

`label` 顶层 string（React `label="revenue"` / `text="label"`）默认按字段解析，与 x/y/color 一致。`MarkLabelSchema.position` 缺省 `above`、`distance` 缺省 12、`pin` 缺省 false（对齐 core）；`TextMark.dx/dy` 缺省 0。

理由：

1. **几何零新增、与 point 同源**：两档下沉位置都复用已验证、坐标系无关的 `datumAnchor → frame.projectRoles`，不引入新坐标系分支、不碰 `project.ts` / `anchor.ts` 几何。
2. **优先挂宿主 Node `label`、兜底才新建——守 §8.1 且不重造轮子**：边框相对定位 / distance / 引线由 core 原生承担，零新建 Node、IR 体积不随标签增长；无宿主自由文本才退到 `Node{text}`。
3. **JSON IR 约束下的三层 + 运行时一层**：声明层 `field` / `value` / `format` 都 JSON 安全、AI 可生成、可序列化往返；完全自定义走运行时 `resolveLabel` 逃生舱。
4. **text 内容是独立通道、不藏进 type**：符合 §3.6「非位置通道」与 encoding「字段 / 常量显式」原则。

## 长期边界

- **宿主解析机制**（已拍板归此处避免歧义）：曾考虑 `<TextMark>` 独立声明后 lowering 期按 datum 身份跨 mark 匹配回宿主 Node——脆且歧义（多 mark 同位、键冲突），**已否决**。最终采「label 作为宿主 mark 自己的通道」就地填 `label`，`<TextMark>` 只承担无宿主自由文本，不承担「标注别的 mark」。
- **标签碰撞 / 防重叠（declutter）**：推后。纯函数 lowering 无文字度量（§13），自动避让依赖字体 metrics、不可序列化，是后续 + 性能专项。
- **复杂数值格式化引擎 / 自定义 format 函数**：进 IR 的 `format` 只接 JSON 安全格式串；任意函数式格式化走运行时 `resolveLabel`。把格式化做成独立可复用 transform 可作后续专项。
- **精细文本样式（font / 字号 / 字重 / 旋转）**：归 Theme（alpha.15）；本 ADR 仅暴露 color → textColor + label 的 position/distance/pin（+ dx/dy 微调）。
- **多行 / 富文本标签**：`Node.text` 支持多行 TextBlock，但 v1 text 通道只产单串；推后。
- **沿路径 / 沿轴排布的标签（line label / axis tick label）**：guide / line mark 的衍生议题，非 datum label。

## 未来兼容性

- 三包 lockstep（plot core / react / vanilla）；vanilla `render-plot.ts` mark 无关、纯 spec 驱动，**零代码改动**——新 text mark 经 schema 校验后自动经 `lowerPlots` 贯通三包。
- 对外 API 均为**纯新增、非 breaking**：位置 mark 新增可选 `label` + React `label*` props + `resolveLabel`（priority-1）；新增 IR text mark（`type:'text'`）+ React `<TextMark>` sugar（priority-2）。
- core 无需新能力，priority-1 仅消费 `Node.label`、priority-2 仅消费 `Node.text` / `textColor`。
