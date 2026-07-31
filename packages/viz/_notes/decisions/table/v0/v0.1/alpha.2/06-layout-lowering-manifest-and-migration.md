# ADR-06：Table layout transaction、lowering、manifest 与迁移

- 状态：Accepted
- 决策日期：2026-07-23
- 收口日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [Cell box](./03-cell-box-span-and-alignment.md) · [content policy](./04-content-fit-overflow-and-wrap.md) · [Border Graph](./05-border-graph-and-conflict-resolution.md)

## 背景

alpha.1 先 direct lowering Table，再单独计算 manifest。进入内容驱动布局后，这会重复 presentation / measurement，且第二次运行可能使用不同 definitions、datasets、host capabilities 或 occurrence identity，导致 Scene 与 manifest 漂移。

Table alpha.2 必须把 normalize、内容 probe、轨道求解、replay、border lowering 与 manifest 绑定到同一次 Core compile。Table 只消费 Core 的 layout proposal / probe、compile-local occurrence 与 typed artifact 能力，不建立私有布局或失败传播机制。

## 决策

### 一次 layout transaction

`lowerTables()` 注册 layout-aware `table.table` CompositeDefinition。每个 Table occurrence 在同一个 compile context 中执行：

1. parse Table spec，resolve Structure 与 Presentation definitions
2. normalize canonical rows、columns、Cells、span 与 resolved layout
3. 用 natural proposal probe 所有 Cell 内容并求 columns
4. 对 `wrap: true` 的 Cell 发起 x 轴 range proposal probe 并求 rows
5. 计算 Cell/content boxes、fit、alignment、overflow 与 Border Graph
6. 用选中的 Core replay result 构造最终 Scope wrapper，emit border Paths
7. 同时返回 Core child 与 `TableLayoutManifest` typed artifact

阶段之间只传递 detached plain data、Core layout result 与 compile-local replay；不得在 Table 私有 public type 中暴露 opaque replay。selected failed probe 通过 `context.raise()` 保留唯一 Core leaf failure envelope，并补充精确 stage 与可用的 Table/Cell id；fatal error 在 `layoutChild()` 调用点直接穿透，外层 resolver 不重复包装 provider 或抹除原始 cause。

### replay wrapper tree

fit scale、Table-local translation、clip、id 与 meta 通过 `context.replay()` / `context.scope()` 包在选中 replay root 外层。wrapper tree 只重组 compile-local output，不重新 layout child，也不改写 child 自带 transforms。

因此 selected layout result 的 bounds、artifacts、references 与最终 output 始终同源；discarded natural / range probe 不会泄漏到最终 artifact collection。

### 编译入口与 artifact 选择

公开 `compileTable(spec, data, options)` 构造 canonical 单根 Scene，并只调用一次 Core `compileToScene()`。结果包含：

- `scene`
- 同次 compile 的完整 `artifacts`
- exact root Table artifact 的同一 immutable `manifest` 引用

Table artifact 类型为 `CompositeCompileArtifact<'table', 'table', TableLayoutManifest>`。根实例不按可选 table id、对象引用、数组顺序或“第一条 artifact”选择，而按 definition key 与 `{ sourcePath: 'children[0]', expansionPath: [] }` 精确匹配；0 条或多条都 fail-loud。nested / repeated-id Table artifacts 保留在全量 collection，但不能冒充 standalone 根。

`lowerTableWithArtifacts()` 删除。需要 Scene 与 manifest 的调用方统一使用 `compileTable()`；宿主级组合仍直接使用 `lowerTables()` definition。

### manifest 合同

`TableLayoutManifest` 是递归冻结、JSON-safe、detached 的 schema-derived artifact，包含：

- 可选 `tableId`
- Table-local `allocationBounds` 与 `visualOverflowBounds`
- canonical `rows` / `columns` 的 id、index、offset、size
- Cell identity、source、span、Cell/content box
- replay-root local 的 `sourceAllocationBounds` / `sourceVisualOverflowBounds`
- Table-local 的 `contentAllocationBounds` / `visualOverflowBounds`
- resolved border edges、Path locator 与 atomic contributors

`allocationBounds` 只覆盖 tracks 与 gaps；visible Cell 内容和 border stroke 的 union 写入根 `visualOverflowBounds`。source bounds 与 content bounds 明确属于不同坐标空间，不可互换。

## 不采用的方案

- 不保留 direct lowering + 第二次 artifact 计算：会重复布局并破坏同源性
- 不把 replay token、Core context 或函数写进 Table IR / manifest
- 不按 table id 或 artifact 顺序猜根实例
- 不让 renderer 推导 manifest：renderer 不是 Table layout owner
- 不保留 `lowerTableWithArtifacts()` 兼容 alias；0.x 按正确分层迁移

## 公开影响与兼容性

- ⚠️ BREAKING：`TableSpec.layout.columnWidth`、`rowHeight`、`headerHeight` 删除，改为 track size、overrides 与 gaps
- ⚠️ BREAKING：manifest 根 `bounds` 改为 `allocationBounds`，并新增完整 Cell / border 几何
- ⚠️ BREAKING：`lowerTableWithArtifacts()` 删除，改用 `compileTable()`
- Structure / Presentation 的 Definition 与 registry 扩展路径不变；built-in 与 custom 继续同路
- Table lowering 不包含 Node、Path、Plot、renderer 或 DOM 白名单

## 最终实现与验证

实现集中在 `pipeline/compile.ts`、`pipeline/layout/transaction.ts`、layout helpers、lower emit 与 `contract/manifest`。package root 只导出稳定 schema、types、definitions、`lowerTables()` 与 `compileTable()`，不导出阶段 helper。

正式测试覆盖单次 compile、nested Table exact occurrence、同 id 根/嵌套实例、selected replay artifacts、manifest schema / deep-freeze / coordinate spaces、alpha.1 字段拒绝、custom definitions、Border Scope 及 Cell stage diagnostics。关键证据位于 `tests/lower/lower.test.ts`、`tests/pipeline/layout-transaction.test.ts`、`tests/manifest/manifest.test.ts` 与 `tests/public-api.test.ts`。

alpha.2 只接受有限 width constraint；有限高度 row fraction/minmax、fragmentation、完整 locator 暴露与增量 layout 留给后续 milestone，不改变本 ADR 的单次 transaction 和 typed artifact 边界。
