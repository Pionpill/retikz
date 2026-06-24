# ADR-11：开放自定义视觉通道 —— 公开 `defineVisualChannel` + `options.visualChannelDefinitions` + 加性 `encoding.channels` 绑定位；自定义通道经通用 delivery 落到 core node 属性

- 状态：Accepted（实现 2026-06-21；随评审收敛为内置 / 自定义共享 visual channel registry + delivery；测试见实现记录）
- 决策日期：2026-06-21
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-10 visual channel registry（内部收敛、本 ADR 的直接前置）](./10-channel-registry.md) · [ADR-08 mark custom registry（IR passthrough 范式样板）](./08-mark-custom-registry.md) · [plot-design.md §8.3](../../../../../architecture/plot-design.md)

> 承接 ADR-10：ADR-10 把内置视觉通道（size/opacity/shape/strokeWidth）收敛为内部 `VisualChannelDefinition` registry，但**不开放公开扩展**、且因 encoding/MarkChannels 是闭合具名集而无法绑定全新通道。本 ADR 开放：用户能**注册 + 绑定 + 落地**一个自定义视觉通道。

## 范围裁定（先定）

调查 `lowerPoint`（交付侧）后确认：**自定义视觉通道不能走第二条补丁路径**。本 ADR 的最终范围是公开注册、IR 绑定位、以及内置 / 自定义共享的通用 delivery。

- **built-in 与自定义共享同一 registry。** 内置 definition 先注册，自定义 definition 再合并；撞内置名 / 互撞 fail-loud。`expand.ts` 不再逐个点名 `sizeOf` / `opacityOf`，也不再单列 `custom`。
- **delivery 也是同一结构。** `VisualChannelDefinition.deliver` 是必填；内置和自定义都解析为 `ChannelDelivery[]`，`lowerPoint` 统一按顺序逐项落到 core `IRNode`。内置仍可在 `deliver` 内表达具体语义（如 `size` 写 `minimumSize * sqrt(2)`、text glyph 跳过 shape/strokeWidth），但机制不分贵贱。
- **color / label 的特殊性留在 mark 实现中，不进入 contract 类型。** `color` 仍因 scope 分组需要被 mark 特殊消费，`label` 仍是 host label；二者通过 `MarkChannels.values['color'|'label']` 读取，而不是在 `contract` 里内置 `ColorOf` / `LabelOf` 类型。

**自定义通道落点边界**：自定义视觉通道的 `deliver` 只能落到 **core IRNode 已有的样式属性**（opacity / rotate / fill / stroke / strokeWidth / fillOpacity / …）或 color 通道——即「自定义字段 + 自定义 scale/range → 既有 node 属性」。需要 core 没有的全新渲染能力（如真·blur 滤镜）属 core Tier-1 缺口，按「缺能力下沉补 core」处理，不在 plot、不在本 ADR。

## 实现状态（2026-06-21）

落地与设计一致（公开 `defineVisualChannel` + `options.visualChannelDefinitions` + `<Plot visualChannelDefinitions>` + 加性 `encoding.channels` + 统一 `deliver`；撞内置 / 互撞 / 缺 deliver fail-loud），**实现期修订**：

1. **`encoding.channels` 落 `PointEncodingSchema`、非 `StyleEncodingSchema`。** 决策 (3) 原写 StyleEncoding，但 `PointMarkSchema.encoding` 用的是 `PointEncodingSchema = PositionEncodingSchema.extend({text})`，**不含** StyleEncoding——放 StyleEncoding 会被 parse 静默 strip（实现时被 round-trip 测试当场抓到）。当前 visual channel delivery 只对 point 系消费（`resolveVisualChannelDeliveries` 守 `mark.type === Point`），落 PointEncodingSchema 正确且足够。
2. **registry / options 用擦除宽类型 `AnyVisualChannelDefinition`（deliver 入参 `never`），交付边界 `as never` 还原。** `VisualChannelDefinition<number>` 因 `deliver` 的 value 逆变**不可**赋给 `VisualChannelDefinition<VisualChannelValue>`；异构 definition 进同一 registry / options 数组必须擦除（与 `AnyScaleDefinition.resolve` 用 `never` 同范式）。内置与自定义最终同在 `Map<string, AnyVisualChannelDefinition>`。
3. **`deliver` 改为必填，缺 deliver 只作为运行时防线测试。** 公开 `defineVisualChannel` 在类型层要求 definition 说明落点；registry 仍对宽类型输入做缺失检查，防外部 JS / 非类型调用。
4. **自定义通道的 legend 未做（决策 (5) 部分推迟）。** `LegendChannel` schema 仍是闭集（color/size/opacity/shape）。def 的 `resolve` 可产 descriptor，但 legend channel schema 放宽 string + 收集自定义 descriptor 留后续小迭代。

实现文件：`contract/channel.ts`（通用 `ChannelValueResolver` / `ChannelDelivery` / `MarkChannels.values/defaults/deliveries` / `AnyVisualChannelDefinition`）· `schemas/encoding.ts`（`PointEncodingSchema.channels`）· `providers/scale/channel.ts`（`resolveVisualChannelRegistry` / `resolveVisualChannelDeliveries` / `BUILTIN_VISUAL_CHANNEL_NAMES`）· `pipeline/expand.ts`（options + 统一 delivery）· `providers/mark/mark.ts`（lowerPoint 遍历 deliveries）· `src/index.ts`（导出）· `packages/graph/plot-react/src/Plot.tsx`（透传）。测试 `tests/lower/custom-visual-channel.test.ts`。

## 决策

### (1) 公开 `defineVisualChannel` + `options.visualChannelDefinitions`

`defineVisualChannel` / `VisualChannelDefinition`（ADR-10 已落 `contract/channel.ts`）从 `src/index.ts` 公开导出（对齐 `defineScale` / `defineCoordinate` / `defineTransform` / `defineMark`）。注入口 `options.visualChannelDefinitions`（`lowerPlots` options + `<Plot visualChannelDefinitions>` + `renderPlot` options），与内置合并成 registry：自定义 `channel` 撞内置（size/opacity/shape/strokeWidth + color）→ fail-loud，两个自定义同名 → fail-loud。

### (2) `VisualChannelDefinition` 补 `deliver`（自定义通道交付契约）

```ts
type VisualChannelDefinition<T extends ScalarValue = ScalarValue> = {
  channel: string;
  output: ChannelOutputSpace;
  legend?: 'swatch' | 'ramp' | 'size' | 'symbol';
  resolve: (ctx: VisualChannelContext) => (mark: Mark) => ChannelResolution<T> | undefined;
  /** 把逐行解析值落到 core IRNode 的既有样式属性。 */
  deliver: (node: IRNode, value: T, context: ChannelDeliveryContext) => void;
};
```

- 内置和自定义定义都必须给 `deliver`。内置具体语义（size 覆盖 minimumSize、shape 只作用 glyph、strokeWidth 不作用 text glyph）写在各自 definition 的 `deliver` 内。

### (3) 加性 `encoding.channels` 绑定位（IR 非破坏）

`StyleEncodingSchema` 加**可选** `channels: z.record(z.string(), ChannelSchema)`：键 = 自定义通道名、值 = 既有 `Channel`（`{field}` / `{value}`）绑定。内置通道仍走各自具名 props（`PointMark.size` 等），**不迁移**——加性、不破坏现有 IR / spec。自定义通道键撞内置通道名 → lowering fail-loud。

```ts
// 自定义「intensity」通道：把 score 字段经自定义 scale 映射到 node.opacity
<Plot
  visualChannelDefinitions={[defineVisualChannel({
    channel: 'intensity', output: { outputKind: 'number', range: [0.3, 1] }, legend: 'ramp',
    resolve: ctx => /* 读 encoding.channels.intensity、过 linear scale */,
    deliver: (node, v) => { node.opacity = v; },
  })]}
  spec={{ /* ... marks: [{ type:'point', encoding:{ x, y, channels:{ intensity:{ field:'score' } } } }] */ }}
/>
```

### (4) 自定义通道解析 + 通用 delivery

- `expand.ts`：对 registry 中每个 visual channel definition 建 `def.resolve(ctx)` 逐 mark 解析器；收集为 `MarkChannels.deliveries?: ChannelDelivery[]`（值 + 落地函数同源）。内置和自定义同路。
- `lowerPoint`：遍历 `channels.deliveries`，`value = of(row); if (value !== undefined) deliver(node, value, context)`。内置 definition 先注册、自定义 definition 后注册，因此自定义仍可覆盖既有 node 属性。

### (5) legend 开放

自定义通道 def 给 `legend` 形态 + resolve 产 descriptor → 复用 ADR-10 的 legend descriptor 通路（descriptor.channel 放宽接纳自定义通道名；legend guide channel schema 放宽为 string）。无 descriptor 的自定义通道不进 legend。

理由：

1. **补齐 AGENTS.md「内置与自定义同机制」最后一环**：视觉通道与 scale/coordinate/transform/mark 一样可公开注册，并且内置 / 自定义共用同一 registry 与 delivery。
2. **加性、非破坏**：`encoding.channels` 可选、内置 props 不迁移；现有 spec / IR / 测试零改。
3. **delivery 分层正确**：具体落点语义保留在 definition.deliver 内，公共管线只负责解析、排序、调用，不再把 custom 放进二等补丁数组。

## 待决策点 🔻

- **自定义通道 `deliver` 的落点白名单**：是否限制只能写 core IRNode 的「样式」子集（禁写 position / shape 几何，避免自定义通道破坏布局）？倾向：给一个「允许的 node 样式键」集合，`deliver` 越界 → fail-loud；或先信任 def 作者、文档约束。
- **自定义通道是否参与 PointMark 之外的 mark**：当前 built-in size/shape 仅 PointMark。自定义通道 deliver 落 node 属性 → 也只对产 node 的 mark（point/interval cell）有意义。倾向：先限 point，path/region（path 级）不应用。
- **encoding.channels 放 EncodingSchema（共享）还是 PointMark 专属**：倾向放 `StyleEncodingSchema`（与 color 同层），但只对 point 系 mark 消费。

## DSL 表面

见决策 (3) 示例。React 声明式糖（`<Channel name="intensity" field="score" />` 或 `<PointMark intensity="score" />`）属后续；本轮程序化路径（`visualChannelDefinitions` + `encoding.channels`）先行（与 ADR-07/08 staged React 糖同节奏）。

## 测试设计

`packages/graph/plot/tests/lower/custom-visual-channel-*.test.ts`：

- **Happy path**：注册 intensity（→opacity）+ encoding.channels 绑字段 → 逐 node opacity 随字段；自定义 symbol 通道（→既有离散属性）；多个自定义通道共存。
- **边界**：encoding.channels 缺该键 → 不应用（node 用默认）；常量绑定 → 直落；空数据。
- **错误路径**：自定义 channel 撞内置名 → fail-loud；两自定义同名 → fail-loud；def 缺 `deliver` → fail-loud；encoding.channels 键无对应注册 def → fail-loud。
- **交互**：自定义通道 + 内置 size/color 同图各自生效 + legend；自定义通道 × polar；JSON round-trip（encoding.channels 进 IR 不丢）。

## 影响

- **IR schema**：`PointEncodingSchema` 加可选 `channels`（加性、非破坏）。**唯一 IR 改动**。
- **`contract/channel.ts`**：`VisualChannelDefinition` 加必填 `deliver`；`MarkChannels` 改为通用 `values/defaults/deliveries`。
- **`providers/scale/channel.ts` / `registry.ts`**：visual channel registry 接受 custom 合并 + 撞名 fail-loud，并统一生成 deliveries。
- **`pipeline/expand.ts`**：visual channel registry 解析 + 收进 `MarkChannels.deliveries`；options 透传。
- **`providers/mark/mark.ts`（lowerPoint）**：遍历通用 deliveries。
- **`features/guide`（legend）+ `schemas/guide.ts`**：legend channel 放宽 string 接自定义。
- **公开 API**：`src/index.ts` 导出 `defineVisualChannel` / 类型；options 加 `visualChannelDefinitions`；React `<Plot>` prop。
- **core**：无（自定义通道只落 core 既有 node 属性；新渲染能力另走 core）。

## 不在本 ADR 范围

- **把 custom 做成单独 `MarkChannels.custom` 补丁路径**——已被评审否决，会让自定义通道成为二等公民。
- **自定义通道落 core 没有的新渲染能力**（真 blur / texture）——core Tier-1 缺口，下沉补 core。
- **React 声明式糖**（`<Channel>` / 扁平 prop）——程序化先行。
- **彻底解耦（scale→t、跨通道复用色阶驱动 size）**——承 ADR-10，仍另列。

---

## 实现契约（必填）🔻

### Level

`red`（动 `schemas/encoding.ts` IR + `src/index.ts` 公开 API）。加性、非破坏，但触 IR 下沉 surface + 公开扩展点，按判级规则取 red。

### Schema 改动

| 文件 | 操作 | 字段 | 类型 | 默认 | describe |
|---|---|---|---|---|---|
| `schemas/encoding.ts` `StyleEncodingSchema` | 加 | `channels` | `z.record(z.string(), ChannelSchema).optional()` | `—`（省略） | Custom non-positional visual channel bindings: map of registered custom channel name → field/constant binding; resolved by a VisualChannelDefinition supplied via options.visualChannelDefinitions |

### 文件 scope

`contract/channel.ts`（`deliver` + `MarkChannels.values/defaults/deliveries`）· `schemas/encoding.ts`（`channels`）· `providers/scale/channel.ts` + `providers/scale/registry.ts`（custom 合并 / 撞名守卫 / `resolveVisualChannelDeliveries`）· `providers/scale/index.ts` · `pipeline/expand.ts`（解析 + options 透传）· `providers/mark/mark.ts`（lowerPoint deliveries）· `schemas/guide.ts` + `features/guide/*`（legend channel 放宽）· `src/index.ts`（导出 `defineVisualChannel`）· `packages/graph/plot-react/src/components/{build-plot-spec,Plot}.ts`（`visualChannelDefinitions` 透传）· `packages/graph/plot/tests/lower/custom-visual-channel-*.test.ts`（新建）。

### 测试象限

见上「测试设计」：≥3 happy（intensity→opacity / symbol / 多通道）· ≥2 边界（缺键 / 常量）· ≥2 错误（撞内置 / 缺 deliver / 未注册键）· ≥2 交互（+内置 / round-trip）。

### 依赖的现有元素

- `VisualChannelDefinition` / visual channel registry（`contract/channel.ts` + `providers/scale/channel.ts`，ADR-10）—— 扩展 `deliver` + custom 合并。
- `ChannelSchema`（`schemas/encoding.ts`）—— 复用作 `channels` map 的值类型。
- `MarkChannels` / `lowerPoint`（`contract/channel.ts` + `providers/mark/mark.ts`）—— 通用 values/defaults/deliveries + 交付循环。
- options 注入范式（`scaleDefinitions` / `coordinates` / `transformDefinitions` / `markDefinitions`）—— 照搬 `visualChannelDefinitions`。
- 无 core 依赖。
