# ADR-05：ribbon mark——「源/目标/宽度 → 可填充曲带 Path」的几何 primitive，端点为字段对（经坐标系投影）；sankey 布局明确划出范围

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[alpha.11 roadmap](./roadmap.md)「ribbon mark」· [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 ribbon / §7 scope 组合 / §8.1 可连接性](../../../../../architecture/plot-design.md) · [ADR-01 区间几何投影](./01-cell-geometry-projection.md)（contour 围合思路同源）· core [step.ts cubic / curve / bend](../../../../../../packages/core/core/src/ir/path/step.ts)

## 背景

plot-design 把 mark 分两族（§2 / §3.7）：位置类几何（point / line / interval / area / sector）由「数据 → 位置通道 → 坐标系投影」生成；**关系类几何**——两个端点集合之间的带状连接——由 **ribbon mark** 承载（§3.7 表：`ribbon | 两个端点集合之间的带状关系 | sankey / alluvial 流量、跨 scope connector`）。现状 `packages/plot/plot/src/lower/mark.ts` 只实现了位置类的五种 mark，ribbon 尚不存在。

ribbon 是本 milestone **最难、最不确定**的 mark，难点不在「画一条带子」，而在它把三件本可独立的事缠在一起：

1. **几何**：一条有宽度的流带 = 上边界曲线 + 下边界曲线 + 两端封口，围成一个**可填充闭合区域**。这与 area mark「上沿折线 + baseline 回边 + cycle」（`mark.ts` `buildAreaSteps`）同构，只是两条长边都是 **cubic Bézier** 而非折线，封口是直线。core 已有 `cubic` step（两控制点精确切向，`step.ts:153`）可直接表达弯曲长边，围合机制（`move` → 边 → `cycle`）现成。
2. **端点定位**：ribbon 端点需要源 / 目标的**已解析屏幕坐标**才能算半宽法向偏移、四角与 cubic 控制点。本 ADR 的 ribbon 端点统一来自数据字段——经当前 scope 的 `frame.projectRoles` 投影成屏幕点，这是单图 sankey / alluvial 的常态（布局产物把每行的源 / 目标位置写回数据 x / y）。**跨 scope（连接不同 facet / inset 的具名 node）不在本 ADR 范围**：node id 端点在 plot lowering 期还没有坐标（只有 core compile 期才解析 id），把封口角写成 core `NodeTarget` 不足以在 lowering 期算出半宽偏移与四角几何，需 core 级高阶 path / shape 在 compile 期解析坐标后再生成曲带，留待后续（见「不在本 ADR 范围」）。
3. **布局**：sankey 要先算「节点排在哪、流量按什么顺序堆叠、交叉怎么最小化」，再画带子。**这是布局算法，不是几何**。

同类库对照：D3-sankey 把「布局」（`d3.sankey()` 算 node x/y + link 堆叠）与「连接形状」（`sankeyLinkHorizontal()` 出一条 path）**彻底分开**；Observable Plot 无原生 sankey，社区方案皆是「先 d3-sankey 布局、再喂 Plot 画带」；G2 的 sankey 同样是 `transform`（布局）+ `edge` geometry（画带）两段。即业界共识就是 **布局与画带解耦**。

retikz 的差异点（§8.1 硬约束）：带子不能退成裸 Path——它 lower 成的 core 元素应可被进一步连接 / 标注（挂 label、被 annotation 指）。但 ribbon 的「可填充曲带」是连续形态（非参数化 shape），与 area / line 同类，连接靠**端点锚点**而非整带 shape anchor，这点本 ADR 要诚实界定。

## 决策：本 ADR 只交付 ribbon **几何 primitive**——「给定源点、目标点、源宽、目标宽 → 一条可填充的 cubic 曲带 Path」，端点为**字段对**（经坐标系投影成屏幕坐标）；node id 跨 scope 端点与 sankey 布局算法明确**不进本 ADR**

**一句话**：ribbon mark = area mark 的「双弯边版本」。area 是「一条上沿 + 贴 baseline 的回边」；ribbon 是「一条上边界 cubic + 一条下边界 cubic + 两端直线封口」，同样 `move → 边 → cycle` 围成可填充闭区域。布局推到后续（Statistics / 独立 layout），本体只做几何。

ribbon 吃**边数据**（每行一条流：source / target / value 三元组）。每行下沉成**一条** core `Path`：

```ts
// Plot IR：RibbonMarkSchema（端点为字段对，经坐标系投影成屏幕坐标）
// 一行 = 一条流带；source / target 各是一组 { x, y } 字段对，经当前 scope frame.projectRoles 投影出屏幕点。
const RibbonMarkSchema = z.object({
  type: z.literal(PlotMark.Ribbon),            // 判别字段
  source: RibbonEndpointSchema,                 // 源端：{ x, y } 字段对（经投影）
  target: RibbonEndpointSchema,                 // 目标端：同上
  value: z.string().min(1),                     // 流量字段：经 width scale → 带宽（user units）
  width: z.string().min(1).optional(),          // 可选独立宽度 scale 名（默认合成线性 scale）
  endWidth: z.string().min(1).optional(),       // 可选「目标端宽度」字段：缺省 = 与源端等宽（等宽带）
  curvature: z.number().min(0).max(1).optional(), // S 形张力 0..1（控制点沿主轴外推比例），默认 0.5
  // …markBase（id / 样式 encoding）
});

// RibbonEndpointSchema：单一字段端点形态（无 node id 变体）
const RibbonEndpointSchema = z.object({
  x: ChannelSchema,                             // primary 位置通道（经坐标系投影）
  y: ChannelSchema,                             // secondary 位置通道（经坐标系投影）
});
```

每行 lower 成可填充 Path（与 `buildAreaSteps` 同形，长边换 cubic）：

```ts
// 源端中心 S=(sx,sy) 宽 ws、目标端中心 T=(tx,ty) 宽 wt；半宽法向偏移得四角：
//   S_top / S_bot（源端封口两角）、T_top / T_bot（目标端封口两角）
// 上边界 S_top → T_top：cubic，控制点沿「源→目标主轴方向」按 curvature 外推（水平 sankey 出 S 形）
// 下边界 T_bot → S_bot：cubic，反向对称
// move(S_top) → cubic(到 T_top) → line(T_bot)[目标封口] → cubic(到 S_bot) → cycle[源封口自动闭合]
const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: S_top },
  { type: 'step', kind: 'cubic', to: T_top, control1: c1Top, control2: c2Top },
  { type: 'step', kind: 'line', to: T_bot },
  { type: 'step', kind: 'cubic', to: S_bot, control1: c1Bot, control2: c2Bot },
  { type: 'step', kind: 'cycle' },
];
```

**端点：单一字段来源**（核心设计）：

- **字段端点** `{ x, y }`：经当前 scope 的 `frame.projectRoles` 投影成屏幕点（与 point/line 同路径，复用 `roleValues` / `frame.project`）。源点 / 目标点都在**同一 scope 的同一坐标系**内——这是单图 sankey / alluvial 的常态，也是 ribbon 算半宽法向偏移、四角、cubic 控制点的前提（这些都需要端点的已解析屏幕坐标，而 plot lowering 期只有字段投影能给出坐标）。
- **跨 scope node id 端点不在本 ADR 范围**：连接不同 facet / inset 的具名 node 需要的坐标只有 core compile 期才解析得到，plot lowering 期无法据此算几何；留待 core 级高阶 path / shape 或另起 ADR（见「不在本 ADR 范围」）。

理由：

1. **ribbon = 双弯边 area，复用现成围合机制不另造**：area 已证明「上沿 + 回边 + cycle」能围出可填充区域（`buildAreaSteps`）。ribbon 只把两条长边从 `line` 链换成 `cubic`，封口仍是 `line`，闭合仍是 `cycle`。core `cubic` step（精确两控制点切向）现成，零 core 改动。强行给 ribbon 造参数化「曲带 shape」是用更复杂路径换无收益的统一（曲带无闭式 anchor 价值，连接走端点），否决。
2. **布局解耦是业界共识，也是 grammar of graphics 的层次纪律**：D3 / G2 / Observable 全部「布局算法」与「画带形状」分两段。把 sankey 布局（节点排布 + 流量堆叠 + 交叉最小化）塞进 ribbon mark，会让这个本应干净的几何 primitive 背上一个启发式算法的不确定性，且与 plot 既有 `transform` 层（stack / dodge 已在那）职责重叠。**布局是 Statistics / layout 职责**，ribbon mark 只消费布局产物（已算好的源/目标位置 + 宽度）。划出范围（见「不在本 ADR 范围」）。
3. **端点统一字段投影，几何前提自洽**：ribbon 的四角 / 法向 / cubic 控制点都需要源 / 目标的**已解析屏幕坐标**。字段端点经 `frame.projectRoles` 在 lowering 期即得坐标，几何可当场算出；这覆盖单坐标系内 sankey / alluvial（布局产物把每行的 x / y 写回数据）这一主场景，不为尚不能落地的能力特化 schema。
4. **跨 scope connector 是后续 core 级能力，不在本 ADR 强行落地**：§8.1 的「lower 成可连接 core 元素 + id 驱动连接」在 ribbon 上的难点是——node id 端点在 plot lowering 期还没坐标（id 只有 core compile 期解析），仅产 `NodeTarget` 不足以算半宽偏移与四角。正确做法是 core 级高阶 path / shape 在 compile 期解析坐标后生成曲带，或另起 ADR；本 ADR 把它列为后续方向（见「不在本 ADR 范围」），不在 plot 层造一个解析不出坐标的半成品。

## 待决策点 🔻

> ribbon 不确定性最大，以下逐条摊开真实未定项。带明确倾向的是实现窗口内可拍板项；真正悬而未决的标注「→ 倾向推迟」。

- **端点 schema 形态（`RibbonEndpointSchema`）**：单一形态 `{ x: Channel, y: Channel }`（字段对，经坐标投影）。倾向：直接 `z.object({ x, y })`，无 union / refine——node id 端点已划出范围，端点形态收敛为字段对，无须互斥判别。
- **半宽法向方向怎么取**：等宽直带的法向 = 主轴方向逆时针转 90°；但源宽≠目标宽 + 弯曲时，端封口法向应取**该端切向的法向**（源端用源处切向、目标端用目标处切向），否则封口会斜。倾向：封口法向 = 端点切向法向（cubic 起末切向由控制点方向给出），保证封口垂直于流向。本轮先按「源→目标弦方向的法向」近似（直带精确、弯带轻微偏差），精确端切向法向列为后续优化。
- **curvature 控制点的具体公式**：水平 sankey 经典做法（d3 `sankeyLinkHorizontal`）= 控制点在主轴中点、保持端点 y。倾向：control1 = S 沿「源→目标主轴分量」外推 `curvature × Δmain`、control2 = T 反向外推，纯水平时退化成 d3 的 S 形；`curvature=0` → 控制点贴端点 ≈ 准直带。alluvial（垂直堆叠 + 水平流）同公式换主轴。**主轴怎么判定**（看坐标系 / 看源目标位移分量）→ 倾向：本轮取「源→目标位移的主分量」自动判主轴，不暴露 prop。
- **宽度沿程变化（源宽 ≠ 目标宽）**：`endWidth` 字段缺省 = 等宽带（源宽铺到目标）；给定 = 目标端用 `endWidth` 经同一 width scale 算独立宽度，带子呈喇叭形（sankey 节点入边宽 ≠ 出边宽的常见情形）。倾向：支持，且是纯几何加法（四角各用各端半宽），不引入布局。
- **value=0 / 退化带**：`value` 投影出的带宽 < ε（零宽）→ 跳过该行（返回 null，与 area 上沿 <2 点、interval 零高一致）。倾向：零宽跳过，fail-loud 留给「字段缺失 / 非有限」。

## DSL 表面

两层表面，sugar 与 IR 等价（仿 core Sugar = Kernel）：

**IR 形态**（`@retikz/plot` PlotSpec.marks 一项）——端点是嵌套字段对：

```ts
// 一行 = 一条流带；source / target 各是 { x: { field }, y: { field } } 字段对，经坐标系投影
{
  type: 'ribbon',
  source: { x: { field: 'sourceX' }, y: { field: 'sourceY' } },
  target: { x: { field: 'targetX' }, y: { field: 'targetY' } },
  value: 'amount',                 // → 带宽（width scale）
  // 可选：width / endWidth / curvature / id / encoding
  encoding: { color: { field: 'category', scale: 'cat' } },
}
```

**React sugar 形态**（`@retikz/plot-react`）——`Mark` 后缀、**扁平 props**（端点拆成 `sourceX`/`sourceY`/`targetX`/`targetY` 顶层 string props，与既有 `<LineMark x= y=>` / `<BarMark>` 同风格）：

```tsx
// 单坐标系 sankey / alluvial：布局（已由 transform / 预处理算出每行的 sourceX/Y, targetX/Y, value）写回数据，
// ribbon 端点用字段、经坐标系投影出曲带——这是 ribbon 几何 primitive 的主用法
<Plot data={flows}>
  <RibbonMark
    sourceX="sourceX"
    sourceY="sourceY"
    targetX="targetX"
    targetY="targetY"
    value="amount"            // → 带宽（width scale）
    color="category"          // → color 通道 + 自动 ordinal 色 scale
  />
</Plot>
```

`<RibbonMark>` 是返回 `null` 的配置载体 FC（同其它 `*Mark`），由 `<Plot>` 同步内省其 props，经 `build-plot-spec.ts` 的 `collectInto` ribbon 分支把扁平 props 装回嵌套 IR `{ type: 'ribbon', source: { x: { field }, y: { field } }, target: { … }, value, … }`。

## 测试设计

`packages/plot/plot/tests/lower/ribbon.test.ts`（新建）+ schema 校验测试，覆盖（plot alpha 放宽口径，按复杂度适量）：

- 字段端点：源/目标字段 → 投影 → 四角 → 可填充 cubic Path（move/cubic/line/cubic/cycle 结构正确）
- 等宽 vs 喇叭带（`endWidth`）：四角半宽取值正确
- curvature：0（准直）/ 0.5（S 形）控制点位置随主轴外推
- 退化：零宽 / 非有限字段 → 跳过 / fail-loud
- schema：缺 value 拒绝、端点缺 x/y 拒绝
- React sugar：`<RibbonMark>` 扁平 props（`sourceX/Y`、`targetX/Y`、`value`、`color`）→ 装配出正确嵌套 ribbon IR
- vanilla SSR：`renderPlot` 喂含 ribbon 的 spec + 数据 → 输出含流带（可填充 path）的 SVG 字符串

具体见「实现契约 § 测试象限」。

## 影响

三包 lockstep 全补（`@retikz/plot` IR/lowering + `@retikz/plot-react` sugar；`@retikz/plot-vanilla` 无代码改动）：

- **Plot IR（`@retikz/plot`）**：`ir/mark.ts` 加 `RibbonMarkSchema` + `RibbonEndpointSchema`（单一 `{ x, y }` 字段对，无 union/refine） + `PlotMark.Ribbon` 成员 + 并入 `MarkSchema` 判别 union；新 `RibbonMark` / `RibbonEndpoint` 派生类型。
- **lowering（`@retikz/plot`）**：`lower/mark.ts` 加 `lowerRibbon`（每行 → 一条可填充 Path，长边 cubic、端点统一字段投影），并入 `lowerMark` 路由；`lower/anchor.ts` 视需要加 ribbon 端点几何辅助（四角 / 法向 / 控制点计算的单一真源）。
- **React sugar（`@retikz/plot-react`）**：`components/marks.tsx` 加 `RibbonMark`（返回 null 的 FC）+ `RibbonMarkProps`（扁平 props：`sourceX`/`sourceY`/`targetX`/`targetY`/`value`/`width`/`endWidth`/`curvature`/`color`/`id`）；`components/build-plot-spec.ts` 的 `collectInto` 加 `child.type === RibbonMark` 分支（扁平 props → 嵌套 `{ type:'ribbon', source:{x:{field},y:{field}}, target:{…}, value, … }` IR）；`components/index.ts` + `src/index.ts` barrel 补 `RibbonMark` / `RibbonMarkProps` 导出。
- **vanilla（`@retikz/plot-vanilla`）**：`renderPlot` mark 无关、纯 spec 驱动（`PlotSpecSchema.parse` → `lowerPlots` → `compileToScene` → `renderToSvgString`），**无代码改动**；交付 = vanilla SSR 测试 + docs demo 证明 ribbon spec 端到端出图。
- **依赖 core**：消费 core `cubic` step（`step.ts`）+ `cycle` / `line` / `move` step，**仅消费、不改 core**。
- **datumAnchor / locator**：ribbon 一行一带，datum 锚点取**带中线中点**（源中心 ↔ 目标中心连线中点），供命中 / 标注；`datumAnchor`（`anchor.ts:195`）加 ribbon 分支。
- **文档站**：mark 文档加 ribbon 页（几何 primitive + 字段端点 + 「布局不在本体、需预处理」说明）+ demo（zh/en）。
- **对外 API**：纯新增 mark，非 breaking。

## 不在本 ADR 范围

- **node id 端点 / 跨 scope ribbon connector**（连接不同 facet / inset 的具名 core node）：ribbon 四角 / 法向 / cubic 控制点都需要端点的**已解析屏幕坐标**，而 `{ node }` 端点在 plot lowering 期还没坐标（id 只有 core compile 期解析），仅产 core `NodeTarget` 不足以算半宽偏移与四角几何。正确做法是**core 级高阶 path / shape 在 compile 期解析坐标后再生成曲带**，或另起 ADR 处理。这是评审 BLOCKING 的降级结论：v1 ribbon 只支持字段端点；node id 跨 scope connector 作为后续方向。
- **sankey 布局算法**（节点排布 / 流量堆叠顺序 / 交叉最小化）：归 **Statistics / 独立 layout**（alpha.12+）。ribbon mark 只消费布局产物（已算好的源/目标位置 + 宽度），不自带布局。这是本 ADR 最重要的范围切割——业界（D3 / G2 / Observable）皆布局与画带解耦，retikz 同。
- **精确端切向法向封口**（弯带封口完全垂直于端切向）：本轮用弦法向近似，精确版后续优化。
- **alluvial 的「flow 分组堆叠」语义**（多条流在同一 stage 节点处按比例堆叠）：依赖布局产物，随布局推迟。
- **曲线 / 极坐标 / 三元坐标系下的 ribbon**：本轮端点字段来源走通用 `frame.projectRoles`，几何（cubic 控制点）按笛卡尔屏幕空间算；非笛卡尔坐标下的曲带形态（如极坐标 chord diagram）顺延。
- **整带 shape anchor / 沿带 label 定位**：ribbon 连接靠端点锚点；整带作为可连接 shape（任意方向 anchor）不做，沿带 label 走 core step `label?`（cubic 自带 label 支持）后续按需。
- **value 负流 / 反向流**：fail-loud（与 sector 负值同），不静默。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（加 `RibbonMarkSchema`，IR schema 契约边界）+ `packages/plot/plot/src/lower/**`（加 `lowerRibbon` 下沉契约），同时动 `packages/plot/react/src/components/**`（加 `RibbonMark` sugar + `collectInto` 分支）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/mark.ts` | 加 | `PlotMark.Ribbon` | `'ribbon'`（const object 成员） | — | ribbon mark 判别串（`Ribbon: 'ribbon'`） |
| `ir/mark.ts` | 加 | `RibbonEndpointSchema` | `z.object({ x, y })` | — | ribbon 一端：字段对（经坐标系投影成屏幕坐标） |
| `ir/mark.ts` | 加（端点字段） | `x` | `ChannelSchema` | — | 字段端点的 primary 位置通道（经坐标系投影） |
| `ir/mark.ts` | 加（端点字段） | `y` | `ChannelSchema` | — | 字段端点的 secondary 位置通道（经坐标系投影） |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.type` | `z.literal(PlotMark.Ribbon)` | — | 判别字段：两端点集合间的可填充曲带 |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.source` | `RibbonEndpointSchema` | — | 源端（流带起点集合） |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.target` | `RibbonEndpointSchema` | — | 目标端（流带终点集合） |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.value` | `z.string().min(1)` | — | 流量字段：经 width scale 映射成源端带宽（user units） |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.width` | `z.string().min(1).optional()` | 合成线性 | 可选独立 width scale 名；缺省合成一条线性 scale |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.endWidth` | `z.string().min(1).optional()` | = value | 可选目标端宽度字段；缺省 = 与源端等宽（等宽带） |
| `ir/mark.ts` | 加 | `RibbonMarkSchema.curvature` | `z.number().min(0).max(1).optional()` | `0.5` | cubic 控制点沿主轴外推比例（0=准直、大=更 S） |
| `ir/mark.ts` | 加 | `markBase` 字段 | `id` 等共享 | — | 复用现有 `markBase`（mark 句柄） |
| `ir/mark.ts` | 改 | `MarkSchema` | discriminatedUnion 加 `RibbonMarkSchema` | — | mark union 并入 ribbon |
| `ir/mark.ts` | 加 | `RibbonMark` / `RibbonEndpoint` | `z.infer<...>` | — | 派生类型（中文 JSDoc） |

字段名一旦写死，下游 Spec / 实现 Agent 不允许改——发现需要改 → 回本 ADR 加条 / 开新 ADR。

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改：加 `RibbonMarkSchema` / `RibbonEndpointSchema` / `PlotMark.Ribbon` / 并入 `MarkSchema` / 派生类型）
- `packages/plot/plot/src/lower/mark.ts`（修改：加 `lowerRibbon` + 并入 `lowerMark` 路由）
- `packages/plot/plot/src/lower/anchor.ts`（修改：加 ribbon 端点几何辅助——四角 / 法向 / cubic 控制点 / datum 中线锚点的单一真源；`datumAnchor` 加 ribbon 分支）
- `packages/plot/plot/src/lower/scale.ts`（按需：合成 width 线性 scale，若与现有 size/opacity scale 合成路径可复用则不新增）
- `packages/plot/plot/tests/lower/ribbon.test.ts`（新建）
- `packages/plot/plot/tests/ir/mark.test.ts`（修改：ribbon schema 校验，若存在）
- `packages/plot/react/src/components/marks.tsx`（修改：加 `RibbonMark` FC + `RibbonMarkProps` 扁平 props）
- `packages/plot/react/src/components/build-plot-spec.ts`（修改：`collectInto` 加 `child.type === RibbonMark` 分支，扁平 props → 嵌套 ribbon IR）
- `packages/plot/react/src/components/index.ts`（修改：barrel 补 `RibbonMark` / `RibbonMarkProps`）
- `packages/plot/react/src/index.ts`（修改：public API barrel 补 `RibbonMark` / `RibbonMarkProps`）
- `packages/plot/vanilla/tests/`（新建：ribbon spec 经 `renderPlot` SSR 出含流带 path 的 SVG；vanilla `src/` 无代码改动）
- `apps/docs/src/contents/plot/.../ribbon`（新建：ribbon mark 文档 mdx + demo，zh/en 同步）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与几何断言即可。

**Happy path（≥3）**：
- `ribbon-field-endpoints-fillable-path`：源/目标字段端点 → 投影四角 → 一条 `move/cubic/line/cubic/cycle` 可填充 Path，cubic 控制点按 curvature 外推
- `ribbon-equal-width`：无 `endWidth` → 源宽 = 目标宽（四角法向半宽相等），矩形化直带几何正确
- `ribbon-react-sugar-assembles-ir`（plot-react）：`<RibbonMark sourceX targetX … value color>` 扁平 props → `collectInto` 装配出正确嵌套 ribbon IR（`source/target` 为 `{ x:{field}, y:{field} }`、`value`、color encoding）

**边界（≥2）**：
- `ribbon-zero-width-skip`：value 投影带宽 < ε → 跳过该行（null），不产退化 Path
- `ribbon-flared-end-width`：给 `endWidth` → 目标端独立半宽，喇叭带四角取值正确
- `ribbon-curvature-zero`：`curvature=0` → 控制点贴端点（准直带）

**错误路径（≥2）**：
- `ribbon-endpoint-missing-xy-reject`：端点缺 `x` 或 `y` → schema 拒绝
- `ribbon-missing-value-reject`：缺 `value` 字段 → schema 拒绝；非有限 value → lowering fail-loud / 跳过

**交互（≥2）**：
- `ribbon-vanilla-ssr-svg`（plot-vanilla）：含 ribbon 的 spec + 数据 经 `renderPlot` → 输出含流带（可填充 path）的 SVG 字符串（端到端三包贯通：plot IR → lower → core compile → vanilla 序列化）
- `ribbon-datum-anchor-midline`：`datumAnchor` 取源中心↔目标中心中线中点，locator 与 lowering 同源

### 依赖的现有元素

- `lower/mark.ts` 的 `buildAreaSteps` / `pointsToSteps` / `colorGroupedScope` / `attachMarkLayer` / `resolveRolePosition`（`packages/plot/plot/src/lower/mark.ts`）—— ribbon 复用「围合成可填充 Path」与「按色分组 / 图层装配 / 通道解析」机制；长边由 `line` 链改 `cubic`。
- `lower/anchor.ts` 的 `datumAnchor` / `roleValues`（`packages/plot/plot/src/lower/anchor.ts`）—— 加 ribbon 端点投影与中线锚点分支。
- `lower/project.ts` 的 `CoordinateFrame.projectRoles` / `frame.project`（`packages/plot/plot/src/lower/project.ts`）—— 字段端点投影目标，仅消费。
- core `cubic` step（`packages/core/core/src/ir/path/step.ts` `CubicStepSchema`）—— 弯曲长边 lowering 目标（两控制点精确切向）。
- core `cycle` / `line` / `move` step（`step.ts`）—— 封口 + 闭合，复用 area 围合机制。
- `@retikz/plot-react` 的 `collectInto` / `*Mark` FC 模式（`packages/plot/react/src/components/build-plot-spec.ts` + `marks.tsx`）—— `RibbonMark` 复用「返回 null 的配置载体 FC + `collectInto` 同步内省扁平 props 装回嵌套 IR」机制，与 `LineMark` / `BarMark` / `AreaMark` 同形。
- `@retikz/plot-vanilla` 的 `renderPlot`（`packages/plot/vanilla/src/render-plot.ts`）—— mark 无关、纯 spec 驱动，ribbon 经 `PlotSpecSchema.parse → lowerPlots → compileToScene → renderToSvgString` 端到端出图，无需改 vanilla 代码，仅加 SSR 测试。
