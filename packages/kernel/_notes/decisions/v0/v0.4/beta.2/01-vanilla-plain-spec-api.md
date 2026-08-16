# ADR-01：Vanilla plain spec API 与 Tier 2 增量边界

- 状态：Accepted
- 决策日期：2026-07-08
- 验收日期：2026-07-12
- 实现提交：`85b87479`、`c8edba13`、`3849bc3d`
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [alpha.2 Tier 2 支撑](../alpha.2/01-embeddable-tier2-in-layout.md)

## 背景

旧 `@retikz/vanilla` 作者层以带方法和闭包状态的 `Figure` builder 为中心，同时承载构图、挂载和 SSR 操作。这种模型不利于 LLM 生成、结构化比较和序列化，也缺少后续 diff、分层缓存和 Tier 2 嵌入所需的稳定 identity 与 authoring 边界。

本决策只重构 Vanilla 作者层，不改变 core IR、Scene schema 或 composite lowering。plain spec 在进入 core 前规范化为 IR、composite definitions 和仅供 Vanilla runtime 使用的 metadata。

## 决策

### Plain spec 是唯一主作者模型

`figure()`、`node()`、`path()`、`coordinate()`、`scope()`、`layer()`、`embed()` 只返回 plain object。`Figure` class-like builder 及其链式 `.node()`、`.draw()`、`.mount()` API 从公共面删除，不保留 legacy alias。

`InputScene` 的根结构只允许以下二选一：

- `children`：单层图简写，规范化为隐式默认 layer。
- `layers`：显式 authoring 分层，携带 `id`、`cache`、`zIndex` 和 children。

同时提供 `children` 与 `layers` 必须 fail-loud。

### 声明与 runtime handle 分离

`mount(container, spec, { renderer })` 是统一挂载入口，按 `renderer` 委托 `mountSvg` 或 `mountCanvas`；`renderToSvgString` 继续作为 SSR 入口。spec 不携带 runtime 方法，只有挂载返回的 `VanillaView` / `CanvasView` 管理 `update`、`hydrate`、animation 和 `dispose`。

当前 `update(nextSpec)` 允许整图重渲染，但必须复用根 SVG / Canvas 元素，并更新 live Scene 与 `runtimeMeta`，使既有 hydration context 在 update 后读取新图。

### Layer 是 Vanilla authoring 边界

layer 按 `zIndex ?? 0` 升序稳定排序，同值保持声明顺序；layer 内仍按 children 数组顺序绘制。`cache`、layer identity 与失效 metadata 不进入 core IR。

规范化结果保留：

- 排序后的 layer metadata；
- `identityIndex` 与 `parentIndex`；
- 匿名直接 child 回退到父 layer 的最小稳定失效边界。

这些信息只为后续 patch / invalidate 预留基础，本 ADR 不实现真实增量渲染。

### Tier 2 通过显式 adapter 嵌入

`embed(kind, id, props)` 由 `options.adapters` 中匹配 `kind` 的 `VanillaTier2Adapter` 静态下沉。adapter 贡献一个 core IR child、datasets 和 `makeComposites`：

- 缺少 adapter 时 fail-loud；
- contribution 按 namespace 首次出现顺序聚合；
- 同 namespace、同 reference 只能指向同一对象；
- 同 namespace 必须复用同一 `makeComposites` 函数；
- adapter 根输出可复用 embed id，其余公开 id 按真实父子关系进入 identity metadata，不要求字符串前缀；
- adapter composites 先聚合，用户显式 `compile.composites` 后置拼接。

Vanilla 不复用 React 的 JSX 静态属性协议；两端只共享“贡献 core IR 与 lowering 资源”的架构意图。

### Core 边界保持不变

plain spec、layer cache、identity metadata、adapter 函数和 datasets 均不进入 core IR。core 仍只消费现有 JSON IR 与 `CompositeDefinition`，不新增 Vanilla 专属 schema、Scene primitive 或 compile 分支。

## 公开契约

```ts
const spec = figure({
  id: 'flow',
  layers: [
    layer('main', { cache: VanillaLayerCache.Static }, [
      node('a', { position: [0, 0], text: 'A' }),
      node('b', { position: [120, 0], text: 'B' }),
      path('edge', { way: ['a', 'b'] }),
    ]),
  ],
});

const view = mount(container, spec, { renderer: 'svg' });
view.update(nextSpec);
```

公开入口包含 plain spec helpers、`VanillaLayerCache`、相关 spec / adapter / metadata 类型，以及 `mount`、`mountSvg`、`mountCanvas`、`renderToSvgString`、`hydrate`。Vanilla 不再转发 core registrars、way 常量、animation presets 或旧 builder internals。

## 兼容性与否决方案

- **BREAKING**：旧 `Figure` builder 被删除。迁移方式是改用 `figure({ children | layers })`，并把 `.mount()` / `.toSvgString()` 改为独立 runtime 函数。
- 不保留 legacy builder：0.x 阶段继续维护两套作者模型会扩大文档、类型和新能力分叉。
- 不把 layer 写进 core IR：layer cache 与失效边界属于 adapter runtime，不是 renderer-agnostic 图形语义。
- 不直接复用 React Tier 2 adapter：Vanilla 没有 JSX 与组件静态遍历，强行共享会把框架机制泄漏进无框架入口。
- beta.2 不为 plain spec 新增 Zod schema；若未来把它定义为长期持久化格式，需要另行设计版本与迁移契约。

## 最终实现

- `packages/kernel/vanilla/src/spec/` 拥有 plain spec 类型、helpers、normalization、identity 与 Tier 2 contribution 聚合。
- `packages/kernel/vanilla/src/runtime/` 统一消费 `Scene | IRScene | InputScene`，并由 SVG / Canvas view 保存 live Scene 与 runtime metadata。
- 旧 `builder/` 与 `Figure` 实现、测试和公共导出已删除；包根只聚合 `spec` 与 `runtime` owner。
- Vanilla README、文档站中英文页面和 ComponentPreview 的 Vanilla codegen 已切换到 plain spec。

## 验证

2026-07-12 依据当前 `next-kernel` HEAD 复核：

- 三个实现提交均位于当前分支。
- `@retikz/vanilla` ESLint 与 `tsc --noEmit` 通过。
- Vanilla 测试通过：10 files / 66 tests。
- Vanilla codegen 文档测试通过：1 file / 17 tests。
- 测试覆盖 helpers/plain object、children/layers 互斥、layer 顺序与 metadata、Tier 2 聚合与诊断、全局 identity 唯一性、adapter 根 identity 复用、统一 mount、root identity、update/hydration 以及公共入口移除旧 builder。

主 agent 执行的 Contract Auditor 未发现实现、公开类型、README 与双语 docs 的 BLOCKING 偏差。收口时补齐 Vanilla v0.4 beta.2 changelog，使 breaking 迁移说明与实际公共面一致。

## 遗留边界

- `patch()`、`invalidate()`、SVG DOM diff、Canvas bitmap layer、dirty rectangle 与 scheduler 仍是后续能力，不属于本 ADR。
- plain spec helpers 只保证返回无方法的 plain object；`embed().props` 与 adapter datasets 的可序列化性由调用方和 adapter 负责，函数与宿主对象不得进入最终 core IR。
- plot 用户 API、mark 级 patch 和真实 `@retikz/plot-vanilla` Tier 2 adapter 由 viz 方向单独设计。
- 若 runtime metadata 或 diff hint 需要跨 React / Vanilla 共享，再另起 ADR 上移公共 contract。
