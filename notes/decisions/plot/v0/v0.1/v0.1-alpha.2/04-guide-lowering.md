# ADR-04：guide lowering（Axis/Grid + ticks + plot area → core Path / Node(text)，绑 anchor id）

- 状态：Proposed
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §8 lowering / §3.9 guide / §14 anchor](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 guide IR](./01-guide-ir.md) · [ADR-02 auto-tick](./02-auto-tick.md) · [ADR-03 布局](./03-plot-area-layout.md) · 改动：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md)

## 背景

[ADR-01](./01-guide-ir.md) 定了 guide IR（声明画哪根轴/网格），[ADR-02](./02-auto-tick.md) 算 nice 刻度，[ADR-03](./03-plot-area-layout.md) 缩出 plot area + 投影器。本 ADR 把它们**拼起来**：把每个 axis / grid guide **下沉成 core 图元**——轴线 / 刻度线 / 网格线是 `Path`，刻度标签是 `Node`(text)——并编排进 plot 的根 scope，与 mark 一起渲染。这是管线第 6 段 guide 真正产出几何、第 8 段 lowering 落到 core 的合流点（plot-design §8：plot 不自渲染，只产 core `Scope/Node/Path/Step/Coordinate`）。

## 决策：每个 guide → 一层 core scope（样式上提）；grid 在 mark 之下、axis 在 mark 之上；标签用 Node(text) + anchor 对齐

新增 `lowerGuide(guide, ctx)`：按 `type` + `dimension` 产一个图层 scope。轴线 / 刻度线 / 网格线走 `Path`（`Step` move/line），刻度标签走 `Node`（text，靠 `position`=**节点中心** + 估算偏移定位——core `Node` 无 self-anchor 字段，见「待决策点」B1）。共享样式（stroke / 字号 / 无描边填充）**上提到该层 scope 的 `pathDefault` / `nodeDefault`**，延续 alpha.1 [mark.ts](../v0.1-alpha.1/06-plot-lowering.md) 「用 scope 承载共享样式、减小 IR 体积」的原则。`expand.ts` 编排 z-order：**grid → marks → axis**（网格垫底、坐标轴压顶不被数据盖）。axis/grid 的 `id` → 对应层 scope 的 `id`（`plot.xAxis` / `plot.yAxis` 预留，alpha.5 接通命中）。

> ⚠️ **B1（评审查证）**：core `IRNode` 的 `position` 是**节点中心、无 self-anchor**（`north`/`east` 等锚点只在「引用别的节点」时作目标，不能让节点按自身某锚点定位）。故标签用 **center + 估算偏移**，而非 anchor 对齐。所幸 core Node 的 text 天然居中于 `position`：x 轴标签水平居中**自动成立**（无需估宽）、y 轴标签垂直居中自动；只有 y 轴标签的水平偏移需要估算半宽（与 [ADR-03](./03-plot-area-layout.md) left margin 同源）。**alpha.2 用估算偏移、不改 core**；更精确的右对齐需给 core 加 self-anchor 字段（跨 next-core，留作备选）。

刻度位置经 [ADR-03](./03-plot-area-layout.md) 的同一投影器把 tick value 映射到像素——**保证刻度与 mark 严格对齐**（同一 scale → 同一 projector）。

```ts
// packages/plot/plot/src/lower/guide.ts
import { type IRChild } from '@retikz/core';
import { AXIS_TICK_LENGTH, AXIS_LABEL_GAP, estimateLabelWidth } from './layout'; // 复用 ADR-03 导出的常量 + 估算（不跨文件复制算法）
import { computeTicks } from './ticks';            // ADR-02

/** lowerGuide 上下文：plot area + 该维度投影 + 字号 */
export type GuideContext = {
  plotArea: Rect;
  projectX: (value: number) => number;   // tick value(x) → 像素 x（来自 ADR-03 projector 的分量）
  projectY: (value: number) => number;
  xTicks: TickSet;                       // 预先按 dimension 算好（ADR-02），axis 与 grid 复用
  yTicks: TickSet;
  fontSize: number;
};

/**
 * 把一个 guide 下沉成一层 core scope（样式上提到 scope；空内容返回 null）
 * @description axis：轴线 + 刻度线 + 刻度标签(可选)；grid：跨 plot area 的网格线。id → scope.id（anchor 预留）
 */
export const lowerGuide = (guide: Guide, ctx: GuideContext): IRChild | null => { /* … */ };
```

下沉规则（cartesian2D）：

| guide | 几何 | 位置 |
|---|---|---|
| axis x | 轴线 Path（plot area 底边）；每 tick 一段刻度线 Path（向下 `AXIS_TICK_LENGTH`）；label Node(text)：`position=(tickX, 轴底 + AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize/2)`——水平居中于 tickX **天然成立**（text 居中于 center），垂直用 `fontSize` 估高下移 | 底边 `y = plotArea.y + plotArea.height` |
| axis y | 轴线 Path（plot area 左边）；刻度线向左；label Node(text)：`position=(轴左 - AXIS_TICK_LENGTH - AXIS_LABEL_GAP - estimateLabelWidth(label, fontSize)/2, tickY)`——垂直居中于 tickY **天然成立**，水平用 `estimateLabelWidth(label, fontSize)/2`（与 [ADR-03](./03-plot-area-layout.md) left margin 同源、不复制算法）估半宽左移 | 左边 `x = plotArea.x` |
| grid x | 每个 x tick 一条竖线 Path（`plotArea.y` → `plotArea.y+height`） | 跨整个 plot area 高 |
| grid y | 每个 y tick 一条横线 Path（`plotArea.x` → `plotArea.x+width`） | 跨整个 plot area 宽 |

样式上提（**字段名对齐 core schema**，评审 P1.1 修正）：

- axis 层：`pathDefault:{ stroke:'currentColor' }`（轴线 / 刻度线）+ `nodeDefault:{ font:{ size: fontSize }, stroke:'none', fill:'none', padding: 0 }`（label 纯文字、无框——core 省略 `shape` 默认仍是 rectangle，故显式 `stroke:'none'`/`fill:'none'`/`padding:0` 才得「只文字」；字号是 `font.size`，**不是** `fontSize`）。
- grid 层：`pathDefault:{ stroke:'currentColor', drawOpacity: 0.15 }`（网格淡于轴；core path 透明度字段是 **`drawOpacity`**，不是 `strokeOpacity`）。

```ts
// packages/plot/plot/src/lower/expand.ts（编排，z-order：grid → marks → axis）
const guides = node.guides ?? [];
// 拒绝同 (type, dimension) 重复——否则 grid 复用「哪个同维 axis 的 tickCount」不确定（评审 P2.5）
assertNoDuplicateGuides(guides); // 同 type+dimension 出现 > 1 → 抛清晰错误
const grids = guides.filter(g => g.type === 'grid').map(g => lowerGuide(g, ctx)).filter(Boolean);
const axes  = guides.filter(g => g.type === 'axis').map(g => lowerGuide(g, ctx)).filter(Boolean);
const markLayers = node.marks.map(m => lowerMark(m, rows, project)).filter(Boolean);
// 根 plot scope 仍 localNamespace:true：guide/mark 的 id 被隔离在内部 frame —— alpha.2 只内部埋点、不承诺外部引用（评审 P1.2）
const children = [...grids, ...markLayers, ...axes];
return { type: 'scope', localNamespace: true, ...(node.id ? { id: node.id } : {}), children };
```

理由：

1. **同一投影器 → 刻度与 mark 对齐**：guide 用 [ADR-03](./03-plot-area-layout.md) 给 mark 用的同一 plotArea + projector，tick 像素位置与数据点严格一致（否则刻度与点错位）。
2. **z-order grid→mark→axis**：网格垫底不抢数据、坐标轴压顶不被 mark 盖——符合常规图表观感，靠 core children 顺序（稳定 z-order）实现，无需额外 z 字段。
3. **样式上提 scope**：一根轴几十个刻度 / 标签，stroke / fontSize 写一次在 scope，core IR 体积小（延续 alpha.1 原则）。
4. **标签靠 core Node center 定位**（无需改 core）：core `Node.position` 是节点中心、无 self-anchor（已查证 `packages/core/core/src/ir/node.ts`）。x label 水平居中天然、垂直用 `fontSize` 估高偏移；y label 垂直居中天然、水平用与 [ADR-03](./03-plot-area-layout.md) 同源的半宽估算偏移。不发明新图元、不依赖 core 未有的能力。
5. **anchor id 预留 = 仅内部埋点（评审 P1.2）**：axis 层 scope 带 `id`，但根 plot scope `localNamespace:true` 把子 id 隔离在内部 frame——**alpha.2 不承诺 `plot.xAxis`/`plot.yAxis` 外部可引用**，只埋字段位；对外导出 semantic handle 的结构留 alpha.5（与 alpha.1 anchor「埋而不解析」一致）。
6. **空安全**：tick 集为空（退化 domain，[ADR-02](./02-auto-tick.md)）/ guide 列表为空 → 该层省略或返回 null，不产空 scope。

## 待决策点

- **B1（已查证，头号待裁决）——标签定位走估算偏移 vs core 加 self-anchor**：core `Node` 无 self-anchor（`position`=中心）。本 ADR 默认 **center + 估算偏移**（x label 无需估宽、y label 估半宽，无 core 改动，alpha.2 够用）。**更精确**的右对齐 / 边缘贴合需给 core `Node` 加 `placement`/self-anchor 字段——core 改动、走 next-core → next → 回灌 next-plot（成本大）。倾向估算偏移；若 review 觉得轴标签精度要求高，再上 core 字段。
- **core 纯文字 Node（已定，评审 P1.1）**：label node 用 `nodeDefault:{ font:{ size: fontSize }, stroke:'none', fill:'none', padding:0 }`——core 省略 `shape` 默认仍是 rectangle，故显式去描边/填充 + 零 padding 得「只文字」。字号字段是 `font.size`（非 `fontSize`）。
- **grid 淡化 = core `drawOpacity`（已定，评审 P1.1）**：path 透明度字段是 `drawOpacity`（非 `strokeOpacity`）；值 `0.15` 待调，随 currentColor 主题走、不写死颜色。
- **同 (type, dimension) 重复 guide（评审 P2.5）**：lowering **拒绝**（`assertNoDuplicateGuides` 抛清晰错误）——否则两个不同 `tickCount` 的同维 axis、或 grid 该复用哪个 axis 的 ticks 行为不定。备选 first-wins；倾向拒绝（明确、对齐「清晰错误」原则）。
- **`plot.xAxis`/`plot.yAxis` 外部引用（评审 P1.2）**：因根 scope `localNamespace`，alpha.2 只内部埋 id；对外可引用句柄的导出结构留 alpha.5。
- **轴线是否包含「零线 / 边框」**：alpha.2 轴线 = plot area 的底边（x）/ 左边（y）两根。是否额外画顶/右边框？倾向**不画**（只画有刻度的两根轴），简洁。
- **刻度标签溢出**：最左/最右 x label、最高 y label 可能超出 plot area 边——靠 [ADR-03](./03-plot-area-layout.md) 的 top/right 防溢出留白吸收；不足时由用户 `margin` 覆盖。
- **label fontSize 与 core 度量**：lowering 写 `fontSize` 到 node；core compile 时按该字号 measure 排版。estimate（ADR-03）与此处必须用同一 `fontSize`（已由 `LowerPlotsOptions.fontSize` 单一来源保证）。

## DSL 表面

无独立用户表面（lowering 内部）；用户经 [ADR-01](./01-guide-ir.md) guides / [ADR-05](./05-guide-bindings-dsl.md) `<Axis>`/`<Grid>` 触发。端到端效果：

```ts
import { compileToScene } from '@retikz/core';
import { lowerPlots } from '@retikz/plot';
// spec.guides = [{type:'grid',dimension:'y'},{type:'axis',dimension:'x'},{type:'axis',dimension:'y'}]
const scene = compileToScene({ version:1, type:'scene', children:[spec] }, { composites: lowerPlots({ sales }, { width:480, height:300 }) });
// scene.primitives 含：网格线 + 折线/点 + 轴线 + 刻度线 + 刻度标签文字
```

## 测试设计

`packages/plot/plot/tests/lower/guide.test.ts`（新建）：lower axis x/y → 轴线 + N 刻度线 + N label(text=刻度标签)；grid x/y → N 条跨域线；label=false → 无 label node；axis id → scope.id；样式上提到 scope；刻度像素位置 = 投影器映射（与 mark 对齐）。
`packages/plot/plot/tests/lower/lowerPlots.test.ts`（修改）：端到端 z-order（grid 在 mark 前、axis 在后）+ compile 出含轴/网格的 scene。具体见「实现契约 § 测试象限」。

## 影响

- **`packages/plot/plot/src/lower/guide.ts`**（全新）：`lowerGuide` + `GuideContext`。
- **`packages/plot/plot/src/lower/expand.ts`**（修改）：编排 grid→mark→axis 进根 scope；按 dimension 预算 `xTicks`/`yTicks`（[ADR-02](./02-auto-tick.md)）并喂 mark 投影（[ADR-03](./03-plot-area-layout.md)）与 guide。
- **对 IR**：无（产 core IR）。
- **对外 API**：无（`lowerGuide` 内部，不进包 barrel）。
- **依赖 core**：`IRScope` / `IRPath` / `IRStep` / `IRNode`（text + anchor）—— 仅消费、不改 core。
- **文档**：带轴 demo 在 [ADR-05](./05-guide-bindings-dsl.md) 阶段落地。

## 不在本 ADR 范围

- **`<Axis>`/`<Grid>` 子组件、默认自动出、`bare`** → [ADR-05](./05-guide-bindings-dsl.md)。
- **轴标题 / legend / reference line** → 后续。
- **polar 的径向 / 角向 guide** → alpha.4。
- **anchor / datum locator 命中解析** → alpha.5（本 ADR 只埋 id）。

---

## 实现契约（必填）

### Level

`red`

判级规则：动 `packages/plot/plot/src/lower/**`（下沉 core IR 契约边界）→ red。本 ADR 自评：`red`。

### Schema 改动

无（lowering 消费 [ADR-01](./01-guide-ir.md) 的 guide IR、产 core IR，不新增 / 不改 IR schema）。

### 文件 scope

- `packages/plot/plot/src/lower/guide.ts`（新建）
- `packages/plot/plot/src/lower/expand.ts`（修改：编排 guides + 预算 ticks）
- `packages/plot/plot/tests/lower/guide.test.ts`（新建）
- `packages/plot/plot/tests/lower/lowerPlots.test.ts`（修改：端到端 z-order + compile 带 guide）

### 测试象限

**Happy path**：

- `lower_axis_x_structure`：axis x → 一层 scope，含 1 轴线 Path + N 刻度线 Path + N label Node，label.text === tick 标签
- `lower_axis_y_structure`：axis y 同（label 垂直居中于 tick y、水平按估算半宽左移）
- `lower_grid_y_lines`：grid y → N 条横跨 plot area 的 Path
- `tick_pixels_match_projector`：刻度 Path/label 的像素位置 === 同一投影器对 tick value 的映射（与 mark 对齐）

**边界**：

- `axis_ticklabels_false_no_text`：`tickLabels:false` → 该轴无 label Node（仍有轴线 + 刻度线）
- `lower_axis_single_tick`：退化 domain（单刻度，[ADR-02](./02-auto-tick.md)）→ 一根刻度，不崩
- `grid_empty_ticks_skipped`：tick 空 → grid 层省略 / null（不产空 scope）

**错误路径 / 退化**：

- `guide_styles_hoisted`：轴线 `stroke` / label `font.size` 上提到层 scope 的 pathDefault/nodeDefault（label 用 `stroke:'none'`/`fill:'none'`/`padding:0`、grid 用 `drawOpacity`），不逐图元重复
- `duplicate_guide_rejected`：同 (type,dimension) 出现两次（如两个 `axis y`）→ `assertNoDuplicateGuides` 抛清晰错误
- `axis_id_to_scope_id`：`{type:'axis',dimension:'x',id:'xAxis'}` → 该层 scope.id === 'xAxis'（内部埋点，外部引用留 alpha.5）

**交互（跨 ADR / z-order）**：

- `zorder_grid_mark_axis`：根 scope children 顺序 = grid 层 → mark 层 → axis 层
- `compile_with_guides_scene`：`compileToScene` 带 guides → `scene.primitives` 同时含网格线、数据几何、轴线、刻度文字（端到端不抛）

### 依赖现有元素

- [ADR-01 guide IR](./01-guide-ir.md)（`packages/plot/plot/src/ir/guide.ts`）—— **消费**：读 `guides` 的 type/dimension/tickCount/label/id。
- [ADR-02 `computeTicks`](./02-auto-tick.md)（`lower/ticks.ts`）—— **消费**：每维 ticks，axis 与 grid 复用。
- [ADR-03 `computePlotArea` / projector / fontSize](./03-plot-area-layout.md)（`lower/layout.ts` / `expand.ts`）—— **消费**：plot area 边界与投影器、字号。
- alpha.1 `lowerMark` / `expand` / `createCartesianProjector`（`lower/mark.ts` / `expand.ts` / `project.ts`）—— **复用 / 修改**：编排同 scope、共享投影器。
- `@retikz/core` 的 `IRScope` / `IRPath` / `IRStep` / `IRNode`（text + `position`=中心，**无 self-anchor**，见 B1）/ `IRChild` —— **消费**：lowering 目标，仅产不改 core。
