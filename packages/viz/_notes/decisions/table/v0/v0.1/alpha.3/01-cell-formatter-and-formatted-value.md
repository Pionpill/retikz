# ADR-01：Cell Formatter Definition 与格式化值阶段

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.1 Cell presentation](../alpha.1/03-cell-presentation.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景与目标

alpha.2 的 value Cell 直接把 Data scalar 交给 presentation。内置 text presentation 只能做基础字符串显示，不能复用数值、百分比、布尔值或缺失值的展示规则；把格式化塞进每个 presentation 又会让 text、badge 和未来 presentation 重复实现同一逻辑。

Data field format 负责把外部输入解析成规范数据值，Table formatter 负责把已经进入 canonical Table model 的 JSON scalar 转换为展示 scalar。两者不能互相替代。本 ADR 的目标是在 presentation 前增加独立、JSON-safe、可扩展且可诊断的格式化能力，并保持省略 formatter 时的既有 scalar 显示语义。

## 决策

### 公开 authoring 契约

value Cell、manual rich value Cell 与 detail column 共享同一 formatter ref：

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

type IRTableDetailColumn = {
  formatter?: IRTableFormatterRef;
  presentation?: IRTablePresentationRef;
};
```

content Cell 不接受 formatter。schema 只验证 ref 的 JSON 形态和非空名称；注册、options 与 provider 输出在 Table pipeline 消费时验证并 fail-loud。

### 共享 Cell context

Formatter 与 ADR-02 的 Presentation 共享同一只读 context：

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

它只暴露 canonical Cell identity 与最小来源，不暴露 raw value、整行 datum、可变 pipeline state、renderer 或 compile context。Formatter 通过 `CellFormatterInput.value` 接收 formatter 前、已经进入 canonical Table model 的 JSON scalar；ADR-02 的 Presentation 才把同一语义命名为 `rawValue`。该值不是未经校验的外部输入，也不承诺已经执行 Data field format。

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

内置与自定义 formatter 使用同一 Definition、registry、options guard、dispatch 和输出 guard。内置项先注册；空名称、重复名称或覆盖内置项均 fail-loud。options schema 的结果仍必须是 JSON object，provider 输出必须重新满足 Data scalar 契约。所有错误稳定携带 formatter name 与 Cell id，并保留原始 cause。

Formatter 只返回 JSON scalar。`IRChild` 仍只由 Presentation 产生；函数、Date、class、数组、对象或 `undefined` 都不是合法 formatter 输出。

### 默认值与内置 formatter

省略 formatter 时运行时解析为 `identity`，但 authoring IR 不物化默认 ref。

- `identity`：只接受空 options，原样返回 string、number、boolean 或 null
- `number`：接受 `specifier?: string` 与 `nullText?: string`；默认 specifier 为 `~g`，非 null 输入必须是 number，不做 numeric-string coercion
- `boolean`：接受 `trueText?`、`falseText?` 与 `nullText?`；非 null 输入必须是 boolean，不做 truthy coercion

`number` 使用固定、私有的 d3 locale：小数点 `.`、千分位 `,`、三位分组、货币前缀 `$`、百分号 `%`、负号 `−`、NaN 文本 `NaN`。它不得读取或修改 d3 的进程级默认 locale，因此相同输入在 direct、React、Vanilla 与 SSR 中产生相同输出。未提供 `nullText` 时 null 保持 null，显式空字符串是有效输出。

日期、货币与 locale-sensitive formatter 需要显式 locale、timezone 与 temporal input contract，不在本 ADR 中隐式依赖宿主环境。

### 用户可观察顺序与兼容性

公开行为顺序为：canonical raw scalar → formatter → presentation。formatter 不修改 canonical model，不重排 Cell，也不处理 content Cell；规则和 visual scale 仍以 raw scalar 为条件语义，展示字符串不能反向改变筛选或 domain。

默认 `identity + text` 与 alpha.2 的 scalar 显示兼容。Table runtime options 增加 formatter definitions；framework-neutral、React、Vanilla 与 SSR 只 author 或透传同一 ref/Definition，不在 adapter 中执行 formatter 或增加 callback shorthand。

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
```

## 功能与包边界

- Table 拥有展示 scalar 的 formatter ref、Definition、registry 消费与诊断
- Data 继续拥有输入解析、field format 与 scalar schema
- Presentation 继续拥有 scalar 到 `IRChild` 的生成
- adapters 只表达同一 IRTable 并传递 definitions

Formatter 是具有算法 dispatch 的开放能力，因此采用 Definition / registry；不建立内置白名单与 custom 旁路。

## 测试策略摘要

- schema 与公开 API 证明 ref、manual/detail authoring、JSON round-trip 和 content exclusion
- Definition/registry 证明内置与 custom 同路、冲突诊断、options/output guard 与 deterministic locale
- pipeline 证明 identity/order/freeze、raw/formatted 分离、content bypass 和 formatter-before-presentation
- adapter parity 证明 direct、React、Vanilla、SSR 消费同一 spec 与 definitions

详细 case、路径、命令和正式证据位于对应 ignored mirror plan 的 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Presentation
- **问题归属**：展示格式化属于 Table，不属于 Data parsing 或 Core drawing
- **内部闭环**：canonical scalar → formatter ref → registry → guarded scalar → Presentation
- **外部扩展**：`defineCellFormatter()` 与内置项经过同一链路
- **下游等价**：adapters 只透传；renderer 只接收 Presentation 产出的 Core IR
- **结论**：扩展 Table Presentation 域，不修改 Data parsing 或 Core

## 被否决方案

- 把格式化并入 Presentation：会让不同 presentation 重复同一数值规则
- 复用 Data field format：混淆输入解析与展示格式化
- 在 adapter 中接受函数 formatter：破坏 JSON IR、SSR 与跨入口等价性
- 让 formatter 返回 `IRChild`：与 Presentation 的单一职责和扩展合同重叠

## 不在本 ADR 范围

- 日期、货币、locale 与 timezone 预设
- Table 对 Data field format / normalization 的消费
- selector / rule 决定 formatter 的级联顺序
- Presentation appearance、条件视觉编码、style tokens 与 Legend
- content Cell 的内容重写
