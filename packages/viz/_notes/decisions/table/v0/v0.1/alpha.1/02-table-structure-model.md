# ADR-02：manual/list 结构与 SemanticTableModel

- 状态：Proposed
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Table 不能把 manual、list、group 和 pivot 做成互不相通的根组件，否则每种表格都会复制 Cell、layout 与 lowering。alpha.1 需要先验证两种最基础来源：显式二维内容 manual，以及 records → rows 的 list。

同时，结构必须允许后续新增 pivot/matrix 和自定义 structure。若根 schema 只写内置 discriminated union，自定义能力会被挡在 IR 外；若直接允许任意对象而没有 Definition schema，错误只能在布局阶段暴露。

## 决策：Structure Definition 统一生成 canonical SemanticTableModel

Table structure 使用内部判别字段 `kind`。公开 operation 由“精确内置 union + JSON-safe custom operation”组成：

```ts
type IRTableStructureOperation = IRManualTableStructure | IRListTableStructure | IRCustomTableStructure;
```

### manual

```ts
type IRManualTableStructure = {
  kind: 'manual';
  rows: number;
  columns: number;
  cells: Array<IRTableCell>;
};
```

- `rows` / `columns` 为正整数
- Cell 使用零基 `{ row, column }` 地址
- alpha.1 不支持 span，同一地址只能有一个 Cell
- 空 `cells` 允许，用于占位或渐进生成，但行列数量必须明确

### list

```ts
type IRListTableStructure = {
  kind: 'list';
  columns: Array<IRTableListColumn>;
  header?: boolean;
};

type IRTableListColumn = {
  id: string;
  field: string;
  header?: IRTableCellPayload;
  presentation?: IRTablePresentationRef;
};
```

- `columns` 至少一项，`id` 唯一
- `field` 使用 Data dotted path，由 `resolveFieldPath` 读取
- `header` 省略时使用 column id 的 text presentation
- structure 级 `header` 省略时按 `true` 处理；`false` 时不生成 columnHeader row
- field 结果在 alpha.1 必须为 Data scalar；对象、数组与函数 fail-loud

### custom operation

custom structure 的入口 schema 固定为：

```ts
const CustomTableStructureSchema = z
  .object({ kind: z.string().min(1) })
  .catchall(JsonValueSchema)
  .superRefine(rejectReservedStructureKinds);
```

它拒绝 `manual`、`list` 与保留名 `custom`，并保证 operation 全量 JSON-safe。pipeline 查 registry 后再用 Definition 自己的精确 schema parse；未注册 kind 直接抛出带 kind 的 `table:` 错误。

### Definition / registry

```ts
type TableStructureDefinition<TSpec> = {
  schema: ZodType<TSpec>;
  build: (spec: TSpec, context: TableStructureContext) => TableStructureOutput;
};
```

- `defineTableStructure()` 是作者侧 typed identity / future normalization hook
- 内置 manual/list 也通过 `defineTableStructure()` 注册
- Definition 不重复声明 `kind`；`extractTableStructureKind()` 强制从 `schema.shape.kind` 的非空 `z.literal()` 提取唯一 registry key
- `resolveTableStructureRegistry()` 以 `Map` 合并内置与用户 definitions
- 用户 key 与内置或重复用户 key 冲突时 fail-loud，不允许静默覆盖
- pipeline 对 `TableStructureOutput` 统一做 ID、地址与 lineage 验证，再生成 canonical model

扩展 ABI 固定为：

```ts
type TableStructureContext = {
  data?: {
    reference: string;
    model?: IRDataModel;
    rows: ReadonlyArray<ExternalRow>;
  };
  resolveField: (row: ExternalRow, field: string) => unknown;
};

type TableStructureOutput = {
  rows: ReadonlyArray<{
    id: string;
    kind: TableRowKindValue;
    sourceIndex?: number;
  }>;
  columns: ReadonlyArray<{
    id: string;
    field?: string;
  }>;
  cells: ReadonlyArray<{
    id: string;
    row: number;
    column: number;
    payload: IRTableCellPayload;
    location: TableCellLocationValue;
    roles: ReadonlyArray<TableCellRoleValue>;
    source?: TableCellSource;
  }>;
};
```

`TableRowKind` alpha.1 只有 `ColumnHeader` / `Body`；`TableCellLocation` 只有 `ColumnHeader` / `Body`；`TableCellRole` 只有 `ColumnHeader` / `Data`。这些都按 const object enum + `ValueOf` 导出。`TableCellSource` 是以下 runtime-only union：

```ts
type TableCellSource =
  | { kind: 'manual'; cellIndex: number }
  | { kind: 'field'; reference: string; sourceIndex: number; field: string }
  | { kind: 'generated'; structureKind: string };
```

context 只暴露根 `data` 引用解析出的单一只读 dataset，不允许读取任意 datasets、修改 rows 或访问 renderer。`build` 必须纯且确定；所有 Definition（含 custom）必须为 row / column / cell 显式提供稳定非空 id，pipeline 不为 custom 猜测 identity。

pipeline 复制 output 后按以下固定矩阵验证，不信任 Definition 直接写 canonical model：

- row / column / cell id 分别在各自 owner 内唯一；Cell `(row, column)` 地址唯一且 index 必须落在 output rows / columns 范围内
- `columnHeader` Cell 的 roles 必须逐字为 `['columnHeader']`，且只能引用 `kind: 'columnHeader'` 的 row
- `body` Cell 的 roles 必须逐字为 `['data']`，且只能引用 `kind: 'body'` 的 row
- column-header row 不允许 `sourceIndex`；body row 的 `sourceIndex` 若存在，必须是 context data rows 内的有效零基 index
- `{ kind: 'manual' }` source 只允许内置 manual Definition 产生，`cellIndex` 必须索引原始 `spec.cells`
- `{ kind: 'field' }` source 要求 context 存在 data，`reference` 必须等于 `context.data.reference`，`sourceIndex` 必须有效，`field` 必须非空；它只允许 body Cell
- `{ kind: 'generated' }` source 的 `structureKind` 必须逐字等于当前 Definition schema 提取出的 registry key
- source 省略合法，表示 Definition 无法声明更细来源；pipeline 仍保留 Cell stable id 与 structure kind

### SemanticTableModel

alpha.1 的只读公开 view 包含：

```ts
type SemanticTableModel = {
  rows: ReadonlyArray<SemanticTableRow>;
  columns: ReadonlyArray<SemanticTableColumn>;
  cells: ReadonlyArray<SemanticTableCell>;
};
```

字段固定为：

```ts
type SemanticTableRow = Readonly<{
  id: string;
  index: number;
  kind: TableRowKindValue;
  sourceIndex?: number;
}>;

type SemanticTableColumn = Readonly<{
  id: string;
  index: number;
  field?: string;
}>;

type SemanticTableCell = Readonly<{
  id: string;
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  location: TableCellLocationValue;
  roles: ReadonlyArray<TableCellRoleValue>;
  payload: IRTableCellPayload;
  source?: TableCellSource;
}>;
```

canonical model 只能由 pipeline 构造，数组与实体均按只读 contract 暴露；Definition 返回窄 `TableStructureOutput`，不能替换 canonical model 或绕过验证。

内置稳定 ID：

- manual row / column：`row.<index>` / `column.<index>`
- manual cell：显式 id，否则 `cell.r<row>.c<column>`
- list header row：`row.header`
- list body row：`row.<sourceIndex>`
- list header cell：`cell.header.c<columnId>`
- list body cell：`cell.r<sourceIndex>.c<columnId>`

manual Cell 的 `location` / `roles` 省略时分别物化为 `body` / `['data']`；list header 固定为 `columnHeader` / `['columnHeader']`，body 固定为 `body` / `['data']`。custom Definition 必须自行提供稳定 id，pipeline 只验证、不改写。

理由：

1. 所有结构先归一为同一模型，后续 layout / lowering 不区分 manual 与 list
2. Definition output 与 canonical model 分离，避免自定义扩展破坏地址和 lineage 不变量
3. 精确内置 schema 与开放 custom schema 同时满足类型体验与 registry 扩展

custom Definition 采用上述声明式 `TableStructureOutput`，不提供 builder commands。list `header` 不用 Zod `.default(true)` 改写输入 IR，由 pipeline 在 runtime 物化缺省 `true`。

## DSL 表面

```ts
const manual = {
  kind: 'manual',
  rows: 2,
  columns: 2,
  cells: [
    { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Name' } },
    { address: { row: 0, column: 1 }, payload: { kind: 'value', value: 'Score' } },
  ],
};

const list = {
  kind: 'list',
  columns: [
    { id: 'name', field: 'user.name', header: { kind: 'value', value: 'Name' } },
    { id: 'score', field: 'score' },
  ],
};
```

## 测试设计

- manual 地址归一、稳定 ID 与空 cells
- manual 重复地址 / 越界地址 / 重复显式 id fail-loud
- list 按 records 与 columns 生成 header/body
- list 重复 column id、未知 field、非 scalar field fail-loud
- header false 不生成 columnHeader row
- custom structure 与内置走同一 registry / pipeline
- duplicate / builtin override definition fail-loud

## 影响

- 新增 structure schema、Definition、providers registry 与 normalize pipeline
- 消费 ADR-03 的 Cell payload / presentation ref，不在 structure 层复制内容类型
- 复用 Data `resolveFieldPath`，不复制 dotted-path 算法
- 为 alpha.4/5 的 operation、group、pivot 提供 canonical model 地基
- 不修改 Core、Data 或 Plot

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Structure 与 Table Algebra 地基
- 解决的问题：把多种输入结构统一为可验证、可扩展的语义模型
- 主责包与协作包：Table 主责；Data 只提供 field resolution 与 scalar vocabulary
- 是否可由现有能力组合：Data 不能表达 Cell 拓扑，需要扩展 Table 域
- 是否需要下沉：无；通用 field path 已在 Data
- 内部表达链路：structure operation → registry schema → output → canonical model
- 外部扩展链路：define → user definitions → Map registry → unified build / validate
- pipeline / lowering 与下游消费：ADR-04/05 只消费 SemanticTableModel
- React / Vanilla adapter 等价性：两者只构造相同 structure IR
- provenance / lineage / locator：alpha.1 sourceIndex/field 进入 Cell source；完整 lineage 延后但 identity 已稳定
- 本轮结论：扩展 Table structure 域；不新增平行根类型

## 不在本 ADR 范围

- group、hierarchy、summary、pivot、matrix、transpose
- span、row/column style、sorting/filtering
- formatter、rule、theme 与布局

---

## 实现契约（必填）🔻

### Level

`red`：新增公开结构 schema、Definition registry 与 canonical model pipeline。

### Schema 改动

| 文件                          | 操作 | 字段名         | 类型                                    | 默认值                | describe 中文摘要         |
| ----------------------------- | ---- | -------------- | --------------------------------------- | --------------------- | ------------------------- |
| `schemas/structure/schema.ts` | 新增 | `kind`         | `'manual' \| 'list' \| custom string`   | —                     | 结构 operation 判别       |
| 同上                          | 新增 | `rows`         | manual `z.number().int().positive()`    | —                     | manual 行数               |
| 同上                          | 新增 | `columns`      | manual 正整数 / list 非空 column 数组   | —                     | manual 列数或 list 列定义 |
| 同上                          | 新增 | `cells`        | `z.array(TableCellSchema)`              | `[]` 由调用方显式给出 | manual Cell               |
| 同上                          | 新增 | `header`       | list `z.boolean().optional()`           | pipeline true         | 是否生成 column header    |
| `schemas/structure/list.ts`   | 新增 | `id`           | 非空字符串                              | —                     | list column 稳定 id       |
| 同上                          | 新增 | `field`        | 非空字符串                              | —                     | Data dotted field path    |
| 同上                          | 新增 | `header`       | `TableCellPayloadSchema.optional()`     | column id             | header payload            |
| 同上                          | 新增 | `presentation` | `TablePresentationRefSchema.optional()` | text                  | body presentation         |
| `schemas/cell/address.ts`     | 新增 | `row`          | `z.number().int().nonnegative()`        | —                     | 零基 row index            |
| 同上                          | 新增 | `column`       | `z.number().int().nonnegative()`        | —                     | 零基 column index         |
| `schemas/cell/schema.ts`      | 新增 | `id`           | 非空字符串 optional                     | 生成稳定 id           | manual Cell id            |
| 同上                          | 新增 | `address`      | `TableCellAddressSchema`                | —                     | manual Cell 地址          |
| 同上                          | 新增 | `payload`      | `TableCellPayloadSchema`                | —                     | Cell 内容                 |
| 同上                          | 新增 | `location`     | `TableCellLocationValue.optional()`     | body                  | Cell 语义位置             |
| 同上                          | 新增 | `roles`        | 非空 role 数组 optional                 | data                  | Cell 语义角色             |

公开类型全部由 schema 推导；Semantic model 类型位于 contract，不作为 IR schema。

### 文件 scope

- `packages/viz/table/src/schemas/structure/**`
- `packages/viz/table/src/schemas/cell/{address,location,role,schema}.ts`（payload 分支由 ADR-03）
- `packages/viz/table/src/contract/model/**`
- `packages/viz/table/src/contract/structure/**`
- `packages/viz/table/src/providers/structure/**`
- `packages/viz/table/src/pipeline/normalize/**`
- 对应 owner `index.ts` 与包根 barrel
- `packages/viz/table/tests/{ir,structure}/**`

### 测试象限

**Happy path**：manual 2×2；list header+body；header false；custom structure。

**边界**：1×1；空 manual cells；单 column / 空 dataset；nested field path。

**错误路径**：重复/越界地址；任一 owner 重复/空 id；非法 location-role-row 组合；非法 manual/field/generated source；非 scalar field；未注册 custom kind；registry key 冲突。

**交互**：manual/list 输出同一 canonical model；list source 与 ADR-05 manifest identity 对齐；custom output 经过同一 validator。

### 依赖的现有元素

- `IRDataScalarValue`、`IRDataModel`、`ExternalRow`、`resolveFieldPath`（`@retikz/data`）——字段读取、model 与 scalar 边界
- `JsonValueSchema`（`@retikz/core`）——custom operation catchall JSON-safe 校验
- `Map` registry 模式与 `defineXxx` 分层规则——复用仓库 Definition 约定
- `IRTableCellPayload`、`IRTablePresentationRef`（ADR-03）——Cell 内容与 list presentation 引用
