# ADR-01：Vanilla plain spec API 与 Tier2 增量边界

- 状态：Proposed
- 决策日期：2026-07-08
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [alpha.2 ADR-01 可嵌入 Tier2 in `<Layout>`](../alpha.2/01-embeddable-tier2-in-layout.md) · [alpha.7 ADR-04 adapter surface and docs](../alpha.7/04-adapter-surface-and-docs.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)

## 背景

当前 `@retikz/vanilla` 同时承担两类职责：无框架 runtime / SSR 入口，以及一套命令式 builder。`renderToSvgString`、`mountSvg`、`mountCanvas`、`hydrate` 等 runtime 入口已经比较清晰；但作者层的 `Figure` 是 class-like 闭包对象，既暴露 `.ir`，也把 `.node()`、`.draw()`、`.scope()`、`.mount()`、`.toSvgString()` 等链式方法挂在同一个对象上。

这套 API 对小图和示例友好，但对 beta.2 之后的三类目标不够稳定：

1. **LLM 生成**：链式 / 可变 builder 隐含顺序和内部状态，模型很容易混合“声明图形”和“操作 view”的概念；plain object 更容易被生成、结构化校验、diff、序列化和解释。
2. **增量渲染**：现有 `VanillaView.update(next)` 明确是整图重渲染，不承诺局部 patch。未来要做 diff、bailout、静态层缓存和分层渲染，作者层必须先暴露稳定 identity、层级边界和可计算的子树身份。
3. **Tier2 兼容**：React 已有可嵌入 Tier2 适配器协议，经 JSX 静态遍历贡献 IR / datasets / composites；Vanilla 没有 JSX，不应该复制 React 组件静态属性方案，而应提供一个等价的 plain spec 嵌入边界，让 plot / flow / table 等 Tier2 能在无框架入口里保持同一 lowering 真源。

因此，本 ADR 只重构 vanilla 作者层 API，不改变 core IR / Scene 的 JSON 契约。core 仍只理解 Tier1 IR 与已有 composite lowering；vanilla 的新 spec 是 authoring surface，在进入 `compileToScene` 前规范化为 core IR、compile options 和 runtime metadata。

## 决策：以 plain spec 作为 Vanilla 唯一主作者模型

`@retikz/vanilla` 新主入口采用 plain spec：`figure()`、`node()`、`path()`、`scope()`、`layer()`、`embed()` 等 helper 只返回 JSON-safe 描述对象，不返回携带方法的 `Figure` 实例。runtime 入口与作者入口分离：`mount(container, spec, options)` / `renderToSvgString(spec, options)` 接收 spec，返回的 `VanillaView` 才是有状态对象。

`Figure` 链式 API 不再作为 canonical authoring model。0.x 阶段允许破坏性替换；如果实现阶段需要迁移窗口，旧 builder 只能作为 legacy sugar，内部产同一份 plain spec，且所有新能力只在 plain spec 上首发。新文档主路径使用 `path()`，与 core IR `path` 对齐；`draw()` 如保留，仅作为 TikZ-like legacy sugar。

新增 `mount(container, spec, { renderer })` 作为主挂载入口。`mountSvg` / `mountCanvas` 可以继续作为低层显式入口保留，但不得拥有 plain spec 之外的独有能力。Tier2 adapter contract 在本 ADR 内先归属 `@retikz/vanilla`；若后续 React 也需要共享 diff hint 或 runtime metadata，再另起 ADR 上移共享 contract。

草案类型：

```ts
export const VanillaLayerCache = {
  Static: 'static',
  Dynamic: 'dynamic',
  Auto: 'auto',
} as const;

type VanillaLayerCacheValue = ValueOf<typeof VanillaLayerCache>;

type VanillaFigureSpec = {
  type: 'figure';
  version: 1;
  id?: string;
  viewBox?: IRViewBox;
} & ({ children: Array<VanillaChildSpec>; layers?: never } | { layers: Array<VanillaLayerSpec>; children?: never });

type VanillaLayerSpec = {
  type: 'layer';
  id: string;
  cache?: VanillaLayerCacheValue;
  zIndex?: number;
  children: Array<VanillaChildSpec>;
};

type VanillaChildSpec = VanillaNodeSpec | VanillaPathSpec | VanillaScopeSpec | VanillaEmbedSpec;

type VanillaEmbedSpec<TProps = Record<string, unknown>> = {
  type: 'embed';
  kind: string;
  id: string;
  props: TProps;
};

type VanillaTier2Adapter<TProps = Record<string, unknown>> = {
  kind: string;
  namespace: string;
  lower: (props: TProps, context: VanillaEmbedContext) => VanillaTier2Contribution;
};

type VanillaTier2Contribution = {
  node: IRChild;
  datasets: Record<string, unknown>;
  makeComposites: (mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>;
};

type VanillaEmbedContext = {
  id: string;
  kind: string;
  namespace: string;
  layerId: string;
  identityPath: Array<string>;
};

type VanillaNormalizedFigure = {
  ir: IRScene;
  composites: Array<CompositeDefinition>;
  runtimeMeta: VanillaRuntimeMeta;
};
```

关键约束：

1. **plain spec 是唯一真源**：helper 可以简化书写，但结果必须等价于手写 object；spec 可结构化校验，但 beta.2 不新增 vanilla Zod schema。若后续要把 spec 作为长期持久化格式，再单独补 schema ADR。
2. **runtime handle 与 spec 分离**：`VanillaView` 只管理挂载目标、当前 Scene、事件水合、动画和未来 patch 状态；spec 不带 `.mount()` / `.update()` 等方法。
3. **Figure body 非法状态不可表达**：`children` 与 `layers` 互斥。`children` 是单层图的简写，规范化时进入隐式默认 layer；需要 cache / zIndex / 分层 invalidation 时必须显式使用 `layers`。
4. **Layer 是 authoring 级边界**：`layer()` 不要求改 core IR schema。规范化产物必须保留 `runtimeMeta.layers`、`identityIndex`、`parentIndex` 等信息；`toScene` 可消费规范化产物并返回 Scene，但 `VanillaView` 必须保存 runtime metadata，供后续 `invalidate(layerId)` / patch 使用。
5. **Layer 绘制顺序确定**：layer stack 按 `zIndex ?? 0` 升序稳定排序；相同 `zIndex` 保持 spec 数组顺序。layer 内 child 仍按数组顺序。`cache` 只影响 runtime 重绘策略，不改变视觉顺序。
6. **Tier2 通过 `embed()` 显式进入**：Vanilla 不解析 JSX / 组件静态属性。`embed(kind, id, props)` 由 `options.adapters` 中的 `VanillaTier2Adapter` 解析；缺 adapter 必须 fail-loud。adapter 贡献形状与 React embeddable 对齐：`node + datasets + makeComposites`，不得把函数、class 实例或 DOM 节点写进 IR。
7. **Tier2 contribution 合并规则与 React 对齐**：按 `namespace` 分组，保持首次出现顺序；同 namespace 的 datasets 按 reference key 合并，同 key 不同对象引用必须 fail-loud；每组调用一次 `makeComposites(mergedDatasets)`。adapter 派生 composites 先聚合，用户显式 `options.composites` 后置拼接，重复定义的处理继续交给 core registry / compile 诊断。
8. **稳定 identity 决定增量粒度**：plain spec 中公开可 patch 的 `id` 是 vanilla authoring identity，figure 内必须唯一；重复 identity 在规范化阶段报错。Tier2 adapter 展开的内部 core id 必须以 embed id 派生命名，避免多个实例互撞。无 id 的内部 child 可存在，但只能触发父 layer / 父 scope 的全量失效。
9. **core IR 不承载增量私货**：diff hint、layer cache、hydration handler、adapter runtime definition 和 runtime metadata 都停留在 vanilla runtime / compile options；进入 core IR 的内容仍保持 100% JSON-safe。

理由：

1. plain spec 同时适合人写、LLM 生成、结构化校验、SSR 和后续 patch 流，不需要反向理解 builder 内部闭包状态。
2. `mount` 返回 view 的模型能自然容纳 `update(nextSpec)`、`patch(patchSet)`、`invalidate(layerId)` 等后续增量 API，而不污染声明式图形对象。
3. `embed()` 让 Tier2 在 vanilla 中有显式、可序列化、可诊断的边界；React 的静态组件适配器和 vanilla 的 plain adapter 共享“贡献 core IR + lowering 资源”的架构意图，但不强行共享 JSX 机制。

## DSL 表面

```ts
import { embed, figure, layer, mount, node, path, VanillaLayerCache } from '@retikz/vanilla';

const spec = figure({
  type: 'figure',
  version: 1,
  id: 'sales-card',
  viewBox: { x: 0, y: 0, width: 640, height: 360 },
  layers: [
    layer('diagram', { cache: VanillaLayerCache.Static }, [
      node('start', { position: [80, 80], text: 'Start' }),
      node('done', { position: [240, 80], text: 'Done' }),
      path('flow', { way: ['start', 'done'], arrowEnd: 'stealth' }),
    ]),
    layer('chart', { cache: VanillaLayerCache.Dynamic }, [
      embed('fixture-chart', 'sales', {
        dataRef: 'sales',
        x: 'month',
        y: 'value',
      }),
    ]),
  ],
});

const view = mount(container, spec, {
  renderer: 'canvas',
  adapters: [fixtureChartAdapter],
});

view.update(nextSpec);
```

增量数据更新的 vanilla 侧形状只预留在 view 层，不进入 plot API 设计：

```ts
view.patch({
  replace: [
    {
      id: 'sales',
      props: { dataRef: 'sales:next' },
    },
  ],
});

view.invalidate('chart');
```

`patch` / `invalidate` 是后续实现目标；本 ADR 只要求新的 spec、normalized metadata 和 identity 规则不能阻塞这些能力。`VanillaTier2Adapter` 暂不包含 `diff()` hook，避免在缺少 runtime metadata 与 merged dataset context 时过早冻结错误签名。

## 测试设计

`packages/kernel/vanilla/tests/**` 覆盖：

- plain spec helper 与手写 object 规范化为相同 IR。
- `mount(..., { renderer: 'svg' })` 与 `mount(..., { renderer: 'canvas' })` 共享同一 spec 输入。
- `layer()` 保持绘制顺序、`id` 和 cache metadata，不污染 core IR schema。
- `embed()` 经 adapter 贡献 core IR / composites；缺 adapter fail-loud。
- `view.update(nextSpec)` 在当前阶段可继续整图重渲染，但必须保持 root identity、hydration context、runtime metadata 与 animation handle 语义。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- ⚠️ BREAKING：`Figure` 不再是 vanilla 主作者模型；`.node()` / `.draw()` / `.mount()` 链式组合不作为新文档主路径。迁移路径是把链式构图改为 `figure({ children / layers })` plain spec，并把挂载改为 `mount(container, spec, options)`。
- `@retikz/vanilla` public barrel 会新增 plain spec helpers、spec 类型、`mount` 主入口和 Tier2 adapter 类型；旧 builder 若保留，只能作为 legacy sugar。
- `@retikz/core` IR / Zod schema 暂无改动；vanilla spec 在进入 core 前规范化。
- React 不需要同步 API 重构；但 React 已有 `EmbeddableTier2Adapter` 的“静态贡献”理念是 vanilla `embed()` 设计的参照。若后续抽象跨 adapter diff hint，应另起 ADR。
- 文档站需要同步 vanilla 入门、runtime API、SSR、hydration、provider authoring 与 Tier2 嵌入示例；示例应以 plain spec 为主，避免继续教学链式 `Figure`。ComponentPreview 的 vanilla codegen 也需要同步输出新 plain spec 形态。

## 不在本 ADR 范围

- 不设计 plot 用户 API、plot data channel、mark-level patch 语义。
- 不实现 SVG DOM diff、Canvas bitmap layer、dirty rectangle 或 scheduler。
- 不改变 core IR schema、Scene primitive schema 或 composite lowering 机制。
- 不重写 React `<Layout>` / JSX kernel 组件 API。
- 不定义 JSON Patch / streaming protocol；`view.patch()` 这里只作为未来能力占位。
- 不新增 `@retikz/plot-vanilla` 的真实 plot adapter；本文 DSL 使用 fixture adapter 表达 Tier2 接入形状。

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。

理由：实现会触碰 `packages/kernel/vanilla/src/index.ts` public barrel，并重构 public authoring API；虽然不改 core IR / compile schema，但对用户可见 API 属破坏性改动。

### Schema 改动

无 core IR / Zod schema 改动。

新增的 `VanillaFigureSpec` / `VanillaLayerSpec` / `VanillaEmbedSpec` 是 `@retikz/vanilla` authoring 类型，不进入 core IR schema；beta.2 不新增 vanilla Zod schema。若后续决定为 vanilla spec 建 Zod schema，需要先补充本 ADR 的 schema 表或另起 ADR。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/vanilla/package.json`
- `packages/kernel/vanilla/README.md`
- `packages/kernel/vanilla/src/index.ts`
- `packages/kernel/vanilla/src/types.ts`
- `packages/kernel/vanilla/src/spec/**`（新建）
- `packages/kernel/vanilla/src/mount.ts`（新建）
- `packages/kernel/vanilla/src/builder/**`（迁移为 legacy sugar 或删除）
- `packages/kernel/vanilla/src/figure.ts`（迁移为 legacy sugar 或删除）
- `packages/kernel/vanilla/src/to-scene.ts`
- `packages/kernel/vanilla/src/runtime/render-svg.ts`
- `packages/kernel/vanilla/src/mount-svg.ts`
- `packages/kernel/vanilla/src/mount-canvas.ts`
- `packages/kernel/vanilla/src/hydrate.ts`
- `packages/kernel/vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/kernel/get-start/**`
- `apps/docs/src/modules/docs/contents/kernel/introduction/**`
- `apps/docs/src/modules/docs/contents/kernel/packages/vanilla/**`（新建）
- `apps/docs/src/modules/docs/components/component-preview/utils/ir-to-vanilla-code.ts`
- `apps/docs/src/modules/docs/data/**`（仅当 vanilla API 导航 / API 表需要同步）

偏离白名单的改动需要：

- 加新条目到本 ADR 的“实现契约 → 文件 scope”段，并说明为什么扩展 scope。
- 或开新 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `plain-spec-normalizes-to-ir`：手写 `figure({ children: [...] })` → 规范化为合法 `IRScene`，`compileToScene` 成功。
- `helpers-return-plain-spec`：`figure()` / `node()` / `path()` / `layer()` 返回可结构化比较的 plain object，不带 `.mount` / `.node` 方法。
- `mount-renderer-switch`：同一 spec 分别经 `mount(..., { renderer: 'svg' })` 与 `mount(..., { renderer: 'canvas' })` 挂载成功，并复用现有 hydration / animation 语义。
- `embed-adapter-lowers`：`embed('fixture', 'chart', props)` 命中 adapter 后贡献 core child、datasets 与 composites，渲染结果包含 adapter 输出。

**边界（≥ 2）**：

- `children-or-layers-exclusive`：`children` 简写规范化到默认 layer；同时传 `children` 与 `layers` 时 fail-loud。
- `empty-figure-valid`：空 `figure({ children: [] })` 可规范化并渲染为空 Scene，不额外包无意义 root scope。
- `anonymous-child-invalidates-parent-layer`：无公开 identity 的内部 child 可渲染，但 runtime metadata 标记父 layer 为最小失效边界。
- `empty-layer-preserves-boundary`：空 `layer('overlay', [])` 不产生可见图元，但保留 layer metadata 供后续 update / patch 识别。

**错误路径（≥ 2）**：

- `duplicate-identity-throws`：同一 figure 规范化时发现重复公开 identity，抛出包含重复 id 与路径的错误。
- `missing-embed-adapter-throws`：出现 `embed(kind)` 但 options 未提供匹配 adapter，抛出包含 kind / id 的错误。
- `conflicting-dataset-reference-throws`：同 namespace 的两个 contribution 对同一 reference 提供不同对象引用，抛出包含 namespace / reference 的错误。
- `adapter-output-invalid-throws`：adapter 返回不合法 core child / composites 时，错误从规范化或 core schema 校验处 fail-loud，不静默跳过。

**交互（≥ 2）**：

- `update-keeps-root-identity`：`view.update(nextSpec)` 后 SVG / Canvas root identity 不变，当前阶段允许整图重绘。
- `hydrate-after-update-uses-current-scene`：先 `view.hydrate()` 再 `view.update(nextSpec)`，handler context 读取更新后的 Scene / geometry。
- `layer-cache-does-not-change-draw-order`：混用 static / dynamic layer 时，视觉顺序仍按 `zIndex ?? 0` 升序 + 同值保持 spec 顺序稳定。
- `provider-options-pass-through`：plain spec render options 中的 `compile.shapes` / `compile.pathKinds` / `compile.patterns` / `compile.composites` 等 provider surface 透传到 core compile，且显式 `compile.composites` 在 adapter composites 之后拼接。

### 依赖的现有元素

- `RenderInput`（`packages/kernel/vanilla/src/types.ts`）—— 修改：从 `Scene | IRScene | Figure` 扩展或替换为 `Scene | IRScene | VanillaFigureSpec`，legacy `Figure` 只允许作为兼容 sugar。
- `VanillaView` / `CanvasView`（`packages/kernel/vanilla/src/types.ts`）—— 扩展：保留 root identity、hydrate、dispose、animation；为未来 `patch` / `invalidate` 预留实现位置，并保存 runtime metadata。
- `mountSvg` / `mountCanvas` / `renderToSvgString`（`packages/kernel/vanilla/src/**`）—— 修改：接受 plain spec，经规范化后复用现有 render 后端。
- `toScene`（`packages/kernel/vanilla/src/to-scene.ts`）—— 修改：支持从 spec 或 normalized figure 得到 Scene；不作为唯一规范化出口。
- `Figure` / builder（`packages/kernel/vanilla/src/figure.ts`、`packages/kernel/vanilla/src/builder/**`）—— 修改或删除：不再作为 canonical authoring API。
- `EmbeddableTier2Adapter`（`packages/kernel/react/src/kernel/protocol/embeddable.ts`）—— 仅引用设计意图和 contribution 合并规则：React 的 JSX 静态贡献协议不被 vanilla 直接复用。
- `compileToScene` / `CompositeDefinition` / `IRChild`（`@retikz/core`）—— 引用：vanilla spec 最终降低到已有 core IR 与 composite lowering。
- `@retikz/render/hydration`（render 包）—— 引用：hydration runtime 继续由 view 管理，不写入 spec / IR。
