# ADR-02：manual/detail 结构与 SemanticTableModel

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Table 不能为 manual、detail、pivot、matrix 建立互不相通的根组件，也不能让 group、hierarchy、summary 等 operation 形成另一套根结构，否则每种表格都会复制 Cell、layout 与 lowering。alpha.1 先验证两种最基础来源：显式二维内容 manual，以及一条 record → 一行明细的 detail。

同时，结构必须允许后续新增 pivot/matrix 和自定义 structure。若根 schema 只写内置 discriminated union，自定义能力会被挡在 IR 外；若直接允许任意对象而没有 Definition schema，错误只能在布局阶段暴露。

## 决策：Structure Definition 统一生成 canonical SemanticTableModel

Table structure 使用内部判别字段 `kind`。公开 operation 由“精确内置 union + JSON-safe custom operation”组成：

```ts
type IRTableStructureOperation = IRManualTableStructure | IRDetailTableStructure | IRCustomTableStructure;
```

### manual

```ts
type IRManualTableStructure = {
  kind: 'manual';
  rows: number;
  columns: number;
  rowKinds?: Array<TableRowKindValue>;
  cells: Array<IRTableCell>;
};
```

- `rows` / `columns` 为正整数
- `rowKinds` 省略时所有行均为 `body`；提供时长度必须严格等于 `rows`
- Cell 使用零基 `{ row, column }` 地址
- alpha.1 不支持 span，同一地址只能有一个 Cell
- 空 `cells` 允许，用于占位或渐进生成，但行列数量必须明确
- manual Cell 省略 `location` / `roles` 时按所在 row kind 物化：`columnHeader → columnHeader/['columnHeader']`，`body → body/['data']`
- manual Cell 显式 `location` / `roles` 必须与所在 row kind 一致；不允许同一行混合 header/body 语义

### detail

```ts
type IRDetailTableStructure = {
  kind: 'detail';
  columns: Array<IRTableDetailColumn>;
  header?: boolean;
};

type IRTableDetailColumn = {
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
- build 前把全部 `columns.field` 收集为 source fields，并通过 context 包装的 `resolveFieldTypes(sourceFields)` 调用 Data 公开的 `resolveFieldTypes(model, rows, sourceFields)`；存在 `data.model` 时未知 field 即使在空 dataset 中也 fail-loud
- 未提供 `data.model` 时空 dataset 无法证明 field 不存在，因此允许；非空 dataset 中 field 缺失得到 `undefined`，或解析为非 scalar 值时，按 `sourceIndex` 与 field fail-loud，`null` 保持合法 scalar

### custom operation

custom structure 的入口 schema 固定为：

```ts
const CustomTableStructureSchema = z
  .object({ kind: z.string().min(1) })
  .catchall(JsonValueSchema)
  .superRefine(rejectReservedStructureKinds);
```

它拒绝内置名 `manual`、`detail`、后续 v0.1 保留名 `pivot`、`matrix` 与保留名 `custom`，并保证 operation 全量 JSON-safe。pipeline 查 registry 后再用 Definition 自己的精确 schema parse；未注册 kind 直接抛出带 kind 的 `table:` 错误。`RESERVED_TABLE_STRUCTURE_KINDS` 从第一版固定包含上述五个 key，operation schema 与 registry resolver 都消费这一份常量，用户不能在对应内置实现落地前抢占 `pivot` / `matrix`。

### Definition / registry

```ts
type TableStructureDefinition<TSpec extends IRTableStructureOperation = IRTableStructureOperation> = {
  schema: ZodType<TSpec>;
  build: (spec: TSpec, context: TableStructureContext) => TableStructureOutput;
};

type AnyTableStructureDefinition = Omit<TableStructureDefinition, 'schema' | 'build'> & {
  schema: ZodType;
  build: (spec: never, context: TableStructureContext) => TableStructureOutput;
};

const defineTableStructure = <TSpec extends IRTableStructureOperation>(
  definition: TableStructureDefinition<TSpec>,
): TableStructureDefinition<TSpec> => definition;
```

- `defineTableStructure()` 是作者侧 typed identity / future normalization hook
- 内置 manual/detail 也通过 `defineTableStructure()` 注册
- Definition 不重复声明 `kind`；`extractTableStructureKind()` 强制从 `schema.shape.kind` 的非空 `z.literal()` 提取唯一 registry key
- `resolveTableStructureRegistry()` 以 `Map` 合并内置与用户 definitions，返回 `ReadonlyMap<string, AnyTableStructureDefinition>`
- resolver 提取每个用户 definition key 后先检查 `RESERVED_TABLE_STRUCTURE_KINDS`；分别诊断 builtin collision、future-reserved key（`pivot` / `matrix` / `custom`）与 duplicate custom key，均 fail-loud，不允许注册不可调用的 definition 或静默覆盖
- pipeline lookup 后先以对应 `definition.schema` parse operation，再把 parse 结果作为 `never` 调用宽类型 `build`；异构 registry 不使用 `any` 或跳过 schema 收窄
- pipeline 对 `TableStructureOutput` 做完整 runtime parse、跨字段验证与只读复制，再生成 canonical model

扩展 ABI 使用只服务 Table contract 的递归只读映射：

```ts
type DeepReadonly<T> =
  T extends ReadonlyArray<infer TValue>
    ? ReadonlyArray<DeepReadonly<TValue>>
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T;

type ReadonlyTableDataModel = DeepReadonly<IRDataModel>;
type ReadonlyTableCellPayload = DeepReadonly<IRTableCellPayload>;
```

Definition context 不暴露外部 row 对象，只暴露稳定 source index 与 scalar field resolver，避免 custom build 改写宿主数据。扩展 ABI 固定为：

```ts
type TableStructureContext = Readonly<{
  data?: Readonly<{
    reference: string;
    model?: ReadonlyTableDataModel;
    sourceIndices: ReadonlyArray<number>;
  }>;
  resolveFieldTypes: (sourceFields: ReadonlySet<string>) => ReadonlyMap<string, DataFieldTypeValue>;
  resolveField: (sourceIndex: number, field: string) => IRDataScalarValue | undefined;
}>;

type TableStructureOutput = Readonly<{
  rows: ReadonlyArray<
    Readonly<{
      id: string;
      kind: TableRowKindValue;
      sourceIndex?: number;
    }>
  >;
  columns: ReadonlyArray<
    Readonly<{
      id: string;
      field?: string;
    }>
  >;
  cells: ReadonlyArray<
    Readonly<{
      id: string;
      row: number;
      column: number;
      payload: ReadonlyTableCellPayload;
      location: TableCellLocationValue;
      roles: ReadonlyArray<TableCellRoleValue>;
      source?: TableCellSource;
    }>
  >;
}>;
```

`TableStructureOutput` 的字段形态由 `contract/structure/output.ts` 中的内部 `TableStructureOutputSchema` 唯一声明，公开类型按 `DeepReadonly<z.output<typeof TableStructureOutputSchema>>` 派生；上面的代码只展示等价 ABI，不另写一份手工类型真源。schema 经 contract owner barrel 提供给 pipeline，但不从包根导出，也不进入 Table IR / DSL schema registry。

`TableRowKind` alpha.1 只有 `ColumnHeader` / `Body`；`TableCellLocation` 只有 `ColumnHeader` / `Body`；`TableCellRole` 只有 `ColumnHeader` / `Data`。这些都按 const object enum + `ValueOf` 导出。`TableCellSource` 是以下 runtime-only readonly union：

```ts
type TableCellSource =
  | Readonly<{ kind: 'manual'; cellIndex: number }>
  | Readonly<{ kind: 'field'; reference: string; sourceIndex: number; field: string }>
  | Readonly<{ kind: 'generated'; structureKind: string }>;
```

context 只暴露根 `data` 引用解析出的单一 dataset 索引、递归复制并冻结的 model，以及由 pipeline 包装的 field helpers；不允许读取任意 datasets、取得或修改 row 对象、修改 model 或访问 renderer。`sourceIndices` 固定为当前 dataset 的 `0..rows.length - 1`；`resolveFieldTypes` 在闭包内复用原始 rows 完成 strict model 校验与类型推断，`resolveField` 按 source index 调用 Data `resolveFieldPath`，只返回 scalar 或缺字段的 `undefined`，非 scalar 值 fail-loud。`build` 必须纯且确定。所有 Definition（含 custom）必须为 row / column / cell 显式提供稳定非空 id，pipeline 不为 custom 猜测 identity。

pipeline 对 operation 与 output 固定执行以下顺序：

1. `JsonObjectSchema.parse(operation)` 校验原始 operation JSON-safe
2. `definition.schema.parse(operation)` 得到精确 spec，再次以 `JsonObjectSchema.parse(parsedSpec)` 拒绝 schema transform/default 产生的非 JSON 值
3. `definition.build(parsedSpec as never, readonlyContext)` 生成 runtime output
4. `JsonObjectSchema.parse(output)` 后由 `contract/structure/output.ts` 的内部 `TableStructureOutputSchema` 完整解析 rows / columns / cells、payload、location、roles 与 source union
5. 对 parsed output 做 detached deep copy，并递归冻结完整对象图（含 payload / source），再执行下述跨字段矩阵并构造 canonical model

任一步失败都补充 `table: structure "<kind>"` 与精确字段 path；custom Definition 不得把函数、class、`undefined`、非法枚举或未校验 payload 带入 canonical model。`TableStructureOutputSchema` 是 contract 层的 runtime provider-output guard，不进入 `schemas/`、Table IR、公开 DSL、schema registry 或包根公共导出。

完整 runtime parser 至少验证：root / row / column / cell 均为闭合对象；三个集合均为数组；id / field / `generated.structureKind` 为非空字符串；`row` / `column` / `sourceIndex` / `cellIndex` 为非负整数；payload 通过 `TableCellPayloadSchema`；kind / location / roles 通过对应 const object enum schema；source 必须匹配 `manual | field | generated` 精确 union。随后按以下固定矩阵验证，不信任 Definition 直接写 canonical model：

- row / column / cell id 分别在各自 owner 内唯一；Cell `(row, column)` 地址唯一且 index 必须落在 output rows / columns 范围内
- `columnHeader` Cell 的 roles 必须逐字为 `['columnHeader']`，且只能引用 `kind: 'columnHeader'` 的 row
- `body` Cell 的 roles 必须逐字为 `['data']`，且只能引用 `kind: 'body'` 的 row
- column-header row 不允许 `sourceIndex`；body row 的 `sourceIndex` 若存在，必须存在于 `context.data.sourceIndices`
- `{ kind: 'manual' }` source 只允许内置 manual Definition 产生，`cellIndex` 必须索引原始 `spec.cells`
- `{ kind: 'field' }` source 要求 context 存在 data，`reference` 必须等于 `context.data.reference`，`sourceIndex` 必须有效，`field` 必须非空；它只允许 body Cell
- `{ kind: 'generated' }` source 的 `structureKind` 必须逐字等于当前 Definition schema 提取出的 registry key
- source 省略合法，表示 Definition 无法声明更细来源；pipeline 仍保留 Cell stable id 与 structure kind

### SemanticTableModel

alpha.1 的只读公开 view 包含：

```ts
type SemanticTableModel = Readonly<{
  rows: ReadonlyArray<SemanticTableRow>;
  columns: ReadonlyArray<SemanticTableColumn>;
  cells: ReadonlyArray<SemanticTableCell>;
}>;
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
  payload: ReadonlyTableCellPayload;
  source?: TableCellSource;
}>;
```

canonical model 只能由 pipeline 构造；pipeline 从已深冻结的 output 创建新的 model，并递归冻结数组、实体及所有嵌套 JSON 值，公开的 `DeepReadonly` 类型与 runtime 冻结深度一致。Definition 返回窄 `TableStructureOutput`，不能替换 canonical model 或绕过验证。

内置稳定 ID：

- manual row / column：`row.<index>` / `column.<index>`
- manual cell：显式 id，否则 `cell.r<row>.c<column>`
- detail header row：`row.header`
- detail body row：`row.<sourceIndex>`
- detail header cell：`cell.header.c<columnId>`
- detail body cell：`cell.r<sourceIndex>.c<columnId>`

manual row kind 由 `rowKinds` 决定，省略时全部为 body；Cell 的 `location` / `roles` 省略时跟随所在 row kind 物化。detail header 固定为 `columnHeader` / `['columnHeader']`，body 固定为 `body` / `['data']`。custom Definition 必须自行提供稳定 id，pipeline 只验证、不改写。

理由：

1. 所有结构先归一为同一模型，后续 layout / lowering 不区分 manual 与 detail
2. Definition output 与 canonical model 分离，避免自定义扩展破坏地址和 lineage 不变量
3. 精确内置 schema 与开放 custom schema 同时满足类型体验与 registry 扩展

custom Definition 采用上述声明式 `TableStructureOutput`，不提供 builder commands。detail `header` 不用 Zod `.default(true)` 改写输入 IR，由 pipeline 在 runtime 物化缺省 `true`。

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

const detail = {
  kind: 'detail',
  columns: [
    { id: 'name', field: 'user.name', header: { kind: 'value', value: 'Name' } },
    { id: 'score', field: 'score' },
  ],
};
```

## 实现摘要与验证

manual、detail 与 custom structure 已通过同一 Definition / registry / normalize pipeline 生成递归冻结的 `SemanticTableModel`。内置结构与自定义结构共用精确 schema、provider output guard、跨字段矩阵和稳定 identity 规则，Data field path 与 field type 继续复用 `@retikz/data`。

验证覆盖 manual/detail 正常路径、空数据与 header 变体、地址和 id 冲突、字段缺失或非 scalar、保留 kind、definition 冲突、非法 provider output，以及 canonical model 的只读所有权隔离。

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
