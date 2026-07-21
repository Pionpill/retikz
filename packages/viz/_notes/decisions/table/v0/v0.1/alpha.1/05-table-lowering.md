# ADR-05：Table lowering 与最小 layout manifest

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

ADR-01~04 分别建立根 IR、结构、内容与布局，但 renderer 只能消费 Core IR。Table 必须通过 Core composite 入口完成 lowering，不能让 SVG / Canvas renderer 识别 Table 私有节点。

Core `CompositeDefinition.expand` 只返回 `IRChild | Array<IRChild>`，不能携带 manifest。若把 manifest 写入全局变量或 Scene meta，会破坏纯函数与并发安全。Plot 已采用普通 composite lowering 与显式 lineage/locator API 分离的模式，Table 应沿用这一边界。

## 决策：共享 resolveTable 单一真源，分别提供 composite 与 artifact API

公开入口：

```ts
type LowerTablesOptions = {
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>;
};

lowerTables(datasets, options): Array<CompositeDefinition>;

lowerTableWithArtifacts(spec, datasets, options): TableLoweringResult;
```

`resolveTable(spec, datasets, options)` 是内部单一真源，按顺序执行：

1. 用根 schema 与对应 Definition schema 校验
2. 解析 external dataset
3. 构造并验证 SemanticTableModel
4. 解析 Cell presentation 得到 PresentedTableModel
5. 以 SemanticTableModel 执行固定轨道 layout
6. 把 PresentedTableModel 与 TableLayout 按声明顺序和 `cellId` 精确配对，emit Core IR 与最小 manifest

阶段签名固定为：

```ts
const presentTable = (
  model: SemanticTableModel,
  definitions?: ReadonlyArray<AnyCellPresentationDefinition>,
): PresentedTableModel;

const layoutTable = (model: SemanticTableModel, spec?: IRTableLayout): TableLayout;

const emitTable = (presented: PresentedTableModel, layout: TableLayout): IRChild;
```

`presented.semantic` 是本次 layout 的同一 canonical model；`presented.cells` 与 `layout.cells` 必须和 semantic cells 长度相同、顺序相同且 `cellId` 逐项一致，否则以 `table: internal cell alignment` fail-loud。layout 不读取 presentation content，emit 不重新解析 structure 或计算轨道。

`lowerTables()` 返回 `defineComposite({ namespace: 'table', type: 'table', schema: TableSpecSchema, expand })`；`expand` 只返回 `result.node`。`lowerTableWithArtifacts()` 返回同一次确定性计算的 sidecar，不通过隐藏状态穿过 Core compile。

### Core IR 输出

- 每个 Cell 内容放入 local Scope，并 translate 到 `contentCenter`
- Table 所有内容置于一个 `localNamespace: true` 的 inner Scope
- 根 `id` 存在时，外层 Scope 使用同一 id，保证整个 Table 可被 Core 连接和组合
- 根 `id` 省略时直接返回 local namespace Scope
- Cell 默认不注册 Core id，避免大型表格产生与 Cell 数量等量的 namespace entry
- semantic cell id / location / source 写入 JSON-safe Scope meta，供调试但不作为 locator 替代
- direct content 中的 nested composite 保持原样，由 Core 递归 composite lowering；宿主负责同时注册对应 feature Definition
- inner Scope 的第一个 child 固定为不可见 bounds sentinel Node，使 Table 几何进入 Core Scene AABB：

```ts
{
  type: 'node',
  position: [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2],
  shape: 'rectangle',
  minimumSize: { width: bounds.width, height: bounds.height },
  padding: 0,
  fill: 'none',
  stroke: 'none',
  opacity: 0,
  meta: { role: 'tableBounds' },
}
```

sentinel 使用公开 Core Node 合同，不注册 id、不产生可见像素；即使没有 Cell 内容，固定轨道宽高与 gap 仍会贡献 AABB。零行或零列时仍输出同一个 sentinel，并把 ADR-04 的非负退化 width/height 原样写入 `minimumSize`；不私自补最小正尺寸。Scene 最终 layout 还可包含宿主 `padding`，因此 parity 断言比较 `padding: 0` 时的 Scene layout，或比较 padding 前 AABB，而不把宿主留白误记为 Table bounds。

alpha.1 不输出背景、grid/border path、padding clip 或 overflow decoration。

### 最小 manifest

```ts
type TableTrackManifestEntry = Readonly<{
  id: string;
  index: number;
  offset: number;
  size: number;
}>;

type TableLayoutManifest = Readonly<{
  tableId?: string;
  bounds: Readonly<BoundsRect>;
  rows: ReadonlyArray<TableTrackManifestEntry>;
  columns: ReadonlyArray<TableTrackManifestEntry>;
  cells: ReadonlyArray<
    Readonly<{
      cellId: string;
      box: Readonly<BoundsRect>;
      location: TableCellLocationValue;
      roles: ReadonlyArray<TableCellRoleValue>;
      source?: TableCellSource;
    }>
  >;
}>;

type TableLoweringResult = Readonly<{
  node: IRChild;
  manifest: TableLayoutManifest;
}>;
```

`TableLoweringResult` 在 alpha.1 只包含 `node` 与 `manifest`。所有错误 fail-loud；非阻断 diagnostics、完整 lineage / locator / contribution mapping 在 alpha.6 一并增加，避免首版先冻结没有真实 code 的空诊断类型。

`BoundsRect` 与 `TableCellSource` 本身是普通对象，因此公开只读类型之外还要求 runtime 所有权隔离：`resolveTable()` 从 canonical model/layout detached deep copy manifest 的 bounds、track、Cell box、roles 与 source，并递归冻结 manifest 全对象图。`node` 与 manifest 也不得共享可变对象；修改 provider output、layout 临时值或对 artifact 做失败的 mutation，都不能影响另一产物或后续重复调用。

理由：

1. renderer 只消费 Core IR，Table 不建立平行渲染系统
2. composite 与 artifact API 共享同一 resolve，避免布局和追溯漂移
3. 默认不注册所有 Cell id，控制 namespace 和大表格成本

Cell Scope meta 固定输出最小 `sourceIndex` / `field` / `reference`，不包含原始值。alpha.1 不暴露 diagnostics 字段；alpha.6 增加该 additive artifact 字段与 const object code。

## DSL 表面

```ts
const composites = lowerTables({ sales: rows });
const scene = compileToScene({ version: 1, type: 'scene', children: [tableSpec] }, { composites });

const { node, manifest } = lowerTableWithArtifacts(tableSpec, { sales: rows });
```

## 测试设计

- manual/detail 产生合法 Core Scope / Node
- Table id 映射到外层 Scope id
- Cell translation 与 TableLayout center 一致
- empty/manual、1×1 与带 gap 表格的 bounds sentinel 使 Core AABB 覆盖完整 TableLayout bounds
- lowerTables 与 lowerTableWithArtifacts node 深相等
- nested composite 保留并由 Core 递归 lowering
- 缺 dataset、未注册 structure/presentation、非法 provider output fail-loud
- manifest row/column/cell boxes 与 layout 深相等
- manifest 全对象图递归冻结，且与 layout/model/node 不共享可变对象
- 重复调用无全局状态且结果确定

## 影响

- 新增 Table pipeline orchestration、emit 与 manifest contract
- 只使用 Core public composite / IR contract，不修改 Core compile
- adapter 能通过普通 composite API 渲染，并按需通过 artifact API取得 sidecar
- alpha.6 在不改变普通 renderer 路径的前提下扩展 lineage / locator

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Lowering and Traceability
- 解决的问题：把 Table 模型确定性转换为 Core IR，并保留最小语义几何映射
- 主责包与协作包：Table 主责；Core 执行 composite 与 Scene compile
- 是否可由现有能力组合：复用 Core composite，但 Table lowering 与 manifest 必须扩展当前域
- 是否需要下沉：无；不改变 Core composite 返回值
- 内部表达链路：resolveTable → model/presentation/layout → emit
- 外部扩展链路：options definitions → provider resolver → same pipeline
- pipeline / lowering 与下游消费：Core compile 消费 node；宿主持有 sidecar
- React / Vanilla adapter 等价性：ADR-06 都使用 lowerTables / artifact API
- provenance / lineage / locator：minimal manifest 现在闭环；完整 lineage/locator 明确 alpha.6
- 本轮结论：扩展 Table lowering；不采用 renderer 特判或隐藏 artifact side channel

## 不在本 ADR 范围

- background、border、clip、span、fragment
- per-Cell Core id 与外部 anchor
- 完整 lineage、locator、reading order、contribution mapping

---

## 实现契约（必填）🔻

### Level

`red`：新增 Tier 2 lowering、公开 options 与 artifact 返回契约。

### Schema 改动

无。消费 ADR-01~04 schema；manifest 是 runtime contract，不进入 Table IR，diagnostics 延至 alpha.6。

### 文件 scope

- `packages/viz/table/src/contract/manifest.ts`
- `packages/viz/table/src/pipeline/{types,resolve,index}.ts`
- `packages/viz/table/src/pipeline/lower/{lower,emit,meta,index}.ts`
- `packages/viz/table/src/pipeline/manifest/**`
- 对应 owner barrels 与包根导出
- `packages/viz/table/tests/{lower,manifest,deps-guard}/**`

### 测试象限

**Happy path**：manual；detail；root id；artifact API；nested composite。

**边界**：无 id；空 Cell；空 detail dataset；null text；单 Cell；零行/零列退化 bounds sentinel 不补最小正尺寸。

**错误路径**：缺 dataset；未注册 kind/name；provider schema/output 非法；Core 未注册 nested composite 时沿用 Core warning。

**交互**：lowerTables/artifact parity；React/Vanilla parity；PresentedTableModel/TableLayout 按顺序与 cellId 对齐；manifest/layout parity；custom structure × custom presentation；尝试修改 manifest bounds/track/Cell box/roles/source 不成功且不影响 node、layout/model 或重复调用；`compileToScene(..., { padding: 0 })` 的 Scene layout 覆盖 Table bounds。

### 依赖的现有元素

- `CompositeDefinition`、`defineComposite`、`IRChild`、`IRScope`（`@retikz/core`）——composite lowering
- `IRNode.minimumSize`（`@retikz/core`）——用单个不可见 sentinel 把 Table bounds 合法贡献给 Core AABB
- `BoundsRect`（`@retikz/math`）——manifest 与 layout 的左上角矩形语义
- `ExternalDatasets`（`@retikz/data`）——运行时数据注入
- ADR-02 registry/model、ADR-03 presentation、ADR-04 layout——单一 resolve pipeline
- Plot `lowerPlots` / explicit lineage API——仅参考边界，不产生 Table → Plot 依赖
