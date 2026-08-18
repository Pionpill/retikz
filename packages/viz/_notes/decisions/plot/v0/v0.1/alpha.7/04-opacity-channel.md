# ADR-04：opacity 通道（仅 PointMark）

- 状态：Superseded
- 替代：[alpha.12 ADR-12](../alpha.12/12-channel-core-coverage.md)；opacity 已从 PointMark 专属能力扩展为按宿主落到 Node、Path 或 Scope 的共享 mark channel
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot-design §3.3 Aesthetics](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 通道→scale resolver](./02-channel-scale-resolver-size.md)（opacity 复用其 resolver + PointEncoding）

## 背景

[alpha.6 ADR](../alpha.6/roadmap.md) 拆 `StyleEncodingSchema` 时注释「opacity / size / shape later」。alpha.7 已补 `size`（[ADR-02](./02-channel-scale-resolver-size.md)，PointMark 专属 encoding）+ 通用「通道→scale」resolver。本轮范围调整（把原 alpha.8 的 opacity / shape 前移，见 roadmap），`opacity` 作为 resolver 的又一消费者落地。

core node 已支持不透明度（`opacity` 整节点 0..1 / `fillOpacity` 仅填充），plot 直接消费、不改 core。

## 决策：opacity 作为 PointMark 专属连续通道，continuous 字段经 linear scale 映射到 [minOpacity, 1]

`PointEncodingSchema` 追加 `opacity` channel（与 `size` 同住 PointMark 专属 encoding，**不进全局 StyleEncoding**——与 ⑤ 一致，bar/area/line/sector 的 opacity 顺延）。

```ts
// ir/encoding.ts —— opacity channel（value ∈ [0,1]）
export const OpacityChannelSchema = z
  .object({
    field: z
      .string()
      .min(1)
      .optional()
      .describe('Data path bound to opacity; continuous, mapped through a linear scale to [minOpacity, 1]'),
    value: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Constant opacity 0..1, bypassing the scale (mutually exclusive with field)'),
    scale: z
      .string()
      .min(1)
      .optional()
      .describe('Optional linear-scale name (only with field); omitted → a default opacity scale is synthesized'),
  })
  .refine(c => (c.field === undefined) !== (c.value === undefined), {
    message: 'opacity channel must set exactly one of field / value',
  })
  .describe(
    'Opacity channel (PointMark only): field → glyph opacity via a linear scale; value → a constant opacity that bypasses the scale',
  );
// PointEncodingSchema 扩成 { ...Encoding, size?, opacity? }（shape 见 ADR-05）
```

- **field（continuous）**：经 ADR-02 resolver 合成 `linear` scale，domain = 数据 extent，range `[OPACITY_MIN, 1]`（默认下界，避免最小值全透明不可见）。continuous only——categorical opacity 无意义、顺延；temporal fail-loud。
- **value**：常量 ∈ `[0,1]`，绕过 scale。
- **取值范围**：opacity field 是**连续强度通道**，合成的 linear scale **开 `clamp`**——任意字段值（含负数 / 显式 domain 外的值）都 **clamp 到 `[OPACITY_MIN, 1]`，不 fail-loud**。这与 size 的「负值 fail-loud」**有意不同**：size 有面积语义、负半径无意义；opacity 无此约束，负强度 clamp 到最淡即可。唯一的硬边界是 `value` 常量由 schema 限 `[0,1]`；temporal 字段仍 fail-loud（opacity 是连续编码）。
- **lowering**：per-datum 写 core node 的不透明度字段；与 size 同理，per-datum 值**落到每个 node**（覆盖 `colorGroupedScope` 子 Scope nodeDefault）。

理由：

1. **复用 resolver**：opacity 是 ADR-02 resolver 的直接消费者（continuous → linear），边际成本低。
2. **与 size 同口径**：PointMark 专属、per-datum、point-only，保持 alpha.7 通道的一致心智。
3. **core 现成**：落 core node opacity，不需要补 core。

## 长期边界

- **opacity 作用于 bar/area/line/sector** → 顺延（⑤ 仅 PointMark）。
- **categorical → 离散 opacity 档** → 顺延（本轮 continuous only）。
- **stroke/fill 分别控制 opacity** → 顺延（本轮整节点 opacity）。
