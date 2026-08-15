# ADR-03：将 Ribbon 完整迁移为 Standard Path Kind

- 状态：Accepted
- 决策日期：2026-08-13
- 依赖：[ADR-02](./02-core-minimal-builtins-and-standard-provider-entrypoints.md)
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.4 roadmap](./roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Core Path Kind ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.6/07-path-kind-registry.md) · [Core Path Generator / Ribbon Profile ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/alpha.8/06-builtin-path-generator-ribbon-profile.md)

## 背景与目标

Ribbon 当前以 `type: 'path'`、`kind: 'ribbon'` 表达，已经复用 Path 的 relation host、style、label、target、provenance 与 renderer-neutral Scene 输出。表面上它是 Path Kind definition，实际实现仍被 Core 特殊拥有：Core Path schema 包含专用 `ribbon` 字段和跨字段 refinement，Path Kind context 暴露 `emitRibbon`，compile orchestration 直接调用 Ribbon emitter，Core 还拥有 Ribbon Width Profile contract、registry、`bulge` 内置项和大规模 Ribbon 几何实现。

因此只把 `ribbonPathKind` definition 移到 Standard 不会形成真正的能力迁移，也不会显著缩小 Core。它会留下“definition 在 Standard、schema 与编译主体在 Core”的分裂 owner，并使第三方 Path Kind 仍无法只依靠领域中立服务实现同等级能力。

本 ADR 的目标是把 Ribbon 作为一项完整、可选、renderer-neutral 的 Standard Path Kind：Standard 拥有 Ribbon 参数 schema、Width Profile 扩展、几何编译和官方 definitions；Core 只拥有通用 Path IR host、Path Kind contract / registry、路径物化服务、Scene primitives 与诊断。Plot 等 Tier 2 显式声明 Ribbon contribution，React、Vanilla 与直接 Core compile 共享同一装配和输出语义。

## 决策：Ribbon 由 Standard 单一 owner 完整提供

`@retikz/standard/ribbon` 公开以下稳定能力：

- `RibbonPathOptionsSchema` 与由其推导的 `IRRibbonPathOptions`
- 组合 Core Path host 与 Ribbon options 的完整 `RibbonPathSchema`，以及由其推导的 `IRRibbonPath`
- Ribbon mode、alignment、cap、sampling、width rule 等 JSON-safe 枚举与 schema-derived 类型
- `RibbonWidthProfileDefinition`、`RibbonWidthProfileDefinitionInput`、`defineRibbonWidthProfile()`
- 官方单项 `RibbonPathKindDefinition` 及显式 profile 输入的 `createRibbonPathKindDefinition()`
- 官方单项 `BulgeRibbonWidthProfileDefinition`
- `createRibbonProviderContribution()`：复用同一 Ribbon maker，声明 `pathKind + ribbon` root，并把官方 `bulge` 与调用方 profiles 写入 owner-local datasets

Core 不再导出 Ribbon schema、Ribbon Width Profile contract / define helper、Ribbon profile registry、官方 `bulge`、Ribbon emitter 或 Ribbon 专属几何类型。Core `BUILTIN_PATH_KINDS` 只保留 `stroke`；Core compile options 和 provider contribution 不再有 `ribbonWidthProfiles` 字段。

Ribbon 仍是 Core `Path` host 的一个开放 kind，不建立 `type: 'ribbon'`、Standard composite、独立 Scene primitive 或 renderer 分支。迁移后的持久化形态为：

```ts
type IRRibbonPath = IRPathBase &
  Readonly<{
    kind: 'ribbon';
    kindOptions: IRRibbonPathOptions;
  }>;
```

`IRRibbonPath` 是便于 Standard 作者和 adapters 使用的 schema-derived 投影视图，不进入 Core `IRChild` 的闭合 union，也不成为第二个 Path schema 真源。其实际 JSON 先由 Core `PathBaseSchema` 接受开放的 `kind` 与 `kindOptions`，compile lookup 后再由已注册的 `RibbonPathKindDefinition.schema` 解析完整 Path subject。

Core `PathKindDefinition` 因此把 provider identity 与完整 subject schema 分开：

```ts
type PathKindDefinition<TPath extends IRPathBase, TOwnerOutput extends JsonValue = never> = Readonly<{
  name: string;
  schema: z.ZodType<TPath>;
  ownerOutput?: CompileOwnerOutputDefinition<TOwnerOutput>;
  compile: (context: PathKindCompileContext<TPath, TOwnerOutput>) => PathKindCompileResult | null;
}>;
```

`name` 是非空 registry key，不再从 Zod object 的 literal 内部结构推导；`schema` 是该 kind 的完整 Source IR subject schema。Core `PathSchema` 只验证所有 Path Kind 共享的 JSON 结构，不静态分支 Stroke、Ribbon 或第三方 kind。内置 `stroke` schema 负责“省略 kind 等价于 stroke、必须有 children、Stroke 不接受 kindOptions”等完整规则；Standard `ribbon` schema 负责 literal kind、Ribbon options 与顶层 children 的跨字段规则。compile 必须在调用 definition 前通过所选 subject schema 恢复对应的已类型化 path，不能只解析 `kindOptions` 后把未经该 kind 验证的 `IRPathBase` 交给 definition。

`definePathKind()` 同时验证非空 `name` 和 schema，并让 compile context 的 `path` 类型由 schema subject 推导。registry、provider dependency key、unknown-kind diagnostics 与 owner observation 都使用同一 `name`。这是 Path Kind public contract 的有意 breaking 收敛；不保留从 `schema.shape.kind` 读取 key 的兼容分支。

直接 schema 用户可以用 `RibbonPathSchema` 校验一条完整 Ribbon Path；完整 Scene 的通用 Core schema只保证开放 Path host 的结构，kind-specific 合法性在 compile lookup 后由同一 definition schema 验证。缺失或未知 kind definition 先报告 registry lookup 错误；已注册 kind 的 subject 非法再报告其 schema 字段路径。React、Vanilla 和 direct JSON 不得维护另一份 Ribbon validation。

## Path host 与 Ribbon options

Core Path 的通用结构保留 `type`、开放 `kind`、`kindOptions`、Path style / decoration / Scope fields，以及可选顶层 `children`。Core 不再知道 `PathKind.Ribbon` 常量、`ribbon` 字段或 Ribbon mode 的跨字段规则。

Ribbon 参数全部进入 `kindOptions`：

```ts
type IRRibbonPathOptions = Readonly<{
  mode?: 'centerline' | 'boundary';
  samples?: boolean | number;
  sampling?:
    | Readonly<{ kind: 'fixed'; samples: number }>
    | Readonly<{ kind: 'adaptive'; tolerance: number; maxSamples?: number }>;
  width?:
    | number
    | Readonly<{ kind: 'stops'; stops: ReadonlyArray<RibbonWidthStop>; interpolation?: RibbonWidthInterpolation }>
    | Readonly<{ kind: 'profile'; name: string; params?: IRJsonObject }>;
  start?: RibbonEndpoint;
  end?: RibbonEndpoint;
  interpolation?: RibbonTaperInterpolation;
  align?: RibbonAlignment;
  upper?: ReadonlyArray<IRStep>;
  lower?: ReadonlyArray<IRStep>;
}>;
```

代码块表达概念关系；实际公开 schema-derived 类型只包含这些 JSON-safe Ribbon 参数。Width Profile definitions 属于 Ribbon Path Kind definition 的非 IR 运行时依赖，由创建该 definition 的输入承载，不进入 `IRRibbonPathOptions` 或任何 JSON schema。

迁移保持现有 Ribbon 数据语义：

- `centerline` 继续使用 Path 顶层 `children` 作为中心线；必须提供整体 `width`，或同时提供 `start.width` 与 `end.width`
- `boundary` 继续使用 `kindOptions.upper` 与 `kindOptions.lower`，并禁止顶层 `children`
- `samples` 与 `sampling` 互斥；boundary 和 centerline 各自不适用的字段继续 fail-loud
- Path 顶层 style、label、id、meta、animation、transform 与 relation host 语义保持共享，不复制到 options
- 未写 `kindOptions`、options schema 校验失败、profile 缺失或 Ribbon 几何不变量失败均 fail-loud，并包含 `ribbon`、字段路径或 provider 名

旧的 `ribbon` 顶层字段直接删除，不保留 alias、双字段接受或 normalize fallback。这是 0.x breaking migration；作者把 `ribbon: {...}` 改为 `kindOptions: {...}`。本 ADR 不新增专用 Ribbon authoring sugar。

## Core Path Kind 的领域中立服务

Core 删除 Path Kind context 中的 `emitRibbon`。为使 Standard Ribbon 和第三方 Path Kind 不复制 Core 的 target、step、generator、style、label 与 output wrapping，Core 把现有 Stroke emitter 拆成两个稳定层次：

```ts
type MaterializedPath = Readonly<{
  commands: ReadonlyArray<PathCommand>;
  boundsPoints: ReadonlyArray<IRPosition>;
}>;

type PathKindCompileContext<TPath extends IRPathBase, TOwnerOutput> = Readonly<{
  path: TPath;
  ownerOutput: CompileOwnerOutputPublisher<TOwnerOutput>;
  materializePath: (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => MaterializedPath;
  emitStroke: EmitStroke;
  emitHostLabels: (input: PathKindLabelInput) => ReadonlyArray<ScenePrimitive>;
  appearance: ResolvedPathKindAppearance;
  round: (value: number) => number;
}>;
```

这些名称表达必须冻结的公开服务职责，实际类型继续复用 Core 既有 `IRPathBase`、`PathCommand`、Scene primitive、appearance、label 和 owner-output 原子，不复制平行数据模型。kind-specific options 已包含在 schema 恢复后的 `path.kindOptions`，context 不再维护一份独立 `options` 真源。

- `materializePath` 负责把选定 steps 经过 Core target / anchor / boundary clip、relative target、Path Generator、rounded corner 和结构化 command lowering，得到当前 Path 局部坐标系内的确定性路径事实；它不应用 Stroke marker、dash、shrink、fill 或 Ribbon 宽度
- `materializePath` 只返回结构化 commands 与几何 bounds；如何把 commands 转成 Ribbon segment、如何限制开放子路径以及如何采样由 Standard Ribbon 拥有。它不暴露 Core 私有 cache、namespace stack 或 orchestration state
- `emitStroke` 保持普通 Stroke Path Kind 与需要描边组合的第三方 kind 复用，并可发布既有 Stroke owner output
- `emitHostLabels` 按 Path 的共享 label、host opacity、style inheritance、TeX 与 warning 语义生成 label primitives；Path Kind 提供归一化位置上的 anchor、tangent 与可选 boundary offset，不复制文本和 label 编译
- `appearance` 是 Core 已解析的 Path fill、stroke、opacity、shadow 与 blend mode 等 renderer-neutral appearance，只读且不包含 Ribbon 字段；`round` 与同次 compile 的输出精度一致

Core 服务只接受和返回显式只读数据，相同上下文调用结果确定，不允许 definition 读取或修改 compiler 私有状态。Path Kind definition 仍返回 `primitives + boundsPoints`，Core 继续统一处理 Path 外层 Scope、transform、layout bounds、observation、provenance 与 diagnostics。

该服务集合是 Ribbon 所需的最小公共面，不把整个 Stroke/Ribbon compile internals 公开。若某项 Ribbon 几何仅用于横截面、采样、轮廓、cap、width interpolation 或 profile 求值，它属于 Standard；若一项行为对所有 Path Kind 都成立并负责解析 Core Path host，它属于上述 Core services。

## Ribbon Width Profile 收敛

Ribbon Width Profile 是 Ribbon options 的内部扩展轴，不再作为 Core 顶层 provider family。`defineRibbonWidthProfile()` 与 registry resolver 迁到 `@retikz/standard/ribbon`，内置 `bulge` 与自定义 profile 仍走同一 definition、schema parse、key conflict 和 width validation 路径。

Standard Ribbon dependency provider 以 Core `pathKind + ribbon` 为完整 key。`createRibbonProviderContribution()` 始终复用 Standard 导出的同一 maker 与 dependency 声明，并用 profile name 作为 owner-local 数据项 key；默认贡献官方 `bulge`，调用方可以追加自定义 profiles。Core dependency resolver 只按数据项 key 与引用合并 datasets，再调用一次 Standard maker；maker 由合并结果创建唯一、不可变的 `RibbonPathKindDefinition`，并在创建时以相同 profile name 构建 Ribbon 私有 registry。

相同 profile Definition 引用可以被多个 contribution 重复携带；同名不同 definition、非法名称或 schema 冲突 fail-loud。一次 compile 仍只注册一个 `ribbon` Path Kind definition，因此不存在多个 Ribbon definitions 的覆盖顺序，也不存在 Core 顶层 profile registry 与 Ribbon 私有 registry 的双轨。直接 compile 若不使用 dependency resolver，可以使用官方 `RibbonPathKindDefinition`，或调用 `createRibbonPathKindDefinition({ profiles })` 后把结果传入 `pathKinds`；factory 同样默认包含官方 `bulge`，同名自定义项不能覆盖它。

profile `params` 保持 JSON-safe 并由对应 definition 的 `paramsSchema` 解析；`widthAt` 返回非负有限 user-unit 宽度。无效 params、未知 profile、非有限或负输出必须带 profile 名和 Ribbon 路径位置 fail-loud。Width Profile function、definition 或 registry 不进入 IR、Scene、manifest、artifact 或 renderer。

## Standard Ribbon 编译与输出

Standard Ribbon definition 完整拥有以下行为：

1. 解析和验证 `kindOptions`
2. 通过 Core `materializePath` 获取 centerline 或上下 boundary 的已物化开放路径
3. 解析固定宽度、端点 taper、stops 或注册 profile，并按 fixed / adaptive 策略采样
4. 计算横截面、alignment、caps、轮廓和 label 边界偏移
5. 使用 Core paint / precision services 输出普通 Scene Path 与共享 host labels
6. 返回包含带状轮廓与 labels 的 primitives，以及能覆盖真实视觉几何的 bounds points

centerline 必须是单条非零长度开放子路径；boundary 的 upper / lower 必须各自物化为单条合法开放子路径。多 move、close/cycle、零长度整体路径、非有限采样坐标、无效 arc cap、不能满足的 profile 或 boundary 对应关系继续 fail-loud。零长度局部段可以按既有 Ribbon 规则忽略，但不能让整体 Ribbon 静默消失。

Ribbon 输出仍只使用 Core 已有 Scene primitives。SVG 与 Canvas renderer 不识别 `ribbon`，也不承担采样、offset、cap 或 profile 逻辑。相同 IR、definitions、host services 和 precision 必须得到 renderer 无关的同一 Scene；两种 renderer 的差异只能来自既有 Scene 执行容差。

## Plot 与 adapter 闭环

Plot Relation Ribbon 仍由 Plot 拥有 channel、source / target、relation、width encoding、style delivery、provenance 与 locator。Plot lowering 输出：

```ts
{
  type: 'path',
  kind: 'ribbon',
  children: centerlineSteps,
  kindOptions: ribbonOptions,
  ...sharedPathHostFields,
}
```

Plot 的 adapter-neutral contribution 显式要求 `pathKind + ribbon` root，并携带 Standard Ribbon dependency provider 与官方 profile dataset；Plot 包直接依赖 `@retikz/standard/ribbon`，不从 Standard 根入口或宿主环境隐式获得它。Plot 自己不复制 Ribbon schema、profile、几何或 Scene 输出。

Core React 的通用 `<Path kind="ribbon" kindOptions={...}>`、Vanilla 通用 Path authoring 与直接 JSON 都构造同一 canonical Core Path；它们不内置 Ribbon prop、profile 或 definition。React 调用方通过 `<Layout pathKinds={[RibbonPathKindDefinition]}>` 显式装配；Vanilla 调用方通过通用 compile options 做相同装配。Core React `<Layout>` 与 Vanilla compile options 同时删除 `ribbonWidthProfiles` 专用接线。直接 `compileToScene` 的调用方必须显式把 `RibbonPathKindDefinition` 放入 `pathKinds`，或使用 ADR-02 的 Core resolver 装配 Standard Ribbon contribution。只有 Plot 等 Tier 2 adapter 在其 authored contribution 中自动声明自身所需 Ribbon provider。

## 行为、失败语义与兼容性

- `kind: 'ribbon'` 名称、Ribbon 参数含义、默认 mode / alignment / cap / sampling、几何、label 和 Scene 输出保持不变
- canonical IR 的 Ribbon 参数从顶层 `ribbon` 移到 `kindOptions`，Core Ribbon exports 与 `CompileOptions.ribbonWidthProfiles` 被删除，是明确 breaking change
- 未注册 Ribbon definition 时，Core 按普通未知 Path Kind fail-loud，并列出 `stroke` 与本次显式注册项
- 未注册 profile、重复 profile、无效 params、非有限宽度、无效路径结构和采样失败由 Standard Ribbon definition fail-loud；Core 不增加 Ribbon 字符串特判
- 相同 key 的不同 Ribbon Path Kind definitions 由 ADR-02 assembly / Core path-kind registry fail-loud；不允许 Standard 官方 definition 静默覆盖用户 definition
- 不保留 Core Ribbon re-export、旧 `ribbon` 字段 alias、`ribbonWidthProfiles` compatibility mapping 或自动注入 Standard 的 fallback

## 实施结果

Core 已收口为开放 Path host、完整 subject schema 与领域中立编译服务；Ribbon 的 schema、Width Profile、几何编译、单项 Definition 与 provider contribution 均由 `@retikz/standard/ribbon` 单一拥有。Plot 通过显式 provider 闭包获得 Ribbon，React、Vanilla 与直接 Core compile 共用 `pathKinds + kindOptions` 装配语义。

验收已覆盖开放 host、完整 schema 恢复、provider identity、路径物化与标签服务、Ribbon 两种模式、采样、端帽、profile 冲突与失败语义、Plot 与 adapter 闭环、renderer-neutral Scene 输出以及双语文档。迁移不保留旧公共字段、导出或自动 fallback。
