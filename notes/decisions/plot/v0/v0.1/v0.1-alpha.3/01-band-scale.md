# ADR-01：band / point scale（分类域 + bandwidth；projector 抽象为 PositionScale）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.4 scale / §3.5 coordinate / §4.3 管线](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-03 scale](../v0.1-alpha.1/03-plot-scale.md) · [alpha.2 ADR-02 d3-scale](../v0.1-alpha.2/02-d3-scale.md) · 消费方：[ADR-02 bar mark](./02-interval-mark.md) · [ADR-05 relation](./05-relation.md)

## 背景

塑造决策的硬约束：

- alpha.1/alpha.2 的 scale 只有 **linear**——连续数值 `[min,max] → [r0,r1]`。柱状图的 x 轴是**分类**的（「一月 / 二月 / 三月」而非连续数轴）：每个类别占一段等宽的「band」，柱画在 band 里、宽度 = band 宽。这正是 grammar of graphics 的 **band scale**（plot-design §3.4 列 band / point）；d3-scale 的 `scaleBand` 现成提供 `domain（类别数组）→ range`、`bandwidth()`、`step()`、`paddingInner/Outer`。其姊妹 `scalePoint`（band 的退化：bandwidth=0、类别落在点上）用于「分类轴上的折线 / 散点」。
- band 与 linear 在三处语义不同，逼出一层抽象：① **域推断**——linear 的域 = 数值 extent，band 的域 = 按数据出现顺序去重的类别序列（非排序、非 min/max）；② **投影**——`scaleBand()(value)` 返回 band *起点*，点 / 线要居中、柱要占满，不能像 linear 那样把 d3 scale 直接当 `(value)=>number`；③ **guide**——linear 走 `scale.ticks(count)` + nice，band = 每类别一刻度落 band 中心、标签 = 类别串、无 nice / 无数值格式化。

本 ADR 定 band / point 的 **scale IR + lowering 解析 + projector 抽象 + guide 适配**；不含柱几何（[ADR-02](./02-interval-mark.md)）、分组 / 堆叠（[ADR-05](./05-relation.md)）。

## 决策：scale union 加 band / point；lowering 引入统一 `PositionScale`（coordinate + bandwidth），分类域按数据序去重

`ScaleSchema` 从「仅 linear」升为含 `band` / `point` 的 discriminated union（`type` 判别位已在，非破坏）。lowering 不再把 d3 scale 直接当函数用，而是经一层 **`PositionScale`** 归一化：暴露 `coordinate(value)`（连续 = `scale(value)`；band = 居中 `scale(v)+bandwidth/2`；point = `scale(v)`）、`bandwidth`（连续 / point = 0，band = `scale.bandwidth()`）、`ticks(count?)`（连续走 alpha.2 `scaleTicks`；band/point = 类别落位 + 类别串标签）。projector 与 guide 都改吃 `PositionScale`，linear 行为逐字不变（`bandwidth=0`、`coordinate=scale(value)`）。schema 见 `plot/src/ir/scale.ts`，`PositionScale` / `inferCategoryDomain` 见 `plot/src/lower/scale.ts`。

判别串保持裸字面量第一形态（JSON / LLM 写 `{ type: 'band' }`），常量供手写补全：

```ts
export const PlotScale = { Linear: 'linear', Band: 'band', Point: 'point' } as const;
export type ScaleType = ValueOf<typeof PlotScale>;
```

分类标量限 `z.union([z.string(), z.number()])`（不含 boolean/null）；band 字段 `domain? / paddingInner? / paddingOuter? / align?`、point 字段 `domain? / padding? / align?`，全 optional、全 JSON 可序列化。

理由：

1. **band 是柱状图 / 分类轴的地基**：没有 band scale 无法表达「类别等宽占位」；d3 `scaleBand` 是成熟实现（padding / align / bandwidth / step），自写又是造轮子（同 alpha.2 ADR-02 的论证）。
2. **`PositionScale` 抽象隔离 band 语义**：把「band 起点 vs 中心」「bandwidth 是否为 0」收进一层，projector / guide / bar 只认 `coordinate` + `bandwidth`，**不必各自分支 linear/band**——加 time / ordinal 时同样套这层。linear 走 `bandwidth=0` + `coordinate=scale(value)`，**逐字守住 alpha.1/alpha.2 投影**。
3. **分类域按数据序去重**：符合用户直觉（图上类别顺序 = 数据顺序），排序是 [ADR-03](./03-transform.md) transform 的显式职责、不在 scale 隐式做。
4. **JSON 安全 + 可扩展**：band/point 字段全 JSON 可序列化；`type` 判别位为 time / ordinal 继续扩 union 留空间，旧 IR 不破。

### 实现中已拍板的取舍

- **band 同时出 point**：point 是 band 的退化（bandwidth=0），分类轴上的折线 / 散点需要它（折线连分类点）；d3 同包、成本低；不出则「分类 x 的折线」无处落。
- **paddingInner 默认 0.1**（柱间留窄缝，主流默认；d3 `scaleBand` 原始默认 0 柱贴柱，但视觉上柱状图普遍带缝）；lowering `def.paddingInner ?? 0.1` 兜默认，显式 0 则贴合。paddingOuter 默认 = paddingInner。
- **point padding 默认 0.5**（首尾各留半步，类别点不贴边），对齐 d3 `scalePoint` 默认。
- **域推断口径**：收该维度所有 mark 的 encoding 字段值（沿用 alpha.2 `axisValues` 聚合），按 scale.type 二选一——分类路径用 `inferCategoryDomain`、连续路径用 `extent`。
- **band 刻度忽略 `tickCount`**：每类别一刻度（落 band 中心），不做抽稀。类别过多的 thinning / 旋转标签留后续（非破坏）。
- **类型不匹配不强校验**：band 绑数值字段 / linear 绑分类字段，lowering 以「按 scale.type 走对应域推断」为准，不匹配时产出退化（空域 → d3 行为），强校验留给 data model（后续）。

## 不在本 ADR 范围

- **柱几何 / baseline**（bar 怎么画）→ [ADR-02](./02-interval-mark.md)。
- **分组（dodge：band 内切子带）/ 堆叠** → [ADR-05](./05-relation.md)。
- **ordinal·color scale**（分类 → 颜色）→ [ADR-04](./04-color-scale.md)；**time scale** → [ADR-06](./06-time-scale.md)。
- **类别过多的标签 thinning / 旋转 / 自动隐藏** → 后续。
- **log / pow / sqrt / quantize / threshold scale** → 后续。
- 面向用户的 scale 选择（`<BarMark>` 自动用 band x）见 [ADR-07](./07-bindings-dsl.md) 与[文档站](https://pionpill.github.io/retikz/)。

---

> **实现指针**：level `red`（动 `plot/src/ir/**` scale schema + `src/lower/**` PositionScale / projector 契约边界）、非 breaking（linear 经 `PositionScale` 后投影 / 刻度与 alpha.2 逐字相等）。
> - 真源以代码为准：`ScaleSchema` / `BandScaleSchema` / `PointScaleSchema` / `CategoryValueSchema` / `PlotScale`（`plot/src/ir/scale.ts`）；`PositionScale` / `inferCategoryDomain` / band·point resolver（`plot/src/lower/scale.ts`）；projector 改吃 `PositionScale.coordinate`、`axisValues` 按 scale.type 分流（`plot/src/lower/project.ts` / `expand.ts`）。`scaleBand` / `scalePoint` 复用 alpha.2 已引入的 d3-scale。对外 barrel 公开 `BandScaleSchema` / `PointScaleSchema` / `CategoryValueSchema`，`PlotScale` 增成员；对 core 无影响（band/point 在 lowering 内部，IR 仍纯 JSON）。
> - 被消费：[ADR-02](./02-interval-mark.md) 用 `bandwidth` 定柱宽、`coordinate` 定柱位；[ADR-05](./05-relation.md) dodge 在 band 内切子带；guide lowering 复用 `PositionScale.ticks`。
> - 测试见 `plot/tests/ir/scale.schema.test.ts`（band/point accept/reject、padding 越界、domain 元素校验）与 `plot/tests/lower/scale.test.ts`（分类域保序去重 / 过滤非标量、band coordinate 居中、bandwidth 取值、band 刻度落中心、linear 经 PositionScale 逐字等价），及 `plot/tests/lower/lowerPlots.test.ts`（守 linear 向后兼容）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope）见本 ADR Proposed commit。
