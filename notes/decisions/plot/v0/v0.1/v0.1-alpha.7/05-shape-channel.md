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

## 待决策点 🔻

- **React `shape` prop 形态**：`shape?: string`（字段）；常量形状（`shape={'diamond'}`）暂不进 DSL（IR 仍支持 `value`）。倾向只收字段。
- **size × shape 的尺寸语义（评审 P2）**：本轮 size 写 core node `minimumSize`，**与 shape 无关**——即「同一 size 值 → 同一 `minimumSize` 字段值」，**不保证** circle / rectangle / diamond 三种 glyph 的外接半径 / 感知面积相等（diamond 的外接框对角更长，视觉略大）。per-shape 面积归一化（按 shape 调 minimumSize 让感知面积一致）顺延，需 shape-specific 换算 + 测试。本轮明确**只保证写同一尺寸字段**。

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

`packages/plot/plot/tests/lower/shape-channel.test.ts` + `tests/ir/encoding.schema.test.ts` 覆盖：分类映射到调色板、循环复用、常量 value、continuous/temporal fail-loud、shape+color+size 共存、schema accept/reject。具体见「测试象限」。

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

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/encoding.ts`（IR 契约）+ `lower/**` + react 表面。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/encoding.ts` | 加 | `ShapeChannelSchema` | `z.object`（field?/value?/scale?）| — | shape 通道：分类字段经 ordinal 式映射 → glyph 形状 |
| `ir/encoding.ts` | 加 | `ShapeChannelSchema.value` | `z.string().min(1).optional()` | — | 常量 glyph 形状名（绕过 scale）|
| `ir/encoding.ts` | 改 | `PointEncodingSchema` | `extend({ shape })` | — | PointMark encoding 加 shape（与 size / opacity 并列）|
| `ir/encoding.ts` | 加 | `ShapeChannel` | `z.infer` | — | 派生类型 |

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（改）
- `packages/plot/plot/src/lower/channel.ts`（改：shape resolver + `PLOT_SHAPE_PALETTE`）
- `packages/plot/plot/src/lower/mark.ts`（改：lowerPoint per-node shape）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（改）
- `packages/plot/plot/tests/ir/mark.schema.test.ts`（改：非 point mark 写 shape 被剥离，对齐 size）
- `packages/plot/plot/tests/lower/shape-channel.test.ts`（新建）
- `packages/plot/react/src/components/marks.tsx`（改：`PointMarkProps.shape?`）
- `packages/plot/react/src/components/buildPlotSpec.ts`（改：point 装 shape encoding）
- `apps/docs/src/contents/plot/components/mark/point/**`（shape demo + API）

### 测试象限

**Happy path**：
- `shape field → palette`：shape 绑分类字段 → 各类别取调色板里不同 glyph
- `palette 循环`：类别数 > 调色板长度 → 循环复用
- `shape value 常量`：`shape:{value:'diamond'}` → 所有点 diamond

**边界**：
- `单类别`：shape 字段单值 → 全同一 glyph
- `空数据`：0 行 → 不崩

**错误路径**：
- `continuous shape fail-loud`：数值字段绑 shape → 抛错
- `temporal shape fail-loud`：时间字段绑 shape → 抛错
- `field 与 value 互斥`：两者都给 → 拒绝
- `shape 在非 point mark`：line/area/bar encoding 写 shape → schema 剥离（非 strict，TS 层禁止；断言 parsed.encoding 无 shape）

**交互**：
- `shape + color + size 共存`：三通道独立生效，shape/size/opacity per-node、color 按色分组
- `shape per-node 覆盖默认 circle`：有 shape 时 node.shape 覆盖 pointStyle 的默认 circle

### 依赖的现有元素

- `PointEncodingSchema`（[ADR-02](./02-channel-scale-resolver-size.md)，`ir/encoding.ts`）—— 扩展加 shape
- 通用通道→scale resolver（`lower/channel.ts`）—— 加 shape 分支（categorical→glyph，复用 ordinal 路径）
- `inferCategoryDomain` / ordinal 映射（`lower/scale.ts`）—— 引用
- `lowerPoint` / `pointStyle`（`lower/mark.ts`）—— 修改（per-node shape）
- core 内置 `NODE_SHAPES`（`rectangle` / `circle` / `ellipse` / `diamond`）—— 消费（lowering 目标，不改 core）
