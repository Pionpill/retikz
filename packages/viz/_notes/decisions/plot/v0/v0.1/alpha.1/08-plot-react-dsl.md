# ADR-08：React 组合 DSL（`<Plot>` + `<LineMark>` / `<PointMark>`，自动推断 scale / coordinate）

- 状态：Superseded
- 替代：[alpha.12 ADR-04](../alpha.12/04-mark-surface-convergence.md)、[alpha.14 ADR-09](../alpha.14/09-composition-api-structure.md) 与 [beta.2 ADR-02](../beta.2/02-plot-vanilla-plain-api.md)；React DSL 现生成 canonical `IRPlotSpec` 并共享 binding normalization
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot v0.1 roadmap 拆分策略](../roadmap.md) · [plot-design.md §5.2 Primitive API / §6.1](../../../../../architecture/plot-design.md) · 依赖：[ADR-07 薄包装](./07-plot-bindings.md) · [ADR-01~06](./01-plot-spec-root.md) · core 抽象分层（Sugar = builder、不在 render 栈）见 CLAUDE.md / AGENTS.md

## 背景 / 约束

ADR-07 的 `<Plot spec={…} data={…}/>` 要求用户手写整份 IRPlotSpec 对象。对照 Recharts / Observable Plot（plot-design §6.1 明确「像 Recharts 那样自由组合」），更友好的是用 JSX 子组件声明图层、由 adapter 拼成 IRPlotSpec：用户不写 `scales` / `coordinate` / `namespace` / `data.ref` 这些结构噪声——alpha.1 只有 linear + cartesian2D，这些可由 mark 的 x/y 自动推断。这正是「JSX 是 authoring 面、IRPlotSpec 是规范化 IR，builder 在中间装配」。

## 决策：children 经 builder 装配成 IRPlotSpec，自动建 linear scale + cartesian2D

`<Plot>` 不在 render 栈上跑子组件，而是**同步读取 `props.children` 的元素 + props**（像 core Sugar：builder 调用、**不能用 hooks**），装配出 IRPlotSpec，再走 ADR-07 渲染路径；mark 组件本身只承载配置（不渲染）。`buildPlotSpec` 是纯函数：从 `<LineMark>` / `<PointMark>` 读 type + x/y/order，自动建每轴 linear scale + cartesian2D 绑定（内部固定 scale 名、用户不可见），产出现有 `PlotSpecSchema` 实例。

组件集（alpha.1）：

- `<Plot data={rows} width? height?>` —— 根，收单数据集（裸 `rows`）+ 子图层；内部生成内部 ref、装配 spec、渲染。
- `<LineMark x={fieldPath} y={fieldPath} order? id? />` —— 折线图层。
- `<PointMark x={fieldPath} y={fieldPath} id? />` —— 散点图层。

`x`/`y` 在 props 类型层**必填**，缺通道 TS 静态即拦；mark `id` 透传到底层 `MarkSchema` 预留 `id`（scope/anchor 目标，解析留 alpha.5）。

理由：

1. **结构噪声归零**：用户只声明「画什么」（mark + 绑哪个字段），scales / coordinate / namespace / ref 由 builder 补——对齐 Recharts / ggplot 的隐式 scale 体验（plot-design §6.1）。
2. **JSX ≠ IR，builder 装配**：DSL 形态自由、IRPlotSpec 仍规范化；二者解耦，DSL 升级不动 IR。
3. **builder 纯函数 + 等价性硬规则**：`buildPlotSpec` 是纯函数，产出 IRPlotSpec 必须**等价于手写**（每种 DSL 组合配一条 `expect(buildPlotSpec(<DSL/>)).toEqual(handWritten)` 测试，仿 core Sugar=Kernel 等价性）。
4. **复用 ADR-07 渲染路径**：装配后仍走 `<Layout ir composites={lowerPlots(...)}>`，不引入新渲染机制；data 仍走 datasets 注入、不进 IR。
5. **不在 render 栈 / 无 hooks**：mark 组件是配置载体，`<Plot>` 同步内省 children；与 core Sugar 一致，避免 hooks 误用。

### 设计细节（具体决策）

- **`<Plot>` 双入口同名按 props 分流**：给 `spec` 走 ADR-07 薄路径、给 `children` 走 DSL 装配（二者互斥）——一个入口、最少概念，而非组合版另起名（`<PlotChart>`）。
- **组合 DSL 的 data prop 收裸 `rows`**（单数据集，内部包成 `{ [ref]: rows }`），比薄包装的 `ExternalDatasets` 更省事。
- **mark x/y prop** alpha.1 仅字段路径字符串（数据驱动）；常量通道（`{ value }`）DSL 形态留后续（先用薄 `spec` 路径表达）。
- 自动 scale 用内部固定名、用户不可见。

### 未来兼容性考虑

- 需要 scale 配置（domain / nice / log…）时 alpha.3 再加显式 `<Scale>` / `<Cartesian2D>` 组件或 mark 上的 scale props（非破坏）。
- vanilla 链式 builder（`plot(rows).line({…}).point({…}).toSVG()`）本 ADR 不含、留后续；vanilla 当前用 ADR-07 的 `renderPlot(spec, data)`。

## 不在本 ADR 范围

- **显式 `<Scale>` / `<Cartesian2D>` 组件、scale 配置 props、非位置通道（color/size）** → alpha.3（届时 DSL 加对应组件/props，非破坏）。
- **常量通道 DSL 形态、多数据集 / per-mark data** → 后续。
- **vanilla 链式 builder** → 后续（vanilla 用 ADR-07 `renderPlot`）。
- **交互（事件 / 回调 / 水合）** → v0.3。

---
