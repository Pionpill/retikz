# ADR-02：rect mark——双维 band 正交 cell 的 heatmap 格，复用 ADR-01 `projectCell` 几何 + sequential color 取值

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[alpha.11 roadmap](./roadmap.md) · [alpha.11 ADR-01：cell-geometry-projection](./01-cell-geometry-projection.md) · [plot v0.1 roadmap](../roadmap.md) · [plot-design.md §3.7 mark 表（rect=二维格子区域 heatmap） / §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../../architecture/plot-design.md)

## 背景

plot-design §3.7 把 `rect` 定义为「二维格子区域」、典型用法是 heatmap：x 分类 × y 分类的网格，每格的**值映射到颜色**。现状 mark union（`packages/plot/plot/src/ir/mark.ts`）只有 `point` / `line` / `interval` / `sector` / `area`，缺 `rect`——画不出 heatmap、混淆矩阵、日历热图这类「双维分类网格 + 色阶」的基础图。

heatmap 与已有 `interval`（柱）的本质区别在「第二维是什么」：

- **interval**：primary（x）来自 band scale（取 `bandwidth` 当柱宽），secondary（y）是**连续区间** `coordinate(baseline)..coordinate(value)`——柱高随数据值伸缩，cell 是「一段带 × 一段连续区间」。
- **rect**：primary（x）**和** secondary（y）**都来自 band scale**，cell = `bandwidth_x × bandwidth_y` 的固定格子；数据值不进位置、而是经 color 通道（StyleEncoding）映射成格子填充色。这是 plot 里**第一次要求 secondary 维也是 band scale**（取其 `bandwidth`），interval 此前只需 primary band。

同类库对照：Observable Plot 的 `cell`（双 band 网格 + fill）、Vega-Lite 的 `rect`（x/y 均 nominal/ordinal、color 编码 quantitative）、G2 的 `polygon`/`cell`——都是「双维分类定格、值走颜色」。retikz 已在 alpha.11 ADR-01 把区间几何下沉统一成「**cell → `frame.projectCell(cell)` → 装配 Node**」这条坐标系无关的装配路径；ADR-01 同时定死唯一规则：**坐标系实现 `projectCell` 才支持 cell 类 mark，没实现就 fail-loud，不存在「引擎对曲线/自定义坐标系自动 contour 兜底」**。rect mark 的装配与 interval **同构**——同样是把一个正交 cell 投影成可连接 Node，**装配路径坐标系无关、完全复用**——差别只在 rect 自己要提供「按坐标系算 cell」这一步（cell 构造）。因此 rect **不引入新装配路径**，只新增「双维 band cell 怎么算」这一构造步骤；v1 只实现 cartesian2D 的 cell 构造。

## 决策：rect = 双 band 正交 cell，几何完全复用 ADR-01 `projectCell`，值经 StyleEncoding color 通道（通常 sequential 色阶）映射

新增 `RectMarkSchema` + `PlotMark.Rect`，并入 `MarkSchema` union。rect 的下沉与 interval **共享同一条「算 cell → `projectCell` → 装配 Node」路径**，差别只在 cell 构造：interval 的 secondary 是 `coordinate(baseline)..coordinate(value)`（连续区间），rect 的 secondary 是 y band 的 `[center − bandwidth_y/2, center + bandwidth_y/2]`（band 带），primary 两者同为 x band 的 `[center − bandwidth_x/2, center + bandwidth_x/2]`。

```ts
// ir/mark.ts —— PlotMark 增成员（as const 对象风格，与既有一致）
export const PlotMark = {
  Point: 'point',
  Line: 'line',
  Interval: 'interval',
  Sector: 'sector',
  Area: 'area',
  /** 矩形格：x / y 均分类（双 band）围成的固定网格 cell，值经 color 通道映射（heatmap / 混淆矩阵 / 日历热图） */
  Rect: 'rect',
} as const;

// rect mark schema：位置走 x / y（双 band）+ 样式 color（值通道）；无 series / arrangement（网格无堆叠 / 并排语义）
export const RectMarkSchema = z
  .object({
    type: z.literal(PlotMark.Rect).describe('Discriminator: a 2D grid cell spanning one band on each axis (heatmap)'),
    ...markBase,
    ...positionalEncoding, // x / y 均必填（双 band），必填性下放 coordinate 级校验，且各自 scale 必须是 band
  })
  .describe('Rect mark: heatmap grid cell sized bandwidth_x × bandwidth_y; the value is mapped to fill via the color channel. Both x and y must resolve to band scales');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, LineMarkSchema, IntervalMarkSchema, SectorMarkSchema, AreaMarkSchema, RectMarkSchema])
  .describe('Mark union; extensible to rule / text in later alphas');
```

cell 构造与下沉（`lower/anchor.ts` + `lower/mark.ts`，复用 ADR-01 `Cell` / `projectCell` / `CellGeometry`）：

```ts
// lower/anchor.ts —— rect 某行 → 双 band 正交 cell（输出空间区间，喂 frame.projectCell）
// primary  = x band 带：[xCenter − bw_x/2, xCenter + bw_x/2]
// secondary= y band 带：[yCenter − bw_y/2, yCenter + bw_y/2]
// 任一非有限（缺类别 / 非 band scale 取不到 bandwidth）→ null（跳过该格，与 interval 跳过守卫一致）
export const rectCell = (mark: RectMark, row: ExternalRow, frame: CartesianFrame): Cell | null => { /* ... */ };

// lower/mark.ts —— rect 装配与 interval 共用单路径：projectCell(cell) → CellGeometry → core Node（坐标系无关，完全复用 ADR-01）
//   cartesian2D → {kind:'rect'} → Node{ position, minimumWidth, minimumHeight } + rectangle 样式（与 barStyle 同：padding0 / strokeWidth0 / fill）
//   非 cartesian2D（无 cell 构造）→ fail-loud（与 ADR-01 一致：无 projectCell 或无 cell 构造的坐标系不出图）
//   值→色：复用 colorOf（expand 的 makeColorResolver 已支持 point/bar/sector 的 sequential/diverging/quantize 连续色阶 per-datum 取色）
```

理由：

1. **rect 与 interval 几何同构，必须共享装配路径，不另开分支**——两者都是「正交 cell → `projectCell` → 可连接 Node」，唯一差异是 cell 的 secondary 怎么算（band×band vs band×连续）。若给 rect 单独写一套几何，等于把 ADR-01 刚收敛掉的「mark × coord 分支矩阵」又拆开（plot-design §8.3 否决的路线 ii）。装配路径坐标系无关：将来给 polar 环格 / 曲线 rect 补各自的 cell 构造后，装配零改动即出图——但这是「后续补 cell 构造」，**不是引擎自动获得**；与 ADR-01 一致，无 `projectCell` 或无 cell 构造的坐标系一律 fail-loud。
2. **值走 color 通道（StyleEncoding）是 grammar of graphics 的正交分解**——位置（双 band 定格）与视觉（值→色）解耦，与 Observable Plot / Vega-Lite 的 `cell` / `rect` 一致；且 plot 的连续色阶（sequential / diverging / quantize，alpha.8）已对 point/bar/sector 落地，rect 直接复用 `colorOf`，不新造取色路径。
3. **secondary band 是新增的最小能力面**——rect 唯一对 scale 选型提的新要求是「y 轴也得是 band scale」（取 `frame.secondary.bandwidth`）。`PositionScale.bandwidth`（`lower/scale.ts:72`）对 band scale 已实时返回 `scale.bandwidth()`、对连续 scale 返回 0，机制现成；rect 只需在 lowering 显式要求 secondary `bandwidth > 0`，否则 fail-loud（y 非 band 画不出格）。
4. **守 §8.1 可连接性**：每个格是可连接 Node（v1 cartesian2D 出 rectangle Node，`boundaryPoint` / compass anchor），可被 `<Path>` / `<Node>` 连接标注（如热图格画引线、框选高亮），不退裸 Path。

## 待决策点 🔻

- **band-only vs 显式区间边（binned heatmap）**：纯分类 heatmap 走双 band（v1 主路径）。但「连续轴分箱热图」（如 2D 直方图 / 密度热图：x、y 是连续值先分箱）需要 x0/x1/y0/y1 **显式区间字段**描述每格边界（类似 interval 的 `y0Field`/`y1Field` 读 stack transform 派生量）——此时 cell 的 primary/secondary 直接来自 `coordinate(x0)..coordinate(x1)` 而非 band bandwidth。**倾向：v1 只做双 band；显式区间边（`x0Field`/`x1Field`/`y0Field`/`y1Field` + 配套 bin transform）作扩展，挪「不在本 ADR 范围」待后续 ADR**。理由：bin transform 本身（连续 → 箱）是独立能力，未落地前显式区间边没有数据来源；双 band 已覆盖 heatmap / 混淆矩阵 / 日历图主场景。
- **缺 color 通道时的默认填充**：rect 的「值」本质就是 color 通道，缺 color 等于 heatmap 没有值映射。两选项：(a) 回退到统一默认色（`DEFAULT_FILL` = `currentColor`，与 interval/point 缺 color 时一致，产出「无值的纯网格」——可用于画底格 / 占位）；(b) fail-loud（rect 无 color 即无意义）。**倾向：(a) 回退默认色**，与既有 mark 缺 color 行为对齐（不为 rect 单开 fail 语义），「网格 + 后续叠加」也是合理用法；是否升级为 warn 留 Theme/校验阶段。
- **rect 是否支持 polar2D**：interval 在 polar 下走 `intervalWedge` 出环楔；双 band 的 rect 在 polar 下理论上是「角度 band × 半径 band 的环格」（极坐标热图 / 极坐标日历）。装配路径（`projectCell` → Node）坐标系无关、可复用，但需为 polar 单独补「角度 band × 半径 band → cell」这一 cell 构造（secondary 也须 band），与 ADR-01「无 cell 构造即 fail-loud」一致——这不是自动获得。**倾向：v1 仅实现 cartesian2D 的 cell 构造（heatmap 绝对主场景），polar 环格的 cell 构造挪「不在本 ADR 范围」**，避免一次性铺开未验证语义。

## DSL 表面

两套表面别混：**IR 形态**是 JSON 可序列化的 mark IR（`encoding` 携结构化通道，进 IR）；**React sugar 形态**是 `<RectMark>` 组件、**扁平 string props**（x/y/color 都是顶层字段名），由 `build-plot-spec.ts` 内省装配进 IR。React sugar 必须与现有 `<BarMark>` / `<PointMark>` 同风格（`Mark` 后缀 + 扁平 props + color 顶层 prop）。

### IR 形态（进 IR，JSON 可序列化）

```ts
// rect mark IR：encoding 携结构化通道；x/y 字段 + color 字段（含 scale 绑定）
{
  type: 'rect',
  encoding: {
    x: { field: 'rowKey' },
    y: { field: 'colKey' },
    color: { field: 'value', scale: 'heat' },
  },
}

// 缺 color → 纯网格（无值映射，回退默认色）
{ type: 'rect', encoding: { x: { field: 'day' }, y: { field: 'hour' } } }
```

### React sugar 形态（扁平 props，build-plot-spec 装配进 IR）

```tsx
// 基础 heatmap：x 分类 × y 分类，值 metric 映射成格子填充（color 顶层 string prop，与 <BarMark color> 同风格）
<Plot data={correlations} model={model}>
  <RectMark x="rowKey" y="colKey" color="value" />
</Plot>

// 缺 color → 纯网格（双 band 定格，统一默认填充）：可作底格再叠 point / text
<Plot data={grid}>
  <RectMark x="day" y="hour" />
</Plot>
```

`<RectMark>` props 与 `<BarMark>` / `<PointMark>` 一致：`x` / `y` / `color` 均顶层 string（字段名）、可选 `id`；无 `series` / `stack`（网格无堆叠 / 并排语义）。x/y 双 band 由 `build-plot-spec.ts` 自动推断（见实现契约），color 字段经 `colorChannel` 装成 `{ color: { field, scale: AUTO_COLOR } }`；连续值字段配 `model` 时自动派生 sequential 色阶。

## 测试设计

`packages/plot/plot/tests/lower/rect.test.ts`（新建）+ `ir/mark` schema 测试补 rect 分支：

- schema：rect mark accept（含 / 缺 color）、判别 union 正确分流到 `RectMarkSchema`
- cartesian 双 band → 每格 Node `position` = (xCenter, yCenter)、`minimumWidth` = bw_x、`minimumHeight` = bw_y（走 `projectCell` rect 快路）
- 值 → color：sequential 色阶 per-datum 取色，按色分子 Scope（复用 `colorGroupedScope`）
- 缺 color → 回退默认色单图层（与待决策点倾向一致）
- y 非 band scale（连续）→ fail-loud（rect 双维须 band）
- polar2D / 1D / ternary / custom（无 rect cell 构造）→ fail-loud（v1 仅 cartesian2D，与 ADR-01 一致）
- rect 与 interval 在同一 plot 共存：各自 cell 算法不同但同走 `projectCell` 装配，产物互不干扰

具体见下「实现契约 § 测试象限」。

## 影响

- **Plot IR**：`ir/mark.ts` 加 `RectMarkSchema` / `PlotMark.Rect` / `RectMark` 派生类型 / 并入 `MarkSchema` union（red：动 `ir/**`）。
- **lowering**：`lower/anchor.ts` 加 `rectCell`（**仅 cartesian2D** 双 band cell 构造，产 ADR-01 `Cell`）；`lower/mark.ts` 加 `lowerRect`（与 interval 共用 `projectCell` → 装配单路径，坐标系无关），`lowerMark` cartesian2D 分支接入 rect，非 cartesian2D 对 rect fail-loud。`datumAnchor` 给 rect 补一支（从 `CellGeometry` 取锚点，与 ADR-01 同源）。
- **依赖 ADR-01**：消费 `frame.projectCell` / `Cell` / `CellGeometry`——本 ADR **gate 于 ADR-01 先落地**（rect 是该装配契约的第二个消费者）。若 ADR-01 未就绪，rect cell 无处装配。
- **依赖 core**：经 ADR-01 间接消费 core `rectangle`（cartesian2D 快路）shape，仅消费不改 core。
- **依赖 color 链路**：复用 `expand.ts` `makeColorResolver`——需把 rect 加入「允许连续/temporal color」的 mark 白名单（现状仅 point/bar/sector，见 `expand.ts:646`），否则 rect 的值→色会被 fail-loud 误拦。
- **scale 选型**：rect 要求 x、y **均 band scale**；`PositionScale.bandwidth` 已对 band/连续区分，lowering 显式校验 secondary `bandwidth > 0`。
- **三包 lockstep 同步交付**（plot / plot-react / plot-vanilla 同一改动集）：
  - **plot**（red）：IR + lowering，如上。
  - **plot-react**（yellow 面）：`marks.tsx` 加 `<RectMark>` / `RectMarkProps`（扁平 props）；`build-plot-spec.ts` 加 rect 分支 + `hasRect` 标志，使 cartesian y **也强制 band**（现状仅 `hasBar` 强制 x band）；`components/index.ts` + `src/index.ts` barrel 同步导出。
  - **plot-vanilla**：**无代码改动**——`renderPlot(spec, data)` mark 无关、纯 spec 驱动，rect 经 IR + lowering 自动渲染。交付 = vanilla SSR 渲染测试 + docs SSR demo（验证 spec 驱动链路确实出 heatmap）。
- **文档站**：mark 文档新增 rect 页（双 band heatmap、color 取值、缺 color 回退、与 interval 对照）+ demo（含 vanilla SSR demo）；scale 文档补「双轴 band → heatmap」；zh / en 同步。
- **对外 API**：纯新增 mark + `<RectMark>` 组件，非 breaking。

## 不在本 ADR 范围

- **binned heatmap / 显式区间边**（`x0Field`/`x1Field`/`y0Field`/`y1Field` + bin transform）：gate 于 bin transform 能力，后续 ADR。
- **polar2D 环格 rect**（角度 band × 半径 band）：v1 仅 cartesian2D，后续按需。
- **rect 圆角 / 描边 / 格间隙（cell padding）**：归样式 / Theme（alpha.15），与 ADR-01「柱圆角」同处理。
- **rect 的 opacity / 二级视觉通道**：本轮值只走 color；多通道（如 color + opacity 双编码）后续。
- **高基数性能**：N 格 = N 个 Node（plot-design §16.1 软肋 #1），rect 同样受限，不在本 ADR 解决。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/ir/**`（加 `RectMarkSchema` + 并入 union，改 Plot IR schema）+ `packages/plot/plot/src/lower/**`（rect cell 几何 + 下沉装配，触下沉到 core IR 的契约边界）。同时动 `packages/plot/react/src/components/**`（加 `<RectMark>` + build-plot-spec rect 分支 + y 强制 band 推断，属 yellow 面）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/plot/plot/src/ir/mark.ts` | 加 | `PlotMark.Rect` | `as const` 成员 `'rect'` | — | 矩形格 mark 判别串（双 band 网格 cell） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RectMarkSchema.type` | `z.literal(PlotMark.Rect)` | — | 判别字段：双轴各占一段 band 的网格 cell（heatmap） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RectMarkSchema.id` | `z.string().min(1).optional()`（`markBase`） | — | 可选 mark 句柄（复用 markBase） |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RectMarkSchema.encoding` | `EncodingSchema`（`positionalEncoding`：x/y + color） | — | 位置 x/y（均须 band）+ 样式 color（值通道）；x/y 必填性 + band 约束下放 lowering |
| `packages/plot/plot/src/ir/mark.ts` | 加 | `RectMark` | `z.infer<typeof RectMarkSchema>` | — | rect(heatmap 格) mark 派生类型 |
| `packages/plot/plot/src/ir/mark.ts` | 改 | `MarkSchema` | `discriminatedUnion` 增 `RectMarkSchema` | — | mark union 并入 rect |

字段名写死，下游不得改——需改回本 ADR 加条 / 开新 ADR。`x0Field`/`x1Field`/`y0Field`/`y1Field`（binned 显式区间边）**不在本轮 schema**，留后续 ADR。

### 文件 scope

- `packages/plot/plot/src/ir/mark.ts`（修改：加 `PlotMark.Rect` / `RectMarkSchema` / `RectMark` / 并入 `MarkSchema`）
- `packages/plot/plot/src/lower/anchor.ts`（修改：加 `rectCell` 产 ADR-01 `Cell`；`datumAnchor` 加 rect 分支，从 `CellGeometry` 取锚点）
- `packages/plot/plot/src/lower/mark.ts`（修改：加 `lowerRect`，与 interval 共用 `projectCell` → 装配单路径；`lowerMark` cartesian2D 分支接入 rect；polar / 1D / ternary / custom 对 rect fail-loud，与 interval 同矩阵）
- `packages/plot/plot/src/lower/expand.ts`（修改：把 rect 加入连续/temporal color 允许 mark 白名单，见 `expand.ts:646`）
- `packages/plot/plot/tests/lower/rect.test.ts`（新建）
- `packages/plot/plot/tests/ir/mark.test.ts`（修改：rect schema 分支回归）
- `packages/plot/react/src/components/marks.tsx`（修改：加 `RectMark`（返回 null 的 `FC<RectMarkProps>`）+ `RectMarkProps`——扁平 props `x` / `y` / `color` / `id`，与 `BarMark` / `PointMark` 同风格）
- `packages/plot/react/src/components/build-plot-spec.ts`（修改：加 `RectMark` import + `collectInto` rect 分支（→ `PlotMark.Rect` IR，color 走 `colorChannel`）+ `Collected.hasRect` 标志；`buildCartesianYScale` 在 `hasRect` 时强制 y band（仿 `buildCartesianXScale` 的 `hasBar` 强制 x band），与 `<Scale dimension="y">` 显式声明冲突时 fail-loud；x 借 `hasBar` 同源逻辑或新增 `hasRect` 一并强制 x band）
- `packages/plot/react/src/components/index.ts`（修改：barrel re-export `RectMark` + `RectMarkProps`）
- `packages/plot/react/src/index.ts`（修改：public API barrel re-export `RectMark` + `RectMarkProps`）
- `packages/plot/vanilla/tests/`（新建：`renderPlot` 出 heatmap SVG 的 SSR 渲染断言；**vanilla 不改 `src/` 代码**——`renderPlot(spec, data)` mark 无关、纯 spec 驱动，新 mark 经 IR + lowering 自动渲染）
- `apps/docs/src/contents/plot/grammar/mark`（修改 / 新建：rect heatmap 页 + demo + 与 interval 对照；zh / en 同步，含 SSR demo）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与几何断言即可，不硬凑 9。

**Happy path（≥3）**：
- `rect-cartesian-cell-geometry`：cartesian 双 band → 每格 Node `position`=(xCenter,yCenter)、`minimumWidth`=bw_x、`minimumHeight`=bw_y（`projectCell` rect 快路）
- `rect-value-to-color`：color 绑 sequential 色阶字段 → per-datum 取色、按色分子 Scope（复用 `colorGroupedScope`），格填充正确
- `rect-no-color-default-fill`：缺 color → 回退 `DEFAULT_FILL` 单图层 nodeDefault（纯网格）

**边界（≥2）**：
- `rect-single-cell`：单行（1 类 × 1 类）→ 一个格 Node、尺寸 = 两轴 bandwidth
- `rect-missing-category`：某行类别缺失 / 非有限投影 → 跳过该格（null），不产退化 Node

**错误路径（≥2）**：
- `rect-secondary-not-band-fail-loud`：y scale 为连续（linear/time，`bandwidth`=0）→ fail-loud（rect 双维须 band，错误信息指明 y 须 band）
- `rect-polar-fail-loud`：rect 在 polar2D / 1D / ternary / custom 下 fail-loud（本轮仅 cartesian2D）

**交互（≥2）**：
- `rect-with-interval-coexist`：同一 plot 内 rect + interval 共存，各自 cell 算法（双 band vs band×连续）走同一 `projectCell` 装配，产物互不串扰
- `rect-color-grouped-scope`：多值 → 多色，按色分子 Scope（复用 `colorGroupedScope`）——验证 per-datum 取色后正确按 fill 分组装配子 Scope

**三包同步（plot-react + plot-vanilla）**：
- `rect-react-build-plot-spec`（`packages/plot/react`）：`<RectMark x y color />` 扁平 props → 正确 rect IR（`type:'rect'`、`encoding.x/y/color`、x/y 双 band 推断标志置位）的 build-plot-spec 装配断言
- `rect-vanilla-ssr-heatmap`（`packages/plot/vanilla`）：`renderPlot(spec, data)` 喂 rect heatmap spec → 出含每格 `<rect>`/填充色的 SVG 字符串 SSR 断言（vanilla 不改代码，纯 spec 驱动）

### 依赖的现有元素

- ADR-01 的 `frame.projectCell` / `Cell` / `CellGeometry`（`packages/plot/plot/src/lower/project.ts`，**本 milestone ADR-01 落地**）—— rect（v1 cartesian2D）喂双 band cell、复用闭式 rect 快路装配，仅消费不改契约；非 cartesian2D 无 cell 构造即 fail-loud。
- `lower/anchor.ts` 的 `datumAnchor` / `IntervalContext` 模式（`packages/plot/plot/src/lower/anchor.ts`）—— 仿 interval 加 `rectCell` + `datumAnchor` rect 分支（locator 与 lowering 同源）。
- `lower/mark.ts` 的 `barStyle` / `colorGroupedScope` / `barLayer` / `DEFAULT_FILL` / `decorateDatum` / `attachMarkLayer`（`packages/plot/plot/src/lower/mark.ts`）—— rect 复用 rectangle 样式与按色分组装配、provenance 装饰。
- `lower/expand.ts` 的 `makeColorResolver`（`packages/plot/plot/src/lower/expand.ts:623`）—— rect 加入连续/temporal color 允许 mark 白名单，复用 sequential/diverging/quantize per-datum 取色。
- `lower/scale.ts` 的 `PositionScale.bandwidth`（`packages/plot/plot/src/lower/scale.ts:72`）—— rect 取 primary / secondary 双 band 的 bandwidth；secondary `bandwidth>0` 校验 band 约束。
- core `rectangle` shape（经 ADR-01 间接消费，`packages/core/core/src/shapes/`）—— cartesian2D 快路 lowering 目标，仅消费不改 core。
