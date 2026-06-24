# ADR-03：抽象 mark 模型 + mark registry —— 4 维度 mark + 2 特殊 mark，interval 正交 bounds 统一 bar/sector/rect，point 吸收 text

- 状态：Proposed
- 决策日期：2026-06-17
- 关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [plot v0.1 roadmap](../roadmap.md) · [前置：alpha.11 区间几何坐标系无关下沉](../roadmap.md) · [plot-design.md §2 / §8.3](../../../../../architecture/plot-design.md)

> ⚠️ 草案：本 ADR 由 2026-06-17 设计讨论产出，实现契约为 AI 起草建议稿，待人工 review + 红级多 LLM 评审后定稿。
> 本 ADR 只动引擎层（`@retikz/plot` 的 `ir/` + `lower/`）；公开表面（react/vanilla 组件、build-plot-spec、文档）由同里程碑 [ADR-04](./04-mark-surface-convergence.md) 处理，依赖本 ADR。

## 背景

当前 plot 暴露 9 个 mark：`point` / `line` / `interval` / `sector` / `area` / `rect` / `rule` / `text` / `ribbon`（`ir/mark.ts`）。它们沿两条轴出现重复与错位：

- **同一数据几何被切成多个 shape-specific mark**。`interval`（柱）、`sector`（饼 / 环）、`rect`（heatmap 格）本质都是「正交区间积在坐标系下的投影」：`interval` = baseline→value 区间，`sector` = 累积角界 × 满半径，`rect` = 双 band。alpha.11 已在 lowering 层把三者收敛到一条路径——`markCell` 产正交 `Cell` → `frame.projectCell` 产 `CellGeometry`（rect / sector / contour）→ `cellGeometryNode` 装配 core Node（`lower/mark.ts` 的 `lowerCells`）。**机制已统一，但 IR 仍暴露 3 个独立 authoring mark**，几何收敛没有反映到 grammar。
- **图表语义名混进底层 grammar**。`line` 是 1D 轨迹（`path`）的图表名、`area` 是 2D 区域（`region`）的图表名、`rule` 是常量位置上的 span（reference）、`ribbon` 是 source-target 关系（link）。`text` 与 `point` 共享同一套投影（`projectRoles`），只是 glyph 内容不同——`lowerText` 与 `lowerPoint` 几乎重复。

第二个结构问题：**mark 分发是写死的 `if (mark.type === ...)` 链**（`lower/mark.ts` 的 `lowerMark`），与仓库已有的注册范式不一致——core 的 composite 经 `defineComposite` 注册、plot 的自定义坐标系经 `options.coordinates` 工厂注册（`lower/expand.ts`）。mark 没有等价的注册接口，导致「加坐标系 / 加形状要回头给一批 mark 补特判」（plot-design §8.3 否决的 N_mark×M_coord 矩阵）。

GoG 与同类库：Observable Plot 的 mark 是纯数据层、最终形状由坐标系 / scale 决定；Vega-Lite 用 `mark` type + `encoding`、几何随 scale 走；G2 的 geometry 与 coordinate 正交组合。三者都不把「饼 / 热力 / 柱」当独立底层 mark。retikz 既定主线（plot-design §8.3）正是「抽象数据几何 mark × coordinate 投影整形」——本 ADR 把 IR 与分发机制对齐到这条主线。

项目处 0.x、本里程碑未发布，按最优设计推进、不为旧写法保留别名（AGENTS.md「0.x 以正确设计为准」）。

## 决策：mark 收敛为 6 个抽象数据几何 mark，经 mark registry 注册分发；interval 用坐标系无关正交 bounds 统一，point 吸收 text

把底层 mark 收敛为 **6 个抽象 mark——4 个维度 mark（描述数据在坐标空间的 k 维几何）+ 2 个特殊 mark（参考 / 关系，复用维度 mark 的投影能力但语义不等同）**，每个是 registry 的一个内置注册项：

| 抽象 mark | 类别 | IR `type` | 维度 | 收编现有 IR | 核心语义 |
| --- | --- | --- | --- | --- | --- |
| Point | 维度 mark | `point` | 0D glyph | `point` + `text` | 坐标元组上的实体 / glyph / 文本 anchor |
| Path | 维度 mark | `path` | 1D 轨迹 | `line` | 有序点连成的一维路径 |
| Region | 维度 mark | `region` | 2D 区域 | `area` | 边界围出的可填充区域 |
| Interval | 维度 mark | `interval` | 区间积（v0.1 二维 role） | `interval` + `sector` + `rect` | 各位置 role 正交区间积，经坐标系投影成段 / 矩形 / 扇区 / cell |
| Link | 特殊 mark | `link` | relation | `ribbon` | source→target 关系几何 |
| Reference | 特殊 mark | `reference` | reference | `rule` | 固定位置 / 区间的参考约束 |

**删除 IR 类型**：`sector`、`rect`（并入 `interval`）、`text`（并入 `point`）。**重命名**：`line`→`path`、`area`→`region`、`rule`→`reference`、`ribbon`→`link`。

### (1) mark registry：对齐 composite / coordinate 注册范式

**IR schema 与 lowering 行为分层**（关键边界）：`ir/mark.ts` 仍是 mark schema 的**静态单一真源**——`MarkSchema` 是手写的 `z.discriminatedUnion('type', [6 个 schema])`，**不**由 registry 动态组装（registry 在 `lower/`，`ir/` 不得反向依赖 `lower/`）。`lower/mark-registry.ts` 只注册 **lowering 行为**（按 type 查找），不持有 schema。

```ts
// lower/mark-registry.ts（示意；行为函数不进 IR，只在运行时 registry。schema 不在此、仍在 ir/mark.ts）
type MarkDefinition<M extends Mark = Mark> = {
  /** 注册键（= IR 判别串，对应 ir/mark.ts 静态 schema 的成员） */
  type: PlotMarkValue;
  /** 位置通道必填性：坐标系级校验（cartesian2D 需 x+y、polar 同、reference 取向 XOR…） */
  requiredRoles?: (frame: CoordinateFrame) => ReadonlyArray<DimensionRole>;
  /** 区间类 mark：某行 → 正交 Cell（interval / reference-band 用；非区间类省略） */
  buildCell?: (mark: M, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 下沉到 core IR 图层（point/path/region/link/reference 用各自实现，interval 走 buildCell + projectCell 通路） */
  lower: (mark: M, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, prov?: MarkProvenance) => IRChild | null;
};
```

`lowerMark` / `markCell` 改为 registry 查找分发，删掉写死的 type 判别链。本轮 **不开放公开 `registerMark` API、也不做 schema registry**——「行为函数不进 IR」的边界、自定义 mark 的 JSON-safe schema 校验与运行时注入契约体量大，留待需求驱动（同 `options.coordinates` 渐进路径）。公开自定义 mark 时再引入 schema registry（届时 `MarkSchema` 才可能从注册项动态组装）。但内部 lowering 分发全走 registry，自定义 mark 后续零重写接入。

### (2) interval：坐标系无关的正交 bounds

interval 不再是「baseline→value 的柱」，而是**各位置维度的正交区间积构造器**。每个位置 role 的区间由 `IntervalBound` 描述其来源：

```ts
// ir/mark.ts（示意；最终字段名以 Schema 改动表为准）
type IntervalBound =
  | { kind: 'band'; group?: string }              // 中心取位置通道、宽取 band scale bandwidth；group=系列字段→band 切子带（dodge）
  | { kind: 'span'; baseline?: number }           // baseline（默认 0）→ 位置通道值；经典柱高
  | { kind: 'extent'; from: string; to: string }  // 两字段显式区间：histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end
  | { kind: 'full' };                             // 满铺该 role 的坐标域（极坐标 inner→outer 半径）

type IntervalMark = {
  type: 'interval';
  encoding: Encoding;                              // x/y 位置 + color 样式
  bounds?: { x?: IntervalBound; y?: IntervalBound }; // 按 x/y 键；坐标系重映射 x→primary、y→secondary（polar: x→angle、y→radius）
  series?: string;
};
```

一个 `interval` 在不同 `bounds` × coordinate 下覆盖全部现有形态：

| 形态 | coordinate | bounds.x | bounds.y |
| --- | --- | --- | --- |
| bar | cartesian2D | `band` | `span` |
| dodge（分组柱） | cartesian2D | `band{group:series}` | `span` |
| stack（堆叠柱） | cartesian2D | `band` | `extent(y0,y1)` |
| histogram | cartesian2D | `extent(x0,x1)` | `span` |
| heatmap cell | cartesian2D | `band` | `band` |
| 径向柱 / 玫瑰 | polar2D | `band`（→angle） | `span`（→radius） |
| 饼 / 环 | polar2D | `extent(start,end)`（→angle） | `full`（→radius） |

**bounds 按 `x`/`y` 键、不写 `angle`/`radius`**：坐标系已负责把 x→primary→angle 重映射（`encoding` 与 `Cell` 都已是 x/y 与 primary/secondary 的抽象）。mark 因此不隐含 polar，`projectCell` 继续负责 Cell→rect/sector/contour 的形状实现。**bounds 省略时按 scale 类型缺省推断**：primary 为 band scale → `band`、secondary 连续 → `span(baseline 0)`——裸 `interval` 仍零配置出柱。

`arrangement`（stack/dodge 一字开关）**不进 plot**：plot 是底层 grammar，stack 用 `extent` bounds + stack transform 表达、dodge 用 `band{group}` 表达；友好的 `stacked` / `grouped` 开关归 v0.2 chart 层（见「不在本 ADR 范围」+ v0.2 roadmap 备注）。

**维度范围**：v0.1 坐标系最高二维（cartesian2D / polar2D），故 `bounds` 固定 `{ x?, y? }` 两个 role；待 core 支持 3D 坐标后再推广为 role map（`Partial<Record<DimensionRole, IntervalBound>>`，见「待决策点」）。「区间积」是终态语义，v0.1 落地的是其二维实例。

**与 alpha.12 ADR-01 / ADR-02 的衔接（supersede interval 字段行）**：ADR-01 给 interval 加的 `x0Field` / `x1Field`、ADR-02 把 derive-interval / normalize 默认输出对接的 `y0` / `y1`，其 **transform 侧产物完全不变**——bin 仍产 `binStart` / `binEnd`、stack / normalize / derive-interval 仍产 `y0` / `y1` 数据字段。变的只是 **interval mark 的读取方式**：不再用专属字段，而由 `bounds.extent.from / to` 指向这些字段——histogram = `bounds.x = extent('binStart','binEnd')`、堆叠 = `bounds.y = extent('y0','y1')`、饼累积 = `bounds.x = extent('y0','y1')` + `bounds.y = full`。本 ADR 据此 **supersede ADR-01 / ADR-02 中「interval 读 `x0Field`/`x1Field`/`y0`/`y1` 专属字段」的部分**（transform 定义本身不动），并在 milestone roadmap 标注 supersede 关系。

### (3) point 吸收 text

`text` 不再是独立 mark：文本就是「无边框、带文本的 0D glyph」，与散点共享同一投影。`PointEncoding` 加可选 `text` 内容通道，`PointMark` 加 `dx`/`dy` 微调；有 `text` → 下沉为带 `text` 的 core Node（无 shape 边框）、无 → circle glyph。`lowerPoint` 与 `lowerText` 合一。

理由：

1. **mark 描述数据几何、coordinate 描述投影实现**——形状随 `mark × coordinate` 解释规则产生，新坐标系 / 形状不再驱动新增 shape-specific mark。lowering 层（`projectCell` / `Cell` / `CellGeometry`）已具备此机制（alpha.11），本 ADR 把 IR 与分发收敛到同一抽象，杜绝「IR 暴露具体形状、lowering 又统一」的双层不一致。
2. **registry 是仓库既有注册范式的自然延伸**（composite / coordinate 工厂），内置 mark = 内置注册项，自定义 mark 与内置同机制；删掉写死分发，消除 N_mark×M_coord 特判矩阵。
3. **0.x 未发布、按最优设计**：不留 `sector`/`rect`/`text` 别名、不为旧 `interval` 字段保留桥接。

## 待决策点 🔻

- **dodge 子带来源**：`band{group}` 显式给系列字段，还是当 `series` 设且 `bounds.y` 为 `span` 时隐式切子带？倾向**显式 `group`**（grammar 无魔法），`series` 仅管色 / 拆分；chart 层的 `grouped` 开关负责把 `series` 填进 `group`。
- **bounds 缺省推断精确规则**：primary band/point scale → `band`、连续 → 报错要求显式？secondary 缺省 `span` 的 baseline 固定 0。倾向「primary band→band、secondary 连续→span(0)；其余组合要求显式 bounds，缺失 fail-loud」。
- **registry 形态**：单一 `MarkDefinition` 表（schema + buildCell + lower 合一）vs PLAN 的 4 表（schema / lowering / coordinate / channel registry）。倾向**单表起步**，按需再拆——4 表是终态、当前无需求。
- **reference 内部复用**：`reference` 的 band 形态已走 `projectCell`（`ruleBandCell`）。是否把它声明为 `interval` 的内部 `buildCell` 复用？倾向**内部共享 cell builder、public `reference` schema 独立**（语义是参考约束、非普通区间几何，符合 PLAN「特殊 mark」分类）。
- **bounds.x/y 键 vs primary/secondary 键**：用 `encoding` 同款 `x/y` 还是直接用 `Cell` 的 `primary/secondary`？倾向 `x/y`（与 encoding 一致、用户心智统一），lowering 内部映射到 primary/secondary。
- **nD role map 接口形态**：3D 坐标就绪后，`bounds` 从 `{ x?, y? }` 推广为 `Partial<Record<DimensionRole, IntervalBound>>`。本轮是否直接用 role map 类型（仅填 x/y）以免后续 breaking，还是先 `{ x?, y? }` 待 3D 时再改？倾向**先 `{ x?, y? }`**（无 3D 坐标系消费、role map 现在是空接口；3D 落地由 core gating，届时同改不算沉没）。

## DSL 表面

```ts
// 同一个 interval mark，bounds × coordinate 决定形状——bar / pie / heatmap 不再是不同 mark
const bar: IntervalMark = { type: 'interval', encoding: { x: { field: 'q' }, y: { field: 'sales' } } };
//   bounds 省略 → 推断 { x: band, y: span }

const pie: IntervalMark = {
  type: 'interval',
  encoding: { color: { field: 'region', scale: 'hue' } },
  bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
}; // polar2D coordinate 下 x→累积角界、y→满半径 = 扇区

const heatmap: IntervalMark = {
  type: 'interval',
  encoding: { x: { field: 'day' }, y: { field: 'hour' }, color: { field: 'v', scale: 'heat' } },
  bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
};

// point 吸收 text：有 text 通道 → 无边框文本 Node、无 → glyph
const label: PointMark = { type: 'point', encoding: { x: { field: 'q' }, y: { field: 'sales' }, text: { field: 'sales', displayFormat: '.0f' } } };
```

## 测试设计

`packages/graph/plot/tests/` 下 schema / lowering / 等价性三类覆盖：

- **schema**：6 个 mark accept 合法 JSON-safe spec；旧 `sector` / `rect` / `text` type reject；interval `bounds` 四 kind accept、非法 kind reject；`extent` 缺 `from`/`to` reject。
- **registry**：6 内置 mark 按 type 查得；coordinate override（polar→sector、cartesian→rect）经 `projectCell` 生效；不支持的 mark × coordinate（无 `projectCell` 的 1D/ternary）fail-loud 文案清晰。
- **interval bounds 下沉**：band×span→cartesian rectangle；band×band→heatmap cell；extent(start,end)×full→polar 扇区；extent(x0,x1)×span→histogram 连续区间柱；band{group}×span→dodge 子带。
- **point/text 合一**：point 无 text → circle glyph Node；point 有 text → 无边框 text Node；二者共享 `projectRoles` 投影。
- **等价性（锁现有 demo 几何）**：现有 bar / 堆叠柱 / dodge / 饼 / 环 / heatmap / histogram demo 经新 interval bounds 重构后，下沉出的 core Scene 几何**逐字节等价**（`CellGeometry → Node` 装配不变）。

具体 case 见「实现契约 § 测试象限」。

## 影响

- **`ir/mark.ts` 重写**：`PlotMark` 删 `Sector`/`Rect`/`Text`、改 `Line`→`Path`/`Area`→`Region`/`Rule`→`Reference`/`Ribbon`→`Link`；`IntervalMarkSchema` 删 `y0Field`/`y1Field`/`x0Field`/`x1Field`/`arrangement`、加 `bounds`；`PointMarkSchema` 加 `text` 通道 + `dx`/`dy`；删 `SectorMarkSchema`/`RectMarkSchema`/`TextMarkSchema`；`MarkSchema` 判别 union 收为 6。
- **`ir/encoding.ts`**：`PointEncodingSchema` 加 `text`（复用 `TextChannelSchema`）；`TextEncodingSchema` 删除或并入。
- **新增 `lower/mark-registry.ts`**：`MarkDefinition` + 6 内置注册项；`lower/mark.ts` 的 `lowerMark` 改 registry 分发、`lowerPoint`/`lowerText` 合一。
- **`lower/anchor.ts`**：`markCell` 换成 bounds 驱动的 4-kind cell builder（`band`/`span`/`extent`/`full` 解析器，复用现有 `intervalPrimaryBand` / 半径换算 / 累积角逻辑）；`sectorCell`/`rectCell`/`intervalCell*` 降级为 kind 解析器内部实现。
- **几何输出不变**：`CellGeometry → core Node`（`cellGeometryNode`）与 `projectCell` 通路保持原样，几何逐字节等价。
- **core**：无新依赖、不触 core IR 契约（仍消费 `sector`/`contour`/`rectangle` shape + Node/Path/Scope）。
- **⚠️ BREAKING（IR）**：`sector`/`rect`/`text` mark type 删除；`line`/`area`/`rule`/`ribbon` 改名；`interval` 字段结构变。未发布、不留别名（0.x）。
- **公开表面 / 文档**：react/vanilla 组件、build-plot-spec、docs 由 [ADR-04](./04-mark-surface-convergence.md) 处理。

## 不在本 ADR 范围

- **公开 `registerMark` API / 自定义 mark 注入**：本轮只立内部 registry 接口 + 内置注册项；公开注册（含行为函数不进 IR 的边界、JSON-safe 校验、运行时注入）需求驱动另立 ADR。
- **`arrangement` 友好开关（stacked / grouped / percent…）**：归 v0.2 chart 层；plot 只认显式 `bounds` + transform。**同步在 v0.2 roadmap / chart ADR 备注此项归属**。
- **react / vanilla 组件 + build-plot-spec + 文档**：[ADR-04](./04-mark-surface-convergence.md)。
- **sector `padAngle` / `explode` / `pull`**：原 alpha.13 backlog「sector padAngle/explode」改写为「interval polar padAngle」，归 alpha.13。
- **registry 拆 4 表（schema / lowering / coordinate / channel）**：终态，本轮单表起步。
- **新坐标系 / 新 mark kind**：本轮只收敛现有，不新增几何能力。
- **derive-interval 不被 bounds 取代**：`bounds.span` 是「mark 直接读 baseline→value、无需字段」的零-transform 路径；`bounds.extent` 读两个**已存在字段**。当需要 per-datum 显式区间（非 stack / bin 派生，如甘特、误差区间）时，仍由 derive-interval 数据层算出 start / end 字段供 `extent` 引用。边界：span = 无字段、extent = 引用 derive-interval / bin / stack 产物——derive-interval 保留，职责收窄为「value/baseline → start/end 字段」的数据层便利。
- **annotation / callout（引线注解 / 浮动标注）**：`point` 带 `text` 覆盖「锚定某 datum 的文本」；带引线的自由注解 / callout（宿主无 datum、或跨图元引线）后续可走 `reference` 或独立 annotation 层，本轮不做。

---

## 实现契约（必填）🔻

> ⚠️ 本 ADR 仍 Proposed：Level / Schema 表 / 文件 scope / 测试象限为 AI 起草建议稿，待人工 review 签字 + 红级多 LLM 评审后定稿。

### Level

`red`

判级：动 `packages/graph/plot/src/ir/**`（mark / encoding schema）+ `packages/graph/plot/src/lower/**`（registry 分发、cell builder、下沉契约边界）。跨级取最高 → red。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/mark.ts` | 改 | `PlotMark` | const object | — | 删 `Sector`/`Rect`/`Text`，改 `Line`→`Path`/`Area`→`Region`/`Rule`→`Reference`/`Ribbon`→`Link`，存 `Point`/`Path`/`Region`/`Interval`/`Link`/`Reference` |
| `ir/mark.ts` | 加 | `IntervalBoundKind` | const object | — | interval bound 来源关键字：`band`/`span`/`extent`/`full` |
| `ir/mark.ts` | 加 | `IntervalBoundSchema` | `z.discriminatedUnion('kind', …)` | — | 单维区间来源：band（band 宽，可选 group 切子带）/ span（baseline→值）/ extent（两字段区间）/ full（满域） |
| `ir/mark.ts` | 加 | `IntervalMarkSchema.bounds` | `{ x?: IntervalBound; y?: IntervalBound }` optional | 缺省按 scale 推断 | per-role 区间来源；省略时 primary band→band、secondary 连续→span(0) |
| `ir/mark.ts` | 删 | `IntervalMarkSchema.{y0Field,y1Field,x0Field,x1Field,arrangement}` | — | — | 折叠进 `bounds`（extent/group）；arrangement 友好开关移交 chart |
| `ir/mark.ts` | 改 | `LineMarkSchema`→`PathMarkSchema` | object schema | — | type literal 改 `'path'`；字段不变（order/series/closed/encoding/label） |
| `ir/mark.ts` | 改 | `AreaMarkSchema`→`RegionMarkSchema` | object schema | — | type literal 改 `'region'`；字段不变（order/series/baseline/closed/encoding/label） |
| `ir/mark.ts` | 改 | `RuleMarkSchema`→`ReferenceMarkSchema` | object schema | — | type literal 改 `'reference'`；字段不变（xTo/yTo/extentField/extentToField/encoding） |
| `ir/mark.ts` | 改 | `RibbonMarkSchema`→`LinkMarkSchema` | object schema | — | type literal 改 `'link'`；字段不变（source/target/value/width/endWidth/curvature/orientation） |
| `ir/mark.ts` | 加 | `PointMarkSchema.dx` `PointMarkSchema.dy` | `z.number().finite()` optional | 0 | 文本 glyph 相对锚点像素微调（吸收自 text mark） |
| `ir/mark.ts` | 删 | `SectorMarkSchema` `RectMarkSchema` `TextMarkSchema` | — | — | sector/rect 并入 interval bounds、text 并入 point |
| `ir/mark.ts` | 改 | `MarkSchema` | `z.discriminatedUnion('type', …)` | — | 6 成员：Point/Path/Region/Interval/Link/Reference |
| `ir/encoding.ts` | 加 | `PointEncodingSchema.text` | `TextChannelSchema` optional | — | 可选文本内容通道：有则 point 下沉为无边框文本 Node |
| `ir/encoding.ts` | 删 | `TextEncodingSchema` | — | — | 并入 `PointEncodingSchema.text` |

> 字段名一旦写死，下游不允许改；需改回本 ADR 加条或开新 ADR。

### 文件 scope

- `packages/graph/plot/src/ir/mark.ts`（重写）
- `packages/graph/plot/src/ir/encoding.ts`（修改：point 加 text、删 TextEncoding）
- `packages/graph/plot/src/lower/mark-registry.ts`（新建：`MarkDefinition` + 6 内置注册项）
- `packages/graph/plot/src/lower/mark.ts`（修改：`lowerMark` 改 registry 分发、point/text 合一、删 sector/rect 特判）
- `packages/graph/plot/src/lower/anchor.ts`（修改：`markCell` → bounds 驱动 cell builder）
- `packages/graph/plot/src/ir/index.ts` / `lower/index.ts`（修改：导出调整）
- `packages/graph/plot/tests/**`（新建 / 修改：schema / registry / interval bounds / point-text / 等价性）

偏离白名单需加条目自注或开新 ADR。

### 测试象限

> plot alpha milestone 放宽：按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言。

**Happy path（≥ 3）**：

- `interval_bar_band_span`：`{ }` bounds 省略 → 推断 band×span → cartesian rectangle Node
- `interval_pie_extent_full`：polar2D + `bounds.x=extent(y0,y1)` + `bounds.y=full` → sector geometry
- `point_text_channel_borderless_node`：point + `encoding.text` → 无 shape 边框、带 `text` 的 core Node

**边界（≥ 2）**：

- `interval_heatmap_band_band`：双 band bounds → heatmap cell（bandwidth_x × bandwidth_y）
- `interval_histogram_extent_x`：`bounds.x=extent(x0,x1)` 连续区间柱（紧贴排列、宽随箱边）

**错误路径（≥ 2）**：

- `mark_sector_type_rejected`：旧 `type:'sector'` / `'rect'` / `'text'` → ZodError（已删除）
- `interval_extent_missing_field_fails`：`bounds.x=extent` 缺 `from`/`to` → schema reject 或 lowering fail-loud
- `interval_unsupported_coordinate_fails`：interval 在无 `projectCell` 的坐标系（cartesian1D/ternary）→ fail-loud

**交互（≥ 2）**：

- `interval_equivalence_bar_pie_heatmap`：现有 bar / 饼 / 环 / heatmap / histogram demo 经 bounds 重构后 Scene 几何逐字节等价
- `interval_dodge_group_subband`：`bounds.x=band{group:series}` × span → 系列子带划分等价于旧 dodge

### 依赖的现有元素

- `lowerCells` / `cellGeometryNode` / `styleForGeometry`（`lower/mark.ts`）—— 引用：interval 注册项的下沉通路、几何装配不变
- `markCell` / `intervalPrimaryBand` / `intervalCellCartesian` / `intervalCellPolar` / `sectorCell` / `rectCell`（`lower/anchor.ts`）—— 修改：重构为 bounds 4-kind cell builder
- `CoordinateFrame.projectCell` / `Cell` / `CellGeometry`（`lower/project.ts`）—— 仅引用：mark×coordinate 投影契约（alpha.11）不变
- `lowerPoint` / `lowerText` / `roleValues` / `datumAnchor`（`lower/mark.ts` / `anchor.ts`）—— 修改：point/text 合一、共享投影
- `TextChannelSchema` / `EncodingSchema` / `PointEncodingSchema`（`ir/encoding.ts`）—— 修改：point 吸收 text 通道
- `defineComposite` 注册范式（core）/ `options.coordinates` 工厂注册（`lower/expand.ts`）—— 参照：mark registry 对齐同款注册接口形态
- core `Node` / `Path` / `Scope` / `sector` / `contour` / `rectangle` shape（`packages/kernel/core`）—— 仅消费（经现有 lowering）
