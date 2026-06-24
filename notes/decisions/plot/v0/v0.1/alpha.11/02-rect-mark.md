# ADR-02：rect mark——双维 band 正交 cell 的 heatmap 格，复用 ADR-01 `projectCell` 几何 + sequential color 取值

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[alpha.11 roadmap](./roadmap.md) · [alpha.11 ADR-01：cell-geometry-projection](./01-cell-geometry-projection.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 mark 表 / §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../../architecture/plot-design.md)

## 背景（塑造决策的硬约束）

- plot-design §3.7 把 `rect` 定义为「二维格子区域」，典型用法是 heatmap：x 分类 × y 分类的网格，每格的值映射到颜色。原 mark union 只有 `point` / `line` / `interval` / `sector` / `area`，缺 `rect` 就画不出 heatmap / 混淆矩阵 / 日历热图这类「双维分类网格 + 色阶」基础图。
- rect 与已有 `interval`（柱）的本质区别在「第二维是什么」：interval 的 secondary（y）是连续区间 `coordinate(baseline)..coordinate(value)`（柱高随值伸缩）；rect 的 primary（x）**和** secondary（y）**都来自 band scale**，cell = `bandwidth_x × bandwidth_y` 的固定格子，数据值不进位置、而经 color 通道映射成填充色。这是 plot 里**第一次要求 secondary 维也是 band scale**（取其 `bandwidth`）。
- ADR-01 已把区间几何下沉统一成「cell → `frame.projectCell(cell)` → 装配 Node」这条坐标系无关路径，并定死唯一规则：坐标系实现 `projectCell` 且 mark 提供 cell 构造才支持 cell 类 mark，否则 fail-loud，不存在引擎自动兜底。rect 的装配与 interval **同构**，差别只在 rect 自己要提供「按坐标系算 cell」这一步。
- 同类库对照：Observable Plot 的 `cell`、Vega-Lite 的 `rect`、G2 的 `polygon`/`cell` 都是「双维分类定格、值走颜色」。

## 决策：rect = 双 band 正交 cell，几何完全复用 ADR-01 `projectCell`，值经 StyleEncoding color 通道（通常 sequential 色阶）映射

新增 `RectMarkSchema` + `PlotMark.Rect`，并入 `MarkSchema` union。rect 与 interval **共享同一条「算 cell → `projectCell` → 装配 Node」路径**，差别只在 cell 构造：interval 的 secondary 是 `coordinate(baseline)..coordinate(value)`（连续区间），rect 的 primary / secondary 都是 band 带 `[center − bandwidth/2, center + bandwidth/2]`。v1 只实现 cartesian2D 的 cell 构造（`rectCell`），非 cartesian2D 对 rect fail-loud（与 ADR-01 一致）。

核心数据结构（字面形态即决策）：rect mark IR 的 `encoding` 携结构化通道 `x` / `y`（均须解析为 band scale）+ `color`（值通道）；缺 `color` 即纯网格、无值映射。

```ts
{ type: 'rect', encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: 'heat' } } }
{ type: 'rect', encoding: { x: { field: 'day' }, y: { field: 'hour' } } } // 缺 color → 纯网格
```

React sugar `<RectMark>` 与 `<BarMark>` / `<PointMark>` 同风格：`x` / `y` / `color` / `id` 均扁平顶层 string props，无 `series` / `stack`（网格无堆叠 / 并排语义），由 `build-plot-spec` 内省装配进 IR。

理由：

1. **rect 与 interval 几何同构，必须共享装配路径，不另开分支**——两者都是「正交 cell → `projectCell` → 可连接 Node」，唯一差异是 cell 的 secondary 怎么算（band×band vs band×连续）。给 rect 单独写一套几何，等于把 ADR-01 刚收敛掉的「mark × coord 分支矩阵」又拆开（plot-design §8.3 否决的路线 ii）。装配路径坐标系无关：将来补 polar 环格 / 曲线 rect 的 cell 构造后装配零改动出图——但这是「后续补 cell 构造」，**不是引擎自动获得**，无 cell 构造的坐标系一律 fail-loud。
2. **值走 color 通道（StyleEncoding）是 grammar of graphics 的正交分解**——位置（双 band 定格）与视觉（值→色）解耦，与 Observable Plot / Vega-Lite 一致；plot 的连续色阶（sequential / diverging / quantize）已对 point/bar/sector 落地，rect 直接复用 `colorOf`，不新造取色路径。
3. **secondary band 是新增的最小能力面**——rect 唯一的新 scale 要求是「y 轴也得是 band scale」（取 `frame.secondary.bandwidth`）。`PositionScale.bandwidth` 机制现成（band 返回 `bandwidth()`、连续返回 0），rect 只需在 lowering 显式要求 secondary `bandwidth > 0`，否则 fail-loud。
4. **守 §8.1 可连接性**：每格是可连接 Node（cartesian2D 出 rectangle Node，`boundaryPoint` / compass anchor），可被 `<Path>` / `<Node>` 连接标注，不退裸 Path。

## 被否决选项

- **给 rect 单独写一套几何 / 装配分支**：否决，理由见决策理由 1（重新拆开 ADR-01 收敛的 mark × coord 分支矩阵，违 plot-design §8.3）。
- **缺 color 时 fail-loud**：否决。选「回退默认填充」——缺 color 回退 `DEFAULT_FILL`（`currentColor`，与 interval/point 缺 color 一致），产出无值的纯网格可作底格 / 占位再叠 point / text；不为 rect 单开 fail 语义。是否升级为 warn 留 Theme / 校验阶段。

## 不在本 ADR 范围

- **binned heatmap / 显式区间边**（`x0Field`/`x1Field`/`y0Field`/`y1Field` + bin transform）：连续轴分箱热图需显式区间字段描述每格边界，cell 的 primary/secondary 直接来自 `coordinate(x0)..coordinate(x1)`。但 bin transform（连续→箱）是独立能力，未落地前显式区间边无数据来源；双 band 已覆盖 heatmap / 混淆矩阵 / 日历图主场景。gate 于 bin transform，留后续 ADR；该批字段不在本轮 schema。
- **polar2D 环格 rect**（角度 band × 半径 band）：装配路径坐标系无关可复用，但需为 polar 单独补「角度 band × 半径 band → cell」构造（secondary 也须 band），与 ADR-01「无 cell 构造即 fail-loud」一致，不自动获得。v1 仅 cartesian2D（heatmap 绝对主场景），polar 环格后续按需。
- **rect 圆角 / 描边 / 格间隙（cell padding）**：归样式 / Theme（alpha.15），与 ADR-01「柱圆角」同处理。
- **rect 的 opacity / 二级视觉通道**：本轮值只走 color；多通道（color + opacity 双编码）后续。
- **高基数性能**：N 格 = N 个 Node（plot-design §16.1 软肋 #1），rect 同样受限，不在本 ADR 解决。

## 兼容性

纯新增 mark + `<RectMark>` 组件，非 breaking。三包 lockstep 交付：plot 改 IR + lowering；plot-react 加组件 + build-plot-spec 推断（`hasRect` 强制 x/y 双 band，与显式 `<Scale>` 冲突时 fail-loud）；plot-vanilla **无 src 改动**——`renderPlot(spec, data)` mark 无关、纯 spec 驱动，新 mark 经 IR + lowering 自动渲染。

---

实现指针：mark IR / cell 构造 / 下沉装配 / color 白名单见 commit `74df2ab1`，落地于 `packages/graph/plot/src/ir/mark.ts`、`packages/graph/plot/src/lower/{anchor,mark,expand}.ts`（消费 ADR-01 `packages/graph/plot/src/lower/project.ts` 的 `projectCell` / `Cell` / `CellGeometry`）；React sugar 见 `packages/graph/plot-react/src/components/{marks.tsx,build-plot-spec.ts}`。测试见 `packages/graph/plot/tests/lower/rect.test.ts`、`packages/graph/plot/tests/ir/mark.test.ts`、`packages/graph/plot-react/tests/components/build-plot-spec.test.tsx`、`packages/graph/plot-vanilla/tests/render-plot.test.ts`（SSR heatmap）。文档见 `apps/docs/src/contents/plot/components/mark/rect/`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:notes/decisions/plot/v0/v0.1/alpha.11/02-rect-mark.md`（封板全文）。
