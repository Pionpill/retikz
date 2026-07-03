# ADR-01：Axis domain padding 与 tick 策略

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.4 Scale](../../../../architecture/plot-design.md#34-scale) · [plot-design.md §3.9 Guide](../../../../architecture/plot-design.md#39-guide)

## 背景

`@retikz/plot` 当前连续位置 scale 的默认 domain 来自数据 extent；`nice` 只调用 d3 scale 的 `.nice()`。当数据只有一个点，或所有点位于 cartesian2D 的左下角边界附近时，推断 domain 会让点贴在 axis / plotArea 边界上，图形可读性很差。这个问题不是 demo 层应该手写 domain 的问题，而是 scale + guide 共同承担的基础可读性契约。

Plot 设计里 scale 负责 `domain / range / clamp / nice / ticks`，coordinate 只消费位置 scale，guide 从 scale tick set 派生 axis 与 grid。因此 domain 弹性必须落在 scale 解析阶段，tick 显式控制必须落在 guide 语义上。Theme 只能提供视觉默认，不能用视觉 token 掩盖 domain 语义缺失。

同类图形语法通常会在默认值里给 inferred extent 留白，但 retikz 还要守住 JSON IR、scale family invariant 和 lowering 可预测性。尤其 `log` 只能正 domain，`sqrt` / `radial` 不能负，`pow` 在非整数指数时不能负；domain padding 不能把合法数据扩成非法 scale domain。

## 决策：把 inferred position domain 扩展为可读 domain，并开放显式 tick set

连续 / 时间位置 scale 新增 `domainPadding` 与 `singleValueSpan`。当 `domain` 省略时，position scale 默认启用 inferred-domain padding；当 `domain` 显式给出时，默认尊重用户，不自动 padding，只有用户同时写 `domainPadding` 才扩展显式 domain。tick 控制进入 ADR-02 的 axis 部件槽位：`ticks.count` 作为 hint，`ticks.values` 声明显式刻度，`tickLabels.format` 控制展示文本。

domain 解析顺序固定为：

```text
source extent
  -> validate source domain against scale invariant
  -> expand single-value extent by singleValueSpan
  -> apply domainPadding
  -> validate padded domain against scale invariant
  -> nice
```

`source extent` 来自显式 `domain` 或 inferred extent。显式 `domain` 省略 `domainPadding` 时，`apply domainPadding` 是 no-op；inferred position domain 省略 `domainPadding` 时使用默认 `0.05`。

scale family 算法固定如下：

| scale family | 单值 fallback | padding 算法 | invariant |
| --- | --- | --- | --- |
| `linear` / `symlog` | `[v - span / 2, v + span / 2]` | 以数值 span 做加法扩展：`[lo - span * lower, hi + span * upper]` | 可跨零 |
| `time` | `[v - span / 2, v + span / 2]`，`span` 单位为 epoch ms | 以 epoch ms span 做加法扩展，再转回 Date scale 消费 | 可跨 epoch 0 |
| `log` | 在 log 空间扩展：`[v / base^(span / 2), v * base^(span / 2)]`；默认 log span 为 1 个 base order，显式 `singleValueSpan` 表示 log10/log-base 空间 span | 在 log 空间按比例扩展；非正 source domain 先 fail-loud，不通过 padding 修正 | padded lower 必须 `> 0` |
| `sqrt` / `radial` | `[max(0, v - span / 2), v + span / 2]`；若上界等于下界，则退到 `[0, span]` | 以数值 span 做加法扩展，lower 端 clamp 到 `0` | padded lower 必须 `>= 0` |
| `pow` integer exponent | 同 `linear` | 同 `linear` | 可跨零 |
| `pow` non-integer exponent | 同 `sqrt` | 同 `sqrt` | padded lower 必须 `>= 0` |

`domainPadding` 的 object 形态必须至少写 `lower` 或 `upper` 之一；缺省侧按 `0` 处理。数字形态等价于 `{ lower: value, upper: value }`。

`ticks.values` 的解析不使用 `tickLabels.format` 反推。数值 / 连续 scale 只接受 number tick；time scale 接受 number epoch ms 或严格 ISO-like string，并经现有时间 coercion 路径解析；分类 scale 接受 string 或 number category。解析失败在 lowering 阶段 fail-loud。`tickLabels.format` 只负责 label 输出：数值走 d3-format，time 走 UTC d3-time-format，分类 tick 忽略 `tickLabels.format` 并用 category string。

实现上必须把 domain padding 算法收敛到 `providers/scale/shared/**` 的 `resolvePaddedDomain` 一类纯 helper。各 position scale resolver 只传入 scale family、source domain、显式 / 推断 domain 来源、`domainPadding`、`singleValueSpan`、`nice` 语义，不在 `resolveLinearScale`、`resolveLogScale`、`resolveSqrtScale` 等函数里重复写 family 分支。

tick 解析也必须走 guide family 共享 helper：`GuideTickSourceSchema` 提供 `count` / `values`，`GuideTickLabelFormatSchema` 提供 `format`，`resolveGuideTicks(scale, tickSource, labelFormat)` 统一返回 tick values 与 labels。Axis tick label、axis grid 和 legend ramp tick 后续都消费同一个 resolved tick set。

```ts
const plot = {
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'points' },
  scales: [
    { type: 'linear', name: 'x', domainPadding: 0.08 },
    { type: 'linear', name: 'y', domainPadding: { lower: 0.1, upper: 0.06 }, singleValueSpan: 1 },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', x: { field: 'x' }, y: { field: 'y' } }],
  guides: [
    { type: 'axis', dimension: 'x', ticks: { count: 6 }, tickLabels: { format: '.2f' }, grid: true },
    { type: 'axis', dimension: 'y', ticks: { values: [0, 0.5, 1] }, tickLabels: { format: '.0%' }, grid: true },
  ],
};
```

理由：

1. inferred domain 默认可读，解决单点和边界贴合场景，不要求用户为普通散点图手写 domain。
2. 显式 domain 默认不改写，保留用户对数据语义边界的控制。
3. tick set 是 axis 语义，不是 theme 语义；`ticks.values` / `tickLabels.format` 让 guide 能表达关键刻度与展示格式。
4. scale family invariant 在 domain padding 阶段统一处理，避免 log / sqrt / radial / pow 各自散落补丁。

## 待决策点

无。字段名、默认值、padding 顺序和 scale family 约束由本 ADR 固定；后续实现发现必须改名或改默认时，应回到本 ADR 修订后再施工。

## DSL 表面

```tsx
<Plot
  data={points}
  scales={[
    { type: 'linear', name: 'x', domainPadding: 0.08 },
    { type: 'linear', name: 'y', singleValueSpan: 1 },
  ]}
  coordinate={{ type: 'cartesian2D', x: 'x', y: 'y' }}
>
  <Point x="x" y="y" />
  <Axis dimension="x" ticks={{ count: 5 }} grid />
  <Axis dimension="y" ticks={{ values: [0, 0.5, 1] }} tickLabels={{ format: '.0%' }} grid />
</Plot>
```

Vanilla builder 暴露同等字段；React / Vanilla 不另造 domain padding 语义，只生成同一份 PlotSpec。

## 测试设计

`packages/viz/plot/tests/scale/domain-padding.test.ts` 覆盖 inferred / explicit domain、single-value fallback、scale family invariant 与 `nice` 顺序。

`packages/viz/plot/tests/guide/axis-ticks.test.ts` 覆盖 `ticks.values`、`tickLabels.format`、grid 与 axis 共享 tick set。

`packages/viz/plot-react/tests/axis-authoring.test.tsx` 与 `packages/viz/plot-vanilla/tests/axis-authoring.test.ts` 覆盖 adapter 生成 PlotSpec 等价性。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `@retikz/plot` scale schema 增加 domain 弹性字段；position scale provider 需要在创建 d3 scale 前统一解析 domain。
- AxisGuide schema 增加 tick 显式控制字段；guide lowering 使用同一 tick set 同时画 tick label 和 grid，legend ramp 后续也复用同一 tick resolver。
- `@retikz/plot-react` / `@retikz/plot-vanilla` 增加等价 authoring 表面。
- docs 需要补充单点散点留白、显式 domain 默认不 padding、`ticks.values` 与 `tickLabels.format` 示例。
- 不触碰 core IR；lowering 仍输出 core Scope / Path / Node。

## 不在本 ADR 范围

- 分类 scale 的 `paddingInner` / `paddingOuter` / `padding` 重设计。
- 自动 tick label 防重叠、自动旋转、文字测量驱动抽稀。
- Theme token、axis line / label / grid 外观样式；由 ADR-02 / ADR-03 处理。
- Interaction 的 hover / tooltip / selection tick state。

---

## 实现契约（必填）

### Level

`yellow`

本 ADR 修改 plot schema、scale provider、guide feature 与 adapter authoring 表面；不改 core IR，不改 plot composite namespace，不改 public package entry 的导出形态。若实现发现必须新增 core 原语或改变 PlotSpec root discriminator，需新开 ADR。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/viz/plot/src/schemas/scale/schema.ts` | 加 | `domainPadding` | `z.union([z.number().nonnegative(), z.object({ lower: z.number().nonnegative().optional(), upper: z.number().nonnegative().optional() }).strict().refine(hasLowerOrUpper)])` | inferred position domain 默认 `0.05`；显式 domain 默认 `0` | 按 domain span 的比例向 lower / upper 两端扩展；数字表示两端相同比例，对象缺省侧按 0 |
| `packages/viz/plot/src/schemas/scale/schema.ts` | 加 | `singleValueSpan` | `z.number().positive()` | 数值 / time 默认 `max(abs(value) * 0.2, 1)`；log 默认 1 个 log-base order；time 单位为 ms | 当 extent 退化为 `[v, v]` 时用于生成最小完整 domain span |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `GuideTickSourceSchema.count` | `z.number().int().positive().optional()` | scale 默认 tick count | Tick 数量 hint；axis 与 legend ramp 共享 |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `GuideTickSourceSchema.values` | `z.array(z.union([z.number(), z.string()])).min(1).optional()` | `—` | 显式 guide tick 值；存在时优先于 `count`，axis grid / legend ramp 复用同一组 tick |
| `packages/viz/plot/src/schemas/guide/schema.ts` | 加 | `GuideTickLabelFormatSchema.format` | `z.string().min(1).optional()` | `—` | 声明式 tick label 格式字符串；数值走 d3-format，时间走 UTC d3-time-format，不接受函数 |

`domainPadding` 与 `singleValueSpan` 只加到连续 / 时间位置 scale：`linear`、`time`、`log`、`pow`、`sqrt`、`symlog`、`radial`。颜色 scale 本轮不自动 domain padding；后续如需色域 padding 另开 ADR。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/schemas/scale/schema.ts`
- `packages/viz/plot/src/schemas/scale/types.ts`
- `packages/viz/plot/src/schemas/guide/schema.ts`
- `packages/viz/plot/src/schemas/guide/types.ts`
- `packages/viz/plot/src/providers/scale/features/position.ts`
- `packages/viz/plot/src/providers/scale/shared/**`
- `packages/viz/plot/src/features/guide/**`
- `packages/viz/plot/src/pipeline/expand.ts`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/scale/**`
- `packages/viz/plot/tests/guide/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/modules/docs/data/**`

偏离白名单需要先扩展本 ADR 的文件 scope 或新开 ADR。

### 测试象限

**Happy path**：

- `inferred linear domain gets default padding`：单点或窄 extent 的 cartesian2D scatter → x/y domain 向两端扩展，点不贴 plotArea 边界。
- `explicit domain is preserved without domainPadding`：用户写 `domain: [0, 100]` 且不写 `domainPadding` → resolved domain 仍为 `[0, 100]`。
- `explicit domain can opt into padding`：用户写 `domain` + `domainPadding` → 先扩展显式 domain，再按 `nice` 处理。
- `ticks.values drives axis and grid`：AxisGuide 写 `ticks.values` + `grid: true` → tick label 与 grid line 使用同一 tick set。

**边界**：

- `single zero value expands around constrained lower bound`：linear/symlog 单值 `0` 使用 `singleValueSpan` 或默认 span；sqrt/radial 单值 `0` lower 不小于 `0`。
- `time domain padding uses epoch milliseconds`：time scale 单日期或窄日期范围 → 内部按 epoch ms 扩展，tick label 仍按时间格式输出。
- `partial domainPadding object defaults missing side to zero`：`{ lower: 0.1 }` 只扩 lower，`{ upper: 0.1 }` 只扩 upper，`{}` schema 拒绝。
- `nice runs after padding`：`nice: true` 的 resolved domain 包含 padding 后再外扩到 nice 边界。
- `reversed range does not affect domain padding`：range 翻转只影响像素投影，不改变 domain 扩展方向。
- `time ticks.values parse independently from tickLabels.format`：number tick 作为 epoch ms，ISO-like string 经时间 coercion 解析，`tickLabels.format` 只影响 label 输出。
- `legend ramp shares guide tick resolver`：连续 legend ramp 与对应 axis 使用相同 tick source / label format resolver，时间和数值格式语义一致。

**错误路径**：

- `log padding never creates non-positive domain`：正值很小的 log scale padding 后 lower 仍 `> 0`；显式非正 domain 仍 fail-loud。
- `sqrt and radial reject negative explicit domains`：负 domain 不因 padding 被修正，仍按现有契约报错。
- `pow non-integer rejects negative explicit domain`：非整数 exponent + 负 domain fail-loud；整数 exponent 可跨零。
- `ticks.values rejects empty arrays`：schema 拒绝空 tick 列表。

**交互**：

- `axis ticks.values works with cartesian grid projection`：cartesian2D x/y axis 的 explicit ticks 同时驱动 axis 与 grid。
- `axis ticks.values works with polar radial/angular guides`：polar2D angle / radius axis 能消费 explicit ticks，不破坏弧线 / 辐条几何。
- `adapter specs are equivalent`：React 与 Vanilla authoring 生成的 `domainPadding`、`singleValueSpan`、`ticks.values`、`tickLabels.format` 与手写 PlotSpec 等价。

### 依赖的现有元素

- `ScaleOperationSchema`（`packages/viz/plot/src/schemas/scale/schema.ts`）——扩展连续 / 时间 position scale 字段。
- `AxisGuideSchema`（`packages/viz/plot/src/schemas/guide/schema.ts`）——扩展 axis tick 控制。
- `resolvePaddedDomain`（`packages/viz/plot/src/providers/scale/shared/**`）——实现阶段新增的 shared domain resolver，集中处理 family matrix、single value fallback、padding、nice 顺序和 invariant。
- `resolveLinearScale` / `resolveLogScale` / `resolvePowScale` / `resolveSqrtScale` / `resolveSymlogScale` / `resolveRadialScale` / `resolveTimeScale`（`packages/viz/plot/src/providers/scale/features/position.ts`）——只调用 shared padded-domain resolver，再创建 d3 scale。
- `PositionScale.ticks` 与 `TickSet`（`packages/viz/plot/src/contract`）——保留 guide 消费 tick set 的统一接口。
- `resolveGuideTicks` / `lowerGuide`（`packages/viz/plot/src/features/guide/**`）——消费 explicit tick set 与 label format，并保证 grid、axis tick label、legend ramp tick 共源。
- `@retikz/core` Scope / Path / Node ——仅作为 lowering 目标消费，不修改 core 内部契约。
