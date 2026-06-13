# ADR-02：让 `<Plot>` 可被组合 —— plot 节点自描述尺寸 + 外部可见面板 anchor；组合直接用 core `<Layout>`，不新增容器组件

- 状态：Proposed
- 决策日期：2026-06-13
- 关联：[plot v0.1-alpha.10 roadmap](./roadmap.md) · [ADR-01 退化 `<Plot>` 为薄容器](./01-plot-thin-container.md) · [plot-design §7 多坐标组合](../../../../../architecture/plot-design.md) · [plot-design §8.1 id 绑定与可连接性](../../../../../architecture/plot-design.md) · [plot-design §13.6 v0.5 facet + 组合就绪](../../../../../architecture/plot-design.md) · [core ADR scope-id-bbox](../../../../core/v0/v0.2/alpha.1/03-scope-id-bounding-box.md) · [core v0.4 scope 多态 bounding shape](../../../../core/v0/v0.4/scope-polymorphic-bbox.md)
> ⚠️ 草案：本 ADR 由 2026-06-13 设计讨论 + 多 LLM 评审产出，实现契约为 AI 起草建议稿，待人工 review 后定稿。**RED 级，进实现前需外部 LLM 评审**（[v0.1 roadmap 排序原则](../roadmap.md)）。

## 背景

`123.jpg` 一类「多坐标信息图 / 海报」需求：一张 svg 里放多张**异质**子图（density / violin、比例气泡、venn 圈），自由摆位（重叠 / 套图 / 放射状），再叠大量标注文字与指向具体元素的连接线。

现状阻塞两点（代码核验，2026-06-13）：

1. **`<Plot>` 硬绑自己的 `<Layout>`**（`react/src/Plot.tsx:70`）——每个 `<Plot>` 必出一个独立 svg 根，无法把多张图收进同一个 svg。
2. **尺寸是全局渲染选项**：`lowerPlots(datasets, { width, height })`（`plot/src/lower/expand.ts:112`）只接受**整图单一** `width/height`，`expand` 让每个 plot 都从原点 `{0,0}` 起算 plotArea（`expand.ts:319`）。即便手动把两个 plot 节点塞进一个 scene，也会同尺寸、同原点叠在一起。

但**地基已就绪**——组合不需要新容器，core `<Layout>` 本身就是：

- core `<Layout>` **已拥有唯一 svg、吃 `composites`、`ir` prop 接受含多个 Scope-wrapped Tier2 节点的完整 scene**（`Layout.tsx:76-103`）。多 plot + 标注塞一个 svg，IR 层用 `<Layout ir composites={lowerPlots(datasets)}>` 直接成立。
- core `<Scope>` 支持「容器 + 局部 transform + 锚点」：`scope.children` 允许塞 Tier2 composite 节点（`scope.ts:125`）；`transforms` 给局部平移摆位；`id` 在**父帧**注册矩形 bbox 成外部句柄（`scope.ts:156-162`）；`localNamespace` 隔离内部 id。
- core 的「连接」是 id 驱动的：`Path` step target 用 `{ id, anchor?, offset? }` 引用具名 `Node` / `Scope`（§8.1）。
- `PlotSpec.id` 早为此预留（`plot.ts:32-38`："reserved as the scope reference id / anchor target used by composition"）。

plot-design §7 区分两级「组合」：

- **L1 · plot 可被组合**：plot 对组合的唯一义务——lower 进**可引用 scope** + 携带**自描述尺寸** + 暴露 **anchor**。**这是本 ADR 的本体。**
- **L2 · 通用组合层**：把多张 plot（及未来任意 Tier2）摆进同一张 svg、加 connector / annotation 的编排层。§7 强调它是 **core `<Scope>` / `<Layout>` 的通用能力**，「不由 plot 负责」——故**本 ADR 不新增组合容器组件，直接用 core `<Layout>`**。

> 与 ADR-01 的关系：ADR-01 把 `<Plot>` 降成「薄容器」（角色单一：底层绘图块），本 ADR 顺势让这个薄块「可被嵌入与组合」——同一 milestone「Plot 作为容器的角色」主题的延续。

## 决策

### L1 — plot 节点可被组合（本体）

**(L1-a) PlotSpec 自描述尺寸**。`PlotSpecSchema` 新增可选 `width` / `height`（user units，本面板的本性尺寸框）。lowering 取尺寸优先级改为 **`plotNode.width ?? options.width ?? DEFAULT_WIDTH`**（height 同）。

- 缺省（不写 `width/height`）→ 回退全局 `lowerPlots` 选项 → **单图行为逐字不变**（向后兼容）。
- 组合场景：每个 plot 节点各带尺寸，`expand` 按节点尺寸算各自 plotArea / margin / 轴布局。
- **摆位不进 plot 节点**：plot 节点只描述「我多大」，不描述「我在哪」。x/y 由外层 `Scope{transforms:[translate]}` 承担（§7「Scope 挂局部 transform」）——plot 块**位置无关**，职责干净。

**(L1-b) plot lowering 暴露外部可见的面板 bbox + plotArea anchor（gated on `PlotSpec.id`）**。**评审钉死**：现 plot lowered root 无条件 `localNamespace: true` 且 id 挂其上（`expand.ts:1162-1164`）——会把嵌套 `<plotId>.plotArea` 句柄封死在 plot 局部帧、外部 `<Path>` 查不到（评审 #1）；空 scope 0×0、marks bbox ≠ plotArea（评审 #5）。改 lowering root 结构，**仅当 `PlotSpec.id` 设值时**重构（anchors opt-in）：

```txt
// PlotSpec.id 设值 → 新 root（要外部可见的句柄 emit 到 localNamespace 之外）
Scope { id: <plotId>, /* 非 localNamespace */              // ← 面板 bbox 句柄；注册到父帧、外部可见
  children: [
    Scope { localNamespace: true, children: [ grids, marks, axes, legend ] },  // ← 封内部 datum/series id
    Node  { id: '<plotId>.plotArea', shape: rectangle, 不可见,                  // ← plotArea 精确矩形 carrier
            position: plotArea 中心, minimumWidth/Height: plotArea 尺寸 },
  ]
}

// PlotSpec.id 未设 → 现状结构逐字不变（单图零回归）
Scope { localNamespace: true, children: [ … ] }
```

- **面板 bbox `<plotId>`**：外层**非 local** panel scope 的 id（从原内层 local scope 上移）。注册到父帧，`<plotId>.north/.east/.center/.30` 外部可引用；bbox = 子树 AABB（含 carrier + 内容）= 整面板框。
- **绘图区 `<plotId>.plotArea`**：**不可见矩形 carrier**（rectangle Node，几何 = 扣除轴 / legend 后的 plotArea rect）——非空 scope、非 marks bbox（评审 #5）。在 localNamespace **之外**，故 id 上浮父帧、外部可引用。
- **内部 id 仍被封**：marks / axes / datum 裹在 `localNamespace: true` 内层 scope，不外泄、不污染父 namespace（§8.1）。
- **gate 在 id**：无 id（普通单图）→ 不重构、零回归；有 id（要被引用）→ 才出 panel scope + carrier。契合「设了 id 必有引用目标」语义（core ADR scope-id-bbox）。
- 复用 core 矩形 anchor（v0.2-alpha.1），**机制层无 core 改动**；改的是 plot 侧 lowering root 组织。
- `<plotId>.series.<id>` / `.datum.<id>`（指向具体系列 / 数据点）**入 roadmap**：依赖 alpha.5 datum locator 完整接通 + 同样 emit 到外部可见帧，工作量大，非 MVP。
- 非矩形包络 anchor（圆形 / polar 面板连线落真实边界）依赖 core「scope 多态 bounding shape」（[core v0.4 文档](../../../../core/v0/v0.4/scope-polymorphic-bbox.md)），**非 MVP 阻塞**，本轮先矩形 bbox。

### L2 — `<Plot>` 直接作 core `<Layout>` 子组件（嵌入态不自渲染；不新增 plot 容器组件）

> **定位（与用户敲定）**：组合容器**就是 core `<Layout>`**，**不新增 `<Plots>` / `<Figure>` 之类的 plot 级容器组件**。`<Plot>` 改造成**可嵌入**：standalone 时自建 `<Layout>` 出 svg（现状）；放进 core `<Layout>` 下时**不自渲染 svg**，改向外层 `<Layout>` 交出 plot composite 节点 + 自己的数据，**由 Layout 在 lower / compile 时统一处理**。authoring 形态：

```tsx
import { Layout } from '@retikz/react';
import { Plot, LineMark, BarMark, Axis } from '@retikz/plot-react';
import { Node, Path } from '@retikz/react';

<Layout width={800} height={800}>
  <Plot id="plotA" x={40} y={40} width={300} height={220} data={a}>
    <LineMark x="t" y="v" order="t" /><Axis dimension="x" /><Axis dimension="y" grid />
  </Plot>
  <Plot id="plotB" x={420} y={60} width={260} height={260} coordinate="polar2D" data={b}>
    <BarMark x="cat" y="val" color="cat" />
  </Plot>
  <Path from={{ id: 'plotA', anchor: 'east' }} to={{ id: 'plotB', anchor: 'west' }} />
  <Node text="collation" position={/* 锚 plotA.north 偏移 */} />
</Layout>

// standalone 不变：<Layout> 外的 <Plot> 自建 svg（向后兼容）
<Plot data={a} width={360} height={200}><LineMark x="t" y="v" /><Axis dimension="x" /></Plot>
```

**(L2-a) `<Plot>` 嵌入态 = 不自渲染、交节点给外层 Layout**。`<Plot>` 加可嵌入行为：

- **检测**：经 core `<Layout>` 提供的 React context 感知「我在 Layout 下」（默认 standalone → 自建 Layout 出 svg；Layout 下 → 嵌入态）。
- **嵌入态产出**：不返回自己的 `<Layout>`，而是交出「plot composite 节点（裹 `Scope{transforms:[translate(x,y)]}` 摆位，节点带 `id` + `width/height`）」给外层 Layout 的 IR；`data` 经下述贡献通道闭进 compile，**不进 IR**（节点只带 `data.reference = id`）。
- **摆位**：`x/y` → 外层 translate Scope；`width/height` → PlotSpec 节点（L1-a）；`id` → PlotSpec.id（L1-b 激活面板 anchor）。

**(L2-b) 需要 core-react 新机制：Layout 收纳可嵌入 Tier2 子组件（本 ADR 硬依赖，另起 core 文档）**。core 现状**不支持** `<Plot>` 当 `<Layout>` 子组件（代码核验 2026-06-13）：

- `buildIR` 只认固定 kernel 元素（`Node/Path/Scope/Step/Coordinate/Text/EdgeLabel`，按 displayName 派发，`core/react/src/kernel/_displayNames.ts`）——**不认 Tier2 composite 子组件**。
- `<Layout>` **无「子组件贡献 composites + datasets」通道**（`composites` 是 prop 外传，`Layout.tsx:181`）。

故需 core-react 加一个**通用机制**（**静态解析、非渲染时注册**——`buildIR` 本就不渲染子组件、只静态走元素树读 props 按 displayName 派发，避免「子后于父渲染」的时序坑）：

- **buildIR 扩展**：识别 Tier2 元素（经注册表 displayName → handler），调 domain 注册的 handler 把元素 props 静态产出「composite 节点（含摆位 Scope）+ 上浮的 datasets」（plot 的 handler = `buildPlotSpec` + 取 `data`）。
- **Layout 汇总**：buildIR 走完 children 拿到所有 Tier2 节点 + 各自 datasets，按 namespace 合并 datasets、统一并入 `compileToScene` 的 composites（plot → `lowerPlots(merged)`）。

这是 **core 通用组合能力**（任意 Tier2 可嵌入 Layout，§7「core 通用组合」），**不写死 plot**（plot 只注册自己的 handler + lowering 工厂）。**另起 core 文档**承接，ADR-02 对它是**硬依赖**。

**(L2-c) connector / annotation = core `<Node>`/`<Path>`**；step target 写 `{ id: 'plotA', anchor: 'east' }`（面板 bbox）或 `{ id: 'plotA.plotArea' }`（绘图区 carrier），复用 core id 驱动连接（§8.1），锚 L1-b 的外部可见帧。

**(L2-d) 数据 ref（评审 #4 消解）**。嵌入态每面板 dataset ref **默认 = 面板 `id`**（唯一 → 不串）；同源共享走显式 `dataRef` prop（同名 = 共享一份）。固定 `__plot`（`Plot.tsx:43`）只是 standalone 单图便利，嵌入态不走。重复 `id` → fail-loud（id 是 anchor 句柄 + 默认 ref）。`fieldMap` 按 ref 键协同。

**(L2-e) vanilla 对等（lockstep）**。vanilla 无 JSX，组合用既有 builder 造同一棵 core scene IR（plot 节点 + translate Scope + 标注）+ core vanilla scene 渲染 + `composites: lowerPlots(datasets)`——**共同真源 = core IR**。React 的「`<Plot>` 嵌入 context」是 React 专属糖；vanilla 直接组装 IR，二者产出同一棵 core IR、不漂移。

**(L2-f) 跨 domain 混合**：core-react 机制（L2-b）是**通用**的——flow / table 等任意 Tier2 子组件同样可嵌入 `<Layout>` 贡献各自 lowering，`<Layout>` 按 namespace 合并；裸 core kernel（`<Node>`/`<Scope>`…）本就是 Layout 子组件。故 plot 与他者混排天然成立。

**(L2-g) fallback（core 机制就位前 / 底层路径）**：导出 `buildPlotSpec`，用户手工造 PlotSpec 节点 + 裹 translate Scope + 配 `composites={lowerPlots(datasets)}` 交 core `<Layout ir>`——零 core 改动今天可用，但 ergonomics 差。作为 L2-b 机制就位前的过渡 / 显式底层路径。

### 自由摆位模型

```txt
Layout(width=800, height=800)                    ← 唯一 <svg>（core，组合容器就是它）
  Scope transforms=[translate(40,40)]            ← <Plot x y> 嵌入态产出的 wrapper（只摆位、无 id）
    plot { id:plotA, width:300, height:220, … }  → lower 成 Scope{id:plotA}(面板 bbox) ⊃ [ local 内容, plotArea carrier ]
  Scope transforms=[translate(420,60)]
    plot { id:plotB, width:260, height:260, coordinate:polar2D }
  Path from={id:plotA,anchor:east} to={id:plotB,anchor:west}   // 连线（锚外部可见帧）
  Node text="collation" position=…                              // 标注
```

`<Plot>` 嵌入态：尺寸落 plot 节点、摆位落 translate Scope（无 id）、data 经贡献通道闭进 compile（不进 IR）；面板 bbox / plotArea 句柄由 plot lowering emit 到外部可见帧；连线 / 标注落 core Node / Path。重叠与对齐由用户负责。

## 决策定稿（2026-06-13）

- **① 不新增 plot 容器组件；`<Plot>` 改造成可嵌入，直接作 core `<Layout>` 子组件**。先前考虑过 plot 级 sugar（`<Figure>` / `<Plots>`），**取消**：core `<Layout>` 已是组合容器，再包一层是平行机制。改为 **`<Plot>` 加可嵌入行为**：standalone 自出 svg，Layout 下不自渲染、把节点 + 数据交给外层 Layout（L2-a）。命名争议随容器取消而消解（记录在案：未来若加通用 authoring sugar，那是 core-react 通用容器 `<Canvas>` 的事，plot 味命名 `Plots` 胜 `Figure`）。
- **⑦ `<Plot>` under `<Layout>` 需要 core-react 新机制（本 ADR 硬依赖，另起 core 文档）**。core 现状 `buildIR` 不认 Tier2 composite 子组件、`<Layout>` 无「子组件贡献 composites + datasets」通道（L2-b 代码核验）。需 core-react 加**通用机制**：Layout 经 context 收纳可嵌入 Tier2 子组件的 `{ 节点, datasets, makeComposites }`，合并后并入 compile。这是 **core 通用组合能力**（§7，任意 Tier2 复用、不写死 plot），**另起 core v0.4 文档**承接；ADR-02 对它**硬依赖**。**fallback**（机制就位前 / 底层路径）：导出 `buildPlotSpec` + 手写 `<Layout ir composites={lowerPlots}>`（L2-g），零 core 改动可用但 ergonomics 差。
- **② plotArea anchor = 外部可见帧内的精确矩形 carrier**；非矩形包络依赖 core「scope 多态 bounding shape」（[core v0.4](../../../../core/v0/v0.4/scope-polymorphic-bbox.md)），非 MVP。见 L1-b。
- **③ 数据 ref**：嵌入态默认 ref = 面板 `id`（唯一→不串）；同源共享走显式 `dataRef`。`__plot` 仅 standalone 单图便利，嵌入态不走。重复 `id` → fail-loud（评审 #4 消解，见 L2-d）。
- **④ 摆位 MVP 绝对 x/y**（外层 `Scope.translate`）；anchor 相对摆位（TikZ `right of`）入 roadmap。
- **⑤ canvas renderer** 走同一 `<Layout>` canvas 路径，多面板应自然支持；实现期验证 hit-test / 多 scope 命中。
- **⑥ 落点归 alpha.10，接受 milestone 扩张**。RED 级、改 plot 核心 IR + lowering；alpha.10 由「单 ADR / yellow」扩为「Plot 作为容器角色」双 ADR（01 薄容器 yellow + 02 可被组合 red）。

> **评审记录（2026-06-13 多 LLM 评审）**：6 条 findings 处置——#1 plotArea 被 localNamespace 封 → L1-b root 结构 emit 到外部可见帧；#5 plotArea 非精确矩形 → 不可见 rect carrier；#2 面板 id owner 冲突 → `<Plot>` 嵌入态产出的 translate wrapper 无 id、id 归 plot lowered panel scope；#3 面板 id → 嵌入态 `id` 必填注入 PlotSpec.id；#4 数据 ref 撞 → 嵌入态默认 ref = id（L2-d）；#6 共同真源 → 不新造 schema，真源 = core IR（Layout 消费），React `<Plot>` 嵌入糖与 vanilla builder 产同一棵 IR。

## 影响

- **plot IR schema（`plot/src/ir/plot.ts`）**：`PlotSpecSchema` 加可选 `width` / `height`。向后兼容（缺省回退全局）。
- **lowering（`plot/src/lower/expand.ts`）**：尺寸取值 per-node fallback；**root 结构改（gated on `node.id`）**——id 设值时出外层非 local panel scope(id) ⊃ [localNamespace 内容 scope, plotArea 不可见 rect carrier]；无 id 时逐字不变。
- **`@retikz/plot-react`**：`<Plot>` 加可嵌入行为——感知 core `<Layout>` context、嵌入态不自建 Layout 而交出节点 + 贡献 datasets / lowerPlots；`PlotDslProps` 增 `id` / `dataRef` / `x` / `y` / `width` / `height`（嵌入态生效）。`buildPlotSpec` opts 增 `id` / `width` / `height` 并导出（fallback / 内部复用）。**不新增 plot 容器组件**。
- **`@retikz/core`（core-react，新增机制 / 硬依赖，决策 ⑦）**：`<Layout>` + `buildIR` 支持「可嵌入 Tier2 子组件」——buildIR 接受 Tier2 composite 子节点 + Layout 经 context 收集子组件贡献的 `{ datasets, makeComposites }`，合并并入 `compileToScene`。**通用、不写死 plot**；**另起 core v0.4 文档**，本 ADR 硬依赖。
- **`@retikz/plot-vanilla`**：vanilla 无 JSX，组合用既有 builder 造同一棵 core scene IR + core vanilla scene 渲染 + `lowerPlots`（已导出）；可选薄 `composePlots` builder deferred。**不新增必需 API**。
- **公开 API**：新增 `PlotSpec.width·height`（schema，additive）+ `<Plot>` 嵌入 props + 导出 `buildPlotSpec` + **core-react 可嵌入 Tier2 机制**——additive，0.x 无兼容负担。组合真源 = core IR（无新 schema）。
- **文档站**：新增「组合 / 多面板」页（zh/en）+ demo（core `<Layout>` 编排）；`<Plot>` 页补 `width/height` 自描述尺寸 + 可嵌入说明。
- **roadmap**：plot-design §13.6 把组合放 v0.5；本 ADR 把 **L1 + 组合用法 MVP 前移 alpha.10**（不依赖 facet）。§13.6 与 v0.1/v0.5 roadmap 同步标注「组合 MVP 前移 alpha.10，v0.5 收口 facet 内多坐标 + series/datum 锚 + 相对摆位 + 可选 authoring sugar」。

## 不在本 ADR 范围

- **plot 级 / 通用组合容器组件**（`<Plots>` / `<Figure>` / `<Canvas>`）：本轮不做，组合用 core `<Layout>`；未来 authoring sugar 另起 core ADR（通用容器，任意 Tier2 共用）。
- **series / datum 级 anchor**：入 roadmap，依赖 datum locator。
- **anchor 相对摆位**（TikZ `right of`）：MVP 只绝对 x/y。
- **布局托管（grid / region 自动分配）**：本 ADR 走自由摆位。
- **plot 内多坐标（facet / inset / 双轴）**：plot 自身职责，归后续 Facets milestone。
- **core「scope 多态 bounding shape」**（非矩形包络 anchor）：独立 [core v0.4 文档](../../../../core/v0/v0.4/scope-polymorphic-bbox.md)，本 ADR MVP 只用矩形 bbox。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字后定稿。RED 级，进实现前需外部 LLM 评审。

### Level

`red`

判级：动 plot 核心 `ir/**`（PlotSpec schema 加字段）+ `lower/**`（per-node 尺寸 + root 结构改）+ `<Plot>` 可嵌入改造 + **core-react 新机制（可嵌入 Tier2 in Layout，决策 ⑦，硬依赖）**。触及 IR schema + lowering + core-react 机制 + 跨包 → red。core 机制部分另起 core 文档、单独走红级流程。

### Schema 改动

| Schema | 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `PlotSpecSchema`（`plot/src/ir/plot.ts`） | `width` | `z.number().finite().positive().optional()` | 否 | 面板本性宽（user units）；缺省回退 `lowerPlots` 全局 width，再回退 `DEFAULT_WIDTH` |
| `PlotSpecSchema` | `height` | `z.number().finite().positive().optional()` | 否 | 面板本性高（user units）；缺省回退全局 height，再回退 `DEFAULT_HEIGHT` |

> **不新造组合 IR schema**（评审 #6）：组合真源 = **core IR（Scene/Scope 树）**——已 JSON 可序列化、data 外置、已是 lowering 输入。`PlotSpec.id` **已存在**（`plot.ts:32`，本就为组合预留）。**core IR schema 无改动**；但 **core-react 加机制**（可嵌入 Tier2 in Layout，决策 ⑦，react 层非 IR schema）。`.describe(...)` 一律英文。

### 文件 scope

- `packages/plot/plot/src/ir/plot.ts`（修改：PlotSpec 加 `width` / `height`）
- `packages/plot/plot/src/lower/expand.ts`（修改：尺寸 per-node fallback；**root 结构改 gated on `node.id`**，`:1162-1164`——id 设值出 panel scope(id) ⊃ [local 内容 scope, plotArea carrier]；无 id 不变）
- `packages/plot/react/src/Plot.tsx`（修改：`<Plot>` 加可嵌入行为——感知 Layout context、嵌入态交节点 + 贡献 datasets/lowerPlots；`PlotDslProps` 增 `id`/`dataRef`/`x`/`y`/`width`/`height`）
- `packages/plot/react/src/components/buildPlotSpec.ts`（修改：opts 增 `id`/`width`/`height`；`index.ts` 导出）
- **`packages/core/react/src/kernel/`（core-react 新机制，决策 ⑦——另起 core 文档定细节）**：`Layout.tsx` + `builder.ts`（buildIR）+ 新 context，支持可嵌入 Tier2 子组件贡献 `{ 节点, datasets, makeComposites }`
- `packages/plot/vanilla/src/`（按需：可选 `composePlots` builder，deferred）
- `packages/plot/plot/tests/**` · `packages/plot/react/tests/**` · `packages/core/react/tests/**`（新增：下列测试象限）
- `apps/docs/src/contents/plot/**`（新增「组合 / 多面板」页 + demo，core `<Layout>` 编排；`<Plot>` 页补尺寸 / 嵌入说明，zh/en 同步）
- `notes/architecture/plot-design.md` §13.6 + `notes/decisions/plot/v0/v0.1/roadmap.md`（修改：组合 MVP 前移标注）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，不硬凑 9。

**Happy path**：

- `plot_node_size_drives_plotarea`：`plotNode.width/height` 存在 → plotArea 按节点尺寸算
- `panel_bbox_anchor_connectable`：`PlotSpec.id` 设值 → `<plotId>.east` 可作 Path step target、连到（含外层 translate 偏移）
- `plotarea_carrier_precise`：`<plotId>.plotArea` = 扣除轴 / legend 后的 rect（非整面板框、非 marks bbox、非 0×0，评审 #5）

**边界**：

- `size_fallback_to_global`：plot 节点无 `width/height` → 回退全局 `lowerPlots` 尺寸（单图逐字回归）
- `no_id_root_unchanged`：`PlotSpec.id` 未设 → lowered root 结构逐字不变（无 panel scope / carrier，单图零回归，gate 验证）
- `plotarea_anchor_visible_across_localnamespace`：`<plotId>.plotArea` 在 plot `localNamespace` **之外**注册 → 外部兄弟 `<Path>` 能锚到（评审 #1）

**错误路径**：

- `single_plot_zero_regression`：普通单 `<Plot>`（无 id）→ 行为与本 ADR 前逐字一致（向后兼容）
- `internal_ids_stay_sealed`：plot 内部 datum / series id 仍被 `localNamespace` 封、不上浮父帧（§8.1 防撞）
- `composed_two_plots_no_crosstalk`：core `<Layout>` 编排两 plot 节点、各自 `data.reference` → 各 mark 绑正确数据集，无串数据（评审 #4，ref 用户自控）

**交互**：

- `panel_bbox_includes_translate`：plot 节点裹在 `Scope{translate}` 内 → `<plotId>` bbox 落在 translate 后位置（祖先 transform 累积，ADR-03）
- `embedded_plot_no_own_svg`：`<Plot>` 在 `<Layout>` 下 → 不产独立 svg，节点 + datasets 贡献进外层 Layout；`<Layout>` 外 `<Plot>` → 仍自建 svg（双场景）
- `embedded_two_plots_no_crosstalk`：`<Layout>` 下两 `<Plot>` 各自 `data`（默认 ref = id）→ 各 mark 绑正确数据集、无串数据（评审 #4）
- `duplicate_embedded_id_fail_loud`：`<Layout>` 下两面板同 `id` → fail-loud（id 是 anchor 句柄 + 默认 ref，必须唯一）

### 依赖的现有元素

- `Layout` / `buildIR` / `_displayNames`（`core/react/src/kernel/`）—— **修改（决策 ⑦，另起 core 文档）**：buildIR 现只认固定 kernel 元素（`_displayNames.ts`，不认 Tier2 composite 子组件）、Layout `composites` 仅 prop 外传（`Layout.tsx:181`）→ 加「可嵌入 Tier2 子组件贡献 composites + datasets」的 context 机制
- `RendererModeProvider` / `useRendererMode`（`core/react/src/kernel/rendererContext.ts`）—— 仅引用 / 仿照：可嵌入 context 仿此模式；`<Plot>` 经它感知「在 Layout 下」
- `Scope`（`core/src/ir/scope.ts`：`transforms` / `id` bbox / `localNamespace`）—— 仅引用：摆位 + 面板 anchor 载体，无 schema 改动。**关键**：scope.id 始终注册到**父帧**（不受自身 localNamespace 影响，[core ADR scope-id-bbox](../../../../core/v0/v0.2/alpha.1/03-scope-id-bounding-box.md):17）——故 plotArea carrier 须放 localNamespace **之外**才外部可见（评审 #1 依据）
- `Path` step target `{ id, anchor?, offset? }`（§8.1）—— 仅引用：connector 锚面板 anchor
- `buildPlotSpec`（`plot/react/src/components/buildPlotSpec.ts`）—— 修改：opts 增 `id` / `width` / `height`；改为导出
- `lowerPlots` / `expand` / `LowerPlotsOptions` / `DEFAULT_WIDTH` / `DEFAULT_HEIGHT`（`plot/src/lower/expand.ts`）—— 修改：per-node 尺寸 fallback；**root 结构改 gated on `node.id`**（`:1162-1164`）
- `PlotSpec.id`（`plot/src/ir/plot.ts:32`）—— **仅引用，已存在**（本就为组合 / 交互预留）；用户 / buildPlotSpec 写入即激活 panel scope + carrier
- `PlotSpecSchema`（`plot/src/ir/plot.ts`）—— 修改：加 `width` / `height`
