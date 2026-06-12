# ADR-07：框架绑定脚手架 + 薄包装（plot-react `<Plot>` / plot-vanilla `renderPlot`）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略](../roadmap.md) · [plot-design.md §6 / §13.1](../../../../../architecture/plot-design.md) · 依赖：[ADR-06 lowerPlots](./06-plot-lowering.md) · 后续：[ADR-08 组合 DSL](./08-plot-react-dsl.md)

## 背景 / 约束

ADR-01~06 让 `@retikz/plot` 能「Plot IR + 数据 → core IR → 渲染」，但 authoring 表面只有手写 Plot IR 对象 + 手接 `<Layout ir={{...}} composites={lowerPlots(...)}/>` 那串——啰嗦、文档示例尤其遭殃。按 plot v0.1 roadmap「三包 lockstep」，框架绑定从 alpha.1 起就随 plot 同步出（原计划推到 v0.3，已废除）。本 ADR 落两包脚手架 + 最薄一层包装，把那串收成一个组件 / 一个函数；交互（tooltip / hover / 事件，依赖 core 水合）仍留 v0.3，本 ADR 只做静态 authoring + 渲染。

## 决策：建 plot-react / plot-vanilla 两包，各出一层薄包装

**包结构**（镜像 `packages/core/{react,vanilla}`，glob `packages/*/*` 已覆盖）：

- `packages/plot/react` → `@retikz/plot-react`：deps `@retikz/plot` + `@retikz/react`（`<Layout>`），React 为 peer。
- `packages/plot/vanilla` → `@retikz/plot-vanilla`：deps `@retikz/plot` + `@retikz/vanilla`（framework-free runtime / SSR）。

**薄包装**：react 的 `<Plot spec data width height/>` 内部接 `lowerPlots` + `<Layout ir composites>`；vanilla 的 `renderPlot(spec, data, options?)` 经 `compileToScene` + `renderToSvgString` 产 SVG 串（SSR）。两路在转发前对 spec 做一次 **`PlotSpecSchema.parse`**（薄包装的唯一「语义」）：合法 spec 为恒等、渲染结果不变；非法 spec（缺 `namespace` / `type` 等判别字段，否则会绕过 composite 路由落到 core 内部崩出与 plot 无关的 TypeError）抛清晰 ZodError，对齐 plot-design §7「AI 可据报错自我修正」契约。

理由：

1. **消除样板**：`<Plot spec data/>` / `renderPlot(spec, data)` 把「scene 包裹 + lowerPlots 注入 + Layout/compile」收进一处，文档示例从「`<Layout ir composites>` 那串」变干净。
2. **薄 = 不改渲染语义**：除入口 `PlotSpecSchema.parse`（合法 spec 恒等）外只转发；数据仍走 `datasets` 注入、不进 IR。
3. **两包对称**：react 出组件、vanilla 出函数 + SSR，对齐库「双 runtime」定位（plot-design §6）。
4. **lockstep 地基**：先把包建起来 + 最薄能渲染，ADR-08 的 DSL、后续 alpha 的新 mark/scale 都在这两包上长。

### 设计细节（具体决策）

- **`<Plot>` 的 data prop 收 `ExternalDatasets`**（`{ name: rows }`，对齐 `spec.data.ref` 与 lowerPlots）——最直接；裸 rows 便利留 ADR-08 的组合 DSL。
- **透传哪些 LayoutProps**：alpha.1 透传 `width` / `height` / `className` / `style` / `renderer`；其余按需再开。
- **vanilla 渲染依赖**：`@retikz/vanilla` 的 `renderToSvgString`（SSR）；`width`/`height` 既喂 lowerPlots（绘图区 user units），也注入 `<svg>` 像素尺寸（与 React `<Plot width height>` 对齐）。`mountPlot`（挂真实 DOM）留按需。

### 未来兼容性考虑

plot-react / plot-vanilla 跟 `@retikz/plot` 同版本线，三包 **lockstep 同改同发**——绑定层依赖 plot 本体的公开 API，版本须锁步。

## 不在本 ADR 范围

- **React 组合 DSL（`<LineMark>` / `<PointMark>` + builder + 自动推断 scale/coordinate）** → ADR-08。
- **交互（tooltip / hover / 事件回调 / 水合）** → v0.3。
- **`@retikz/chart` preset 层** → v0.2+。
- **`mountPlot`（vanilla 挂真实 DOM）/ canvas SSR** → 按需后续。

---

> **实现指针**：level `red`（首次公开 `react/src/index.ts` / `vanilla/src/index.ts`）、无 IR schema 改动。真源以代码为准——`<Plot>` / `PlotProps`（`react/src/Plot.tsx`，薄路径在此分流，见 ADR-08）、`renderPlot`（`vanilla/src/renderPlot.ts`）；仅消费 `@retikz/plot` 的 `lowerPlots` / `PlotSpec` / `ExternalDatasets` / `LowerPlotsOptions` + `@retikz/react` 的 `Layout` + `@retikz/vanilla` 的 `renderToSvgString` + core `compileToScene`，不改 core / plot 本体。测试在 `packages/plot/react/tests/Plot.test.tsx`、`packages/plot/vanilla/tests/renderPlot.test.ts`。完整施工契约（文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `9115e6b4`；压缩前完整施工蓝图 = `git show 9115e6b4^:notes/decisions/plot/v0/v0.1/alpha.1/07-plot-bindings.md`。
