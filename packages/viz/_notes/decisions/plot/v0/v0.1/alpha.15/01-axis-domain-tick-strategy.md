# ADR-01：Axis domain padding 与 tick 策略

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[plot v0.1 roadmap](../roadmap.md) · [alpha.15 roadmap](./roadmap.md) · [plot-design.md §3.4 Scale](../../../../../architecture/plot-design.md#34-scale) · [plot-design.md §3.9 Guide](../../../../../architecture/plot-design.md#39-guide)

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

| scale family               | 单值 fallback                                                                                                                                         | padding 算法                                                                | invariant                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ |
| `linear` / `symlog`        | `[v - span / 2, v + span / 2]`                                                                                                                        | 以数值 span 做加法扩展：`[lo - span * lower, hi + span * upper]`            | 可跨零                   |
| `time`                     | `[v - span / 2, v + span / 2]`，`span` 单位为 epoch ms                                                                                                | 以 epoch ms span 做加法扩展，再转回 Date scale 消费                         | 可跨 epoch 0             |
| `log`                      | 在 log 空间扩展：`[v / base^(span / 2), v * base^(span / 2)]`；默认 log span 为 1 个 base order，显式 `singleValueSpan` 表示 log10/log-base 空间 span | 在 log 空间按比例扩展；非正 source domain 先 fail-loud，不通过 padding 修正 | padded lower 必须 `> 0`  |
| `sqrt` / `radial`          | `[max(0, v - span / 2), v + span / 2]`；若上界等于下界，则退到 `[0, span]`                                                                            | 以数值 span 做加法扩展，lower 端 clamp 到 `0`                               | padded lower 必须 `>= 0` |
| `pow` integer exponent     | 同 `linear`                                                                                                                                           | 同 `linear`                                                                 | 可跨零                   |
| `pow` non-integer exponent | 同 `sqrt`                                                                                                                                             | 同 `sqrt`                                                                   | padded lower 必须 `>= 0` |

`domainPadding` 的 object 形态必须至少写 `lower` 或 `upper` 之一；缺省侧按 `0` 处理。数字形态等价于 `{ lower: value, upper: value }`。

`ticks.values` 的解析不使用 `tickLabels.format` 反推。数值 / 连续 scale 只接受 number tick；time scale 接受 number epoch ms 或严格 ISO-like string，并经现有时间 coercion 路径解析；分类 scale 接受 string 或 number category。解析失败在 lowering 阶段 fail-loud。`tickLabels.format` 只负责 label 输出：数值走 d3-format，time 走 UTC d3-time-format，分类 tick 忽略 `tickLabels.format` 并用 category string。

所有 position scale family 必须复用同一套 domain padding 规则，只按 family、source domain、显式或推断来源、`domainPadding`、`singleValueSpan` 与 `nice` 语义分派，不各自复制边界算法。

`GuideTickSourceSchema` 提供 `count` / `values`，`GuideTickLabelFormatSchema` 提供 `format`。Axis tick label、axis grid 和 legend ramp 必须消费同一个已解析 tick set，避免候选值与标签语义漂移。

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

## 长期边界

- 分类 scale 的 `paddingInner` / `paddingOuter` / `padding` 重设计。
- 自动 tick label 防重叠、自动旋转、文字测量驱动抽稀。
- Theme token、axis line / label / grid 外观样式；由 ADR-02 / ADR-03 处理。
- Interaction 的 hover / tooltip / selection tick state。

---
