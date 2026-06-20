# ADR-10：visual channel registry —— 内置视觉通道（color / size / opacity / shape / strokeWidth…）收敛为 `defineVisualChannel` + 内部 registry；scale 管数学、channel 管约定

- 状态：Proposed
- 决策日期：2026-06-20
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [ADR-03 mark registry（内部收敛、不开放公开扩展的先例）](./03-mark-abstraction-registry.md) · [ADR-07 scale registry（本 ADR 的直接前置·收口了 scale 的 channel family，但 channel 实绘仍 = color）](./07-scale-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

> ⚠️ 草案：本 ADR 由 2026-06-20 设计讨论 + 多 LLM 评审产出。第一版（公开任意视觉通道扩展）被评审判 BLOCKING——「`channelDefinitions` 暴露自定义通道，但 encoding/mark schema 是闭合具名通道集（`EncodingSchema` / `PointMarkSchema` 无任意 channel 承载位），注册的 `blur` 通道没有任何 mark IR 能绑定」，且「Level / 无 schema 改动判定依赖此未决边界」。本版按评审建议**收紧目标**，见下「范围裁定」。

## 范围裁定（先定，贯穿全文）

评审开放问题：本 ADR 是「内置 channel 共用 registry」还是「公开任意视觉通道扩展」？**裁定为前者**：

- **做**：把内置视觉通道（color / size / opacity / shape / strokeWidth，及 `MarkChannels` 里的 NumberStyle 兄弟项）从 `providers/scale/channel.ts` 的 hardcode `makeXxxResolver` 收敛为 `VisualChannelDefinition` + **内部** registry。照 [ADR-03 mark](./03-mark-abstraction-registry.md)「内部收敛、不开放公开扩展」的先例——内置降为注册项，但**不暴露公开 `defineVisualChannel` 注入口**。
- **不做（单列后续 ADR）**：公开 `options.visualChannelDefinitions`、全新视觉通道（blur / texture…）的 IR encoding passthrough（`EncodingSchema` 加任意 channel map）+ mark 消费 + legend channel schema、React 声明式糖。这些一旦纳入即触 `ir/**` 下沉契约、升 red。

这样判级稳定：**仅内部 registry 化内置通道 → 不加新 channel、不开放扩展 → 无 IR schema 改动 → Level `yellow` 成立**（与评审第 2 条 BLOCKING 对齐）。

## 名词分层（先立后用，明确两个易混 channel）

| 名称 | 含义 | 形态 | 位置 |
| --- | --- | --- | --- |
| **`ChannelScaleDefinition`**（既有，ADR-07） | scale 的 **channel family**——「产视觉量的 scale」（ordinal / sequential / …） | `{ family:'channel', schema, resolve }` | `contract/scale.ts` |
| **`VisualChannelDefinition`**（本 ADR 新增） | **视觉通道本身**——color / size / opacity / shape…，HAS 一个 scale | `{ channel, output, defaultScaleType, legend, resolve }` | `contract/channel.ts` |

> 评审第 4 条 WARNING：`ChannelScaleDefinition`（scale 的 channel 族）与新增的 channel 概念名字太近。故新类型定名 **`VisualChannelDefinition`**（不叫 `ChannelDefinition`），并落在已有的 `contract/channel.ts`（mark 通道运行时契约的家，承 `MarkChannels` / `SizeOf` / `ShapeOf`…），与 `contract/scale.ts` 的 `ChannelScaleDefinition` 物理分开。一句话边界：**「scale 的 channel family」是某些 scale 的归类；「visual channel」是 color/size/… 这些编码轴本身，它挑一个 scale 来用。**

核心纠正：**一个视觉通道 HAS 一个 scale，不 IS 一个 scale**。`size` ＝ `sqrt` scale + 半径输出空间；`opacity` ＝ `linear` + `[0.2,1]`；`shape` ＝ `ordinal` + glyph 调色板。不为每个通道造「size scale / shape scale」type。

## 背景

ADR-07 把 scale 收敛成 position / channel 两族 registry，但 **channel 族的实绘只有 color 真进了 registry**：

- registry 化的 channel-family scale：`ordinal` / `sequential` / `diverging` / `quantize` / `threshold` / `quantile` —— 全产**颜色串**（`ChannelScaleResolution.of: (value) => string | undefined`，`contract/scale.ts`）。
- 没进 registry、hardcode 在 `providers/scale/channel.ts` 的其余视觉通道（`makeSizeResolver` / `makeNumericStyleResolver` / `makeOpacityResolver` / `makeStrokeWidthResolver` / `makeShapeResolver`）：
  - `size`：写死 `sqrt`、`[SIZE_MIN_RADIUS=2, SIZE_MAX_RADIUS=20]` px、仅 PointMark、**只接受 `sqrt` scale 引用**、负值 fail-loud。
  - `opacity` / `strokeWidth`：写死 `linear` + `[0.2,1]` / `[0.5,4]` clamp。
  - `shape`：categorical 循环 `PLOT_SHAPE_PALETTE = ['circle','rectangle','diamond']`。

`MarkChannels`（`contract/channel.ts`）列出的视觉通道远不止这几个（color / size / opacity / shape / stroke / strokeWidth / fillOpacity / drawOpacity / rotate / padding / zIndex / label…），它们的解析全是平行 hardcode。

两个结构问题（与 ADR-07 收口 scale 前同构）：

- **内置享私有 hardcode 分派，与仓库注册范式不一致（违反 AGENTS.md「内置与自定义同机制」）。** color 走 `ChannelScaleDefinition` registry；size/opacity/shape/strokeWidth 走另一套 `makeXxxResolver` switch，「加 / 调一个视觉通道要手改多个 `makeXxx` 函数 + legend 特判」。
- **数学早已复用、被 hardcode 的只是约定。** `makeSizeResolver` 内部直接调 `resolveSqrtScale`、`makeNumericStyleResolver` 直接调 `resolveLinearScale`（位置 scale 的 builder）。即数值通道本质 = 连续 scale + 通道专属 range；被焊死的是「这是什么视觉量 + 默认 scale + 输出范围 + 字段规则 + legend 形态」这张表。

GoG / 同类库都把「位置 vs 非位置(retinal)通道」当一等区分（Bertin 视觉变量 → Wilkinson aesthetics → Vega-Lite 显式分 Position Channels vs Mark Property Channels）。retikz 的 `family:'position'|'channel'` 与之同构，但 channel 实绘现仅 color，名不副实。本 ADR 把内置视觉通道收进同一 definition/registry 机制——**机制就位、内置不再享私有白名单**；开放给用户注册新通道留后续（需先有 IR 绑定位）。

## 决策

### (1) `VisualChannelDefinition`（落 `contract/channel.ts`）

```ts
/** 视觉通道的输出空间（判别 union——杜绝 number 通道配 symbol 调色板这类非法组合）。 */
type ChannelOutputSpace =
  | { outputKind: 'color' }                                                    // 颜色串；范围来自所选色阶
  | { outputKind: 'number'; range: readonly [number, number]; clamp?: boolean } // 半径 / alpha / 宽度
  | { outputKind: 'symbol'; palette: ReadonlyArray<string> };                  // glyph 名调色板

/** 视觉通道定义（运行时对象，不进 IR；内置收敛用，暂不公开注入）。 */
type VisualChannelDefinition = {
  channel: string;                                              // 'color'|'size'|'opacity'|'shape'|'strokeWidth'|...
  output: ChannelOutputSpace;                                   // 输出空间 + 默认范围 / 调色板（判别 union）
  defaultScaleType: (fieldType: PlotFieldTypeValue | undefined) => string; // 缺省选型：size→sqrt、opacity/strokeWidth→linear、color→sequential/ordinal、shape→ordinal
  acceptsScale: (scaleType: string) => boolean;                // 能绑哪些 scale：size→连续数值、shape→ordinal、color→色阶
  isFieldCompatible: (fieldType: PlotFieldTypeValue | undefined) => boolean; // size→continuous 且非负、shape→categorical
  legend: 'swatch' | 'ramp' | 'size' | 'symbol';               // legend 形态（受 outputKind 约束：number→ramp/size、symbol→symbol、color→ramp/swatch）
  resolve: (ctx: VisualChannelContext) => ChannelResolution;   // 挑 scale → 委托 scale registry 解析 → 投到本通道输出空间
};

const defineVisualChannel = (def: VisualChannelDefinition): VisualChannelDefinition => def;
```

`output` 是**判别 union**（评审第 5 条 WARNING：`defaultRange` / `outputKind` / `legend` 不能停在待决策——接口草案已依赖三者组合）。`outputKind` 判别 `range`（number）/ `palette`（symbol）/ 无（color），实现期 TS 即拦 `number + palette` 这类非法组合；`legend` 取值由 `outputKind` 约束。

### (2) `ChannelScaleResolution.of` 输出泛化（`contract/scale.ts` 唯一改动）

`of: (value) => string | undefined` → `ScalarValue`（`string | number`）。`domain` / `range` 本就是 `ReadonlyArray<ScalarValue>`，仅 `of` 卡颜色。color/shape 返回 string，size/opacity/strokeWidth 返回 number。这是 lowering 内部 contract、非 zod IR schema，不构成 IR schema 改动。

### (3) 内置视觉通道降为 `VisualChannelDefinition` + 内部 registry

`providers/scale/channel.ts` 的 `makeSizeResolver` / `makeOpacityResolver` / `makeStrokeWidthResolver` / `makeShapeResolver` 删除，逻辑搬进各 `defineVisualChannel(...)`；新增内部 `VISUAL_CHANNELS` registry + `resolveVisualChannel(channel, ctx)` 分派（不导出公开注入口）。各通道写死的边界（size 负值 fail-loud / 单正值取上界 / 空集退化最小半径；opacity/strokeWidth clamp）随之进 definition。

### (4) `ordinal` 调色板泛型化

`resolveOrdinalScale`（`providers/scale/color.ts`）现返回「category → 颜色串」，焊死颜色。改为「category → 任意离散输出串」，调色板由调用通道给（color 给颜色、shape 给 glyph 名）→ `shape` 复用 `ordinal` 数学，不单造 scale。

### (5) legend 按 `VisualChannelDefinition.legend` 分派

`expand.ts` 的 color/size legend 特判收敛为「按 channel def 的 legend 形态选渲染器」：swatch / ramp / size-bubble / symbol-glyph，数据全来自 `ChannelResolution` + channel def。删 `resolveSqrtForLegend` 等 size 特判。

理由：

1. **补齐 AGENTS.md「内置与自定义同机制」**：内置视觉通道与（未来）自定义通道走同一 `VisualChannelDefinition` 机制，内置不再享私有 hardcode 分派；照 ADR-03 先例先内部收敛。
2. **scale 与 visual channel 正交解耦**：scale 管 domain→归一化（通道无关、可跨通道复用），channel 管输出空间 + 约定 + legend。对齐 Vega-Lite「channel HAS scale」。
3. **零新增 scale type、零 IR 改动**：数值通道复用连续 scale builder、shape 复用 ordinal；仅内部 registry + contract 泛化，不触 IR schema、不加公开 API。

## 待决策点 🔻

> `output` / `outputKind` / `legend` 已从待决策提升为「决策」(判别 union)，不再列此。

- **`acceptsScale` 收紧程度**：size 现仅收 `sqrt`。放宽到「任意连续数值 scale（linear/log/pow/symlog/radial）」更通用、但要补 legend 适配。倾向放宽到连续数值族，默认仍 `sqrt`。
- **NumberStyle 兄弟项的收敛范围**：本轮先收 headline 5（color/size/opacity/shape/strokeWidth），还是连 `MarkChannels` 的 rotate / padding / zIndex / fillOpacity / drawOpacity 一并 registry 化？倾向先 5 个、其余沿用 `makeNumericStyleResolver` 共享基型，按需逐个迁。
- **融合 vs 彻底解耦**：色阶现「融合」（scale 自产最终颜色）。倾向本 ADR 走增量/融合（channel 层只提约定），「scale 产 t∈[0,1]、所有通道含 color 统一 t→输出」的彻底解耦挪「不在范围」。

## DSL 表面

内置通道用法**不变**（本 ADR 是内部收敛，无新表面）：

```tsx
<PointMark x="gdp" y="life" size="pop" opacity="confidence" shape="region" color="continent" />
```

价值在「加 / 调一个内置视觉通道」从「改多个 `makeXxx` + legend 特判」变成「写 / 改一个 `defineVisualChannel`」。用户可注册新视觉通道的公开表面留后续 ADR（需先有 IR 绑定位）。

## 测试设计

`packages/plot/plot/tests/lower/visual-channel-*.test.ts`（仅内置通道）：

- **Happy path**：size 经 sqrt 映射半径（面积感知）；opacity 经 linear 映射 [0.2,1]；shape 经 ordinal 循环 glyph；color 仍按字段派生 sequential/ordinal。
- **边界**：size 全 0 / 空集退化最小半径；单正值取上界；opacity/strokeWidth clamp 越界；ordinal 调色板用尽循环。
- **错误路径**：size 负值 fail-loud；shape 绑 continuous 字段 fail-loud；通道绑不兼容 scale type fail-loud。
- **交互**：size + color 同图各自 legend 形态正确（size-bubble vs swatch/ramp）；polar × size；shape × legend symbol。

> 无「自定义通道」用例（已划出范围）——评审第 1 条 BLOCKING：注册的自定义 channel 无 mark IR 可绑，测不出有效行为。

## 影响

- **`contract/channel.ts`**：新增 `VisualChannelDefinition` / `ChannelOutputSpace` / `defineVisualChannel`；把现位于 `providers/scale/channel.ts` 的 `ChannelResolution` / `ScaleDescriptor` 类型上移至此（属运行时契约，且避免 contract 反依赖 providers）。
- **`contract/scale.ts`**：`ChannelScaleResolution.of` 放宽 `string → ScalarValue`（唯一改动）。
- **`providers/scale/channel.ts`**：`makeXxxResolver` → `defineVisualChannel(...)` + 内部 `VISUAL_CHANNELS` registry + `resolveVisualChannel`。
- **`providers/scale/color.ts`**：`resolveOrdinalScale` 调色板泛型化。
- **`providers/scale/registry.ts` / `index.ts`**：internal barrel 重导出 visual-channel 解析（仅内部，不进 `src/index.ts`）。
- **`pipeline/expand.ts`**：通道解析改 registry 分派；legend 按 channel def 形态分派，删 size 特判。
- **对外 API**：无新增（不暴露 `visualChannelDefinitions`、不动 React）。内置通道行为不变（size [2,20]、opacity [0.2,1] 等默认保持），无 breaking。
- **IR / core**：无 IR schema 改动、无 core 依赖。
- **文档站**：`scale/color`、`scale/position` 外，size/opacity/shape 等视觉通道说明随实现统一（属内部，文档非强制本轮改）。

## 不在本 ADR 范围（评审 BLOCKING 的处置——单列后续 ADR，属 red）

- **公开 `defineVisualChannel` + `options.visualChannelDefinitions` + `<Plot visualChannelDefinitions>`**：让用户注册 / 覆盖视觉通道。
- **全新视觉通道（blur / texture…）的 IR encoding passthrough**：`EncodingSchema` / mark schema 现为闭合具名通道集（`StyleEncodingSchema` 仅 color、size/shape/opacity/strokeWidth 是各 mark 的具名字段、无任意 channel 承载位）。开放新通道需 encoding 加 `channels: Record<string, MarkValueType>` 透传 + mark 下沉消费 + legend channel schema——触 `ir/**`、升 red。
- **彻底解耦（scale → t / index，所有通道含 color 统一 t→输出）**：让 `quantize` / `sequential` 驱动 size/opacity ramp 等跨通道复用。
- **React `<Channel>` / 扁平 config 糖**：与 ADR-07 staged 的 `<Scale type={custom}>` 同性质。

---

## 实现契约（必填）🔻

> 前瞻施工指令，仅 Proposed → 实现窗口内有效；发布前折成指针，最终以代码 + 测试为真源。

### Level

`yellow`

判级：动 `packages/plot/plot/src/contract/{channel,scale}.ts`（运行时契约，非 zod IR schema）+ `providers/scale/{channel,color,registry,index}.ts` + `pipeline/expand.ts`（legend 分派）；**不触 `ir/**` 下沉契约、不加公开 API（不动 `src/index.ts` / React）**。一旦纳入「公开扩展 / 全新通道 IR passthrough」（已划出范围）→ 升 `red`、属后续 ADR。范围裁定保证本判级稳定（评审第 2 条 BLOCKING 的处置）。

### Schema 改动

**无 IR schema 改动。** 本 ADR 仅内部 registry 化内置视觉通道：不加新 channel、不开放扩展、不动 `EncodingSchema` / mark schema。`ChannelScaleResolution.of` 是 lowering 内部 contract（非 zod IR），其 `string → ScalarValue` 放宽不入此表。

### 文件 scope

- `packages/plot/plot/src/contract/channel.ts`（修改：新增 `VisualChannelDefinition` / `ChannelOutputSpace` / `defineVisualChannel`；上移 `ChannelResolution` / `ScaleDescriptor`）
- `packages/plot/plot/src/contract/scale.ts`（修改：`ChannelScaleResolution.of` 放宽）
- `packages/plot/plot/src/providers/scale/channel.ts`（重写：`makeXxxResolver` → visual channel definitions + 内部 registry + `resolveVisualChannel`）
- `packages/plot/plot/src/providers/scale/color.ts`（修改：`resolveOrdinalScale` 调色板泛型化）
- `packages/plot/plot/src/providers/scale/registry.ts`、`providers/scale/index.ts`（修改：internal 组装 / 重导出）
- `packages/plot/plot/src/pipeline/expand.ts`（修改：通道解析 + legend 按 channel def 形态分派）
- `packages/plot/plot/tests/lower/visual-channel-*.test.ts`（新建）

**不在 scope（与范围裁定一致）**：`packages/plot/plot/src/index.ts`（无公开 API 新增）、`packages/plot/plot/src/schemas/{encoding,mark}.ts`（无 IR 改动）、`packages/plot/react/**`（无 React 表面）。偏离白名单需回本段加条目并注解，或开新 ADR。

### 测试象限

见上「测试设计」（仅内置通道；无自定义通道用例）。Spec Writer 按四象限展开，至少覆盖 size/opacity/shape/color 各 happy + 各 1 边界 + size 负值 / shape×continuous 两条 fail-loud + size×color legend 形态交互。

### 依赖的现有元素

- `ChannelScaleDefinition` / `resolveChannelScale` / `ChannelScaleResolution` / `ChannelResolveContext`（`contract/scale.ts` + `providers/scale/registry.ts`）—— 扩展：`of` 放宽；visual channel 经其解析所选 channel-family scale（color）或位置 scale builder（数值通道）。
- `resolveLinearScale` / `resolveSqrtScale`（`providers/scale/position.ts`）—— 引用：数值通道复用其连续 scale 数学。
- `resolveOrdinalScale`（`providers/scale/color.ts`）—— 修改：调色板泛型化供 color + shape 共用。
- `MarkChannels` / `SizeOf` / `NumberStyleOf` / `ShapeOf` / `ColorOf`（`contract/channel.ts`）—— 引用：`VisualChannelDefinition.resolve` 产出与之对齐的逐行解析器。
- `ScaleDescriptor` / legend form（`providers/scale/channel.ts` → 上移 `contract/channel.ts`；`features/guide`）—— 修改：descriptor 改由 channel def 提供，legend 形态枚举扩 `size` / `symbol`。
- 无 core 依赖（不消费 core 新能力、不改 core 内部）。
