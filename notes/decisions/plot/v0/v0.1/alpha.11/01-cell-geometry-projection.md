# ADR-01：区间类几何投影契约——`frame.projectCell` 统一 interval / sector / 曲线轴下沉，闭式快路 ⊕ contour 兜底

- 状态：Accepted
- 决策日期：2026-06-16
- 关联：[plot v0.1 roadmap](../roadmap.md)「区间几何下沉」备注 · [alpha.11 roadmap](./roadmap.md) · [plot-design.md §8.3 mark 几何 × coordinate / §8.1 可连接性](../../../../../architecture/plot-design.md) · [core ADR：contour shape](../../../../core/v0/v0.4/alpha.3/03-core-contour-shape.md)（已实现）

## 背景

区间类 mark（`interval` / `sector`，及本 milestone 将加的 `rect`）的几何 = 把数据空间的一个**正交 cell**（一段 primary 带 × 一段 secondary 区间）经坐标系投影成屏幕图形。现状（`packages/plot/plot/src/lower/`）按坐标系分叉写死在 mark 里：

- **cartesian2D**：`intervalRect`（`anchor.ts:88`）算 `{position, width, height}` → core `Node` + `rectangle` shape（`mark.ts` `barStyle`）。
- **polar2D**：`intervalWedge` / `sectorWedge`（`anchor.ts:125/163`）算环楔 `Wedge` → core `Node` + `sector` shape（`mark.ts` `sectorNode`）。
- **其余坐标系**（cartesian1D / polar1D / ternary2D / custom）：`lowerMark`（`mark.ts:488-498`）对 interval / sector **fail-loud**——曲线 / 自定义 x 轴上画不出柱子。

两条闭式路径之所以成立，是因为正交 cell 投影后**恰好是 core 已注册的闭式参数化 shape**（轴对齐矩形 / 环楔）。但 plot 已支持自定义坐标系（alpha.9 `projectRoles` / `frameAlong`）：**当某条位置轴是曲线时，正交 cell 投影出来是一个四边可能都弯的「曲边四边形」，core 没有闭式 shape 能表达它**——于是现状只能 fail-loud。

同类库对照：Observable Plot / G2 在非笛卡尔坐标下，bar 由「沿坐标系投影的多边形 / 路径」绘制（projection-shaped），而非套一个固定矩形 primitive；ggplot 的 `coord_*` 同理——几何坐标无关、由坐标系整形。retikz 的差异点是 §8.1 硬约束「每个柱 / 格是可连接 Node」：不能退成裸 Path（丢 shape 的 `anchor` / `boundaryPoint`）。core 现已补齐 `contour` shape（吃任意闭合顶点环、自动居中、`boundaryPoint` 精确、可连接），使「曲边四边形仍是可连接 Node」成为可能——本 ADR 把它接进 plot 的区间几何下沉。

## 决策：把区间几何下沉重构为 `frame.projectCell(cell) → CellGeometry`，闭式快路（rect / sector）行为零变化；坐标系须实现 `projectCell` 才支持 cell 类 mark，曲线 / 自定义坐标系经自身 `projectCell` 出 contour（无引擎自动兜底）

**分级在输出、统一在机制**：投影后是不是闭式 shape 的判断**挪进坐标系**（每个 frame 最懂自己的投影），mark 侧 lowering 收敛成单路径。

```ts
// lower/project.ts —— 正交 cell（scale 输出空间：primary/secondary 各一段区间）
type Cell = {
  /** primary 输出区间（cartesian=x 像素带 [lo,hi]；polar=角度带 [start°,end°]） */
  primary: [number, number];
  /** secondary 输出区间（cartesian=y 像素 [base,value]；polar=半径 [inner,outer]） */
  secondary: [number, number];
};

// frame 投影 cell 的产物：闭式快路 ⊕ contour 兜底（判别 union）
type CellGeometry =
  | { kind: 'rect'; position: [number, number]; width: number; height: number }
  | { kind: 'sector'; center: [number, number]; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number }
  | { kind: 'contour'; points: Array<[number, number]> };

// projectCell 可选：实现了才支持 cell 类 mark（interval / rect / sector）。
//   cartesian→rect、polar→sector（闭式快路）；曲线 / 自定义 frame 自行实现、返回 contour
//   （用引擎 helper densifyCellContour 把四边密采样成顶点）；
//   未实现（1D / ternary / 无 projectCell 的 custom）→ cell 类 mark fail-loud，无引擎自动兜底。
interface CoordinateFrame {
  projectCell?(cell: Cell): CellGeometry;
}
```

`CellGeometry` → core IR 的统一装配（`mark.ts`，单路径替换现状三分支）：

```ts
// rect   → Node{ position, minimumWidth, minimumHeight } + rectangle 样式（与现状 barStyle 逐字节等价）
// sector → Node{ position: center, shape:{type:'sector', params} }（与现状 sectorNode 逐字节等价）
// contour→ Node{ position: aabbCenter(points), shape:{type:'contour', params:{ points }} }
//          （core 自动按 points AABB 居中；position 取 AABB 中心使 datum anchor 落几何中心）
```

contour 不是引擎自动产物，而是**曲线 frame 在自己的 `projectCell` 里**返回 `{kind:'contour'}`：把 cell 四条边经该 frame 自身的几何投影**密采样**（直边每边 1 段、曲边每边 N 段）首尾闭合。引擎只提供 helper `densifyCellContour(cell, projectFn)` 供 frame 调用——因为「输出空间 → 屏幕」的后段映射只有 frame 自己知道（cartesian = identity、polar = `projectPolar`、custom = 工厂给定），无法在 frame 之外通用兜底；这正是 `projectCell` 必须由 frame 实现、缺则 fail-loud 的根因。`datumAnchor`（`anchor.ts:195`）从 `CellGeometry` 统一取锚点（rect→position、sector→centroid、contour→points AABB 中心），locator 与 lowering 继续同源。

理由：

1. **保留 cartesian 矩形 + polar 扇形作「闭式快路」，因为它们对各自坐标系严格更优**——sector 是精确弧（contour points-only 会退成 faceted 折线 + IR 膨胀 + 丢精确弧）、rectangle 有精确 `edgePoint` / compass anchor，两者皆 O(1) params。强行全统一到 contour 是用更差路径换无收益的「统一」，否决（详见 plot v0.1 roadmap「区间几何下沉」备注）。
2. **判断挪进坐标系、mark 单路径**，避免 plot-design §8.3 否决的路线 (ii)（`N_mark × M_coord` 分支矩阵，即现状 `mark.ts:488-498` fail-loud 的来源）。加新坐标系成本收敛到「实现一个 `projectCell`」：闭式坐标系返回 rect/sector、曲线坐标系返回 contour、无 cell 概念的坐标系不实现（cell 类 mark fail-loud）——mark 侧零改动，再不会「加坐标系要给一批 mark 补特判」。
3. **守 §8.1 可连接性**：曲边 cell 经 core `contour` shape 仍是可连接 Node（`boundaryPoint` 指向式连接精确），不退裸 Path。
4. **闭式路径行为零变化**：cartesian / polar 的 lowering 产物逐字节等价现状（纯重构，回归测试守住），新增的只是其余坐标系从 fail-loud 变 contour 兜底。

## 待决策点 🔻

- **cell 描述空间 = scale 输出空间（已定）**：cell 用 primary / secondary 的**输出区间**（像素 / 度 / 半径）描述，而非数据值区间——因为柱宽来自 `bandwidth`（scale 输出量）、cartesian 柱高来自 `coordinate(baseline)..coordinate(value)`（像素），本就是输出空间量，与现状 `intervalRect` / `intervalWedge` 一致。倾向：定为输出空间。
- **v1 边界（已定，非待决策）**：坐标系**实现 `projectCell` 才支持 cell 类 mark**；无 `projectCell` → fail-loud，**不存在引擎自动兜底**（理由：「输出空间→屏幕」后段映射只有 frame 自己有，见上「决策」段）。本 ADR 交付：① 契约（`Cell` / `CellGeometry` / `projectCell`）；② cartesian2D / polar2D 内建 `projectCell`（闭式 rect / sector，production 就绪）；③ `densifyCellContour` helper + 用一个**测试专用曲线 frame** 验证 contour 全链路通（顶点密采样 / 闭合 / 可连接）。真实曲线坐标系出柱 = 后续给该 frame 实现 `projectCell`，本 ADR 不落 production 曲线柱例子（gate 于具体曲线坐标系）。
- **contour 兜底的每边采样密度**：复用 `RETIKZ_POLAR_SEGMENT_SAMPLES`（16）量级常量，曲边每边采样、直边每边 1 段。倾向：单常量起步，按需再开旋钮。
- **柱圆角（cornerRadius）暴露**：core `rectangle` / `contour` 都支持 cornerRadius，但 mark 层是否暴露「圆角柱」prop = 样式议题，归后续 / Theme（alpha.15）。本 ADR 不暴露。

## DSL 表面

> 本 ADR 是 lowering 内部契约重构，**不新增任何 IR 字段 / React 组件**；用户可见面只有「曲线 / 自定义坐标系下 interval 不再 fail-loud」。`interval` 是 IR mark 类型，其既有 React sugar 是 `<BarMark>`（`marks.tsx`，`<BarMark>` → `PlotMark.Interval`）；坐标系是 `<Plot coordinate>` prop（非子组件）。spec / 表面不变：

```tsx
// 同一份 <BarMark> spec，换 <Plot coordinate> 即可——cartesian 出矩形柱、polar 出环楔、（后续）曲线轴出曲边柱，皆为可连接 Node
<Plot data={sales} coordinate="polar2D">
  <BarMark x="month" y="revenue" />   {/* 现状已支持：环楔 */}
</Plot>

// 曲线 / 自定义坐标系（该 frame 的 projectCell 就绪后）：interval 走 contour，柱仍可被 <Path>/<Node> 连接、标注
<Plot data={flow} coordinate={{ type: 'custom', name: 'archX', roles: ['x', 'y'] }} coordinates={{ archX: archFactory }}>
  <BarMark x="stage" y="amount" />    {/* 本 ADR 解锁机制：不再 fail-loud，曲边柱为 contour Node */}
</Plot>
```

> 对应 IR 形态（`<BarMark>` 经 `build-plot-spec` 装配出的等价 spec）：`{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }`。本 ADR 不改这份 IR，只改它在各坐标系下的下沉几何。

## 测试设计

`packages/plot/plot/tests/lower/cell-geometry.test.ts`（新建）+ 既有 `mark` / `anchor` 测试回归：

- cartesian interval / polar interval / sector 经 `projectCell` 后，core IR 产物与重构前等价（回归基线）——**比较层级 = lowering 产出的 core IR 对象树深相等**（`expect(loweredIR).toEqual(baseline)`，断言结构 / 字段值；不比 JSON 字符串字节序，避免对象 key 顺序 / scope 包装差异卡测试）
- `CellGeometry` 三态 → core Node 装配正确（rect minimumWidth/Height、sector params、contour points + position=AABB 中心）
- 测试专用曲线 frame → interval 走 contour 兜底：顶点密采样、闭合、Node 可连接（`boundaryPoint` 命中）
- `datumAnchor` 三态与 `CellGeometry` 同源（locator parity）
- 1D / ternary 等无 2D 正交 cell 概念的坐标系：仍按既有语义 fail-loud（不被本重构误开）

具体见下「实现契约 § 测试象限」。

## 影响

- **lowering 内部重构**：`lower/project.ts`（加 `Cell` / `CellGeometry` / `projectCell` + cartesian/polar 实现 + 通用密采样器）、`lower/anchor.ts`（`intervalRect`/`intervalWedge`/`sectorWedge` 收敛为 `projectCell` 的内部步骤或其消费者）、`lower/mark.ts`（`lowerInterval`/`lowerIntervalPolar`/`lowerSector`/`lowerMark` 三分支收敛为「取 `CellGeometry` → 统一装配」单路径）。
- **行为**：cartesian2D / polar2D 产物**零变化**（回归守）；cartesian1D / polar1D / ternary2D 对 interval/sector 维持 fail-loud（无 2D 正交 cell）；custom 由 fail-loud 改为「若 frame 实现 `projectCell` → contour，否则仍 fail-loud 并给清晰提示」。
- **Plot IR**：无 schema 改动（`projectCell` 是 lowering 期 frame 方法，不进 IR）。
- **依赖 core**：消费已实现的 `contour` shape（`{type:'contour', params:{points, cornerRadius?}}`），仅消费、不改 core 内部。
- **文档站**：坐标系 / mark 文档补「曲线 / 自定义坐标系下 interval 走 contour、柱仍可连接」说明（demo 待真实曲线 frame 落 `projectCell` 后补）。
- **对外 API**：spec 表面不变；非 breaking。

## 不在本 ADR 范围

- **rect / rule / text / ribbon mark** 本体：各自 alpha.11 ADR（02–05）。rect 是本契约的下一个消费者（双维 band cell，cartesian 下仍走 rect 快路）。
- **production 曲线坐标系出柱的具体例子**（拱形 x 轴 / 螺旋等给 `projectCell` 的实现）：gate 于具体 custom frame 落地，需求驱动。
- **柱圆角 prop**：归样式 / Theme（alpha.15）。
- **小 IR 优化**：contour 兜底是 O(顶点) IR，不解决 plot-design §16.1 软肋 #1（高基数 O(N) Node）；采样密度旋钮后续按需。

---

## 实现契约（必填）🔻

> 下游 implement / test / document 阶段硬契约。偏离需回本 ADR 加条或开新 ADR。

### Level

`red`

判级：动 `packages/plot/plot/src/lower/**`（下沉到 core IR 的契约边界）。虽无 Plot IR schema 改动，但触 lowering 产物契约 → red。

### Schema 改动

Plot IR（`ir/**`）**无改动**——`projectCell` / `Cell` / `CellGeometry` 是 lowering 期 frame 方法与内部类型（`lower/project.ts`），不进 IR、不序列化。

| 文件 | 操作 | 类型名 | 形态 | 说明 |
|---|---|---|---|---|
| `packages/plot/plot/src/lower/project.ts` | 加 | `Cell` | `{ primary:[number,number]; secondary:[number,number] }` | 正交 cell（scale 输出空间区间） |
| `packages/plot/plot/src/lower/project.ts` | 加 | `CellGeometry` | `{kind:'rect',...} \| {kind:'sector',...} \| {kind:'contour', points}` | frame 投影 cell 的产物判别 union |
| `packages/plot/plot/src/lower/project.ts` | 加 | `CoordinateFrame.projectCell?` | `(cell: Cell) => CellGeometry` | cartesian/polar 实现；未实现 → cell 类 mark fail-loud（无引擎自动兜底）。contour 由曲线 frame 自身 projectCell 内调 densifyCellContour 产出 |

### 文件 scope

- `packages/plot/plot/src/lower/project.ts`（修改：加 `Cell`/`CellGeometry`/`projectCell` + cartesian/polar 实现 + 通用密采样器 `densifyCellContour`）
- `packages/plot/plot/src/lower/anchor.ts`（修改：`intervalRect`/`intervalWedge`/`sectorWedge` 重构为产 `Cell` / 被 `projectCell` 消费；`datumAnchor` 改从 `CellGeometry` 取锚点）
- `packages/plot/plot/src/lower/mark.ts`（修改：`lowerInterval`/`lowerIntervalPolar`/`lowerSector` 三分支收敛为单路径「`projectCell` → 装配 Node」；`lowerMark` 的坐标系 fail-loud 改为「无 `projectCell` 且非 2D 正交 cell 才 fail」）
- `packages/plot/plot/tests/lower/cell-geometry.test.ts`（新建）
- `packages/plot/plot/tests/lower/mark.test.ts` / `anchor.test.ts`（修改：回归基线）
- `apps/docs/src/contents/plot/grammar/coordinate`（修改：补曲线轴 interval 走 contour 说明）

偏离白名单需加条目自注解或开新 ADR。

### 测试象限

> plot alpha 放宽口径：覆盖真实有意义的 accept/reject 与几何断言即可。

**Happy path（≥3）**：
- `cartesian-interval-byte-equal`：cartesian2D interval（plain / dodge / stack）经 `projectCell` 后 core IR 与重构前逐字节等价
- `polar-interval-sector-byte-equal`：polar2D interval（环楔）+ sector mark（饼/环）产物逐字节等价
- `curved-frame-contour`：测试专用曲线 frame → interval 出 `{kind:'contour'}` → Node + contour shape，顶点密采样且闭合

**边界（≥2）**：
- `contour-position-aabb-center`：contour Node position = points AABB 中心（datum anchor 落几何中心）
- `degenerate-cell`：零高 / 零宽 cell → 与现状一致跳过（null），不产退化 Node

**错误路径（≥2）**：
- `interval-1d-ternary-fail-loud`：cartesian1D / polar1D / ternary2D 下 interval/sector 仍 fail-loud（无 2D 正交 cell）
- `custom-no-projectcell-fail-loud`：custom frame 未实现 `projectCell` → interval fail-loud 且错误信息指明缺 `projectCell`

**交互（≥2）**：
- `datum-anchor-parity`：三态 `CellGeometry` 的 `datumAnchor` 与 lowering 摆放同源（rect→position / sector→centroid / contour→AABB 中心）
- `contour-connectable`：另一 core `Path` 连到 contour interval Node → compile 经 `boundaryPoint` 解析出轮廓交点（守 §8.1）

### 依赖的现有元素

- `lower/anchor.ts` 的 `intervalRect` / `intervalWedge` / `sectorWedge` / `IntervalContext` / `wedgeCentroid`（`packages/plot/plot/src/lower/anchor.ts`）—— 重构为产 `Cell` / 被 `projectCell` 消费的内部步骤。
- `lower/project.ts` 的 `CoordinateFrame` 各帧 + `densifyPolarSegments`（`packages/plot/plot/src/lower/project.ts`）—— 扩展加 `projectCell`；密采样器复用 `densifyPolarSegments` 思路。
- `lower/mark.ts` 的 `lowerInterval` / `lowerIntervalPolar` / `lowerSector` / `sectorNode` / `barStyle` / `colorGroupedScope`（`packages/plot/plot/src/lower/mark.ts`）—— 收敛为单路径 + contour 装配。
- core `contour` shape（`packages/core/core/src/shapes/contour-shape.ts`，已注册导出）—— lowering 目标：`{type:'contour', params:{points}}`，仅消费不改 core。
- core `rectangle` / `sector` shape —— 闭式快路 lowering 目标（现状已用）。
