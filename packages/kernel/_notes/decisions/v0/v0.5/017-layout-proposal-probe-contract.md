---
description: Child Layout Proposal、Probe 与 Alignment Guide 合同；背景：现有结果也没有 alignment guide
keywords: 'Child、Layout、Proposal、Probe、Alignment、Guide、slotSize、allocationBounds'
---

# ADR-017：Child Layout Proposal、Probe 与 Alignment Guide 合同

- 状态：Accepted
- 决策日期：2026-07-29
- 接受日期：2026-07-30
- 关联：[ADR-015](./015-box-layout-composite-contract.md) · [ADR-007](./007-layout-aware-composite.md)

## 背景

现有 layout-aware Composite 已能在一次完整 `compileToScene()` 中布局任意 `IRChild`，以双轴 bounded / exact constraint 得到 `slotSize`、`allocationBounds` 与 `visualBounds`，再用 callback-local、compile-local、one-use replay 原子提交选中结果。该合同避免 Standard、Table 等 Tier 2 owner 复制文字、TeX、provider、reference、resource 与 nested Composite 的真实编译环境。

Standard alpha.2 的 Box、Flex、Grid 与 Overlay solver 还需要区分 child 的最小贡献、自然贡献、有限区间提案与精确槽位，并在一条轴的贡献受另一条轴条件影响时执行上下文化 probe。现有 `intrinsic` 只有单一自然含义，bounded / exact 也只表达父级约束，不能统一描述 minimum / natural contribution，无法让同一个 child 在同一次 solver transaction 中返回可比较的多组结果。

现有结果也没有 alignment guide。Standard 若从 Text primitive、Node 内部布局或 `visualBounds` 反推 baseline，会按 child 类型建立白名单，并在 custom provider、TeX、Scope transform 与 nested Composite 上失去闭环。另一方面，当前 sandbox 只隔离成功 probe 的 warning、resource、namespace、identity 与 artifact；child dispatch 抛出的失败仍会立即终止整个 compile，无法表达“solver 丢弃失败 probe，但在选中该失败时提升为 occurrence-aware compile error”。

本 ADR 以 breaking change 升级既有 layout-aware Composite contract。它不为 ADR-015 保留兼容表面，保留 `slotSize` 也不是兼容措施，而是因为 proposal、resolved slot 与 child 真实占用是不可互相替代的独立量。

## 决策：在现有 Composite compile transaction 中增加 proposal-aware probe

Core 继续复用同一个 `CompositeDefinition.compile` 分支、Composite registry、provider resolver 与 `compileToScene` traversal，不新增 Layout IR、layout registry、Scene primitive 或第二条 compile pipeline。

一次通用 child layout 的信息流固定为：

```text
LayoutProposal
  -> Core 在完整环境中执行隔离 probe
  -> LayoutChildProbe
       resolved -> slotSize + allocationBounds + visualBounds + guides + replay
       failed   -> opaque LayoutChildFailure
  -> Tier 2 solver 选择结果并计算 placement
  -> replay(result, wrapper) 或 raise(failure)
```

Core 拥有 proposal 校验、上下文化 child 求值、resolved slot、真实 bounds、guide、probe transaction、failure isolation、replay 与 occurrence diagnostics。Layout 拥有 Box、Flex、Grid 与 Overlay solver 的领域规则：如何发 proposal、如何形成 line / track、如何分配和使用 item slot，以及 alignment、overflow、clip 与 artifact。

### Proposal 公共类型

`ChildLayoutAxisConstraint` 与 `ChildLayoutConstraint` 删除，由完整双轴 proposal 取代：

```ts
import type { ValueOf } from '@retikz/foundation';

export const LayoutAxisProposalKind = {
  Intrinsic: 'intrinsic',
  Range: 'range',
  Exact: 'exact',
} as const;

export type LayoutAxisProposalKindValue = ValueOf<typeof LayoutAxisProposalKind>;

export const LayoutIntrinsicMode = {
  Minimum: 'minimum',
  Natural: 'natural',
} as const;

export type LayoutIntrinsicModeValue = ValueOf<typeof LayoutIntrinsicMode>;

export type LayoutAxisProposal =
  | Readonly<{
      kind: typeof LayoutAxisProposalKind.Intrinsic;
      mode: LayoutIntrinsicModeValue;
    }>
  | Readonly<{
      kind: typeof LayoutAxisProposalKind.Range;
      min: number;
      max?: number;
    }>
  | Readonly<{
      kind: typeof LayoutAxisProposalKind.Exact;
      value: number;
    }>;

export type LayoutProposal = Readonly<{
  x: LayoutAxisProposal;
  y: LayoutAxisProposal;
}>;

export const NaturalLayoutProposal = Object.freeze({
  x: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
  y: Object.freeze({
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  }),
}) satisfies LayoutProposal;
```

Proposal 是父级提供的可用空间条件，不是强制缩放、裁剪或伪造 bounds 的命令：

1. `intrinsic.minimum` 查询 child 在另一轴 proposal 保持生效时能够合法贡献的最小尺寸。
2. `intrinsic.natural` 查询 child 在另一轴 proposal 保持生效时的自然尺寸。
3. `range` 提供从有限非负 `min` 开始的可用区间；`max` 省略表示无上限。
4. `exact` 表示父 solver 已经要求固定 allocation slot，但 child 仍可拒绝重排或缩放。
5. minimum / natural 都是上下文化 contribution probe，不是 child 上的静态 Size metadata，也不承诺完整 CSS min-content / max-content。

`LayoutProposal` 必须恰好包含 `x` 与 `y`，每个 axis variant 只允许其判别字段对应的字段。所有显式数值必须有限且非负；`range.max` 存在时不得小于 `min`；显式 `0` 合法且与省略不同，`-0` canonicalize 为 `0`。Core 在进入 child dispatch 前严格校验、detached clone 并递归冻结 proposal，错误包含 composite key 与 formatted occurrence。

导出的 `NaturalLayoutProposal` 及其两个 axis object 在模块初始化时运行时冻结，JavaScript consumer 也不能修改 module-level 默认值。根 layout-aware Composite 缺少父 proposal 时收到与该常量深相等的 frozen proposal；Core 不承诺 object identity，可以直接复用已深冻结常量，也可以传递等价 detached clone。Nested layout-aware Composite 原样收到父级交给该 occurrence 的完整双轴 proposal，Core 不按 provider key 或 child kind 分支传播。

### Resolved slot、真实 bounds 与视觉包络

公开 contract 区分四个独立量，并增加可选 guides：

```ts
export type LayoutChildResult = Readonly<{
  slotSize: Readonly<{
    width: number;
    height: number;
  }>;
  allocationBounds: Readonly<BoundsRect>;
  visualBounds: Readonly<BoundsRect>;
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
  replay: CompositeReplay;
}>;
```

- proposal 是输入条件。
- `slotSize` 是本次 proposal 求值后的无原点 allocation slot，只有有限非负 `width` / `height`。
- `allocationBounds` 是 child 在自身局部坐标中的真实布局占用，不补齐或收缩成 slot。
- `visualBounds` 是最终静态 primitive tree 的 renderer-neutral 保守视觉包络，不参与 slot 求值。
- `replay` 继续代表本次 probe 保存的 compile transaction。

每条轴的 slot 求值不变量固定为：

1. `exact`：对应 slot 维度严格等于 `value`。
2. `range`：child 先在完整双轴 proposal 下完成上下文化布局，再用该轴的真实 contribution 做 clamp；`max` 存在时 slot 位于 `[min, max]`，省略时 slot 不小于 `min`。
3. `intrinsic.minimum` / `intrinsic.natural`：slot 是该次 contribution probe 解析出的尺寸。
4. fixed geometry 可以拒绝 range / exact；此时 `allocationBounds` 可以大于或小于 `slotSize`。
5. `slotSize` 没有 origin。父 solver 在自己的坐标系中以它建立 slot rect，再对真实 allocation / visual bounds 做 alignment、overflow 与 clip。

`allocationBounds` 的 `x` / `y` 可以为负，所有字段和派生边界必须有限，`width` / `height` 非负。Slot、bounds 与 guide position 中的 `-0` 同样 canonicalize 为 `0`，避免 deep equality、artifact 与确定性证据出现负零分叉。返回的 slot、bounds、guide array 与 result 都 detached 并冻结，调用方不能借共享引用污染其它 probe。

### Built-in child 的 proposal 响应

Core built-in child 复用既有真实 layout / geometry / provider 路径，不建立 proposal 专用的平行测量器：

- Plain-text line 的 x 轴 `natural` 使用自然排版宽度，`minimum` 使用相同 injected `measureText` 与现有 tokenization 得到最小可断单元宽度。硬换行保持 authored line boundary：natural width 取各行自然宽度最大值，minimum width 取所有行最小不可断单元的最大值。
- Plain text 收到 x 轴 `range` / `exact` 时，以 proposal 针对 allocation box 的口径扣除 margin、padding 与既有 box 开销，再在每条硬换行边界内复用现有文本换行路径；显式 `maxTextWidth` 仍取更严格预算。
- Mixed inline runs 与 TeX run 当前没有合法的 run-level line breaking contract。本 ADR 把每条 mixed / TeX authored line 视为 atomic content：x minimum 等于 natural，range / exact 只求值 `slotSize`，不重排、不缩放该行，`allocationBounds` 保留真实自然占用并可溢出 slot。多条 authored line 仍按现有 vertical stack 形成总高度。
- 文本 y 轴 `minimum` / `natural` 都取应用完整 x 轴 proposal 后的实际排版高度。当前没有独立纵向重排能力，因此二者可以相等。
- Path、Coordinate、普通 Scope 与其它不能重排的固定 geometry 不缩放；其 allocation 继续来自真实 Core 几何。
- 不支持某轴重排的 child 可以在该轴返回相同的 minimum / natural contribution。
- 空输出仍返回有限零 bounds；exact zero 不被当作 proposal 缺省。

任何 built-in 响应都不得使用 DOM、SVG / Canvas bounds 回读、renderer 私有测量或按最终 Scene 执行 double compile。

### Alignment guide

```ts
export const LayoutAlignmentGuideName = {
  FirstBaseline: 'first-baseline',
  LastBaseline: 'last-baseline',
} as const;

export type LayoutAlignmentGuideNameValue = ValueOf<typeof LayoutAlignmentGuideName>;

export const LayoutAlignmentGuideDimension = {
  X: 'x',
  Y: 'y',
} as const;

export type LayoutAlignmentGuideDimensionValue = ValueOf<typeof LayoutAlignmentGuideDimension>;

export type LayoutAlignmentGuide = Readonly<{
  name: string;
  dimension: LayoutAlignmentGuideDimensionValue;
  position: number;
}>;
```

`name` 保持开放字符串，使第三方 Composite 可以声明自定义 guide；`LayoutAlignmentGuideNameValue` 仅表达 Core 提供的稳定 first / last baseline 名称。单个 result 内 `dimension + name` 必须唯一，`position` 必须有限，并处于 child-local allocation coordinate；guide 可以位于 slot 或 allocation bounds 外。

Node baseline 只从同一次真实文本 layout 的 line metrics 产生。单行 first / last baseline 相同，多行分别取首行和末行 alphabetic baseline；无正文文本的 child 不伪造 baseline。Guide 不从 `visualBounds`、glyph ink、renderer 或 Node primitive 结构反推。

Guide transform 按自身 `dimension` 的一维仿射分量求值：

- translate 只加对应维度的位移，另一维 translate 不影响该 guide。
- 对应维度的 finite non-zero scale（正数或负数）把 `position` 乘以该 scale；负 scale 保留 guide name，因为 first / last 表示 authored line identity，不表示视觉上方 / 下方。
- 对应维度 scale 为 `0` 时省略 guide，避免不同位置塌缩后伪造唯一 alignment line；另一维 scale 为 `0` 不影响当前 guide。
- uniform / anisotropic scale 都逐维应用上述规则。Rotate degrees 规范化到整圈后为 `0` 时是 identity；其它 effective non-zero rotate（包括轴交换）省略受影响 guide。
- transform chain 一旦出现不能保持该 guide 单轴标量语义的操作，该 guide 在该输出中保持省略，不能由后续 transform 或 transformed bounds 恢复。

当前公开 `Transform` 只有 translate / rotate / scale，不存在 skew；本 ADR 不扩展 IR / Scene transform contract。Clip 不改变 guide。Structural Scope 只传播无歧义的 descendant guide；同一 `dimension + name` 来自多个 descendant 时省略该 guide，不由 Core 猜测 first / last 或领域优先级。

Layout-aware Composite 必须能显式声明自身 guides，供再上一层 probe 消费：

```ts
export type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  allocationBounds?: Readonly<BoundsRect>;
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });
```

Composite 返回的 guides 已位于该 Composite 自身局部 allocation coordinate。Core 不自动把所有 replay child guides 合成为 container guide；Standard solver 根据已选择的 child、slot 与 placement 显式决定要向外传播哪一条。

### Resolved / failed probe 与受控提升

Child probe 的返回值改为显式 outcome：

```ts
export const LayoutChildProbeKind = {
  Resolved: 'resolved',
  Failed: 'failed',
} as const;

export type LayoutChildProbeKindValue = ValueOf<typeof LayoutChildProbeKind>;

export type LayoutChildProbe =
  | Readonly<{
      kind: typeof LayoutChildProbeKind.Resolved;
      result: LayoutChildResult;
    }>
  | Readonly<{
      kind: typeof LayoutChildProbeKind.Failed;
      failure: LayoutChildFailure;
    }>;
```

`LayoutChildFailure` 是 branded、opaque、callback-local、compile-local value。第三方 solver 只能丢弃它或通过创建它的 callback 提升，不能读取内部 error、构造、序列化、复制成合法 failure 或跨 callback / compile 使用。

```ts
declare const layoutChildFailureBrand: unique symbol;

export type LayoutChildFailure = Readonly<{
  [layoutChildFailureBrand]: never;
}>;
```

运行时合法性不依赖 TypeScript brand，而由 compile-local owner table 与 failure object identity 校验；spread / copy 后的新对象不属于该 owner。

child 输入、provider、引用或文字度量执行失败可以形成 opaque failed probe；未选中失败对最终 CompileResult 不产生可观察影响。非法 callback / provider 输出、replay / failure ownership 误用和 Core invariant 属于立即失败，不能伪装成可丢弃候选

失败保留原始 cause、provider、Source path 与 probe occurrence；raise 在原 callback 中提升同一失败，不把来源改成 raise 调用位置。最终 replay 将候选来源映射为实际输出 occurrence，跨层诊断不重复包裹

Provider 精确 schema 的解析结果按 [ADR-035](./035-json-undefined-field-contracts.md) 消费；变异隔离不建立第二套输入准入契约。所有继续参与编译的输出遵循所属公开 contract，不能通过重新读取可变 callback 返回值改变已验证事实

以下 fatal error 仍立即 fail-loud，不包装成 probe failure：

- 非法 proposal；
- 伪造、跨 callback / compile 或重复使用 result、failure、output child、replay；
- provider / definition callback 返回违反公开 contract 的 result；
- Core 内部 invariant 失败。

Context breaking surface 固定为：

```ts
export type LayoutCompositeCompileContext = Readonly<{
  proposal: LayoutProposal;
  layoutChild: (child: IRChild, proposal: LayoutProposal) => LayoutChildProbe;
  replay: (result: LayoutChildResult, wrapper?: CompositeReplayWrapper) => CompositeCompileChild;
  raise: (failure: LayoutChildFailure) => never;
  scope: (
    props: CompositeCompileScopeProps,
    children: ReadonlyArray<IRChild | CompositeCompileChild>,
  ) => CompositeCompileChild;
}>;
```

`raise()` 只接受当前 callback 创建的 failure，恢复其原始 cause，并补齐 composite key、provider key、source path 与 expansion occurrence 后抛出 compile error。提升失败不提交 probe side effects。`replay()` 只接受 `resolved.result`；failed probe 不能进入 `scope()` 或 runtime output tree。

### Replay、wrapper 与坐标顺序

ADR-015 的 one-use replay、runtime Scope output、显式 composite allocation 与 wrapper 保持，但输入从 constraint result 升级为 proposal result：

1. child-local content 先以自身 allocation origin 建立真实布局。
2. 父 solver 依据 `slotSize`、`allocationBounds` 与 guides 计算 placement。
3. `replay(result, wrapper)` 在 parent allocation coordinate 应用 placement transform 与可选 clip。
4. wrapper transform / clip 不回写原始 `LayoutChildResult`。
5. `visualBounds` 保持 probe 时未受 parent wrapper clip 影响的 child-local包络；最终 Scene visual contribution 继续按 wrapper clip / transform 计算。

Replay 仍是 callback-local、compile-local、opaque、one-use。重复 replay、跨 compile、跨 callback、伪造 result 或把 discarded result 直接放入 `scope()` 都在任何 sink 写入前 fail-loud。

## DSL / API 表面

本 ADR 不增加 JSX、Vanilla spec 或 IR 字段。第三方 layout-aware Composite 通过现有 `defineComposite()` authoring contract 使用新 API：

```ts
const natural = context.layoutChild(child, NaturalLayoutProposal);
const minimum = context.layoutChild(child, {
  x: {
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Minimum,
  },
  y: {
    kind: LayoutAxisProposalKind.Intrinsic,
    mode: LayoutIntrinsicMode.Natural,
  },
});

if (natural.kind === LayoutChildProbeKind.Failed) context.raise(natural.failure);
if (minimum.kind === LayoutChildProbeKind.Failed) {
  // solver 可以丢弃该候选，或在决定采用它时显式 raise
} else {
  const placed = context.replay(minimum.result, {
    transforms: [{ kind: 'translate', x: 20, y: 10 }],
  });
}
```

React 与 Vanilla 继续通过现有 compile options 注入完全相同的 Composite definitions；相同 IR、definitions、providers 与 options 必须产生等价 Scene、artifact 与 diagnostics。

## 影响与 breaking migration

⚠️ BREAKING：

1. 删除 `ChildLayoutAxisConstraint`、`ChildLayoutConstraint` 与 `ChildLayoutSize`。
2. `context.constraint` 改为 `context.proposal`。
3. `layoutChild()` 第二参数必须是完整 `LayoutProposal`，返回值从 `LayoutChildResult` 改为 `LayoutChildProbe`。
4. 新增 `LayoutChildFailure` 与 `context.raise()`。
5. `LayoutChildResult` 保留 `slotSize` 并新增可选 `alignmentGuides`。
6. `LayoutCompositeCompileResult` 新增可选 `alignmentGuides`。

迁移规则：

- 旧 intrinsic axis proposal 改为 `NaturalLayoutProposal` 或显式 natural / natural。
- 旧 bounded width 改为 x `range`，未约束的 y 明确写 natural。
- 旧 exact width / height 改为对应 x / y `exact`。
- 读取 probe result 前先按 `kind` narrowing；需要保持现有 fail-loud 行为的 consumer 对 `failed` 调 `context.raise()`。
- 不保留 alias、overload、compat adapter 或旧字段解析。

当前仓内 Table 是实际 compile-time consumer，随 Core contract 迁移并以既有 Scene / manifest 证明行为未漂移。proposal、resolved slot、allocation bounds 与 visual bounds 四量模型足以承载 Standard 的 Box、Flex、Grid 与 Overlay 输入输出，但不实现 solver，也不改变其领域所有权。

下游 consumer 必须按 breaking contract 迁移 proposal、probe outcome、guides 与 failure raising；Standard 继续拥有自己的 solver 语义

## 最终实现摘要

双轴 proposal、opaque probe/failure、one-use replay 和真实 alignment guide 已由 Core 的统一 compile 契约提供。容器 solver 由 Layout 拥有，固定 Node 宽度另按 ADR-038 在同一文字与 shape 路径消费，不改变 slot 与 allocation 的区别。

## 遗留风险与后续

- 本合同只冻结同步、compile-local probe / replay；不支持异步测量、跨 compile cache 或 incremental layout solver
- mixed / TeX 当前保持原子 contribution；完整 run-level intrinsic sizing、CSS writing mode、百分比与 aspect-ratio transfer 不在本 ADR 范围
- 非轴保持变换后的 alignment guide 被省略；需要二维直线、点或区域 guide 时应另立公开空间引用能力
- Layout 继续拥有 Box / Flex / Grid / Overlay slot 规则、baseline policy、overflow 与 clip；Core 不拥有这些 solver 语义
