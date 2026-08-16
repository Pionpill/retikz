# ADR-11：Layout-aware Composite 的完整 Scope 输出契约

- 状态：Accepted
- 决策日期：2026-08-04
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-08：Layout proposal / probe contract](./08-layout-proposal-probe-contract.md) · [ADR-09：Inherited Theme context](./09-inherited-theme-context.md) · [ADR-10：Core atomic contracts](./10-core-atomic-contracts.md) · [Standard presentation composite reuse](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/10-presentation-composite-reuse.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md)

## 背景与目标

ADR-08 为 layout-aware Composite 建立了双轴 proposal、probe、一次性 replay、allocation bounds 与 failure isolation。现有 `context.scope()` 只暴露普通 Scope 的一部分结构字段，`replay()` 则承载 compile-local 的数值变换和裁剪外壳。两者的表面不完整且边界容易混淆：上层 composite 可以声明一个 Scope-backed 组合，却无法在同一条 Core 主链上表达普通 Scope 的样式级联、默认值、样式重置或 placement；如果把这些属性塞进 replay wrapper，又会把 authored Scope 语义误当成布局提交细节。

这会使 Tier 2 在 lower 到 Scope 时出现接受但未消费、把根属性复制到每个 child、或在 adapter 中自行合并 style / transform / clip 的风险。目标是让 layout-aware Composite 可以输出一个具有完整普通 Scope 语义的 authored Scope，同时让 replay wrapper 保持窄职责；所有 Scope 行为继续由 Core 的既有 schema、style frame、identity、namespace、bounds、clip、artifact 与 Scene 编排定义。

## 决策：把 authored Scope 与 replay submission 分成两个稳定的 Core 契约

Core 提供可独立复用的 `ScopePropsSchema` / `IRScopeProps`，表达 `IRScope` 除固定 `type` 和生成的 `children` 以外的完整 Scope surface。layout-aware Composite 的 `context.scope()` 消费完整 `IRScopeProps`；`context.replay()` 只消费 compile-local 的数值 `transforms` 和 allocation-coordinate 的 `clip`。普通 Scope 与 layout-aware 输出不再维护两套字段语义。

### Authored Scope surface

`ScopePropsSchema` 与 `ScopeSchema` 共享同一字段约束、默认值、描述和 strict unknown-field 行为。它包含以下语义组：

- `theme`、`id`、`localNamespace`、`boundingShape`、`meta`、`animations` 与 `zIndex`
- 完整 authored `transforms` 与最终 `placement`
- 级联 graphic style：`color`、`stroke`、`fill`、`strokeWidth`、`opacity`、`fillOpacity`、`strokeOpacity`
- 四个默认通道：`nodeDefault`、`pathDefault`、`labelDefault`、`arrowDefault`
- `resetStyle` 与 Scope-local `clip`

公开契约的最小形态为：

```ts
type IRScopeProps = {
  theme?: IRTheme;
  id?: string;
  localNamespace?: boolean;
  transforms?: Array<IRTransform>;
  placement?: IRScopePlacement;
  color?: string;
  stroke?: string | IRPaint;
  fill?: string | IRPaint;
  strokeWidth?: number;
  opacity?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  nodeDefault?: IRNodeDefault;
  pathDefault?: IRPathDefault;
  labelDefault?: IRLabelDefault;
  arrowDefault?: IRArrowDefault;
  resetStyle?: boolean | Array<StyleChannel>;
  zIndex?: number;
  clip?: IRClip;
  boundingShape?: ScopeBoundingShapeValue;
  meta?: IRJsonObject;
  animations?: Array<IRAnimationTrack>;
};

type CompositeCompileScopeProps = Readonly<IRScopeProps>;
```

`IRScopeProps` 是 schema 派生的公共类型；上层不得声明同义的 Scope fragment。`ScopeSchema` 继续负责把该 fragment 与固定 `type: 'scope'`、递归 `children` 组成完整 `IRScope`。Scope props 本身不接受 `type` 或 `children`，也不成为新的顶层 IR 类型。

### Replay wrapper 的窄职责

```ts
type CompositeReplayWrapper = Readonly<{
  transforms?: Array<Transform>;
  clip?: IRClip;
}>;
```

这里的 `transforms` 是已经由父布局确定的数值提交变换，不是普通 authored Scope 的完整 transform contract；`clip` 是父 allocation coordinate 中包住 replay 结果的临时裁剪外壳。wrapper 不接受 `id`、`localNamespace`、`placement`、graphic style、默认通道、`resetStyle`、`theme`、`zIndex`、`meta` 或 `animations`。这些字段只能属于 authored Scope，不能通过 replay 重新解释。

### Layout-aware output 的编排语义

`context.scope(props, children)` 创建 callback-local 的 opaque Scope output。`children` 可以是普通 `IRChild` 或当前 callback 产生的一次性 replay child；Core 在最终编译时把它们放入普通 Scope orchestration，而不是把 replay primitive 直接拼到父级 Scene。

1. authored Scope 的 `transforms` 按普通 Scope 的顺序在自身局部坐标中应用
2. authored Scope 的 `placement` 在 intrinsic layout 和自身 transforms 完成后按普通 Scope 规则解析
3. replay wrapper 的数值 transforms 只把已经 probe 的 child 放入父布局决定的 slot；wrapper clip 位于同一个 allocation submission coordinate，并包住该 replay 结果。这个 allocation submission 发生在 authored root 的普通 transforms / placement 之前，不能把 replay translation 当成 authored root transform
4. authored `clip` 保持 Scope-local 语义；它与 allocation clip 都保留，经过各自坐标投影后形成嵌套裁剪的交集，不互相覆盖
5. `allocationBounds` 仍是 composite 对父布局声明的外层 allocation box；authored Scope 的普通 intrinsic / allocation / visual contribution 进入 Core bounds 编排，不能因 replay wrapper 存在而被绕过或由 Standard 重新估算

authored Scope 的 graphic cascade、四个 default channel、`resetStyle` 和 `theme` 对普通 child、nested Composite 与 replay child 使用同一 Core 继承语义。child 显式样式优先于外层继承；`resetStyle` 只切断声明的样式通道，不清除 Theme。若 replay transaction 需要物化外层样式，必须在 Core 的 probe / replay channel 内完成，Standard 不得手写 style merge。

### Identity、namespace、metadata 与空 Scope

- authored `id` 是真实 Scope identity，按普通 Scope 注册到父 namespace；`localNamespace`、`boundingShape`、重复 id、引用、anchor 与诊断沿用 Core 语义
- replay wrapper、allocation Scope 和内部编排节点不产生 authored identity，不用数组位置、内容 hash、宿主 occurrence id 或自动 suffix 冒充用户 id
- authored `zIndex` 作用于 Scope group 作为一个同层单元；`meta` 与 `animations` 落在 authored Scope group，不自动复制给每个 replay primitive
- 空输出沿用普通 Scope 的可观察规则：没有 identity、可见产物、transforms 或 clip 时可以按 Core 的普通 prune predicate 省略无承载物的 Scope group；一旦 Core 普通规则需要保留 authored group，`id`、`meta`、`animations`、z-order、clip 与其它 group 属性必须原样落在该 group 上。layout-aware output 不用空 child、placeholder 或 Standard 私有 wrapper 改写这一规则
- compile occurrence、领域 item key、宿主 embed id 和 authored Scope id 是不同身份；Core 只负责其各自既有生命周期和诊断，不建立隐式映射

## 行为、失败语义与兼容性

- 默认行为：省略 authored Scope props 时与普通无属性 Scope 等价；省略 replay wrapper 时不附加提交变换和 allocation clip。Scope 的默认值、继承、placement、bounds、z-order、namespace 和 Scene group 语义与现有 Core Scope 保持一致
- 失败与诊断：Scope props 与 replay wrapper 均为 strict contract。未知字段、错误类型、非法 transform / placement / clip、伪造或跨 callback 的 replay result 由 Core contract 诊断；未解析 placement target、重复 identity 与 nested definition 缺失沿用 Core 的现有错误或 warning 级别，不由上层静默修正
- 兼容性 / breaking：新增 `ScopePropsSchema` / `IRScopeProps` 是 additive export；完整 `ScopeSchema` 的既有合法输入、JSON 形态和 compile 结果保持等价。layout-aware Composite 的 `context.scope()` 从部分结构 surface 扩展为完整 authored surface，alpha.2 未发布前允许移除把 authored transform 当作 replay transform 的旧解释；不保留把 style、placement 或 identity 塞入 replay wrapper 的兼容别名
- React / Vanilla 等价性：本 ADR 不新增宿主语义。两个 adapter 若暴露 Scope-backed layout-aware Composite，必须把相同字段写入同一 JSON-safe authored Scope contract；宿主 occurrence 只能作为 adapter / compile locator，不能代替 authored `id`

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 Core Composition / Scope contract；解决 layout-aware output 无法完整复用普通 Scope 语义的问题
- 主责包与协作包：`@retikz/core` 主责；`@retikz/math` 不新增职责，`@retikz/render` 继续执行既有 Scene，Standard 与其它 Tier 2 通过公开 Core contract 消费，React / Vanilla 负责等价 authoring
- 拥有：Core Scope props fragment、layout-aware `scope` / `replay` 边界、Scope style/theme/identity/bounds/clip/diagnostics 的统一编排
- 不拥有：Standard / Plot / Table 的领域 schema、布局 solver、preset、artifact 领域字段、host lifecycle 或 renderer-specific semantics
- 外部扩展与下游闭环：现有 `CompositeDefinition` / registry 继续承载内置与自定义 Composite；layout-aware callback 通过同一个 probe、replay、namespace、provider、Scene、manifest 与 diagnostics 主链消费，不新增 Scope registry 或 renderer 分支
- 不支持边界：不把 replay token 持久化为 IR，不支持跨 compile 重放，不用 Core 统一领域默认，不为 DOM / renderer 回读或 adapter 私有测量提供旁路

## 架构验证

- 是否可由现有能力组合：可以。普通 Scope schema、style frame、Theme context、namespace / identity、bounds、clip、placement 和 ADR-08 的 probe / replay 已具备所需基础；本 ADR 统一其公开入口和输出边界
- math / core / render / adapter 责任切分：math 保持纯几何；Core 校验和编排 Scope、probe、replay 及 Scene / manifest；render 不读取 authored Scope；adapter 只转换 authoring，不复制 Scope contract
- 是否需要新 IR / contract / registry：需要新增可复用的 Core Scope props schema/type 和 layout-aware Scope output contract；不新增顶层 IR、Scene primitive、provider family 或 registry
- Scene / manifest / renderer / diagnostics 如何闭环：authored Scope 继续输出普通 Core group / primitive；replay 只在同一次 compile 中提交 transaction，并沿既有 occurrence、identity、artifact、z-index、clip resource 与 warning / error 路径落地
- provenance / locator / Interaction Readiness 是否适用：保留现有 compile occurrence、Scope identity、artifact 与 metadata 落点；本 ADR 不发明领域 provenance 或交互状态
- 结论：下沉并扩展 Core 当前 Composition contract；Standard 组合并消费，不在上层补齐缺口

## 能力完备性检查

- 所属能力面：Drawing Complete 的 Scope / Composition 输入与 layout-aware child output
- 内部表达链路：`ScopePropsSchema` → `IRScope` / `CompositeCompileScopeProps` → 普通 Scope orchestration 与 Core probe / replay → Scene / manifest
- 外部扩展链路：内置与自定义 Composite 均经同一 `CompositeDefinition` registry、compile environment、provider、namespace 和 diagnostics；Scope props fragment 不创建新的扩展点
- 下游执行 / adapter 等价性：SVG / Canvas 继续消费相同 Scene；React、Vanilla 与 headless 输入使用同一 authored Scope 和 replay contract
- 不支持边界与诊断：不允许上层接受后丢弃 Scope 字段，不允许用 replay wrapper 扩张普通 Scope 语义；缺失的通用能力必须回到 Core 继续补齐
- 本轮结论：扩展 Core 当前 Composition 域，作为 Standard Scope-backed composite 和其它 Tier 2 lower reuse 的前置 capability；不移动到 Standard 或 renderer

## 被否决方案

- **继续只暴露结构属性**：会让 layout-aware Composite 不能复用普通 Scope 的完整公共能力，持续制造字段漂移
- **把样式、placement 和 identity 加到 replay wrapper**：把 authored 语义与 compile-local submission 混在一起，破坏 namespace、style cascade 和 nested bounds
- **由 Standard / adapter 手写 style、transform 或 clip 合并**：形成平行 Core 逻辑，无法保证普通 child、nested Composite 与 replay child 等价
- **每个 replay child 外包一层带用户 identity 的 Scope**：会改变 occurrence、namespace、z-order、artifact 与重复 id 语义，并生成未声明的身份
- **新增 renderer primitive 或 Scope registry**：Core 现有 group、Composite registry 和 compile transaction 已足够，新增旁路会破坏依赖方向

## 测试策略摘要

需要 schema / public-type 证据证明 Scope fragment 与完整 Scope 的合法、非法、默认值和 JSON round-trip 等价；需要 Core contract / compile 证据证明 authored props、普通 child、nested Composite 和 replay child 共享 style/theme、identity、placement、bounds、z-order、metadata、animation 与两类 clip 语义；需要 failure / adversarial 证据证明 wrapper 窄职责、one-use replay、空 Scope、重复 identity、未解析 placement 和 nested definition failure；需要 React / Vanilla parity 与 renderer Scene parity 证据，但不以 renderer 回读替代 Core contract。

## 不在本 ADR 范围

- Standard Axes、Grid、Frame、Legend 的领域字段、排版、lattice、Frame header 与 Legend artifact 设计
- Plot、Table、Gantt 或其它 Tier 2 的实际迁移
- 新的 renderer 能力、DOM intrinsic measurement、异步 probe、跨 compile replay、增量 solver 或交互状态
- 为既有 `0.x` API 保留与旧字段语义冲突的兼容桥接
