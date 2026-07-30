# ADR-08：Child Layout Proposal、Probe 与 Alignment Guide 合同

- 状态：Proposed
- 决策日期：2026-07-29
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-06](./06-box-layout-composite-contract.md) · [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Standard Box Layout roadmap](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/roadmap.md)

> Alpha Architecture Gate：Round 1、2 BLOCKED 后完成对应修订，Round 3/3 PASS（BLOCKING / WARNING 均为 0）；2026-07-29 已获得人工实现授权，代码、测试与双语文档已实现，正在完成出口审计并等待人工接受。

## 背景

现有 layout-aware Composite 已能在一次完整 `compileToScene()` 中布局任意 `IRChild`，以双轴 bounded / exact constraint 得到 `slotSize`、`allocationBounds` 与 `visualBounds`，再用 callback-local、compile-local、one-use replay 原子提交选中结果。该合同避免 Standard、Table 等 Tier 2 owner 复制文字、TeX、provider、reference、resource 与 nested Composite 的真实编译环境。

Standard alpha.2 的 Box、Flex、Grid 与 Overlay solver 还需要区分 child 的最小贡献、自然贡献、有限区间提案与精确槽位，并在一条轴的贡献受另一条轴条件影响时执行上下文化 probe。现有 `intrinsic` 只有单一自然含义，bounded / exact 也只表达父级约束，不能统一描述 minimum / natural contribution，无法让同一个 child 在同一次 solver transaction 中返回可比较的多组结果。

现有结果也没有 alignment guide。Standard 若从 Text primitive、Node 内部布局或 `visualBounds` 反推 baseline，会按 child 类型建立白名单，并在 custom provider、TeX、Scope transform 与 nested Composite 上失去闭环。另一方面，当前 sandbox 只隔离成功 probe 的 warning、resource、namespace、identity 与 artifact；child dispatch 抛出的失败仍会立即终止整个 compile，无法表达“solver 丢弃失败 probe，但在选中该失败时提升为 occurrence-aware compile error”。

本 ADR 以 breaking change 升级既有 layout-aware Composite contract。它不为 ADR-06 保留兼容表面，保留 `slotSize` 也不是兼容措施，而是因为 proposal、resolved slot 与 child 真实占用是不可互相替代的独立量。

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

Core 拥有 proposal 校验、上下文化 child 求值、resolved slot、真实 bounds、guide、probe transaction、failure isolation、replay 与 occurrence diagnostics。Standard 拥有 Box、Flex、Grid 与 Overlay solver 的领域规则：如何发 proposal、如何形成 line / track、如何分配和使用 item slot，以及 alignment、overflow、clip 与 artifact。

### Standard 消费能力复核记录

- **复核主体**：本 Codex task 中代表 Standard 组确认方案的用户（人工）
- **日期**：2026-07-29
- **复核来源**：Codex task ID `019fad16-45ce-7920-b670-a24d53c58839` 中 2026-07-29 的明确用户回复：“选择第 2 种，保留 slotSize。附件删除它是契约遗漏，不是有意改变 ADR-06 的三量模型。ADR-08 将其重新定义为 proposal 求值后的无原点 allocation slot；proposal 是输入条件，slotSize 是 resolved output，allocationBounds 是 child 真实占用，三者不能互相替代。”
- **输入**：Reference Contract 的 proposal、`slotSize`、`allocationBounds`、`visualBounds` 四量，以及 Core / Standard 所有权边界
- **决策**：选择保留 `slotSize` 的第 2 种方案。proposal 是输入条件，`slotSize` 是 resolved output，`allocationBounds` 是 child 真实占用；这延续 [ADR-06](./06-box-layout-composite-contract.md) 对 allocation、slot 与 visual bounds 的独立区分
- **结论**：该用户认可 Core contract 足以被 Standard 消费。Standard 保有 Box、Flex、Grid 与 Overlay solver 的领域规则，Core 保有通用 child proposal 求值与结果返回
- **边界**：本复核仅确认 Core contract 的消费能力，不授权或实现 Standard solver

### Proposal 公共类型

`ChildLayoutAxisConstraint` 与 `ChildLayoutConstraint` 删除，由完整双轴 proposal 取代：

```ts
import type { ValueOf } from '../../shared';

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

`layoutChild()` 的 catch boundary 固定为：proposal 完成校验、clone / freeze 与 sandbox state 创建之后，进入 probed child 的唯一 `compileChildrenToPrimitives` dispatch 之前开始；child dispatch 完成并且 result / transaction 通过 Core contract validation 后结束。只有该边界内的 recoverable child compile failure 转成 `failed` outcome，此前产生的 primitive、resource、warning、artifact、namespace、identity、observation 与 replay state 全部留在失败 transaction 中。未选中的 failure 对最终 `CompileResult` 零可观察。

内部必须用不可伪造的错误类别区分 recoverable failure 与必须穿透的 fatal error，不允许按 message 文本判断。三类内部错误由 `probe-failure.ts` 的模块私有 `WeakSet` 登记 object identity，catch boundary 只用不读取 thrown value 的 guard 分类，不对任意 unknown 执行 `instanceof`；revoked / hostile Proxy 不能在分类或 message 规范化时二次抛出，ordinary Error prototype walk 也必须用 identity cycle guard 保证有限终止。Catch boundary 对未分类的 ordinary throw 默认按 candidate child failure 处理；因此所有在该边界内可达的 Core invariant 和公开 callback / provider output contract violation 必须在各自 owner 的 throw site 预先迁移为 fatal branded error：

- `LayoutProbeRecoverableError` 表示 candidate child 的输入或环境在真实 compile 中失败，包括 provider / schema resolution、未注册或未解析引用、nonlocal reference、composite depth / cycle、第三方 provider 普通抛错、text / TeX lowerer 与 injected measurer 抛错。
- `CompositeContractError` 表示 definition callback 返回 malformed result、非 JSON / hostile output child、无效顶层 child discriminator、result / failure / replay / scope ownership misuse或其它公开 callback contract violation。已完成 detached snapshot 且顶层 discriminator 合法的普通 `IRChild` 仍进入既有 compile dispatch；其详细 schema / provider 可编译性、既有 warning 与 recoverable failure 语义不前移到 callback output boundary。
- `CompileInvariantError` 表示 Core 自身不可能状态与 transaction invariant 破坏。

分类与转换点固定为：

1. `layoutChild()` catch boundary 收到 `CompositeContractError` / `CompileInvariantError` 时原样抛出；收到 `LayoutProbeRecoverableError` 时直接转 public failure；收到其它 `unknown` 时先规范化并包装为 recoverable error。
2. 当前 child dispatch 可达的 Core invariant owner——`namespace.ts`、`scope.ts`、`orchestration/composite.ts`、`orchestration/traversal.ts`、`orchestration/runtime-topology.ts` 与 `orchestration/visual-bounds.ts`——把内部不可能状态改为 `CompileInvariantError`。`internal:` message 只是审计线索，不是运行时分类依据。
3. 当前 callback / provider output validation owner——`orchestration/composite-output.ts`、`orchestration/traversal.ts`、`scene-primitive.ts`、`node/layout.ts`、`node/boundary.ts`、`node/anchors.ts`、`node/shape.ts`、`reference/anchor-cache.ts`、`path/stroke/lower.ts`、`path/stroke/shrink.ts`、`path/ribbon/width.ts`、`resource/clip.ts`、`resource/marker-primitive.ts`、`resource/paint.ts`、`text/metrics.ts` 与 `text/tex.ts`——只把 malformed callback result、非法 output handle、非法 primitive / geometry / metrics payload 转为 `CompositeContractError`。`composite-output.ts` 对普通 callback / Expand child 负责 hostile-safe detached JSON snapshot 与顶层 Tier 1 / Tier 2 discriminator 校验，详细 `IRChild` 可编译性仍归原 compile dispatch。其中 `scene-primitive.ts` 是 renderer-neutral 的 Core Scene primitive runtime contract 单一 owner，完整验证 Shape / Marker provider 发出的 primitive、style、transform、text、meta / animation 与递归 group，并以 active-path 检测拒绝循环结构；`text/metrics.ts` 与 `text/tex.ts` 分别统一验证 plain / mixed / label 共用的 measurer 与 TeX lowerer 输出，`node/label/layout.ts` 不再建立旁路过滤。Provider 函数调用位于 output validation boundary 外，主动抛出的普通错误仍是 recoverable；一旦函数返回，返回值的 iterable 读取、物化、反射与递归 validation 全部位于统一 fatal boundary 内，Proxy / iterator trap 必须包装为保留原始 cause 的 `CompositeContractError`。
   任何会在 validation 后继续参与 layout、resource、artifact 或 Scene 提交的 callback / provider 返回值，都必须先形成 detached snapshot 或把字段单次读取为局部值；后续校验与消费只能读取该稳定结果，不能再次读取 raw object。
4. `provider-payload.ts` 对 probed child 输入或 options 的 schema parse failure 保持 candidate failure，不升级成 contract error；layout-aware definition 自身返回值的 Core validation 则在 catch boundary 外执行或显式抛 `CompositeContractError`。

第三方 provider 直接抛出的 ordinary `Error` 由 `layoutChild()` catch boundary 规范化为 recoverable error；非 `Error` throw 被规范化为带稳定 message 的 `Error`，原始 thrown value 保存在 `cause` 中。创建 failure 时立即快照原始 cause、failing provider / composite key、source path 与完整 expansion occurrence，不在后续 `raise()` 的调用位置重新猜测。Public `LayoutChildFailure` 仍不暴露这些内部字段。

`CompileOccurrenceLocator.expansionPath` 以 `probe[index]` 记录 callback 内真实 `layoutChild()` candidate dispatch，以 `replay[index]` 记录最终 output commit。Nested failure 逐层 `raise()` 时必须保留完整 probe 链；resolved transaction 提交时仍把 probe-origin 前缀重映射为最终 replay output index，成功 artifact 的既有 replay occurrence 不漂移。内部 recoverable error 另存不含 provider / occurrence 外壳的 raw detail，跨层提升只格式化一次公开诊断，不能嵌套重复 wrapper message。

实现前以 `rg "throw new" packages/kernel/core/src/compile` 为当前快照做一次完整可达 throw-site 分类；新增或遗漏的 Core invariant / provider output validator 必须先登记到本 ADR 文件 scope，再允许落入 catch boundary。不能用 catch-all 测试替代该审计。

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

ADR-06 的 one-use replay、runtime Scope output、显式 composite allocation 与 wrapper 保持，但输入从 constraint result 升级为 proposal result：

1. child-local content 先以自身 allocation origin 建立真实布局。
2. 父 solver 依据 `slotSize`、`allocationBounds` 与 guides 计算 placement。
3. `replay(result, wrapper)` 在 parent allocation coordinate 应用 placement transform 与可选 clip。
4. wrapper transform / clip 不回写原始 `LayoutChildResult`。
5. `visualBounds` 保持 probe 时未受 parent wrapper clip 影响的 child-local包络；最终 Scene visual contribution 继续按 wrapper clip / transform 计算。

Replay 仍是 callback-local、compile-local、opaque、one-use。重复 replay、跨 compile、跨 callback、伪造 result 或把 discarded result 直接放入 `scope()` 都在任何 sink 写入前 fail-loud。

### Compile owner 放置

新增逻辑按既有分层拆成稳定 owner，避免继续扩大 `traversal.ts` 或把 guide 语义混入 bounds：

- `contract/composite/constants.ts` 与 `types.ts` 拥有 author-facing proposal、guide、probe、failure 与 context 公共表面。
- `orchestration/layout-proposal.ts` 拥有 proposal validation、clone / freeze、`-0` canonicalization 与 resolved slot 纯求值。
- `orchestration/alignment-guide.ts` 拥有 guide validation、detached result、transform propagation 与 Structural Scope ambiguity。
- `compile/probe-failure.ts` 是 node / path / resource / text 与 orchestration 共同依赖的 compile 级内部 owner，拥有 branded error 分类、unknown throw normalization、failure metadata snapshot 与 owner identity；domain owner 不反向依赖 `orchestration/`。
- `compile/types.ts` 拥有 compile occurrence 的结构化 segment 词汇；`probe` 与 `replay` 分别表达候选 dispatch 和最终提交，消费方不得从 message 文本反向解析层级。
- `compile/scene-primitive.ts` 是 Shape / Marker 共享的 Core Scene provider-output runtime contract owner，完整且递归地验证 renderer-neutral primitive，并把循环结构稳定分类为 fatal contract error。
- `orchestration/traversal.ts` 只编排 sandbox、child dispatch、outcome 与 replay / raise，不复制上述规则。
- `node/**` 与 `text/**` 继续拥有 plain、mixed 与 TeX 的真实 built-in layout；orchestration 不按 child type 计算 contribution。
- `bounds.ts` / `visual-bounds.ts` 继续只拥有 allocation / visual geometry，不选择 slot 或从 bounds 推导 guide。

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

## 测试设计

稳定测试摘要：

- public type 与 runtime validator 覆盖四类 axis proposal、mixed axes、显式零、缺失 / 额外字段、负数、NaN、Infinity 与非法 range。
- 固定 measurer 分别覆盖 plain text 的 x minimum / natural、range / exact reflow、硬换行、y contribution 与 margin / padding budget，以及 mixed / TeX atomic refusal。
- Path、Coordinate、Scope 与空输出覆盖 fixed geometry refusal、resolved slot 与真实 allocation 分离。
- 三层 nested Composite 覆盖 proposal、slot、bounds、guide、failure、occurrence、resource 与 replay 全链路。
- first / last baseline 覆盖单行、多行、无文本、translate、正 / 负 / 零 uniform 与 anisotropic scale、identity / non-zero rotate、重复 guide 与 detached result。
- discarded resolved / failed probes 对 primitive、resource、warning、artifact、namespace、identity 与 observation 零可观察。
- 第三方 provider 普通 Error / 非 Error throw 可形成 discarded failure；malformed provider result、replay misuse 与 Core invariant 不得被包装。
- selected failure、invalid proposal、forged / duplicate / cross-session replay 与 failure misuse 保持 occurrence-aware fail-loud。
- wrapper 覆盖 child-local allocation、parent placement transform、clip 与 visual bounds 的坐标顺序。
- 既有 Table consumer 迁移后保持 Scene / manifest 行为，并以 `resolved` outcome 显式处理失败。
- renderer-neutral 证据只读取 `CompileResult`、Scene、bounds、guides 与 artifacts，不把 SVG DOM 或 Canvas pixels 当作 layout oracle。

逐行为矩阵位于 ignored `notes/plans/2026-07-29-layout-proposal-test-contract.md`。

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

当前仓内 Table 是实际 compile-time consumer，必须随 Core contract 同一改动集迁移并以既有 Scene / manifest 测试证明行为未漂移。Standard owner 已基于 Reference Contract 的 proposal、resolved slot、allocation bounds 与 visual bounds 四量模型复核 Box、Flex、Grid 与 Overlay 的消费能力并认可；这只确认 Core contract 可消费，不实现 Standard solver，也不改变其领域所有权。Standard alpha.2 在消费版本可用后执行自己的 Core Capability Gate；Kernel 不实现 Standard solver。

用户可见 public API 与行为必须同步 Core README、Composite 概念页、Compile Reference、Extension Reference、Scene visual-bounds 说明、双语 demo 与 v0.5 changelog。Standard roadmap 中旧的 intrinsic / maxWidth Gate 描述由 Standard owner 在消费复核时同步。

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Constraint / Layout 与 Composition
- 解决的问题：让任意 `IRChild` 在完整 Core compile 环境中接受上下文化双轴 proposal，并返回 resolved slot、真实 bounds、guides 或可隔离失败
- 主责包与协作包：`@retikz/core` 主责；`@retikz/math` 提供既有 bounds / transform 纯计算；Standard 与 Table 作为 Tier 2 consumer；render、React、Vanilla 维持既有执行和接线
- 是否可由现有能力组合：扩展现有 layout-aware Composite transaction 即可，不需要新 IR、Scene primitive、registry 或 pipeline
- 是否需要下沉到依赖能力域：否；只有通用纯 guide transform helper 确有跨包复用时才另行评估下沉 math，本 ADR 不预建
- 内部表达链路：runtime contract -> proposal validator -> existing child dispatch / layout -> isolated transaction -> resolved / failed outcome -> replay / raise
- 外部扩展链路：内置与第三方 child 继续经同一 Composite definition、registry、provider resolver、compile options 与 traversal；proposal 是现有 definition callback 的闭合 runtime contract，天然不适用独立 define-registry
- 下游执行 / adapter 等价性：Scene schema 与 renderer 不变；React / Vanilla 继续注入相同 definitions；Standard / Table 只消费公共 Core contract
- 不支持边界与诊断：不支持 DOM / renderer 测量、CSS 完整 intrinsic sizing、异步 probe、跨 compile cache、solver registry或领域 slot policy；非法 proposal、selected failure 与 token misuse 都有 occurrence-aware diagnostics
- 本轮结论：扩展当前 Drawing Complete 能力域并补齐 contract、compile、consumer、tests 与 docs 闭环

## 被否决的方案

- **保留旧 constraint 并新增 `probeChild()`**：会长期保留两套 child measurement、slot 与 nested propagation 语义
- **新建 layout registry 或 compile pipeline**：会复制 Composite registry、provider / namespace / resource 环境与 replay transaction
- **删除 `slotSize`**：range 与 intrinsic proposal 不包含最终 resolved allocation，fixed geometry refusal 也无法同时表达父级分配与真实占用
- **把 Flex / Grid / Overlay slot 规则放进 Core**：通用 child proposal 求值不拥有 line、track、alignment 或 overflow policy
- **把 failure 当 warning 或捕获任意错误后返回空 bounds**：会丢失因果链并把失败伪装为合法零尺寸
- **从 primitive 或 visual bounds 反推 baseline**：无法覆盖 nested Composite、custom provider 与真实文本排版语义
- **非零旋转后保留猜测 guide**：旋转后的 guide 不能用原维度的单一 x / y scalar 正确表达

## 不在本 ADR 范围

- Flex line formation、grow / shrink、wrap、free-space distribution
- Grid track、fraction、span、auto-placement、subgrid 或 masonry
- Overlay participation、z-order、LayoutItem、item key 与 Standard artifact
- CSS writing mode、百分比、aspect-ratio transfer 与完整 min-content / max-content
- primitive geometry scale、renderer bounds readback、DOM reflow 或异步 measurer
- 跨 compile replay / probe cache、incremental layout solver 与 layout-aware subtree 局部复用
- Plot、Table、Gantt、Graph 或其它领域 IR / solver
- React / Vanilla layout authoring sugar

---

## 最终实现摘要

实现沿用现有 Composite registry 与 child compile 主链，没有新增 IR、Scene primitive、layout registry 或 renderer API：

- `LayoutProposal` 支持双轴 intrinsic minimum / natural、range 与 exact；所有输入严格校验、detached、deep-frozen，并把 `-0` 规范为 `0`
- `LayoutChildResult` 同时返回 proposal 求值后的无原点 `slotSize`、真实 `allocationBounds`、最终 `visualBounds`、可选 alignment guides 与 one-use replay
- plain text 在同一 injected measurer 与 authored-line 规则上计算 minimum / natural contribution，并在有限宽度下重排；mixed / TeX 与固定几何可拒绝 proposal，真实 allocation 不被伪装成 slot
- child probe 在 forked namespace、resource、identity、warning、artifact、observation 与 topology transaction 中执行；未选中的 resolved / failed probe 对最终 `CompileResult` 零可观察
- 普通 provider 执行失败形成 opaque recoverable failure；非法 provider output、replay misuse 与 Core invariant 保持 fatal，只有选中的 failure 可由原 callback 通过 `raise()` 提升
- replay / runtime Scope output 在提交前递归完成 whole-tree preflight，包含 wrapper 与 nested Scope clip；预检成功后统一消费 handle 与 token，避免部分提交
- first / last baseline 来自同次真实 text metrics；translate 与轴保持 scale 可传播，无法继续表示为单一轴标量的 guide 被省略
- Table consumer 已迁移到完整 proposal / probe contract；React `<Text>` 与内置 contour provider 同步移除显式 `undefined`，保证相关 authoring / provider output 保持 JSON-safe

## 验证摘要

正式证据覆盖 public types、strict runtime validation、plain / mixed / TeX / fixed geometry、non-monotonic custom shape feedback、guide 传播、transaction isolation、hostile provider、whole-tree preflight、三层 nested Composite、Table consumer、incremental fallback、trace 与 React JSON-safe authoring。

逐行为、反例、最低层、具名测试与验证命令保存在 ignored `notes/plans/2026-07-29-layout-proposal-test-contract.md`。最终验证结果以本 ADR 获人工接受前的最新运行记录为准，不把历史 coverage 或单个 renderer 像素结果当作契约证据。

## 遗留风险与后续

- 本合同只冻结同步、compile-local probe / replay；不支持异步测量、跨 compile cache 或 incremental layout solver
- mixed / TeX 当前保持原子 contribution；完整 run-level intrinsic sizing、CSS writing mode、百分比与 aspect-ratio transfer 不在本 ADR 范围
- 非轴保持变换后的 alignment guide 被省略；需要二维直线、点或区域 guide 时应另立公开空间引用能力
- Standard 仍需在自己的 ADR 中实现并验证 Box / Flex / Grid / Overlay slot 规则、baseline policy、overflow 与 clip；Core 不拥有这些 solver 语义
- ADR 保持 Proposed，直到人工完成最终 review 并明确接受；实现完成与 commit 不自动等于 Accepted
