# ADR-02：Presentation context 与 Cell appearance

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [alpha.1 Cell presentation](../alpha.1/03-cell-presentation.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景

alpha.1 的 `CellPresentationInput` 只有 scalar `value` 与 `cellId`。这足以生成基础 text，却不能让 presentation 区分 header / body、读取 raw 与 formatted value、消费 theme / rule 解析后的视觉默认，或在不依赖完整 pipeline model 的前提下保留来源上下文。

alpha.3 还需要一个由 rule、conditional encoding 与 theme 共同写入的 Cell 视觉目标。若每项能力直接修改 Core child，会出现三套互不兼容的 style merge；若只允许 presentation 自己绘制背景和边框，则 direct content 与 custom presentation 无法共享同一 Cell box 语义。

Cell appearance 必须区分三层：Cell box 背景、内容的 Core 级联默认、Border Graph 候选。背景和 border 属于 Table Cell，不进入任意 child 内部；内容默认复用 Core Scope 的公开 style channels，不建立 Table 私有图元样式系统。

## 决策：扩展 Presentation context，并建立 JSON-safe Cell appearance

### Appearance schema

新增 `IRTableCellAppearance`：

```ts
type IRTableCellBackground = {
  fill: IRPaintValue;
  fillOpacity?: number;
};

type IRTableCellContentStyle = {
  color?: string;
  fill?: IRPaintValue;
  fillOpacity?: number;
  stroke?: IRPaintValue;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  nodeDefault?: IRNodeDefault;
  pathDefault?: IRPathDefault;
  labelDefault?: IRLabelDefault;
  arrowDefault?: IRArrowDefault;
  resetStyle?: boolean | Array<StyleChannel>;
};

type IRTableCellAppearance = {
  background?: IRTableCellBackground;
  content?: IRTableCellContentStyle;
  borders?: IRTableCellBorders;
};
```

`IRTableCellContentStyle` 的字段与 Core `ScopeSchema` 对应公开 style/default channels 精确复用，不复制 primitive schema。它不接受 `children`、transform、placement、clip、id、meta、animation 或 bounding shape。

`background.fill: 'none'` 表达显式无背景；`fillOpacity` 省略为 `1`。`borders` 复用 alpha.2 的 `TableCellBordersSchema`，包括 `{ kind: 'none' }` 的显式抑制语义。appearance 不包含 span、track size、padding、alignment、fit、overflow 或 wrap；这些仍属于 Layout。

### Presentation input

`CellPresentationInput` 改为：

```ts
type CellPresentationInput = Readonly<{
  rawValue: IRDataScalarValue;
  value: IRDataScalarValue;
  context: TableCellContext;
  appearance: DeepReadonly<IRTableCellAppearance>;
}>;
```

- `rawValue` 来自 canonical payload，供 presentation 在确需原始数值时使用
- `value` 是 ADR-01 formatter 的输出，是 presentation 默认展示对象
- `context` 是 formatter / presentation 共用的最小 Cell identity
- `appearance` 是 theme、rule 与 encoding 级联后的最终视觉输入；本 ADR 不增加直接 Cell appearance authoring 字段

这是 0.x 的 breaking contract：custom presentation 从 `{ value, cellId }` 迁移到 `{ rawValue, value, context, appearance }`。不保留旧 callback overload 或 alias。

Presentation Definition 仍只返回一个 `IRChild`，options 与产物继续经过 alpha.1 的 JSON/Core guard。definition 不接收 layout result、Cell box 尺寸、Core compile context 或 renderer；需要受约束尺寸的复合内容应返回合法 layout-aware composite，而不是读取 Table 内部状态。

### Content style wrapper

Presentation 输出与 direct content 都在测量前经过同一个纯转换：

```text
authored / presented IRChild
  ── empty content style ──▶ unchanged child
  ── nonempty style ───────▶ Core Scope(style channels, children: [child])
```

wrapper 使用 Table-local anonymous Scope，不创建可定位 id，不覆盖 child 显式 style。它必须在 natural / constrained probe 之前进入 Core layout-aware compile，因此 font、strokeWidth 等可能影响测量的 defaults 与最终 replay 同源。Table 不在 probe 后补样式，也不回读 Scene。

背景不参与 child intrinsic contribution。layout 得到全部 Cell box 后，Table lowering 使用以下固定 Core IR 语义：

- 背景是沿 Cell box 四角闭合的矩形 path，显式写入 resolved `fill`、`fillOpacity`、`stroke: 'none'` 与 `strokeOpacity: 0`
- 背景不设置独立 `id` / `meta`，不产生 border candidate，也不继承外层 Scope 的 stroke
- `fill: 'none'`、resolved `fillOpacity: 0` 或宽高任一为 `0` 时不发出背景 primitive
- 全表 draw order 固定为“全部可见 Cell 背景 → 全部 Cell 内容 → Border Graph”，不按 Cell 交错背景与内容

背景不能扩大 track 或 content intrinsic，但可见背景是 Table 的真实可见贡献：所属 `TableCellLayout.visualOverflowBounds` 以内容可见范围与 Cell box 取并集，`TableLayout.visualOverflowBounds` 与最终 Scene bounds 同样包含该 Cell box。allocation bounds、content box 与 source bounds 不因背景改变。ADR-06 的 manifest 复用这些 layout bounds，并把背景贡献归到所属 Cell，不创建独立可定位实体。

appearance borders 在 Border Graph 构建前与 semantic Cell 的显式 `layout.borders` 合并；具体 cascade 由 ADR-03 / ADR-05 冻结。Border Graph、冲突优先级与线段合并算法不改变。

### PresentedTableModel

`PresentedTableCell` 保留 payload discriminator，而不是用可选字段表达互斥状态：

```ts
type PresentedTableCell =
  | Readonly<{
      kind: 'value';
      cellId: string;
      rawValue: IRDataScalarValue;
      value: IRDataScalarValue;
      formatterName: string;
      presentationName: string;
      appearance: DeepReadonly<IRTableCellAppearance>;
      content: IRChild;
    }>
  | Readonly<{
      kind: 'content';
      cellId: string;
      appearance: DeepReadonly<IRTableCellAppearance>;
      content: IRChild;
    }>;
```

`FormattedTableCell.kind` 决定唯一映射：value 分支执行 Presentation 并完整保留 raw / formatted / formatter / presentation trace；content 分支直接保留 `IRChild`，类型上不存在这些 value trace 字段。pipeline 在 Presented model 边界逐 Cell 校验 kind、identity 与 semantic payload 一致，非法混合状态 fail-loud。所有 Cell 仍与 semantic model 等长、同序、同 id。appearance、wrapper 和 provider output 全部 detached / recursively frozen。

## DSL 表面

```ts
const warningCell = {
  value: 0.87,
  formatter: { name: 'number', options: { specifier: '.0%' } },
  presentation: { name: 'text' },
};

const warningAppearance = {
  background: { fill: '#fff4e5' },
  content: {
    nodeDefault: {
      textColor: '#9a4d00',
      font: { weight: 600 },
    },
  },
};
```

`warningAppearance` 由后续 theme / rule / encoding 产生，不直接塞进 formatter options。

## 测试设计

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-02.md`。长期摘要：

- appearance schema 精确复用 Core style/default 与 Table border schema，并拒绝 layout / transform / children
- custom presentation 同时观察 raw、formatted、context 与最终 appearance
- public type contract 证明旧顶层 `cellId` callback 与 overload 已删除，Table / React / Vanilla 共用同一新输入类型
- content style wrapper 在 probe 与 replay 使用同一 child，显式 child style 优先
- background 显式隔离 stroke，全表位于内容后方，贡献可见 bounds 但不贡献轨道尺寸
- direct content 与 value presentation 共享 style / background / border 路径

## 影响

- ⚠️ BREAKING：`CellPresentationInput` callback 参数形状改变，custom definitions 需要迁移
- 新增 public appearance schema / types，供 rules、visual encodings 与 themes 共同消费
- `PresentedTableModel` 增加 raw / formatted / provider / appearance trace
- layout transaction 在 probe 前接收 appearance-wrapped content
- lowering 增加 Cell background contribution；manifest 后续由 ADR-06 暴露

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Cell Semantics、Presentation、Layout 协作边界
- **解决的问题**：让多种呈现策略共享 Cell box 视觉目标，同时继续以任意 Core `IRChild` 为内容边界
- **主责包与协作包**：Table 拥有 Cell appearance 与 background/border 语义；Core 拥有 style cascade、measurement 与 IR
- **是否可由现有能力组合**：Core Scope style 能表达内容默认，但缺少 Table Cell 背景与级联目标，需要扩展 Table
- **是否需要下沉**：不新增 Core 能力；精确复用公开 Scope / style schema
- **内部表达链路**：formatted Cell + resolved appearance → presentation → styled child → layout / background / Border Graph
- **外部扩展链路**：custom presentation 收到与内置相同 context / appearance，并返回同一 `IRChild`
- **下游执行 / adapter 等价性**：adapters 只传 definitions；renderer 只看到 Core Scope / Path
- **不支持边界与诊断**：不向 definition 暴露 Cell box 或 renderer；appearance 不改变 topology / track / fit
- **本轮结论**：扩展 Table Presentation，组合 Core style / measurement，不建立平行样式或渲染机制

## 不在本 ADR 范围

- selector、rule 与 style precedence
- visual scale 的求值、Legend descriptor
- named theme 与内置主题
- layout token theme、交互态 style 或 CSS variable
- badge、data bar、sparkline 等具体 presentation provider

---

## 实现契约

### Level

`red`：修改公开 schema、Definition callback、Presented model、layout probe 与 lowering。

### Schema 改动

| 文件                           | 操作 | 字段名       | 类型                     | 默认值 | describe 中文摘要            |
| ------------------------------ | ---- | ------------ | ------------------------ | ------ | ---------------------------- |
| `schemas/appearance/schema.ts` | 新增 | `background` | background object?       | none   | Cell box 背景                |
| 同上                           | 新增 | `content`    | Core Scope style subset? | empty  | 内容级联默认                 |
| 同上                           | 新增 | `borders`    | `IRTableCellBorders?`    | none   | appearance border candidates |

所有 Core style fields 从权威 schema `.pick()` / `.shape` 精确复用；不得手写重复 primitive。

### 文件 scope

- `packages/viz/table/src/schemas/{appearance,presentation,cell}/**`
- `packages/viz/table/src/contract/{presentation,model}/**`
- `packages/viz/table/src/providers/presentation/**`
- `packages/viz/table/src/pipeline/{presentation,layout,lower,manifest}/**`
- `packages/viz/table/src/{schemas,contract,providers,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,presentation,layout,lower,manifest,public-api}/**`
- adapter 中 custom presentation 类型迁移与 public type / runtime parity tests
- alpha.3 对应 docs 文件（ADR-07）

### 测试象限

**Happy path**

- text presentation 收到 raw / formatted / context / appearance 并显示 formatted value
- value 与 direct content 都通过同一 content style wrapper
- background 以 Cell box 精确发出且在 content 下方
- 多 Cell 时全部背景先于全部内容，Border Graph 最后绘制

**边界**

- empty appearance 不创建多余 wrapper / background
- `fill: 'none'` 与 border `{ kind: 'none' }` 保持显式清除
- zero-area Cell、span Cell 与 clipped content 的背景仍以 Cell box 为准
- `fillOpacity: 0` 不发 primitive；background-only Cell 的可见 bounds 等于 Cell box

**错误路径**

- appearance 拒绝 transform、children、layout、函数与未知字段
- custom presentation 返回非法 child 或改变输入对象时 fail-loud / 不污染模型
- presented/semantic kind、id 或长度不一致，以及 value/content trace 混合状态，作为内部合同错误
- public type test 拒绝旧 `{ value, cellId }` callback、顶层 `cellId` 读取、旧 overload 或 alias

**交互**

- formatter output、presentation options 与 appearance 同时生效
- custom definition 经新 callback 形状完成真实 registry dispatch；Table / React / Vanilla 使用同一导出 contract
- Core nodeDefault/font 在 natural 与 constrained probe / replay 同源
- explicit child style 覆盖 Scope default，direct content 不被 Table 重写
- appearance borders 进入既有 Border Graph 而不建立第二套线段 lowering
- 外层 Scope 声明 cascading stroke 时，Core probe、Table manifest 与最终 Scene bounds 均不因背景描边外扩；背景 / 内容 / border 的跨 Cell z-order 不变

### 依赖的现有元素

- ADR-01 `TableCellContext` / `FormattedTableModel`
- Core `ScopeSchema` 的 cascading / node / path / label / arrow default schemas
- Core layout-aware probe / replay
- alpha.2 `IRTableCellBorders`、Border Graph、Cell box 与 manifest geometry
