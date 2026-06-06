# ADR-05：三包 polar authoring 表面 + 文档露出 + 端到端验收

> alpha.4 的 ADR-01~04 落了 `@retikz/plot` 核心内部能力（polar IR + lowering）。本 ADR 把整套 polar 能力露到用户面：`@retikz/plot-react`（`coordinate="polar"` + 新 mark/guide 组件 + angle/radius/closed props）、`@retikz/plot-vanilla`（PlotSpec authoring + builder 对等）、`apps/docs`（polar 概念页 + 组件 API + demo），并端到端验收径向柱 / 饼图 / 环图 / 雷达 / 极坐标折线。
> **无 IR schema 改动**（消费 ADR-01~04）。

- 状态：Proposed
- 决策日期：2026-06-06
- 关联：[plot v0.1-alpha.4 roadmap](./roadmap.md) · [ADR-01](./01-coordinate-polar.md) · [ADR-02](./02-sector-geometry.md) · [ADR-03](./03-continuous-mark.md) · [ADR-04](./04-polar-guide.md) · [plot-design.md §5 Preset/Primitive API / §6 包结构](../../../../../architecture/plot-design.md)

## 背景

roadmap P2-1 决定：alpha.4 的 ADR-01~04 是 core-internal（IR + lowering，不出 react/vanilla/docs），authoring 表面集中本 ADR 收口——polar 在 DSL 层有意义须等 coordinate + mark + guide 都就位，逐 ADR 露出无意义。

现状（alpha.3 ADR-07 已建）：

- `@retikz/plot-react`：`<Plot>` + `<BarMark>` / `<LineMark>` / `<PointMark>` / `<Axis>` + `buildPlotSpec`（JSX → PlotSpec builder，同步展开、不在 React render 栈）。
- `@retikz/plot-vanilla`：`renderPlot(spec, data, options)`（PlotSpec → SVG 字符串，SSR）。

这些表面只懂 cartesian。本 ADR 让它们表达 polar：coordinate 选 polar、新 mark（sector / area）、新 props（angle/radius/closed）、polar axis（angle/radius 维度）。

按 develop-design「适配器对等」：**react + vanilla 两套都要给**；按 AGENTS.md：**用户可见改动必须同一改动集同步文档站**。

## 决策：Plot 加 coordinate 选择 + 新 mark/guide 组件 + 角色 props；vanilla PlotSpec 对等；docs 概念页 + 组件页 + demo 全补

### 1. `@retikz/plot-react`

- **`<Plot coordinate>`**：`<Plot>` 加 coordinate 选择（`coordinate="polar"` 或传 polar 配置 `{ startAngle, endAngle, innerRadius }`）；缺省 cartesian（向后兼容）。`buildPlotSpec` 产出对应 `coordinate` IR。
- **保持现有扁平 prop 形态（不引入 `encoding` 对象 / `transform` prop）**：现有 mark 组件 props 是扁平字段（`x` / `y` / `color` / `series` / `order` / `stack`，见 `marks.tsx`），DSL 入口 `data` 是 `Array<ExternalRow>`（非 map；map 仅 spec 入口）。本 ADR **沿用扁平形态**——新增的是扁平字段，不改成 `encoding={{}}` 对象、不加 `transform` prop（与 `<BarMark stack>` 自动装配 stack transform 的既有约定一致）。
- **新 mark 组件**：`<SectorMark>`（饼/环；扁平 `angle`（值字段）+ `color`，**内建自动累积**——同 `<BarMark stack>` 自动装配 stack transform 的约定，DSL 层不暴露 transform）、`<AreaMark>`（扁平 `x`/`y`/`baseline`/`closed`/`color`/`series`）；`<LineMark>` 加扁平 `closed`（雷达）。`<BarMark>`（=interval）在 polar 下自动成径向柱（无需新组件，coordinate 决定几何）。
- **角色 props（扁平）**：mark 组件加可选扁平 `angle` / `radius` 字段（显式）+ 既有 `x` / `y`（默认复用）；扁平 `closed` 布尔。
- **`<Plot coordinate>`**：DSL 入口加 `coordinate` prop（`"polar"` 简写或对象），缺省 cartesian（向后兼容）；`buildPlotSpec` 据此产 `coordinate` IR。
- **`<Axis dimension>`**：支持 `dimension="angle"` / `"radius"`（+ 既有 x/y）。

### 2. `@retikz/plot-vanilla`

`renderPlot` 直接吃 PlotSpec → ADR-01~04 的 polar IR 落地后**零改动即支持 polar**（只转发）。补 builder 对等（若 vanilla 有命令式 builder 则加 polar coordinate / sector / area / closed；无则以「直接写 PlotSpec + renderPlot」为 vanilla authoring 路径，文档双视图给 PlotSpec 写法）。

### 3. `apps/docs`

- **概念页**：polar 坐标系（角色 hybrid x/y↔angle/radius、startAngle/endAngle/innerRadius、与 cartesian 一份 spec 切换）。
- **组件页 API**：`<Plot coordinate>`、`<SectorMark>` / `<AreaMark>` 新页、`<LineMark closed>` / `<BarMark>` polar 行为、`<Axis dimension=angle/radius>` —— 表格行 + `<ComponentPreview>` + `<name>.demo.tsx`。
- **demo**：径向柱 / 玫瑰、饼图、环图、雷达、极坐标折线、polar 轴+同心环——react + vanilla 双代码视图。
- 走 docs-doc-principle 三处协同（contents + data + i18n），zh/en 并行（zh 为源）。

理由：

1. **lockstep 收口**：单坐标系纵向加宽，authoring 一次性露出比逐 ADR 碎片露出连贯。
2. **适配器对等**：react JSX + vanilla PlotSpec/builder 同源 IR，两套都给。
3. **coordinate 决定几何，组件不冗余**：`<BarMark>` 不分 cartesian/polar 两个组件——coordinate 切换即变几何（守 (i)，用户心智简单）。
4. **文档同改动集**：用户可见改动与文档一体呈现（AGENTS.md 硬规则）。

## 待决策点 🔻（已冻结 2026-06-06，按人工 ack）

- **coordinate prop → 字符串简写 `"polar"` + 可选对象** `coordinate={{ type:'polar', innerRadius, startAngle, endAngle }}`：简单默认 + 可配；缺省 cartesian（向后兼容）。
- **vanilla → 起步走「写 PlotSpec + renderPlot」**（不另造命令式 builder，vanilla 已能表达 polar，builder 留需求驱动）；文档双视图给 react JSX + vanilla PlotSpec 写法。
- **SectorMark 累积 → DSL 内建自动**（同 `<BarMark stack>` 自动装配约定）；primitive 仍显式 transform。
- **demo → 全做、旗舰（径向柱/饼图/雷达）优先**；时间紧则环图/极坐标折线并入概念页。

## DSL 表面

> 本 ADR 的核心产出即「表面」。react 示例：

```tsx
// 饼图（react）：扁平 prop；data 是裸数组；SectorMark 内建自动累积（无 transform prop）
<Plot data={share} coordinate="polar">
  <SectorMark angle="value" color="label" />
  <Axis dimension="angle" />
</Plot>

// 雷达（react）：closed line + polar；扁平 x/y/closed
<Plot data={metrics} coordinate="polar">
  <LineMark x="dim" y="value" closed />
  <Axis dimension="angle" />
  <Axis dimension="radius" grid />
</Plot>

// 径向柱（react）：BarMark 在 polar 下自动成扇形；扁平 x/y/color
<Plot data={sales} coordinate="polar">
  <BarMark x="month" y="amount" color="month" />
</Plot>
```

```ts
// vanilla（PlotSpec + renderPlot）：同一 IR（spec 入口 data 是 map）
const svg = renderPlot(pieSpec, { share }, { width: 360, height: 360 });
```

## 测试设计

builder（`buildPlotSpec`）产 polar coordinate / sector / area / closed 的 IR 等价性、`<Plot coordinate>` 渲染、vanilla `renderPlot` polar 端到端 SVG、各 demo 编译。docs 走 docs-doc-* 审计。具体见实现契约。

## 影响

- **packages/plot/react/src**：`Plot` 加 coordinate；新 `SectorMark` / `AreaMark` 组件；`LineMark` 加 closed；`Axis` 加 angle/radius 维度；`buildPlotSpec` 支持 polar；`index.ts` 导出新组件 / 类型。
- **packages/plot/vanilla/src**：`renderPlot` 验证 polar 透传（多半零改）；按待决策点决定是否加 builder。
- **apps/docs**：polar 概念页 + 组件 API + demo + i18n（zh/en）+ contents/data 注册。
- **无 IR 改动**：消费 ADR-01~04 schema。
- **对外 API**：plot-react 新增组件 / props（非破坏，cartesian 默认不变）。

## 不在本 ADR 范围

- core plot IR / lowering（ADR-01~04 已落）。
- legend / 交互（tooltip/hover，留 v0.3）/ facet。
- chart preset 层（`@retikz/chart`）。

---

## 实现契约（必填）🔻

> 无 schema 改动；表面 / 文档为主。组件名 / prop 名 AI 提案，待人工 review 冻结。

### Level

`red`（动 `packages/plot/react/src/index.ts` / `packages/plot/vanilla/src` —— 包 public 表面；docs 为 green，跨级取最高 → red）。

### Schema 改动

无（消费 ADR-01~04 的 coordinate / mark / guide IR）。

### 文件 scope

- `packages/plot/react/src/Plot.tsx`（改 —— coordinate prop）
- `packages/plot/react/src/components/`（改 / 新 —— SectorMark / AreaMark / LineMark closed / Axis angle·radius / buildPlotSpec polar）
- `packages/plot/react/src/index.ts`（改 —— 导出新组件 / 类型）
- `packages/plot/vanilla/src/renderPlot.ts`（验证 / 视需要改）
- `packages/plot/vanilla/src/index.ts`（视 builder 决策）
- `apps/docs/src/contents/<plot 章节>/*.mdx`（改 / 新 —— 概念页 + 组件 API）
- `apps/docs/src/contents/<plot 章节>/*.demo.tsx`（新 —— 5 类 polar demo）
- docs contents 索引 / data / i18n（zh + en，走 docs-doc-principle 三处协同）
- `packages/plot/react/tests/**` / `packages/plot/vanilla/tests/**`（新 / 改 —— builder 等价性 + 渲染）

偏离白名单 → 加条或新开 ADR。

### 测试象限

**Happy path**：

- `buildPlotSpec polar`：`<Plot coordinate="polar">` + marks → 产出含 `coordinate.type='polar2D'` 的 PlotSpec。
- `SectorMark 等价`：`buildIR(<SectorMark/>)` 等价手写 sector PlotSpec。
- `vanilla renderPlot polar`：饼图 spec → SVG 字符串含扇形 path。
- `LineMark closed`：`<LineMark closed>` → 闭合路径 IR。

**边界**：

- `coordinate 缺省`：不写 coordinate → cartesian（向后兼容）。
- `polar 对象配置`：`coordinate={{ type:'polar', innerRadius:0.3 }}` → 环图 IR。

**错误路径**：

- `polar 下 BarMark 缺位置编码`：复用 lowering 错误（清晰报错）。
- `非法 coordinate 值`：schema/类型层 reject。

**交互**：

- `cartesian 回归`：既有 react 组件 / vanilla 渲染测试全绿。
- `react ↔ vanilla 同 IR`：同一 polar spec 两套表面产相同 IR / 等价渲染。

### 依赖的现有元素

- `Plot` / `buildPlotSpec` / `BarMark` / `LineMark` / `PointMark` / `Axis`（`packages/plot/react/src`）—— 扩展 coordinate / 新 mark / props。
- `renderPlot`（`packages/plot/vanilla/src/renderPlot.ts`）—— 透传 polar PlotSpec。
- ADR-01~04 的 `coordinate` / `mark`（sector/area）/ `guide`（angle/radius）IR —— 消费。
- docs-doc-principle / docs-doc-component / docs-doc-example SKILL —— 文档三处协同 / 页型规范。
