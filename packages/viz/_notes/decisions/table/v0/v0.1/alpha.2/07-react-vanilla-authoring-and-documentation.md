# ADR-07：React / Vanilla authoring 等价与双语文档闭环

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [layout transaction 与迁移](./06-layout-lowering-manifest-and-migration.md) · [Kernel contextual composite ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/01-contextual-composite-layout.md) · [Cell box、span 与 alignment](./03-cell-box-span-and-alignment.md) · [内容 fit / overflow / wrap](./04-content-fit-overflow-and-wrap.md) · [alpha.1 React composition API](../alpha.1/08-table-react-composition-api.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景

alpha.1 已提供 `<Table>`、`<DetailTable>`、`<ManualTable>` 与 `<DetailColumn>` / `<Row>` / `<Cell>` marker，并保证完整 props 与 JSX sugar 归一为同一 TableSpec。alpha.2 会原子迁移 track、Cell layout、span、fit / overflow、border、manifest 与 Core layout transaction；两套 adapter 必须同时表达新合同，不能让 React children、plain props、Vanilla SSR 或 embedded 入口各自形成局部语义。

当前 React `TableCommonProps` 只挑选了 `LayoutProps` 的 width、height、className、style 与 renderer，导致 viewBox、handlers、动画、Core definitions、compile options 等通用宿主能力无法挂载到 Table 根组件。直接改成完整 `LayoutProps` 仍不够：当前 `<Layout ir>` 会忽略 ScopeStyle props，`embeddables` 只参与 children normalization，且 `LayoutProps` 没有 Vanilla `compile` 对应的完整 Core options/custom measurer 入口。

当前 Vanilla `renderTable()` 又把 `composites` 放在顶层，而 Kernel Vanilla 已把 Core compile 能力统一放进 `RenderToStringOptions.compile`；同时 artifact 模式仍会额外调用一次 `lowerTableWithArtifacts()`。

本 ADR 不新增另一层 Table DSL。具体根组件继续拥有完整属性，marker 只是等价 authoring 优化；adapter 只负责规范化输入、接入宿主和观察同次 compile artifact，不复制 Table layout、border 或 lowering。

Data Transform 仍由 `@retikz/data` 主责，并按 v0.1 roadmap 在 alpha.4 的 Data 接入中冻结。alpha.2 不暴露 `<Transform>`、`DetailTransform` 或占位 prop，避免在 Data contract 未就绪时建立 adapter 私有语义。

## 决策：三个根入口、窄 marker grammar 与完整宿主接线

### 公开组件与命名

`@retikz/table-react` 保持以下公开组件：

```ts
Table;
DetailTable;
DetailColumn;
ManualTable;
Row;
Cell;
```

命名规则固定为：

- `DetailXxx` 只表示明细表专属概念；alpha.2 只有 `DetailTable` 与 `DetailColumn`
- `Table`、`Row`、`Cell` 等无表型前缀的名称表示 Table 通用概念
- 通用命名不代表所有根组件必须接受该 marker；每个表型仍拥有自己的窄 children grammar
- `ManualTable` 是显式 Structure authoring 入口，不由此命名规则扩张为新的业务表型

后续 Group / Pivot 表型若需要专属列、分组或轴组件，使用 `GroupXxx` / `PivotXxx`；只有语义、props 与规范化结果确实跨表型一致时才复用通用 marker。

### 完整 props 是真源，marker 只是 authoring 优化

三个根组件保留完整 props：

- `<Table spec>` 接受任意精确 `IRTableSpec` 与完整 runtime/host props，不收集结构 children
- `<DetailTable>` 接受完整 `columns` props或 `<DetailColumn>` children，二者互斥
- `<ManualTable>` 接受完整 `cells` / `rowKinds` props或 `<Row>/<Cell>` children，二者互斥

所有 alpha.2 track、Cell layout、span、fit / overflow 与 border 字段都必须能通过根 props/plain input 完整表达。marker props 直接派生自同一 `@retikz/table` 公开输入：

```ts
type DetailColumnProps = TableDetailColumnInput;

type CellSharedProps = Omit<IRTableCell, 'address' | 'payload'>;
```

因此 `DetailColumn` 自动获得 detail `headerLayout` / `bodyLayout`，`Cell` 自动获得通用 `span` / `layout`；React 不手写平行字段表。完整 props 与 marker authoring 的规范化结果必须深等，包含显式 `undefined` 的归一规则、默认值、meta、roles、source 与所有 alpha.2 layout 字段。

Manual children builder 按 ADR-03 使用 canonical occupancy matrix：

1. 按 Row 与 Cell 的 JSX 声明顺序遍历
2. 每个 Cell 放入当前行最小未占 column
3. 读取 Cell 的 row/column span 后立即预占覆盖的未来行列槽位
4. 输出显式 address + span 的 `IRTableCell`
5. 越界、重叠、跨不同 `TableRowKind`、Row 数量不符或找不到可用槽位时 fail-loud

需要任意稀疏地址、非行序输入或显式空洞时继续使用完整 `cells` props。builder 不发明 placeholder Cell，不从 children 推断 rows / columns，也不重复 Table normalize 的 span 合法性算法。

### React 完整宿主 props

共享 props 改为完整复用 Kernel React 宿主合同：

```ts
type TableCommonProps = Omit<LayoutProps, 'ir' | 'children' | 'embeddables' | 'onCompileResult'> &
  LowerTablesOptions & {
    onManifest?: (manifest: TableLayoutManifest) => void;
  };
```

`LayoutProps.composites` 已包含 Cell 内嵌 Tier 2 definitions，不再在 Table 侧重复声明同名字段。`ir` 与 `children` 由三个 Table 根入口重新定义；`embeddables` 只对 Layout children authoring 有意义。`onCompileResult` 是 adapter-to-adapter 低层 bridge，由 Table runtime 内部占用，不能与公开 `onManifest` 并列暴露。除此以外 Table 不挑选、复制或重新命名 Layout host props；新增 Kernel host prop 会自动进入 standalone Table 根组件。

运行时不能从 TypeScript 类型枚举 key，因此 adapter 维护一个仅用于分拣与诊断的 `TABLE_LAYOUT_HOST_PROP_KEYS` tuple，并用双向 `AssertEqual` 类型测试保证它与 `keyof Omit<LayoutProps, 'ir' | 'children' | 'embeddables' | 'onCompileResult' | 'composites'>` 完全相等。新增 Kernel host prop若未同步tuple，`tsc --noEmit`必须失败；不得使用不受类型校验的allowlist静默漏传。

standalone 的 `hostPropsOf()` 只按该 tuple提取Layout host props，`lowerOptionsOf()` 单独提取 Table definitions，`composites` 单独进入 Core environment，`onManifest` 只进入 artifact observer。不得把完整 Table props object盲目spread给`<Layout>`。

#### Kernel React host gate

完整 host props 只有在独立 Kernel React ADR 同时满足以下合同后才能激活：

1. `LayoutProps` 增加与 Vanilla `RenderToStringOptions.compile` 对等的 `compile?: CompileOptions`
2. `compile.measureText`、definitions、precision/padding/labelDistance、warnings、composite depth 与其它 Core options 原样进入本次 compile；省略 custom measurer 时才使用 React browser default
3. 既有 Layout 顶层 compile sugar 与 `compile` 出现同一能力时 fail-loud，不用隐式覆盖顺序合并两套值
4. `Layout` 的 `ir` 模式把显式 `ScopeStyleProps` 规范化为包裹 IR children 的 synthetic Core Scope，使 `color`、`stroke`、`fill`、`strokeWidth`、三种 opacity 与 `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` 和 children 模式具有相同级联语义；本 gate 不新增 transform、clip、zIndex 等容器 props
5. `handlers` 继续按 `ir` mode 的 id registry 接线；synthetic Scope 不改变用户 child id
6. `embeddables` 仍只属于 children normalization，不在 `ir` mode 伪装为有意义
7. `LayoutProps.onCompileResult` 在 commit 后交付同次 `CompileResult` 与 `sourceRootOwners`；callback identity 不触发重新 compile，SSR 不调用

该 Kernel ADR/实现属于 red 上游 gate，不在本 ADR 的产品文件 scope。若上游不满足，Table 不能声明“完整 Layout props”或“custom measurer/options parity”，也不能只把类型交叉后静默忽略行为。

standalone React：

1. 根 props/markers 规范化为 TableSpec
2. Table spec、datasets、`LowerTablesOptions` 与完整 Layout host props 进入同一个 `<Layout>`；ScopeStyle 通过上游 synthetic Scope 真实生效
3. `<Layout>` 通过 ADR-06 的 compile-with-artifacts 合同只 compile 一次
4. Table 内部 `onCompileResult` observer 使用 `sourceRootOwners[0]` 精确选择 typed Table artifact
5. React commit 后 effect 以该 artifact 的 `payload.manifest` 通知 `onManifest`

`onManifest` 不参与 render-phase lowering，不允许触发第二次 presentation、layout、replay 或 compile。

embedded React 的 Table component 仍使用相同 props 类型以支持统一组件 identity，但只允许 Table authoring、datasets、`LowerTablesOptions`、`composites` 与 stable spec id。adapter 按上述 compile-time-checked tuple 检查所有显式非 `undefined` standalone host props；任一命中、传入 `onManifest` 或在 plain JS 中传入 `embeddables` 时，必须在同一个错误中按 tuple 顺序列出不支持的 prop 并提示移动到外层 `<Layout>`，不得静默忽略。embedded manifest 只贡献给宿主级 typed artifact collector，alpha.2 不提供组件局部 observer。

### Typed artifact 根实例选择

公开 `tableId` 继续可选，不能作为 compile 内唯一实例选择器。Core compile-with-artifacts 与 contextual composite context必须为每个输入occurrence分配JSON-safe、compile-local且确定的traversal locator；同一 TableSpec被多次嵌入、匿名根Table、Cell内嵌Table与多个Table同图都获得不同locator。

每个 typed Table artifact 至少携带：

```ts
type TableCompileArtifactPayload = Readonly<{
  tableId?: string;
  manifest: TableLayoutManifest;
}>;

type TableCompileArtifact = CompileArtifact<TableCompileArtifactPayload> &
  Readonly<{
    channel: '@retikz/table/layout-manifest';
  }>;
```

standalone React/Vanilla 在构造单根 Table scene 时，同时保留“根 Table 输入 occurrence”的 locator selector；compile 后只接受 owner 与该 selector 精确相等的一条 artifact：

- `0` 条表示 Table contribution 未执行，fail-loud
- `>1` 条表示 Core artifact identity 破坏，fail-loud
- nested/并列 Table artifacts 保留在宿主 collection，但不能被根 `onManifest` / `artifacts:true` 误选

locator 使用 Kernel ADR 冻结的 `CompositeOccurrenceLocator` 与 `child` / `expansion` / `replay` segment contract，必须由 traversal occurrence 产生，不能使用可缺省的tableId、对象引用、数组返回顺序、module counter或“第一条Table artifact”选择。React/Vanilla/SSR对同一根scene结构必须选择同一owner语义。

### Vanilla 对齐 Kernel options

Vanilla 保持 plain function，不引入 fluent builder。`detailTable()` / `manualTable()` 继续直接委托 framework-neutral create helper；`createTableAdapter()` / `embedTable()` 负责 embedded composition；`renderTable()` 负责一次性 SSR。

standalone options 对齐 Kernel Vanilla：

```ts
type RenderTableCommonOptions = Pick<RenderToStringOptions, 'output' | 'compile'> & {
  data?: ExternalDatasets;
  lowerOptions?: LowerTablesOptions;
};
```

breaking 规则：

- 删除 standalone 顶层 `composites`
- 额外 Core/Tier 2 definitions 使用 `compile.composites`
- Table 自身 composite definitions 由 `lowerTables(data, lowerOptions)` 注入同一次 compile，并与 `compile` 中其它 Core options 原样合并
- 重复 composite key、缺失 definition 或 environment 不一致沿 Core 公共诊断 fail-loud

`renderTable(spec, { artifacts:true })` 通过 ADR-06 的 compile-with-artifacts 取得同次 Scene 与 manifest；`artifacts:false` 只丢弃 sidecar，不改变 transaction。不得在 `compileToScene` 后再次 direct lowering。

`TableEmbedProps.composites` 保留。它表示单个 embedded Table 对宿主贡献的额外 Tier 2 definitions，与 standalone `renderTable` 的 host compile options 不是同一层；adapter 仍必须把它们合并进宿主同一个 Core environment，不能独立 compile。

### React / Vanilla 等价边界

对相同的 TableSpec、datasets、Table definitions 与 Core environment：

- `<Table spec>` 与 `renderTable(spec)` 产生等价 Table transaction、Core compile output、Scene geometry 与 manifest
- `DetailTable columns`、`DetailColumn` children 与 `detailTable(input)` 产生等价精确 detail spec
- `ManualTable cells`、occupancy-based `Row/Cell` children 与 `manualTable(input)` 产生等价精确 manual spec
- custom Structure、Presentation、nested composite、measurer/capability 与 Core options 在 intrinsic、constrained、replay、Scene 和 manifest 中同源
- SVG / Canvas 的 renderer 差异不能改变 Table allocation、span、fit、clip、border 或 manifest

React-only marker 不需要在 Vanilla 镜像成 builder；parity 比较的是规范化 TableSpec、runtime environment 与可观察产物，不是表面语法逐字符一致。

### 双语文档闭环

不新增导航层级，只更新现有信息架构：

| 路由                                   | alpha.2 职责                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `/viz/table`                           | Table 能力入口、明细表与模型/Reference 导航                                   |
| `/viz/table/model`                     | 通用 Table / Manual Structure、Cell、occupancy、layout transaction 与边界     |
| `/viz/table/detail`                    | DetailTable 完整 props、DetailColumn sugar、layout/border 示例与 Vanilla 对等 |
| `/viz/table/reference`                 | API Reference 分组职责、三张契约/运行时卡片与 alpha.2 能力摘要                |
| `/viz/table/reference/contract-table`  | 共享 Table root、Cell、track、fit/overflow、border schema                     |
| `/viz/table/reference/contract-detail` | 精确 DetailTable schema、detail column header/body layout                     |
| `/viz/table/reference/runtime`         | React/Vanilla host API、单次 transaction、artifact、manifest 与 breaking 迁移 |

文档合同：

- zh 是 source of truth，en 同步；正文、API 表、demo、SourceLinks 与 schema registry 同改
- Zod `.describe(...)` 保持英文 IR contract；中文 `<ZodSchema>`/reference registry 必须为公开 schema 与字段提供中文说明
- `schema-registry.ts` 必须登记 ADR-02～05 公开的 track variants/union/override、Cell span/layout、fit/overflow 与 border variants/union/Cell sides/Table defaults schemas，并统一指向 `contract-table`
- `contract-table/index.zh.mdx` 为上述每个 `<ZodSchema>` 提供中文 `description` 与完整字段 `descriptions`；英文页继续消费 schema 的英文 `.describe(...)`
- `api-values/constants.ts` 必须登记 `TableTrackSizeKind`、`TableHorizontalAlignment`、`TableVerticalAlignment`、`TableCellFit`、`TableCellOverflow`、`TableBorderKind`、`TableBorderMode`，值顺序与 `@retikz/table` 公开 const object enum 一致
- API 表从公开 package entry 核对真实标识符，完整宿主 props 链接到 Kernel React/Vanilla 权威合同，不在每个 Table 页面手抄全部继承字段
- demo 同时证明完整 props 与 marker 等价、auto/wrap/span/fit/clip/border 可观察，以及 React/Vanilla artifact 同源
- runtime 页记录 breaking migration：alpha.1 track fields 删除、manifest `bounds` 删除、Vanilla 顶层 `composites` 移至 `compile.composites`
- 不新增旧 `/viz/components/table` 重定向或兼容页面

理由：

1. 完整 props 让程序化构造、持久化、LLM、React JSX 与 Vanilla 共用一套能力真源
2. 窄 marker grammar 只优化声明结构，不把 Table 领域语义锁进 ReactNode
3. 直接复用 Kernel host options 避免 adapter 每次新增宿主能力都漏同步
4. 单次 compile artifact 消除渲染与 manifest 的 environment、测量次数和几何漂移
5. 沿用现有 docs 信息架构能按“契约—表型—运行时”解释能力，无需为 Table 复制 Plot 的 GoG / Chart 双层导航

被否决方案：

- 不把所有能力塞进单一 `<Table type="...">` children grammar：不同表型的 schema 与互斥规则会集中到宽 builder
- 不让 marker 成为唯一入口：这会损害 JSON 持久化、LLM 生成、Vanilla 与程序化构造
- 不复制一份 Table 专属 Layout props：它会与 Kernel host contract 漂移
- 不保留 Vanilla 顶层 `composites` alias：0.x 阶段按正确分层 breaking 迁移，不建立双入口
- 不为 embedded Table 静默丢弃 host props：可接受但无效果的 API 比 fail-loud 更难诊断

## 待决策点 🔻

Kernel v0.5-alpha.2 ADR-01 已冻结：

- `CompileResult`、`CompileArtifact` 与 `CompositeOccurrenceLocator`
- React `LayoutCompileObservation`、`LayoutCompileObserver`、`sourceRootOwners` 与 `LayoutProps.onCompileResult`
- `LayoutProps.compile` 及顶层 compile sugar 的逐字段冲突/默认合并规则

这些合同不得改变 ScopeStyle 在 ir mode 生效、handlers 保留、embeddables 排除、Table 内部占用 `onCompileResult`、occurrence 精确选择、embedded fail-loud、Vanilla `compile` 归属、adapter 单次 compile 或 manifest 回调时序。

## DSL 表面

完整 props 与 detail marker 等价：

```tsx
<DetailTable
  id="scores"
  dataRef="scores"
  data={rows}
  columns={[
    {
      id: 'score',
      field: 'score',
      header: '分数',
      bodyLayout: { wrap: true, overflow: 'clip' },
    },
  ]}
  layout={{ columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } }}
  viewBox={{ x: 0, y: 0, width: 320, height: 180 }}
/>

<DetailTable
  id="scores"
  dataRef="scores"
  data={rows}
  layout={{ columnSize: { kind: 'auto' }, rowSize: { kind: 'auto' } }}
  viewBox={{ x: 0, y: 0, width: 320, height: 180 }}
>
  <DetailColumn
    id="score"
    field="score"
    header="分数"
    bodyLayout={{ wrap: true, overflow: 'clip' }}
  />
</DetailTable>
```

span-aware manual marker：

```tsx
<ManualTable rows={2} columns={3}>
  <Row kind="columnHeader">
    <Cell span={{ columns: 2 }}>Identity</Cell>
    <Cell>Score</Cell>
  </Row>
  <Row>
    <Cell>Alice</Cell>
    <Cell>Team A</Cell>
    <Cell value={95} />
  </Row>
</ManualTable>
```

Vanilla standalone compile options：

```ts
const result = renderTable(spec, {
  data,
  compile: {
    composites: [customCellComposite],
    shapes: [customShape],
  },
  lowerOptions: {
    structureDefinitions,
    presentationDefinitions,
  },
  artifacts: true,
});

result.svg;
result.manifest;
```

## 测试设计

`@retikz/table-react`、`@retikz/table-vanilla` 与 docs integration tests 覆盖：

- Detail columns props与`DetailColumn` children 在 alpha.2 完整字段下深等
- Manual cells props与span-aware occupancy `Row/Cell` children深等；覆盖未来行预占、空洞与 row kind 失败
- `TableCommonProps` 排除 ir/children/embeddables/onCompileResult 后完整复用 `LayoutProps`，ScopeStyle/handlers/animation/compile options真实进入standalone Layout
- embedded 对 standalone-only host props 与 `onManifest` fail-loud，`composites` 仍进入宿主 contribution
- React `onManifest` 与 Vanilla `artifacts:true` 不增加 layout/compile 次数，均来自同次 typed artifact
- React `sourceRootOwners` 在 synthetic ScopeStyle 下仍匹配根 Table；observer identity变化不重compile，SSR不触发callback
- 匿名/显式 id 根、nested Table 与同次多 Table 通过 occurrence locator精确选择根artifact，0/多候选fail-loud
- Vanilla 顶层 `composites` 类型与运行时精确拒绝，`compile.composites` 与其它 Core options 同源
- React / Vanilla / SSR / embedded 对 custom Structure/Presentation/composite/measurer/options 产生等价 spec、Scene geometry 与 manifest
- 现有七个路由的 zh/en、API、schema registry、demo、SourceLinks 与 breaking migration 一致

详细行为矩阵见 ignored `notes/plans/table-alpha2-adapters-docs/TEST_CONTRACT.md`。

## 影响

- ⚠️ BREAKING：React `TableCommonProps` 从五个挑选字段升级为除 `ir` / `children` / `embeddables` / `onCompileResult` 外的完整 `LayoutProps`
- ⚠️ BREAKING：embedded Table 对传入的 standalone host props 从静默忽略改为 fail-loud
- ⚠️ BREAKING：Vanilla `renderTable` 删除顶层 `composites`，迁移到 `compile.composites`
- React/Vanilla artifact 从双 lowering 切换为 ADR-06 同次 compile typed artifact
- marker 不新增领域语义；alpha.2 字段继续由 `@retikz/table` schema/plain input 拥有
- apps/docs 沿用现有路由，更新 zh/en、API、demo、schema registry 与迁移说明
- 不新增 Data Transform API；alpha.4 再根据 Data contract 设计

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / adapter authoring 与端到端文档
- 解决的问题：让 alpha.2 完整 Table contract 在 React、Vanilla、SSR、embedded 与 docs 中等价可用
- 主责包与协作包：Table 主责 schema/normalization/layout/artifact；React/Vanilla 主责 authoring/host 接线；Core 主责 compile environment；docs 主责公开说明
- 是否可由现有能力组合：marker 组合现有 plain input；完整 host props 组合 Kernel contracts；不新增 Table 领域底座
- 是否需要下沉到 data / core / math：typed artifact/compile-with-artifacts 下沉 Core；Data Transform 延期 alpha.4；不修改 Math
- 内部表达链路：props/plain input/markers → 精确 TableSpec → ADR-06 transaction → Core compile output/Scene + typed manifest artifact
- 外部扩展链路：custom Structure/Presentation 经 `LowerTablesOptions`，custom composite/Core definitions 经公共 host environment；内置与自定义同路
- define-registry 是否适用：本 ADR 不新增开放领域语义，不新增 Definition；只把既有 registries 等价接入 adapters
- pipeline / lowering 与下游消费：adapters 不执行算法，React effect/Vanilla result 从同次 compile artifact 观察 manifest
- React / Vanilla adapter 等价性：同一规范 spec、datasets、definitions 与 Core options产生等价transaction/Scene/manifest
- provenance / lineage / locator 是否适用：manifest identity/source/boxes/borders 同源；完整 locator 延期 alpha.6
- 不支持边界与本轮结论：上移 authoring/host 接线到 adapters，文档闭环；Transform 延期，不建立兼容 alias或第二套 API

## 不在本 ADR 范围

- Data Transform、aggregate、lineage 或 `<Transform>` marker
- GroupTable、PivotTable 或未来表型 grammar
- 新 Table schema、solver、fit、border 或 manifest 语义；这些由 ADR-02～06 所有
- embedded Table 的局部 manifest observer
- builder API、HTML table DOM、CSS layout、编辑、选择与虚拟滚动
- 新 docs 导航层级、旧 components 路由重定向或兼容 alias

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`yellow`。修改公开 React/Vanilla adapter 行为、host props、artifact 观察与 docs；不新增 IR schema，也不需要修改 package root barrel。

### Schema 改动

无新的 Table IR schema。实现必须原子消费 ADR-02～05 已冻结并由 ADR-06 激活的公开 schema；不得在 adapter 定义平行字段、默认值或校验。

### 文件 scope

- `packages/viz/table-react/src/{Table,DetailTable,ManualTable,table-view}.tsx`
- `packages/viz/table-react/src/{table-runtime,embedded-runtime}.ts`
- `packages/viz/table-react/src/components/{build-detail-columns,build-manual-structure,detail-column,row,cell,child-traversal}.{ts,tsx}`
- `packages/viz/table-react/tests/{components,deps-guard}/**`
- `packages/viz/table-vanilla/src/{runtime,spec,adapter}/**`
- `packages/viz/table-vanilla/tests/{runtime,spec,adapter,deps-guard}/**`
- ADR-06/07 所需的 Kernel artifact/occurrence locator、`LayoutProps.compile`、`onCompileResult` bridge 与 ir-mode ScopeStyle 改动由独立 Kernel ADR 所有，不进入本 ADR 产品 scope
- `apps/docs/src/modules/docs/contents/viz/table/**`
- `apps/docs/src/modules/docs/data/viz.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- `apps/docs/src/modules/docs/components/mdx-content/zod-schema/schema-registry.ts`
- `apps/docs/src/modules/docs/components/mdx-content/api-values/constants.ts`
- `packages/viz/table-react/README.md`、`packages/viz/table-vanilla/README.md`

不修改 `packages/viz/table-react/src/index.ts` 或 `packages/viz/table-vanilla/src/index.ts`；现有 `export *` 已覆盖公共类型与组件。若实现发现必须新增 package-root export 或改其它 docs 路由，回 ADR 复审。

### 测试象限

**Happy path（≥ 3）**：

- `Detail 完整输入等价`：columns props 与 DetailColumn children → 精确 spec 深等，保留 header/body layout
- `Manual occupancy 等价`：addressed cells props 与 Row/Cell spans → 精确 spec 深等
- `React 完整宿主 props`：viewBox、handlers、animation、Core definitions 进入同一个 Layout compile
- `Vanilla compile options`：output + compile + lowerOptions 产生 SVG 与同源 manifest
- `根 artifact occurrence`：匿名根嵌套匿名 Table、显式 id 重复与并列 Table 均精确选择外层 manifest

**边界（≥ 2）**：

- `Fragment/条件空节点`：marker 顺序与 occupancy 保持确定
- `span 预占与显式空洞`：marker 跳过未来已占槽位；任意稀疏输入仍由 cells props 表达
- `embedded composites`：额外 definitions 合并到宿主 environment，不要求 standalone host
- `artifacts false`：只丢 sidecar，Scene/compile 次数与 artifacts true 等价

**错误路径（≥ 2）**：

- `embedded host prop 拒绝`：任一 standalone-only Layout prop / onManifest / plain JS embeddables fail-loud 并列出字段
- `marker occupancy 失败`：越界、重叠、跨 row kind、Row 数量不符或无可用槽位精确诊断
- `Vanilla 旧 composites 拒绝`：顶层字段在类型与运行时均失败，迁移指向 compile.composites
- `Core environment 不同源`：缺失 artifact/layout capability 或 duplicate definitions fail-loud，不退回二次 lowering
- `根 artifact 候选错误`：owner locator 匹配 0 条或多条时 fail-loud，不按 id/顺序猜测

**交互（≥ 2）**：

- `custom 全链路`：Structure × Presentation × composite/measurer/options 在 React/Vanilla/SSR/embedded 等价
- `ScopeStyle × handlers × compile`：synthetic Scope、事件 id 与 custom measurer/options 在同次 React compile 生效
- `span × wrap × fit × clip × border`：props/marker 两路产生等价 Core compile output、Scene 与 manifest
- `observer × 单次 transaction`：React callback 与 Vanilla artifact 不增加 presentation/layout/replay 次数
- `docs × public surface`：zh/en API、schema、demo 与实际 exports/defaults/breaking migration 对账

### 依赖的现有元素

- alpha.1 ADR-08 与现有 `DetailColumn` / `Row` / `Cell`—— 保留窄 marker 与完整 props原则
- ADR-03 occupancy matrix、span 与 row-kind 约束—— 替换 alpha.1 连续 column addressing
- ADR-06 transaction、typed artifact、manifest 与 breaking migration—— adapter 单次 compile 硬依赖
- `LayoutProps`（`@retikz/react`）—— React host props 唯一真源
- `RenderToStringOptions`（`@retikz/vanilla`）—— Vanilla output/compile options 唯一真源
- `createDetailTableSpec()` / `createManualTableSpec()`—— props/marker/plain helper 共用规范化入口
- `createTableRuntimeContribution()`—— embedded Table definitions/datasets/composites 的统一 contribution
