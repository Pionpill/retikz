# ADR-01：Vanilla plain spec API 与 Tier 2 增量边界

- 状态：Accepted
- 决策日期：2026-07-08
- 关联：[alpha.2 Tier 2 支撑](../alpha.2/01-embeddable-tier2-in-layout.md)

## 背景

旧 Vanilla `Figure` builder 同时承载构图、挂载和 SSR，带方法与闭包状态，不利于 LLM 生成、结构化比较、序列化和后续 identity / diff 边界

## 决策

`figure()`、`node()`、`path()`、`coordinate()`、`scope()`、`layer()`、`embed()` 只返回 plain object。`Figure` class-like builder 及链式 `.node()`、`.draw()`、`.mount()` 从公共面删除，不保留 legacy alias

`InputScene` 根结构只能二选一：

- `children`：规范化为隐式默认 layer
- `layers`：携带 `id`、`cache`、`zIndex` 和 children 的显式 authoring 分层

二者并存必须 fail-loud。Layer 按 `zIndex ?? 0` 稳定排序，同值保留声明顺序；cache、layer identity 和失效 metadata 只留在 Vanilla runtime，不进入 Core IR。规范化结果可保留排序后的 layer metadata、`identityIndex`、`parentIndex` 和匿名 child 的最小失效边界，但本 ADR 不实现增量渲染

`mount(container, spec, { renderer })` 是统一挂载入口；`renderToSvgString` 是 SSR 入口。Spec 不携带 runtime 方法，挂载返回的 view 管理 `update`、`hydrate`、animation 和 `dispose`。`update` 可整图重渲染，但必须复用根 SVG / Canvas 元素并更新 live Scene 与 runtime metadata

### Tier 2 adapter

`embed(kind, id, props)` 由显式 `options.adapters` 中匹配 kind 的 `VanillaTier2Adapter` 下沉。Adapter 贡献一个 Core IR child、datasets 与 `makeComposites`：缺少 adapter、同 namespace / reference 指向不同对象、同 namespace 使用不同 `makeComposites` 都 fail-loud；贡献按 namespace 首次出现顺序聚合，adapter composites 先于显式 `compile.composites`

Vanilla 不复用 React JSX 静态属性协议；两端只共享“贡献 Core IR 与 lowering 资源”的架构意图

## 公开契约、失败语义与兼容性

Plain spec、layer cache、identity metadata、adapter 函数和 datasets 不进入 Core IR。Core 继续只消费现有 JSON IR 与 CompositeDefinition，不新增 Vanilla 专属 schema、Scene primitive 或 compile 分支。旧 builder 是 breaking removal，迁移到 `figure({ children | layers })` 与独立 runtime 函数；不保留双轨

Plain spec helper 必须返回无方法 plain object；embed props 与 datasets 最终不得把函数或宿主对象带入 Core IR。预留的 `patch`、`invalidate`、DOM diff、bitmap layer 和真实 Tier 2 domain adapter 不是本 ADR 的已交付能力

## 最终结果与遗留边界

Vanilla 已统一 plain authoring、mount / SSR、view lifecycle 和 Tier 2 contribution 边界，Core、React 与 Vanilla 不再维护 builder 与 plain spec 双轨。真实增量 patch、domain-specific adapter 与跨框架 metadata contract 仍需独立设计
