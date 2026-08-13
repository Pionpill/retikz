# ADR-18：以 Core provider graph 聚合跨 namespace Composite 依赖

- 状态：Proposed
- 决策日期：2026-08-11
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Core Drawing Complete](../../../../architecture/core-drawing-complete.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md) · [Standard 直接 Definition loading](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/06-direct-definition-loading.md) · [Chart ADR-03](../../../../../../viz/_notes/decisions/chart/v0/v0.1/alpha.1/03-presentation-standard-layout.md)

## 背景与目标

React 与 Vanilla 的 Tier 2 embed 当前都把一次贡献归并为单个 `namespace`、一份 dataset 表和一个 `makeComposites()`。该模型能处理同一 owner 下多个实例共享 definition 的情况，却不能正式声明一个 composite 对其它 namespace / type 的传递依赖。Chart 需要组合 Chart、Plot、Standard Surface 与 Layout definitions；Legend、Table panel 和第三方复合能力也可能出现同类依赖。若每个上层 adapter 私下拼装 definitions，会形成 React / Vanilla 分叉、内置白名单、重复 dataset 合并和无法统一诊断的依赖旁路。

Core 已拥有 `CompositeDefinition`、`CompileOptions.composites` 与最终 registry 冲突语义，但缺少从 authoring contributions 解析“当前根能力所需 definitions 闭包”的 adapter-neutral 纯协议。本 ADR 的目标是让官方与第三方 Tier 2 能力通过同一个显式 provider graph 声明根、依赖、dataset 与 definition maker，并让 React、Vanilla、SSR 和直接工具链复用同一个 Core resolver。

## 决策：Core 提供按完整 Composite key 解析的 provider graph

Core 新增闭合的 assembly contract 与纯 resolver。adapter 只收集 contribution；依赖闭包、冲突、拓扑顺序、dataset 合并和显式 definitions 合并均由 Core 唯一解释。

```ts
type CompositeProviderKey = Readonly<{
  namespace: string;
  type: string;
}>;

type CompositeDependencyProvider = Readonly<{
  key: CompositeProviderKey;
  dependencies: ReadonlyArray<CompositeProviderKey>;
  datasets: Readonly<Record<string, unknown>>;
  makeDefinition: (mergedDatasets: Readonly<Record<string, unknown>>) => AnyCompositeDefinition;
}>;

type CompositeDependencyContribution = Readonly<{
  roots: ReadonlyArray<CompositeProviderKey>;
  providers: ReadonlyArray<CompositeDependencyProvider>;
}>;

type ResolveCompositeDependenciesOptions = Readonly<{
  contributions: ReadonlyArray<CompositeDependencyContribution>;
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;

declare const resolveCompositeDependencies: (
  options: ResolveCompositeDependenciesOptions,
) => ReadonlyArray<AnyCompositeDefinition>;
```

`CompositeProviderKey` 的 identity 是完整 `namespace + type`，不是 namespace、数组位置、module 名或 adapter kind。一个 provider 只生成一个与其 key 完全匹配的 definition；需要多个 definitions 的 owner 发布多个 provider，并用依赖边显式连接。`roots` 表示当前 authored contribution 实际要求的能力，resolver 只物化从所有 roots 可达的稳定闭包，不把 provider catalog 当作全量 preset。

同一 key 可以由多个 authored contribution 重复携带，以便汇总多个实例的数据集。重复 provider 必须使用相同 `makeDefinition` 函数引用和相同、有序的 `dependencies`；否则在任何 maker 执行前 fail-loud。provider 顺序只用于稳定 tie-break，不改变依赖先于消费者的拓扑约束。

理由：

1. 跨 namespace 依赖是 compile assembly 的通用问题，由 Core 统一解析才能保证 React、Vanilla、SSR、直接 IR 和第三方能力同构
2. 完整 composite key 与现有 registry identity 一致，可以在 compile 前验证 provider 输出并复用既有 Definition 冲突语义
3. 显式 roots 与传递依赖既保留 tree-shaking / 按需装配，也避免 Chart、Plot 或 Standard 建立私有 bundle、全局注册和内置白名单

## 解析、合并与确定性

resolver 按以下顺序完成一次 preflight：

1. 校验所有 key、root、dependency 与 dataset reference 合法，并按完整 key 合并 provider
2. 对同 key 检查 maker 引用与有序 dependency 声明完全一致
3. 对同 key 下的 dataset reference 合并值；重复 reference 只有在 `Object.is(existing, incoming)` 时允许去重，否则 fail-loud
4. 从 contributions 的 roots authored 顺序开始构建可达闭包；缺失 provider 与 cycle 在 maker 执行前 fail-loud
5. 以依赖先于消费者、首次可达顺序作为稳定 tie-break 生成拓扑序
6. 每个可达 key 只调用一次 maker，并验证返回 definition 的 `namespace` / `type` 与 provider key 完全一致
7. 先按拓扑序写入 provider definitions，再按 `options.composites` authored order 追加显式 definitions；同 key 且同 definition 对象引用可去重，不同对象或不同实现 fail-loud

dataset 值保持宿主侧 `unknown`，不进入 IR、Scene 或 manifest。provider maker 只在 resolver 完成图预检后执行；不得依赖调用顺序以外的 module-level mutable state，也不得在执行时追加 provider、root 或 dependency。相同 contributions、显式 definitions 与对象引用关系必须得到相同的 definitions 顺序和诊断。

依赖图不负责动态 import 或 package discovery。消费方仍通过正常 ESM import 把所需 provider 带入当前程序；resolver 只解释已经显式提供的 graph。

## Adapter 与直接编译契约

React `EmbeddableContribution` 与 Vanilla `VanillaTier2Contribution` 的 composite 装配部分统一改为 `CompositeDependencyContribution`。旧的单 namespace `datasets + makeComposites()` 聚合直接移除，不保留 alias、自动提升或双轨 fallback。

adapter 可以继续在 contribution 中携带其 Core `node` 和宿主运行时 authoring sidecar；这些字段不进入 provider graph。React 与 Vanilla 都必须调用同一个 Core pure resolver，不能各自复制拓扑排序、dataset 冲突或 Definition 合并。

`resolveCompositeDependencies()` 是 Core 根入口公开的同步纯函数。它接收全部 contributions 与可选显式 `composites`，返回可直接写入 `CompileOptions.composites` 的有序只读 definition 数组；任一 graph、dataset、maker output 或 definition 冲突都在该调用返回前同步 fail-loud。它不读取隐式 adapter 状态或当前 compile options。

直接调用 `compileToScene()` 的作者可以继续显式提供完整 `composites`，无需经过 provider graph。需要从可复用模块装配传递依赖的直接工具链调用 `resolveCompositeDependencies({ contributions, composites })`，再把返回值传入 Core compile。provider graph 不改变 `CompileOptions.composites` 作为最终 compile registry 输入的地位。

官方 Chart contribution 把唯一 canonical `chart.chart` provider 设为 root，并显式携带 `standard.surface`、`layout.flexLayout` 与 `plot.plot` 公共 provider；typed `chart.scatter` 等 ChartSpec 只在 authoring resolution 阶段归一为 `IRChart`，不形成 Core composite provider。Chart 自己的 definition export 只拥有单一 `ChartDefinition`。`chart.chart` provider 的有序 dependencies 直接列出这三个完整 key，因为 Surface / Flex 允许任意 child，不负责从 child IR 猜测 descendant definitions；最终 IR 执行嵌套保持 `chart.chart -> standard.surface -> layout.flexLayout? -> plot.plot`：无 presentation 时 Surface 直接包含 Plot，有 presentation 时才插入 Flex，不得把 provider 闭包误写成固定 IR 层级或把 Flex 错归 Standard。第三方 provider 与官方 provider 使用完全相同的 contract、冲突和缺失依赖诊断。

## 行为、失败语义与兼容性

- 默认行为：只解析显式 roots 的传递闭包；未被任何 root 引用的 provider 不物化 definition
- 缺失依赖：root 或 dependency 没有对应 provider 时，在 maker 和 compile 前以包含完整 key 与依赖链的诊断失败
- provider 冲突：同 key 的 maker 引用或有序 dependencies 不一致时失败，不采用 first-wins / last-wins
- dataset 冲突：同 key、同 reference 的值不是 `Object.is` 同源时失败；不同 key 可使用同名 reference
- cycle：诊断必须包含闭环 key 路径；不通过删除边、忽略 provider 或降级为 authored 顺序继续
- definition 冲突：provider 结果与显式 `composites` 的同 key 不同实现失败；同一对象可安全去重
- breaking：React / Vanilla 旧 contribution contract 直接迁移并删除，不保留旧 namespace 聚合兼容层
- React / Vanilla 等价性：相同 roots、providers、datasets 与显式 definitions 必须产生相同 definitions 顺序、maker 调用次数和诊断

## 功能与包边界

- 所属能力域与解决的问题：Drawing compile assembly；解决可嵌套 Tier 2 composite 的跨 namespace definition 与 dataset 传递依赖
- 主责包与协作包：Core 拥有 contract、纯 resolver 与诊断；React / Vanilla 只收集 contribution 并调用；Chart、Plot、Standard、Layout 和第三方 owner 发布自身 provider
- 拥有：key、root、dependency、dataset 合并、稳定拓扑、maker 校验和显式 definition 合并语义
- 不拥有：领域 IR、dataset 内容校验、动态 import、package manager、module catalog、全局注册、renderer 或 runtime graph
- 外部扩展与下游闭环：第三方通过同一 provider contract 声明自有 key 与依赖；解析结果仍进入现有 Core composite registry 与 compile 主链
- 不支持边界：provider 不按 IR discriminator 扫描未知包，不从 Scene 反推依赖，不允许 maker 动态修改依赖图

## 架构验证

- 是否可由现有能力组合：`CompileOptions.composites` 能消费最终数组，但不能表达 roots、传递依赖、跨 adapter dataset 汇总与统一 preflight，因此需要新增 assembly contract
- math / core / render / adapter 责任切分：Core 解析纯依赖图；adapter 只收集；领域 owner 定义 provider；Math 与 Render 不参与
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：新增 runtime contract 和纯 resolver，不新增 IR 或 registry。provider graph 是一次调用内的闭合 assembly vocabulary，没有按名字动态查找实现的生命周期
- Scene / manifest / renderer / diagnostics 如何闭环：解析结果进入既有 composite registry；Scene 与 renderer 不感知 graph；结构化错误在 compile 前返回给宿主
- provenance / locator / Interaction Readiness 是否适用：provider graph 不产生图形 occurrence；它只保证实际 definition 依赖完整，空间与 provenance 由对应 compile 契约继续发布
- 结论：扩展 Core 当前 compile assembly 域

## 同类设计验证

- [Vega Dataflow Operator](https://github.com/vega/vega/blob/main/packages/vega-dataflow/src/Operator.js) 以显式 targets 与依赖关系驱动确定性 evaluation，并在运行前组织依赖；本 ADR 采用显式 graph、共享依赖去重和 evaluation 前 preflight，但不引入 mutable operator state
- [Apache ECharts ComponentModel](https://github.com/apache/echarts/blob/master/src/model/Component.ts) 与 [GlobalModel](https://github.com/apache/echarts/blob/master/src/model/Global.ts) 使用 `mainType / subType / id` 和拓扑依赖组织组件；本 ADR 采用完整 owner key 与 dependency-first ordering，但不采用全局 mutable model、数组 index identity 或内置 component catalog

这些项目共同证明：复合能力依赖必须在消费前形成显式、可诊断的有向图；具体实现可以注册到同一图，但 consumer 不应私下猜测或按遍历偶然顺序装配。

## 被否决方案

- Chart 私下拼接 Chart / Plot / Standard definitions：只解决单一 consumer，并导致 React、Vanilla 和直接工具链各有一套去重与冲突语义
- 继续以 namespace 分组并让一个 maker 返回多个 definitions：无法表达 type 级依赖与冲突，maker 输出集合也会成为隐式 bundle
- 建立全局 mutable registry 或自动 package discovery：破坏纯编译、SSR 隔离、tree-shaking 和测试确定性
- 把 dependencies 写入 `CompositeDefinition`：definition 是最终 registry 实现，不应同时承担 authoring contribution 的 dataset 聚合和按需 roots 选择
- 静默选择第一个或最后一个 provider / dataset：使结果依赖遍历顺序并掩盖宿主装配错误

## 测试策略摘要

测试契约必须覆盖稳定拓扑与 dependency-first 顺序、多个 roots 的共享依赖只物化一次、同 key 多实例 dataset 合并、`Object.is` 冲突边界、缺失 provider、直接与间接 cycle、maker / dependency 冲突、maker 输出 key 不匹配、显式 definition 同对象去重与不同实现冲突。adapter parity 必须证明 React、Vanilla、SSR 与直接 resolver 在相同输入下得到等价 definitions、调用次数与诊断；Chart → Plot → Standard / Layout 作为首个真实跨 namespace 闭环，第三方 provider 作为非内置反例。

## 不在本 ADR 范围

- Chart、Plot、Standard 或 Layout 的领域 schema、lowering 与具体 definitions
- 动态加载、远程插件、包发现、版本求解或 module federation
- dataset schema、缓存、序列化、复制、生命周期或跨 revision 更新协议
- 改变 Core composite registry 的 key、dispatch、Scene 或 renderer 语义
