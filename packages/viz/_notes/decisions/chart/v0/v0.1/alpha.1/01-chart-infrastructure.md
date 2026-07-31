# ADR-01：Chart 基础设施与封闭 recipe 主链

- 状态：Proposed（内部 core resolver 可实施；公开 adapter 接线受 Kernel capability gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md)

## 背景

Chart 是 Plot 之上的 Tier 3 类型封装，不是新的绘图引擎。alpha.1 需要先建立可被所有 family 复用的 schema fragments、封闭 recipe resolver、inspection 与 adapter 共用 authoring contract，后续 type 才能只声明差异配方。

现有 Plot 已拥有 PlotSpec、definition / registry、lowering、provenance、locator、React builder 与 Vanilla runtime。Chart 必须消费这些公开能力，不能复制 Plot schema、registry、数据执行或 renderer 路径。

代码审计同时发现：Core composite 按 `namespace + type` 精确注册，而 React / Vanilla 目前按 adapter namespace 隔离 datasets 与 `makeComposites`。一个 Chart 展开为 Standard FlexLayout 内的 PlotSpec 时，需要 Chart、Plot、FlexLayout 三组 definitions，并且 Chart datasets 必须进入唯一 Plot definition；当前聚合协议无法在独立 Chart / Plot / Standard adapters 之间安全完成这一点。

## 决策：先建立内部主链，首个 type 再原子公开

ADR-01 建立 `@retikz/chart` 的内部基础设施和三个包的未发布 source skeleton；不导出可实例化 `ChartSpecSchema`、`IRChartSpec`、`<Chart>` 或 Vanilla adapter。ADR-04 加入 `scatter` 时，才原子公开首个 variant、每 type composite definition 与三入口。

```ts
type ChartRecipe<TSpec extends IRChartSpec> = {
  type: TSpec['type'];
  schema: ZodType<TSpec>;
  resolve: (spec: TSpec, context: ChartRecipeContext) => ChartRecipeResult;
  validateCore: (spec: TSpec, plotSpec: IRPlotSpec) => void;
};

type ChartRecipeResult = {
  plotSpec: IRPlotSpec;
  members: ReadonlyArray<ChartResolvedMember>;
};
```

内建 recipe 只存在于冻结的 `BUILTIN_CHART_RECIPES` const tuple。没有 `defineChart`、Chart registry、runtime recipe injection 或 custom type。每个新 type ADR 向 tuple 加一个静态条目。

`resolveChartSpec` 的成功结果固定为：

```ts
type ChartResolution = {
  plotSpec: IRPlotSpec;
  node: IRChild;
  inspection: IRChartInspection;
};
```

`node` 在 ADR-03 之前按 identity 规则生成：无 Chart id 时等于 `plotSpec`；有 Chart id 时是 `{type:'scope', id:spec.id, children:[plotSpec]}`，其中 Plot id 为 `${spec.id}/plot`。存在 presentation 后，Scope 内 child 改为 Standard FlexLayout，FlexLayout 仍直接包含完整 PlotSpec。

## Composite registration 与 capability gate

Core 不能用一个 definition 承载多个 Chart `type`。ADR-04 起，每个 recipe 生成一个静态 definition：

```ts
const lowerCharts = (
  datasets: ExternalDatasets,
  options?: LowerChartsOptions,
): Array<ExpandCompositeDefinition<IRChartSpec, 'chart', ChartTypeValue>>;
```

返回数组包含 `chart.scatter`、`chart.bubble` 等当前已公开 type 的独立 definitions；每项使用自己的 variant schema，并调用同一 resolver。`lowerCharts` 不夹带 Plot 或 Standard definitions。

一个完整 host 必须注册：

```ts
[...lowerCharts(datasets, chartOptions), ...lowerPlots(datasets, chartOptions.plot), FlexLayoutDefinition];
```

手写 JSON与独立 Vanilla / React Chart 可以显式构造该集合。要让多个 Chart / Plot / Standard 组件在同一外层 Layout 内自动聚合，必须先由 Kernel adapter owner 通过独立 ADR 提供：

- contribution 可声明 composite dependency definitions，不以 adapter namespace 隔离依赖
- Chart 与 Plot 可把 datasets 合入同一个 Plot lowering group
- 相同 `namespace + type` definition 确定性去重，不同实现冲突 fail-loud
- 同一 data reference 仍保持现有“同一对象引用，否则失败”
- React 与 Vanilla 使用同构协议
- Vanilla adapter output identity 允许 output root 等于 embed id，或提供等价的 owner-qualified identity contract；Chart adapter 不自行绕过现有 prefix validation

该 capability 未完成前，ADR-01 可以实现内部 resolver，但 ADR-04 不得宣称 Chart / Plot 可在同一 Layout 自动混合，也不得在 Chart 内提前展开 Plot 或复制 Standard solver。

## 确定性 resolution 算法

1. variant schema 校验 ChartSpec，并拒绝未知 type
2. recipe 生成核心 transforms、scales、coordinate / composition、marks 与表现性 guides
3. top-level `transform` 作为数据预处理，放在 recipe root transforms 之前；type-specific 必需 transform 只能用对应 patch 调整
4. `scales` 按 `name` 合并：命中隐式 scale 时整项替换后复验，未命中时追加；重复 user name 失败
5. 显式 `coordinate` / `composition` 替换 type 默认且互斥；与核心 roles / structure 不兼容时失败
6. 显式 `guides` 存在时整体替换表现性 guide defaults
7. `mark` / `components` 只 patch 对应语义 target；未知、重复 target 失败
8. `marks` 按数组顺序追加在全部 recipe marks 之后
9. recipe member id 固定为 `__chart.<type>.<target>`；用户显式 id 以 `__chart.` 开头或与 recipe id 相同时失败
10. merge 后调用 recipe `validateCore`，再用 `PlotSpecSchema.parse` 二次校验
11. ADR-02 / 03 依次解析 style 与 presentation，最后生成 inspection

PlotSpec 的 `id` 规则是：Chart 有 `id` 时固定为 `${id}/plot`；Chart 无 `id` 时保持 `undefined`，由 compile occurrence 区分实例，不使用进程 seed 或全局计数器。

## Inspection 与错误

```ts
const ChartContributionSource = {
  TypeDefault: 'type-default',
  StylePreset: 'style-preset',
  UserOverride: 'user-override',
  PlotExtension: 'plot-extension',
} as const;

type IRChartInspection = {
  chart: { type: ChartTypeValue; id?: string };
  plot: { id?: string };
  members: Array<{
    target: string;
    kind: 'transform' | 'scale' | 'coordinate' | 'composition' | 'mark' | 'guide';
    id?: string;
    core: boolean;
    value: JsonObject;
    sources: Array<{ kind: ChartContributionSourceValue; path: string }>;
  }>;
  presentation: Array<{ key: ChartPresentationKey; sourcePath: string }>;
};
```

`members` 以最终 PlotSpec 顺序输出；隐式成员使用稳定 semantic target，追加成员 target 为 `extension.<kind>.<index>`。成功 inspection 不复制 Plot provenance / lineage，只用 `plot.id` 关联 resolved PlotSpec。

resolver 失败抛出 `ChartResolveError`，至少包含 `code`、`path`、可选 `target` / `conflictingId`。固定 code：`unknown-type`、`unknown-target`、`reserved-id`、`duplicate-id`、`duplicate-scale`、`coordinate-conflict`、`core-recipe-violation`、`invalid-resolved-plot`。composite definition 缺失不属于纯 resolver 可见状态，由上游 host preflight / Core compile 诊断。

## React / Vanilla authoring

ADR-01 从 `plot-react` 提取两个共享阶段，而不是无上下文解析 children：

```ts
type PlotAuthoringContext = {
  data: IRDataReference;
  model?: IRDataModel;
  fieldMap?: Record<string, string>;
  coordinate?: CoordinateInput;
  composition?: IRPlotComposition;
  dataTransforms?: Array<IRPlotTransform>;
  markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  mode: 'plot-root' | 'chart-extension';
};

type PlotMemberFragment = {
  transform?: Array<IRPlotTransform>;
  scales?: Array<IRPlotScale>;
  coordinate?: IRPlotCoordinate;
  composition?: IRPlotComposition;
  guides?: Array<IRPlotGuide>;
  marks?: Array<IRPlotMark>;
};

const collectPlotDeclarations = (children: ReactNode): PlotAuthoringDeclarations => {};
const normalizePlotDeclarations = (
  declarations: PlotAuthoringDeclarations,
  context: PlotAuthoringContext,
): { fragment: PlotMemberFragment; runtime: PlotAuthoringRuntime } => {};
```

`collectPlotDeclarations` 只收集带组件 kind 的 plain props，不做 scale inference / binding normalization。`normalizePlotDeclarations` 是唯一 normalizer，接收完整 data/model/coordinate/transform context；现有 `buildPlotSpec` 与 `<Chart>` 都调用它。`plot-root` 保留现有自动 scale、coordinate、binding normalization 与 mark shortcut；`chart-extension` 不生成根 defaults，只规范显式 declarations，最终交 Chart recipe 统一合并。

`PlotAuthoringRuntime` 单独承载 `resolveLabel` 等函数型运行时选项，永不进入 fragment。Chart extension mode 只要 runtime 非空就以 `non-serializable-extension` 失败；这在 normalization 返回后、写 ChartSpec 前执行。

`<Chart>` 的 Plot JSX children 全部表示显式 extension，不 patch 隐式主 Mark。`mark` / `components` 只能通过 Chart props / spec 调整核心成员。以下规则固定：

- Mark / Transform children 追加到 `marks` / `transform`
- Scale、Guide children形成显式集合；同时给 props / spec 时冲突失败
- Coordinate / Composition 最多一个，且与 prop / spec 重复时失败
- `TitleLabel` / `CaptionLabel` 与任何 Plot static label child 在 Chart 下失败；Chart-level 文本使用 `presentation`
- `<Plot>` / `<Chart>` child、函数 child、ReactNode slot 与 runtime `resolveLabel` 不进入 ChartSpec

React 保留两条入口：`spec + ExternalDatasets` 与 DSL `Array<ExternalRow> + dataRef/model/fieldMap + JSON-safe props/children`。Vanilla 保留 `createChartSpec(input)` 与 `chart(spec, data, options)`；两者只能调用 core schema / resolver，不复制 defaults。custom Plot definitions 与 `LowerPlotsOptions` 只进入 `lowerPlots`，相同 key 的不同 definition / runtime option 依既有 Plot 规则失败。

## Identity 与 trace

- Chart 有 id 时，外层展开结果使用同名 Core Scope，resolved Plot 使用 `${id}/plot`
- Chart 无 id 时不生成虚构 id，多实例由 compile occurrence 区分
- Standard probe / replay 可以合法改变 occurrence 与全局 geometry
- Plot 的语义 id、datum / series payload、provenance、locator、lineage 不由 Chart 重建；wrapped 与裸 Plot 的 payload 等价，occurrence 路径允许增加 Chart / Flex 段
- JSON / React standalone 使用上述 canonical tree。Vanilla 在 upstream identity gate 解除后，以 embed id 作为有效 Chart id prefix，并保持内部 `${effectiveChartId}/plot` 关系；gate 未解除前不公开 Vanilla adapter
- `resolveChartSpec` 直接返回 inspection / PlotSpec；React / Vanilla 另提供 `resolveChart` / `onInspection` runtime 只读出口，不把 inspection 写入 IR

## 能力完备性检查

- 所属能力域：Chart 封装完备；使用 Plot Visualization、Standard layout 与 Core composite
- Chart owner 可实施子集：shared schema fragments、closed recipe protocol、11 步 merge、inspection / error、React declaration collector / normalizer 提取
- 下沉结论：跨 owner dependency aggregation 与 Vanilla output identity 必须进入 Kernel React / Vanilla adapter owner 的独立 ADR
- 阻塞边界：上述内部子集可立即实现；`lowerCharts` public export、Chart React / Vanilla adapter、混合嵌入与 release group 必须等 Kernel gate和 ADR-04
- 禁止旁路：Chart 不提前 lower Plot、不复制 Flex solver、不更改 Core registry warning
- 本轮结论：`组合 + 上游 gate`，不是整体延期

## 不在本 ADR 范围

- 任何 Canonical Type variant
- style preset、palette 与 presentation
- Kernel embeddable dependency aggregation / Vanilla identity 的具体 API / 实现
- Chart registry、`defineChart`、自定义 type
- Core qualified selector / handle index

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增 Chart schema fragments、resolver 基础与未来公共包边界。

### Schema 改动

| 文件                                           | 操作 | 字段名                                           | 类型                                       | 默认值    | describe 中文摘要     |
| ---------------------------------------------- | ---- | ------------------------------------------------ | ------------------------------------------ | --------- | --------------------- |
| `packages/viz/chart/src/schemas/shared.ts`     | 新增 | `id` / `data`                                    | string optional / `DataReferenceSchema`    | —         | Chart id 与单根数据   |
| 同上                                           | 新增 | `transform` / `scales` / `guides` / `marks`      | 对应 Plot schema arrays optional           | —         | 显式 Plot members     |
| 同上                                           | 新增 | `coordinate` / `composition`                     | 对应 Plot schema optional，互斥 refinement | type 默认 | Plot 空间结构         |
| 同上                                           | 新增 | `theme` / `layout` / `width` / `height` / `meta` | 直接复用 Plot / Core fragments             | —         | Plot 呈现与元数据     |
| `packages/viz/chart/src/schemas/inspection.ts` | 新增 | `chart` / `plot` / `members` / `presentation`    | 上文 exact strict schema                   | —         | resolution inspection |

本 ADR 不导出可实例化 ChartSpec；ADR-04 才加入 public union。

### 文件 scope

- `packages/viz/chart/package.json`、`packages/viz/chart/tsconfig.json`、`packages/viz/chart/vite.config.ts`
- `packages/viz/chart/src/{shared,schemas,contract,providers,pipeline}/**`
- `packages/viz/chart/src/index.ts`（ADR-01 只导出非实例化 fragments / inspection types）
- `packages/viz/chart/tests/**`
- `packages/viz/chart-react/package.json`、`packages/viz/chart-react/src/index.ts`（未发布空入口）
- `packages/viz/chart-vanilla/package.json`、`packages/viz/chart-vanilla/src/index.ts`（未发布空入口）
- `packages/viz/plot-react/src/components/build-plot-members.ts`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-react/src/components/index.ts`、`packages/viz/plot-react/src/index.ts`
- `packages/viz/AGENTS.md` 与三个新包 `AGENTS.md`
- `pnpm-lock.yaml`

三包 `package.json` 初始 `private: true`、版本 `0.1.0-alpha.1`；ADR-04 才改为 publishable 并把 `chart` release group 加入 `scripts/release-groups.config.mjs`。ADR-01 不改 docs。

### 测试象限

**Happy path（≥ 3）**

- 私有 test recipe 按精确 11 步算法生成并二次校验 PlotSpec
- inspection 对 type default / user override / extension 给出稳定 target、path、value
- `buildPlotMembers` 被 `<Plot>` 复用后保持现有 PlotSpec snapshot

**边界（≥ 2）**

- 无 id Chart 不生成 id，多实例按 occurrence 隔离
- 省略可选 members 时只保留 recipe 内容

**错误路径（≥ 2）**

- 未知 / 重复 target、reserved / duplicate id、duplicate scale 分别给固定 error code
- coordinate + composition、非法 core patch、resolved PlotSpec 二次校验分别 fail-loud
- React 函数 child、Plot static label、重复 coordinate / guide source 被拒绝

**交互（≥ 2）**

- standalone host 显式注册 Chart + Plot + Flex definitions 后完成真实 compile
- custom Plot definitions 被追加 mark 沿 Plot registry 消费
- wrapped 与裸 Plot 的 trace payload 等价，occurrence 合法增加外层段

Kernel upstream gate 独立验证跨 namespace definitions 去重、datasets 合并、React / Vanilla parity 与 Vanilla root identity；不计入 ADR-01 当前可实施子集的通过条件。

### 依赖的现有元素

- PlotSpecSchema、`lowerPlots`、Plot definitions / registries、provenance / locator / lineage
- DataReferenceSchema、ExternalDatasets
- Core `defineComposite` 精确 namespace/type dispatch
- Standard FlexLayoutDefinition
- Plot React `buildPlotSpec` 与 React / Vanilla embeddable contracts
