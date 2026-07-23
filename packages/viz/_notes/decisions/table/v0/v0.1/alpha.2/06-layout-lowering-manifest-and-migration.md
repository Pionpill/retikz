# ADR-06：Core layout transaction、lowering、manifest 与原子迁移

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [轨道 solver](./02-track-sizing-schema-and-solver.md) · [Cell box/span/alignment](./03-cell-box-span-and-alignment.md) · [fit/overflow/wrap](./04-content-fit-overflow-and-wrap.md) · [Border Graph](./05-border-graph-and-conflict-resolution.md) · [alpha.1 lowering](../alpha.1/05-table-lowering.md)

## 背景

ADR-02～05 分别冻结了 track、Cell、内容 policy 与 border，但这些能力不能逐字段接入现有 pipeline。当前 `resolveTable()` 在 Core compile 前用固定公式 layout，再把 Cell 原始内容移动到中心；它没有 Core constrained-layout environment。当前 React `onManifest` 和 Vanilla `artifacts:true` 还会先通过 `lowerTables()` 为渲染 lowering，再单独调用 `lowerTableWithArtifacts()` 生成 manifest，同一 Table 实际执行两次 lowering。

alpha.2 需要同一次 transaction 共享 Core definitions/options/host capabilities、intrinsic/constrained result、track geometry、replay child、Core IR 与 manifest。公开 schema 若先接受新字段，而 lowering 或某个 adapter 仍忽略它，会形成不可接受的半迁移状态。

本 ADR 不替 Kernel 命名通用 `IRChild` layout API。它冻结 Table 如何消费 ADR-01 已要求的 Core 公共合同；上游 Kernel ADR/实现未通过 ADR-01 gate 前，本 ADR 只允许 private pure helpers，不激活公开 alpha.2 行为。

## 决策：一次 Table layout transaction 产出 replayable Core IR 与同源 manifest

### 上游依赖与环境

Kernel 独立 ADR 必须提供一个公共 `IRChild` layout environment（下文以 `CoreChildLayoutEnvironment` 作为占位称呼），满足：

- 在同一 definitions、compile options、host capabilities 与 reference context 下执行 intrinsic / constrained layout
- composite expand context 显式携带当前 occurrence 的二维 layout constraint；两个轴分别区分 unconstrained、有限 `0` 与有限正数
- 返回 replayable laid-out child/result，以及 replay-root 未放置局部坐标系中的 allocation / visual overflow bounds
- laid-out result 同时持有相对 replay root 的 deferred nested artifacts；probe 不直接发布，只有最终 replay 才能按宿主 occurrence rebase 并提交
- composite expand context 可以取得同一环境，使 embedded Table 不 deep import Core compile
- composite expansion 可以通过显式、typed artifact channel 把 Table manifest 贡献给本次 Core compile result；不得用 closure callback、全局 Map 或 IR meta 充当 side channel
- Core traversal 为每个 composite 输入 occurrence 分配 JSON-safe、compile-local、确定的 locator，并让 artifact owner 与根输入 selector 使用同一 locator 合同
- React/Vanilla adapter 可以从同一次 Core compile result 取得 artifact，不需要在 compile 外重建 layout environment
- replay 不重新选择另一套 expansion/layout 语义

Table 直接消费 Core 公开类型，不声明结构相似的 `TableMeasurementService`、不把环境放进 IR、也不在 `LowerTablesOptions` 增加 renderer/DOM measurer。

概念调用形态：

```ts
type ResolveTableTransactionInput = Readonly<{
  spec: IRTableSpec;
  datasets: ExternalDatasets;
  tableOptions: LowerTablesOptions;
  constraint: Readonly<{
    width?: number;
    height?: number;
  }>;
  core: CoreChildLayoutEnvironment;
}>;

type ResolvedTableTransaction = Readonly<{
  node: IRChild;
  manifest: TableLayoutManifest;
  nestedArtifacts: CoreDeferredArtifactBundle;
}>;

type TableCompileArtifact = Readonly<{
  channel: '@retikz/table/layout-manifest';
  owner: CompositeOccurrenceLocator;
  tableId?: string;
  manifest: TableLayoutManifest;
}>;
```

`CoreChildLayoutEnvironment`、`CompositeOccurrenceLocator`、`CoreDeferredArtifactBundle` 的正式名字、工厂与 composite context 字段由 Kernel ADR 决定。实现时只能把占位名替换为 Core 公共标识符，不得改变本 ADR 的环境同源性、occurrence identity 或 transaction 行为。`nestedArtifacts` 只包含已选 Cell replay results 的 deferred bundles，不重复包含当前 Table occurrence 自己的 manifest artifact。

`constraint.width` / `constraint.height` 都只接受有限非负数；字段省略表示该轴 unconstrained，显式 `0` 不能被归一为省略。当前 Table occurrence 的约束由 Core traversal/layout request 提供：

- unconstrained width 让 column solver 的 `availableSize` 省略；有限 width（含 `0`）原样成为 column solver 的 `availableSize`
- column solve 与 Cell width-constrained layout 完成后，unconstrained height 让 row solver 的 `availableSize` 省略；有限 height（含 `0`）原样成为 row solver 的 `availableSize`
- constraint 小于 fixed/min/content base 时不压缩这些 base，差额继续走 Table visual overflow / clip
- standalone 根没有 Core root constraint 时两个轴均 unconstrained；React/Vanilla 的宿主 CSS `width` / `height` 和 `viewBox` 不冒充 Table layout constraint
- Table 作为 nested `IRChild` 时，父级对该 occurrence 发出的 constraint 使用同一规则；intrinsic probe 传两个轴 unconstrained，constrained probe 只设置父级实际约束的轴

### Transaction 阶段

单个 Table 按固定阶段执行：

```text
parse
  → normalize structure
  → present Cells
  → intrinsic Core layout
  → column contributions + spans
  → solve columns
  → optional width-constrained Core layout
  → row contributions + spans
  → solve rows
  → Cell/content boxes
  → fit + alignment + overflow/clip
  → Border Graph
  → replay Cell Core results + emit borders
  → build manifest from the same layout result
```

transaction 不修改 spec、datasets、definitions 或 Core result。所有数组按 canonical row/column/Cell 顺序输出并递归冻结。

每个 Presented Cell 在一个 transaction 内最多产生一个 intrinsic result 和一个需要时的 constrained result：

- `wrap:false` 复用 intrinsic result 作为 final replay result
- `wrap:true` 的 constrained result 替代 intrinsic result 成为 final replay result
- fit、alignment 与 clip 是 replay root 外层 Table transforms/Scope，不重新 layout child
- 相同 Cell 不因 manifest、border 或 adapter observer 再执行一次 presentation/Core layout

Core child-layout result 必须是已经完成 definition 选择与布局、可直接 replay 的公共结果，并携带相对 replay root 的 deferred artifact bundle。artifact 生命周期固定为：

- intrinsic / constrained 调用都是 probe；probe result 内的 nested artifacts 不直接进入宿主 compile collection
- `wrap:false` 选择 intrinsic result，`wrap:true` 选择 constrained result；未被选择的 probe bundle直接丢弃
- final replay 不重新 expand、lookup definition 或 layout；它只 replay 已选结果，并把该结果的 nested artifacts 按“当前 Table owner + canonical Cell occurrence path”rebase 到最终宿主 locator
- 每个 selected Cell result 的 nested artifacts 恰好提交一次；同一 nested Table spec 放入两个 Cell 时产生两个不同 owner
- Table 当前 occurrence 自己的 layout-manifest artifact 与所有 selected nested bundles 组合为该 replay result 的 deferred bundle；Core context 的 probe sink 只保存 bundle，commit sink 才把按最终 locator rebase 后的 bundle发布到本次 compile collection，因此任意嵌套层级的 probe 都观察不到临时或重复 artifact

任一阶段失败时整个 Table fail-loud，不返回部分 node 或部分 manifest。错误保留 cause，并至少关联 table id（若有）、阶段和 Cell id（Cell 阶段适用）。

### Lowering

最终 Table Core IR 是 local-namespace Scope，稳定顺序为：

1. 透明 allocation-bounds sentinel
2. canonical Cell replay Scopes
3. Border Graph Scope/Paths

每个 Cell Scope：

- replay 同一 Core result 中的 laid-out child
- 外层未变换 Cell Scope 位于 Table-local 坐标系；正宽高 `overflow:'clip'` 在该层持有 content box rectangle clip
- 内层 replay Scope 应用 replay-root local fit scale，再应用 bounds-aware Table-local alignment/placement translation
- content box 任一轴为零且 `overflow:'clip'` 时，外层 Cell Scope 保留稳定 identity，children 为空且不生成非法 rectangle clip
- meta 保留 Cell id、address/span、location、roles 与 source 的稳定 JSON 子集

点变换语义固定为 `p_table = T_table(S_replay(p_local))`；clip 始终位于外层 Table-local content box，不随内层 transform 移动或缩放。布局消费态分别命名 replay-root local 的 source allocation/visual bounds 与 Table-local 的 content allocation/visual bounds，并用中文 JSDoc 标明坐标空间。

Border Paths 使用 ADR-05 resolved/merged graph，不从 emitted Cells 反推。sentinel 只让 Table allocation bounds 在空内容、稀疏 Cell 或 visible overflow 下仍可观察；它不冒充 visual overflow。零尺寸 clip Cell 仍进入 manifest，`visualOverflowBounds` 为零面积矩形；缺失 definition/reference 或 layout failure 继续 fail-loud。

`lowerTables(datasets, options)` 仍是 Core composite definition 入口。definition 的 expand 必须从 Core composite context 取得公共 child-layout environment，调用同一 transaction，并通过 Core 显式 artifact channel 贡献 `TableLayoutManifest`。普通 `compileToScene` 可以丢弃 artifacts；需要 sidecar 的宿主使用 Kernel ADR 冻结的 compile-with-artifacts 入口。Table 不捕获 module-level mutable artifact side channel。

`lowerTableWithArtifacts` 保留为显式 direct lowering API，但 ⚠️ BREAKING 地要求调用方提供/形成与最终 Core compile 同源的 Core environment。其正式签名在 Kernel 类型落地后使用 Core 公共类型；不再允许 context-free 地对任意 Cell 内容生成“看似正确”的 manifest。该 direct API 的公开 sidecar 仍只返回根 Table `manifest`，不冒充通用 compile artifact collector；transaction 内的 `nestedArtifacts` 由 node replay 完成视觉闭环后丢弃。需要观察根与 nested Table 全部 artifacts 的调用方必须使用 Core compile-with-artifacts。

每次 composite expansion 贡献的 typed artifact 都必须携带当前输入 occurrence 的 `owner`。`owner` 由 Core traversal 生成，不进入 Table IR 或 manifest，也不能由 Table id、对象引用、数组位置、module counter 或 adapter 自行重建。相同 spec 在不同 occurrence 中展开时必须得到不同 owner；同一 scene 结构在 React、Vanilla 与 SSR 中得到相同的 owner 语义。

`channel:'@retikz/table/layout-manifest'` 是稳定 runtime discriminator，不只依赖 TypeScript 类型。consumer 先按 channel 过滤，再按 owner 精确匹配；相同 channel + owner 出现两条 artifact 是 Core contribution invariant 破坏并 fail-loud。同一 owner 的其它 channel 合法且不得影响 Table 根 manifest 选择。

### Manifest

`TableLayoutManifest` 继续是 JSON-safe、detached、递归冻结的显式 sidecar，升级为：

```ts
type TableLayoutManifest = Readonly<{
  tableId?: string;
  allocationBounds: Readonly<BoundsRect>;
  visualOverflowBounds: Readonly<BoundsRect>;
  rows: ReadonlyArray<TableTrackManifestEntry>;
  columns: ReadonlyArray<TableTrackManifestEntry>;
  cells: ReadonlyArray<TableCellManifestEntry>;
  borders: ReadonlyArray<TableBorderManifestEntry>;
}>;

type TableCellManifestEntry = Readonly<{
  cellId: string;
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  span: Readonly<{ rows: number; columns: number }>;
  box: Readonly<BoundsRect>;
  contentBox: Readonly<BoundsRect>;
  sourceAllocationBounds: Readonly<BoundsRect>;
  sourceVisualOverflowBounds: Readonly<BoundsRect>;
  contentAllocationBounds: Readonly<BoundsRect>;
  visualOverflowBounds: Readonly<BoundsRect>;
  location: TableCellLocationValue;
  roles: ReadonlyArray<TableCellRoleValue>;
  source?: TableCellSource;
}>;

type TableBorderManifestAtom = Readonly<{
  key: string;
  winner: TableBorderContribution;
  contributors: ReadonlyArray<TableBorderContribution>;
}>;

type TableBorderManifestEntry = Readonly<{
  edgeKey: string;
  pathId?: string;
  orientation: 'horizontal' | 'vertical';
  start: Readonly<{ x: number; y: number }>;
  end: Readonly<{ x: number; y: number }>;
  style: ResolvedTableBorderLine;
  atoms: ReadonlyArray<TableBorderManifestAtom>;
}>;

type TableBorderLocatorEntry = Readonly<{
  edgeKey: string;
  pathId?: string;
}>;
```

口径：

- root `allocationBounds` 是 tracks + gaps 形成的 Table box，替代 alpha.1 含义模糊的 `bounds`
- root `visualOverflowBounds` 是 fit/aligned/clipped Cell visible bounds 与 visible borders 的 Table-local union；透明 sentinel 不属于 visual contribution
- 没有任何 visible Cell/border contribution 时，root `visualOverflowBounds` 固定为 Table-local `{ x: 0, y: 0, width: 0, height: 0 }`；allocation sentinel 仍让最终 Core Scene 的自动 layout 能观察非零 Table allocation
- Cell `sourceAllocationBounds` / `sourceVisualOverflowBounds` 是 final replay result 在 fit 前、replay-root local 坐标系中的 detached bounds
- Cell `contentAllocationBounds` 是 final replay allocation bounds 经 fit/alignment 后映射到 Table-local 的结果，不是 Core replay-root source bounds
- Cell `visualOverflowBounds` 是 overflow policy 后的 Table-local 可见结果；clip 时不超过 content box
- rows/columns 继续只公开 id/index/offset/size，不泄漏 internal resolved track variant
- borders 公开 ADR-05 冻结的 edgeKey、可选 pathId、orientation、start/end、resolved line style 与逐 atom winner/contributors；不得压成单数 winner 或无 atom 归属的 contribution 并集
- Border Core Path meta 使用同一 edgeKey/atomicKeys；transaction 内部 border locator 只以每个 emitted visible atomic key 映射到 `TableBorderLocatorEntry`，hidden atom 只留 resolved diagnostics，完整公开 locator 仍延期 alpha.6
- hidden border atom 的 resolved diagnostics 是 Table transaction 内部 `ResolvedTableBorderAtom` 集合和直接 Border Graph 测试边界，不进入 public manifest、Core typed artifact 或 adapter API
- 显式 table id 存在时 pathId 固定为 `<tableId>/border/<edgeKey>`；匿名 standalone Table 的 pathId 省略，不能使用 module/global counter伪造

manifest 必须从 transaction 的 `TableLayout` / Border Graph 直接复制；不得从 Core IR、Scene、SVG DOM 或第二次 lowering 反推。

alpha.1 `bounds` 字段删除，不保留 alias；消费者迁移到 `allocationBounds`，需要完整可见范围时使用 `visualOverflowBounds`。

### Artifact 观察与 adapter 单次 compile

Standalone React：

1. 仍把原始 Table spec 与 `lowerTables()` definition 交给 `<Layout>`
2. adapter 同时保留根 Table 输入 occurrence 的 locator selector
3. `<Layout>` 在自身 browser measurer、definitions 与完整 Core options 下只 compile 一次，并收集 typed artifacts
4. Table 内部 observer 先按 `channel:'@retikz/table/layout-manifest'` 过滤，再只接受 `artifact.owner` 与根 selector 精确相等的一条 manifest
5. 同 channel + owner 匹配为 `0` 条或多条时 fail-loud；其它 channel 不参与计数，不得按 tableId、artifact 顺序或第一条 Table artifact 猜测
6. React commit 后的 effect 通知 `onManifest`

不得为 `onManifest` 在 React render 期间调用 `lowerTableWithArtifacts()`；这既会重复 transaction，也无法取得 `<Layout>` 内部 browser measurer 的同源 environment。

Standalone Vanilla：

1. parse spec，并保留根 Table 输入 occurrence 的 locator selector
2. 用 `lowerTables()` 与完整 `CompileOptions` 执行一次 compile-with-artifacts
3. 从同一 compile result 按 Table channel + owner 精确选择唯一 Table artifact；`0` 条或多条均 fail-loud，其它 channel 不参与计数
4. 渲染 Scene；`artifacts:true` 返回该 manifest，false 只丢弃 sidecar

匿名根、显式 id 根、Cell 内嵌 Table、并列 Table 和重复 table id 都使用同一 occurrence 规则。nested/并列 artifacts 可以保留在宿主 collection，但不能被 standalone 根 observer/result 误选。

Embedded React/Vanilla 也通过同一 artifact channel 贡献 manifest，但 alpha.2 不为 embedded Table component 新增局部 `onManifest`。宿主是否公开通用 artifact collection API 由 Kernel ADR 决定；Table 只使用 typed contribution，不用 callback capture 或全局 Map。alpha.2 的 compile-local occurrence locator 只解决 artifact 所有权与根选择；面向用户查询 Cell/fragment 的完整 locator 与 repeated fragment instance 仍由 alpha.6 处理。

### Alpha.1 → alpha.2 原子迁移

单一可观察迁移必须同时完成：

- ADR-02：新增新根 track fields，删除 `columnWidth` / `rowHeight` / `headerHeight`
- ADR-03：激活 span/padding/alignment，删除 `contentCenter`
- ADR-04：激活 wrap/fit/overflow、auto row transaction 与 content clip
- ADR-05：激活 border schema/graph/lowering
- Core：接入已通过 ADR-01 的公共 child-layout/replay environment
- pipeline：`resolveTableLayoutSpec`、`layoutTable`/transaction、`resolveTable`、lowering 与 manifest 全部切换
- adapters：React/Vanilla standalone 单次 transaction；embedded context 同源
- Core adapters：React Layout / Vanilla compile-with-artifacts 从同一次 compile result 观察 typed Table artifact
- Core Scene bounds：父 Scope clip 必须参与 clip-aware visual bounds；Table manifest 求交不能代替 Core/renderer 证据
- Core Scene bounds：Path stroke 必须按 ADR-01 第 6 条参与 replay/最终 auto bounds；outer border half-stroke 不得只在 manifest 手工扩宽
- docs：zh/en schema/API/demo/迁移说明同步

禁止提交以下中间状态：

- 新 schema 已 parse，但 pipeline 仍读 alpha.1 fields
- layout 已生成 span/content box，但 emit 仍只用 contentCenter
- render 与 manifest 来自两次 lowering
- React 已切换而 Vanilla 仍按固定轨道
- Core layout environment 只在 standalone 或单一 renderer 可用
- 零尺寸 content box 生成 Core schema 拒绝的 rectangle clip，或直接丢失 Cell identity/manifest
- clip 放进 replay transform Scope，导致非中心 bounds、非零 content-box 原点下裁剪区域漂移
- Border Path centerline 已 emit，但 Core Scene bounds 忽略 stroke width，导致 outer half-stroke 被 viewport 裁切
- merged Border Path 只保留单数 winner 或 contribution 并集，丢失 atomic key → winner/contributors 映射

理由：

1. measurement、replay、node 与 manifest 同一 transaction 才能消除几何漂移和副作用重复
2. 直接消费 Core environment 保持 Drawing/Table 所有权，不建立 Table 私有测量层
3. 原子迁移防止公开 JSON 被部分接受、部分忽略
4. allocation/visual 两种 manifest bounds 让宿主能区分表格占位与真实可见溢出

## 待决策点 🔻

只有以下**上游命名**等待 Kernel ADR：

- `CoreChildLayoutEnvironment`、layout request/result/replay 的正式公共类型名
- composite expand context 取得该环境的正式字段
- typed composite artifact contribution 与 compile-with-artifacts result 的正式公共类型名
- `CompositeOccurrenceLocator` 与根输入 occurrence selector 的正式公共类型名
- composite 当前 occurrence constraint 与 deferred nested artifact bundle/rebase 的正式公共类型名

Kernel 选择不得改变 Table transaction 顺序、direct API 必须显式取得同源环境、adapter 单次 compile、typed artifact 或 manifest 口径。若上游最终 API 无法满足这些合同，本 ADR 不得实现。

## DSL 表面

```ts
const result = lowerTableWithArtifacts(
  spec,
  datasets,
  { structureDefinitions, presentationDefinitions },
  coreEnvironment, // 正式类型由 Kernel ADR 命名
);

compileToScene({ version: 1, type: 'scene', children: [result.node] }, coreEnvironment.compileOptions);

result.manifest.allocationBounds;
result.manifest.visualOverflowBounds;
```

React/Vanilla 的普通用户入口不要求手工构造 environment；adapter 通过同一次 Core compile 的公开 context/artifact 合同取得结果。

## 测试设计

`packages/viz/table/tests/pipeline/layout-transaction.test.ts`、`lower/lower.test.ts`、`manifest/manifest.test.ts` 与两 adapter integration tests 覆盖：

- ADR-02～05 schema / behavior 原子激活和 alpha.1 fields 精确拒绝
- intrinsic/constrained layout 调用次数、environment identity、final replay 同源性
- occurrence constraint 的 unconstrained/有限宽高/显式零映射，以及 nested Table 的父约束消费
- track/span/fit/clip/border 联合 lowering 的 Core IR 与 renderer 结果；覆盖外层 clip、内层 scale/translation 的顺序
- allocation/visual bounds、Cell identity/source、border provenance 的 manifest
- 零尺寸 clip 的空可见 Scope、零 visual bounds、保留 identity，以及父 Scope clip-aware Scene bounds
- collapse/separate Border Path 的 butt/miter、outer half-stroke Core Scene bounds，以及 Path meta ↔ manifest atoms ↔ border locator
- React `onManifest` 与 Vanilla artifact 均来自同一次 Core compile 的 typed artifact
- 匿名/显式 id 根、nested/并列/重复 id Table 通过 owner locator 精确选择根 artifact，`0` 条或多条匹配 fail-loud
- 同一 owner 的其它 artifact channel 不影响 Table 选择；重复 Table channel + owner fail-loud
- wrap nested Table 的 probe artifact 不泄漏，final replay只提交selected bundle一次；同 spec多Cell得到不同owner
- embedded custom composites/measurer/options 使用宿主同一 Core environment，无 Table 类型/renderer 特判或双 lowering
- transaction 错误关联、递归冻结、输入不变与重复执行确定

详细行为矩阵见 ignored `notes/plans/table-alpha2-layout-transaction/TEST_CONTRACT.md`。

## 影响

- ⚠️ BREAKING：根 layout schema 删除 alpha.1 固定字段，Cell/schema/layout/manifest 切换到 alpha.2
- ⚠️ BREAKING：manifest `bounds` 改为 `allocationBounds` + `visualOverflowBounds`
- ⚠️ BREAKING：direct `lowerTableWithArtifacts` 需要 Core 公共同源 environment，不再 context-free
- Core composite context、typed artifact 与 compile-with-artifacts 需要由独立 Kernel ADR 满足，不在 Table 包私建
- Core traversal occurrence locator 与根 selector 需要由同一 Kernel ADR 满足，Table 不按 id 或 artifact 顺序补选择逻辑
- Core child-layout result 的 deferred artifact bundle、final replay rebase/commit 与 occurrence constraint 需要由同一 Kernel ADR 满足
- React/Vanilla standalone 从“双 lowering”改为单次 Core compile；embedded 局部 onManifest 仍不支持
- renderer 不新增 Table 能力，只消费 replayed Core IR/Scene

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Layout + Lowering + Traceability；依赖 Drawing Complete
- 解决的问题：把 schema、Core content layout、二维 solver、replay、Core IR 与 manifest 闭合成一次确定 transaction
- 主责包与协作包：Table 主责 transaction/geometry/artifact；Core 主责通用 environment/replay；adapters 主责同源 props 接线
- 是否可由现有能力组合：alpha.1 pipeline 不足；必须扩展 Table 并等待 Core 公共合同，不能 adapter patch
- 是否需要下沉到 data / core / math：通用 child layout/replay 下沉 Core；Table 事务留当前域；不修改 Data
- 内部表达链路：spec → semantic/presented → Core results → numeric tracks/Cell/border → replay Core IR + manifest
- 外部扩展链路：custom Structure/Presentation/composite 分别通过既有统一 registries；transaction 不分 builtin/custom
- pipeline / lowering 与下游消费：同一 transaction 同时供 direct API和Core composite expansion；typed artifact把manifest交给adapters
- React / Vanilla adapter 等价性：同一 spec/datasets/Table definitions/Core environment 产生等价 node/manifest/Scene
- provenance / lineage / locator 是否适用：Cell source/span/boxes 与 border contributions 显式进 manifest；compile-local occurrence locator只负责artifact所有权，完整Cell/fragment locator与公开embedded查询延期alpha.6
- 不支持边界与本轮结论：扩展 Table 并下沉 Core 前置；不以私有 fallback 绕过 gate

## 不在本 ADR 范围

- Kernel 公共 child-layout / typed artifact / compile-with-artifacts API 的具体命名与实现
- embedded Table 的局部实时 manifest observer
- fragmentation、重复 header、virtual scroll
- alpha.3 presentation/theme、alpha.4 group、alpha.5 pivot
- renderer 私有测量、DOM/CSS layout

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。它是 ADR-02～05 的公开 schema、pipeline、lowering、manifest 与 adapter 原子激活点，并依赖 Core 公开 compile 能力。

### Schema 改动

本 ADR 原子激活以下已冻结 schema；字段定义以对应 ADR 表为准：

| 文件                                                 | 操作 | 字段                                                                             |
| ---------------------------------------------------- | ---- | -------------------------------------------------------------------------------- |
| `packages/viz/table/src/schemas/layout/schema.ts`    | 删除 | `columnWidth`、`rowHeight`、`headerHeight`                                       |
| 同上                                                 | 新增 | `columnSize`、`rowSize`、`headerRowSize`、`columns`、`rows`、`borders`           |
| `packages/viz/table/src/schemas/cell/schema.ts`      | 新增 | `span`、`layout.padding/horizontalAlign/verticalAlign/wrap/fit/overflow/borders` |
| `packages/viz/table/src/schemas/structure/schema.ts` | 新增 | detail column `headerLayout`、`bodyLayout`                                       |

不增加兼容 alias。所有字段 `.describe(...)` 和精确类型见 ADR-02～05。

### 文件 scope

Table 原子迁移允许触碰：

- `packages/viz/table/src/schemas/{cell,layout,border,structure,table}/**`
- `packages/viz/table/src/contract/{model,structure,authoring}/**`
- `packages/viz/table/src/contract/manifest.ts`
- `packages/viz/table/src/providers/structure/**`
- `packages/viz/table/src/shared/layout.ts`
- `packages/viz/table/src/pipeline/{normalize,layout,lower,manifest,contribution}/**`
- `packages/viz/table/src/pipeline/{resolve,types,index}.ts`
- `packages/viz/table/src/index.ts`（只同步已冻结公共 schema/types/API；默认 `export *`）
- `packages/viz/table/tests/{ir,structure,layout,pipeline,lower,manifest,deps-guard,public-api}/**`
- `packages/viz/table-react/src/**` 与 `packages/viz/table-react/tests/**`
- `packages/viz/table-vanilla/src/**` 与 `packages/viz/table-vanilla/tests/**`
- alpha.2 对应双语 docs / demo / reference / schema registry 文件

Core 产品文件不在本 ADR scope；必须由独立 Kernel ADR 先实现。偏离上述目录或新增 provider registry 需要回 ADR 重审。

### 测试象限

**Happy path（≥ 3）**：

- `单 transaction 完整布局`：auto/span/wrap/fit/border Table → node 与 manifest 来自同一 geometry
- `父约束进入 solver`：unconstrained、有限 width/height 与显式 `0` 精确映射到两轴 solver
- `同一 Core environment`：custom composite/shape/clip 在 measure/replay/compile 使用同一 definitions
- `manifest 双 bounds`：allocation 与 visible overflow 分别精确反映 tracks 和内容/border
- `adapter 单次 compile`：React observer 与 Vanilla artifact 来自同一 Core compile artifact
- `根 artifact occurrence`：匿名根、nested/并列 Table 与重复 id 都只选择 owner 匹配的唯一根 artifact

**边界（≥ 2）**：

- `空/稀疏/零面积 Table`：sentinel、空可见 Cell Scope、manifest identity 与 Scene 结果有限确定，不生成非法 rect clip
- `全空 visual bounds`：无 visible contribution 时固定为 Table-local 零原点矩形，sentinel 只保留 allocation
- `fixed 空间不足`：tracks 保持 base，visible/clip policy 处理 overflow
- `embedded 无局部 observer`：正常贡献 typed artifact，但组件显式拒绝 onManifest，不创建隐藏 side channel

**错误路径（≥ 2）**：

- `alpha.1 字段拒绝`：旧 width/height 字段在新 strict schema 精确失败
- `Core environment 缺失/不一致`：direct/embedded 入口 fail-loud，不退回估算
- `根 artifact 候选错误`：owner 匹配为 `0` 条或多条时 fail-loud，不按 id/顺序猜测
- `artifact channel 隔离`：同 owner 其它 channel 合法，重复 Table channel + owner fail-loud
- `Cell layout 失败关联`：缺失 definition/reference/非法 bounds 错误包含 stage 与 Cell id
- `内部 identity 漂移拒绝`：semantic/presented/Core result/layout/manifest Cell 顺序或 id 不一致

**交互（≥ 2）**：

- `wrap × span × border × clip`：完整 Core IR、clip-aware Scene bounds、manifest 与 renderer 几何一致
- `scale × end align × clip`：非中心 source bounds 与非零 content-box 原点下先 local scale、后 Table translate，clip 保持 Table-local
- `custom Structure × Presentation × composite/measurer/options`：全部使用同一 environment，三个 registry 同路且无内置白名单
- `wrap nested Table × 多 Cell occurrence`：probe artifacts 不发布，final replay恰好提交一次并rebase为不同owner
- `React × Vanilla × SSR`：相同输入/environment 得到等价 manifest/Scene
- `重复执行/冻结`：输出深等、递归冻结且不修改输入

### 依赖的现有元素

- ADR-01 Core public constrained-layout/replay contract—— 硬 gate；未落地不实施
- ADR-02～05 schema、numeric solver、Cell policy 与 Border Graph—— 本 ADR 原子激活
- `lowerTables` / `lowerTableWithArtifacts`（`packages/viz/table/src/pipeline/resolve.ts`）—— 统一到同一 transaction
- `createTableRuntimeContribution`—— embedded 合并 Table definitions 与 extra composites，需传入宿主同一 Core environment
- `TableRuntimeView`—— 删除 render 期 direct lowering，改为观察 Layout 同次 compile artifact
- Vanilla `renderTable`—— 删除第二次 artifact lowering，改为消费 compile-with-artifacts result
- Core `defineComposite` / composite context—— 上游扩展后提供公共 layout environment、typed artifact contribution 与 compile-local occurrence locator
