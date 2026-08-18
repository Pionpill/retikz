# ADR-06：React / Vanilla authoring、runtime 与文档闭环

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 cascade](./03-cell-selector-and-rule-cascade.md) · [ADR-04 encoding](./04-conditional-visual-encoding-and-scale.md) · [ADR-05 style tokens](./05-style-preset-and-token-resolution.md) · [alpha.6 ADR-01 Legend](../alpha.6/01-standard-legend-consumption-and-traceability.md) · [alpha.2 adapter parity](../alpha.2/07-react-vanilla-authoring-and-documentation.md)

## 背景与目标

Formatter、rules、encodings、style tokens 与 Legend descriptor 都是用户可见能力。若只存在于 plain IR，React/Vanilla 作者会建立 callback、theme context 或私有样式映射，破坏同一 IRTable 的持久化、SSR 与等价编译。

alpha.2 已有 framework-neutral constructors、React marker components、Vanilla helpers、共享 runtime contribution 与 typed manifest。alpha.3 沿这些入口扩展，不新增 fluent builder、函数 selector、ReactNode formatter 或 adapter-local Legend。

IRTable 的领域 `style` 与 React 宿主 CSS 需要两个不同入口，不能让一个 JSX prop 同时承担两种语义。

## 决策

### 当前闭环与剩余前置

ADR-01～05 的 formatter、presentation、rule、encoding、style 与 descriptor seed 已沿三类入口形成共同产品链路。alpha.3 的 adapter、SSR 与文档只闭合这条已实现链路，不暴露 `legendLayout`、不自动绘制 Legend，也不声明最终 joined manifest；完整 Standard Legend composition 与 occurrence-safe artifact join 由 alpha.6 ADR-01 处理。

### Framework-neutral authoring

`createDetailTableIR()` 与 `createManualTableIR()` 的 inputs 继续从 exact schema 派生，并表达：

- root `rules`、`encodings`、`style`、`themeMode`、`styleTokens`
- detail column formatter
- plain manual value Cell formatter

Constructors 返回 detached、JSON-safe plain data，不持有调用方数组/object 的可变引用，不创建 callback、class 或 provider instance。省略 style/mode 时 authoring IR 保持省略，Table resolver 才得到 neutral/light。

### React authoring

通用 `<Table>` 继续接收完整 `spec: IRTable`，不把 root fields 镜像成第二套 props。`DetailTable`/`ManualTable` 的 schema-derived root props 增加上述 alpha.3 fields，并逐项转交 framework-neutral constructors；host-only、definition-only 与 callback props 不得进入 IR。

Runtime definition props 精确复用 Table lowering options 的四类开放 definitions：structure、formatter、presentation、visual scale。Style tokens 是 spec plain data，不进入 runtime definitions。

Manual React `Cell` 的公开 union：

- value 与 scalar children 分支接受 `formatter?: IRTableFormatterRef`
- content 分支在类型层拒绝 formatter 与 presentation
- 即使 JavaScript 绕过类型，content + formatter/presentation 也带 row/column identity fail-loud

React 不提供函数 formatter/renderer、函数 selector、Cell/token style callback、CSS class mapping、theme context/hook 或 Table 私有 Legend child。Custom behavior 只通过 `defineTableStructure()`、`defineCellFormatter()`、`defineCellPresentation()`、`defineCellVisualScale()` 注入。

### React `style` ownership

IRTable 的 `style` 保留领域名，在 Detail / Manual JSX 中表示 `neutral | academic | vibrant | clean`。standalone 宿主 CSS 使用 `containerStyle`：

```tsx
<DetailTable style="neutral" containerStyle={{ maxWidth: 720 }} {...props} />
```

- 通用 `<Table>` 的 preset 只来自 `spec.style`，top-level `style` fail-loud，并同时指向 `spec.style` 与 `containerStyle`
- Detail / Manual `style` 只接受 preset string；CSS object fail-loud，并指向 `containerStyle`
- standalone 三种入口把 `containerStyle` 映射到宿主 Layout style
- embedded 三种入口继续拒绝所有 host-only props，`containerStyle` 进入稳定 unsupported-props diagnostic

不增加双义 `style` overload 或 `tableStyle` alias。public types、JavaScript runtime guard 与双语 docs 共同说明这两个入口。

### Vanilla、SSR 与 runtime contribution

`detailTable()` / `manualTable()` 是 framework-neutral constructors 的无语义包装；`embedTable()` 保留完整 spec；adapter 只按 host identity 规则增加 stable id，不改写 formatter、rule、encoding 或 style fields。

`renderTable()` 通过 lowering options 接受四类 definitions，并在 artifacts 开启时返回同次 compile 的 typed Table manifest。SSR 在无 DOM 环境完成 formatter、rule、encoding、style token resolution 与 Table lowering；相同 measurer / Core options 下与 direct / React 输出等价。

Runtime contribution 对 structure kind、formatter name、presentation name、visual scale name 与 Core composite key 使用同一确定合并语义：同 key 同对象引用幂等，不同引用 fail-loud；输入数组防御复制并冻结，首次出现顺序稳定。未来 Standard Flex / Legend Definitions 只通过 alpha.6 ADR-01 的共享 Table contribution 传入，adapters 不单独注册或重定义重复语义。

### Manifest consumption

当前 convenience paths 复用同一个 typed artifact contract：

- direct `compileTable()` 返回 canonical 单根 Table 的 exact root manifest
- React standalone `onManifest` 只选择 `children[0]` 的 exact root Table artifact
- Vanilla SSR 复用 direct compile 结果
- embedded adapters 只把完整 artifact tree 交给外层 host，由宿主按 occurrence 消歧

任何入口都不得按公开 table id 猜测 occurrence、复制 manifest 或建立 adapter sidecar。alpha.6 扩展 Legend artifact join 时只能沿用同一 occurrence 主链。

### Presentation callback ABI

Custom Presentation 使用 `present({ rawValue, value, context, appearance })`。`context.cellId` 提供 Cell identity；`value` 是 formatter output；`rawValue` 保留原 scalar；`appearance` 是 preset、tokens、Cell 配置、encodings 与 rules 解析后的最终外观。Presentation 返回 JSON-safe Core child，不接收 adapter 或 DOM 状态。

### 文档闭环

zh 是 source of truth，en 保持同结构与行为。文档需要同时覆盖：

- 初学者：真实 detail Table 展示 formatter、neutral preset、rule、background encoding、clean preset 与 `containerStyle`
- 深度模型：raw → formatter → style → encoding → rules → presentation → styled child，以及 Table-local coordinates / manifest
- Reference：formatter、selector / rule、encoding、style / mode / tokens、四类 definitions、visual scale resolution、manifest fields 与 diagnostics
- Package README / changelog：当前 authoring、runtime、descriptor seed 与 Standard Legend 边界

Demo 必须使用真实 public API 和 compile output，不手写伪 manifest 或复制 pipeline。alpha.3 不展示伪 Legend、`legendLayout` 或 joined manifest；这些内容随 alpha.6 的真实产品链路补齐。新增 schema、SourceLink、zh / en demo data / imports 与 docs registry 必须同步。

## DSL 表面

```tsx
<DetailTable
  id="sales"
  dataRef="sales"
  data={salesRows}
  style="neutral"
  themeMode="light"
  containerStyle={{ maxWidth: 720 }}
  encodings={revenueEncodings}
>
  <DetailColumn id="revenue" field="revenue" formatter={{ name: 'number', options: { specifier: '$,.2f' } }} />
</DetailTable>
```

React runtime rows 与 `containerStyle` 不进入 IRTable；其余 authoring input 必须与 Vanilla/framework-neutral constructors 解析成 schema-equal IRTable。

## 影响

- 三包 authoring 增加 alpha.3 fields 与开放 definition options
- React Table preset 使用 `style`，standalone host CSS 使用 `containerStyle`
- custom Presentation 使用 `rawValue` / `value` / `context` / `appearance` ABI
- 默认视觉为 neutral / light；显式 clean 提供无装饰视觉
- manifest consumer 使用同次 compile 的 exact occurrence artifact
- 用户可见变化必须同步 zh/en docs、demo、API reference、README 与 changelog

## 功能与包边界

- Table package 拥有 schema、definitions、pipeline、manifest 与 diagnostics
- React/Vanilla 只 author、贡献 capabilities 与接入宿主 lifecycle
- Standard 拥有 Legend/Flex；Core/renderer 不读取 adapter 私有语义
- docs 只展示真实 contract，不成为行为真源

## 长期边界

- 新表格类型、group/pivot/matrix、多层 header
- editor、selection、virtual scroll、async state
- React Context theme、CSS variable token、DOM table/ARIA grid
- 自动从 Plot Cell 收集 Legend
