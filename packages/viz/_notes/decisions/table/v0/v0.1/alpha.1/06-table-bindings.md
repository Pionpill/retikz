# ADR-06：Table / DetailTable / ManualTable React 与 Vanilla 绑定

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

只有 `@retikz/table` IR 与 lowering，用户仍需手动包 Scene、注册 composites 和调用 renderer。alpha.1 必须同时验证 React 与 Vanilla，避免后续 adapter 为便利性私自发明另一套 Table schema。

Kernel `@retikz/vanilla` 已把主作者模型收敛为 plain spec，并提供 `figure/layer/embed`、`VanillaTier2Adapter`、统一 `mount().update()` 与 `renderToSvgString()`。Table 不能只复制旧的 Plot builder + SSR 入口，否则无法进入 Vanilla 的稳定 identity、layer metadata 与未来增量优化边界。

## 决策：共享 plain authoring，React 分离组件，Vanilla 接入 Tier 2 runtime

### 共享 authoring normalization

`@retikz/table` 的 `contract/authoring/` 拥有 framework-neutral 的两个结构输入与纯构造函数：

```ts
type TableDetailColumnInput = Omit<IRTableDetailColumn, 'header'> & {
  header?: IRTableCellPayload | string;
};

type DetailTableSpecInput = Omit<IRTableSpec, 'namespace' | 'type' | 'data' | 'structure'> & {
  dataRef: string;
  model?: IRDataModel;
  columns: Array<TableDetailColumnInput>;
  header?: boolean;
};

type ManualTableSpecInput = Omit<IRTableSpec, 'namespace' | 'type' | 'data' | 'structure'> & {
  rows: number;
  columns: number;
  rowKinds?: Array<TableRowKindValue>;
  cells: Array<IRTableCell>;
};

const createDetailTableSpec = (input: DetailTableSpecInput): IRTableSpec;
const createManualTableSpec = (input: ManualTableSpecInput): IRTableSpec;
```

- 两个函数都返回无方法、无 runtime data 的 plain `IRTableSpec`，不修改输入对象或数组，并以 `TableSpecSchema.parse()` 返回最终值
- `createDetailTableSpec()` 只负责 string header sugar 与 detail 根字段装配；`header: false` 必须原样保留
- `createManualTableSpec()` 不推断 dimensions、rowKinds、Cell 地址或语义，全部交已有 Table schema / pipeline 校验
- React 与 Vanilla 只收集各自入口输入并调用这两个函数，不复制 header sugar、默认值或错误语义

### React

`@retikz/table-react` 提供一个通用入口与两个结构 sugar，三者最终都归一为同一个 `IRTableSpec + ExternalDatasets + LowerTablesOptions` runtime input：

```tsx
<Table spec={tableSpec} data={{ sales: rows }} composites={lowerPlots({ trend: trendRows })} />

<DetailTable
  id="sales-table"
  dataRef="sales"
  data={rows}
  model={model}
  columns={[
    { id: 'product', field: 'product', header: 'Product' },
    { id: 'revenue', field: 'revenue', header: 'Revenue' },
  ]}
/>

<ManualTable
  id="score-table"
  rows={2}
  columns={2}
  rowKinds={['columnHeader', 'body']}
  cells={[
    { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Name' } },
    { address: { row: 0, column: 1 }, payload: { kind: 'value', value: 'Score' } },
  ]}
/>
```

结构相关 props 固定为：

```ts
type TableCommonProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> &
  LowerTablesOptions & {
    composites?: ReadonlyArray<CompositeDefinition>;
    onManifest?: (manifest: TableLayoutManifest) => void;
  };

type TableProps = TableCommonProps & {
  spec: IRTableSpec;
  data?: ExternalDatasets;
};

type DetailTableProps = TableCommonProps &
  DetailTableSpecInput & {
    data: Array<ExternalRow>;
  };

type ManualTableProps = TableCommonProps & ManualTableSpecInput;
```

`TableCommonProps` 是共享宿主与 lowering props 的命名交集，不拥有结构字段。

- 三个组件共享 `width`、`height`、`className`、`style`、`renderer`、`composites`、`onManifest` 与 Table lowering options；展示 props 透传 `<Layout>`，definition options 进入同一 Table runtime
- `<Table>` 是唯一通用入口：接收 `spec: IRTableSpec` 与可选 `data: ExternalDatasets`；缺省 dataset map 为 `{}`，因此 manual spec 不需要传空对象，detail/custom 缺少所需 dataset 时仍由 Table pipeline fail-loud
- `<DetailTable>` 是 detail-only sugar：在共享 `DetailTableSpecInput` 上增加 runtime `data: Array<ExternalRow>`；string header 与 `header: false` 均由 `createDetailTableSpec()` 统一处理
- `<ManualTable>` 是 manual-only sugar：接收正整数 `rows` / `columns`、可选 `rowKinds`、`cells`、可选 `id` / `layout`；不接收 runtime data，也不推断 header、行列数量或 Cell 地址
- `DetailTableProps` 不暴露 `spec` / manual 字段，`ManualTableProps` 不暴露 `spec` / detail data 字段；三组件分离后不再使用同一组件内的互斥 props union
- custom structure/presentation definitions 仍作为三个组件共享的 lowering options；custom structure 本身只通过通用 `<Table spec>` 进入，不为每个 custom kind 生成 React 组件
- standalone `onManifest` 存在时同步计算 artifact、再由 effect 按序列化内容去重通知；省略时不计算 sidecar
- `composites` 是 nested Tier 2 的宿主逃生舱；standalone 合并为 `[...lowerTables(...), ...composites]` 后交 `<Layout>`，重复 namespace/type 由 Core registry fail-loud
- 三个组件都实现 Tier 2 embeddable adapter，并复用 `resolveReactTableRuntime()` 与同一 render / contribute 实现；`DetailTable` / `ManualTable` 不能只在 render 中返回 `<Table>`，否则宿主在 render 前无法识别 embeddable adapter
- 嵌入态把 `composites` 随 Table runtime envelope 一并聚合进 `makeComposites`
- standalone 允许省略 Table spec id；嵌入 `<Layout>` 时三个组件归一后的 `IRTableSpec.id` 必须是非空且在当前 Layout 内唯一的字符串，并以它作为共享 contribution reference。匿名 embedded Table 直接 fail-loud，不使用数组序号、React key、全局计数器或 WeakMap 补 id
- `onManifest` 仅支持 standalone；嵌入 `<Layout>` 时 embeddable `contribute` 若看到该 prop 必须 fail-loud，并提示宿主对 spec 显式调用 `lowerTableWithArtifacts`
- ReactNode 不进入 Table IR；alpha.1 不提供 JSX Cell children DSL

三个组件通过 `resolveReactTableRuntime()` 归一 runtime input；`DetailTable` / `ManualTable` 分别调用 `createDetailTableSpec()` / `createManualTableSpec()`，组件不拥有 structure、layout 或 lowering 规则。

#### Embedded 多实例聚合

每个 embedded `Table` / `DetailTable` / `ManualTable` 在 datasets 中附加一个以 module-local `Symbol` 标识、唯一 runtime reference 承载的 envelope：

```ts
type EmbeddedTableRuntimeEnvelope = {
  lowerOptions: LowerTablesOptions;
  composites: ReadonlyArray<CompositeDefinition>;
};
```

`makeEmbeddedTableComposites(mergedDatasets)` 逐项剥离 envelope，再按以下规则一次构造整个 Table namespace 的 definitions：

- 普通 dataset 继续使用 Layout 既有规则：同 reference 必须是同一 rows 引用，否则 fail-loud
- structure definitions 按 schema literal kind 合并，presentation definitions 按 name 合并；同 key + 同 definition 对象用 `Object.is` 去重，同 key + 不同对象 fail-loud
- 未来 `LowerTablesOptions` 若增加非 definition 字段，同字段的非 `undefined` 值必须 `Object.is` 相同，否则 fail-loud；不允许后加入的 Table 静默覆盖
- extra composites 按 Table contribution 首次出现顺序、再按各 props 数组顺序合并；同 namespace/type + 同 definition 对象去重，同 key + 不同对象 fail-loud
- 最终返回 `[...lowerTables(cleanDatasets, mergedLowerOptions), ...mergedExtraComposites]`；Table definitions 永远先于 extra composites，结果不受 object key 枚举以外的隐式排序影响

runtime envelope 与 Symbol 不进入 Table IR、Scene 或用户 dataset；其唯一 reference 只用于同一次 Layout 聚合，完成后必须剥离。

### Vanilla

`@retikz/table-vanilla` 不建立 fluent builder，而是提供 plain authoring helper、Table embed helper、无状态 Tier 2 adapter 和一次性 SSR convenience：

```ts
type TableEmbedProps = {
  spec: IRTableSpec;
  data?: ExternalDatasets;
  lowerOptions?: LowerTablesOptions;
  composites?: ReadonlyArray<CompositeDefinition>;
};

declare const detailTable: (input: DetailTableSpecInput) => IRTableSpec;
declare const manualTable: (input: ManualTableSpecInput) => IRTableSpec;

declare const embedTable: (
  id: string,
  spec: IRTableSpec,
  options?: Omit<TableEmbedProps, 'spec'>,
) => VanillaEmbedSpec<TableEmbedProps>;

declare const createTableAdapter: () => VanillaTier2Adapter<TableEmbedProps>;

type RenderTableCommonOptions = Pick<RenderToStringOptions, 'output'> & {
  data?: ExternalDatasets;
  lowerOptions?: LowerTablesOptions;
  composites?: ReadonlyArray<CompositeDefinition>;
};

type RenderTableOptions = RenderTableCommonOptions & {
  artifacts?: false;
};

type RenderTableArtifactOptions = RenderTableCommonOptions & {
  artifacts: true;
};

type RenderTableArtifactResult = Readonly<{
  svg: string;
  manifest: TableLayoutManifest;
}>;

type RenderTable = {
  (spec: IRTableSpec, options: RenderTableArtifactOptions): RenderTableArtifactResult;
  (spec: IRTableSpec, options?: RenderTableOptions): string;
};

declare const renderTable: RenderTable;

const spec = detailTable({
  id: 'sales-table',
  dataRef: 'sales',
  model,
  header: false,
  columns: [
    { id: 'product', field: 'product', header: 'Product' },
    { id: 'revenue', field: 'revenue', header: 'Revenue' },
  ],
});

const adapter = createTableAdapter();
const tableFigure = figure({
  layers: [
    layer('content', [
      embedTable('sales-panel', spec, {
        data: { sales: rows },
        composites: lowerPlots({ trend: trendRows }),
      }),
    ]),
  ],
});

const view = mount(container, tableFigure, { adapters: [adapter] });
view.update(
  figure({
    layers: [layer('content', [embedTable('sales-panel', spec, { data: { sales: nextRows } })])],
  }),
);

const svg = renderTable(spec, {
  data: { sales: rows },
  composites: lowerPlots({ trend: trendRows }),
});
const result = renderTable(spec, {
  data: { sales: rows },
  artifacts: true,
  output: { width: 480 },
});
```

- `detailTable()` / `manualTable()` 分别只委托 `createDetailTableSpec()` / `createManualTableSpec()`；返回值是无方法的 plain `IRTableSpec`，不新增细粒度 column / cell helper
- `embedTable()` 只返回 `embed('table', id, props)` 的标准 `VanillaEmbedSpec`；不执行 lowering，不修改 spec，也不把 runtime data 写入 Table IR
- `embedTable()` 在构造前要求 `id` 为非空字符串；adapter `lower()` 也必须独立校验 `VanillaEmbedContext.id`，使手写 `embed('table', '', props)` 不能绕过稳定 identity 前置条件。两条错误均使用 `table vanilla: embed id must be non-empty`
- `createTableAdapter()` 无 datasets/options 参数；同一 adapter 可服务多个 Table embed，并在 `mount().update(nextFigure)` 时从新 embed props 读取新 data、lower options 与 composites
- adapter 的 `lower()` 必须重新执行 `TableSpecSchema.parse()`，使手写 `embed('table', ...)` 不能绕过 Table schema；嵌入副本的根 id 规范化为 `${embedId}/${spec.id ?? 'table'}`，且不得修改调用方 spec
- adapter 返回的 `makeComposites` 在创建 adapter 时固定为同一函数引用；多个 Table embed 的 datasets、lower options 与 extra composites 通过下述共享 contribution contract 聚合，不用 mutable Map 或 module-level side channel 保存本轮 props
- `renderTable()` 是一次性 SSR + manifest convenience：先 parse spec，再以 `data ?? {}`、`lowerOptions ?? {}` 调用 Table lowering，最后经 `compileToScene` 与 `renderToSvgString` 输出；它不作为浏览器更新或性能优化边界
- `composites` 与 Table definitions 合并后进入 `CompileOptions.composites`，语义与 React / embed adapter 相同
- `output` 复用 `RenderToStringOptions['output']`，其中 width / height / idPrefix 只控制 SVG 宿主输出，不改变 Table 固定轨道几何；不开放调用方覆盖内部 `compile.composites`
- `{ artifacts: true }` 由 overload 返回 `RenderTableArtifactResult`；省略或显式 `false` 返回 SVG string
- helper、adapter 与 render 保持 SSR-safe，不读取 DOM 全局

#### 跨 React / Vanilla 的 contribution 合同

`@retikz/table` 的 `pipeline/contribution/` 提供 host-agnostic 的 runtime contribution helper。React embedded runtime 与 Vanilla adapter 都使用该 helper 生成待聚合 datasets，并复用同一个稳定 `makeTableRuntimeComposites()`：

```ts
type TableRuntimeContributionInput = {
  reference: string;
  data?: ExternalDatasets;
  lowerOptions?: LowerTablesOptions;
  composites?: ReadonlyArray<CompositeDefinition>;
};

type TableRuntimeContribution = {
  datasets: Record<string, unknown>;
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>;
};

declare const createTableRuntimeContribution: (input: TableRuntimeContributionInput) => TableRuntimeContribution;
```

每个 contribution 增加保留 runtime reference `@@retikz/table/runtime/${encodeURIComponent(reference)}`，其值带 module-local `Symbol` marker 并承载 `lowerOptions` / `composites`；Vanilla 传已校验的非空 `VanillaEmbedContext.id`，React 传已校验的 `IRTableSpec.id`。helper 本身也要求 `reference` 非空，并拒绝用户 dataset 与该保留 reference 冲突。React 同一 Layout 内重复 Table id 会使两个独立 envelope 命中同一 reference，并由 Kernel dataset conflict fail-loud；Vanilla 的重复 embed id 由 Kernel identity 检查先拒绝。

`makeTableRuntimeComposites()` 聚合时剥离所有 envelope，再应用 React “Embedded 多实例聚合”一节的同一 dataset、definition、普通 option 和 extra composite 冲突规则。reference 只由显式稳定 identity 派生，因此组件重排、Strict Mode 重入或 SSR 重复执行不会改变它，也不需要进程级可变状态。该 envelope 不进入 Table IR、Core IR 或 Scene。

`detailTable()` / `manualTable()` 的结果保持 JSON-safe。`TableEmbedProps` 是 Vanilla runtime props：`data` 仍与 IR 分离，definitions / composites 可以包含函数，因此带这些 runtime 扩展的整个 Figure 不承诺可持久化；Kernel 当前也只保证 `embed().props` 由调用方与 adapter 负责。任何函数都不得进入 adapter 输出的 Core IR。

alpha.1 不新增 `mountTable()`。浏览器运行统一使用 Kernel `mount()` / `mountSvg()` / `mountCanvas()`，Table 只提供 adapter。当前 `update()` 仍会整图重新 normalize、lower、compile 与渲染；本 ADR 只通过稳定 embed id、Table root id、layer metadata、cache hint、稳定 adapter 与 runtime handle 保留后续增量失效空间，不宣称已实现局部 lowering 或局部渲染。

### Package

两个 adapter 版本均为 `0.1.0-alpha.1`，标记 `domain: "viz"`、`releaseGroup: "table"`、`layer: "adapter"`、`publishable: true`。React / React DOM 为 peerDependencies；table-react 依赖 core/data/react，table-vanilla 依赖 core/data/vanilla，均用 `workspace:^`，两个 adapter 对 `@retikz/table` 使用 `workspace:*`。

adapter scaffold 落地的同一改动必须把 release group 从单成员扩为三个最终成员，同步根 viz 四类脚本、三个 publish artifact 实测预算和 release-group fixture，确保任一验证点都不引用不存在的 package。

理由：

1. `<Table>` 保留开放 structure 的通用入口，`<DetailTable>` / `<ManualTable>` 让内置结构获得无互斥 props 的明确 authoring
2. React 组件与 Vanilla plain helpers 都调用 `@retikz/table` 的共享 authoring normalization，不复制结构、布局和 lowering
3. Vanilla 通过标准 embed + adapter 复用 Kernel figure/layer、mount/update、renderer 与 runtime metadata，不在 Table adapter 另建运行时
4. data/options 位于 embed props，使稳定 adapter 在 `update(nextFigure)` 时可以消费新输入；闭包只保留稳定函数身份，不保留易过期业务数据

React `onManifest` 固定采用“render 中纯计算、effect 去重通知”；不得在 render 中执行用户 callback。Vanilla 开关固定命名为 `artifacts`，为 alpha.6 additive artifact 字段保留统一返回模式。

## DSL 表面

见“决策”中的 React 与 Vanilla 示例。React sugar、Vanilla helper 与共享 authoring normalization 最终必须得到相同 `IRTableSpec`：

```ts
expect(detailTable(detailInput)).toEqual(createDetailTableSpec(detailInput));
expect(resolveReactDetailTableSpec(detailProps)).toEqual(createDetailTableSpec(detailInput));

expect(manualTable(manualInput)).toEqual(createManualTableSpec(manualInput));
expect(resolveReactManualTableSpec(manualProps)).toEqual(createManualTableSpec(manualInput));
```

## 测试设计

- React `<Table>` 渲染 manual/detail/custom spec，manual spec 可省略 `data`
- React `<DetailTable>` 生成确定 data reference、model、structure header 与 column header payload；`header: false` 与手写 spec 等价
- React `<ManualTable>` 生成确定 dimensions、rowKinds 与 Cell payload
- 三个组件 standalone / embedded 都归一到同一 runtime，sugar 组件不是 render-time `<Table>` wrapper
- React embedded Table 只接受稳定唯一 spec id；匿名/重复 id fail-loud，组件重排、Strict Mode 与 SSR 重入不改变 runtime reference
- React onManifest 只按内容变化通知
- 任一 embedded Table component 携带 onManifest 都 fail-loud，不静默丢回调
- 两个不同 embedded Table components 的同引用 definitions/composites 去重，不同 key 合并，同 key 不同对象 fail-loud
- Vanilla `detailTable` / `manualTable` 返回 plain、schema-valid spec，与共享构造函数等价且不修改输入
- `embedTable` + `createTableAdapter` 可进入 Kernel figure/layer、SSR、SVG mount 与 Canvas mount；嵌入输出 id 从 embed id 派生
- 同一 mounted view 更新为带新 dataset 的 next figure 后输出新内容，root DOM/canvas identity 与 adapter identity 保持稳定
- 多个 Vanilla Table embed 与多个 React embedded Table 使用同一 runtime contribution 合并和冲突规则
- renderTable 缺省返回 string，artifact mode 返回 sidecar，manual spec 可省略 `data`
- React / Vanilla 对同一 spec 输出相同 Scene/SVG 语义
- React display size 与 Vanilla output size 不回写 TableSpec 或改变 manifest bounds
- React / Vanilla 都能注入额外 composite definitions；未注入的 nested composite 沿用 Core warning，adapter 不宣称其已渲染
- alpha.1 的 nested Plot fixture 只验证显式局部定位后的注册、递归 lowering 与 adapter parity；自动测量、fit 和 clip 由 alpha.2 fixture 验收
- 两个 adapter 不复制 schema/layout/lowering，不依赖 Plot
- SSR 环境无 window/document
- release-group、viz scripts 与 publish artifact checker 覆盖最终三个 Table packages

## 影响

- 初始化 `@retikz/table-react` 与 `@retikz/table-vanilla` npm packages
- `@retikz/table` 新增共享 `createDetailTableSpec()` / `createManualTableSpec()` 与 runtime contribution contract
- 新增用户可见 `<Table>`、`<DetailTable>`、`<ManualTable>`、`detailTable()`、`manualTable()`、`embedTable()`、`createTableAdapter()` 与 `renderTable()`
- React embedded Table 新增稳定 id 前置条件；standalone 仍允许匿名 spec
- alpha.1 需要在 `apps/docs` 建立 Table introduction / usage / API 基础页面和 demo，并同步 zh/en、导航与 i18n
- docs package 同步加入 `@retikz/table`、`@retikz/table-react`、`@retikz/table-vanilla` 的 `workspace:*` dependencies，保证组件 demo、IR/API 示例和 Vanilla 示例均从真实公开包导入
- 同步 viz、Table 与两个 adapter 的包职责文档：Table 明确拥有 framework-neutral spec normalization 和 adapter-shared contribution contract，但不拥有 React/Vanilla traversal/runtime；Vanilla 从 builder 改为 plain helper + Tier 2 embed adapter + SSR convenience；React 明确三个组件消费共享 normalization
- `@retikz/table` README 与 Table API 文档列出 `createDetailTableSpec()` / `createManualTableSpec()`；共享 contribution 类型与 helper 作为 adapter extension contract 单独标注，不混入普通 Table authoring 示例
- 三包从 alpha.1 起 lockstep，后续能力必须保持 adapter 等价或明确不适用理由

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / adapter 闭环
- 解决的问题：让同一 TableSpec 在 React、Vanilla、SSR 与 renderer host 中可用
- 主责包与协作包：Table 主责领域；table-react/table-vanilla 主责接线；kernel adapters 执行宿主能力
- 是否可由现有能力组合：复用 React Layout 与 Kernel Vanilla plain spec / Tier 2 adapter / mount / render；只新增 Table authoring 与领域 contribution 聚合
- 是否需要下沉：无；通用 runtime 能力继续留 kernel adapter
- 内部表达链路：Table spec props / DetailTable / ManualTable / Vanilla plain helper → IRTableSpec；standalone 或 embed runtime props → shared contribution → lowerTables → Core
- 外部扩展链路：Table definitions 透传到 `@retikz/table` options；nested Tier 2 definitions 经两套 adapter 的同名 `composites` 宿主通道注入
- pipeline / lowering 与下游消费：两个 adapter 调同一公开 authoring 与 contribution API；Vanilla adapter 进入 Kernel normalize / compile / mount 链路
- React / Vanilla adapter 等价性：通用 spec、detail/manual authoring、runtime contribution、renderer 与 artifact 行为有交叉测试
- provenance / lineage / locator：alpha.1 暴露 manifest；alpha.6 扩展 artifact result
- 本轮结论：共享 authoring 与 contribution 属于 Table；framework traversal 与 runtime 接线上移到 adapter；通用 figure/layer/update/render 继续组合 Kernel Vanilla，不新增 Table 私有 runtime

## 不在本 ADR 范围

- JSX `<Cell>` / `<Row>` manual DSL
- Vanilla fluent builder、细粒度 column/cell helper 或 legacy alias；plain input 已能完整表达 alpha.1 authoring
- `mountTable()`、Table 私有 view handle 或私有 renderer；浏览器 runtime 复用 Kernel mount
- 增量 lowering、dependency graph、`patch()` / `invalidate()`、SVG DOM diff、Canvas dirty layer；当前 `update()` 仍是整图重绘
- ReactNode Cell content、hooks 与选择等展示交互状态
- virtualization / viewport runtime；作为 v0.2 大表展示能力另开 ADR
- 单元格编辑；不属于 Table 家族目标
- async data、服务端分页与缓存状态；由宿主负责
- formatter/rule/theme convenience props

---

## 实现契约（必填）🔻

### Level

`red`：新增两个公开 packages、组件/函数 API 与 docs-visible 行为。

### Schema 改动

无。所有 authoring 结果必须通过 `TableSpecSchema`，adapter 不拥有 schema。

### 文件 scope

- `packages/viz/table-react/{package.json,tsconfig.json,vite.config.ts,README.md,LICENSE}`
- `packages/viz/table-react/src/index.ts`
- `packages/viz/table-react/src/Table.tsx`
- `packages/viz/table-react/src/DetailTable.tsx`
- `packages/viz/table-react/src/ManualTable.tsx`
- `packages/viz/table-react/src/table-runtime.ts`
- `packages/viz/table-react/src/embedded-runtime.ts`
- `packages/viz/table-react/tests/**`
- `packages/viz/AGENTS.md`
- `packages/viz/table/AGENTS.md`
- `packages/viz/table-react/AGENTS.md`
- `packages/viz/table-vanilla/AGENTS.md`
- `packages/viz/table/README.md`
- `packages/viz/table/src/contract/authoring/**`
- `packages/viz/table/src/contract/index.ts`
- `packages/viz/table/src/pipeline/contribution/**`
- `packages/viz/table/src/pipeline/index.ts`
- `packages/viz/table/src/index.ts`
- `packages/viz/table/tests/contract/authoring/**`
- `packages/viz/table/tests/pipeline/contribution/**`
- `packages/viz/table-vanilla/{package.json,tsconfig.json,vite.config.ts,README.md,LICENSE}`
- `packages/viz/table-vanilla/src/index.ts`
- `packages/viz/table-vanilla/src/spec/**`
- `packages/viz/table-vanilla/src/adapter/**`
- `packages/viz/table-vanilla/src/runtime/**`
- `packages/viz/table-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/components/table/**`
- `apps/docs/src/modules/docs/data/viz.ts`
- `apps/docs/src/modules/docs/data/types.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- `apps/docs/package.json`
- `scripts/release-groups.config.mjs`
- `scripts/check-release-groups.test.mjs`
- `scripts/publish-artifact-limits.json`
- 根 `package.json`
- `pnpm-lock.yaml`

### 测试象限

**Happy path**：React `<Table>` manual/detail/custom spec；`<DetailTable>`（含 `header: false`）；`<ManualTable>`；三个 embedded components；Vanilla detail/manual plain helper；`embedTable` 经 figure/layer 在 SVG/Canvas mount 与 SSR 渲染；render string/artifact overload。

**边界**：standalone `<Table>` / `renderTable` 允许匿名 manual spec 并省略 data；Vanilla spec 无 id 时嵌入输出使用 `${embedId}/table`；空 detail dataset；manual 空 cells；单 column；custom definition options；两个不同 Table components/embed 共享同一 definition 对象；authoring 输入不变性；React embedded Table 重排、Strict Mode 重入和 SSR 重复执行保持同一 runtime reference。

**错误路径**：`<DetailTable>` / `detailTable` 缺 dataRef 或空 columns；`<ManualTable>` / `manualTable` 非正 dimensions、rowKinds 长度错误或越界 Cell；React embedded Table 匿名或重复 id；`embedTable('')` 与手写空 id embed 都 fail-loud；手写 embed 非法 spec；missing dataset；空 runtime contribution reference；runtime reference 与用户 dataset 冲突；unregistered provider；任一 React embedded component 携带 onManifest；同 structure/presentation/composite key 的不同 definition 对象；shared lower option 冲突；adapter 输出 id 未按 embed id 命名空间化。

**交互**：React / Vanilla detail 在 `header: false` 下 authoring parity；React / Vanilla manual parity；三个 React 组件共享 runtime/renderer/manifest 语义；standalone onManifest 去重；React 与 Vanilla 对多实例 runtime definitions/composites 执行同一聚合；`mount().update(nextFigure)` 更换 dataset 后内容更新而 root identity 稳定；显式局部定位的 nested Plot composite 通过两套 `composites` 通道注册后可渲染；docs typecheck 与 Table 页面/路由可访问；最终三包 release-group 检查通过。

### 依赖的现有元素

- `Layout`、`EmbeddableTier2Adapter`（`@retikz/react`）——React host / embedding
- `CompositeDefinition`、`compileToScene`（`@retikz/core`）——nested Tier 2 注入与一次性 convenience compile
- `VanillaEmbedSpec`、`VanillaTier2Adapter`、`figure`、`layer`、`embed`（`@retikz/vanilla`）——复用 plain spec 与 Tier 2 嵌入协议
- `mount`、`mountSvg`、`mountCanvas`、`renderToSvgString`（`@retikz/vanilla`）——统一浏览器 runtime 与 SSR output
- `RenderToStringOptions`（`@retikz/vanilla`）——复用 SVG output 配置，不开放内部 compile 覆盖
- `ExternalDatasets` / `ExternalRow`（`@retikz/data`）——runtime data
- `IRTableSpec`、`lowerTables`、`lowerTableWithArtifacts`（ADR-01/05）——唯一领域入口
