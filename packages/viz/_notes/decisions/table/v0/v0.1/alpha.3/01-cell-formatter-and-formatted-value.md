# ADR-01：Cell Formatter Definition 与格式化值阶段

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.1 Cell presentation](../alpha.1/03-cell-presentation.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

alpha.2 的 value Cell 直接把 Data scalar 交给 presentation。内置 `text` 只执行 `null → ''` 和其余值的 `String(value)`，无法把数值、百分比、布尔值或缺失值转换为面向读者的展示值。把格式化塞进每个 presentation 会让同一数值规则在 text、badge、未来 data bar 等内容中重复。

Data 的 field format 负责把外部输入解析为规范数据值，不负责展示格式。当前 Table detail normalization 尚未接入 Data format registry：它从 external row 读取字段后，只以 `ScalarValueSchema` 收窄并写入 `SemanticTableCell.payload.value`。

因此本 ADR 的 `rawValue` 精确定义为“formatter 前、已经进入 SemanticTableModel 的 JSON scalar”，不是未经校验的外部值，也不承诺已经执行 Data model 的 field format。Table formatter 禁止代替 Data parsing：例如 external row 中的 `"12.5"` 不会因为 Data model 声明 `number-string` 就自动变成 number，内置 `number` formatter会按类型失败。Table 接入 Data normalization / formatDefinitions 需要独立 ADR 或后续 milestone，并保持 Data 主责。

Formatter 必须保持 JSON-safe authoring，同时允许内置与自定义实现经过同一 Definition / registry。默认路径还必须与 alpha.2 行为兼容：省略 formatter 时，原 scalar 原样进入现有 `text` presentation。

## 决策：在 presentation 前增加独立的 formatted value 阶段

value Cell 增加可选 formatter 引用：

```ts
type IRTableFormatterRef = {
  name: string;
  options?: IRJsonObject;
};

type IRTableCellValuePayload = {
  kind: 'value';
  value: IRDataScalarValue;
  formatter?: IRTableFormatterRef;
  presentation?: IRTablePresentationRef;
};
```

同一字段同步进入 manual value Cell 与 detail column：

```ts
type IRTableDetailColumn = {
  // existing fields
  formatter?: IRTableFormatterRef;
  presentation?: IRTablePresentationRef;
};
```

`formatter` 省略时使用内置 `identity`。引用名只在 schema 校验非空与 JSON 形态；未注册名称、options 不合法和 provider 产物不合法均在 presentation pipeline fail-loud。

### 共享 Cell 上下文

Formatter 使用以下只读上下文；ADR-02 再把同一 context 接入 Presentation。它不暴露 dataset row、pipeline mutable state、renderer 或 compile context：

```ts
type TableCellContext = Readonly<{
  cellId: string;
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  location: TableCellLocationValue;
  roles: ReadonlyArray<TableCellRoleValue>;
  source?: TableCellSource;
}>;
```

`source` 只复用 canonical model 已有的最小 runtime identity；formatter 不能再次读取外部数据，也不能改写来源。

### Formatter Definition

```ts
type CellFormatterInput = Readonly<{
  value: IRDataScalarValue;
  context: TableCellContext;
}>;

type CellFormatterDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  name: string;
  optionsSchema: ZodType<TOptions>;
  format: (input: CellFormatterInput, options: TOptions) => IRDataScalarValue;
};

const defineCellFormatter = <TOptions extends IRJsonObject>(
  definition: CellFormatterDefinition<TOptions>,
): CellFormatterDefinition<TOptions> => definition;
```

异构 `AnyCellFormatterDefinition` 沿用 presentation 的 `ZodType + never` 收窄方式。`resolveCellFormatterRegistry()` 先注册内置项，再注册 custom definitions；空名称、内置冲突与重复 custom name 都 fail-loud。pipeline 只消费 resolver 返回的 registry，不维护内置分支。

每次调用固定执行：

1. 解析 formatter ref 与 options JSON object
2. 由对应 `optionsSchema` 精确解析，并再次验证 schema transform / default 产物仍是 JSON object
3. 调用 definition
4. 用 Data `ScalarValueSchema` 重新解析返回值，得到 detached scalar
5. 以 `table: formatter "<name>" for cell "<cellId>"` 包装诊断

Formatter 只返回 JSON scalar。任意 `IRChild` 仍由 Presentation 产生；函数、Date、class、数组、对象或 `undefined` 均被拒绝。

### 内置 formatter

alpha.3 提供三个最小内置项：

- `identity`：strict empty options，原样返回 scalar；为省略 formatter 的默认项
- `number`：接受 `{ specifier?: string; nullText?: string }`；非 null 输入必须是 number，使用私有固定 d3 locale 的 `formatLocale(...).format(specifier)`，`specifier` 省略为 `~g`，null 在未提供 `nullText` 时保持 null
- `boolean`：接受 `{ trueText?: string; falseText?: string; nullText?: string }`；非 null 输入必须是 boolean，否则 fail-loud，不做 truthy coercion；默认分别为 `true`、`false`，null 在未提供 `nullText` 时保持 null

number formatter 的固定 locale definition 为：

```ts
{
  decimal: '.',
  thousands: ',',
  grouping: [3],
  currency: ['$', ''],
  percent: '%',
  minus: '−',
  nan: 'NaN',
}
```

实现不得调用或读取 `formatDefaultLocale()`，也不得复用 d3 module-level default `format()`；进程内其它代码修改 d3 default locale 不影响 Table 输出。

日期、货币与 locale-sensitive formatter 不在本 ADR 中。它们需要显式 locale / timezone 与 temporal 输入合同，不能依赖宿主默认 locale 或 `Date` 对象。

### FormattedTableModel 与阶段接口

格式化不修改 `SemanticTableModel`，而是产生同 identity、同顺序的只读中间模型：

```ts
type FormattedTableCell =
  | {
      kind: 'value';
      cellId: string;
      rawValue: IRDataScalarValue;
      value: IRDataScalarValue;
      formatterName: string;
    }
  | {
      kind: 'content';
      cellId: string;
      content: IRChild;
    };

type FormattedTableModel = Readonly<{
  semantic: SemanticTableModel;
  cells: ReadonlyArray<FormattedTableCell>;
}>;
```

content Cell 仍通过 Core `ChildSchema` / JSON-safe guard 并保持原内容，不接受 formatter。`cells` 与 semantic Cells 必须等长、同序且 `cellId` 一致；根、数组、Cell 与 provider 产物都 detached / recursive frozen。

阶段接口固定为：

```ts
const formatTable = (
  model: SemanticTableModel,
  definitions?: ReadonlyArray<AnyCellFormatterDefinition>,
): FormattedTableModel;

const presentTable = (
  model: FormattedTableModel,
  definitions?: ReadonlyArray<AnyCellPresentationDefinition>,
): PresentedTableModel;
```

在 ADR-01 单独实现完成时，现有 Presentation ABI 暂时保持 `{ value, cellId }`：value Cell 把 formatted `value` 作为 `CellPresentationInput.value`，content Cell直接通过。ADR-02 独占 breaking migration，届时 Presentation 才接收 `rawValue`、formatted `value`、`context` 与 `appearance`。ADR-01 不修改 `contract/presentation/**` 的 callback 类型。

后续规则的 value predicate 与视觉 scale读取 Formatted model 的 `rawValue`，避免展示字符串反向改变条件语义。

## DSL 表面

```ts
const revenue = {
  id: 'revenue',
  field: 'revenue',
  formatter: {
    name: 'number',
    options: { specifier: '$,.2f', nullText: '—' },
  },
};

const availability = {
  value: null,
  formatter: {
    name: 'boolean',
    options: { trueText: 'Available', falseText: 'Unavailable', nullText: 'Unknown' },
  },
};
```

## 测试设计

详细行为矩阵见 ignored 文件 `notes/plans/table-alpha3-design/TEST_CONTRACT-01.md`。长期测试摘要：

- schema 覆盖 formatter ref、manual/detail 两入口、JSON round-trip 与旧 payload 兼容
- registry 覆盖内置/custom 同路、重复 key、未知 key、options 与输出 guard
- formatted model 覆盖 identity、number、boolean、null、content bypass、identity/order/freeze
- direct / React / Vanilla 对同一完整 spec 与 formatter definitions 产生等价 Table transaction；detail column 与 plain manual authoring 由 schema-derived input 自动获得 formatter，ADR-01 覆盖其最小 parity；需要手写 prop union 的 React manual `Cell` 延后 ADR-07

## 影响

- ⚠️ additive public API：新增 formatter schema、Definition / registry 与 `LowerTablesOptions.formatterDefinitions`
- `@retikz/table` 新增 `d3-format` 运行依赖与对应类型开发依赖
- value payload 与 detail column schema 增加 formatter 引用；`TableDetailColumnInput`、React `DetailColumnProps`、framework-neutral / Vanilla detail 与 plain manual inputs 因 schema 派生自动同步，本 ADR 负责验证；React manual `Cell` 的显式 prop union 由 ADR-07 收口
- presentation pipeline 从 `SemanticTableModel` 直接呈现改为先构造 `FormattedTableModel`
- 默认 `identity + text` 保持 alpha.2 的 scalar 显示行为
- `LowerTablesOptions`、Table runtime contribution、React root Table lower-options passthrough 与 Vanilla render lower options 接入 formatter definitions；不让 adapter 执行 formatter

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Presentation
- **解决的问题**：把规范 Data scalar 转换为可复用的展示 scalar，而不把展示规则放进 Data parser 或每个 presentation
- **主责包与协作包**：Table 拥有 formatter；Data 提供 scalar schema；adapters 只暴露 ref 与 definitions
- **是否可由现有能力组合**：现有 presentation registry 可复用模式，但不能独立复用展示值，需要扩展当前域
- **是否需要下沉**：不下沉 Data；Data field format 是输入解析，不是显示格式化
- **内部表达链路**：Semantic JSON scalar → formatter ref → registry → `FormattedTableModel` → 现有 Presentation ABI
- **外部扩展链路**：`defineCellFormatter()` → custom definitions → runtime contribution merge → same dispatch
- **下游执行 / adapter 等价性**：formatted scalar 进入同一 Presentation；React / Vanilla 只透传 spec / definitions，不执行 formatter
- **不支持边界与诊断**：不读取整行数据、不执行 Data field parsing、不返回对象 / child、不依赖 locale 默认值；所有 lookup / options / output 错误带 Cell identity
- **本轮结论**：扩展 Table Presentation 域；不修改 Data parsing 或 Core

## 不在本 ADR 范围

- 日期、货币、locale 与 timezone 预设
- Table 对 Data field format / normalization 的消费；本轮 rawValue 只表示 canonical JSON scalar
- selector / rule 决定 formatter 的级联顺序
- Presentation appearance、条件视觉编码、theme 与 Legend
- content Cell 的内容重写

---

## 实现契约

### Level

`red`：修改 Table public schema、package root public API 与 pipeline 主链。

### Schema 改动

| 文件                          | 操作     | 字段名                                   | 类型                   | 默认值          | describe 中文摘要                 |
| ----------------------------- | -------- | ---------------------------------------- | ---------------------- | --------------- | --------------------------------- |
| `schemas/formatter/schema.ts` | 新增     | `name`                                   | non-empty string       | —               | 已注册 formatter 名称             |
| `schemas/formatter/schema.ts` | 新增     | `options`                                | `JsonObjectSchema?`    | `{}` at runtime | formatter JSON options            |
| `schemas/cell/schema.ts`      | 新增     | `TableCellValuePayloadSchema.formatter`  | `IRTableFormatterRef?` | `identity`      | canonical value payload formatter |
| `schemas/cell/schema.ts`      | 新增     | `ManualTableValueCellSchema.formatter`   | `IRTableFormatterRef?` | `identity`      | manual rich value Cell formatter  |
| `schemas/cell/schema.ts`      | 保持拒绝 | `ManualTableContentCellSchema.formatter` | 不存在                 | —               | direct content 不接受 formatter   |
| `schemas/structure/schema.ts` | 新增     | `formatter`                              | `IRTableFormatterRef?` | `identity`      | detail body formatter             |

schema `.describe(...)` 使用英文；`IRTableFormatterRef` 从 schema 推导。

### 文件 scope

- `packages/viz/table/package.json`
- `packages/viz/table/src/schemas/{formatter,cell,structure,table}/**`
- `packages/viz/table/src/contract/{formatter,model,authoring}/**`
- `packages/viz/table/src/providers/formatter/**`
- `packages/viz/table/src/pipeline/{presentation,contribution}/**`
- `packages/viz/table/src/{schemas,contract,providers,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,formatter,presentation,pipeline,public-api}/**`
- `packages/viz/table-react/src/{Table.tsx,table-runtime.ts,table-view.tsx,embedded-runtime.ts}` 与对应 runtime tests（只接 definitions / root spec passthrough）
- `packages/viz/table-react/tests/**`（schema-derived `DetailColumnProps` formatter type parity；不修改 `DetailColumn` 组件）
- `packages/viz/table-vanilla/src/{adapter,runtime}/**` 与对应 runtime tests（只接 definitions / root spec passthrough）
- `pnpm-lock.yaml`
- alpha.3 对应 docs 文件（由 ADR-07 统一完成）

### 测试象限

**Happy path**

- 省略 formatter 时 identity 保留 string / number / boolean / null
- number 以私有固定 d3 locale 与 specifier 产生确定字符串，外部修改 d3 default locale 后结果不变
- boolean 按 options 产生标签，custom formatter 经同一 registry 工作

**边界**

- nullText 省略时保留 null，显式空字符串仍作为有效输出
- manual、detail header/body 与 custom structure 保持 cellId / source / 顺序
- provider input/output 与模型均不可变

**错误路径**

- 空名、未知名、重复 key、内置覆盖均 fail-loud
- options 含函数、schema transform 产生非 JSON、provider 返回对象 / undefined 均拒绝
- number formatter 收到非 number scalar时带 formatter/cell 前缀报错；Data model format 声明不能替代尚未接入的 Data normalization
- boolean formatter 收到 string / number 时带 formatter/cell 前缀报错，不做 truthy coercion

**交互**

- formatter 与 explicit presentation 串联，旧 Presentation ABI 的 `value` 收到 formatted value并保留 explicit presentation options；raw / formatted / context 同时可见只由 ADR-02 验收
- schema-derived `DetailColumnProps`、framework-neutral / Vanilla detail 与 plain manual inputs 接受相同 formatter ref；React manual `Cell` prop 延后 ADR-07
- React / Vanilla runtime contribution 合并 formatter definitions 并保持冲突诊断
- content Cell 不进入 formatter，非法 formatter 组合由 schema 或 pipeline 拒绝

### 依赖的现有元素

- `IRDataScalarValue` / `ScalarValueSchema`（Data）—— formatter 输入与输出真源
- Data normalization / format registry（Data）——本 ADR 不消费；作为明确延期边界与反例
- `TableCellSource` / `SemanticTableModel`（Table contract）——只读 Cell 上下文
- `CellPresentationDefinition` registry 模式——复用 define / resolver / guarded dispatch 结构
- `deepFreeze()` 与 runtime contribution merge——保持不可变与跨 adapter definition 聚合
