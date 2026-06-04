# ADR-05：三包 guide 露出（`<Axis>` 子组件（含 `grid` prop）、默认自动出、`bare` 开关）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略（三包 lockstep）](../roadmap.md) · 依赖：[ADR-01 guide IR](./01-guide-ir.md) · [ADR-04 guide lowering](./04-guide-lowering.md) · 基座：[alpha.1 ADR-08 组合 DSL](../v0.1-alpha.1/08-plot-react-dsl.md) · [alpha.1 ADR-07 薄包装](../v0.1-alpha.1/07-plot-bindings.md)

## 背景

[ADR-01~04](./01-guide-ir.md) 让 `@retikz/plot` 能产出带轴/网格的图，但 authoring 面还没暴露 guide——用户写 [alpha.1 ADR-08](../v0.1-alpha.1/08-plot-react-dsl.md) 的 `<Plot data>{marks}` 仍是无轴图。按三包 lockstep（每加 plot 能力，react/vanilla/docs 同步露出），本 ADR 在组合 DSL 上加 `<Axis>` 子组件（网格经其 `grid` prop 表达——grid 是 axis 子属性，见 [ADR-01](./01-guide-ir.md)），并落实对齐的两条产品决策：**默认自动出轴和网格**、**提供 `bare` 总开关「什么都不出、只绘图」**。

## 决策：`<Axis>` 配置子组件（网格走 `grid` prop）；无 axis 子组件→默认全套；有则显式所得；`bare`→纯绘图

`<Axis>` 与 `<LineMark>`/`<PointMark>` 同构——**配置载体**（返回 `null`、不进 render 栈、无 hooks），由 `buildPlotSpec` 同步内省装配进 `PlotSpec.guides`。**网格不是独立组件**：它是这根轴的 `grid` 布尔 prop（`<Axis dimension="y" grid />`），与 IR 的 `axis.grid` 一一对应。装配规则：

- **`bare`**：`<Plot bare>` → `guides: []` 且布局不留 margin（plot area = 整图）= alpha.1 行为；忽略任何 `<Axis>`。
- **无任何 `<Axis>` 子组件**：默认填 `DEFAULT_GUIDES = [axis x, {axis y, grid:true}]`（双轴 + y 轴带网格，开箱即用、不过密——评审 P2.6 统一措辞）。
- **写了任意 `<Axis>`**：**完全显式所得**（不再补默认）——`<Axis dimension="x"/>` 单独写就只出 x 轴、无网格，精确可控。

```tsx
// packages/plot/react/src/dsl/guides.tsx —— 配置载体，仿 marks.tsx
export type AxisProps = { dimension: 'x' | 'y'; tickCount?: number; tickLabels?: boolean; grid?: boolean; id?: string };
export const Axis: FC<AxisProps> = () => null;

// packages/plot/react/src/dsl/buildPlotSpec.ts —— 扩展：收集 guides + 默认/ bare
const DEFAULT_GUIDES: Array<Guide> = [
  { type: 'axis', dimension: 'x' },
  { type: 'axis', dimension: 'y', grid: true }, // 默认仅 y 轴带网格（横线读数值，克制）；x 网格写 <Axis dimension="x" grid />
];
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: { bare?: boolean } = {}): PlotSpec => {
  const marks = collectMarks(children);
  const explicit = collectGuides(children);          // <Axis> → Guide[]
  const guides = options.bare ? [] : explicit.length > 0 ? explicit : DEFAULT_GUIDES;
  return { namespace:'plot', type:'plot', data:{ ref:dataRef }, scales:[…], coordinate:{…}, marks, guides };
};
```

`<Plot>` 加 `bare?: boolean`（DSL 入口），透传 `fontSize` / `margin`（[ADR-03](./03-plot-area-layout.md)）给 `lowerPlots`：

```tsx
// PlotDslProps += { bare?: boolean }；PlotCommonProps += { fontSize?, margin? }（透传 lowerPlots）
const spec = buildPlotSpec(props.children, DSL_DATA_REF, { bare: props.bare });
<Layout ir={{version:1,type:'scene',children:[spec]}} composites={lowerPlots({[DSL_DATA_REF]: props.data}, { width, height, fontSize, margin })} … />
```

**vanilla（无新组件，spec 直写）**：`renderPlot(spec, data, opts)` 的 `spec.guides` 即所得；「默认自动出」「bare」是 DSL builder 的便利，vanilla 显式列 `guides`（或不列 = 无轴）。文档 vanilla 视图展示带 `guides` 的 spec。

理由：

1. **子组件与 marks 同构**：`<Axis>` 沿用 [alpha.1 ADR-08](../v0.1-alpha.1/08-plot-react-dsl.md) 的「配置载体 + builder 同步装配」范式，零新机制、无 hooks；网格不另起组件，作 `grid` prop 与 IR `axis.grid` 对齐。
2. **默认全套 + 显式所得**：开箱即出完整轴网格（用户拍板「默认自动出」），一旦显式写就完全交给用户（可预测、无「显式+默认混合」的惊讶）。
3. **`bare` = 回到 alpha.1**：总开关产 `guides:[]` + 无 margin，等价 alpha.1 纯绘图——叙述性插图 / 极简场景用（属性名 `bare` 经用户确认）。
4. **IR 仍显式**：builder 把默认 / bare 都落成显式 `guides`，渲染走 [ADR-04](./04-guide-lowering.md)；vanilla 直接写 `guides`，两表面同一 IR。
5. **lockstep**：react 出子组件、vanilla 出 spec 字段、docs 出带轴 demo，同一改动集。

## 待决策点

- **默认网格范围（已采纳评审 I2）**：`DEFAULT_GUIDES` = 双轴 + **仅 y 轴带网格**（横线读数值，对齐 d3 / Observable Plot 常规、不过密）。想要 x 网格显式写 `<Axis dimension="x" grid />`。若 review 想要双向 / 无默认网格再调。
- **网格作 `grid` prop（已定，随 [ADR-01](./01-guide-ir.md) 决策）**：网格是 `<Axis>` 的布尔 prop（`<Axis dimension="y" grid />`），不是独立 `<Grid>` 组件——与 IR `axis.grid` 一一对应，避免 DSL 与 IR 结构错位。曾计划独立 `<Grid>` 组件，随 ADR-01 把 grid 收为 axis 子属性而取消。
- **显式语义**：「写任意 `<Axis>` → 完全显式、不补默认」(i) vs「按类型补缺省」(ii)。倾向 **(i)**（所见即所得、可预测）。
- **`bare` 与显式 `<Axis>` 并存**：`bare` 优先、忽略子组件（什么都不出）。备选：并存即报错 / warn。倾向静默 `bare` 优先。
- **属性名 `bare`**：已确认。备选 `guides={false}` / `frameless`。
- **`<Axis>` 维度 prop 命名（已定）**：用 `dimension`（对齐 IR + AGENTS「不缩写」规则）；缩写 `dim` 违规已弃。
- **`label` → `tickLabels` 改名（已采纳评审 I3）**：axis 控制刻度文字开关的字段叫 `tickLabels`（不叫 `label`）——避免与未来轴标题（axis title，常被叫 label）混淆，省一次 future rename。IR（[ADR-01](./01-guide-ir.md)）同步改名。

## DSL 表面

**react**：

```tsx
import { Plot, LineMark, Axis } from '@retikz/plot-react';

// 默认：自动出 x/y 轴 + y 网格
<Plot data={rows} width={480} height={300}><LineMark x="month" y="revenue" order="month" /></Plot>;

// 显式定制：x 轴（无网格）+ y 轴带网格并指定刻度数
<Plot data={rows} width={480} height={300}>
  <LineMark x="month" y="revenue" />
  <Axis dimension="x" />
  <Axis dimension="y" tickCount={5} grid />
</Plot>;

// 裸图（无轴无网格，= alpha.1）
<Plot data={rows} width={480} height={300} bare><LineMark x="month" y="revenue" /></Plot>;
```

**vanilla**：

```ts
import { renderPlot } from '@retikz/plot-vanilla';
const spec = { namespace:'plot', type:'plot', data:{ ref:'sales' }, scales:[…], coordinate:{…},
  marks:[{ type:'line', order:'month', encoding:{ x:{field:'month'}, y:{field:'revenue'} } }],
  guides:[{ type:'axis', dimension:'x' }, { type:'axis', dimension:'y', grid:true }] };
const svg = renderPlot(spec, { sales }, { width: 480, height: 300 });   // 不写 guides = 裸图
```

## 测试设计

`packages/plot/react/tests/dsl/buildPlotSpec.test.tsx`（修改）：无 `<Axis>` 子组件→`guides`=默认全套；显式 `<Axis>`→`guides`=显式；`<Axis grid/>`→`guides[i].grid===true`；`bare`→`guides:[]`；`<Axis dimension tickCount tickLabels grid id>`→字段对；装配产物过 `PlotSpecSchema`。`Plot.dsl.test.tsx`（修改）：默认 `<Plot>` 端到端渲出轴线 path + 刻度文字 + y 网格线；`bare` 渲出无轴（等价 alpha.1 几何）。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/react/src/dsl/guides.tsx`**（全新）：`Axis` + `AxisProps`（含 `grid`）。
- **`packages/plot/react/src/dsl/buildPlotSpec.ts`**（修改）：`collectGuides` + 默认 / bare 装配；`buildPlotSpec` 加 `options.bare`。
- **`packages/plot/react/src/Plot.tsx`**（修改）：`PlotDslProps` 加 `bare?`；`PlotCommonProps` 加 `fontSize?` / `margin?` 透传 `lowerPlots`。
- **`packages/plot/react/src/dsl/index.ts` / `src/index.ts`**（修改）：导出 `Axis` / `AxisProps`。
- **`@retikz/plot-vanilla`**：无代码改动（`renderPlot` 已支持任意 spec）；仅文档示例带 `guides`。
- **文档**（develop-document 阶段）：`apps/docs/.../plot/introduction` 的 line-scatter demo 默认出轴（mdx + demo + vanilla override 同步）；补 `bare` / 定制轴示例（含 `grid` prop）+ API 表（`<Axis>`/`bare`）。
- **对外 API**：`@retikz/plot-react` 公开 `Axis` / `bare` / `fontSize` / `margin`。

## 不在本 ADR 范围

- **vanilla 链式 builder（`plot(rows).line().axis()…`）** → 后续（alpha.1 ADR-08 已记 vanilla DSL 留后续）。
- **轴标题 / legend / reference line DSL** → 后续。
- **per-coordinate `<Axis>`（facet 内）** → facet milestone（[ADR-01](./01-guide-ir.md) 预留）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/react/src/index.ts`（公开 API 加 DSL 组件）→ red。本 ADR 自评：`red`。

### Schema 改动

无（DSL 装配 [ADR-01](./01-guide-ir.md) 的现有 guide IR；`buildPlotSpec` 产出经 `PlotSpecSchema` 校验）。

### 文件 scope

- `packages/plot/react/src/dsl/guides.tsx`（新建：`Axis` + `AxisProps`，含 `grid` prop）
- `packages/plot/react/src/dsl/buildPlotSpec.ts`（修改：`collectGuides` + 默认 / bare）
- `packages/plot/react/src/Plot.tsx`（修改：`bare` + `fontSize`/`margin` 透传）
- `packages/plot/react/src/dsl/index.ts`（修改：导出 guides）
- `packages/plot/react/src/index.ts`（修改：补导出）
- `packages/plot/react/tests/dsl/buildPlotSpec.test.tsx`（修改）
- `packages/plot/react/tests/dsl/Plot.dsl.test.tsx`（修改）
- `apps/docs/src/contents/plot/introduction/index.zh.mdx` / `index.en.mdx`（修改：带轴说明 + API）
- `apps/docs/src/contents/plot/introduction/line-scatter.demo.tsx` / `line-scatter.vanilla.ts`（修改：默认出轴）

### 测试象限

**Happy path**：

- `dsl_default_guides`：`<Plot data><LineMark/></Plot>`（无 `<Axis>` 子组件）→ `guides` = `DEFAULT_GUIDES`（含 `{axis y, grid:true}`）
- `dsl_explicit_axis_only`：写 `<Axis dimension="x"/>` → `guides` 仅 `[{axis,x}]`（显式所得、无网格）
- `dsl_axis_fields`：`<Axis dimension="y" tickCount={5} tickLabels={false} grid id="yA"/>` → guide 字段逐一对（`grid:true`）
- `dsl_built_guides_pass_schema`：装配产物过 `PlotSpecSchema`

**边界**：

- `dsl_bare_empty_guides`：`<Plot bare>` → `guides: []`
- `dsl_axis_with_grid`：`<Axis dimension="y" grid/>` → `guides` 仅 `[{axis,y,grid:true}]`（显式所得，无默认 x 轴）
- `dsl_bare_ignores_axis`：`<Plot bare><Axis/></Plot>` → `guides: []`（bare 优先）

**错误路径**：

- `dsl_axis_bad_dim_type`：`<Axis dimension="z"/>` → 装配产物经 `PlotSpecSchema` 被拒（nativeEnum）

**交互（端到端 / 等价）**：

- `dsl_default_renders_axis`：默认 `<Plot>` 渲出轴线 path + 刻度文字 + y 网格横线（含 `<path` 与刻度数字文本）
- `dsl_bare_equals_alpha1_geometry`：`<Plot bare>` 渲染几何等价于无 guides 的 spec 入口（plot area = 整图）

### 依赖现有元素

- [ADR-01 guide IR / `GuideSchema` / `Guide`](./01-guide-ir.md) —— **消费**：装配目标。
- [ADR-03 `LowerPlotsOptions.fontSize` / `margin`](./03-plot-area-layout.md) —— **透传**。
- [ADR-04 guide lowering](./04-guide-lowering.md) —— **渲染依赖**：端到端验证。
- alpha.1 `buildPlotSpec` / `collectMarks` / `<Plot>` / `lowerPlots`（[ADR-07](../v0.1-alpha.1/07-plot-bindings.md) / [ADR-08](../v0.1-alpha.1/08-plot-react-dsl.md)）—— **扩展**：复用装配 + 渲染路径。
- `@retikz/react` `Layout` —— **消费**。
