# ADR-04：opacity 通道（仅 PointMark）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot-design §3.3 Aesthetics](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 通道→scale resolver](./02-channel-scale-resolver-size.md)（opacity 复用其 resolver + PointEncoding）

## 背景

[alpha.6 ADR](../v0.1-alpha.6/roadmap.md) 拆 `StyleEncodingSchema` 时注释「opacity / size / shape later」。alpha.7 已补 `size`（[ADR-02](./02-channel-scale-resolver-size.md)，PointMark 专属 encoding）+ 通用「通道→scale」resolver。本轮范围调整（把原 alpha.8 的 opacity / shape 前移，见 roadmap），`opacity` 作为 resolver 的又一消费者落地。

core node 已支持不透明度（`opacity` 整节点 0..1 / `fillOpacity` 仅填充），plot 直接消费、不改 core。

## 决策：opacity 作为 PointMark 专属连续通道，continuous 字段经 linear scale 映射到 [minOpacity, 1]

`PointEncodingSchema` 追加 `opacity` channel（与 `size` 同住 PointMark 专属 encoding，**不进全局 StyleEncoding**——与 ⑤ 一致，bar/area/line/sector 的 opacity 顺延）。

```ts
// ir/encoding.ts —— opacity channel（value ∈ [0,1]）
export const OpacityChannelSchema = z.object({
  field: z.string().min(1).optional().describe('Data path bound to opacity; continuous, mapped through a linear scale to [minOpacity, 1]'),
  value: z.number().min(0).max(1).optional().describe('Constant opacity 0..1, bypassing the scale (mutually exclusive with field)'),
  scale: z.string().min(1).optional().describe('Optional linear-scale name (only with field); omitted → a default opacity scale is synthesized'),
}).refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'opacity channel must set exactly one of field / value' })
  .describe('Opacity channel (PointMark only): field → glyph opacity via a linear scale; value → a constant opacity that bypasses the scale');
// PointEncodingSchema 扩成 { ...Encoding, size?, opacity? }（shape 见 ADR-05）
```

- **field（continuous）**：经 ADR-02 resolver 合成 `linear` scale，domain = 数据 extent，range `[OPACITY_MIN, 1]`（默认下界，避免最小值全透明不可见）。continuous only——categorical opacity 无意义、顺延；temporal fail-loud。
- **value**：常量 ∈ `[0,1]`，绕过 scale。
- **取值范围（拍死，评审 P1）**：opacity field 是**连续强度通道**，合成的 linear scale **开 `clamp`**——任意字段值（含负数 / 显式 domain 外的值）都 **clamp 到 `[OPACITY_MIN, 1]`，不 fail-loud**。这与 size 的「负值 fail-loud」**有意不同**：size 有面积语义、负半径无意义；opacity 无此约束，负强度 clamp 到最淡即可。唯一的硬边界是 `value` 常量由 schema 限 `[0,1]`；temporal 字段仍 fail-loud（opacity 是连续编码）。
- **lowering**：per-datum 写 core node 的不透明度字段；与 size 同理，per-datum 值**落到每个 node**（覆盖 `colorGroupedScope` 子 Scope nodeDefault）。

理由：

1. **复用 resolver**：opacity 是 ADR-02 resolver 的直接消费者（continuous → linear），边际成本低。
2. **与 size 同口径**：PointMark 专属、per-datum、point-only，保持 alpha.7 通道的一致心智。
3. **core 现成**：落 core node opacity，不需要补 core。

## 待决策点 🔻

- **落 `opacity` 还是 `fillOpacity`**：散点 glyph 当前只有 fill（无 stroke），两者等效。倾向 **`opacity`（整节点）**——语义直白「整个点的不透明度」，未来 glyph 加描边时一并淡化。
- **`OPACITY_MIN`**：定为**实现契约常量**——`lower/channel.ts` `export const OPACITY_MIN = 0.2`，测试 **import 该常量**断言、不硬写数值（评审 P2，便于日后调值不破测试）。
- **React `opacity` prop 形态**：`opacity?: string`（字段）；常量不透明度（`opacity={number}`）属样式、暂不进 DSL（IR 仍支持 `value`）。倾向只收字段。

## DSL 表面

```tsx
// 散点：透明度编码 density 字段（叠点时低密度更淡）
<Plot data={points}>
  <PointMark x="x" y="y" opacity="density" />
</Plot>
```

```ts
// vanilla / 原生 IR
{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, opacity: { field: 'density' } } }
```

## 测试设计

`packages/plot/plot/tests/lower/opacity-channel.test.ts` + `tests/ir/encoding.schema.test.ts` 覆盖：linear 映射到 [min,1]、常量 value、`value` 越界 schema 拒绝、`field` 越界 clamp 不报错、temporal fail-loud、size+opacity 共存、schema accept/reject。具体见「测试象限」。

## 影响

- **Plot IR**：`ir/encoding.ts` 加 `OpacityChannelSchema`；`PointEncodingSchema` 加 `opacity`（其它 mark encoding 不变）。
- **lowering**：`lower/channel.ts` 加 opacity resolver（continuous→linear）；`lower/mark.ts` lowerPoint 接 opacity → per-node 不透明度。
- **core**：消费 core node opacity，不改 core。
- **文档站**：散点页加 opacity demo + API 行。
- **对外 API**：`<PointMark opacity>` + IR PointMark encoding `opacity`。非 breaking（纯新增可选）。

## 不在本 ADR 范围

- **opacity 作用于 bar/area/line/sector** → 顺延（⑤ 仅 PointMark）。
- **categorical → 离散 opacity 档** → 顺延（本轮 continuous only）。
- **stroke/fill 分别控制 opacity** → 顺延（本轮整节点 opacity）。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/encoding.ts`（IR 契约）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/encoding.ts` | 加 | `OpacityChannelSchema` | `z.object`（field?/value?/scale?）| — | opacity 通道：连续字段经 linear scale → 节点不透明度 |
| `ir/encoding.ts` | 加 | `OpacityChannelSchema.value` | `z.number().min(0).max(1).optional()` | — | 常量不透明度 0..1（绕过 scale）|
| `ir/encoding.ts` | 改 | `PointEncodingSchema` | `extend({ opacity })` | — | PointMark encoding 加 opacity（与 size 并列）|
| `ir/encoding.ts` | 加 | `OpacityChannel` | `z.infer` | — | 派生类型 |

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（改）
- `packages/plot/plot/src/lower/channel.ts`（改：opacity resolver）
- `packages/plot/plot/src/lower/mark.ts`（改：lowerPoint per-node opacity）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（改）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（改：非 point mark 写 opacity 被剥离，对齐 size）
- `packages/plot/plot/tests/lower/opacity-channel.test.ts`（新建）
- `packages/plot/react/src/components/marks.tsx`（改：`PointMarkProps.opacity?`）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：point 装 opacity encoding）
- `apps/docs/src/contents/plot/components/mark/point/**`（opacity demo + API）

### 测试象限

**Happy path**：
- `opacity field → linear`：opacity 绑连续字段 → 各点不透明度按线性映射到 [min,1]
- `opacity value 常量`：`opacity:{value:0.5}` → 所有点 0.5（绕过 scale）
- `size + opacity 共存`：同点两通道独立生效

**边界**：
- `单值字段`：opacity 字段单值 → 映射到 range 上界
- `空数据`：0 行 → 不崩

**错误路径**：
- `value 越界`：`opacity:{value:1.5}` / `-0.1` → schema 拒绝（唯一硬边界）
- `field 越界 clamp 不报错`：opacity 字段含负数 / 超域值 → clamp 到 `[OPACITY_MIN,1]`，**不抛**（与 size 负值 fail-loud 对照）
- `temporal opacity fail-loud`：时间字段绑 opacity → 抛错
- `field 与 value 互斥`：两者都给 → 拒绝
- `opacity 在非 point mark`：line/area/bar encoding 写 opacity → schema 剥离（非 strict，TS 层禁止；对齐 size，断言 parsed.encoding 无 opacity）

**交互**：
- `opacity per-node 落点`：opacity + color → 不透明度落 per-node、颜色仍按色分组
- `OPACITY_MIN 用 import 常量断言`：测试 import `OPACITY_MIN`，不硬写 0.2

### 依赖的现有元素

- `PointEncodingSchema`（[ADR-02](./02-channel-scale-resolver-size.md)，`ir/encoding.ts`）—— 扩展加 opacity
- 通用通道→scale resolver（`lower/channel.ts`）—— 加 opacity 分支（continuous→linear）
- `resolveLinearScale`（`lower/scale.ts`）—— 引用
- `lowerPoint`（`lower/mark.ts`）—— 修改（per-node opacity）
- core node `opacity` / `fillOpacity` 字段—— 消费（lowering 目标，不改 core）
