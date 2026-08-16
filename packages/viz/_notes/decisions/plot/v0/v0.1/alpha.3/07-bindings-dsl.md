# ADR-07：三包 DSL 露出（&lt;BarMark&gt;、series/stack/color props、scale 类型选择；vanilla / docs 同步）

- 状态：Superseded
- 替代：[beta.2 ADR-02](../beta.2/02-plot-vanilla-plain-api.md)；React / Vanilla authoring 最终共用 framework-neutral normalization
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §5.2 Primitive API / §6 包结构](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-07 bindings](../alpha.1/07-plot-bindings.md) · [alpha.1 ADR-08 react DSL](../alpha.1/08-plot-react-dsl.md) · [alpha.2 ADR-05 guide DSL](../alpha.2/05-guide-bindings-dsl.md) · 依赖：[ADR-01](./01-band-scale.md)~[ADR-06](./06-time-scale.md)

## 背景

塑造决策的硬约束：

- ADR-01~06 已把 band/point/ordinal/time scale、interval mark、transform、color 通道、relation 做进 `@retikz/plot`（IR + lowering），但用户表面（`@retikz/plot-react` 的 `<Plot>{marks}</Plot>` 组合 DSL、`@retikz/plot-vanilla` builder）一个都没露出。
- alpha.2 的 `buildPlotIR` 只认 `<LineMark>` / `<PointMark>` / `<Axis>`，且**写死自动建两条 linear scale**——alpha.3 的 bar / band / color / time 无从声明。
- 三包 lockstep（roadmap）要求 IR / lowering 加的能力即时随 react / vanilla / docs 同步露出，否则用户只能手写裸 IR spec。

## 决策：builder 升级——按 mark/props 推 scale 类型、装配 transform、补 color/series/arrangement；&lt;BarMark&gt; 新增；vanilla/docs 同步

`buildPlotIR` 从「写死 linear」升为**按收集到的 mark 推断 scale 类型**：x scale 类型 = 若存在 `<BarMark>` 则 band、否则按显式 `scaleX` prop（`linear`/`time`/`point`）、缺省 linear；y 缺省 linear；任一 mark 带 `color` → 自动加一条 ordinal scale 并把 color 通道 `scale` 指向它。`<BarMark stack>` 时同时往 `transform` 推一条 stack op（`x`/`y`/`groupBy` 取自该 mark 的 x/y/series），并给 mark 设 `arrangement:'stack'`；`<BarMark series>` 无 stack → `arrangement:'dodge'`。产出仍须**等价于手写 IRPlot**（仿 core Sugar=Kernel；每能力配 `toEqual` 等价性测试）。

决策性的用户表面（字面即决策，完整示例见文档站）：

```tsx
// <BarMark>：x/y 字段 + color（→ color 通道 + 自动 ordinal scale）
//   series（多组柱）、stack（堆叠：装配 stack transform + arrangement:stack；否则有 series 即 dodge）
<Plot data={sales}><BarMark x="month" y="revenue" series="product" stack /></Plot>
// <Plot scaleX="time">：连续型显式选 linear/time/point；柱状自动 band
<Plot data={trend} scaleX="time"><LineMark x="date" y="value" color="city" series="city" /></Plot>
```

`LineMark` / `PointMark` 加可选 `color?`，line 另有 `series?`。

理由：

1. **lockstep 要求能力即时露出**（roadmap）：IR / lowering 加的东西若不进 DSL，用户只能手写 spec，文档示例退化为低可读的裸 IR——违背 plot v0.1「authoring 绑定随 plot 同步」。
2. **builder 推 scale 类型 = 免用户写 scale 样板**：alpha.2 已隐藏 scale（自动 linear）；alpha.3 延续——`<BarMark>` 自动 band x、`color` 自动 ordinal，用户只声明 mark + 字段。需要连续非 linear（time）时用 `scaleX` prop 显式点名（数据在 build 时不可见、time 无法从值自动判定，必须显式）。
3. **`<BarMark stack>` 一处声明、装配 transform+arrangement+字段对齐**：避免用户手动保证 transform 的 `startField` 与 mark 的 `y0Field` 同名（[ADR-05](./05-relation.md) 待决策点的对齐风险由 builder 兜）。
4. **等价性测试守 Sugar=Kernel**：DSL 不引入新能力，每条糖产出 = 手写 spec，回归靠 `buildPlotIR` 的 `toEqual` 测试（沿用 alpha.1/alpha.2）。

### 已拍板的取舍

- **scale 类型选择：推断优先、显式 prop 补连续型区分**：x 优先按 mark 推断（有 BarMark → band），连续型的 linear vs time 用 `<Plot scaleX="time">` 显式 prop（time 无法从未见数据自动判定）。备选「per-mark scale 类型 hint」更细但更啰嗦——alpha.3 先 `<Plot>` 级。`scaleX` 的 prop 落点在 `Plot.tsx`（`PlotDslProps`）透传进 builder options，不在 builder 自身。
- **color 字段默认 == series 字段**：`<BarMark series="p">` 未给 `color` 时默认 `color = series`（最常见：分系列即按系列上色）；显式 `color` 覆盖。`<LineMark series>` 同理。
- **stack vs dodge**：bar 有 `series` 时 `stack` prop true → 堆叠、否则 dodge（默认）。不引第三态。
- **混合 mark 的 x scale 冲突**：同一 `<Plot>` 既有 `<BarMark>`（要 band x）又有 `<LineMark>`（连续 x）——以 BarMark 优先（band），line 落在 band 中心（band 的 `coordinate` 居中，line 连各类别中心，合理）。

## 不在本 ADR 范围

- **`<Scale>` 完全显式 scale 声明子组件、per-mark scale hint、双 x scale** → 后续。
- **legend 组件 / 图例** → 后续（[ADR-04](./04-color-scale.md) 已划走）。
- **横向柱 / 百分比堆叠 props** → 后续。
- **plot 文档站正文散文**（非 demo）→ 文档优化轨（本分支单独推进）。

---
