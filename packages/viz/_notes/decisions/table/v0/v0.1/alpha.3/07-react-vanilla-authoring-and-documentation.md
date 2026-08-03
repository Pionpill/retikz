# ADR-07：React / Vanilla authoring、runtime 与文档闭环

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 cascade](./03-cell-selector-and-rule-cascade.md) · [ADR-04 encoding](./04-conditional-visual-encoding-and-scale.md) · [ADR-05 style tokens](./05-style-preset-and-token-resolution.md) · [ADR-06 Legend](./06-standard-legend-consumption-and-traceability.md) · [alpha.2 adapter parity](../alpha.2/07-react-vanilla-authoring-and-documentation.md)

## 背景与目标

Formatter、rules、encodings、style tokens 与 Legend 都是用户可见能力。若只存在于 plain IR，React/Vanilla 作者会建立 callback、theme context 或私有样式映射，破坏同一 TableSpec 的持久化、SSR 与等价编译。

alpha.2 已有 framework-neutral constructors、React marker components、Vanilla helpers、共享 runtime contribution 与 typed manifest。alpha.3 应沿这些入口 additive 扩展，不新增 fluent builder、函数 selector、ReactNode formatter 或 adapter-local Legend。

同时，TableSpec 新增的领域 `style` 与既有 React 宿主 CSS `style` 同名。该冲突必须通过明确的 breaking migration 解决，不能让一个 JSX prop 同时承担两种语义。

## 决策

### 实现前置

本 ADR 依赖 ADR-01～06 的产品契约。ADR-06 的 Standard Legend hard gate 同样约束 adapter/SSR/manifest 路径；Standard capability 不可消费时，不实现或伪造 Legend/Flex 路径。当前只冻结与 Standard nominal contract 无关的 authoring、migration 与 docs obligations；Standard Legend Accepted 后必须与 ADR-06 一起按真实 package-root contract 对齐，再实现完整跨包链路。

### Framework-neutral authoring

`createDetailTableSpec()` 与 `createManualTableSpec()` 的 inputs 继续从 exact schema 派生，并表达：

- root `rules`、`encodings`、`style`、`themeMode`、`styleTokens`、`legendLayout`
- detail column formatter
- plain manual value Cell formatter

Constructors 返回 detached、JSON-safe plain data，不持有调用方数组/object 的可变引用，不创建 callback、class 或 provider instance。省略 style/mode 时 authoring IR 保持省略，Table resolver 才得到 neutral/light。

### React authoring

通用 `<Table>` 继续接收完整 `spec: IRTableSpec`，不把 root fields 镜像成第二套 props。`DetailTable`/`ManualTable` 的 schema-derived root props 增加上述 alpha.3 fields，并逐项转交 framework-neutral constructors；host-only、definition-only 与 callback props 不得进入 IR。

Runtime definition props 精确复用 Table lowering options 的四类开放 definitions：structure、formatter、presentation、visual scale。Style tokens 是 spec plain data，不进入 runtime definitions。

Manual React `Cell` 的公开 union：

- value 与 scalar children 分支接受 `formatter?: IRTableFormatterRef`
- content 分支在类型层拒绝 formatter 与 presentation
- 即使 JavaScript 绕过类型，content + formatter/presentation 也带 row/column identity fail-loud

React 不提供函数 formatter/renderer、函数 selector、Cell/token style callback、CSS class mapping、theme context/hook 或 Table 私有 Legend child。Custom behavior 只通过 `defineTableStructure()`、`defineCellFormatter()`、`defineCellPresentation()`、`defineCellVisualScale()` 注入。

### React `style` migration

TableSpec 的 `style` 保留领域名，在 Detail/Manual JSX 中表示 `neutral | academic | vibrant | clean`。宿主 CSS style 破坏性重命名为 `containerStyle`：

```tsx
<DetailTable style="neutral" containerStyle={{ maxWidth: 720 }} {...props} />
```

- 通用 `<Table>` 的 preset 只来自 `spec.style`，top-level `style` fail-loud，并同时指向 `spec.style` 与 `containerStyle`
- Detail/Manual `style` 只接受 preset string；旧 CSS object 写法 fail-loud，并指向 `containerStyle`
- standalone 三种入口把 `containerStyle` 映射到宿主 Layout style
- embedded 三种入口继续拒绝所有 host-only props，`containerStyle` 进入稳定 unsupported-props diagnostic

不保留旧 CSS `style` overload，不增加 `tableStyle` alias。迁移必须同时由 public types、JavaScript runtime guard、双语 docs 与 changelog 证明。

### Vanilla、SSR 与 runtime contribution

`detailTable()`/`manualTable()` 是 framework-neutral constructors 的无语义包装；`embedTable()` 保留完整 spec；adapter 只按既有 host identity 规则增加 stable id，不改写 formatter、rule、encoding、style 或 Legend fields。

`renderTable()` 通过 lowering options 接受四类 definitions，并在 artifacts 开启时返回 typed Table manifest。SSR 在无 DOM 环境完成 formatter、rule、encoding、style token resolution、Standard Flex/Legend lowering 与 manifest join；相同 measurer/Core options 下与 direct/React 输出等价。

Runtime contribution 对 structure kind、formatter name、presentation name、visual scale name 与 Core composite key 使用同一确定合并语义：同 key 同对象引用幂等，不同引用 fail-loud；输入数组防御复制并冻结，首次出现顺序稳定。Standard Flex/Legend modules 只通过 ADR-06 的共享 Table contribution 加载，adapters 不单独注册或重定义重复语义。

### Manifest consumption

所有 convenience paths 只调用 ADR-06 的 public `resolveTableManifest(artifacts, selector)`：

- direct compile 返回单根 convenience manifest
- React standalone `onManifest` 从宿主 artifacts 解析
- Vanilla SSR 复用 direct compile 结果
- embedded adapters 只把完整 artifact tree 交给宿主，由宿主以 unique tableId 或 exact occurrence 消歧

任何入口都不得查找旧根 artifact、复制 join 或建立 adapter sidecar。Embedded Table 不新增局部 manifest callback，因为多 occurrence 的消歧上下文属于外层 host。

### Breaking Presentation migration

Custom presentation callback 的迁移为：

```ts
// old
present: ({ value, cellId }) => child;

// new
present: ({ rawValue, value, context, appearance }) => child;
```

`cellId` 移到 `context.cellId`；`value` 继续是 formatter output；原 scalar 使用 `rawValue`；provider 需要遵循最终视觉默认时读取 `appearance`。JavaScript runtime 无法可靠检测 callback 解构方式，因此不伪造签名 warning；迁移由 types、docs 与 changelog明确。

### 文档闭环

zh 是 source of truth，en 保持同结构与行为。文档需要同时覆盖：

- 初学者：真实 detail Table 展示 formatter、neutral preset、rule、background encoding、opt-in Legend、clean 迁移与 `containerStyle`
- 深度模型：raw→formatter→style→encoding→rules→presentation→styled child，以及 Table/Standard artifacts、body-local/composition-local coordinates
- Reference：formatter、selector/rule、encoding、style/mode/tokens、legendLayout、definitions、manifest selector/fields 与 diagnostics
- Package README/changelog：public manifest helper、style migration、custom Presentation callback 与默认 style breaking

Demo 必须使用真实 public API 和 compile output，不手写伪 manifest 或复制 pipeline。新增 schema、SourceLink、zh/en demo data/imports 与 docs registry 必须同步；浏览器需验证 desktop 与窄屏下 Table、Legend、代码和 API 表可读。

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

React runtime rows 与 `containerStyle` 不进入 TableSpec；其余 authoring input 必须与 Vanilla/framework-neutral constructors 解析成 schema-equal TableSpec。

## 兼容性与影响

- 三包 authoring additive 增加 alpha.3 fields 与开放 definition options
- BREAKING：React host CSS `style` 改名 `containerStyle`
- BREAKING：custom Presentation callback ABI 改变
- BREAKING：默认视觉从无装饰变为 neutral/light；显式 clean 是迁移入口
- generic artifact consumer 迁移到 public manifest helper
- 用户可见变化必须同步 zh/en docs、demo、API reference、README 与 changelog

## 功能与包边界

- Table package 拥有 schema、definitions、pipeline、manifest 与 diagnostics
- React/Vanilla 只 author、贡献 capabilities 与接入宿主 lifecycle
- Standard 拥有 Legend/Flex；Core/renderer 不读取 adapter 私有语义
- docs 只展示真实 contract，不成为行为真源

## 测试策略摘要

- authoring parity 证明 framework-neutral、React、Vanilla 产生 schema-equal IR
- public/runtime guards 证明 style/containerStyle、manual Cell union 与 Presentation ABI migration
- contribution/SSR 证明四类 definitions、冲突、freeze、Standard modules 与无 DOM 执行
- manifest parity 证明 direct/React/Vanilla/SSR 使用同一 helper、occurrence 与 diagnostics
- docs integrity/browser 证明 schema、SourceLink、demo、README/changelog 与真实输出一致

详细 case、文件/page 清单、路径、命令和正式证据位于对应 ignored mirror plan 的 `PLAN.md` 与 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / authoring、runtime、docs 闭环
- **问题归属**：Table contract 位于主包，adapters 只等价暴露，docs 只说明真实行为
- **内部闭环**：authoring → exact TableSpec → shared contribution → Table/Standard/Core pipeline → artifacts/manifest
- **外部扩展**：custom definitions 在 direct/React/Vanilla/SSR 使用同一 contract 与 conflicts
- **结论**：组合既有 adapters 与 docs，不新增 adapter-only Table capability

## 被否决方案

- 为每个 root field 再建通用 `<Table>` props：产生第二套 authoring contract
- 保留双义 React `style` overload：JS 与 TS 都无法稳定区分领域 preset 和 host CSS
- adapter-local callback/theme/Legend：破坏 JSON、SSR 与跨入口等价性
- 每个 adapter 自行 join artifacts：重复领域逻辑且容易跨 occurrence 误接

## 不在本 ADR 范围

- 新表格类型、group/pivot/matrix、多层 header
- editor、selection、virtual scroll、async state
- React Context theme、CSS variable token、DOM table/ARIA grid
- 自动从 Plot Cell 收集 Legend
