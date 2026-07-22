# ADR-03：Cell payload 与基础 Presentation Definition

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

Cell 是 Table 的语义和布局槽位，不应被建模为 Core Node。另一方面，若 Table 自建 `text | image | plot` 内容 union，就会复制 Core IR 并限制未来 Tier 2 组合。

manual Cell 需要直接容纳任意 Core `IRChild`，detail Cell 则需要把 Data scalar 转成可绘制内容。alpha.1 只提供最小 text presentation，但必须从第一版就让内置与自定义走同一 Definition / registry。

## 决策：Cell 统一使用 value 或直接 IRChild 两类 payload

```ts
type IRTableCellPayload =
  | {
      kind: 'value';
      value: IRDataScalarValue;
      presentation?: IRTablePresentationRef;
    }
  | {
      kind: 'content';
      content: IRChild;
    };

type IRTablePresentationRef = {
  name: string;
  options?: IRJsonObject;
};
```

- `kind: 'content'` 表示作者已提供 Core 内容，Table 只在局部 Cell scope 中放置它
- `kind: 'value'` 表示 Table 通过 presentation registry 把 scalar 转成 `IRChild`
- `presentation` 省略时使用内置 `text`
- `options` 只允许 JSON object；Definition 的 schema 在 pipeline 精确校验
- detail column 的 field value 在 canonical model 中形成 runtime value payload，不把数据值回写进 Table IR

### Presentation Definition

```ts
type CellPresentationDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  name: string;
  optionsSchema: ZodType<TOptions>;
  present: (input: CellPresentationInput, options: TOptions) => IRChild;
};

type AnyCellPresentationDefinition = Omit<CellPresentationDefinition, 'optionsSchema' | 'present'> & {
  optionsSchema: ZodType;
  present: (input: CellPresentationInput, options: never) => IRChild;
};

const defineCellPresentation = <TOptions extends IRJsonObject>(
  definition: CellPresentationDefinition<TOptions>,
): CellPresentationDefinition<TOptions> => definition;
```

alpha.1 的输入合同刻意保持最小并独立于 SemanticTableModel：

```ts
type CellPresentationInput = Readonly<{
  value: IRDataScalarValue;
  cellId: string;
}>;
```

它只暴露 scalar value 与稳定 Cell id，不暴露 pipeline mutable state、renderer 或 ADR-02 的完整模型。location、roles、theme 等上下文需要真实 presentation 需求后再扩展。

`defineCellPresentation()`、`resolveCellPresentationRegistry()` 与 `cellPresentationDefinitionOf()` 分别归 contract / providers。Registry 使用 `Map<string, AnyCellPresentationDefinition>`；内置先注册，用户 key 不能覆盖内置或重复用户 key，`name` 必须是非空字符串。异构 lookup 后先由对应 `optionsSchema` 收窄，再以 `never` 调用宽类型 `present`，不使用 `any`。

### 内置 text

内置 `text` presentation 输出局部原点 `[0, 0]` 的透明 Core Node：

```ts
{
  type: 'node',
  position: [0, 0],
  text: value === null ? '' : String(value),
  stroke: 'none',
  fill: 'none',
  padding: 0,
}
```

alpha.1 不做 number/date/currency formatter。`text` 只执行确定性的 scalar → string；格式化进入 alpha.3。

内置 `text` 的 `optionsSchema` 固定为 `z.strictObject({})`。presentation ref 省略时等价于 `{ name: 'text' }`；`options` 省略时以 `{}` 进入 provider schema，不把 `undefined` 交给 definition。每个 value Cell 的解析顺序固定为：

1. 解析 presentation name 并查 registry
2. 以 `JsonObjectSchema.parse(ref.options ?? {})` 校验原始 options
3. 以 `definition.optionsSchema.parse(rawOptions)` 得到精确 options，再次通过 `JsonObjectSchema.parse()`，拒绝 schema transform/default 产生非 JSON 值
4. 调用 `definition.present(input, parsedOptions as never)`
5. 对返回值依次执行 `JsonObjectSchema.parse()`、`ChildSchema.parse()` 与最终 JSON-safe 校验，得到 detached Core `IRChild`

任一步失败都以 `table: presentation "<name>" for cell "<cellId>"` 为前缀并保留精确字段 path。custom definition 不能把函数、class、`undefined`、非法 Core child 或非 JSON schema transform 带入下游。

### PresentedTableModel

presentation 阶段不改写 canonical model，而是生成与它一一对应的只读内容视图：

```ts
type PresentedTableCell = Readonly<{
  cellId: string;
  content: IRChild;
}>;

type PresentedTableModel = Readonly<{
  semantic: SemanticTableModel;
  cells: ReadonlyArray<PresentedTableCell>;
}>;

const presentTable = (
  model: SemanticTableModel,
  definitions?: ReadonlyArray<AnyCellPresentationDefinition>,
): PresentedTableModel;
```

`semantic` 保留同一个已递归冻结的 canonical model 引用，因此 row/column/cell identity、location、roles、source 与顺序仍以 ADR-02 为真源；`cells` 必须与 `semantic.cells` 长度、顺序和 `cellId` 逐项一致。value payload 经 registry 生成 content，content payload 也重新通过同一 `ChildSchema` / JSON-safe guard。所有 parsed content、Presented Cell、cells 数组和根对象都 detached copy 并递归冻结，不与 provider output 或原始 payload 共享可变对象。

ADR-04 的固定轨道布局只消费 `SemanticTableModel`，不消费或测量 Presented 内容。ADR-05 emit 阶段再把 `PresentedTableModel.cells` 与 `TableLayout.cells` 按顺序和 `cellId` 精确配对；长度或 id 不一致时作为内部合同错误 fail-loud。

直接 `IRChild` 的局部原点由内容作者负责。Table 不改写内容内部坐标，也不按 namespace 特判 Plot 或其它 Tier 2。alpha.1 只验证 nested composite 的 JSON 边界、注册与递归 lowering；基于真实 bounds 的对齐、fit、clip 和 overflow 在 alpha.2 通过通用 `IRChild` constrained layout 闭环。

理由：

1. `IRChild` 是跨 Core / Tier 2 的统一内容边界
2. value 与 content 分开，既支持数据驱动 detail，也支持 manual 任意内容
3. text 从第一版走 registry，后续 image/badge/dataBar/sparkline 不需要改 Cell 根模型

`null` 在内置 text 中固定显示为空字符串；em dash 等缺失值表达由 alpha.3 formatter 决定。Presentation Definition 固定返回一个 `IRChild`；多内容由调用方返回 Core Scope 组合。

## DSL 表面

```ts
const textCell = {
  address: { row: 0, column: 0 },
  payload: { kind: 'value', value: 'Revenue' },
};

const compositeCell = {
  address: { row: 1, column: 1 },
  payload: {
    kind: 'content',
    content: { namespace: 'badge', type: 'status', value: 'ok' },
  },
};
```

## 实现摘要与验证

Cell 已以 `value` / `content` 两类 payload 统一 scalar presentation 与直接 `IRChild`。内置 `text` 和自定义 presentation 通过同一 Definition / registry / runtime guard，`PresentedTableModel` 保留 semantic identity 并隔离 provider output 的可变所有权。

验证覆盖全部 Data scalar、直接 Core child 与 nested composite、自定义 provider、options 与 provider output 的 JSON/Core schema 边界、重复或未注册 key，以及 presented/semantic Cell 的顺序与 identity 对齐。

## 影响

- 新增 Cell payload / presentation-ref schema
- `CellPresentationInput` 不依赖 structure/model，ADR-02 反向消费本 ADR 的 payload contract
- 新增 presentation contract、text provider、registry、`PresentedTableModel` 与 `presentTable` pipeline
- Core `ChildSchema` 作为 content schema 真源；Table 不复制 child union
- alpha.3 在同一 contract 上增加 formatter、更多 presentation、rules 与 theme
- alpha.2 以通用内容 bounds 替代 alpha.1 的局部原点假设，并增加 allocated content box、fit 与 overflow 合同

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Cell Semantics 与 Presentation
- 解决的问题：统一显式 Core 内容和数据驱动 scalar 的 Cell 表达
- 主责包与协作包：Table 主责 presentation；Data 提供 scalar；Core 提供 IRChild
- 是否可由现有能力组合：Core 能表达内容，但不能表达 Cell value → content 策略，需要 Table Definition
- 是否需要下沉：不下沉；通用 Child schema 直接复用 Core
- 内部表达链路：payload → presentation ref → registry → present → PresentedTableModel
- 外部扩展链路：defineCellPresentation → custom definitions → resolver → same dispatch
- pipeline / lowering 与下游消费：ADR-04 只从 SemanticTableModel 计算几何；ADR-05 把 Presented Cell 与 TableLayout 按 cellId 配对后 lowering Core content
- React / Vanilla adapter 等价性：两者只构造同一 payload / presentation ref
- provenance / lineage / locator：presented content 保留 semantic cell id，具体 contribution mapping 进入 ADR-05/alpha.6
- 本轮结论：扩展 Table Presentation；不建立封闭 CellContent registry 或 feature-package 依赖

## 不在本 ADR 范围

- formatter、conditional rule、theme、badge/dataBar/sparkline
- 内容 intrinsic / constrained measurement、bounds-aware alignment、fit、clip 或 overflow
- Cell padding、border 与 span
