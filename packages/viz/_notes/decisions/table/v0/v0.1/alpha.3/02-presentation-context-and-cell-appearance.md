# ADR-02：Presentation context 与 Cell appearance

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01 formatter](./01-cell-formatter-and-formatted-value.md) · [alpha.1 Cell presentation](../alpha.1/03-cell-presentation.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景与目标

alpha.1 的 Presentation 只能观察 scalar `value` 与 `cellId`，无法区分 raw/formatted value、Cell 位置和来源，也无法消费 style token、rule 与 encoding 共同解析出的视觉默认。若这些能力分别改写 Core child，会形成互不兼容的样式合并；若都交给 presentation 绘制，direct content 与 custom presentation 又无法共享同一 Cell box 语义。

本 ADR 的目标是扩展 Presentation context，并建立一个 JSON-safe、闭合的 Cell appearance 合同，统一承载 Cell 背景、内容的 Core 级联默认和 Border Graph 候选。

## 决策

### Cell appearance

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

content style 精确复用 Core Scope 的公开 style/default channels，不接受 children、transform、placement、clip、id、meta、animation 或 bounding shape。background 与 border 属于 Table Cell box，不进入任意 child 内部。appearance 不拥有 span、track size、padding、alignment、fit、overflow 或 wrap。

`background.fill: 'none'` 表示显式无背景；省略 `fillOpacity` 的运行时值为 `1`。`borders` 复用既有 `IRTableCellBorders`，包括 `{ kind: 'none' }` 的显式抑制语义。

Appearance 是 schema-backed 的闭合 plain-data value object，没有开放 discriminator 或算法 dispatch，因此不建立 Definition / registry。可扩展内容生成继续只经过 Presentation Definition。

### Presentation input

```ts
type CellPresentationInput = Readonly<{
  rawValue: IRDataScalarValue;
  value: IRDataScalarValue;
  context: TableCellContext;
  appearance: DeepReadonly<IRTableCellAppearance>;
}>;
```

- `rawValue` 是 canonical value payload
- `value` 是 formatter 输出，也是 presentation 的默认展示对象
- `context` 是 ADR-01 的最小 Cell identity/source
- `appearance` 是进入 Presentation 与布局前已经解析完成的最终视觉输入

Presentation Definition 仍只返回一个合法 `IRChild`，不接收 layout result、Cell box 尺寸、Core compile context 或 renderer。

这是 0.x breaking contract：custom presentation 从 `{ value, cellId }` 迁移为 `{ rawValue, value, context, appearance }`；`cellId` 改由 `context.cellId` 读取。不保留旧 overload 或 alias。

### 用户可观察消费语义

value presentation 的输出与 direct content 使用同一 appearance 路径：

- 空 content style 保持原 child，不增加无意义 wrapper
- 非空 content style 通过匿名 Core Scope 形成默认值；child 自身显式 style 仍具有更高优先级
- style wrapper 在 natural/constrained measurement 前生效，使 probe、replay 与最终 Scene 同源
- 背景使用最终 Cell box，显式无 stroke，不继承外层 Scope stroke
- `fill: 'none'`、有效 opacity 为 `0` 或 Cell 宽高任一为 `0` 时不产生背景 primitive
- 全表绘制顺序为所有可见背景 → 所有内容 → Border Graph
- 背景不改变 track intrinsic、allocation 或 content box，但可见背景计入 Cell/Table/Scene visual bounds
- Border Graph 只消费已经解析完成的逐侧 appearance borders，不在布局阶段重新叠加 semantic/style/rule 候选

value 与 content 是互斥分支。只有 value Cell 拥有 raw/formatted value 与 formatter/presentation provider names；content Cell 只保留 appearance 与合法 `IRChild`。两类 Cell 都必须与 canonical model 保持相同 identity、顺序和 payload kind，非法混合状态 fail-loud。

本 ADR 不给 React 或 Vanilla 增加 appearance prop、CSS callback 或旁路注入 API。非空 appearance 必须由后续 style/rule/encoding 通过同一 TableSpec pipeline 产生。

## DSL 表面

```ts
const warningCell = {
  value: 0.87,
  formatter: { name: 'number', options: { specifier: '.0%' } },
  presentation: { name: 'text' },
};
```

appearance 由 style tokens、rule 与 encoding 解析，不写入 formatter options。

## 功能与包边界

- Table 拥有 Cell appearance、background 与 border 的 Cell box 语义
- Core 拥有 style cascade、Scope、通用 measurement 与 renderer-agnostic IR
- Presentation 拥有 value 到 `IRChild` 的扩展行为，但不拥有 Table layout
- adapters 不建立 appearance/CSS 私有表面

## 兼容性与影响

- BREAKING：Presentation callback 参数形状改变
- additive：公开 appearance schema/types 供 rules、visual encoding 与 style token 共用
- Scene 可能新增 Cell background，visual bounds 随真实可见背景变化
- 旧的空 appearance 和 semantic border 路径保持可表达

## 测试策略摘要

- schema parity 证明 Core style/default 与 Table border 的精确复用及闭合拒绝
- public contract 证明新 callback、旧 callback 的类型拒绝与跨入口一致性
- compile contract 证明 wrapper 在 measurement 前、背景 draw order/bounds、direct/value parity 和 Border Graph 单次消费
- pipeline 证明 payload discriminator、identity/order、detached/freeze 和 provider diagnostics

详细 case、路径、命令和正式证据位于对应 ignored mirror plan 的 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Cell Semantics、Presentation、Layout 协作边界
- **问题归属**：Cell box 视觉目标属于 Table，通用 style/measurement 属于 Core
- **内部闭环**：formatted value/direct content + appearance → Presentation/Scope → Table Cell layout → Core IR
- **外部扩展**：custom presentation 与内置项观察同一 context/appearance 并返回同一 `IRChild`
- **结论**：扩展 Table Presentation，复用 Core style 与 measurement，不建立平行样式或 renderer

## 被否决方案

- 每种 Presentation 自行绘制背景与边框：无法统一 direct content 与 Cell box
- rule/encoding 直接改写任意 child：会产生多套 merge 与不一致 measurement
- 为 appearance 建立 Definition registry：闭合值对象没有行为 dispatch，不应伪装成 provider
- 把 appearance 扩成 layout/style 万能对象：会越过 Table Layout 与 Core Scope 边界

## 不在本 ADR 范围

- selector、rule 与 style precedence
- visual scale 求值与 Legend descriptor
- style preset、公开 style tokens 与 token resolution
- layout style token、交互态 style 或 CSS variable
- badge、data bar、sparkline 等具体 presentation provider
