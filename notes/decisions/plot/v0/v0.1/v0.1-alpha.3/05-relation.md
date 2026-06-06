# ADR-05：relation —— series + group(dodge) + stack（多系列柱 / 折线几何）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §3.8 relation / §4.5 mark 构造（relation 是输入非后处理）](../../../../../architecture/plot-design.md) · 依赖：[ADR-02 bar mark](./02-interval-mark.md) · [ADR-03 transform](./03-transform.md) · [ADR-04 color](./04-color-scale.md) · 回溯：[alpha.1 ADR-05 mark（line.order）](../v0.1-alpha.1/05-plot-encoding-mark.md)

## 背景

塑造决策的硬约束：

- alpha.1 的 relation 只有 line 的 `order`（连接顺序）。多系列图——多条折线、**分组柱**（同类别多根并排）、**堆叠柱**（同类别累叠）——需要把数据按**系列字段**切分，并决定多系列在几何上如何组合。
- plot-design §3.8 把「多条记录如何组合 / 连接」单列为 **relation**（order / group / series / stack / dodge / connect / facet），**与 mark 解耦**——「怎么连 / 怎么堆 / 怎么分组」不揉进 mark `type`（§4.5：relation 是 mark 构造的*输入*、不是后处理）。
- 本 ADR 是 alpha.3 的**集成 ADR**：把 02（bar 几何）+ 03（stack 数据）+ 04（系列色）拼成多系列产物。

## 决策：mark 加 `series` 字段 + bar 的 `arrangement`（dodge/stack）；按系列分子 Scope，dodge 切子带、stack 读 y0/y1

在 mark 上加**两个 relation 字段**（作为 mark 构造输入，不新增 mark type）：

- `series?`（line / interval 通用）：系列字段；present 时 lowering 按其分类域（[ADR-01](./01-band-scale.md) 保序去重）把行分成多系列，**每系列一个子 Scope**（颜色由 [ADR-04](./04-color-scale.md) color scale 给）。line → 多条折线；interval → 多组柱。
- `arrangement?`（仅 interval）：`'dodge'`（并排，默认当有 series 时）/ `'stack'`（累叠）。dodge：把每个 band 按系列数 K 等分为 K 子带，系列 i 的柱落第 i 子带（宽 `bandwidth/K`、中心偏移）。stack：柱从 `y0` 画到 `y1`（来自 [ADR-03](./03-transform.md) stack transform 派生字段），baseline 不再固定 0。

判别常量值即判别串（裸 `'dodge'` / `'stack'` 同样可用），是 schema 契约的一部分：

```ts
export const PlotArrangement = { Dodge: 'dodge', Stack: 'stack' } as const;
export type ArrangementType = ValueOf<typeof PlotArrangement>;
```

字段语义见 `IntervalMarkSchema` / `LineMarkSchema` 的 `.describe`（`packages/plot/plot/src/ir/mark.ts`）；其中 `y0Field` / `y1Field` 默认 `"y0"` / `"y1"`，须与 [ADR-03](./03-transform.md) stack 的 `startField` / `endField` 对齐。

理由：

1. **relation 字段在 mark 上、但语义独立于 mark type**（§4.5）：`series` / `arrangement` 是 mark 构造输入，line / interval 共享 `series`；不为「分组柱」「堆叠柱」造新 mark type（否则 chart-type 思维回潮）。bar 仍是一个 `interval`，组合方式由 `arrangement` 调。
2. **dodge 复用 band `bandwidth`**：子带 = band 均分，几何单一真源仍是 x band scale（[ADR-01](./01-band-scale.md)），与轴刻度对齐；不另引子 scale（子带均分是确定算法、无需 scale 对象）。
3. **stack 数据与几何分离**（§3.8）：累积区间 `y0/y1` 由 [ADR-03](./03-transform.md) transform 算（数据职责），interval mark 只读字段画矩形（几何职责）——`arrangement:'stack'` 把 baseline 从 0 切换到 `y0`。两者解耦：换 streamgraph 只改 transform。
4. **每系列一子 Scope、颜色上提**：N 系列 → N 子 Scope（各设 fill / color），续 [ADR-04](./04-color-scale.md) 的「颜色上提 Scope」，IR 体积 O(系列 × 类别) 而非逐元素重复色。
5. **多线 = line + series**：line 的 `series` 把行分组、各组按 order 连线、各线一色——多系列折线无需新 mark。

### 已拍板的取舍

- **dodge vs stack 的开关位置**：选 **interval 的 `arrangement` 字段**（`dodge`/`stack`），`series` present 且 `arrangement` 省略 → 默认 **dodge**。备选「靠 transform 有无 stack 推断」被否：mark 几何不应反查 transform 存在性，显式 `arrangement` 更清晰。
- **stack 的 y0/y1 来源耦合**：interval `y0Field`/`y1Field` 默认 `"y0"`/`"y1"`，须与 [ADR-03](./03-transform.md) stack 的 `startField`/`endField` 对齐——**DSL（[ADR-07](./07-bindings-dsl.md)）`<BarMark stack>` 同时装配 transform + arrangement + 字段名，保证一致**；手写 spec 时用户自负对齐（文档说明）。
- **dodge 子带顺序 / padding**：子带按系列分类域顺序排列；子带间**不**再留缝（子带紧贴，组间缝由 band paddingInner 提供）；子带内 padding 留后续。
- **dodge 的 series 域来源**：取该 mark `series` 字段在**全数据**的分类域（不是逐类别各算），保证每个类别的子带数 / 顺序一致（缺某系列的类别留空位，对齐）。
- **line 多系列的 order**：每系列内部仍按 line `order`（或数据序）连点；series 只分组不排序。
- **color 与 series 的主从**（与 [ADR-04](./04-color-scale.md) 统一）：**series 是主分区，color 只定 paint，lowering 永不「先 color 后 series」**。无 series 时按 color 分组（line 的 color 无 series → 提升 `series = color`）；有 series 时按 series 分子 Scope、每系列取 color 字段值上色（`color` 省略默认 `color = series`）。`color` ≠ `series` 且系列内取值不一 → 取该系列**首行** color 值，「系列内逐 datum 着色」留后续。
- **未知字段不靠 schema 拒**：mark schema **不加 `.strict()`**（沿用 alpha.1/alpha.2，IR round-trip 测试依赖 zod 默认 strip）。line 误写 `arrangement` 由 **TS `LineMarkProps` 类型挡**（无此 prop）、schema 层静默 strip，不报错——故测试断言「忽略」而非「拒绝」。
- **stack 缺 y0/y1 的处理**（与 [ADR-03](./03-transform.md) 对齐）：`arrangement:'stack'` 但行缺 `y0Field`/`y1Field`（手写 spec 忘配 stack transform）→ lowering **抛清晰错误**（提示「stacked interval 需配套 stack transform 派生 y0/y1」），**不静默退化**。DSL（[ADR-07](./07-bindings-dsl.md)）自动装配 transform，只有手写 spec 才会触发。

## 影响

- **对外 API**：`@retikz/plot` line / interval schema 加字段（`series` / `arrangement` / `y0Field` / `y1Field`），公开 `PlotArrangement` —— 非 breaking（全 optional，省略即退化单系列、等价 [ADR-02](./02-interval-mark.md)）。
- **对 core**：无（多系列仍下沉 Scope/Node/Path，不依赖 core 新能力）；多系列子 Scope 为 alpha.5「按系列命中」预留结构（仅埋点）。
- **被依赖**：[ADR-07](./07-bindings-dsl.md) 的 `series` / `stack` / `dodge` props + 多系列 demo / 文档（在该 ADR 阶段补）。

## 不在本 ADR 范围

- **横向柱（y 分类）、负值 / 百分比 / 居中堆叠（streamgraph / normalize）** → 后续。
- **stack transform 本身**（算 y0/y1）→ [ADR-03](./03-transform.md)；本 ADR 只消费。
- **connect / ribbon（跨记录 / 跨 scope 关系线）、facet（多 coordinate scope）** → 后续 / alpha.5+。
- **legend（系列图例）** → 后续。
- **子带内 padding、系列排序控制** → 后续（非破坏加字段）。

---

> **实现指针**：level `red`（动 `plot/src/ir/mark.ts` 字段 + `plot/src/lower/**` 多系列几何）、非 breaking（字段全 optional，省略即退化单系列）。
> - 真源以代码为准：`PlotArrangement` / `ArrangementType` 与 line / interval 的 `series` / `arrangement` / `y0Field` / `y1Field`（`packages/plot/plot/src/ir/mark.ts`，导出在 `ir/index.ts`）；多系列分子 Scope、dodge 切子带（宽 `bandwidth/K`、中心偏移）、stack 读 y0/y1 的几何在 `packages/plot/plot/src/lower/mark.ts`，series + color 解析与 y 域上界由 `packages/plot/plot/src/lower/expand.ts` 传入。复用 [ADR-01](./01-band-scale.md) `inferCategoryDomain` / `bandwidth`、消费 [ADR-03](./03-transform.md) stack y0/y1、[ADR-04](./04-color-scale.md) 子 Scope 着色。
> - 测试见 `packages/plot/plot/tests/ir/mark.schema.test.ts`（series / arrangement schema、bad value 拒、line `arrangement` 静默 strip）与 `packages/plot/plot/tests/lower/lowerPlots.test.ts`（dodge 子带宽 = bandwidth/K + 偏移、stack 段衔接、多线分组各一色、缺系列对齐留空、series 省略退化单系列、stack 缺 y0/y1 抛错、端到端消费 transform）。
> - 完整施工契约（Schema 改动表 / 测试象限 / 文件 scope）见本 ADR Proposed commit。

> 🔖 封板压缩 commit `82295fcc`；压缩前完整施工蓝图 = `git show 82295fcc^:notes/decisions/plot/v0/v0.1/v0.1-alpha.3/05-relation.md`。
