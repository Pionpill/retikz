# ADR-01：区间类几何投影契约——`frame.projectCell` 统一 interval / sector / 曲线轴下沉，闭式快路 ⊕ contour 兜底

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md)「区间几何下沉」备注 · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../architecture/plot-design.md) · [core ADR：contour shape](../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.3/03-core-contour-shape.md)（已实现）

## 背景

塑造本决策的硬约束：

- 区间类 mark（`interval` / `sector` / `rect`）的几何 = 把数据空间的一个**正交 cell**（一段 primary 带 × 一段 secondary 区间）经坐标系投影成屏幕图形。
- 正交 cell 在 cartesian / polar 下投影后**恰好是 core 已注册的闭式参数化 shape**（轴对齐矩形 / 环楔），两条闭式路径因此成立。
- 但当某条位置轴是曲线时（plot 已支持的自定义坐标系），正交 cell 投影出来是**四边可能都弯的「曲边四边形」**，core 没有闭式 shape 能表达它；旧实现只能在曲线 / 自定义 x 轴上 fail-loud（画不出柱子）。
- §8.1 是硬约束：每个柱 / 格必须是**可连接 Node**，不能为画曲边柱退成裸 Path（会丢 shape 的 `anchor` / `boundaryPoint`）。

同类库对照：Observable Plot / G2 / ggplot 在非笛卡尔坐标下，bar 由「沿坐标系投影的多边形 / 路径」绘制（projection-shaped），而非套固定矩形 primitive。retikz 的差异点是 §8.1 可连接性要求；core 已补齐的 `contour` shape（吃任意闭合顶点环、自动居中、`boundaryPoint` 精确、可连接）使「曲边四边形仍是可连接 Node」成为可能——本 ADR 把它接进区间几何下沉。

## 决策：把区间几何下沉重构为 `frame.projectCell(cell) → CellGeometry`，闭式快路（rect / sector）行为零变化；坐标系须实现 `projectCell` 才支持 cell 类 mark，曲线 / 自定义坐标系经自身 `projectCell` 出 contour（无引擎自动兜底）

**分级在输出、统一在机制**：投影后是不是闭式 shape 的判断**挪进坐标系**（每个 frame 最懂自己的投影），mark 侧 lowering 收敛成单路径。

核心数据结构（最终形态见 `packages/viz/plot/src/lower/project.ts`）：

```ts
// 正交 cell：primary/secondary 各一段 scale 输出空间区间（cartesian=像素带/像素；polar=角度带/半径）
type Cell = { primary: [number, number]; secondary: [number, number] };

// frame 投影 cell 的产物：闭式快路 ⊕ contour 兜底（判别 union）
type CellGeometry =
  | { kind: 'rect'; position: [number, number]; width: number; height: number }
  | { kind: 'sector'; center: [number, number]; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number }
  | { kind: 'contour'; points: Array<[number, number]> };

// 可选方法：实现了才支持 cell 类 mark（interval / rect / sector）。
// cartesian→rect、polar→sector（闭式快路）；曲线 / 自定义 frame 自行返回 contour；缺则 fail-loud。
interface CoordinateFrame { projectCell?(cell: Cell): CellGeometry }
```

`CellGeometry` → core IR 统一装配（mark 侧单路径替换旧三分支）：rect → `Node{position, minimumWidth, minimumHeight}` + rectangle 样式；sector → `Node{position: center, shape:{type:'sector', params}}`（两者与旧 `barStyle` / `sectorNode` 产物逐字节等价）；contour → `Node{position: points AABB 中心, shape:{type:'contour', params:{points}}}`（position 取 AABB 中心使 datum anchor 落几何中心）。

contour 不是引擎自动产物，而是**曲线 frame 在自己的 `projectCell` 里**返回 `{kind:'contour'}`：把 cell 四条边经该 frame 自身的几何投影**密采样**（直边每边 1 段、曲边每边 N 段）首尾闭合。引擎只提供 helper `densifyCellContour(cell, projectFn)` 供 frame 调用——因为「输出空间 → 屏幕」的后段映射只有 frame 自己知道（cartesian = identity、polar = `projectPolar`、custom = 工厂给定），无法在 frame 之外通用兜底；这正是 `projectCell` 必须由 frame 实现、缺则 fail-loud 的根因。`datumAnchor` 从 `CellGeometry` 统一取锚点（rect→position、sector→centroid、contour→points AABB 中心），locator 与 lowering 同源。

理由：

1. **保留 cartesian 矩形 + polar 扇形作「闭式快路」，因为它们对各自坐标系严格更优**——sector 是精确弧（contour points-only 会退成 faceted 折线 + IR 膨胀 + 丢精确弧）、rectangle 有精确 `edgePoint` / compass anchor，两者皆 O(1) params。强行全统一到 contour 是用更差路径换无收益的「统一」，否决（详见 plot v0.1 roadmap「区间几何下沉」备注）。
2. **判断挪进坐标系、mark 单路径**，避免 plot-design §8.3 否决的路线 (ii)（`N_mark × M_coord` 分支矩阵，即旧实现 fail-loud 的来源）。加新坐标系成本收敛到「实现一个 `projectCell`」：闭式坐标系返回 rect/sector、曲线坐标系返回 contour、无 cell 概念的坐标系不实现（cell 类 mark fail-loud）——mark 侧零改动，再不会「加坐标系要给一批 mark 补特判」。
3. **守 §8.1 可连接性**：曲边 cell 经 core `contour` shape 仍是可连接 Node（`boundaryPoint` 指向式连接精确），不退裸 Path。
4. **闭式路径行为零变化**：cartesian / polar 的 lowering 产物逐字节等价旧实现（纯重构，回归测试守住），新增的只是其余坐标系从 fail-loud 变 contour 兜底。

已拍板的细节：

- **cell 描述空间 = scale 输出空间**（像素 / 度 / 半径），而非数据值区间——因为柱宽来自 `bandwidth`、cartesian 柱高来自 `coordinate(baseline)..coordinate(value)`，本就是输出空间量。
- **每边采样密度**：复用 `RETIKZ_POLAR_SEGMENT_SAMPLES`（16）量级常量，曲边每边采样、直边每边 1 段；单常量起步，按需再开旋钮。

## DSL 表面

本 ADR 是 lowering 内部契约重构，**不新增任何 IR 字段 / React 组件**；spec 表面不变（`interval` IR mark，React sugar `<BarMark>`，坐标系走 `<Plot coordinate>` prop）。用户可见面只有「曲线 / 自定义坐标系下 interval 不再 fail-loud，柱为 contour Node、仍可连接」。文档见 `apps/docs/src/modules/docs/contents/viz/components/mark/bar/` 与 `apps/docs/src/modules/docs/contents/viz/grammar/coordinate/`。

## 影响与兼容性

- **Plot IR**：无 schema 改动——`projectCell` / `Cell` / `CellGeometry` 是 lowering 期 frame 方法与内部类型，不进 IR、不序列化。
- **行为**：cartesian2D / polar2D 产物零变化；cartesian1D / polar1D / ternary2D 对 interval/sector 维持 fail-loud（无 2D 正交 cell）；custom 由 fail-loud 改为「实现 `projectCell` → contour，否则仍 fail-loud 并给清晰提示」。
- **依赖 core**：仅消费已实现的 `contour` shape，不改 core。
- **对外 API**：spec 表面不变；非 breaking。

## 不在本 ADR 范围

- **rect / rule / text / ribbon mark** 本体：各自 alpha.11 ADR（02–05）。rect 是本契约的下一个消费者（双维 band cell，cartesian 下仍走 rect 快路）。
- **production 曲线坐标系出柱的具体例子**（拱形 x 轴 / 螺旋等给 `projectCell` 的实现）：gate 于具体 custom frame 落地，需求驱动。本 ADR 只交付契约 + cartesian2D/polar2D 内建 `projectCell` + `densifyCellContour` helper + 测试专用曲线 frame 验证 contour 全链路。
- **柱圆角（cornerRadius）prop**：core `rectangle` / `contour` 都支持，但 mark 层是否暴露「圆角柱」是样式议题，归 Theme（alpha.15）。
- **小 IR 优化**：contour 兜底是 O(顶点) IR，不解决 plot-design §16.1 软肋 #1（高基数 O(N) Node）。

---

实现指针：契约与 `densifyCellContour` 在 `packages/viz/plot/src/lower/project.ts`（`Cell` / `CellGeometry` / `projectCell`）；mark 单路径装配在 `packages/viz/plot/src/lower/mark.ts`；锚点同源在 `packages/viz/plot/src/lower/anchor.ts`；core `contour` shape 在 `packages/kernel/core/src/shapes/contour-shape.ts`。测试在 `packages/viz/plot/tests/lower/cell-geometry.test.ts`（含回归基线、三态装配、曲线 frame contour、AABB 中心、fail-loud、连接性、locator parity），回归基线另见同目录 `mark`/`anchor`/`sector` 相关测试。

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:_notes/decisions/plot/v0/v0.1/alpha.11/01-cell-geometry-projection.md`（封板全文）。
