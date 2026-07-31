# ADR-07：React / Vanilla authoring、runtime 与文档闭环

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01～06](./01-cell-formatter-and-formatted-value.md) · [alpha.2 adapter parity](../alpha.2/07-react-vanilla-authoring-and-documentation.md) · [Table docs](../../../../../../../../apps/docs/src/modules/docs/contents/viz/table)

## 背景

alpha.3 的 formatter、rules、encodings、theme 与 Legend 都是用户可见能力。若只在 `@retikz/table` plain IR 中存在，React / Vanilla 作者会各自建立 convenience callback、theme context 或 runtime definition 合并，破坏同一 TableSpec 的持久化与等价编译。

alpha.2 已有 framework-neutral helpers、React marker components、Vanilla plain helpers、共享 runtime contribution 与 typed manifest。alpha.3 应沿这些入口做 additive authoring，不增加 fluent builder、函数 selector、ReactNode formatter 或 adapter 私有 Legend。

文档需要分层：明细表页面让初学者直接看到常见 formatter、theme 和条件颜色；表格模型的“内容呈现 / 产物与追溯”解释 Definition、级联与 artifacts。不能要求初学者先理解完整 pipeline 才能画一张常见表。

## 决策：两套 adapter 只构造同一 IR，并共享全部 Definition / artifact 接线

### Framework-neutral authoring

`createDetailTableSpec()` / `createManualTableSpec()` 的 input types 从 schema 派生。ADR-01 已使 detail column 与 plain manual value Cell 自动获得 `formatter`；本 ADR 对最终 root 能力与三入口 parity 收口：

- root `rules`
- root `encodings`
- root `theme`
- root `legendLayout`
- 已由 ADR-01 schema 派生的 detail / plain manual formatter

helpers 继续调用对应 exact schema，返回 plain frozen JSON data，不创建方法、callback、class 或 provider instance。

### React authoring

各能力 ADR 已分别把 Definition options 接入 `LowerTablesOptions` 与共享 runtime contribution。ADR-07 负责把最终五类 options 在公开 props、类型说明与整体验证中收口，不重新实现 registry / merge：

```ts
type TableRuntimeDefinitionProps = {
  structureDefinitions?: ReadonlyArray<AnyTableStructureDefinition>;
  formatterDefinitions?: ReadonlyArray<AnyCellFormatterDefinition>;
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>;
  visualScaleDefinitions?: ReadonlyArray<AnyCellVisualScaleDefinition>;
  themeDefinitions?: ReadonlyArray<TableThemeDefinition>;
};
```

`Table` / `DetailTable` / `ManualTable` 的 spec props 增加 root rules / encodings / theme / legendLayout。`DetailColumnProps` 已在 ADR-01 随 schema-derived `TableDetailColumnInput` 自动获得 formatter；本 ADR 只为手写 union 的 React manual value `Cell` 增加 `formatter?: IRTableFormatterRef`，content Cell 继续以 `formatter?: never`、`presentation?: never` 在类型层拒绝。

React 不提供：

- `(value, row) => ReactNode` formatter / cell renderer
- `(cell) => boolean` selector
- style callback、CSS class、theme context 或 hook
- Legend component 作为 Table 私有 child

custom capability 通过 `defineCellFormatter()`、`defineCellPresentation()`、`defineCellVisualScale()`、`defineTableTheme()` 后作为 Definition prop 注入。JSX children 只负责现有 manual authoring markers。

### Vanilla authoring

`detailTable()` / `manualTable()` 的 plain inputs 与 framework-neutral schema 等价，增加相同 root / column / Cell fields。`createTableAdapter()`、`embedTable()`、`renderTable()` 只增加 Definition options 与 typed artifact 返回，不新增 fluent chain 或 callback shorthand。

Vanilla SSR 在无 DOM 环境完成 formatter、rules、encodings、theme、Standard Legend lowering 与 manifest；同一 measurer / Core compile options 下与 React 输出等价。

### Runtime contribution

Table runtime envelope 由 ADR-01 / ADR-04 / ADR-05 增量加入 formatter / visualScale / theme definitions；本 ADR 对完整集合做统一 parity / conflict 验收：

```text
structure kind
formatter name
presentation name
visual scale name
theme name
Core composite namespace/type
```

同 key 同对象引用幂等合并；同 key 不同引用 fail-loud。definition 数组复制并冻结，不持有调用方可变数组。

Standard Legend capability 只通过 ADR-06 的 Table contribution 合并。React / Vanilla 不单独 import/register Legend，也不拥有重复 module 规则。

### API 与迁移

alpha.3 需要明确记录 custom presentation 的 breaking callback：

```ts
// alpha.2
present: ({ value, cellId }) => child;

// alpha.3
present: ({ rawValue, value, context, appearance }) => child;
```

不保留旧 overload。迁移说明同时展示：

- `cellId` → `context.cellId`
- formatter 后值继续叫 `value`
- 原 scalar 使用 `rawValue`
- provider 若要遵守 theme/rule defaults，读取 `appearance` 或让 Table 的 Core Scope wrapper应用 defaults

JavaScript runtime 无法可靠判断 callback 是否使用旧参数解构，因此不伪造运行时签名探测或 migration warning。迁移由 public type contract、changelog 与文档明确完成；provider 产出非法 Core child 时仍使用既有 presentation name / Cell id 诊断。

### 文档结构

zh 为真源，en 结构同步。

初学者路径：

- `/viz/table/detail`：增加 number formatter、grid theme、negative-value rule、background color encoding 与 opt-in Legend 的完整 demo
- Table landing：说明 alpha.3 能力与“常用表类型直接阅读、表格模型供深度扩展”的入口关系

深度用户路径：

- `/viz/table/model/presentation`：扩展为 raw value → formatter → rule/encoding/theme cascade → presentation → styled `IRChild`，解释 value/content 差异
- `/viz/table/model/manifest`：增加 Cell → rule/encoding → Legend occurrence / Standard artifact 的追溯示意
- `/viz/table/reference/contract-table`：列出 formatter、selector/rule、encoding、theme、legendLayout schema
- `/viz/table/reference/contract-detail`：列出 detail column formatter 与 root presentation fields
- `/viz/table/reference/manifest`：列出新增 Cell / encoding / Legend manifest fields
- `/viz/table/reference/runtime`：列出五类 definitions、runtime contribution 合并与 Standard capability

Demo 必须使用真实 public API 与真实 compile output，不手写伪 manifest 或复制 pipeline 算法。SourceLink 精确覆盖新增 schema / contract / provider / pipeline 入口。

### 验证与可观察证据

- schema / public API / React / Vanilla / SSR tests
- `@retikz/table`、`table-react`、`table-vanilla` eslint / tsc / changed tests
- docs TypeScript、docs integrity、schema registry / import generator（若受影响）
- 真实浏览器检查 `/viz/table/detail`、`/viz/table/model/presentation`、`/viz/table/model/manifest`
- desktop 与 500px 宽度；Legend 不遮挡表格，代码 / API 表横向行为可用

## DSL 表面

```tsx
<DetailTable
  id="sales"
  data={{ reference: 'sales' }}
  theme={{ name: 'grid' }}
  encodings={[
    {
      id: 'revenue-heat',
      selector: { fields: ['revenue'] },
      channel: 'backgroundFill',
      scale: { name: 'sequential-color' },
      legend: { title: 'Revenue' },
    },
  ]}
>
  <DetailColumn id="revenue" field="revenue" formatter={{ name: 'number', options: { specifier: '$,.2f' } }} />
</DetailTable>
```

```ts
const spec = detailTable({
  id: 'sales',
  data: { reference: 'sales' },
  theme: { name: 'grid' },
  structure: {
    kind: 'detail',
    columns: [
      {
        id: 'revenue',
        field: 'revenue',
        formatter: { name: 'number', options: { specifier: '$,.2f' } },
      },
    ],
  },
  encodings: revenueEncodings,
});
```

两段必须解析为等价 TableSpec。

## 测试设计

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-07.md`。长期摘要：

- framework-neutral / React / Vanilla 同一输入生成等价 IR
- 五类 definitions 在单表、多表、冲突、SSR 与 direct compile 中同路
- custom presentation breaking migration 的精确类型拒绝、新 contract runtime dispatch 与既有 provider output diagnostics
- docs demo / SourceLink / API tables 与真实 schema、manifest、artifacts 一致
- desktop / narrow browser 的表格、Legend、图示与代码阅读体验

## 影响

- 三包 public authoring 与 runtime options 增加 alpha.3 fields / definitions
- custom presentation callback 发生 0.x breaking migration
- docs 现有 Table 页面更新，不新增“表格类型”分组
- changelog 草稿在 wrapup 阶段记录 alpha.3 能力与迁移

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / authoring、runtime、docs 端到端闭环
- **解决的问题**：让同一 alpha.3 Table grammar 在 framework-neutral、React、Vanilla、SSR 与 docs 中等价可用
- **主责包与协作包**：Table 拥有 schema/definitions/pipeline；adapters 只 author/connect；docs 展示真实行为
- **是否可由现有能力组合**：alpha.2 adapter/runtime 主链可扩展，不新增 adapter capability
- **是否需要下沉**：无；Standard Legend loading 由 ADR-06 的主责链路处理
- **内部表达链路**：authoring → exact TableSpec → shared definitions/contribution → Table pipeline → Core Scene + artifacts
- **外部扩展链路**：custom definitions 在两 adapter 使用相同 contract 与 conflict diagnostics
- **下游执行 / adapter 等价性**：direct / React / Vanilla / SSR 具有自动化与浏览器证据
- **不支持边界与诊断**：不提供 callback sugar、DOM style、adapter theme/Legend；错误来自同一 schema/pipeline
- **本轮结论**：组合现有 adapters 与 docs，补齐 Table alpha.3 纵向闭环

## 不在本 ADR 范围

- 新表格类型、group/pivot/matrix、多层 header
- editor、selection、virtual scroll、async state
- React Context theme、DOM table / ARIA grid
- 自动从 Plot Cell 收集 Legend

---

## 实现契约

### Level

`yellow`：adapter public props / runtime behavior 与 docs demo；依赖 ADR-01～06 的 red schema / pipeline 已完成。

### Schema 改动

无新增 schema。本 ADR 只消费 ADR-01～06 已冻结的 Table schema-derived types。

### 文件 scope

- `packages/viz/table/src/contract/authoring/**`
- `packages/viz/table-react/src/**` 与 `tests/**`
- `packages/viz/table-vanilla/src/**` 与 `tests/**`
- `packages/viz/table/tests/{authoring,pipeline,public-api}/**`
- `apps/docs/src/modules/docs/contents/viz/table/{index,detail,model/presentation,model/manifest,reference/contract-table,reference/contract-detail,reference/manifest,reference/runtime}/**`
- 受新增 demo / registry 影响的 docs contents data / i18n / schema registry 文件
- `apps/docs/src/modules/docs/data/changelog/viz-0-1.ts`（wrapup 草稿）

### 测试象限

**Happy path**

- ADR-01 已覆盖的 React DetailColumn 与 Vanilla/plain helpers，以及本 ADR 补齐的 React manual Cell，生成相同 formatter refs
- root rules / encodings / theme / legendLayout 在三类 authoring 中等价
- custom five-definition set 在 direct / React / Vanilla / SSR 工作

**边界**

- optional fields 省略、empty rules/encodings、no Legend、content Cell type exclusions
- 同一宿主多个 Table 共享同一 definition object
- narrow docs viewport 的 Table / Legend / code / API table

**错误路径**

- React value/content 冲突、content formatter/presentation、bad spec 与 contribution key conflicts
- custom presentation 旧 callback 在 public type contract 中失败；新 callback 经 runtime registry 正常 dispatch
- docs demo / SourceLink / schema registry 漂移由 integrity check 捕获

**交互**

- formatter + theme + encoding + rule + Legend 的完整明细表
- custom presentation 消费 appearance，direct content 走 Core Scope defaults
- React / Vanilla Scene、Table manifest、nested Standard artifact 等价
- docs controls（若新增）不会产生函数型 IR 或 adapter-only state

### 依赖的现有元素

- ADR-01～06 的 schema、definitions、pipeline、manifest 与 Standard capability gate
- alpha.2 framework-neutral helpers、React markers、Vanilla helpers、runtime contribution
- docs `ComponentPreview`、SourceLink、Table model/reference page conventions
