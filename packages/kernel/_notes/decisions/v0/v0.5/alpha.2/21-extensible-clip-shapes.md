# ADR-21：可扩展 ClipShape 与统一裁剪路径

- 状态：Accepted
- 决策日期：2026-08-16
- 关联：[alpha.2 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Standard alpha.4 ADR-05](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.4/05-standard-clip-shapes.md) · [Core v0.4 alpha.7 ADR-06](../../v0.4/alpha.7/06-clip-provider-contract.md)

## 背景与目标

Core 已允许第三方用 `ClipDefinition` 注册新的 `IRClipSpec.kind`，但 definition 的输出仍被限制为 Core 内置的封闭 `ClipShape` 联合。Core 随后按该联合执行校验、精度处理、bounds 计算和 Scene resource 生成，renderer 也按相同形状集合分派。这使第三方只能发明新的输入语法，不能定义新的裁剪形状；`polygon`、`path`、`compound` 等可选实现迁入 Standard 后，形状语义和消费逻辑仍实际留在 Core。

本决策把裁剪拆成两个可独立扩展的阶段：`ClipDefinition` 将持久化 Clip spec 解析成开放、JSON-safe 的 ClipShape，`ClipShapeDefinition` 再把该形状降低为统一的 renderer-neutral 裁剪路径。这里的“自定义 ClipShape”明确指可降低为静态结构化路径的二维裁剪几何，不包括 raw SVG、Canvas callback、alpha mask 或后端私有对象。Core 只保留矩形裁剪的最小内置闭环；圆、椭圆、多边形、路径和复合裁剪由 Standard 沿同一机制提供。

## 决策：Clip operation 与 ClipShape 使用两级 Definition

`ClipDefinition` 继续以 `IRClipSpec.kind` 为 operation registry key，但其输出改为开放 ClipShape。每个 ClipShape 也是带非空 `kind` 的 JSON object，并由独立 `ClipShapeDefinition` 注册、校验和 lowering。operation kind 与 shape kind 是两条明确的身份：多个 operation 可以解析成同一种 shape，一个 operation 也可以根据输入选择不同 shape；Core 不要求两者同名。

`ClipShapeDefinition` 把已校验的 shape 降为 `SceneClipPath`。该路径只包含结构化 `PathCommand` 子路径与可选 fill rule，是 SVG `<clipPath>`、Canvas `Path2D` / current path、headless bounds 与 hit-test 的共同表达。Scene resource 只保存该 canonical path，不保存 runtime definition、opaque callback 或 renderer-specific 对象。

Core provider graph 增加 `clipShape` capability，编译选项增加复数 `clipShapes`。`clipShape` 使用 `{ capability: 'clipShape', name: definition.kind }` 作为完整 provider key，并与 `clip` 分属两个 registry；相同 capability/kind 的不同 definition fail-loud，相同 definition 引用可以按既有 provider graph 规则去重。Clip operation provider 必须把其所有可能输出的 ClipShape provider 声明为有序静态依赖；动态返回未声明但由调用方显式注入的 shape 仍可解析，未注册 shape 一律在 lowering 前失败。直接调用 `compileToScene` 时，调用方也可以分别显式注入两级 definitions。内置与第三方 definition 使用同一 registry、冲突规则、lookup、校验和 dispatch，不存在内置 shape `switch` 旁路。

Core 的持久化 Clip schema 同样收敛为精确 `rect` 分支与开放 custom operation object。custom object 只要求非空 `kind` 和 JSON-safe payload，并仅保留 `rect` 为 reserved kind；是否注册及 kind-specific 字段是否合法由命中的 `ClipDefinition` 决定。`IRClipSpec` 由 `IRRectClipSpec | IRCustomClipSpec` 构成，因此 Standard/第三方递归容器可以直接把任意开放 operation 作为 child，并在递归 resolve 时回到同一个 Clip registry。

Core 默认只注册 `rect` ClipDefinition 与对应 Rect ClipShape Definition。它是 Scope 裁剪和 Core-only 最小示例所需的基础矩形能力。`circle`、`ellipse`、`polygon`、`path`、`compound` 的 spec schema、IR 类型、shape 类型、definition、常量和 provider 均不再属于 Core，也不保留兼容 re-export、reserved key 或 fallback。

理由：

1. 第三方只有能同时扩展 operation 与 shape lowering，才不受 Core 封闭形状集合限制
2. 统一结构化裁剪路径覆盖静态二维 clip 的后端最大公约数，并保持 Scene 自包含、JSON-safe 和 renderer-neutral
3. renderer-specific 回调会破坏持久化、SSR 和 SVG / Canvas 等价性，不应成为 Drawing Complete 的扩展契约
4. 两级 provider 让 Standard 和第三方可以复用 shape 实现，而不复制 Core registry、Scene 或 renderer 路径

## 基础数据结构与公开契约

以下形态冻结两级扩展边界；具体只读修饰、schema 组合与类型擦除由实现保持等价：

```ts
type ClipShape = IRJsonObject & {
  kind: string;
};

type SceneClipPath = {
  commands: Array<PathCommand>;
  fillRule: IRClipFillRule;
};

type ClipResource = {
  kind: 'clip';
  id: string;
  path: SceneClipPath;
};

type ClipDefinitionInput<TSpec extends ClipSpecLike, TShape extends ClipShape> = {
  kind: TSpec['kind'];
  schema: z.ZodType<TSpec>;
  resolve: (spec: TSpec, context: ClipResolveContext) => TShape;
};

type ClipShapeDefinitionInput<TShape extends ClipShape> = {
  kind: TShape['kind'];
  schema: z.ZodType<TShape>;
  lower: (shape: TShape, context: ClipShapeLowerContext) => SceneClipPath;
};

type ClipDefinition<
  TSpec extends ClipSpecLike = ClipSpecLike,
  TShape extends ClipShape = ClipShape,
> = ClipDefinitionInput<TSpec, TShape>;

type ClipShapeDefinition<TShape extends ClipShape = ClipShape> = ClipShapeDefinitionInput<TShape>;

type ClipResolveContext = {
  round: (value: number) => number;
  resolve: (clip: IRClipSpec) => ClipShape;
};

type ClipShapeLowerContext = {
  round: (value: number) => number;
  lower: (shape: ClipShape) => SceneClipPath;
};

declare const defineClipShape: <TShape extends ClipShape>(
  input: ClipShapeDefinitionInput<TShape>,
) => ClipShapeDefinition<TShape>;

type CompileProviderOptions = {
  clips?: ReadonlyArray<ClipDefinition>;
  clipShapes?: ReadonlyArray<ClipShapeDefinition>;
};

type CompileOptions = CompileProviderOptions & {
  maxClipDepth?: number;
  // ...
};

type CoreProviderCapability = 'clip' | 'clipShape';
// ...

type CoreProviderDefinitions = {
  clips?: ReadonlyArray<ClipDefinition>;
  clipShapes?: ReadonlyArray<ClipShapeDefinition>;
  // ...
};

type AnyCoreProviderDefinition = ClipDefinition | ClipShapeDefinition /* | ... */;
```

`ClipDefinition.resolve` 和 `ClipShapeDefinition.lower` 的返回值都在进入下一阶段前复制为纯 JSON snapshot。ClipDefinition 的 provider key、definition `kind` 与 schema parse 后的 spec `kind` 必须一致，其 callback 可以返回不同 kind 的 ClipShape；该 shape kind 用于第二级 lookup。ClipShapeDefinition 的 provider key、definition `kind` 与 shape schema parse 后的 `kind` 必须一致。擦除类型不能把任意 JSON object 当成 definition。`SceneClipPath` 再统一执行有限数值、命令结构、几何、fill rule 与 precision 校验。

canonical `SceneClipPath` 始终显式保存 `fillRule`，缺省输入物化为 `nonzero`。Core 按 `PathCommand` 的稳定字段顺序重建命令，对所有数值统一 precision rounding 并把 `-0` 规范为 `0`；provider 对象自身的属性插入顺序不能影响 Scene。commands 必须非空、满足结构化 path grammar 且至少包含一个 drawing segment；Core 不自动闭合、改写 winding 或合并语义等价子路径，零面积但结构合法的路径表示空裁剪区域。resource 以该 canonical JSON 去重并分配稳定 id；视觉等价但命令结构不同的路径不承诺共享 id。

visual bounds 只从 canonical commands 计算，不再读取原始 shape kind。bounds 必须是包含最终裁剪几何的有限保守 AABB；Core 已能解析的 line、curve、arc 与 ellipse arc 使用其路径几何极值，合法零面积路径产生空 bounds。renderer、hit-test 和 bounds 不得再次解释第三方 shape。

复合 shape 通过 `ClipShapeLowerContext.lower` 递归降低子 shape。`maxClipDepth` 默认 32，按每次 Clip operation resolve 或 ClipShape lower 的递归边累计；超过深度或检测到 active-object cycle 属于 provider contract violation。组合 definition 不直接调用 renderer，也不绕过 shape registry。

Core 的 canonical path 只有一个 fill rule，因此复合裁剪的稳定语义是：所有 child commands 按 authored 顺序累积为一个 path，复合 shape 自己的 fill rule 统一作用于全部子路径，缺省为 `nonzero`；child path 自带的 fill rule 在被复合时不传播，由外层复合规则覆盖。该组合是单一路径的 winding/parity 区域，不表示逐 child 的几何交集；需要交集时应使用嵌套 Scope clip。空 child collection 非法；结构合法但最终零面积的累积路径表示裁掉全部内容。

## 行为、失败语义与兼容性

- 默认行为：Core-only compile 默认只能解析 `rect`；显式提供相同两级 definitions 时，相同 IR、precision 与 provider 顺序必须产生确定、跨 renderer 等价的 `SceneClipPath`
- 失败与诊断：缺少 ClipDefinition 时报告 operation kind 与 `CompileOptions.clips`；operation 返回的 shape kind 未注册时报告该 kind 与 `CompileOptions.clipShapes`。无效 authored spec、缺失 provider 及 provider callback 主动抛出的领域错误沿既有 layout-probe recoverable 边界传播，只有 probe 明确隔离失败时才可回退候选；普通 public compile 仍向调用方抛出。重复 registry key、definition/schema/callback kind 不一致、非 JSON provider 输出、shape schema 或 canonical path contract violation、递归 cycle / depth overflow 属于 fatal provider contract error，不得被 probe 吞掉。所有路径都不得静默降级为矩形或跳过裁剪
- Scene 与 renderer：Scene 只保存 canonical `SceneClipPath`；SVG、Canvas、Node Canvas、hit-test 和 visual bounds 消费同一命令序列与 fill rule，不接收 runtime definition 或后端 callback
- 兼容性 / breaking：Core 删除 `CircleClipShape`、`EllipseClipShape`、`PolygonClipShape`、`PathClipShape`、`CompoundClipShape` 及对应内置 clip。`ClipResource.shape` 被 `ClipResource.path` 取代；旧 Scene 与 ScenePatch resource 在当前 validator / renderer 边界明确拒绝，不提供资源迁移或双读。旧 IR 输入必须显式装配 Standard 或第三方两级 provider；不保留 alias、自动安装、动态发现或旧 shape fallback
- React / Vanilla 等价性：两者只收集并转交同一个 Core provider contribution 闭包；不建立 adapter 私有 shape registry。直接 JSON、Vanilla、React、SSR 与 retained processing 对相同 definitions 产生相同 Scene 和诊断

## 实施结论与过渡边界

本决策的第一批 Core 能力已完成：两级 Definition / registry、开放且 JSON-safe 的 ClipShape、canonical `SceneClipPath`、provider dependency、递归保护、Scene resource、visual bounds、SVG / Canvas / hit-test 消费以及 React / Vanilla contribution 传递已形成同一闭环。验证覆盖公开契约、provider graph、确定性与 precision、递归与失败语义、Scene / ScenePatch 校验、跨 renderer 等价、adapter 等价及下游兼容性。

为避免在 Standard 尚未接入两级 provider 时形成不可用的中间状态，Core 现阶段暂时保留 circle / ellipse operation 与既有六种 shape definition。第二批由 Standard ADR-05 完成五种可选 ClipShape 的完整所有权迁移后，再删除这些 Core 实现并把默认集合收敛为仅 `rect`；Layout 对 `path` operation 的显式 provider 装配也属于该批。此过渡只延后 owner 迁移，不改变本决策已接受的两级扩展契约、canonical path 或失败语义。
