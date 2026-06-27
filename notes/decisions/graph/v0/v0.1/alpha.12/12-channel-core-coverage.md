# ADR-12：channel core coverage 对账 —— 按 core IRNode / IRPath / IRScope 属性补齐通道覆盖边界

- 状态：Proposed
- 决策日期：2026-06-22
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-10 channel registry](./10-channel-registry.md) · [ADR-11 custom visual channel](./11-custom-visual-channel.md) · [core Scope IR 容器](../../../../../architecture/core-design.md)

> 本 ADR 是 ADR-10 / ADR-11 的补充。ADR-10/11 先把 channel registry 和自定义 delivery 打通；当前代码已进一步收敛为 `ChannelDefinitionKind.Position | Mark | Scope | Node | Path`，但内置 provider 只覆盖 mark / node / position，缺少 path / scope 的内置覆盖清单。本 ADR 对照 core IR 属性，明确哪些应补成 plot channel，哪些不应进入本轮。

## 背景

`@retikz/core` 的底层元素已经有三类可承接 plot lowering 的主要落点：

- `IRNode`：点 glyph / 文本点 / interval cell 等会落成 node，具备 `fill`、`stroke`、`strokeWidth`、`opacity`、`fillOpacity`、`drawOpacity`、`shape`、`rotate`、`padding`、`minimumSize`、`zIndex`、`textColor`、`label`、`dashPattern`、`blendMode`、`shadow` 等属性。
- `IRPath`：path / region / link / reference 等会落成 path，具备 `stroke`、`fill`、`strokeWidth`、`dashPattern`、`lineCap`、`lineJoin`、`roundedCorners`、`opacity`、`fillOpacity`、`drawOpacity`、`zIndex`、`rotate`、`scale`、`arrow`、`arrowDetail`、`blendMode`、`shadow` 等属性。
- `IRScope`：mark layer 会落成 scope，可承载级联 `color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity`，以及 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` / `resetStyle` / `zIndex` / `clip` / `boundingShape` 等。

当前 plot channel contract 的分型是正确的：`Position` 交给 coordinate role，`Mark` 交给 mark lowering 特殊消费，`Node` / `Path` / `Scope` 直接 deliver 到 core IR 元素。但 provider 层实际只有：

| kind | 当前内置覆盖 | 主要缺口 |
| --- | --- | --- |
| `Position` | `x` / `y` / `z` / custom coordinate role | 基本完整 |
| `Mark` | `color` / `fill` / `stroke` / `label`，其中 `color` 按 mark 映射到 fill/stroke/fill | 仍承担跨元素语义，但没有统一覆盖矩阵 |
| `Node` | `size`、`shape`、`opacity`、`fillOpacity`、`drawOpacity`、`rotate`、`padding`、`minimumSize`、`minimumWidth`、`minimumHeight`、`strokeWidth`、`zIndex` | 仅 point mark 使用；未覆盖 `textColor`、dash、blendMode 等；对象属性不能表达 |
| `Path` | contract / registry / delivery loop 已存在 | 没有内置 `providers/channel/path.ts` |
| `Scope` | contract / registry / delivery loop 已存在 | 没有内置 `providers/channel/scope.ts` |

这个缺口会导致两个问题：

1. path-like mark 只能用 `color` 控 stroke / fill，不能像 point 一样把 `strokeWidth`、`opacity`、`dashPattern`、`zIndex` 等视觉属性绑定到数据字段。
2. `opacity` / `strokeWidth` / `fillOpacity` / `drawOpacity` / `zIndex` 这类 core 属性同时存在于 Node、Path、Scope，但当前 registry 是 `Map<string, AnyChannelDefinition>`，同名 channel 不能同时注册成 Node 和 Path definition。继续按 target 拆同名内置会撞注册键；改名成 `pathStrokeWidth` 又会破坏用户心智和 TikZ / GoG 词汇。

## 决策：建立 core 属性覆盖矩阵，并按“共享语义优先 Mark，专属落点保留 Node/Path/Scope”补齐

本轮不追求把 core IR 的每个字段都变成 data channel。plot channel 只覆盖满足以下条件的字段：

1. **值是稳定 scalar 或稳定小枚举**：本轮沿用 `ChannelValue = string | number`；对象、数组、boolean、函数型 runtime 能力不进本轮。
2. **不会改变数据拓扑或坐标投影**：只影响样式、绘制顺序或局部视觉，不改变 mark 行数、坐标系角色、路径 children 结构。
3. **有清楚的 mark 语义**：同一个 channel 名在 point/path/region/link/reference 上的落点必须能解释清楚；解释不清就不做内置。
4. **优先复用 core 既有属性**：新渲染能力必须先下沉到 core，plot 不自造平行 style 字段。

### 覆盖分层

| core 属性类别 | 处理 |
| --- | --- |
| 位置 / 结构字段：`position`、`children`、`transforms`、`clip`、`marks`、path step geometry、`localNamespace` | 不做 channel；仍由 coordinate / mark / scope 结构负责 |
| 身份 / provenance：`id`、`meta`、`animations` | 不做 data channel；id/provenance 由 lowering 稳定生成，animations 属 core runtime 能力 |
| 复杂对象：`PaintSpec`、`Font`、`DropShadow`、`ArrowDetail`、`IRTransform`、`IRClipSpec`、`dashPattern: number[]` | 不进本轮内置 channel；可作为常量 style / scope default，或后续“object channel value”ADR 单独设计 |
| 宿主对象：`IRNode.label` | 不做通用 channel；补齐现有 `mark.label` 表面到 core `NodeLabelSchema` 的稳定字段子集 |
| 共享标量样式：`opacity`、`fillOpacity`、`drawOpacity`、`strokeWidth`、`zIndex` | 不再视为纯 Node channel；应作为跨 mark 共享 style channel，由 mark/element delivery 根据当前 mark 落到 Node 或 Path |
| point 专属视觉变量：`size`、`shape`、`padding`、`minimumSize`、`minimumWidth`、`minimumHeight`、`rotate` | 保持 Node channel；只对 point glyph / text point 的可用子集生效 |
| path 专属视觉变量：`lineCap`、`lineJoin`、`roundedCorners`、`rotate`、`scale`、`fillRule` | 增加 Path channel provider，但只给 path-like mark 暴露；不与 point 共享 |
| scope layer 默认：`nodeDefault` / `pathDefault` 中的共享标量、layer `zIndex` | 增加 Scope channel provider，用于“整层共享默认值”，不表达逐 datum 变化 |

### Core IR 全量对账

以下表按 core schema 全量扫过；状态含义：

- `covered`：当前已有 plot 表面或 lowering 语义覆盖。
- `to add`：本 ADR 首批应补。
- `structural`：应由 plot mark / coordinate / transform / layout 结构产生，不作为 channel。
- `defer`：理论可下沉，但需要 object/array channel、专门 API 或 core 能力评审，不进本轮。
- `not plot channel`：身份、根配置、runtime 能力或 tier2 开放节点，不应进普通 data channel。

| core 元素 | 属性 | 状态 | 说明 |
| --- | --- | --- | --- |
| `Scene` | `version` / `type` / `children` | structural | plot lowering 生成根 scene，不由用户 channel 驱动 |
| `Scene` | `viewBox` | not plot channel | 视口 / layout 配置，后续走 plot frame / export option，不是 mark channel |
| `Scene` | `animations` | defer | scene-root camera animation 属动画 API，不进 channel coverage |
| `IRCoordinate` | `id` / `position` | structural | plot coordinate role / guide anchor 生成；不做 data channel |
| `IRComposite` | `namespace` / `type` / passthrough fields | not plot channel | plot 本身可作为 core composite 来源；其字段由 composite definition 校验 |
| `IRScope` | `id` / `localNamespace` / `children` / `transforms` / `clip` / `boundingShape` / `resetStyle` | structural | 分组、命名空间、裁剪和 transform 是 layer 结构能力，不作为普通 channel |
| `IRScope` | `color` / `stroke` / `fill` / `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` / `zIndex` | to add | scope-level constant/default channel；field-bound 仍走 datum Node/Path |
| `IRScope` | `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` | to add / defer | scalar 子字段可由本 ADR 上提；复杂对象子字段推迟 |
| `IRScope` | `meta` / `animations` | not plot channel / defer | provenance 由 lowering 生成；animations 走专门动画 API |
| `IRNode` | `type` / `id` / `position` / `meta` / `animations` | structural / not plot channel | type/position/provenance 由 lowering 管；animations 推迟 |
| `IRNode` | `shape` / `rotate` / `padding` / `minimumSize` / `minimumWidth` / `minimumHeight` / `zIndex` | covered | 当前 point node channel 已覆盖，`zIndex` 后续改为共享语义 |
| `IRNode` | `color` / `fill` / `stroke` / `strokeWidth` / `fillOpacity` / `drawOpacity` / `opacity` | covered / to add | point 已覆盖；共享同名字段需提升为跨 mark 语义 |
| `IRNode` | `text` / `align` / `lineHeight` / `maxTextWidth` / `textColor` / `font` | covered / to add / defer | `encoding.text` 覆盖 text；`textColor` 可补；font/layout 对象和排版字段先常量表面，数据驱动推迟 |
| `IRNode` | `label` | to add | 现有 `mark.label` 只覆盖 content/position/distance/pin boolean；需补 core `NodeLabelSchema` 稳定字段 |
| `IRNode` | `boundary` / `scale` / `xScale` / `yScale` / `outerSep` / `margin` / `innerXSep` / `innerYSep` / `cornerRadius` | defer | 可作为常量 style，但数据驱动会改变布局 / anchor，需单独评审 |
| `IRNode` | `dashPattern` / `dashed` / `dotted` / `shadow` / `blendMode` | defer | dash 是数组，shadow 是对象；blendMode 涉及合成语义 |
| `IRPath` | `type` / `id` / `children` / `meta` / `animations` | structural / not plot channel | path geometry/provenance/animation 不走 channel |
| `IRPath` | `color` / `stroke` / `fill` | covered | 由 `color` / `fill` / `stroke` mark channel 或 mark lowering paint 语义覆盖 |
| `IRPath` | `strokeWidth` / `opacity` / `fillOpacity` / `drawOpacity` / `zIndex` | to add | 与 Node 同名共享语义，不能拆双注册 |
| `IRPath` | `lineCap` / `lineJoin` / `roundedCorners` / `fillRule` / `rotate` / `scale` | to add / defer | lineCap/lineJoin/roundedCorners 首批；fillRule/rotate/scale 先常量或后续 |
| `IRPath` | `dashPattern` / `thickness` / `shadow` / `blendMode` | defer | dash 数组、shadow 对象；thickness 是语义 preset，先不做 data channel |
| `IRPath` | `arrow` / `arrowDetail` / `marks` | defer | arrowDetail / marks 是结构对象，需 arrow/mark 专门 ADR |
| `IRStep` | `kind` / `to` / `from` / control / arc / radius / points / generator params | structural | path geometry，由 plot mark 和 coordinate 决定，不是 visual channel |
| `IRStep.label` | `text` / `position` / `side` / `textColor` / `opacity` / `font` | defer | path step label 是 path-segment 宿主对象；plot datum label 先走 `IRNode.label`，step label 后续单独设计 |
| `ArrowDetail` | `shape` / `scale` / `length` / `width` / `color` / `fill` / `opacity` / `lineWidth` / `start` / `end` | defer | 可作为 path/arrow style 表面，但对象 merge 语义复杂，推迟 |
| `ClipSpec` / `AnimationTrack` / `Transform` | all fields | defer / structural | 分别走 clip、animation、scope transform 专门 API，不纳入本 ADR 的 data channel |

结论：按“理论上可下沉”看，缺口不只是 `Path` / `Scope` provider；还包括 `IRNode.label` 的稳定字段、`IRNode.textColor`、path-only enum/scalar，以及大量对象 / 数组 / 结构属性。首批不补对象/数组，是为了守住当前 `ChannelValue = string | number` 契约和 plot mark 心智模型。

### 同名共享 channel 的规则

`opacity`、`strokeWidth` 等同名属性不能分别注册为 Node / Path 两个 definition。后续实现必须二选一：

1. **将共享通道提升为 `MarkChannelDefinition`**：`resolve` 只产 resolver/default/descriptor，具体 mark lowering 决定落到 `IRNode`、`IRPath` 或 `IRScope.nodeDefault/pathDefault`。这复用现有 `color` 的模式，改动最小。
2. **新增多目标 `ElementChannelDefinition`**：一个 definition 持有 `deliverNode?` / `deliverPath?` / `deliverScope?`，registry 仍按单个 channel 名注册，resolver 同源，delivery 根据 mark lower 产物选择目标。

本 ADR 倾向 **方案 1 作为首批实现**：共享标量通道先归入 `MarkChannelDefinition`，避免扩 contract。若实现期发现 `MarkChannels.values` 让每个 mark lowering 手写分派过多，再另起 ADR 引入多目标 definition。

### 首批补齐清单

首批主要补 scalar / enum、且用户在图表中常见的属性；另补现有 label 宿主对象字段，但不把 label 作为通用 `ChannelValue`：

| channel | 适用 mark | core 落点 | 类型 / scale | legend |
| --- | --- | --- | --- | --- |
| `opacity` | point / path / region / interval / link / reference | `IRNode.opacity` 或 `IRPath.opacity`；常量可上提到 layer default | number 0..1；field 走 linear `[0.2, 1]` clamp | ramp |
| `fillOpacity` | point / region / interval / link / reference band | `IRNode.fillOpacity` 或 `IRPath.fillOpacity` | number 0..1；field 走 linear `[0.2, 1]` clamp | none |
| `drawOpacity` | point / path / reference line | `IRNode.drawOpacity` 或 `IRPath.drawOpacity` | number 0..1；field 走 linear `[0.2, 1]` clamp | none |
| `strokeWidth` | point / path / reference line | `IRNode.strokeWidth` 或 `IRPath.strokeWidth` | non-negative number；field 走 linear `[0.5, 4]` clamp | size |
| `zIndex` | point / path-like mark layer or datum path | `IRNode.zIndex` / `IRPath.zIndex` / `IRScope.zIndex` | integer number；field 直接取整 | none |
| `lineCap` | path / reference line | `IRPath.lineCap` | enum string | none |
| `lineJoin` | path / region outline / reference line | `IRPath.lineJoin` | enum string | none |
| `roundedCorners` | path / region / reference band | `IRPath.roundedCorners` | non-negative number | none |
| `label` style | point / path / region / interval positional datum labels | `IRNode.label` | object surface；`content` 仍可 field/value，`textColor` / `opacity` / `font` / `rotate` / `keepUpright` / `pin` 为常量配置 | none |
| `textColor` | point text mark | `IRNode.textColor` | string color；常量优先，field-bound 需 color scale | none |

推迟项：

- `dashPattern`：core 是 `Array<number>`，现 `ChannelValue` 不支持数组；先支持常量 mark prop，数据驱动推迟到 object/array channel ADR。
- `fill` / `stroke` 的 PaintSpec：字符串颜色已由 `color` / `fill` / `stroke` mark channel 覆盖；PaintSpec 数据驱动不做。
- `shadow` / `blendMode`：`blendMode` 是枚举但与 renderer 兼容性和 layer 合成相关，先只允许常量 / scope default；`shadow` 是对象，推迟。
- `arrowDetail` / `labelDefault`：都是结构对象或宿主关系，保持常量或后续专门 ADR。
- 数据驱动 `font`：`mark.label.font` 可作为常量对象补齐；把 font 本身做成 field-bound channel 推迟。
- `boundary` / `scale` / `xScale` / `yScale` / sep / margin 等布局相关 node 字段：理论可落到 core，但会改变 anchor、bbox 和 path attachment，需专门布局 channel ADR。

理由：

1. **同名样式应保持同名**：用户不会理解 point 用 `strokeWidth`、path 却要 `pathStrokeWidth`。共享语义应该由 mark lowering 决定落点，而不是通过命名暴露内部 target。
2. **coverage 以 core 为边界，不以当前 provider 文件为边界**：core 已有的 Node/Path/Scope scalar 样式才是 plot channel 的合法落点；plot 不新增 parallel style。
3. **先补 scalar，暂不打开对象值**：`ChannelValue = string | number` 是当前运行时契约。贸然支持 `PaintSpec` / `Font` / `DropShadow` 会把 schema、legend、scale、React/vanilla 表面一起拉大。

## 待决策点 🔻

- **共享通道的具体实现形态**：首选 `MarkChannelDefinition`；若实现导致 mark lowering 分派重复过多，再评估多目标 `ElementChannelDefinition`。
- **path-like mark 的 style 字段放置位置**：倾向和 `PointMark` 一样放 mark 顶层（如 `PathMark.strokeWidth` / `RegionMark.opacity`），而不是塞进 `encoding.channels`；`encoding.channels` 继续只承载自定义 channel。
- **constant style 是否上提到 `pathDefault` / `nodeDefault`**：倾向继续遵守现有 lowerPoint 原则，常量可上提为 scope default，field-bound 才逐 datum deliver。
- **正式多模型评审**：本 ADR 进入实现前需按 `develop-design` 补一次独立设计评审；本文件只记录当前主 AI 对代码事实的对账草案。

## DSL 表面

primitive spec 侧，path-like mark 可以和 point mark 一样声明共享 style channel：

```ts
{
  type: 'path',
  order: 'date',
  series: 'city',
  strokeWidth: { kind: 'field', value: 'traffic' },
  opacity: { kind: 'constant', value: 0.7 },
  lineCap: { kind: 'constant', value: 'round' },
  encoding: {
    x: { field: 'date' },
    y: { field: 'value' },
    color: { field: 'city' },
  },
}
```

React / vanilla 表面与既有 point style 字段对齐：

```tsx
<PathMark
  x="date"
  y="value"
  color="city"
  strokeWidth={{ field: 'traffic' }}
  opacity={0.7}
  lineCap="round"
  label={{
    content: { field: 'note' },
    textColor: '#334155',
    rotate: 'tangent',
    keepUpright: true,
  }}
/>
```

## 测试设计

`packages/graph/plot/tests/lower/channel-core-coverage.test.ts` 覆盖：

- point 与 path 共享 `strokeWidth` / `opacity` 的同名语义：同一字段写法在 point 落 Node，在 path 落 Path。
- path-like mark 的 `lineCap` / `lineJoin` / `roundedCorners` 常量下沉到 `IRPath`。
- datum `label` 补齐 `textColor` / `opacity` / `font` / `rotate` / `keepUpright` / styled `pin`，并落到 core `IRNode.label`。
- field-bound `strokeWidth` 使用 linear range，legend descriptor 与实际 resolver 同源。
- constant style 上提到 layer default，field-bound style 逐 path / node 落值。
- `encoding.channels.strokeWidth` 继续因撞内置名 fail-loud。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- **对 plot contract**：可能不改 contract（若共享通道走 `MarkChannelDefinition`）；若改为多目标 definition，则需另起或扩展本 ADR。
- **对 plot schema / API**：给 path-like mark 增加一组与 point 对齐的 scalar style fields；补齐 `MarkLabelSchema` 到 core `NodeLabelSchema` 的稳定字段子集。均属于 0.x 加性公开 API。
- **对 lowering**：mark lowering 需要统一读取共享 style channels，并在 Node / Path / Scope 默认之间选择落点。
- **对 core**：不改 core，只消费 core 既有 IRNode / IRPath / IRScope 属性。
- **对文档**：后续 develop-document 需补 plot mark style channel 表，说明 point/path 共享字段与 path-only 字段。

## 不在本 ADR 范围

- `ChannelValue` 扩到 object / array / boolean。
- 数据驱动 `PaintSpec` / `Font` / `DropShadow` / `ArrowDetail` / `AnimationTrack`。
- 新增 core 渲染能力（filter / texture / custom blend 等）。
- React `<Channel>` 声明式糖；本轮只讨论 primitive spec 与现有 mark props 对齐。

---

## 实现契约（必填）🔻

### Level

`red`

判级：新增 / 修改 mark schema 与公开 mark props，触及 `packages/graph/plot/src/schemas/mark/schema.ts` 和 adapter 表面；同时调整 channel 分派和 mark lowering。虽然不改 core IR，但这是用户可见 plot API。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMark.strokeWidth` | `PointNonnegativeNumberStyleSchema.optional()` 或抽出的 shared schema | 省略 | path stroke width: field-bound numeric channel or constant core path stroke width |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMark.opacity` | `PointOpacityStyleSchema.optional()` 或抽出的 shared schema | 省略 | whole-path opacity: field-bound opacity channel or constant 0..1 |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMark.lineCap` | field/constant enum schema | 省略 | path stroke endpoint cap style |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMark.lineJoin` | field/constant enum schema | 省略 | path stroke join style |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PathMark.roundedCorners` | non-negative field/constant numeric schema | 省略 | geometric corner radius for path joints |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `RegionMark.opacity` / `fillOpacity` / `strokeWidth` | shared scalar style schemas | 省略 | region path visual style channels |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `IntervalMark.opacity` / `fillOpacity` / `strokeWidth` | shared scalar style schemas | 省略 | interval cell visual style channels |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `ReferenceMark.opacity` / `strokeWidth` / `fillOpacity` | shared scalar style schemas | 省略 | reference line / band visual style channels |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `LinkMark.opacity` / `fillOpacity` | shared scalar style schemas | 省略 | link band visual style channels |
| `packages/graph/plot/src/schemas/mark/schema.ts` | 加 | `PointMark.textColor` | color field/constant schema | 省略 | text point color; lowered to core Node.textColor when encoding.text is set |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelSchema.textColor` | `z.string().optional()` | 省略 | datum label text color; lowered to core Node.label.textColor |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelSchema.opacity` | `z.number().min(0).max(1).optional()` | 省略 | datum label opacity 0..1 |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelSchema.font` | `FontSchema.optional()` | 省略 | datum label constant font overrides |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelSchema.rotate` | `z.union([z.enum(['none','radial','tangent']), z.number()]).optional()` | 省略 | datum label orientation around its own center |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 加 | `MarkLabelSchema.keepUpright` | `z.boolean().optional()` | 省略 | flip rotated datum label upright when needed |
| `packages/graph/plot/src/schemas/encoding/schema.ts` | 改 | `MarkLabelSchema.pin` | `z.union([z.boolean(), pin style object]).optional()` | 省略 | datum label leader line; object form carries stroke / strokeWidth / dashPattern |

字段清单是首批下限。实现期若继续增加 `drawOpacity` / `zIndex` 等字段，必须先把本表补齐。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/graph/plot/src/contract/channel.ts`（仅当选择多目标 definition 时修改；若走 MarkChannelDefinition 不改）
- `packages/graph/plot/src/providers/channel/common.ts`（修改：抽共享 scalar resolver）
- `packages/graph/plot/src/providers/channel/mark.ts`（修改：共享 style channel resolver，或保留 color/label 并新增 style helpers）
- `packages/graph/plot/src/providers/channel/path.ts`（新建：path-only enum / scalar channels）
- `packages/graph/plot/src/providers/channel/scope.ts`（新建：layer default / zIndex channel，按需）
- `packages/graph/plot/src/providers/channel/node.ts`（修改：迁出共享 `opacity` / `strokeWidth` 等，保留 point-only）
- `packages/graph/plot/src/providers/channel/registry.ts`（修改：注册 path/scope provider 或共享 mark provider）
- `packages/graph/plot/src/providers/mark/mark.ts`（修改：path-like mark 应用共享 style channels）
- `packages/graph/plot/src/schemas/mark/schema.ts`（修改：path-like mark style fields）
- `packages/graph/plot/src/schemas/encoding/schema.ts`（修改：补齐 `MarkLabelSchema` 的 core Node.label 字段）
- `packages/graph/plot/src/schemas/mark/types.ts`（如存在类型导出，按需修改）
- `packages/graph/plot/tests/lower/channel-core-coverage.test.ts`（新建）
- `packages/graph/plot-react/src/**` 与 `packages/graph/plot-vanilla/src/**`（如 mark props / builder 需要透传）
- `apps/docs/src/contents/graph/**`（develop-document 阶段补文档）

偏离白名单需回本 ADR 加条目并注解原因，或另起 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `path strokeWidth field`：PathMark 绑定连续字段，lowering 产多条 path 且 `strokeWidth` 随字段映射。
- `path opacity constant`：PathMark 常量 `opacity` 上提到 path layer default 或每条 path 等价落值。
- `region fillOpacity`：RegionMark 常量 / 字段 `fillOpacity` 落到 fillable path。
- `reference lineCap lineJoin`：ReferenceMark line 常量 enum 落到 `IRPath.lineCap` / `lineJoin`。
- `datum label style`：positional mark 的 `label` 支持 `textColor` / `rotate` / `keepUpright` 并落到 `IRNode.label`。
- `text point textColor`：`encoding.text` 的 PointMark 支持 `textColor` 并落到 `IRNode.textColor`。

**边界（≥ 2）**：

- `strokeWidth zero`：常量 0 允许，path 不抛 schema 错。
- `roundedCorners empty or short path`：没有可圆角 joint 时不崩，保持 path 有效。
- `zIndex field integer`：连续字段取整，稳定排序。

**错误路径（≥ 2）**：

- `encoding.channels.strokeWidth`：撞内置名 fail-loud，提示使用 mark 顶层字段。
- `lineCap invalid enum`：schema 拒绝。
- `label rotate invalid enum`：schema 拒绝。
- `strokeWidth categorical field`：field type 非 continuous 时 fail-loud。

**交互（≥ 2）**：

- `color + strokeWidth`：path color 分组与 strokeWidth 字段同时生效，legend descriptor 不互相污染。
- `label + color grouping`：color 分组 scope 不覆盖显式 `label.textColor`，未显式时仍跟 core fallback。
- `polar path + opacity`：polar 下 path 投影与样式 channel 同时生效。
- `point + path same channel name`：同一 spec 中 point/path 都用 `opacity`，分别落 Node/Path，无 registry collision。

### 依赖的现有元素

- `ChannelDefinitionKind` / `MarkChannels` / `defineNodeChannel` / `definePathChannel` / `defineScopeChannel`（`packages/graph/plot/src/contract/channel.ts`）——引用 / 可能小幅修改，用于共享 style channel 分派。
- `PointMarkSchema` 的 style schema helpers（`packages/graph/plot/src/schemas/mark/schema.ts`）——扩展：抽成 shared scalar style schema，供 path-like mark 复用。
- `MarkLabelSchema` / core `NodeLabelSchema`（`packages/graph/plot/src/schemas/encoding/schema.ts`、`packages/kernel/core/src/ir/node.ts`）——扩展：plot datum label 表面对齐 core label 的稳定字段子集。
- `IRNode` / `IRPath` / `IRScope`（`packages/kernel/core/src/ir/node.ts`、`packages/kernel/core/src/ir/path/path.ts`、`packages/kernel/core/src/ir/scope.ts`）——仅消费既有字段，不改 core。
- `resolveLinearScale` / `resolveSqrtScale`（`packages/graph/plot/src/providers/scale/position.ts`）——引用：共享 numeric style channel 复用现有 scale 数学。
- `resolveMarkChannels`（`packages/graph/plot/src/providers/channel/registry.ts`）——修改：注册 path/scope provider 或共享 mark provider，保持内置与自定义同机制。
