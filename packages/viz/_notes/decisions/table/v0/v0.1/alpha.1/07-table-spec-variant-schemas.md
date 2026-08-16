# ADR-07：精确 Table 变体 schema 与统一根 union

- 状态：Accepted
- 决策日期：2026-07-21
- 关联：[table v0.1 roadmap](../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md) · [alpha.1 ADR-01](./01-table-spec-root.md) · [alpha.1 ADR-02](./02-table-structure-model.md) · [alpha.1 ADR-06](./06-table-bindings.md)

## 背景

alpha.1 当前只有一个顶层 `TableSchema`：`data` 在根上统一声明为 optional，`structure` 是 manual、detail 与 custom 的 union，再由根 schema 的 `superRefine` 约束 detail 必须有 data、manual 不能有 data。运行时可以拒绝非法组合，但 `IRTable` 只能得到宽类型，无法在 TypeScript 和生成的 JSON Schema 中直接表达 `detail => data 必填`、`manual => data 不存在`。

这种宽根 schema 会把结构差异藏在跨字段校验中。LLM、schema registry 和只处理单类表格的作者工具拿到 `TableSchema` 时，需要同时理解所有 structure 分支和额外 refinement；`createDetailTableIR()` / `createManualTableIR()` 也只能返回宽泛的 `IRTable`。未来加入 pivot、matrix 后，根 `superRefine` 会继续累积 kind 与根字段的组合规则。

需要区分两件事：Table 仍只有一个 `table.table` Tier 2 composite 根和一条 pipeline；但 manual、detail、pivot、matrix 等基础 structure 可以拥有各自精确的根 schema。schema 拆分是静态契约拆分，不是增加 Tier 3 IR、根 `type` 或独立 lowering。

## 决策：精确变体 schema 组成统一 IRTable union

保留 `namespace: 'table'`、`type: 'table'` 和 `structure.kind` 的现有持久化形态。把共享根字段放入内部 `TableBaseSchema`，为每个已实现的基础 structure 定义精确顶层 schema，再由公开 `TableSchema` 组成 canonical union：

```ts
const TableBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal(TABLE_NAMESPACE),
  type: z.literal(TableComposite.Table),
  id: z.string().min(1).optional(),
  layout: TableLayoutSchema.optional(),
  meta: JsonObjectSchema.optional(),
});

export const DetailTableSchema = TableBaseSchema.extend({
  data: DataReferenceSchema,
  structure: DetailTableStructureSchema,
});

export const ManualTableSchema = TableBaseSchema.extend({
  data: z.never().optional(),
  structure: ManualTableStructureSchema,
});

export const CustomTableSchema = TableBaseSchema.extend({
  data: DataReferenceSchema.optional(),
  structure: CustomTableStructureSchema,
});

export const TableSchema = z.union([DetailTableSchema, ManualTableSchema, CustomTableSchema]);
```

`TableBaseSchema` 只用于复用共同字段，不从 table schema barrel 或包根导出。三个变体 schema 与四个派生类型公开：

```ts
type IRDetailTable = z.infer<typeof DetailTableSchema>;
type IRManualTable = z.infer<typeof ManualTableSchema>;
type IRCustomTable = z.infer<typeof CustomTableSchema>;
type IRTable = z.infer<typeof TableSchema>;
```

具体约束：

- detail 根必须包含 `data: IRDataReference`，且 `structure` 必须是 `IRDetailTableStructure`
- manual 根以 `data: z.never().optional()` 表达“不存在可序列化 data 值”：任何实际 JSON data 值都在 `data` path fail-loud，省略字段或 TypeScript 输入中的 `undefined` 合法，且 `structure` 必须是 `IRManualTableStructure`
- custom 根只保证可选 `data` 符合 `DataReferenceSchema`。现有 `TableStructureDefinition.schema` 只解析 structure operation，provider 是否要求或禁止 data 由其 `build()` 检查可选 `context.data`，pipeline 负责补充 structure kind 诊断前缀；这是开放 custom 分支在本 ADR 接受的运行时边界
- `TableSchema` 是 Core composite definition、通用 `<Table spec>`、Vanilla embed、持久化读取和通用 pipeline 的唯一 canonical 根 schema
- detail/manual 的 schema 和类型供窄 authoring API、LLM tool schema、schema registry 与单类表格校验直接使用
- `TableSchema` 使用普通 union，不增加第二个根判别字段；三个 schema 分支在运行时通过 `structure.kind` 的 literal 或保留名拒绝规则保持互斥

canonical `IRTable` 不承诺按嵌套 `structure.kind` 自动缩窄外层 spec：TypeScript 不会把嵌套判别传递到父 union，且 custom 的开放 `kind: string` 在类型层与内置值有重叠。只处理单类表格的代码应直接接收对应 `IRXxxTable`，或通过对应 `XxxTableSchema.parse()` / `safeParse()` 取得窄类型。manual 的 `data?: never` 让通用 `IRTable.data` 继续保持 `IRDataReference | undefined`，因此现有通用 pipeline 无需依赖外层自动缩窄。

这里的 `data?: never` 是“不允许实际值”的契约简写；Zod 对 `z.never().optional()` 的推导可能显示为 `data?: undefined`，生成的 JSON Schema 则把该属性表达为不可满足 schema。两者都不允许持久化 JSON 携带 data 值。

未来新增基础 structure 时，必须在同一改动中新增对应 `XxxTableSchema` / `IRXxxTable` 并加入 `TableSchema`。v0.1 已保留但尚未实现的 pivot、matrix 在拥有精确顶层 schema 前继续被 custom 分支拒绝。group、hierarchy、summary、transpose 是可组合 operation 或 authoring façade，不因场景名称自动成为新的 canonical 根变体。

### Core composite 接线

当前 Core `defineComposite()` 虽在类型上接收 `ZodType<T>`，运行时只接受单个 `ZodObject`，并从 `schema.shape.namespace/type` 提取 registry key。Table 若直接传入 canonical union，会在注册阶段失败；Table pipeline 或 adapter 不得绕过这项检查。

本 ADR 同时把 Core composite contract 通用化：`defineComposite()` 接受以下两类 registration schema。

1. 现有的单个 `ZodObject`，其 `namespace` / `type` 为非空字符串 literal
2. 直接 `ZodUnion`，每个 option 都是满足上一条的 `ZodObject`，且所有 option 的 `namespace` literal 完全相同、`type` literal 完全相同

Core 只从满足上述规则的 schema 提取唯一 registry key。union 为空、包含非 object option、任一 option 缺少 literal、分支 namespace/type 不一致，或 declaration key 与共同 literal 不一致时，`defineComposite:` 直接 fail-loud，并指出出错字段或 option。Core 不接受 Table 专属 kind，也不读取 `structure`；这是一项供所有 Tier 2 能力复用的通用 composite contract。

```ts
const tableDefinition = defineComposite({
  namespace: TABLE_NAMESPACE,
  type: TableComposite.Table,
  schema: TableSchema,
  expand: (spec: IRTable) => resolveTable(spec, datasets, options).node,
});
```

`CompositeDefinition.schema` 继续保持 `ZodType<T>`，只更新 JSDoc 与 `defineComposite()` 的运行时 key 提取逻辑，不新增第二个 registry、registration schema 或 Table 私有接线。Core compile 在 registry 选中 definition 后仍调用同一个 union schema parse，再执行同一个 `expand()`。

作者侧 API 同步收窄：

```ts
type DetailTableInput = Omit<
  IRDetailTable,
  'namespace' | 'type' | 'data' | 'structure'
> & {
  dataRef: string;
  model?: IRDataModel;
  columns: Array<TableDetailColumnInput>;
  header?: boolean;
};

type ManualTableInput = Omit<
  IRManualTable,
  'namespace' | 'type' | 'data' | 'structure'
> & {
  rows: number;
  columns: number;
  rowKinds?: Array<TableRowKindValue>;
  cells: Array<IRTableCell>;
};

const createDetailTableIR = (input: DetailTableInput): IRDetailTable;
const createManualTableIR = (input: ManualTableInput): IRManualTable;
```

两个构造函数分别使用自己的精确 schema parse；Vanilla `detailTable()` / `manualTable()` 保留同样的窄返回类型。React `<DetailTable>` / `<ManualTable>` 的运行时行为不变，内部可直接依赖 detail 的必填 `data`；通用 `<Table>` 仍接收 `IRTable`。

理由：

1. schema 结构本身表达 kind、data 与 structure 的合法组合，不再把核心约束藏在根 `superRefine` 中
2. LLM 和单类 authoring 工具可以只消费目标表格 schema；通用持久化与 pipeline 仍只消费一个 canonical union
3. 每个具体 schema 的 `z.infer` 产生可直接使用的精确变体类型，避免手写 interface 与 Zod 契约漂移，并为 pivot、matrix 提供一致扩展路径
4. 拆分不增加 JSON 字段、持久化体积、composite type 或 lowering 分支；所需的 union registration 能力下沉为 Core 通用 contract

不在根增加 `tableKind`、`variant` 等重复 discriminator。`structure.kind` 已是稳定的内部变体判别值；复制一份根判别字段会增加持久化内容，并引入两处值不一致的非法状态。

## DSL 表面

```ts
const detail: IRDetailTable = {
  namespace: 'table',
  type: 'table',
  data: { reference: 'scores' },
  structure: {
    kind: 'detail',
    columns: [{ id: 'score', field: 'score' }],
  },
};

const manual: IRManualTable = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'manual',
    rows: 1,
    columns: 1,
    cells: [],
  },
};

const persisted: IRTable = TableSchema.parse(JSON.parse(json));
```

LLM 生成明细表时优先提供 `DetailTableSchema`；只有允许生成多种基础表格时才提供 `TableSchema`。持久化内容仍是同一份 JSON，不保存 schema 名称。

## 最终实现

- `@retikz/table` 导出三个精确 schema 与对应 IR 类型，`TableSchema` / `IRTable` 聚合三种变体
- detail / manual authoring helper 与 Vanilla helper 返回精确变体；React 复用相同 normalization，通用入口继续接收 `IRTable`
- custom 保留 kind 的 refinement 作为 hard exclusion，避免开放 custom 分支吞掉内置或预留 structure
- Core `defineComposite()` 可从单 object 或共享 `namespace/type` 的直接 object union 提取唯一 registry key，并对非 object、空 literal、混合 key 与 declaration mismatch fail-loud
- Table 仍只注册一个 `table.table` composite，现有 structure registry、pipeline、lowering 与 manifest 语义未拆分

## 影响

- 新增公开 `DetailTableSchema`、`ManualTableSchema`、`CustomTableSchema` 与对应 IR 类型；helper 返回类型由 `IRTable` 收窄为具体变体
- ⚠️ BREAKING：`IRTable` 从“宽根对象 + structure union”变为三个精确根对象的 union，部分依赖对象结构赋值或泛型变换的 TypeScript 代码可能需要改用具体 variant type；通用 `IRTable.data` 仍为 `IRDataReference | undefined`，JSON 形态不变
- 删除 `TableSchema` 对 detail/manual data 共现关系的根 `superRefine`，由三个对象分支的字段契约承担
- `@retikz/table` pipeline 仍只注册一个 `TableSchema`，Table lowering、manifest 与 Data 公开契约不变
- Core `defineComposite()` 增加对共同 registry key 的直接 object union 支持；现有单 object definition 行为与错误规则保持兼容
- React / Vanilla 组件 props 与运行时结果不变，只同步精确返回类型和必要的内部缩窄
- 双语明细表文档、Table README、changelog 与 schema registry 需补充变体 schema/type，并说明何时使用窄 schema 或统一 schema；Core composite 概念页同步 union registration 契约
- 持久化 JSON 不新增字段，不需要数据迁移或兼容别名
- Table 与 Core 不同 release group；Table alpha.1 修订版发布前，必须依赖已包含 union composite contract 的 Core 版本

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / 根 IR、Structure 与 authoring contract；协作涉及 Drawing Complete / Composition 的 composite registration contract
- 解决的问题：让每个基础 Table structure 的根字段约束可由 schema、TypeScript、JSON Schema 与 LLM 直接理解，同时保留统一 pipeline
- 主责包与协作包：`@retikz/table` 主责 Table schema、派生类型和 helper；`@retikz/core` 主责通用 composite union registration；React / Vanilla 只等价暴露；docs 展示公开契约
- 是否可由现有能力组合：Table 复用现有 structure、DataReference、layout 与 lowering；当前 Core 只能注册单 object schema，无法直接组合 canonical union
- 是否需要下沉到 data / core / math：需要把“共同 namespace/type 的 object union 可注册为一个 composite”下沉到 Core contract；不修改 Data、Math、Core IR、Scene 或 renderer
- 内部表达链路：精确 Table spec schema → `TableSchema` union → Core `defineComposite()` 提取共同 key → 现有 structure registry / normalize → presentation / layout / lowering
- 外部扩展链路：custom structure 继续通过 `defineTableStructure()`、自定义精确 structure schema、registry 与统一 pipeline；根 schema 只校验可选 DataReference，provider 在 `build(context.data)` 中 fail-loud 检查自身数据要求；本 ADR 不为每个 custom provider 生成新的 canonical 根 schema
- pipeline / lowering 与下游消费：Core 仍只注册 `table.table` + `TableSchema`；union 的所有 object 分支声明同一 key，所有变体进入同一 `normalizeTableStructure()` 与后续阶段
- React / Vanilla adapter 等价性：窄 sugar 使用对应精确 helper，通用入口使用 `IRTable`；两边不拥有另一套 schema
- provenance / lineage / locator 是否适用：不改变现有 id、data reference、Cell source、manifest 或 locator 语义
- 不支持边界与本轮结论：扩展 Table schema 契约的精确度，并先下沉补齐 Core 的通用 union composite registration；不增加 Tier 3、平行 IR、根 type 或自定义 provider 专属根 union

## 不在本 ADR 范围

- 实现 pivot、matrix、group、hierarchy、summary 或 transpose
- 修改 structure Definition / registry、SemanticTableModel、layout、presentation、lowering 或 manifest 语义
- 为每个用户自定义 structure 动态改写 canonical `TableSchema`
- 引入 TypeScript interface 作为第二份 IR 真源
- 新增根级 `kind` / `variant` 字段或改变持久化 JSON
- 接受 namespace/type 不一致、非 object option 或经过任意 wrapper 后无法静态提取 registry key 的 composite union

## 验证结果

- Core、Table、Table React、Table Vanilla 的 `test:changed` 全部通过，覆盖 object-union registration、精确 schema、authoring helper、adapter parity 与统一 lowering
- 四个受影响包的 `tsc --noEmit` 通过；定向 ESLint 与 Prettier 通过
- 对 Core 与 Table 的补充边界测试覆盖 wrapper / nested union 拒绝、空 literal、JSON Schema 三分支、manual 不可满足 data schema、保留 kind 与错误 path；补充测试运行后已删除
- docs 完整性检查、docs `tsc --noEmit`、生产构建与中英文页面检查通过；三个 schema 均能渲染且无 `Unknown schema` 或控制台告警

## 遗留风险

- `IRTable` 是共享顶层 key 的普通 union，调用方不能依赖 `structure.kind` 自动缩窄外层类型；单类调用方应持有精确变体
- custom structure 的 data 必需性仍由 provider `build(context.data)` 在运行时约束，不进入 canonical 根 union
- Table 发布修订版前需依赖已包含 object-union composite contract 的 Core 版本
