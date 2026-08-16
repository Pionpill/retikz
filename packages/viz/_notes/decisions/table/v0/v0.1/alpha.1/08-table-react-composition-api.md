# ADR-08：Table React 组合式 authoring API

- 状态：Accepted
- 决策日期：2026-07-22
- 关联：[table v0.1 roadmap](../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md) · [alpha.1 ADR-06](./06-table-bindings.md) · [alpha.1 ADR-07](./07-table-spec-variant-schemas.md)

## 背景

alpha.1 已提供 `<Table>`、`<DetailTable>` 与 `<ManualTable>`，但 detail columns 和 manual Cells 只能作为根 props 数组传入。该表面适合程序化构造，却没有利用 React JSX 对声明顺序、局部配置和嵌套结构的表达力；列数或 Cell 数增加后，单个组件会承载过大的对象字面量。

`@retikz/plot-react` 与 Recharts 都证明了“根组件 + 声明式子组件”适合 React authoring，但 Table 不应复制 Plot 的通用大 builder，也不应把 HTML `<thead>/<tbody>` 结构当成 Table IR。Table 已经拥有 detail/manual 精确 schema 和 framework-neutral 构造函数，React children 只需作为现有输入的 authoring sugar。

本 ADR 补充并局部 supersede alpha.1 ADR-06 中“alpha.1 不提供 JSX Cell children DSL”和“不在范围：`<Cell>` / `<Row>` manual DSL”的结论。ADR-06 的共享 normalization、standalone/embedded runtime、Vanilla plain helper、稳定 identity 与 contribution 合同保持不变。

Data transform 不在本次修订范围。alpha.1 只消费既有 DataReference、external datasets、model 与 scalar value；分组、汇总所需的 Data aggregate / lineage 仍按 v0.1 roadmap 在 alpha.4 接入，是否以及如何提供 Table React Transform API 由后续 Data 消费 ADR 决定。本 ADR 不提前暴露 `<Transform>` 或 `dataTransforms` 占位。

## 决策：具体根组件保留完整 props，并增加小而明确的 children grammar

`@retikz/table-react` 公开以下组件：

```ts
Table;
DetailTable;
DetailColumn;
ManualTable;
Row;
Cell;
```

根组件职责固定为：

- `<Table>` 仍是完整 `IRTable` 的底层入口，只接收 `spec` 与 runtime props，不收集结构 children
- `<DetailTable>` 保留完整 `columns` props authoring，并增加 `<DetailColumn>` children authoring
- `<ManualTable>` 保留完整 `cells` / `rowKinds` props authoring，并增加 `<Row>/<Cell>` children authoring
- 未来表型使用独立根组件和自己的窄 grammar；明细表专属组件使用 `DetailXxx` 命名，跨表型的基础结构概念使用通用名称

通用名称表示概念不绑定某一种业务表型，不表示每个根组件都必须接受该 marker；alpha.1 的 `<Row>/<Cell>` grammar 只由 `<ManualTable>` 收集。

子组件都是同步声明 marker，返回 `null`。根组件在进入 runtime 前收集 props，生成现有 `DetailTableInput` / `ManualTableInput`，再分别调用 `createDetailTableIR()` / `createManualTableIR()`。ReactNode、组件实例和函数不得进入 Table IR。

### DetailTable

`DetailTableProps` 先从既有 detail 输入移除 `columns`，再与以下互斥 authoring 模式组成，避免必填 `columns` 与 children 分支形成不可满足交叉类型：

```ts
type DetailTableRootProps = TableCommonProps &
  Omit<DetailTableInput, 'columns'> & {
    data: Array<ExternalRow>;
  };

type DetailTableColumnPropsMode = {
  columns: Array<TableDetailColumnInput>;
  children?: never;
};

type DetailTableColumnChildrenMode = {
  columns?: never;
  children: ReactNode;
};

type DetailColumnProps = TableDetailColumnInput;

type DetailTableProps = DetailTableRootProps & (DetailTableColumnPropsMode | DetailTableColumnChildrenMode);
```

`id`、`dataRef`、`data`、`model`、`header`、`layout`、`meta`、definitions、renderer 和 manifest props 都继续挂在 `<DetailTable>` 根上；children 只优化 columns 的书写方式。`columns` 与 `<DetailColumn>` 不允许混用，避免出现两套列顺序或覆盖规则。

builder 按 JSX 声明顺序生成 columns，递归穿透 Fragment、数组以及条件渲染产生的 `null` / `undefined` / boolean 空节点；任何其它有效 React element、文本节点或缺少 `<DetailColumn>` 的 children 模式都 fail-loud。最终 column 非空与重复 id 仍由 `@retikz/table` 的现有 schema 统一校验。

### ManualTable

`ManualTableProps` 先从既有 manual 输入移除 `cells` / `rowKinds`，保留 `rows` / `columns` 为显式正整数，不从 JSX 推断或修改表格尺寸，再与以下模式组成 union：

```ts
type ManualTableRootProps = TableCommonProps & Omit<ManualTableInput, 'cells' | 'rowKinds'>;

type ManualTableCellPropsMode = {
  rowKinds?: Array<TableRowKindValue>;
  cells: Array<IRTableCell>;
  children?: never;
};

type ManualTableCellChildrenMode = {
  rowKinds?: never;
  cells?: never;
  children: ReactNode;
};

type RowProps = {
  kind?: TableRowKindValue;
  children?: ReactNode;
};

type ManualTableProps = ManualTableRootProps & (ManualTableCellPropsMode | ManualTableCellChildrenMode);
```

children 模式要求 `<Row>` 数量与 `rows` 相等；`kind` 省略时使用现有 body 默认值。每个 Row 中的 `<Cell>` 按声明顺序从 column `0` 连续寻址，数量不得超过 `columns`；少于 `columns` 表示尾部地址没有显式 Cell，空 Row 合法。需要任意稀疏地址或非行序输入时继续使用完整 `cells` props。

builder 允许 Fragment、数组和条件空节点，但未知 Row child、Row 外的 Cell、Cell 中的 React element 或超出显式 dimensions 都 fail-loud。生成的 rowKinds 与 cells 仍进入 `createManualTableIR()`，地址唯一性、payload、location 和 roles 继续由既有 Table schema / pipeline 校验。

### Cell payload sugar

`<Cell>` 保留 `IRTableCell` 中除 `address` / `payload` 外的字段，并提供三种互斥 payload 输入：

```ts
type CellSharedProps = Omit<IRTableCell, 'address' | 'payload'>;

type CellProps = CellSharedProps &
  (
    | {
        value: IRDataScalarValue;
        presentation?: IRTablePresentationRef;
        content?: never;
        children?: never;
      }
    | { content: IRChild; value?: never; presentation?: never; children?: never }
    | {
        children: IRDataScalarValue;
        presentation?: IRTablePresentationRef;
        value?: never;
        content?: never;
      }
  );
```

`<Cell>姓名</Cell>` 是 `{ kind: 'value', value: '姓名' }` 的 JSX 糖；`value` 仍供变量和程序化值使用，`content` 对应直接 Core / Tier 2 `IRChild`。children 只接受 `@retikz/data` 的 JSON scalar，不接受 React element、Fragment、函数或其它 ReactNode。三种输入同时出现时 fail-loud，不使用隐式优先级；需要直接提供完整 `IRTableCellPayload` 时继续使用根组件的 `cells` props。

两个 runtime resolver 分支必须先把 props mode 或 children mode 规范化成同一个现有 plain input，再分别调用 `createDetailTableIR()` / `createManualTableIR()`；standalone render 与 embedded `contribute()` 不得各自实现 builder。

理由：

1. 根 props 始终完整，组合式 API 只是等价 authoring，不把重要能力锁进 JSX
2. 每个表型拥有窄 grammar，避免一个通用 builder 随 group / pivot 扩展成隐式组合语言
3. 子组件最终折叠为现有 plain input，Table schema、structure、layout、lowering 与 Vanilla 不出现第二套真源
4. `DetailXxx` 与通用结构名直接表达归属，后续新表型无需复用含义不匹配的组件

被否决方案：

- 不采用单一 `<Table type="...">`：它会把不同 schema 的 children 组合和互斥规则集中到一个宽根组件
- 不采用 `<Table.Detail>` 命名空间静态属性：类型声明、文档检索和 tree-shaking 都比独立导出更复杂
- 不采用 HTML-like `<TableHeader>/<TableBody>`：这些名称绑定渲染结构，不能自然覆盖未来 group / pivot 的结构语义
- 不允许任意 ReactNode Cell children：公开 IR 必须保持 JSON-safe，React adapter 不能私造不可持久化的 Cell 内容模型

## DSL 表面

完整 props authoring 保持可用：

```tsx
<DetailTable
  id="scores"
  dataRef="scores"
  data={rows}
  columns={[
    { id: 'name', field: 'name', header: '姓名' },
    { id: 'score', field: 'score', header: '分数' },
  ]}
/>

<ManualTable
  rows={2}
  columns={2}
  rowKinds={['columnHeader', 'body']}
  cells={cells}
/>
```

组合式 authoring 生成等价 spec：

```tsx
<DetailTable id="scores" dataRef="scores" data={rows}>
  <DetailColumn id="name" field="name" header="姓名" />
  <DetailColumn id="score" field="score" header="分数" />
</DetailTable>

<ManualTable rows={2} columns={2}>
  <Row kind="columnHeader">
    <Cell>姓名</Cell>
    <Cell>分数</Cell>
  </Row>
  <Row>
    <Cell>Alice</Cell>
    <Cell value={95} />
  </Row>
</ManualTable>
```

`DetailTable` children 结果必须等于把收集到的 columns 传给 `createDetailTableIR()`；`ManualTable` children 结果必须等于把按 Row 顺序生成的 rowKinds / addressed cells 传给 `createManualTableIR()`。standalone 与 embedded 两条 runtime 路径消费同一个构造结果。

## 测试设计

`packages/viz/table-react/tests/components/authoring.test.tsx` 覆盖：

- detail columns props 与 `<DetailColumn>` 生成等价 spec，并保持 header、model、layout、meta 等根 props
- manual cells props 与 `<Row>/<Cell>` 生成等价 spec，覆盖 scalar children、value、content 与 presentation
- Fragment、数组、条件空节点保持有效声明顺序；空 Row 和尾部未声明 Cell 保持合法
- props / children 双来源、未知组件、无声明的 detail children、Row 数量不符、Cell 超列和非法 ReactNode payload 均 fail-loud
- standalone render、embedded contribution 与现有 manifest/runtime 行为继续消费同一 spec

具体行为、不变量、反例和最低测试层见 ignored `notes/plans/table-react-composition-api/TEST_CONTRACT.md`。

## 最终实现与验证

`@retikz/table-react` 已公开 `DetailColumn`、`Row` 与 `Cell` marker。`DetailTable` 支持完整 `columns` props 或 `DetailColumn` children，`ManualTable` 支持完整 `cells` / `rowKinds` props 或 `Row` / `Cell` children；两组来源均互斥，并通过 `resolveReactTableRuntime()` 进入同一 spec、standalone 与 embedded runtime。

marker traversal 保留 Fragment、数组与条件空节点中的有效声明顺序；Cell scalar children、显式 value 和 content 归一为既有 JSON-safe payload。未知 element、双来源、维度越界和非法 ReactNode 均 fail-loud，ReactNode 本身不进入 Table IR。

验证覆盖 marker 与 props 等价、根属性保留、payload 边界、稀疏 manual 行、错误 grammar、standalone / embedded 同源、manifest 与公开导出。Table React 的 ESLint、TypeScript、build 与 4 个测试文件 / 26 项测试通过；Table 双语 7 页完整性检查和 docs TypeScript 通过。

## 影响

- `DetailTableProps` / `ManualTableProps` 增加互斥 children authoring 分支；现有合法 columns / cells props 调用保持兼容，重复结构来源在类型和运行时均被拒绝
- `@retikz/table-react` 新增 `DetailColumn`、`Row`、`Cell` 公开导出和两个窄 builder；现有三个根组件、embeddable adapter 与 runtime contract 保留
- `@retikz/table` schema、authoring input、structure、layout、lowering、manifest 与 package exports 均不改变
- `@retikz/table-vanilla` 不增加细粒度 helper；plain input 已完整表达同一 IRTable，JSX sugar 对 Vanilla 不适用
- `@retikz/data`、`@retikz/core` 和 renderer 无改动
- `@retikz/table-react` README 与 apps/docs 的明细表、表格模型/API 示例同步展示 props / children 两种写法；zh / en 同步
- alpha.1 ADR-06 的 JSX DSL 非目标由本 ADR supersede，其余绑定与 adapter 决策继续有效

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / React authoring adapter 表面
- 解决的问题：让 React 用户用小而明确的声明组件组织既有 detail/manual 输入，不改变 Table 领域模型
- 主责包与协作包：`@retikz/table` 继续主责 schema、plain authoring 与 pipeline；`@retikz/table-react` 主责 children traversal 和 runtime 接线；Vanilla 维持 plain authoring
- 是否可由现有能力组合：可以；children 完全折叠为现有 `TableDetailColumnInput`、`IRTableCell` 与两个 create helper
- 是否需要下沉到 data / core / math：不需要；不新增数据处理、IR、测量或 renderer 能力
- 内部表达链路：React props / marker children → detail/manual 窄 builder → `createXxxTableIR()` → 现有 runtime / lowering
- 外部扩展链路：custom structure 继续走通用 `<Table spec>` 与 definitions；本 ADR 不为 custom kind 自动生成 React marker
- pipeline / lowering 与下游消费：无变化；standalone 与 embedded 都消费同一个规范 spec
- React / Vanilla adapter 等价性：两侧最终 IRTable 和 lowering 等价；JSX traversal 是 React-only authoring sugar，Vanilla plain input 已具备完整能力，因此无需镜像组件层级
- provenance / lineage / locator 是否适用：不改变现有 Cell source、manifest 或 identity；Data transform / lineage 延期到 roadmap 对应 milestone
- 不支持边界与本轮结论：能力由现有 Table contract 组合表达，新增内容上移到 React adapter，不扩展 Table 能力域

## 不在本 ADR 范围

- `<Transform>`、`dataTransforms` 或 `sourceIndex` 语义调整；是否提供这些 API 由后续 Data 消费 ADR 决定
- Data aggregate 与 lineage；按 v0.1 roadmap 在 alpha.4 接入，但不由本 React authoring ADR 定义
- group、hierarchy、summary、pivot、matrix 等后续表型及其 React grammar
- Table schema、structure Definition、presentation Definition、layout、lowering、manifest 或 Vanilla API 改动
- 任意 ReactNode Cell content、hooks、事件、选择、编辑或异步数据状态
- 从 JSX 推断 rows / columns，或为任意稀疏 manual 地址增加隐式占位规则
- 保留旧别名、命名空间静态 API 或单一 `<Table type>` 兼容层
