# ADR-08：Manual Table 使用行优先二维持久化结构

- 状态：Accepted
- 决策日期：2026-07-29
- 完成日期：2026-07-29
- 关联：[table v0.1 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

原 manual Structure 要求作者同时声明数字 `rows` / `columns`，再用包含零基 `address` 与 `payload` 的扁平 `cells` 填充网格。该结构能直接进入 canonical model，但让普通二维内容重复表达尺寸、坐标与 payload 包装，也使持久化 JSON、framework-neutral helper 和 React markers 拥有不同复杂度的 authoring 表面。

manual Table 的持久化真源就是显式二维内容。矩形行数组已经足以确定行列数量、Cell 地址与空槽；span、语义、layout 和直接 `IRChild` 内容仍可保存在 Cell entry 中。canonical addressing 应由 `@retikz/table` 统一物化，而不是由作者和各 adapter 重复构造。

## 决策

`ManualTableStructureSchema` 只接受 `kind + rows + rowKinds?`。公开持久化形态为：

```ts
type IRManualTableStructure = {
  kind: 'manual';
  rows: Array<Array<IRManualTableCell | null>>;
  rowKinds?: Array<TableRowKindValue>;
};
```

`IRManualTableCell` 接受 `string | number | boolean` 简写、带 `value` 的闭合对象或带 `content` 的闭合对象。对象分支继续承载 `id`、`location`、`roles`、`span` 与 `layout`；value 分支还可声明 `presentation`。

矩阵遵循以下规则：

1. `rows` 非空，每行非空且等长；不接受 ragged rows、`undefined` 或数组空洞
2. 标量是 value Cell 简写；`null` 是空槽，真实 null scalar 写成 `{ value: null }`
3. `rowKinds` 省略时全部为 `body`，提供时长度必须等于行数
4. 行列数从矩阵形状推导，非空 entry 的坐标成为 canonical address，默认 id 仍为 `cell.r<row>.c<column>`
5. span 必须在边界内、不能重叠或跨 row kind；被 span 覆盖的非起点位置必须为 `null`
6. 全空但有尺寸的表格使用显式 null matrix，例如 `[[null, null], [null, null]]`

内置 manual Structure Definition 遍历矩阵，将 scalar 或 object entry 物化为现有 canonical payload，忽略 null slot，再交给既有 `SemanticTableModel`、layout、lowering 与 manifest 链路。manual source identity 改为直接指向持久化坐标：

```ts
type ManualTableCellSource = {
  kind: 'manual';
  row: number;
  column: number;
};
```

`createManualTableIR()` 与 Vanilla `manualTable()` 接受同一个 `ManualTableInput`。React `<ManualTable>` 提供互斥的两种模式：

- props 模式直接传入 `rows` 与可选 `rowKinds`
- marker 模式使用 `<Row>/<Cell>`；builder 按 span occupancy 推导最大宽度，并把未占位置补成 `null`

marker 模式至少需要一个 Cell 才能推导列数；全空表格必须使用 props 模式的显式 null matrix。marker `<Cell>` 的 null value 仍表示真实 value null，因为 marker 本身已经证明该位置存在 Cell。

## 兼容性

这是 0.x 阶段的 breaking change，不保留兼容别名或宽 union：

- 删除 numeric `rows`、`columns`、flat `cells`、author-facing `address` 与 `payload`
- 删除 `TableCellSchema` / `IRTableCell` 和 `TableCellAddressSchema` / `IRTableCellAddress`
- 包根新增 `ManualTableCellSchema` / `IRManualTableCell`
- manual manifest source 从 `cellIndex` 改为 `{ row, column }`
- React 删除根 numeric dimensions，改用互斥的 `rows` props 或 markers

detail/custom Structure、Definition registry、canonical output、presentation、layout、Core compile 与 renderer 契约不变。

## 最终实现

- `@retikz/table` 以 Zod schema 约束非空矩形 rows，统一构造 spec、canonical tracks、Cell identity 与 source coordinates
- manual provider 将 scalar/object/null entries 映射到既有 canonical model；normalize 继续负责 span、row kind 与 topology 验证
- `@retikz/table-react` 的 props 和 marker authoring 产出相同 rows；marker width 由实际 occupancy 推导
- `@retikz/table-vanilla` 保持共享 constructor 的薄封装
- package README 与双语模型、contract、runtime 文档同步 rows、null sentinel、真实 null scalar 和迁移后的公共 API

## 遗留风险

- persisted rows 必须保持矩形；当前不提供 ragged input 的自动修复
- marker width 依赖至少一个 Cell；只有显式 rows 能表达完全空的矩形
- formatter、条件视觉编码、theme、legend、group、pivot 与多层 header 不属于本决策，需由后续 milestone 和 ADR 冻结
