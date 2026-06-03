# ADR-08：React 组合 DSL（`<Plot>` + `<LineMark>` / `<PointMark>`，自动推断 scale / coordinate）

- 状态：Proposed
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略](../roadmap.md) · [plot-design.md §5.2 Primitive API / §6.1](../../../../../architecture/plot-design.md) · 依赖：[ADR-07 薄包装](./07-plot-bindings.md) · [ADR-01~06](./01-plot-spec-root.md) · core 抽象分层（Sugar = builder、不在 render 栈）见 [CLAUDE.md / AGENTS.md]

## 背景

[ADR-07](./07-plot-bindings.md) 的 `<Plot spec={…} data={…}/>` 要求用户**手写整份 PlotSpec 对象**。对照 Recharts / Observable Plot（plot-design §6.1 明确「像 Recharts 那样自由组合」），更友好的是**用 JSX 子组件声明图层**，由 adapter 拼成 PlotSpec：

```tsx
<Plot data={rows}>
  <LineMark x="month" y="revenue" order="month" />
  <PointMark x="month" y="revenue" />
</Plot>
```

用户不写 `scales` / `coordinate` / `namespace` / `data.ref` 这些结构噪声——alpha.1 只有 linear + cartesian2D，**这些可由 mark 的 x/y 自动推断**。这正是我们之前对齐的「JSX 是 authoring 面、PlotSpec 是规范化 IR，builder 在中间装配」。

本 ADR 在 plot-react 上加这层组合 DSL；vanilla 的链式 builder 留后续（vanilla 已有 ADR-07 的 `renderPlot`）。

## 决策：children 经 builder 装配成 PlotSpec，自动建 linear scale + cartesian2D

`<Plot>` 不在 render 栈上跑子组件，而是**同步读取 `props.children` 的元素 + props**（像 core Sugar：builder 调用、**不能用 hooks**），装配出 PlotSpec，再走 ADR-07 的渲染路径。mark 组件本身只承载配置（不渲染）。

```tsx
// packages/plot/react/src/dsl/buildPlotSpec.ts —— 纯函数，便于等价性测试
export const buildPlotSpec = (children: ReactNode, dataRef: string): PlotSpec => {
  const marks = collectMarks(children); // 从 <LineMark>/<PointMark> 读 type + x/y/order
  return {
    namespace: 'plot',
    type: 'plot',
    data: { ref: dataRef },
    // alpha.1：每轴自动建 linear scale + cartesian2D 绑定（用户不写）
    scales: [{ type: 'linear', name: AUTO_X }, { type: 'linear', name: AUTO_Y }],
    coordinate: { type: 'cartesian2D', x: AUTO_X, y: AUTO_Y },
    marks, // 每个 = { type, encoding:{ x:{field}, y:{field} }, order? }
  };
};

// packages/plot/react/src/dsl/Plot.tsx（组合版，与 ADR-07 的薄 <Plot spec> 同名不同入口，见待决策点）
const Plot: FC<PlotDslProps> = props => {
  const { data, children, width, height, ...rest } = props;
  const dataRef = '__plot';
  const spec = buildPlotSpec(children, dataRef);
  return <Layout ir={{ version: 1, type: 'scene', children: [spec] }} composites={lowerPlots({ [dataRef]: data }, { width, height })} width={width} height={height} {...rest} />;
};
```

组件集（alpha.1）：

- `<Plot data={rows} width? height?>` —— 根，收单数据集（裸 `rows`）+ 子图层；内部生成内部 ref、装配 spec、渲染。
- `<LineMark x={fieldPath} y={fieldPath} order?={fieldPath} />` —— 折线图层。
- `<PointMark x={fieldPath} y={fieldPath} />` —— 散点图层。

理由：

1. **结构噪声归零**：用户只声明「画什么」（mark + 绑哪个字段），scales / coordinate / namespace / ref 由 builder 补——对齐 Recharts / ggplot 的隐式 scale 体验（plot-design §6.1）。
2. **JSX ≠ IR，builder 装配**：DSL 形态自由，PlotSpec 仍规范化；二者解耦，DSL 升级不动 IR。
3. **builder 纯函数 + 等价性硬规则**：`buildPlotSpec` 是纯函数，**产出 PlotSpec 必须等价于手写**（每种 DSL 组合配一条 `expect(buildPlotSpec(<DSL/>)).toEqual(handWritten)` 测试，仿 core Sugar=Kernel 等价性）。
4. **复用 ADR-07 渲染路径**：装配后仍走 `<Layout ir composites={lowerPlots(...)}>`，不引入新渲染机制；data 仍走 datasets 注入、不进 IR。
5. **不在 render 栈 / 无 hooks**：mark 组件是配置载体，`<Plot>` 同步内省 children；与 core Sugar 一致，避免 hooks 误用。

## 待决策点

- **`<Plot>` 双入口同名**：ADR-07 的薄 `<Plot spec data/>` 与本 ADR 的组合 `<Plot data>{children}</Plot>`。方案：**同一个 `<Plot>` 按 props 分流**——给 `spec` 走薄路径，给 `children` 走 DSL 装配（二者互斥，refine）。备选：组合版叫别的名（`<PlotChart>`）。倾向同名分流（一个入口、最少概念）。
- **data prop 形态**：组合 DSL 收**裸 `rows`**（单数据集，内部包成 `{ [ref]: rows }`），比薄包装的 `ExternalDatasets` 更省事；多数据集留后续。
- **mark x/y prop**：alpha.1 仅**字段路径字符串**（数据驱动）。常量通道（`{ value }`）DSL 形态留后续（先用薄 `spec` 路径表达）。
- **自动 scale 命名**：内部固定名（如 `__x` / `__y`），用户不可见。需要 scale 配置（domain/nice/log…）时 alpha.3 再加显式 `<Scale>` / mark 上的 scale props（非破坏）。
- **vanilla 链式 builder**（`plot(rows).line({…}).point({…}).toSVG()`）：本 ADR 不含，留后续；vanilla 当前用 ADR-07 的 `renderPlot(spec, data)`。

## DSL 表面

```tsx
import { Plot, LineMark, PointMark } from '@retikz/plot-react';

const rows = [{ month: 0, revenue: 10 }, { month: 1, revenue: 14 }, { month: 2, revenue: 9 }];

// 折线 + 散点叠加：用户不写 scales / coordinate / ref
<Plot data={rows} width={480} height={300}>
  <LineMark x="month" y="revenue" order="month" />
  <PointMark x="month" y="revenue" />
</Plot>;
```

装配出的 PlotSpec 等价于手写：

```ts
{ namespace:'plot', type:'plot', data:{ ref:'__plot' },
  scales:[{type:'linear',name:'__x'},{type:'linear',name:'__y'}],
  coordinate:{ type:'cartesian2D', x:'__x', y:'__y' },
  marks:[
    { type:'line', order:'month', encoding:{ x:{field:'month'}, y:{field:'revenue'} } },
    { type:'point', encoding:{ x:{field:'month'}, y:{field:'revenue'} } },
  ] }
```

## 测试设计

`packages/plot/react/tests/dsl/buildPlotSpec.test.ts`（纯装配，等价性）+ `Plot.dsl.test.tsx`（渲染）覆盖：DSL → PlotSpec 等价手写；单 line / 单 point / line+point 叠加；缺 mark（空 children）行为；渲染产出非空 SVG。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/react/src/dsl/**`**（新建）：`buildPlotSpec`、`<LineMark>` / `<PointMark>` 配置组件、组合 `<Plot>`（或薄/组合分流）。
- **`packages/plot/react/src/index.ts`**（修改）：导出 `Plot`（分流版）/ `LineMark` / `PointMark`。
- **对 plot 本体 / lowering**：无改动；DSL 只装配 PlotSpec、复用 ADR-06/07。
- **对文档站**：plot 文档 demo 优先用组合 DSL（最可读），薄 `spec` 形态作进阶/对照。
- **对外 API**：`@retikz/plot-react` 公开 `LineMark` / `PointMark` + `<Plot>` 组合用法。

## 不在本 ADR 范围

- **显式 `<Scale>` / `<Cartesian2D>` 组件、scale 配置 props（domain/nice/log）、非位置通道（color/size）** → alpha.3（届时 DSL 加对应组件/props，非破坏）。
- **常量通道 DSL 形态、多数据集 / per-mark data** → 后续。
- **vanilla 链式 builder** → 后续（vanilla 用 ADR-07 `renderPlot`）。
- **交互（事件 / 回调 / 水合）** → v0.3。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/react/src/index.ts`（公开 API 加 DSL 组件）→ red。

### Schema 改动

无（DSL 不碰 IR schema；`buildPlotSpec` 产出的是现有 `PlotSpecSchema` 实例，可经它校验）。

### 文件 scope

- `packages/plot/react/src/dsl/buildPlotSpec.ts`（新建：纯装配 + `collectMarks`）
- `packages/plot/react/src/dsl/marks.tsx`（新建：`LineMark` / `PointMark` 配置组件 + props 类型）
- `packages/plot/react/src/dsl/Plot.tsx` 或改 `src/Plot.tsx`（薄/组合分流；见待决策点）
- `packages/plot/react/src/index.ts`（修改：补 DSL 导出）
- `packages/plot/react/tests/dsl/buildPlotSpec.test.ts`（新建）
- `packages/plot/react/tests/dsl/Plot.dsl.test.tsx`（新建）

### 测试象限

**Happy path**：

- `dsl_line_builds_equivalent_spec`：`<Plot data><LineMark x y order/></Plot>` 的 `buildPlotSpec` → `.toEqual(手写 PlotSpec)`
- `dsl_point_builds_equivalent_spec`：单 point 版等价
- `dsl_line_plus_point_two_layers`：line+point 叠加 → marks 两项、共享 scales/coordinate

**边界**：

- `dsl_built_spec_passes_schema`：`PlotSpecSchema.parse(buildPlotSpec(...))` 通过（装配产物是合法 IR）
- `dsl_empty_children_rejected`：无 mark 子节点 → 装配出 `marks:[]` 被 `PlotSpecSchema`（`.min(1)`）拒（或装配期报错）

**错误路径**：

- `dsl_mark_missing_xy`：mark 缺 x/y → encoding 缺通道（schema 允许 optional，但 lowering 跳过；本 case 锁 DSL 不强补）

**交互**：

- `dsl_render_matches_spec_path`：组合 `<Plot data>` 渲染 与 薄 `<Plot spec data>`（等价 spec）渲染 产同一 scene（验证 DSL 只是装配、渲染同源）
- `dsl_plot_renders_svg`：组合 `<Plot>` 端到端渲出非空 SVG（path + circle）

### 依赖现有元素

- [ADR-07](./07-plot-bindings.md) 的 `<Plot>` 渲染路径（`Layout ir + composites`）—— **复用 / 扩展**：组合版装配 spec 后走同一路径。
- `@retikz/plot` 的 `PlotSpecSchema` / `PlotSpec` / `lowerPlots` —— **消费**：装配产物 + 校验 + 渲染。
- `@retikz/react` 的 `Layout` —— **消费**。
- core 抽象分层「Sugar = builder、不在 render 栈、无 hooks」—— **约束**：mark 组件是配置载体，`<Plot>` 同步内省 children。
