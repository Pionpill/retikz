# ADR-07：框架绑定脚手架 + 薄包装（plot-react `<Plot>` / plot-vanilla `renderPlot`）

- 状态：Accepted
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略](../roadmap.md) · [plot-design.md §6 / §13.1](../../../../../architecture/plot-design.md) · 依赖：[ADR-06 lowerPlots](./06-plot-lowering.md) · 后续：[ADR-08 组合 DSL](./08-plot-react-dsl.md)

## 背景

ADR-01~06 让 `@retikz/plot` 能「Plot IR + 数据 → core IR → 渲染」，但 authoring 表面只有**手写 Plot IR 对象 + 手接 lowerPlots**：

```tsx
<Layout ir={{ version: 1, type: 'scene', children: [spec] }} composites={lowerPlots(datasets, { width, height })} />
```

这串太啰嗦、可读性差——文档站示例尤其遭殃。按 [plot v0.1 roadmap「三包 lockstep」](../roadmap.md)，框架绑定从 alpha.1 起就随 plot 同步出（原计划推到 v0.3，已废除）。本 ADR 落**两包脚手架 + 最薄一层包装**，把上面那串收成一个组件 / 一个函数；**组合 DSL（`<LineMark>` 等）是 [ADR-08](./08-plot-react-dsl.md)**，本 ADR 不含。

交互（tooltip / hover / 事件）仍留 v0.3（依赖 core 水合），本 ADR 只做静态 authoring + 渲染。

## 决策：建 plot-react / plot-vanilla 两包，各出一层薄包装

**包结构**（镜像 `packages/core/{react,vanilla}`，glob `packages/*/*` 已覆盖）：

- `packages/plot/react` → `@retikz/plot-react`：deps `@retikz/plot` + `@retikz/react`（`<Layout>`）；React 为 peer。
- `packages/plot/vanilla` → `@retikz/plot-vanilla`：deps `@retikz/plot` + `@retikz/vanilla`（framework-free runtime / SSR）。

**plot-react 薄包装**：`<Plot>` 收一个**已构造好的 PlotSpec** + 数据集，内部接 lowerPlots + `<Layout>`：

```tsx
// packages/plot/react/src/Plot.tsx
import { Layout, type LayoutProps } from '@retikz/react';
import { lowerPlots, type ExternalDatasets, type LowerPlotsOptions, type PlotSpec } from '@retikz/plot';

type PlotProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> &
  LowerPlotsOptions & {
    spec: PlotSpec;
    data: ExternalDatasets;
  };

const Plot: FC<PlotProps> = props => {
  const { spec, data, width, height, ...rest } = props;
  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [spec] }}
      composites={lowerPlots(data, { width, height })}
      width={width}
      height={height}
      {...rest}
    />
  );
};
```

**plot-vanilla 薄包装**：`renderPlot` 产 SVG 串（SSR / framework-free）：

```ts
// packages/plot/vanilla/src/renderPlot.ts
import { compileToScene } from '@retikz/core';
import { renderToSvgString } from '@retikz/vanilla';
import { lowerPlots, type ExternalDatasets, type LowerPlotsOptions, type PlotSpec } from '@retikz/plot';

export const renderPlot = (spec: PlotSpec, data: ExternalDatasets, options: LowerPlotsOptions = {}): string => {
  const validated = PlotSpecSchema.parse(spec); // 入口校验：非法 spec 抛清晰 ZodError，合法 spec 恒等
  const scene = compileToScene(
    { version: 1, type: 'scene', children: [validated] },
    { composites: lowerPlots(data, options) },
  );
  return renderToSvgString(scene);
};
```

> 入口校验（薄包装的唯一「语义」）：两路在转发前对 spec 做一次 `PlotSpecSchema.parse`。合法 spec 为恒等、渲染结果不变；非法 spec（缺 `namespace` / `type` 等判别字段，否则会绕过 composite 路由落到 core 内部崩出与 plot 无关的 TypeError）抛清晰 ZodError，对齐 §7「AI 可据报错自我修正」契约。`<Plot>` 同理在分流后 `parse` 最终 spec。

理由：

1. **消除样板**：`<Plot spec data/>` / `renderPlot(spec, data)` 把「scene 包裹 + lowerPlots 注入 + Layout/compile」收进一处，文档示例从「`<Layout ir composites>` 那串」变干净。
2. **薄=不改渲染语义**：除入口 `PlotSpecSchema.parse`（合法 spec 恒等）外只转发，PlotSpec / lowerPlots / Layout 的渲染语义不变；数据仍走 `datasets` 注入、不进 IR。
3. **两包对称**：react 出组件、vanilla 出函数 + SSR，对齐库「双 runtime」定位（plot-design §6）；组合 DSL（ADR-08）在 plot-react 之上再加。
4. **lockstep 地基**：先把包建起来 + 最薄能渲染，ADR-08 的 DSL、后续 alpha 的新 mark/scale 都在这两包上长。

## 待决策点

- **`<Plot>` 的 data prop 形态**：收 `ExternalDatasets`（`{ name: rows }`，与 spec 的 `data.ref` 对应）。备选：单数据集时收裸 `rows`、内部按 `spec.data.ref` 包成 `{ [ref]: rows }`。倾向收 `ExternalDatasets`（最直接、对齐 lowerPlots；裸 rows 便利留 ADR-08 的 DSL，那里 data 是 prop）。
- **透传哪些 LayoutProps**：alpha.1 透传 width/height/className/style/renderer。其余（idPrefix/nodeDistance/shapes…）按需再开。
- **vanilla 渲染依赖**：`@retikz/vanilla` 的 `renderToSvgString`（SSR）。`mountPlot`（挂 DOM）留按需。
- **包版本**：plot-react / plot-vanilla 跟 `@retikz/plot` 同版本线（0.1.0-alpha.1），三包 lockstep 同改同发。

## DSL 表面

```tsx
import { Plot } from '@retikz/plot-react';
import type { PlotSpec } from '@retikz/plot';

const spec: PlotSpec = { namespace: 'plot', type: 'plot', data: { ref: 'sales' }, scales: [...], coordinate: {...}, marks: [...] };

<Plot spec={spec} data={{ sales: rows }} width={480} height={300} />;
```

```ts
import { renderPlot } from '@retikz/plot-vanilla';
const svg = renderPlot(spec, { sales: rows }, { width: 480, height: 300 }); // SSR：SVG 字符串
```

## 测试设计

`packages/plot/react/tests/Plot.test.tsx`、`packages/plot/vanilla/tests/renderPlot.test.ts` 覆盖：渲染产出非空（react 渲出 SVG 元素 / vanilla 出含 `<svg` 的串）；spec + datasets 透传到 lowerPlots；width/height 透传。具体见「实现契约 § 测试象限」。

## 影响

- **新增两包** `@retikz/plot-react` / `@retikz/plot-vanilla`（脚手架镜像 core/{react,vanilla}）。
- **对 plot 本体**：无改动，仅消费 `lowerPlots` / `PlotSpec` / `ExternalDatasets` / `LowerPlotsOptions`。
- **对文档站**：plot 文档 demo 改用 `<Plot spec data/>`，替换之前 `<Layout ir composites>` 的低可读写法（develop-document 阶段同步）。
- **对外 API**：首次公开 `@retikz/plot-react` 的 `Plot` / `PlotProps`、`@retikz/plot-vanilla` 的 `renderPlot`。

## 不在本 ADR 范围

- **React 组合 DSL（`<LineMark>` / `<PointMark>` + builder + 自动推断 scale/coordinate）** → [ADR-08](./08-plot-react-dsl.md)。
- **交互（tooltip / hover / 事件回调 / 水合）** → v0.3。
- **`@retikz/chart` preset 层** → v0.2+。
- **`mountPlot`（vanilla 挂真实 DOM）/ canvas SSR** → 按需后续。

---

## 实现契约（必填）

### Level

`red`

判级规则（参 [`flow-alpha`](../../../../../../.agents/skills/flow-alpha/SKILL.md) "自动判级"，plot 红线见 [`_template.md`](../../../_template.md)）：

- 新建 `packages/plot/react/src/index.ts` / `packages/plot/vanilla/src/index.ts`（首次公开 API）→ red

### Schema 改动

无（绑定层不碰 IR schema；只消费现有 Plot IR + lowerPlots）。

### 文件 scope

- 包脚手架（前置 setup 性质，本 ADR 内建）：`packages/plot/react/{package.json,tsconfig.json,vite.config.ts,README.md}`、`packages/plot/vanilla/{…}`（镜像 core/react、core/vanilla）
- `packages/plot/react/src/Plot.tsx`（新建）
- `packages/plot/react/src/index.ts`（新建：barrel 导出 `Plot` / `PlotProps`）
- `packages/plot/vanilla/src/renderPlot.ts`（新建）
- `packages/plot/vanilla/src/index.ts`（新建：barrel 导出 `renderPlot`）
- `packages/plot/react/tests/Plot.test.tsx`（新建）
- `packages/plot/vanilla/tests/renderPlot.test.ts`（新建）

### 测试象限

> 本 milestone 放宽「每 ADR ≥ 9 case」，按复杂度适量。

**Happy path**：

- `react_plot_renders_svg`：`<Plot spec data width height/>` 渲染出非空 SVG（含 path/circle 元素）
- `vanilla_renderPlot_returns_svg_string`：`renderPlot(spec, data, opts)` 返回含 `<svg` 的字符串

**边界**：

- `react_plot_omits_size_uses_layout_autofit`：不给 width/height → Layout 自动布局，仍渲染

**错误路径**：

- `plot_ref_not_in_data_throws`：`data` 缺 spec 引用的数据集 → lowerPlots 抛错冒泡（react 渲染期 / vanilla 调用期）

**交互**：

- `react_vanilla_same_scene`：同一 spec+data 经 `<Plot>`（取其内部 IR/scene）与 `renderPlot` 应得等价几何（验证两表面同源）

### 依赖现有元素

- `@retikz/plot` 的 `lowerPlots` / `PlotSpec` / `ExternalDatasets` / `LowerPlotsOptions`（ADR-01~06）—— **消费**。
- `@retikz/react` 的 `Layout` / `LayoutProps`（`ir` + `composites` props）—— **消费**：薄包装的渲染落点。
- `@retikz/vanilla` 的 `renderToSvgString`（SSR）+ `@retikz/core` 的 `compileToScene` —— **消费**：vanilla SVG 产出。
- 不改 core / plot 本体。
