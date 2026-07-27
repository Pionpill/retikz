# ADR-07：React / Vanilla authoring、宿主接线与文档闭环

- 状态：Accepted
- 决策日期：2026-07-23
- 收口日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [layout transaction](./06-layout-lowering-manifest-and-migration.md)

## 背景

Table 的 schema、layout 与 manifest 只有在 React、Vanilla、SSR、embedded 与文档中共享同一 transaction 才算可用。adapter 不能重定义领域字段、默认值、测量或 artifact 选择，也不能为了 JSX convenience 让 marker grammar 成为第二套真源。

alpha.2 保留完整 JSON-safe props / plain input，并用窄 marker 提供等价 authoring。宿主级能力只复用 Kernel 已公开且当前 Table runtime 能真实接线的合同。

## 决策

### 三个 React 根入口

公开 `<Table spec>`、`<DetailTable>` 与 `<ManualTable>`：

- `<Table>` 接受完整 `IRTableSpec` 与 datasets
- `<DetailTable>` 接受完整 columns props，或互斥的 `<DetailColumn>` children
- `<ManualTable>` 接受完整 cells / rowKinds props，或互斥的 `<Row>` / `<Cell>` children

完整 props / plain input 是持久化、LLM、程序化构造与 Vanilla 的 authoring 真源。marker 只负责结构：`DetailColumn` 转成同名 plain column；`Row/Cell` 按当前 row 的首个未占槽位放置，并让 span 立即预占未来 rows。两路最终都调用 framework-neutral create / normalize 合同。

### standalone host props

`TableLayoutHostProps` 从 Kernel `LayoutProps` 精确 Pick 已接线的 handlers、尺寸 / viewBox、renderer、animation、idPrefix 与 Core provider props。字段 tuple 与类型通过编译期相等断言保持同步。

Table 不承诺 ScopeStyle、完整 `LayoutProps.compile`、embeddables 或 artifact observer surface。额外 Tier 2 definitions 使用 `composites`，Table Structure / Presentation definitions 使用 `LowerTablesOptions`；两者与 datasets 一起进入同一个 `<Layout ir>` compile。

standalone runtime 构造 canonical `children: [spec]` Scene。`onManifest` 从同次 `onArtifacts` collection 中按 ADR-06 exact root selector 取得 manifest，仅在 React commit 后通知，并按 serialized manifest content 去重。callback identity 变化不触发重 compile 或重复通知；SSR render 不调用 callback。

### embedded 边界

embedded Table 必须有非空稳定 spec id，只贡献 spec、datasets、Table definitions 与额外 composites 给外层 Layout。它不拥有局部 host、compile 或 manifest observer。

adapter 使用 `Object.hasOwn` 检查所有 standalone-only host props、`onManifest` 与 plain JS `embeddables`；即使值显式为 `undefined` 也 fail-loud，并在一个错误中列出字段、提示移动到外层 `<Layout>`。这样不会把“接受但无效果”的 props 伪装成可用能力。

### Vanilla / SSR

`detailTable()` / `manualTable()` 继续直接调用 framework-neutral helpers；`createTableAdapter()` / `embedTable()` 负责宿主组合；`renderTable()` 负责 standalone SSR。

`RenderTableCommonOptions` 复用 Kernel Vanilla 的 `output`、`compile`、`animation`，并增加 `data` 与 `lowerOptions`。standalone 顶层 `composites` 删除，额外 definitions 迁移到 `compile.composites`；embedded `TableEmbedProps.composites` 保留，因为它属于单个 contribution。

`renderTable(spec, { artifacts: true })` 只调用一次 `compileTable()`，返回同源 `{ svg, manifest }`。`artifacts: false` 只省略 sidecar，不改变 Scene、layout 或 compile 次数。

### adapter 等价性

相同 spec、datasets、definitions 与共同可表达的 host inputs 必须在 React / Vanilla / SSR / embedded 中产生同一 Table transaction、Scene geometry 与 manifest。React browser measurer 与 Vanilla custom `compile.measureText` 只有在显式固定相同 measurer 条件时才比较数值；adapter 不伪造跨 host 等价。

## 文档决策

不新增导航层级，更新 `/viz/table`、`model`、`detail` 与三个 reference 页面。zh 为 source of truth，en 同步；schema registry、ApiValues、README、demo、API 表和 breaking migration 与 package root 的真实导出一致。

Reference 覆盖 track variants / overrides、Cell span/layout、fit/overflow、border variants / union / Cell sides / Table defaults，以及 manifest root / track / Cell / border entries。中文为公开 object fields 提供完整翻译；union alias 不伪造字段级翻译。

## 不采用的方案

- 不让 marker 成为唯一入口，也不建立 React 专属领域 schema
- 不复制全部 Layout props；只 Pick runtime 真正支持的 surface
- 不允许 embedded Table 静默忽略 standalone props
- 不保留 Vanilla 顶层 `composites` alias
- 不为 manifest 做第二次 lowering / compile

## 公开影响与兼容性

- ⚠️ BREAKING：React Table 的宿主 surface 改为明确的 `TableLayoutHostProps`；不包含 ScopeStyle / full compile / embeddables
- ⚠️ BREAKING：embedded standalone-only props 从静默忽略改为 presence-sensitive fail-loud
- ⚠️ BREAKING：Vanilla 顶层 `composites` 移至 `compile.composites`
- Detail header/body layout、span-aware markers、animation 与同次 manifest observer 成为正式公开能力
- 不新增 Data Transform、Group/Pivot grammar 或 embedded 局部 observer

## 最终实现与验证

实现集中在 React `Table.tsx`、`table-runtime.ts`、`table-view.tsx`、marker builders，以及 Vanilla runtime / adapter。七个 Table 文档路由、双语 demo、schema registry、ApiValues 与 README 已同步。

正式测试覆盖 props/marker 深等、span occupancy、host prop tuple、embedded presence diagnostics、onManifest commit 时序与去重、nested/repeated id exact root、Vanilla compile options、顶层 composites 拒绝、SSR / embedded composites 与 package boundaries。Table、React、Vanilla 与 docs 类型检查、测试、docs integrity、zh/en 浏览器和 390px 窄屏均通过。

Data Transform、Group/Pivot Table、完整 host compile surface、embedded 局部 observer 与跨 renderer 文字度量统一不在 alpha.2 范围。
