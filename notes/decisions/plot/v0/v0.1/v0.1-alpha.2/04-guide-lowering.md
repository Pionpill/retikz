# ADR-04：guide lowering（Axis（含 grid 子属性）+ ticks + plot area → core Path / Node(text)，绑 anchor id）

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[plot v0.1-alpha.2 待办](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §8 lowering / §3.9 guide / §14 anchor](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 guide IR](./01-guide-ir.md) · [ADR-02 d3-scale](./02-d3-scale.md) · [ADR-03 布局](./03-plot-area-layout.md) · 改动：[alpha.1 ADR-06 lowerPlots](../v0.1-alpha.1/06-plot-lowering.md)

## 背景

[ADR-01](./01-guide-ir.md) 定了 guide IR、[ADR-02](./02-d3-scale.md) 算 nice 刻度、[ADR-03](./03-plot-area-layout.md) 缩出 plot area + 投影器。本 ADR 把它们**拼起来**：把每个 axis guide **下沉成 core 图元**——轴线 / 刻度线 / 网格线是 `Path`，刻度标签是 `Node`(text)——编排进 plot 根 scope，与 mark 一起渲染。这是管线第 8 段 lowering 落到 core 的合流点（plot-design §8：plot 不自渲染，只产 core `Scope/Node/Path/Step/Coordinate`）。

## 决策：每个 axis guide → 网格层（垫底，若 `grid:true`）+ 轴层（压顶）；样式上提；标签用 Node(text) + 估算偏移

guide 的 `grid` 子属性意味着**一个 axis 可能同时产两组几何、却落不同 z 层**：网格线在 mark **之下**、轴线/刻度/标签在 mark **之上**。故 `lowerGuide(guide, ctx)` 返回 `{ gridLayer, axisLayer }`——`gridLayer` 仅 `grid:true` 时非空（横跨 plot area 的平行线族），`axisLayer` 总有（轴线 + 刻度线 + 可选标签）。轴线/刻度/网格走 `Path`（`Step` move/line），刻度标签走 `Node`(text)。`expand.ts` 编排 z-order：**所有网格层 → marks → 所有轴层**（网格垫底、坐标轴压顶不被数据盖）。axis 的 `id` → 其轴层 scope 的 `id`。刻度位置经 [ADR-03](./03-plot-area-layout.md) 同一投影器映射，**保证刻度与 mark 严格对齐**（同一 scale → 同一 projector）。

网格几何按轴拆分（[ADR-01](./01-guide-ir.md) 网格归属）：`axis x` 网格是一族**竖线**（每 x 刻度处、纵贯 plot area）、`axis y` 是一族**横线**——刻度直接取该轴自己的 ticks（同源、无歧义）。

**标签定位 = core Node center + 估算偏移**（B1，关键约束）：查证 core `IRNode` 的 `position` 是**节点中心、无 self-anchor**（`north`/`east` 等锚点只在「引用别的节点」时作目标，不能让节点按自身某锚点定位）。所幸 core Node 的 text 天然居中于 `position`：x 轴标签水平居中自动成立（无需估宽）、垂直用 `fontSize` 估高下移；y 轴标签垂直居中自动、水平用 `estimateLabelWidth(label, fontSize)/2`（与 [ADR-03](./03-plot-area-layout.md) left margin 同源）估半宽左移。**alpha.2 用估算偏移、不改 core**。

样式上提到对应层 scope（**字段名对齐 core schema**，字面即决策、易踩坑故记下）：

- 轴层：`pathDefault:{ stroke:'currentColor' }` + `nodeDefault:{ font:{ size: fontSize }, stroke:'none', fill:'none', padding:0 }`——core 省略 `shape` 默认仍是 rectangle，故显式去描边/填充 + 零 padding 才得「只文字」；字号字段是 **`font.size`**（不是 `fontSize`）。
- 网格层：`pathDefault:{ stroke:'currentColor', drawOpacity:0.15 }`——core path 透明度字段是 **`drawOpacity`**（不是 `strokeOpacity`），值 `0.15` 随 currentColor 主题走、不写死颜色。

延续 alpha.1「用 scope 承载共享样式、减小 IR 体积」原则。真源见 `plot/src/lower/guide.ts`（`lowerGuide` / `GuideContext` / `LoweredGuide`）、`plot/src/lower/expand.ts`（编排 + `assertUniqueAxisDimension`）。

理由：

1. **同一投影器 → 刻度与 mark 对齐**：guide 用给 mark 的同一 plotArea + projector，tick 像素位置与数据点严格一致。
2. **z-order 网格层→mark→轴层**：同一根 axis 拆两层落在 mark 两侧——网格垫底不抢数据、坐标轴压顶不被盖；靠 core children 顺序（稳定 z-order）实现，无需额外 z 字段。
3. **样式上提 scope**：一根轴几十刻度/标签，stroke / fontSize 写一次在 scope，core IR 体积小。
4. **标签靠 core Node center 定位（无需改 core）**：不发明新图元、不依赖 core 未有能力。
5. **anchor id 预留 = 仅内部埋点**：axis 层 scope 带 `id`，但根 plot scope `localNamespace:true` 把子 id 隔离在内部 frame——**alpha.2 不承诺 `plot.xAxis`/`plot.yAxis` 外部可引用**，只埋字段位；对外导出 semantic handle 留 alpha.5（与 alpha.1 anchor「埋而不解析」一致）。
6. **空安全**：tick 集为空（退化 domain）/ guide 列表为空 → 该层省略或返回 null，不产空 scope。

### 被否决 / 推迟的设计点

- **同 dimension 多 axis** → lowering **拒绝**（`assertUniqueAxisDimension` 抛清晰错误）：一根维度一根轴，否则两个不同 `tickCount` 的同维 axis 刻度数不定。否决 first-wins（不够明确）。grid 现是 axis 子属性、复用本轴 ticks，已无「grid 复用哪个 axis」歧义。
- **标签精确右对齐 / 边缘贴合** → 需给 core `Node` 加 `placement`/self-anchor 字段（core 改动，走 next-core → next → 回灌 next-plot，成本大）；alpha.2 估算偏移够用，留作备选。
- **顶/右边框轴线** → 不画，只画有刻度的两根轴（底边 x / 左边 y），简洁。

## 不在本 ADR 范围

- **`<Axis>` 子组件 / 默认自动出 / `bare`** → [ADR-05](./05-guide-bindings-dsl.md)。
- **轴标题 / legend / reference line** → 后续。
- **polar 的径向 / 角向 guide** → alpha.4。
- **anchor / datum locator 命中解析** → alpha.5（本 ADR 只埋 id）。

---

> **实现指针**：level `red`（动 `plot/src/lower/**`，下沉 core IR 契约边界）、无 IR schema 改动（消费 [ADR-01](./01-guide-ir.md) guide IR、产 core IR）。
> - 真源以代码为准：`lowerGuide` / `GuideContext` / `LoweredGuide`（`plot/src/lower/guide.ts`）、编排 grid→mark→axis + `assertUniqueAxisDimension` + 按维度预算 ticks（`plot/src/lower/expand.ts`）；消费 core `IRScope`/`IRPath`/`IRStep`/`IRNode`（仅产不改 core），样式字段名以 core schema 为准（`font.size` / `drawOpacity` / `stroke:'none'`）。
> - 测试见 `plot/tests/lower/guide.test.ts`（轴层结构、x/y 网格线、`tickLabels:false` 无 label、id→scope.id、刻度像素 = 投影器映射、样式上提、`duplicate_axis_dimension_rejected`）与 `plot/tests/lower/lowerPlots.test.ts`（端到端 z-order + compile 带 guide 的 scene）。
> - 完整原文（lowerGuide 草案 / 下沉规则表 / 待决策点 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `7acbf962`；压缩前完整施工蓝图 = `git show 7acbf962^:notes/decisions/plot/v0/v0.1/v0.1-alpha.2/04-guide-lowering.md`。
