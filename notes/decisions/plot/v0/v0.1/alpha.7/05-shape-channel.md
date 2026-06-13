# ADR-05：shape 通道（仅 PointMark）

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.7 roadmap](./roadmap.md) · [plot-design §3.3 Aesthetics](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 通道→scale resolver](./02-channel-scale-resolver-size.md)（shape 复用 PointEncoding）· 关联：[ADR-03 color](./03-color-series.md)（同为分类→离散输出，ordinal 式映射）

## 背景

`shape` 是 `StyleEncodingSchema` 注释里「later」的最后一个通道。glyph 形状**只对散点有意义**（折线 / 柱 / 扇形没有「点形状」），所以它天然 PointMark 专属。本轮范围调整把它与 opacity 一同前移并入 alpha.7。

core node 内置 4 形状：`rectangle` / `circle` / `ellipse` / `diamond`（`circle` / `diamond` 是 ellipse / polygon 的 preset 别名，编译期消解）。plot 直接消费这些 shape 名、不改 core。

## 决策：shape 作为 PointMark 专属分类通道，categorical 字段经 ordinal 式映射到内置 glyph 调色板

`PointEncodingSchema` 追加 `shape` channel。映射性质与 `color` 一致（分类 → 离散输出），但输出是 **core node shape 名**而非颜色。

```ts
// ir/encoding.ts —— shape channel（value = core shape 名；本轮不开放显式 scale 引用）
export const ShapeChannelSchema = z.object({
  field: z.string().min(1).optional().describe('Data path bound to shape; categorical, mapped to a built-in glyph palette'),
  value: z.string().min(1).optional().describe('Constant glyph shape name — a core / registered node shape (mutually exclusive with field)'),
}).refine(c => (c.field === undefined) !== (c.value === undefined), { message: 'shape channel must set exactly one of field / value' })
  .describe('Shape channel (PointMark only): field → glyph shape via the built-in shape palette; value → a constant core shape name');
// PointEncodingSchema 扩成 { ...Encoding, size?, opacity?, shape? }
```

- **不开放 `shape.scale`（拍死，评审 P1）**：本轮 shape channel **无 `scale` 字段**。理由：现有 `resolveOrdinalScale` 默认 range 是**颜色**，shape 引用一个无 range 的 ordinal scale 会把颜色串写进 `node.shape`（坏）；显式自定义 shape range 留后续，需另立「range 必须全是可 lower 的 shape 名」的契约。本轮只走自动调色板。
- **field（categorical）**：domain = 分类去重，按出现序映射到**默认 shape 调色板** `PLOT_SHAPE_PALETTE`（循环复用）。continuous / temporal fail-loud（形状是分类编码，连续→形状无意义）。
- **默认调色板（拍死，评审 P1）**：`['circle', 'rectangle', 'diamond']`——**直用 core 内置 shape 名，无 plot-only 别名**（不引入 `square` 这种 core 不认识、compile 不消解的别名）；文档可把 `rectangle` glyph 口语称「方块 / square」，但 IR / value 一律用 `rectangle`。3 形状够分辨；更多 glyph（triangle / cross / star，需 polygon params 或 shape 注册表）顺延。
- **value**：常量 shape 名 = **core 内置或注册扩展 shape 名**（开放字符串，与 core `NodeShape` 一致）；非法名留 core 渲染期处理。不接受 plot-only 别名。
- **lowering**：per-datum 写 core node `shape`；与 size / opacity 同理，per-datum 落到每个 node（覆盖 `colorGroupedScope` / pointStyle 的默认 `shape: 'circle'`）。

理由：

1. **与 color 同构**：分类 → 离散输出，复用 ADR-02 resolver 的 ordinal 路径，shape 只是把 range 从颜色换成 shape 名。
2. **PointMark 专属是本质**：形状只对 glyph 有意义，进 PointEncoding 天然正确。
3. **core 现成 shape 名**：落 core 内置 shape，不补 core。


## DSL 表面

```tsx
// 散点：形状编码 category 字段（黑白可印图常用）
<Plot data={points}>
  <PointMark x="x" y="y" shape="category" />
</Plot>
```

```ts
// vanilla / 原生 IR
{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'category' } } }
```

## 测试设计

`packages/plot/plot/tests/lower/shape-channel.test.ts` + `tests/ir/encoding.schema.test.ts` 覆盖：分类映射到调色板、循环复用、常量 value、continuous/temporal fail-loud、shape+color+size 共存、schema accept/reject。落地测试见实现指针。

## 影响

- **Plot IR**：`ir/encoding.ts` 加 `ShapeChannelSchema`；`PointEncodingSchema` 加 `shape`。
- **lowering**：`lower/channel.ts` 加 shape resolver（categorical→glyph）；`lower/mark.ts` lowerPoint 接 shape → per-node `shape`。
- **core**：消费 core 内置 shape 名，不改 core。
- **文档站**：散点页加 shape demo + API 行。
- **对外 API**：`<PointMark shape>` + IR PointMark encoding `shape`。非 breaking（纯新增可选）。

## 不在本 ADR 范围

- **更多 glyph**（triangle / cross / star）→ 顺延（需 polygon params / shape 注册表）。
- **shape 作用于非 point mark** → 无意义，不做。
- **显式自定义 shape 调色板（range）** → 顺延（本轮默认调色板；显式 ordinal scale range 可作逃生舱，按需）。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/encoding.ts`、`packages/plot/plot/src/lower/{channel,mark}.ts` 与 `packages/plot/react/src/components/marks.tsx`，测试见 `packages/plot/plot/tests/{ir/encoding.schema,ir/mark.schema,lower/shape-channel}.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/alpha.7/05-shape-channel.md`（封板全文）。
