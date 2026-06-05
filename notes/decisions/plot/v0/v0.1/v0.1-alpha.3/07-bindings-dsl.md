# ADR-07：三包 DSL 露出（&lt;BarMark&gt;、series/stack/color props、scale 类型选择；vanilla / docs 同步）

- 状态：Accepted（已实现）
- 决策日期：2026-06-05
- 关联：[plot v0.1-alpha.3 待办](./roadmap.md) · [plot-design.md §5.2 Primitive API / §6 包结构](../../../../../architecture/plot-design.md) · 回溯：[alpha.1 ADR-07 bindings](../v0.1-alpha.1/07-plot-bindings.md) · [alpha.1 ADR-08 react DSL](../v0.1-alpha.1/08-plot-react-dsl.md) · [alpha.2 ADR-05 guide DSL](../v0.1-alpha.2/05-guide-bindings-dsl.md) · 依赖：[ADR-01](./01-band-scale.md)~[ADR-06](./06-time-scale.md)

## 背景

ADR-01~06 把 band/point/ordinal/time scale、interval mark、transform、color 通道、relation 都做进了 `@retikz/plot`（IR + lowering）。但用户用的是 `@retikz/plot-react` 的 `<Plot>{marks}</Plot>` 组合 DSL 与 `@retikz/plot-vanilla` 的 builder——alpha.2 的 `buildPlotSpec`（`packages/plot/react/src/components/buildPlotSpec.ts`）只认 `<LineMark>` / `<PointMark>` / `<Axis>`，且**写死自动建两条 linear scale**（`__x` / `__y`）。alpha.3 的新能力一个都没在用户表面露出。

按三包 lockstep（roadmap），本 ADR 把前六条的能力补进 DSL：

- 新增 `<BarMark>`（interval mark），所有 mark 加 `color` / `series` props，bar 加 `stack` / `dodge`。
- builder 不再写死 linear——按 mark / props **选 scale 类型**（bar 的 x → band、color → ordinal、时间 → time）。
- `<BarMark stack>` 自动装配 [ADR-03](./03-transform.md) stack transform（字段与 mark 对齐）。
- vanilla `renderPlot` 同步；docs 加柱状 / 分组 / 堆叠 / 多线 / 时间轴 demo。

## 决策：builder 升级——按 mark/props 推 scale 类型、装配 transform、补 color/series/arrangement；&lt;BarMark&gt; 新增；vanilla/docs 同步

`buildPlotSpec` 从「写死 linear」升为**按收集到的 mark 推断 scale 类型**：x scale 类型 = 若存在 `<BarMark>` 则 band、否则按显式 `scaleX` prop（`linear`/`time`/`point`）、缺省 linear；y 缺省 linear；任一 mark 带 `color` → 自动加一条 ordinal scale 并把 color 通道 `scale` 指向它。`<BarMark stack>` 时同时往 `transform` 推一条 stack op（`x`/`y`/`groupBy` 取自该 mark 的 x/y/series），并给 mark 设 `arrangement:'stack'`；`<BarMark series>` 无 stack → `arrangement:'dodge'`。产出仍须**等价于手写 PlotSpec**（仿 core Sugar=Kernel；每能力配 `toEqual` 等价性测试）。

```tsx
// packages/plot/react/src/components/marks.tsx（新增 BarMark + 扩 props）
export type BarMarkProps = {
  x: string; y: string;
  color?: string;        // 颜色字段（→ color 通道 + 自动 ordinal scale）
  series?: string;       // 系列字段（多组柱）；省略=单系列
  stack?: boolean;       // true=堆叠（装配 stack transform + arrangement:stack）；否则有 series 即 dodge
  id?: string;
};
export const BarMark: FC<BarMarkProps> = () => null;
// LineMark / PointMark 加可选 color?（line 另有 series?）
```

```tsx
// <Plot> 表面（react），scaleX 显式选连续类型；柱状自动 band
<Plot data={data} scaleX="time">
  <LineMark x="date" y="value" color="city" series="city" />
</Plot>

<Plot data={sales}>
  <BarMark x="month" y="revenue" series="product" stack />   {/* 堆叠柱 */}
</Plot>
```

理由：

1. **lockstep 要求能力即时露出**（roadmap）：IR / lowering 加的东西若不进 DSL，用户只能手写 spec，文档示例退化为低可读的裸 IR——违背 plot v0.1「authoring 绑定随 plot 同步」。
2. **builder 推 scale 类型 = 免用户写 scale 样板**：alpha.2 已隐藏 scale（自动 linear）；alpha.3 延续——`<BarMark>` 自动 band x、`color` 自动 ordinal，用户只声明 mark + 字段。需要连续非 linear（time）时用 `scaleX` prop 显式点名（数据在 build 时不可见、time 无法从值自动判定，必须显式）。
3. **`<BarMark stack>` 一处声明、装配 transform+arrangement+字段对齐**：避免用户手动保证 transform 的 `startField` 与 mark 的 `y0Field` 同名（[ADR-05](./05-relation.md) 待决策点的对齐风险由 builder 兜）。
4. **等价性测试守 Sugar=Kernel**：DSL 不引入新能力，每条糖产出 = 手写 spec，回归靠 `buildPlotSpec` 的 `toEqual` 测试（沿用 alpha.1/alpha.2）。

## 待决策点

- **scale 类型选择：推断 vs 显式 prop**：x **优先按 mark 推断**（有 BarMark → band），连续型的进一步区分（linear vs time）用 **`<Plot scaleX="time">` 显式 prop**（time 无法从未见数据自动判定）。备选「per-mark scale 类型 hint」更细但更啰嗦——alpha.3 先 `<Plot>` 级。`<Scale>` 子组件（完全显式 scale 声明）留后续。
- **color 字段 == series 字段的默认**：`<BarMark series="p">` 未给 `color` 时，**默认 `color = series`**（最常见：分系列即按系列上色）；显式 `color` 覆盖。`<LineMark series>` 同理。
- **stack vs dodge 选择**：bar 有 `series` 时——`stack` prop true → 堆叠、否则 dodge（默认）。不引第三态；横向 / 百分比堆叠留后续。
- **混合 mark 的 x scale 冲突**：同一 `<Plot>` 既有 `<BarMark>`（要 band x）又有 `<LineMark>`（连续 x）——alpha.3 **以 BarMark 优先（band）**，line 落在 band 中心（band 的 `coordinate` 居中，line 连各类别中心，合理）。真正的「双 x scale」留后续。
- **docs 内容 vs 文档骨架**：plot 文档站当前是**多区骨架、正文待填**（本分支正在做的文档优化，用户已明确「框架搭好、暂不填正文」）。本 ADR 的 demo（柱状 / 分组 / 堆叠 / 多线 / 时间轴）按 lockstep **应当**补，但与「暂不填正文」张力——**倾向：随 ADR-07 实现补 `*.demo.tsx` + `<ComponentPreview>` 到对应页**（基础组件 / 封装组件区），正文散文留文档优化轨；若用户要求严格「只骨架」，则 demo 也暂缓、本 ADR 落「能力可用 + 等价性测试」，文档单独排期。**此点实现前与用户确认**。
- **vanilla 表面**：`renderPlot(spec, data)` 已是「spec 进、SVG 出」，本身不随 mark 种类变；vanilla 侧主要补**文档 SSR 等价示例**与 builder（若 vanilla 也提供组合 builder）。具体对齐 alpha.2 vanilla 做法。

## DSL 表面

```tsx
// 柱状图
<Plot data={sales}><BarMark x="month" y="revenue" /></Plot>

// 分组柱（dodge，按 product 分系列 + 自动上色）
<Plot data={sales}><BarMark x="month" y="revenue" series="product" /></Plot>

// 堆叠柱
<Plot data={sales}><BarMark x="month" y="revenue" series="product" stack /></Plot>

// 多系列折线 + 时间轴
<Plot data={trend} scaleX="time">
  <LineMark x="date" y="value" series="city" order="date" />
</Plot>

// 按字段着色的散点
<Plot data={countries}><PointMark x="gdp" y="life" color="continent" /></Plot>
```

## 测试设计

`packages/plot/react/tests/components/buildPlotSpec.test.tsx`（扩）覆盖：`<BarMark>` 装配等价手写 interval spec；自动 band x scale；`color` → ordinal scale + color 通道 + scale ref；`series` 默认 color=series；`stack` → 装配 stack transform + arrangement + 字段对齐；`dodge` 默认；`scaleX="time"` → time scale；多 mark 收集；vanilla `renderPlot` 端到端出柱状 SVG。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/react/src/components/marks.tsx`**（修改）：新增 `BarMark` + `BarMarkProps`；`LineMark`/`PointMark` 加 `color?`，line 加 `series?`。
- **`packages/plot/react/src/components/buildPlotSpec.ts`**（修改）：`collectInto` 认 `<BarMark>` + 新 props；scale 类型推断（band/time/ordinal）；装配 transform；color/series/arrangement 落位；**`options` 加 `scaleX?`**（连续型选 linear/time/point）。
- **`packages/plot/react/src/Plot.tsx`**（修改，评审 P1-1）：`PlotDslProps` 加 `scaleX?`（现仅有 `bare` 等），透传进 `buildPlotSpec` options——`scaleX="time"` 的 prop 落点在此，不在 builder 自身。
- **`packages/plot/react/src/components/index.ts`**（修改：导出 BarMark）。
- **`packages/plot/vanilla/src/renderPlot.ts`**（按需修改 / 主要文档）：确认柱状 / 多系列 spec 端到端渲染；补 SSR 等价示例。
- **`apps/docs/src/contents/plot/**`**（修改，**视「docs 内容」待决策点**）：柱状 / 分组 / 堆叠 / 多线 / 时间轴 / 着色散点的 `*.demo.tsx` + `<ComponentPreview>`；按 plot 文档骨架（基础组件 `<BarMark>` 页、封装组件相应页）落位。
- **对外 API**：`@retikz/plot-react` 公开 `BarMark` / `BarMarkProps`，mark props 扩 color/series/stack。
- **被依赖**：用户端到端用例；文档站 demo。

## 不在本 ADR 范围

- **`<Scale>` 完全显式 scale 声明子组件、per-mark scale hint、双 x scale** → 后续。
- **legend 组件 / 图例** → 后续（[ADR-04](./04-color-scale.md) 已划走）。
- **横向柱 / 百分比堆叠 props** → 后续。
- **plot 文档站正文散文**（非 demo）→ 文档优化轨（本分支单独推进）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/react/src/**`（含 `index.ts` 公开表面）→ red；docs / 测试 → green，跨级取最高。本 ADR 自评：`red`。

### Schema 改动

无（DSL 层不动 IR schema；scale / mark / transform schema 已在 [ADR-01](./01-band-scale.md)~[ADR-06](./06-time-scale.md) 定稿）。builder 只是装配既有 schema。

### 文件 scope

- `packages/plot/react/src/components/marks.tsx`（修改：BarMark + props）
- `packages/plot/react/src/components/buildPlotSpec.ts`（修改：收集 + scale 推断 + transform 装配 + options.scaleX）
- `packages/plot/react/src/Plot.tsx`（修改：`PlotDslProps` 加 `scaleX?` 并入 builder options——评审 P1-1）
- `packages/plot/react/src/components/index.ts`（修改：导出）
- `packages/plot/vanilla/src/renderPlot.ts`（按需）
- `packages/plot/react/tests/components/buildPlotSpec.test.tsx`（扩）
- `packages/plot/react/tests/components/Plot.composition.test.tsx`（扩：`<Plot scaleX="time">` 透传 / 端到端）
- `packages/plot/vanilla/tests/renderPlot.test.ts`（扩）
- `apps/docs/src/contents/plot/**`（demo + ComponentPreview，视 docs 待决策点）

### 测试象限

**Happy path**：

- `barmark_builds_interval`：`<BarMark x="m" y="r"/>` → 等价手写 `{ type:'interval', encoding:{x,y} }` + band x scale
- `barmark_auto_band_scale`：含 BarMark → scales 含 `{type:'band',name:'__x'}`
- `color_builds_ordinal`：`<PointMark color="c"/>` → color 通道 + 自动 ordinal scale + scale ref 对齐
- `bar_series_dodge_default`：`<BarMark series="p"/>` → arrangement dodge + color=series 默认

**边界**：

- `bar_stack_assembles_transform`：`<BarMark series="p" stack/>` → transform 含 stack op（x/y/groupBy 对齐）+ arrangement stack + y0/y1 字段名一致
- `scalex_time`：`<Plot scaleX="time">` 经 `PlotDslProps` → builder options → x scale type time（覆盖 Plot.tsx 透传 + builder 落位两段）
- `line_series_multi`：`<LineMark series="c"/>` → line.series + color=series 默认
- `no_color_no_ordinal`：无 color → 不产 ordinal scale（不冗余）

**错误路径 / 等价性**：

- `barmark_equivalence`：`buildPlotSpec(<BarMark/>)` `toEqual` 手写 PlotSpec（Sugar=Kernel）
- `stack_equivalence`：堆叠 `<BarMark stack/>` 产物 `toEqual` 手写（transform + mark）
- `bare_ignores_marks_guides`：`bare` 仍 guides:[]（守 alpha.2 行为）

**交互**：

- `mixed_bar_line_band_x`：BarMark + LineMark 同 Plot → x band，line 落 band 中心（不崩、对齐）
- `vanilla_renders_bar`：`renderPlot(barSpec, data)` → 含矩形的 SVG 串（端到端）
- `endtoend_stacked_bar`：堆叠柱 react → lowerPlots → core scene，总高 = 各段和（跨 [ADR-03](./03-transform.md)/[ADR-05](./05-relation.md)）

### 依赖现有元素

- alpha.1 `buildPlotSpec` / `<LineMark>` / `<PointMark>`（`react/src/components/`）—— **修改 / 扩展**。
- alpha.2 `<Axis>` / `DEFAULT_GUIDES` / bare（`react/src/components/`）—— **复用**：guide 装配不变。
- [ADR-01](./01-band-scale.md)~[ADR-06](./06-time-scale.md) 的 schema / lowering —— **消费**：builder 装配它们。
- alpha.1 `renderPlot`（`vanilla/src/renderPlot.ts`）—— **复用 / 验证**：spec 进 SVG 出。
- docs `<ComponentPreview>` / `*.demo.tsx`（`apps/docs/`，见 docs-doc-* SKILL）—— **新增**：能力示例（视 docs 待决策点）。
