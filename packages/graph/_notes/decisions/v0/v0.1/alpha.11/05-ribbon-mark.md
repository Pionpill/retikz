# ADR-05：ribbon mark——「源/目标/宽度 → 可填充曲带 Path」的几何 primitive，端点为字段对（经坐标系投影）；sankey 布局明确划出范围

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[alpha.11 roadmap](./roadmap.md)「ribbon mark」· [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 ribbon / §7 scope 组合 / §8.1 可连接性](../../../../architecture/plot-design.md) · [ADR-01 区间几何投影](./01-cell-geometry-projection.md)（contour 围合思路同源）· core [step schema cubic / curve / bend](../../../../../../kernel/core/src/schemas/path/step/schema.ts)

## 背景

塑造本决策的几条硬约束：

- plot-design（§2 / §3.7）把 mark 分两族：位置类几何（point / line / interval / area / sector）已落地；**关系类几何**——两端点集合间的带状连接——由 ribbon 承载，此前不存在。
- ribbon 把三件本可独立的事缠在一起，必须拆解：**几何**（有宽度的流带 = 上/下边界曲线 + 两端封口围成可填充闭区域，与 area mark「上沿 + 回边 + cycle」同构，只是长边换 cubic）、**端点定位**（算半宽法向偏移 / 四角 / cubic 控制点都需要端点的**已解析屏幕坐标**）、**布局**（sankey 的节点排布 / 流量堆叠 / 交叉最小化是启发式算法，不是几何）。
- 业界共识是**布局与画带解耦**：D3-sankey（`d3.sankey()` 布局 + `sankeyLinkHorizontal()` 画带）、G2（`transform` 布局 + `edge` geometry）、Observable Plot（社区先 d3-sankey 再画带）皆两段分离。
- §8.1 硬约束：lower 出的 core 元素应可被进一步连接 / 标注。但「可填充曲带」是连续形态（非参数化 shape），连接靠**端点锚点**而非整带 shape anchor——本 ADR 须诚实界定这点。

## 决策

本 ADR 只交付 ribbon **几何 primitive**——「给定源点、目标点、源宽、目标宽 → 一条可填充的 cubic 曲带 Path」，端点为**字段对**（经坐标系投影成屏幕坐标）；node id 跨 scope 端点与 sankey 布局算法明确**不进本 ADR**。

**一句话**：ribbon mark = area mark 的「双弯边版本」。area 是「上沿 + 贴 baseline 回边」；ribbon 是「上边界 cubic + 下边界 cubic + 两端直线封口」，同样 `move → 边 → cycle` 围成可填充闭区域。ribbon 吃**边数据**（每行一条流：source / target / value），每行下沉成**一条** core `Path`。

核心数据结构（IR schema，字面形态本身就是决策的部分）：

```ts
// 一行 = 一条流带；source / target 各是 { x, y } 字段对，经当前 scope frame.projectRoles 投影出屏幕点。
RibbonMarkSchema = {
  type: literal(PlotMark.Ribbon),
  source: RibbonEndpointSchema,   // { x: Channel, y: Channel } —— 单一字段端点形态，无 union/refine
  target: RibbonEndpointSchema,
  value: string,                  // 流量字段 → width scale → 带宽（user units）
  width?: string,                 // 可选独立 width scale 名（缺省合成线性 scale）
  endWidth?: string,              // 可选目标端宽度字段；缺省 = 与源端等宽
  curvature?: number(0..1),       // 控制点沿主轴外推比例，默认 0.5
  orientation?: enum(Horizontal | Vertical), // 主轴取向，默认 horizontal
  // …markBase（id / 样式 encoding）
}
```

围合结构：`move(S_top) → cubic(→T_top) → line(T_bot 目标封口) → cubic(→S_bot) → cycle(源封口自动闭合)`。

**已拍板的设计判断**：

1. **端点统一字段投影，几何前提自洽**：端点形态收敛为 `{ x, y }` 字段对（无 union / refine 判别）。四角 / 法向 / cubic 控制点都需源/目标的**已解析屏幕坐标**，字段端点经 `frame.projectRoles` 在 lowering 期即得坐标，几何当场算出；覆盖单坐标系内 sankey / alluvial（布局产物把每行 x/y 写回数据）这一主场景。
2. **半宽沿 orientation 垂向 normal**（horizontal→(0,1)、vertical→(1,0)），**不用「源→目标弦方向」的法向**——弦法向在对角流（源/目标几乎竖直对齐而水平跨度小）时让封口歪斜、半宽朝向错，评审判定为「流带丑」的病根。改用 orientation 垂向后封口始终沿垂向，干净的 sankey / alluvial 形态。
3. **主轴显式 `orientation` prop，默认 horizontal**，**不「按源→目标位移自动判定」**——自动判定在对角流下选错主轴 → 流带歪斜。curvature 外推沿 `mainUnit × (curvature × Δmain)`（Δmain = 目标减源在主轴上的有符号分量），control1 = S 端 + e、control2 = T 端 − e；`curvature=0` → 控制点贴端点 ≈ 准直带。
4. **宽度沿程渐变**：`endWidth` 缺省 = 等宽带；给定 = 目标端用 `endWidth` 经同一 width scale 算独立半宽，带子呈喇叭形（四角各用各端半宽，纯几何加法，不引入布局）。
5. **value=0 / 退化带**：带宽 < ε → 跳过该行（返回 null，与 area 上沿 <2 点、interval 零高一致）；字段缺失 / 非有限 value → fail-loud；负流不静默（与 sector 负值同，fail-loud）。

**被否决的选项 + 理由**：

- **给 ribbon 造参数化「曲带 shape」**：用更复杂路径换无收益的统一——曲带无闭式 anchor 价值（连接走端点），且 core `cubic` step（精确两控制点切向）现成、零 core 改动。否决，复用 area 围合机制。
- **把 sankey 布局塞进 ribbon mark**：会让本应干净的几何 primitive 背上启发式算法的不确定性，且与 plot 既有 `transform` 层（stack / dodge）职责重叠。布局是 Statistics / layout 职责，ribbon 只消费布局产物。否决，划出范围。
- **node id 端点产 core `NodeTarget`**：id 只有 core compile 期解析坐标，lowering 期无坐标，`NodeTarget` 不足以算半宽偏移与四角。不在 plot 层造一个解析不出坐标的半成品。降级为后续方向。

DSL 表面与字段含义见文档站 `apps/docs/src/contents/graph/components/mark/ribbon/`（IR 形态 + React `<RibbonMark>` 扁平 props 形态）。

## 不在本 ADR 范围

- **node id 端点 / 跨 scope ribbon connector**（连接不同 facet / inset 的具名 core node）：端点几何需已解析屏幕坐标，而 `{ node }` 端点在 plot lowering 期还没坐标。正确做法是 **core 级高阶 path / shape 在 compile 期解析坐标后再生成曲带**，或另起 ADR。这是评审 BLOCKING 的降级结论：v1 ribbon 只支持字段端点。
- **sankey 布局算法**（节点排布 / 流量堆叠顺序 / 交叉最小化）：归 Statistics / 独立 layout（alpha.12+）。本 ADR 最重要的范围切割——布局与画带解耦。
- **精确端切向法向封口**（弯带封口完全垂直于端切向）：本轮半宽沿 orientation 垂向，精确端切向法向版后续优化。
- **alluvial 的「flow 分组堆叠」语义**（多条流在同一 stage 节点处按比例堆叠）：依赖布局产物，随布局推迟。
- **曲线 / 极坐标 / 三元坐标系下的 ribbon**：本轮 cubic 控制点按笛卡尔屏幕空间算；非笛卡尔曲带形态（如极坐标 chord diagram）顺延。
- **整带 shape anchor / 沿带 label 定位**：ribbon 连接靠端点锚点；整带作为可连接 shape 不做，沿带 label 走 core step `label?` 后续按需。

## 未来兼容性

- 纯新增 mark，对外 API 非 breaking。
- node id 跨 scope connector 走 core 级高阶 path / shape 接入，不改本 ADR 的字段端点形态——届时端点 schema 若需 union 判别，是加法而非替换。
- vanilla 无代码改动：`renderPlot` mark 无关、纯 spec 驱动，ribbon 经 `PlotSpecSchema.parse → lowerPlots → compileToScene → renderToSvgString` 端到端出图。

## 实现指针

- IR / lowering / 几何辅助：`packages/graph/plot/src/ir/mark.ts`、`packages/graph/plot/src/lower/mark.ts`（`lowerRibbon`）、`packages/graph/plot/src/lower/anchor.ts`（四角 / 法向 / 控制点 / datum 中线锚点）；测试 `packages/graph/plot/tests/lower/ribbon.test.ts`、`packages/graph/plot/tests/ir/mark.schema.test.ts`。
- React sugar：`packages/graph/plot-react/src/components/marks.tsx`（`RibbonMark` FC）+ `build-plot-spec.ts`（`collectInto` ribbon 分支）+ barrel；测试 `packages/graph/plot-react/tests/components/ribbon-mark-assembly.test.tsx`。
- vanilla SSR：`packages/graph/plot-vanilla/tests/render-plot.test.ts`（无 vanilla 源码改动）。
- 文档：`apps/docs/src/contents/graph/components/mark/ribbon/`（mdx zh/en + basic / flared demo）。

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:_notes/decisions/plot/v0/v0.1/alpha.11/05-ribbon-mark.md`（封板全文）。
