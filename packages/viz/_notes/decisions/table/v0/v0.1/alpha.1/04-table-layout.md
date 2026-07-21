# ADR-04：固定轨道 TableLayout

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Table lowering 必须先得到确定的行列几何。Core 当前能在 compile 阶段测量 Node 文本和计算 Scope bbox，但没有供 Tier 2 composite 在展开前测量任意 `IRChild` intrinsic size 的公开合同。alpha.1 若直接承诺 auto/minmax，会迫使 Table deep import Core compile 或为 Node/Plot 建私有白名单。

最薄闭环可以先使用固定基础轨道：结构决定行列数量，layout 决定统一宽高和 gap，内容放在 Cell 中心。该模型足以验证语义结构、lowering 与 adapter，并为 alpha.2 的完整约束求解保留清晰替换点。

## 决策：alpha.1 只提供统一固定轨道布局

```ts
type IRTableLayout = {
  columnWidth?: number;
  rowHeight?: number;
  headerHeight?: number;
  columnGap?: number;
  rowGap?: number;
};
```

默认语义：

- `columnWidth` 省略为 `120`
- `rowHeight` 省略为 `32`
- `headerHeight` 省略为 resolved `rowHeight`
- `columnGap` / `rowGap` 省略为 `0`
- width/height 必须为有限正数；gap 必须为有限非负数
- 坐标从 Table local `[0, 0]` 开始，x 向右、y 向下

默认值由纯函数物化为消费态，不改写原始 IR：

```ts
type ResolvedTableLayoutSpec = Readonly<{
  columnWidth: number;
  rowHeight: number;
  headerHeight: number;
  columnGap: number;
  rowGap: number;
}>;

const resolveTableLayoutSpec = (spec?: IRTableLayout): ResolvedTableLayoutSpec;
const layoutTable = (model: SemanticTableModel, spec?: IRTableLayout): TableLayout;
```

`layoutTable()` 只调用 `resolveTableLayoutSpec()` 后消费 canonical row/column/cell 顺序，不读取 structure kind、presentation content、provider 或 renderer。

布局公式：

```text
column.x = columnIndex × (columnWidth + columnGap)
row.y    = sum(previous row sizes) + rowIndex × rowGap
cellBox  = { x, y, width: columnWidth, height: resolved row height }
contentCenter = [x + width / 2, y + height / 2]
tableBounds.width  = columnCount × columnWidth + max(0, columnCount - 1) × columnGap
tableBounds.height = sum(row sizes) + max(0, rowCount - 1) × rowGap
```

每个 canonical `kind: 'columnHeader'` row 使用 `headerHeight`，每个 `kind: 'body'` row 使用 `rowHeight`；manual、detail 与 custom 一律按 row semantics 处理，不按来源分支。该规则同时覆盖 manual 显式 header row 与 custom structure 生成的 header row。

row tracks、column tracks 与 Cell layouts 分别保持 `model.rows`、`model.columns`、`model.cells` 的声明顺序；不按 id 重排。零行或零列合法时，对应 track 数组为空、该轴 size 与 gap contribution 为 `0`，bounds 固定从 `{ x: 0, y: 0 }` 开始；没有合法 Cell layout。detail `header: false` + 空 dataset 因此得到高度 `0`、宽度按 columns 计算的退化 bounds，custom 零行/零列按同一公式处理。

所有 box（包括 table bounds 与 Cell box）统一使用 `@retikz/math` 的左上角语义 `BoundsRect`，不复用中心点语义的 Core `Rect`。`layoutTable(model, spec)` 输出：

```ts
type TableTrackLayout = Readonly<{
  id: string;
  index: number;
  offset: number;
  size: number;
}>;

type TableCellLayout = Readonly<{
  cellId: string;
  box: BoundsRect;
  contentCenter: Position;
}>;

type TableLayout = Readonly<{
  bounds: BoundsRect;
  rows: ReadonlyArray<TableTrackLayout>;
  columns: ReadonlyArray<TableTrackLayout>;
  cells: ReadonlyArray<TableCellLayout>;
}>;
```

它不产生 Core IR、不查 presentation registry、不读取 `PresentedTableModel`、不修改 SemanticTableModel。

`contentCenter` 只作为几何产物。ADR-03 presentation 返回局部 `[0,0]` 内容，ADR-05 才把 Presented Cell 包在 translate Scope 中并对齐该中心；layout 本身不接收内容。direct content 作者也遵守同一局部原点合同。该规则只形成 alpha.1 固定轨道的最小闭环，不宣称任意 nested composite 已正确 fit 到 Cell。

本 ADR 不为 solver 建 Definition / registry。固定轨道算法是 alpha.1 的封闭不变量；alpha.2 扩展为统一 Constraint Grid Layout，而不是允许用户替换全局 solver。

理由：

1. 在没有通用 measurement contract 时仍能形成确定、可测试的纵向闭环
2. 固定轨道与未来 auto/minmax 共用 TableLayout 输出，不污染 Semantic model
3. 明确延期优于在 Table 内复制 Core 文本或 composite 测量

alpha.1 固定默认 `columnWidth = 120`、`rowHeight = 32`；direct content 的局部原点固定对齐 Cell center。alpha.2 必须通过显式 schema 与迁移说明冻结 bounds-aware alignment、allocated content box、fit 和 overflow 语义，不沿用或静默替换这条临时原点假设。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: { kind: 'manual', rows: 2, columns: 3, cells: [] },
  layout: { columnWidth: 100, rowHeight: 28, columnGap: 4, rowGap: 2 },
};
```

## 测试设计

- 1×1、2×3 manual 的 track 与 Cell boxes
- columnHeader row 使用 headerHeight，body row 使用 rowHeight
- 省略 layout 使用稳定默认值
- gap 参与 bounds 与 center 计算
- manual/custom columnHeader row 与 detail header 使用同一 headerHeight；body row 使用 rowHeight
- 零行/零列退化 bounds、track 数组与 Cell 输出确定
- 非有限、非正 width/height 和负 gap fail-loud
- input model/spec 不被 mutation
- 相同输入重复布局得到深相等结果

## 影响

- 新增 Table layout schema、resolved types 与纯 `layoutTable` pipeline
- 不修改 Core，不 deep import Core compile
- alpha.2 将扩展 track sizing / span / border / bounds-aware content placement / fit / overflow，但保持 `TableLayout` 作为布局到 lowering 的边界
- alpha.1 不提供 padding、start/end alignment、wrap、baseline、span 或 border

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Constraint Layout 最小闭环
- 解决的问题：从 SemanticTableModel 得到 renderer-agnostic 确定二维几何
- 主责包与协作包：Table 主责；Core 只消费 lowering 后 IR
- 是否可由现有能力组合：Core Grid/Sugar 不含 Table semantics，需 Table layout；通用测量尚不可组合
- 是否需要下沉：alpha.2 若需任意 IRChild measurement，先下沉 Core contract
- 内部表达链路：layout schema → resolve defaults → layoutTable → TableLayout
- 外部扩展链路：不采用 registry；solver 是全局正确性不变量
- pipeline / lowering 与下游消费：ADR-05 只消费 TableLayout
- React / Vanilla adapter 等价性：layout 全在 core Table package
- provenance / lineage / locator：TableLayout 保留 stable cellId；完整 locator 延后
- 本轮结论：当前域闭合实现 fixed layout；auto/span/border 与通用 composite 的测量、fit、overflow 明确延期 alpha.2

## 不在本 ADR 范围

- auto/fraction/fitContent/minmax 与 per-column size
- 内容 intrinsic / constrained measurement、换行、padding、bounds-aware alignment、baseline
- span、border、fragmentation、fit、clip 与 overflow policy

---

## 实现契约（必填）🔻

### Level

`red`：新增公开 layout schema 与决定 Core IR 几何的 pipeline。

### Schema 改动

| 文件                       | 操作 | 字段名         | 类型                               | 默认值    | describe 中文摘要 |
| -------------------------- | ---- | -------------- | ---------------------------------- | --------- | ----------------- |
| `schemas/layout/schema.ts` | 新增 | `columnWidth`  | finite positive number optional    | 120       | 统一列宽          |
| 同上                       | 新增 | `rowHeight`    | finite positive number optional    | 32        | body/manual 行高  |
| 同上                       | 新增 | `headerHeight` | finite positive number optional    | rowHeight | columnHeader 行高 |
| 同上                       | 新增 | `columnGap`    | finite nonnegative number optional | 0         | 列间距            |
| 同上                       | 新增 | `rowGap`       | finite nonnegative number optional | 0         | 行间距            |

默认值在 `resolveTableLayoutSpec()` 物化，不使用 Zod `.default()` 改写原始 IR。

### 文件 scope

- `packages/viz/table/src/schemas/layout/**`
- `packages/viz/table/src/shared/layout.ts`
- `packages/viz/table/src/pipeline/layout/{types,resolve,layout,index}.ts`
- 对应 owner barrels 与包根导出
- `packages/viz/table/tests/{ir,layout}/**`

### 测试象限

**Happy path**：1×1；2×3；detail header；custom gap；默认 layout。

**边界**：极小正尺寸；0 gap；空 manual cells；detail header false + 空 dataset 得到零高度 bounds；custom 零行/零列；单轨道不产生尾部 gap。

**错误路径**：0/负/NaN/Infinity track size；负/NaN gap；不存在 Cell row/column id。

**交互**：manual/detail/custom 按同一 row semantics layout；row/column/cell 输出保持 canonical 顺序；ADR-05 组合 PresentedTableModel 与 layout 时按 cellId 对齐；bounds sentinel / Scope translation parity。

### 依赖的现有元素

- `Position`、`BoundsRect`（`@retikz/math`）——局部点与左上角 bounds 词汇
- `SemanticTableModel`（ADR-02）——只读布局输入
- `PresentedTableModel`（ADR-03 pipeline 产物）——明确不作为 alpha.1 layout 输入，只在 ADR-05 emit 阶段与几何组合
- Core `measureText` 仅作为 alpha.2 gating 证据，本 ADR 不调用
