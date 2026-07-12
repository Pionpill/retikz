# ADR-02：Plot Vanilla plain authoring 与 Tier2 adapter 边界

- 状态：Proposed
- 决策日期：2026-07-12
- 关联：[plot v0.1 roadmap](../roadmap.md) · [plot v0.2 roadmap](../../v0.2/roadmap.md) · [kernel vanilla plain spec ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/beta.2/01-vanilla-plain-spec-api.md) · [plot-design.md §13.4 / §16](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot-vanilla` 当前以 `plotBuilder(config).mark(...).axis(...).build()` 作为主要 authoring 入口。`build()` 最终返回 plain `PlotSpec`，但链式对象仍把收集顺序、可变数组和最终规范化隐藏在 builder 内，不利于 LLM 生成、结构化 diff、序列化与直接审查。

builder 还承担 axis id、facet、scaffold 与 track binding 的展开。相同规则在 `@retikz/plot-react` 的 `buildPlotSpec()` 内再次实现，两侧已有约 480 行同类 helper。继续增加 composition 能力会扩大错误文案、默认值和边界校验的漂移风险。

kernel `@retikz/vanilla` 已把作者模型收敛为 plain spec，并通过 `VanillaTier2Adapter` 为 plot 等 Tier2 能力预留显式嵌入边界。`@retikz/plot-vanilla` 应消费该边界，不再维护独立命令式作者模型，也不复制 plot lowering 或 renderer。

本 ADR 只完成 v0.1 beta 阶段的 API 收敛与结构预留。`static` / `dynamic` cache、增量 lowering、SVG DOM diff、Canvas 局部重绘、按需 mark 物化和依赖失效模型统一推迟到 plot v0.2；当前 `VanillaView.update()` 仍是整图重渲染。

## 决策：plain authoring、共享规范化、显式 Tier2 adapter 与独立 runtime

### 1. `@retikz/plot` contract 拥有共享 authoring normalization

新增 `contract/authoring/` owner，承载 framework-neutral 的作者输入类型与 axis / facet / scaffold binding 规范化。该 owner 只依赖 `schemas`，不读取 providers / pipeline。React 负责 JSX 遍历、style sugar、scale 推断与 runtime-only resolver 收集；Vanilla 负责 plain input helper；两侧把已经收集好的 marks、guides、scales、coordinate、composition、facets 与 scaffolds 交给同一纯函数。

公开类型与入口如下：

```ts
export type PlotAuthoringMark = MarkOperation & {
  xAxisId?: string;
  yAxisId?: string;
  facetId?: string;
  trackId?: string;
};

export type PlotAuthoringGuide = Guide & {
  facetId?: string;
  scaffoldId?: string;
  trackId?: string;
};

type PlotComposition = NonNullable<PlotSpec['composition']>;

export type PlotFacetInput = Omit<FacetGridSpec, 'kind' | 'view' | 'row' | 'column'> & {
  row?: string | NonNullable<FacetGridSpec['row']>;
  column?: string | NonNullable<FacetGridSpec['column']>;
  view?: string;
  spacing?: PlotComposition['spacing'];
  resolve?: PlotComposition['resolve'];
};

export type PlotScaffoldInput = Omit<SharedScaffoldSpec, 'kind' | 'coordinate'> & {
  coordinate?: SharedScaffoldSpec['coordinate'];
  spacing?: PlotComposition['spacing'];
  resolve?: PlotComposition['resolve'];
};

export type PlotAuthoringInput = Omit<PlotSpec, 'namespace' | 'type' | 'marks' | 'guides'> & {
  marks: Array<PlotAuthoringMark>;
  guides?: Array<PlotAuthoringGuide>;
  facets?: Array<PlotFacetInput>;
  scaffolds?: Array<PlotScaffoldInput>;
};

export const createPlotSpec = (input: PlotAuthoringInput): PlotSpec;
```

`facets`、`scaffolds`、`xAxisId`、`yAxisId`、`facetId`、`trackId` 与 `scaffoldId` 都是 authoring-only 字段，必须在 `createPlotSpec()` 返回前展开并移除。返回值必须通过 `PlotSpecSchema.parse()`，且不修改输入对象或数组。

错误统一使用 `plot authoring:` 前缀，不再根据 React / Vanilla 入口分别写 `buildPlotSpec:` 或 `plotBuilder:`。同一非法输入在两个 adapter 上必须得到同一核心错误语义。

### 2. `@retikz/plot-vanilla` 以 plain helper 取代 builder

新增 `plot(input)`，只委托 `createPlotSpec(input)` 并返回 plain `PlotSpec`：

```ts
import { plot, renderPlot } from '@retikz/plot-vanilla';

const spec = plot({
  id: 'sales',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    { type: 'path', id: 'trend', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
    { type: 'point', id: 'points', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', grid: true },
  ],
});

const svg = renderPlot(spec, { sales }, { width: 360, height: 200 });
```

不新增 `point()`、`pathMark()`、`axis()` 等细粒度 helper。`PlotAuthoringInput` 的上下文类型已经能约束数组成员；继续扩张 helper 会复制 mark / guide 公共面并增加命名冲突。

删除 `plotBuilder`、`PlotBuilder` 与 `PlotBuilderConfig`，不保留 legacy alias。0.x beta 允许为正确作者模型做 breaking 收敛，新文档只展示 `plot({...})`。

### 3. 通过 `embedPlot()` 接入 kernel vanilla plain spec

`embedPlot()` 返回标准 `VanillaEmbedSpec`，不执行 lowering，也不把函数写进 plain spec：

```ts
export type PlotEmbedProps = {
  spec: PlotSpec;
};

export const embedPlot = (
  id: string,
  spec: PlotSpec,
): VanillaEmbedSpec<PlotEmbedProps>;

export const createPlotAdapter = (
  datasets: ExternalDatasets,
  options?: LowerPlotsOptions,
): VanillaTier2Adapter<PlotEmbedProps>;
```

使用示例：

```ts
import { figure, layer, renderToSvgString } from '@retikz/vanilla';
import { createPlotAdapter, embedPlot, plot } from '@retikz/plot-vanilla';

const plotSpec = plot({
  id: 'sales',
  data: { reference: 'sales' },
  scales: [
    { type: 'band', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'interval', id: 'bars', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
});

const figureSpec = figure({
  layers: [layer('chart', [embedPlot('sales-panel', plotSpec)])],
});

const svg = renderToSvgString(figureSpec, {
  adapters: [createPlotAdapter({ sales }, { width: 360, height: 200 })],
  output: { width: 360, height: 200 },
});
```

adapter 规则：

1. `createPlotAdapter(datasets, options)` 每次调用只创建一个稳定的 `makeComposites` 函数；同一 adapter 下多个 plot embed 共享同一 datasets 表。
2. adapter 必须重新以 `PlotSpecSchema.parse()` 校验传入 spec，手写 `embed()` 不能绕过 plot schema。
3. adapter 不修改调用方 spec；嵌入副本的 root id 规范化为 `${embedId}/${spec.id ?? 'plot'}`，满足 vanilla adapter 输出 identity 必须从 embed id 派生的契约。
4. `spec.data.reference` 与 datasets key 不自动改名。figure 内所有 plot embed 从同一个 adapter datasets 表按 reference 取数；缺失 reference 沿用 `lowerPlots` fail-loud。
5. datasets 与 `LowerPlotsOptions` 都保留在 `createPlotAdapter()` runtime 闭包中，不进入 `PlotSpec`、`PlotEmbedProps`、Vanilla plain spec 或 core IR。

### 4. `renderPlot()` 保持独立 runtime 入口

`renderPlot(spec, datasets, options?)` 的调用签名和返回重载不变：普通模式返回 SVG 字符串，传 `lineage` 对象时返回 `{ svg, lineage }`。实现移动到 `runtime/` owner，但仍复用 `PlotSpecSchema`、`lowerPlots`、`compileToScene` 与 `@retikz/vanilla`。

本 ADR 不把 `renderPlot()` 改写成 `figure(embedPlot(...))` 的语法糖。lineage 是 plot-specific runtime 产物，当前 `VanillaTier2Contribution` 没有 side-output contract；强行统一会扩大 kernel API 或重复 lowering。

### 5. 只预留 v0.2 优化空间

本轮只保证：

- plain authoring input 保留显式 `PlotSpec.id`、mark id 与 guide id；
- 共享规范化不把 identity 改写成数组序号公共契约；
- plot lowering 继续产出按 mark / guide 组织的 Tier1 Scope，不创建 plot 私有 renderer；
- `authoring`、`adapter`、`runtime` owner 分离，后续可以把 eager `expandPlot()` 拆为共享解析与分层物化，而不再次改变 authoring API。

本轮不承诺局部更新。`static` / `dynamic` cache、增量 compile / lowering、dependency graph、按需 materialization、SVG DOM diff、Canvas dirty layer、`patch()` 与 `invalidate()` 统一进入 plot v0.2 设计。

理由：

1. PlotSpec 已是 JSON-safe 真源；Vanilla 只需要 plain authoring sugar，不需要第二套可变对象模型。
2. axis / facet / scaffold binding 是 plot 语义，React 与 Vanilla 应消费同一纯规范化规则。
3. Tier2 adapter 让 plot 复用 kernel vanilla 的 figure、layer、SVG / Canvas runtime 和未来优化边界，不在 viz 组另造 renderer。
4. 先稳定 API 和 identity，再在 v0.2 设计依赖失效与分段 lowering，避免 beta 阶段冻结未经验证的 cache / patch 签名。

## 待决策点 🔻

无。公开名称、嵌入 identity 规则、breaking 迁移与 v0.2 边界均已在本 ADR 固定。

## DSL 表面

普通 SSR 使用 `plot()` + `renderPlot()`；需要与其它 Tier1 / Tier2 内容组合时使用 `embedPlot()` + `createPlotAdapter()`。两条路径消费同一 `PlotSpec`，datasets 始终与 Plot IR 分离。

链式迁移：

```ts
// 旧
const spec = plotBuilder(config).path(pathMark).point(pointMark).axis(xAxis).axis(yAxis).build();

// 新
const spec = plot({
  ...config,
  marks: [pathMark, pointMark],
  guides: [xAxis, yAxis],
});
```

facet / scaffold 迁移：

```ts
const spec = plot({
  data: { reference: 'sales' },
  scales: [],
  facets: [{ id: 'salesFacet', row: 'region' }],
  marks: [{ type: 'point', facetId: 'salesFacet', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
  guides: [{ type: 'axis', facetId: 'salesFacet', dimension: 'y' }],
});
```

## 测试设计

- `@retikz/plot` 锁定 framework-neutral authoring normalization、输入不变性和 schema-valid 输出。
- `@retikz/plot-react` 与 `@retikz/plot-vanilla` 对单 facet、单 scaffold、多轴和冲突输入做 parity。
- `@retikz/plot-vanilla` 锁定 helper plain-object、builder 删除、SSR / lineage 兼容与 Tier2 adapter 等价性。
- docs demo 类型检查保证迁移示例只使用新 API。

具体 case 见“实现契约 § 测试象限”。

## 影响

- ⚠️ BREAKING：删除 `plotBuilder`、`PlotBuilder`、`PlotBuilderConfig`；迁移到 `plot({ marks, guides, facets, scaffolds })`。
- 新增 `@retikz/plot` `contract/authoring` 类型、`createPlotSpec()` 与共享 normalization owner。
- 新增 `@retikz/plot-vanilla` 的 `plot()`、`embedPlot()`、`createPlotAdapter(datasets, options?)`、`PlotEmbedProps`。
- `renderPlot()` API、Plot IR schema、lowering 几何、Scene schema 和 renderer 行为不变。
- React JSX API 不变；内部改为消费共享 binding normalization，相关错误前缀统一为 `plot authoring:`。
- docs 需要同步 viz 入门、provenance、introduction、package README 与 v0.1 beta.2 BREAKING changelog。
- plot v0.2 roadmap 登记真正的增量 lowering、按需渲染和依赖失效设计，不在本 ADR 实现。

## 不在本 ADR 范围

- 不新增或修改 Plot IR / core IR / Scene schema 字段。
- 不新增 plot mark / guide / scale / coordinate / transform 能力。
- 不实现增量 compile、增量 lowering、dependency graph、cache、patch、invalidate 或 scheduler。
- 不实现 SVG DOM diff、Canvas dirty rectangle / bitmap layer、renderer batching 或 GPU 后端。
- 不优化 lineage 的重复 lowering。
- 不修改 React `<Plot>`、mark、guide 组件的公开 props。
- 不把 datasets 写入 PlotSpec 或 core IR。

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。

理由：删除 `@retikz/plot-vanilla` 公开 builder，并修改 `@retikz/plot`、`@retikz/plot-vanilla` 包根 public barrel；虽无 schema 改动，仍是明确 breaking public API 重构。

### Schema 改动

无。`PlotAuthoringInput`、`PlotEmbedProps` 与 `VanillaEmbedSpec` 都是 authoring / runtime 类型，不进入 Plot IR、core IR 或 Zod schema。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/viz/plot/src/contract/authoring/**`（新建）
- `packages/viz/plot/src/contract/index.ts`
- `packages/viz/plot/src/index.ts`
- `packages/viz/plot/tests/contract/authoring/**`（新建）
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-react/tests/components/build-plot-spec/**`
- `packages/viz/plot-vanilla/package.json`
- `packages/viz/plot-vanilla/README.md`
- `packages/viz/plot-vanilla/src/index.ts`
- `packages/viz/plot-vanilla/src/spec/**`（新建）
- `packages/viz/plot-vanilla/src/adapter/**`（新建）
- `packages/viz/plot-vanilla/src/runtime/**`（新建）
- `packages/viz/plot-vanilla/src/plot-builder.ts`（删除）
- `packages/viz/plot-vanilla/src/render-plot.ts`（移动到 `runtime/`）
- `packages/viz/plot-vanilla/tests/**`
- `packages/viz/plot/README.md`
- `apps/docs/src/modules/docs/contents/viz/get-start/line-scatter.vanilla.ts`
- `apps/docs/src/modules/docs/contents/viz/introduction/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/viz/introduction/index.en.mdx`
- `apps/docs/src/modules/docs/contents/viz/data/provenance/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/viz/data/provenance/index.en.mdx`
- `apps/docs/src/modules/docs/data/changelog/viz-0-1.ts`
- `packages/viz/_notes/decisions/plot/v0/v0.2/roadmap.md`

偏离白名单需要先更新本 ADR 并由人工确认，或另开 ADR。

### 测试象限

**Happy path**：

- `plot-helper-returns-plain-spec`：`plot(input)` 返回 schema-valid `PlotSpec`，不带 `build` / `mark` 等方法。
- `authoring-axis-binding-normalizes`：多 y 轴 binding 展开成稳定 composition、coordinate views 与 scale names。
- `authoring-facet-normalizes`：plain `facets` + `facetId` 展开成标准 facet arrangement。
- `authoring-scaffold-normalizes`：plain `scaffolds` + `trackId` / `scaffoldId` 展开成标准 tracks arrangement。
- `embed-adapter-renders`：`figure(embedPlot(...))` 经 `createPlotAdapter()` 输出 SVG。
- `render-plot-signature-stays`：普通模式仍返回 string，lineage 模式仍返回 `{ svg, lineage }`。

**边界**：

- `authoring-does-not-mutate-input`：规范化不修改输入 config、marks、guides、facets、scaffolds 或嵌套对象。
- `embedded-id-is-namespaced`：spec id 存在时输出 `${embedId}/${spec.id}`，缺省时输出 `${embedId}/plot`，原 spec 不变。
- `multiple-embeds-share-adapter-datasets`：多个 embed 共享同一 adapter datasets 表，只创建一次 composite maker。
- `explicit-composition-parity`：不使用 binding sugar 时，显式 composition 的 scale binding 与 React 输出一致。

**错误路径**：

- `multiple-binding-modes-throw`：axis id 与 facet / scaffold binding 混用时，以 `plot authoring:` fail-loud。
- `missing-axis-binding-throws`：mark 引用不存在或维度错误的 axis id 时 fail-loud。
- `composition-and-topology-sugar-throw`：显式 composition 与 facets / scaffolds 同时出现时 fail-loud。
- `embed-missing-dataset-reference-throws`：spec 引用 adapter datasets 中不存在的 reference 时 fail-loud。
- `malformed-embedded-spec-throws`：手写 `embed()` 传非法 PlotSpec 时抛 `ZodError`。

**交互 / 交叉能力**：

- `react-vanilla-single-facet-parity`：两 adapter 的单 facet 结果深度相等。
- `react-vanilla-single-scaffold-parity`：两 adapter 的 shared tracks 结果深度相等。
- `react-vanilla-multi-axis-parity`：两 adapter 的 x/y 多轴 composition、scale 与 mark scope 深度相等。
- `react-vanilla-conflict-parity`：同一冲突输入在两 adapter 上均拒绝，核心错误语义一致。
- `lineage-remains-runtime-only`：新 helper / adapter 不把 lineage 写入 PlotSpec 或 Scene meta，现有 `renderPlot` lineage 行为不变。

### 依赖的现有元素

- `PlotSpecSchema`、`PlotSpec`、`MarkOperation`、`Guide`（`packages/viz/plot/src/schemas/**`）——复用并保持 schema 真源，不新增平行 IR。
- `buildPlotSpec()`（`packages/viz/plot-react/src/components/build-plot-spec.ts`）——保留 JSX 收集与 React sugar，替换重复 binding normalization。
- `lowerPlots()`、`LowerPlotsOptions`（`packages/viz/plot/src/pipeline/expand.ts`）——adapter 和 `renderPlot()` 继续复用唯一 lowering 真源。
- `VanillaEmbedSpec`、`VanillaTier2Adapter`、`embed()`、`figure()`、`layer()`（`packages/kernel/vanilla/src/spec/**`）——复用 kernel vanilla plain spec 与 Tier2 嵌入协议。
- `compileToScene()`（`@retikz/core`）与 `renderToSvgString()`（`@retikz/vanilla`）——`renderPlot()` 继续使用，不改 core compile / renderer。
- `lowerPlotWithLineage()`（`packages/viz/plot/src/pipeline/lineage.ts`）——仅由现有 `renderPlot()` lineage 重载消费，本 ADR 不优化。
