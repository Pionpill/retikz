# ADR-06：Table React / Vanilla 最薄绑定

- 状态：Proposed
- 决策日期：2026-07-19
- 关联：[table v0 roadmap](../../roadmap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

只有 `@retikz/table` IR 与 lowering，用户仍需手动包 Scene、注册 composites 和调用 renderer。alpha.1 必须同时验证 React 与 Vanilla，避免后续 adapter 为便利性私自发明另一套 Table schema。

现有 Plot adapter 已验证两条模式：React 用 `<Layout>` + composite definitions，Vanilla 用 `compileToScene` + `renderToSvgString`。Table 应复用同一宿主能力，但只暴露 Table-specific authoring。

## 决策：三包 lockstep，adapter 只构造 TableSpec 与接线 runtime

### React

`@retikz/table-react` 提供两条互斥入口：

```tsx
<Table spec={tableSpec} data={{ sales: rows }} composites={lowerPlots({ trend: trendRows })} />

<Table
  id="sales-table"
  dataRef="sales"
  data={rows}
  columns={[
    { id: 'product', field: 'product', header: 'Product' },
    { id: 'revenue', field: 'revenue', header: 'Revenue' },
  ]}
/>
```

- 两种模式共享 `width`、`height`、`className`、`style`、`renderer`、`composites` 与 Table lowering options；前五项直接透传 `<Layout>`
- spec mode：`spec: IRTableSpec` + `data: ExternalDatasets`
- list mode：`dataRef: string` + `data: Array<ExternalRow>` + `columns`
- list mode 只把 string header sugar 展开为 `{ kind: 'value', value: header }`
- `id`、`layout`、custom structure/presentation definitions 进入普通 TableSpec / lowering options
- standalone `onManifest` 存在时同步计算 artifact、再由 effect 按序列化内容去重通知；省略时不计算 sidecar
- `composites` 是 nested Tier 2 的宿主逃生舱；standalone 合并为 `[...lowerTables(...), ...composites]` 后交 `<Layout>`，重复 namespace/type 由 Core registry fail-loud
- `<Table>` 使用 `@retikz/react` `<Layout>`，并实现 Tier 2 embeddable adapter；嵌入态把 `composites` 随 Table runtime envelope 一并聚合进 `makeComposites`
- `onManifest` 仅支持 standalone；嵌入 `<Layout>` 时 embeddable `contribute` 若看到该 prop 必须 fail-loud，并提示宿主对 spec 显式调用 `lowerTableWithArtifacts`
- ReactNode 不进入 Table IR；alpha.1 不提供 JSX Cell children DSL

#### Embedded 多实例聚合

每个 embedded Table 在 datasets 中附加一个以 module-local `Symbol` 标识、唯一 runtime reference 承载的 envelope：

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

`@retikz/table-vanilla` 提供：

```ts
const spec = tableBuilder({ id: 'sales-table', dataRef: 'sales' })
  .column({ id: 'product', field: 'product', header: 'Product' })
  .column({ id: 'revenue', field: 'revenue', header: 'Revenue' })
  .build();

const svg = renderTable(spec, { sales: rows }, { composites: lowerPlots({ trend: trendRows }) });
const result = renderTable(spec, { sales: rows }, { artifacts: true, output: { width: 480 } });
```

- `tableBuilder()` 只生成 list TableSpec，不保存 runtime dataset
- `renderTable()` 先 `TableSpecSchema.parse`，再经 `lowerTables`、`compileToScene` 与 `renderToSvgString`
- `composites` 与 Table definitions 合并后进入 `CompileOptions.composites`，语义与 React 相同
- `output.width` / `output.height` / `output.idPrefix` 只控制 SVG 宿主输出，不改变 Table 固定轨道几何
- `{ artifacts: true }` 返回 `{ svg, manifest }`；缺省返回 SVG string
- builder 与 render 保持 SSR-safe，不读取 DOM 全局

### Package

两个 adapter 版本均为 `0.1.0-alpha.1`，标记 `domain: "viz"`、`releaseGroup: "table"`、`layer: "adapter"`、`publishable: true`。React / React DOM 为 peerDependencies；table-react 依赖 core/data/react，table-vanilla 依赖 core/data/vanilla，均用 `workspace:^`，两个 adapter 对 `@retikz/table` 使用 `workspace:*`。

adapter scaffold 落地的同一改动必须把 release group 从单成员扩为三个最终成员，同步根 viz 四类脚本、三个 publish artifact 实测预算和 release-group fixture，确保任一验证点都不引用不存在的 package。

理由：

1. spec/list 两条入口覆盖 AI/高级用户与常见明细表 authoring
2. 两个 adapter 只拼装同一 TableSpec，不复制结构、布局和 lowering
3. 与现有 React / Vanilla runtime 接线一致，SSR 与 renderer 选择留在 kernel adapter

React `onManifest` 固定采用“render 中纯计算、effect 去重通知”；不得在 render 中执行用户 callback。Vanilla 开关固定命名为 `artifacts`，为 alpha.6 additive artifact 字段保留统一返回模式。

## DSL 表面

见“决策”中的 React 与 Vanilla 示例。两条 authoring 入口最终必须得到相同 `IRTableSpec`：

```ts
const expected = columns.reduce((builder, column) => builder.column(column), tableBuilder(options)).build();
expect(buildReactListSpec(props)).toEqual(expected);
```

## 测试设计

- React spec mode 渲染 manual/list
- React list mode 生成确定 data reference 与 header payload
- React onManifest 只按内容变化通知
- embedded Table 携带 onManifest fail-loud，不静默丢回调
- 两个 embedded Table 的同引用 definitions/composites 去重，不同 key 合并，同 key 不同对象 fail-loud
- Vanilla builder 与手写 TableSpec 等价
- renderTable 缺省返回 string，artifact mode 返回 sidecar
- React / Vanilla 对同一 spec 输出相同 Scene/SVG 语义
- React display size 与 Vanilla output size 不回写 TableSpec 或改变 manifest bounds
- React / Vanilla 都能注入额外 composite definitions；未注入的 nested composite 沿用 Core warning，adapter 不宣称其已渲染
- alpha.1 的 nested Plot fixture 只验证显式局部定位后的注册、递归 lowering 与 adapter parity；自动测量、fit 和 clip 由 alpha.2 fixture 验收
- 两个 adapter 不复制 schema/layout/lowering，不依赖 Plot
- SSR 环境无 window/document
- release-group、viz scripts 与 publish artifact checker 覆盖最终三个 Table packages

## 影响

- 初始化 `@retikz/table-react` 与 `@retikz/table-vanilla` npm packages
- 新增用户可见 `<Table>`、`tableBuilder` 与 `renderTable`
- alpha.1 需要在 `apps/docs` 建立 Table introduction / usage / API 基础页面和 demo，并同步 zh/en、导航与 i18n
- 三包从 alpha.1 起 lockstep，后续能力必须保持 adapter 等价或明确不适用理由

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / adapter 闭环
- 解决的问题：让同一 TableSpec 在 React、Vanilla、SSR 与 renderer host 中可用
- 主责包与协作包：Table 主责领域；table-react/table-vanilla 主责接线；kernel adapters 执行宿主能力
- 是否可由现有能力组合：复用 React Layout、Vanilla compile/render；只新增 Table authoring
- 是否需要下沉：无；通用 runtime 能力继续留 kernel adapter
- 内部表达链路：props/builder → IRTableSpec → lowerTables → Core
- 外部扩展链路：Table definitions 透传到 `@retikz/table` options；nested Tier 2 definitions 经两套 adapter 的同名 `composites` 宿主通道注入
- pipeline / lowering 与下游消费：两个 adapter 调同一公开 API
- React / Vanilla adapter 等价性：spec mode、list authoring 与 artifact 行为有交叉测试
- provenance / lineage / locator：alpha.1 暴露 manifest；alpha.6 扩展 artifact result
- 本轮结论：上移 authoring / runtime 到 adapter，不在 adapter 实现领域算法

## 不在本 ADR 范围

- JSX `<Cell>` / `<Row>` manual DSL
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
- `packages/viz/table-react/src/table-runtime.ts`
- `packages/viz/table-react/src/embedded-runtime.ts`
- `packages/viz/table-react/tests/**`
- `packages/viz/table-vanilla/{package.json,tsconfig.json,vite.config.ts,README.md,LICENSE}`
- `packages/viz/table-vanilla/src/index.ts`
- `packages/viz/table-vanilla/src/table-builder.ts`
- `packages/viz/table-vanilla/src/render-table.ts`
- `packages/viz/table-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/components/table/**`
- `apps/docs/src/modules/docs/data/viz.ts`
- `apps/docs/src/modules/docs/data/types.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- `scripts/release-groups.config.mjs`
- `scripts/check-release-groups.test.mjs`
- `scripts/publish-artifact-limits.json`
- 根 `package.json`
- `pnpm-lock.yaml`

### 测试象限

**Happy path**：React spec/list；embedded Table；Vanilla builder/render；artifact mode。

**边界**：空 list dataset；单 column；无 id；custom definition options；SSR；两个 embedded Table 共享同一 definition 对象。

**错误路径**：互斥 props 混用；缺 dataRef；非法 spec；missing dataset；unregistered provider；embedded onManifest；同 structure/presentation/composite key 的不同 definition 对象；未来 shared lower option 冲突。

**交互**：React/Vanilla spec parity；renderer parity；standalone onManifest 去重；两个 embedded Table 的相同/不同 runtime definitions 聚合；显式局部定位的 nested Plot composite 通过两套 `composites` 通道注册后可渲染；最终三包 release-group 检查通过。

### 依赖的现有元素

- `Layout`、`EmbeddableTier2Adapter`（`@retikz/react`）——React host / embedding
- `CompositeDefinition`、`compileToScene`（`@retikz/core`）——nested Tier 2 注入与 Vanilla compile
- `renderToSvgString`（`@retikz/vanilla`）——SSR output
- `ExternalDatasets` / `ExternalRow`（`@retikz/data`）——runtime data
- `IRTableSpec`、`lowerTables`、`lowerTableWithArtifacts`（ADR-01/05）——唯一领域入口
