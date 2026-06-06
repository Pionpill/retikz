# ADR-03：transform 阶段（sort / stack；groupBy 作为 stack 的分组参数）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.3 transform / §4.1 管线第 1 段 / §3.8 relation](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-06 lowering](../v0.1-alpha.1/06-plot-lowering.md) · 消费方：[ADR-05 relation](./05-relation.md) · [ADR-02 bar mark](./02-interval-mark.md)

## 背景

塑造决策的硬约束：

- alpha.1/alpha.2 的 `expandPlot` 拿到外部 `rows` 后**直接**喂 scale 域推断与 mark——中间没有「数据变换」环节。但 plot-design §4.1 管线第 1 段就是 **transform**（原始数据 → 变换 → 可绘制数据表），堆叠图根本无法不经变换表达。
- **堆叠柱 / 堆叠面积**需先算每个 (x 类别, 系列) 的累积区间 `[y0, y1]`——这是 **stack** 的产物，mark 只负责画 `y0→y1` 的矩形（[ADR-02](./02-interval-mark.md) 的 baseline 从固定 0 推广到 `y0`）。**有序折线 / 柱**需 **sort**（alpha.1 line mark 内联的 `order` 是 mark 局部捷径，堆叠 / 多系列排序超出单 mark）。
- plot-design §3.3 的 transform 是大集合（filter / sort / groupBy / aggregate / bin / stack / cumulative / dodge / derive）；alpha.3 只做**堆叠柱所需的最小集**。

## 决策：PlotSpec 加可选 `transform` 数组（有序管线），lowering 在 scale 域推断前依次应用；首批 sort / stack，纯行→行

`PlotSpecSchema` 顶层加 `transform?`：一个**有序的 transform op 数组**，每个 op 是按 `kind` 判别的纯函数 `rows → rows`（可派生新字段，不引入数据值进 IR——IR 只存声明，数据仍走 `lowerPlots(datasets)`）。`expandPlot` 在「取 rows」之后、「scale 域推断 / mark 下沉」之前，按数组顺序折叠应用。首批两种：

- **sort**：按字段升 / 降序重排行。
- **stack**：按 `groupBy`（系列字段）在每个 `x`（分组键）内对 `y`（数值字段）累加，给每行派生 `y0` / `y1`（写到可配置的输出字段，默认 `y0` / `y1`），供堆叠 mark 消费。

判别值集为干净判别串、暴露给用户（裸 `'sort'` / `'stack'` 等价），真源见 `src/ir/transform.ts`：

```ts
export const PlotTransform = { Sort: 'sort', Stack: 'stack' } as const;
export type TransformType = ValueOf<typeof PlotTransform>;
```

理由：

1. **堆叠无法绕过 transform**：`y0/y1` 是数据派生量，必须在 mark 之前算出；放进 mark 会把「怎么堆」揉进 mark 几何（违背 §3.8 relation 与 mark 解耦）。transform 作为独立管线段是 grammar of graphics 的标准位置。
2. **纯行→行、JSON 平表**：每个 op `rows → rows`，stack 仅**派生标量字段**（y0/y1），不嵌套——守住 §3.3「transform 结果仍是 JSON 可序列化数据表」。数据值不进 IR（只存 op 声明）。
3. **有序数组 = 可组合管线**：sort 后再 stack、或 stack 后排序，由数组顺序显式表达，符合 Vega-Lite transform 列表直觉。
4. **groupBy 收为参数不另立 op**：roadmap 列了 `sort / groupBy / stack`，但**无 aggregate 时 groupBy 自身不改变平表**（分组只是「按某字段切片」的视角），做成独立 op 会产出嵌套结构、破坏「transform 结果仍是 JSON 平表」（§3.3）。主流库（Vega-Lite / d3）也都把 groupBy 当 **aggregate / stack 的参数**而非独立算子。故 **transform op = sort + stack**，**groupBy 作为 stack 的 `groupBy` 字段**（及 [ADR-05](./05-relation.md) relation 的系列字段）统一承载；待 aggregate 进场再视需要升为独立 op。

### 已拍板的取舍

- **transform 应用位置**：在 `expandPlot` **取 rows 后、域推断前**统一应用一次，产出 `transformedRows`，后续 scale / mark 全用它。stack 派生的 y0/y1 进入 y 域推断（保证 range 容得下堆叠总高）。
- **stack 字段 self-contained，不复用 encoding**：stack 内显式给 x/y/groupBy 三字段（transform 不反查 mark encoding）。代价是与 bar encoding 字段重复书写——DSL（[ADR-07](./07-bindings-dsl.md)）可由 `<BarMark stack>` 自动装配 transform，免用户手写。
- **stack 累加顺序**：每个 x 组内按 **`groupBy` 值的全局出现顺序**累加（与 [ADR-01](./01-band-scale.md) 分类域同口径，保序）；可被前置 sort 改变。
- **stack 行缺值**：缺 `y` 字段 / 非有限值的行**按 0 计入累加**（零高段、占位不错位），**不跳过**（跳过会让后续系列累加错位）。下游 bar 若 `arrangement:'stack'` 却整行无 y0/y1（未跑本 transform）由 [ADR-05](./05-relation.md) lowering **抛清晰错误**。
- **stack 输出字段名**：默认 `y0` / `y1`，可经 `startField` / `endField` 改（避免与用户数据字段撞名）。bar mark 读这两字段判定「堆叠模式」（[ADR-05](./05-relation.md)）。
- **sort 稳定性**：用稳定排序（保持等键原序）；`order` 省略 = ascending。比较走 alpha.1 `compareByPath` 同一套（数值 / 字符串通用）。

### 命名冲突说明

plot 的 `TransformSchema`（数据 transform）与 core 的 `TransformSchema`（几何 transform，`packages/core/core/src/ir/transform.ts`）**同名不同物**——命名空间隔离（各自包内），不冲突。

DSL 表面（`<BarMark stack>` 自动装配 stack transform）见 [ADR-07](./07-bindings-dsl.md) 与[文档站](https://pionpill.github.io/retikz/)。

## 不在本 ADR 范围

- **filter / aggregate / bin / normalize / cumulative / dodge transform** → 后续（dodge 的并排是 [ADR-05](./05-relation.md) 的 mark 几何，非 transform）。
- **groupBy 独立 op**（需 aggregate 才有意义）→ 后续。
- **堆叠 mark 几何**（读 y0/y1 画堆叠柱）→ [ADR-05](./05-relation.md)；本 ADR 只产数据。
- **居中 / 百分比堆叠（streamgraph / normalize）、负值堆叠** → 后续。

---

> **实现指针**：level `red`（动 `plot/src/ir/**` transform schema + PlotSpec 槽位 + `src/lower/**` 管线段）、非 breaking（`transform?` optional，rows 流向从「直用」变「先 transform」）。
> - 真源以代码为准：`PlotTransform` / `SortTransformSchema` / `StackTransformSchema` / `TransformSchema`（`packages/plot/plot/src/ir/transform.ts`）、`applyTransforms` + sort / stack 实现（`packages/plot/plot/src/lower/transform.ts`，复用 alpha.1 `compareByPath` / `channelValue` / `isFiniteNumber`）；`expandPlot`（`src/lower/expand.ts`）取 rows 后插入 transform 段。`@retikz/plot` 公开 `TransformSchema` / 子 schema / `PlotTransform`。
> - 测试见 `packages/plot/plot/tests/ir/transform.schema.test.ts`（accept/reject、unknown kind 拒）与 `tests/lower/transform.test.ts`（sort 升 / 降 / 稳定；stack 派生 y0/y1、首段 y0=0、单 / 多系列、空 rows、缺字段按 0 计入、自定义输出字段；多 op 管线顺序；stack 喂 y 域推断）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope）见本 ADR Proposed commit。

> 🔖 封板压缩 commit `82295fcc`；压缩前完整施工蓝图 = `git show 82295fcc^:notes/decisions/plot/v0/v0.1/v0.1-alpha.3/03-transform.md`。
