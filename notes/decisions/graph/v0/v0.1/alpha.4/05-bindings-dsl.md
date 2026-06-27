# ADR-05：三包 polar authoring 表面 + 文档露出 + 端到端验收

> alpha.4 的 ADR-01~04 落了 `@retikz/plot` 核心内部能力（polar IR + lowering）。本 ADR 把整套 polar 能力露到用户面：`@retikz/plot-react`（`coordinate="polar2D"` + 新 mark/guide 组件 + `closed` props）、`@retikz/plot-vanilla`（PlotSpec authoring + builder 对等）、`apps/docs`（polar 概念页 + 组件 API + demo），并端到端验收径向柱 / 饼图 / 环图 / 雷达 / 极坐标折线。
> **无 IR schema 改动**（消费 ADR-01~04）。

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [ADR-01](./01-coordinate-polar.md) · [ADR-02](./02-sector-geometry.md) · [ADR-03](./03-continuous-mark.md) · [ADR-04](./04-polar-guide.md) · [plot-design.md §5 Preset/Primitive API / §6 包结构](../../../../../architecture/plot-design.md)

> **实现期修订（review pass，2026-06-06，以本节为准）**：①「位置通道 hybrid（x/y + 可选 angle/radius）」**已废**——随 ADR-01 改为 mark **仅扁平 `x` / `y`**（无 angle/radius props；坐标系重解释）。`<SectorMark>` 的 `angle` prop 保留（它是「值字段」、DSL 自动累积成角界，**非** encoding.angle 通道）。② DSL coordinate 简写改 **`"polar2D"`**（与 IR 判别串一致；字符串简写或 `{ type: 'polar2D', innerRadius?, startAngle?, endAngle? }` 对象），缺省 `cartesian2D`。下文 DSL 表面 / 示例中凡 `coordinate="polar2D"`、Point/Line/Area 的 angle/radius props，一律以本修订为准。

## 背景

roadmap P2-1 决定：alpha.4 的 ADR-01~04 是 core-internal（IR + lowering，不出 react/vanilla/docs），authoring 表面集中本 ADR 收口——polar 在 DSL 层有意义须等 coordinate + mark + guide 都就位，逐 ADR 露出无意义。

现状（alpha.3 ADR-07 已建）：

- `@retikz/plot-react`：`<Plot>` + `<BarMark>` / `<LineMark>` / `<PointMark>` / `<Axis>` + `buildPlotSpec`（JSX → PlotSpec builder，同步展开、不在 React render 栈）。
- `@retikz/plot-vanilla`：`renderPlot(spec, data, options)`（PlotSpec → SVG 字符串，SSR）。

这些表面只懂 cartesian。本 ADR 让它们表达 polar：coordinate 选 polar2D、新 mark（sector / area）、新 `closed` prop、polar axis（angle/radius 维度）。

按 develop-design「适配器对等」：**react + vanilla 两套都要给**；按 AGENTS.md：**用户可见改动必须同一改动集同步文档站**。

## 决策：Plot 加 coordinate 选择 + 新 mark/guide 组件（扁平 x/y props）；vanilla PlotSpec 对等；docs 概念页 + 组件页 + demo 全补

### 1. `@retikz/plot-react`

- **`<Plot coordinate>`**：`<Plot>` 加 coordinate 选择（`coordinate="polar2D"` 或传 polar 配置 `{ startAngle, endAngle, innerRadius }`）；缺省 cartesian（向后兼容）。`buildPlotSpec` 产出对应 `coordinate` IR。
- **保持现有扁平 prop 形态（不引入 `encoding` 对象 / `transform` prop）**：现有 mark 组件 props 是扁平字段（`x` / `y` / `color` / `series` / `order` / `stack`，见 `marks.tsx`），DSL 入口 `data` 是 `Array<ExternalRow>`（非 map；map 仅 spec 入口）。本 ADR **沿用扁平形态**——新增的是扁平字段，不改成 `encoding={{}}` 对象、不加 `transform` prop（与 `<BarMark stack>` 自动装配 stack transform 的既有约定一致）。
- **新 mark 组件**：`<SectorMark>`（饼/环；扁平 `angle`（值字段）+ `color`，**内建自动累积**——同 `<BarMark stack>` 自动装配 stack transform 的约定，DSL 层不暴露 transform）、`<AreaMark>`（扁平 `x`/`y`/`baseline`/`closed`/`color`/`series`）；`<LineMark>` 加扁平 `closed`（雷达）。`<BarMark>`（=interval）在 polar 下自动成径向柱（无需新组件，coordinate 决定几何）。
- **位置通道仅 `x` / `y`（扁平、必填）**：无 angle/radius props——polar 下坐标系把 x→angle、y→radius 重解释（见 ADR-01）；`closed` 为扁平布尔。
- **`<Axis dimension>`**：支持 `dimension="angle"` / `"radius"`（+ 既有 x/y）——guide 维度，与位置通道无关。

### 2. `@retikz/plot-vanilla`

`renderPlot` 直接吃 PlotSpec → ADR-01~04 的 polar IR 落地后**零改动即支持 polar**（只转发）。补 builder 对等（若 vanilla 有命令式 builder 则加 polar coordinate / sector / area / closed；无则以「直接写 PlotSpec + renderPlot」为 vanilla authoring 路径，文档双视图给 PlotSpec 写法）。

### 3. `apps/docs`

- **概念页**：polar 坐标系（x/y 由坐标系重解释为 angle/radius、startAngle/endAngle/innerRadius、与 cartesian 一份 spec 切换）。
- **组件页 API**：`<Plot coordinate>`、`<SectorMark>` / `<AreaMark>` 新页、`<LineMark closed>` / `<BarMark>` polar 行为、`<Axis dimension=angle/radius>` —— 表格行 + `<ComponentPreview>` + `<name>.demo.tsx`。
- **demo**：径向柱 / 玫瑰、饼图、环图、雷达、极坐标折线、polar 轴+同心环——react + vanilla 双代码视图。
- 走 docs-doc-principle 三处协同（contents + data + i18n），zh/en 并行（zh 为源）。

理由：

1. **lockstep 收口**：单坐标系纵向加宽，authoring 一次性露出比逐 ADR 碎片露出连贯。
2. **适配器对等**：react JSX + vanilla PlotSpec/builder 同源 IR，两套都给。
3. **coordinate 决定几何，组件不冗余**：`<BarMark>` 不分 cartesian/polar 两个组件——coordinate 切换即变几何（守 (i)，用户心智简单）。
4. **文档同改动集**：用户可见改动与文档一体呈现（AGENTS.md 硬规则）。

## 不在本 ADR 范围

- core plot IR / lowering（ADR-01~04 已落）。
- legend / 交互（tooltip/hover，留 v0.3）/ facet。
- chart preset 层（`@retikz/chart`）。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/plot/v0/v0.1/alpha.4/05-bindings-dsl.md`（封板全文）。
