# ADR-18：以 Core provider graph 聚合可复用绘图能力依赖

- 状态：Proposed
- 决策日期：2026-08-11
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Core Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Standard provider 子入口](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/08-core-minimal-builtins-and-standard-provider-entrypoints.md)

## 背景与目标

Tier 2 能力会同时依赖自身与其它 owner 的 Composite、Shape、Arrow、Clip 或 Path Generator definition。若由每个 adapter 私下拼装 definitions，React、Vanilla、SSR 与直接工具链会各自拥有去重、dataset 合并和冲突诊断，且无法按实际 authored 能力装配传递依赖。

Core 已拥有各 provider 的 Definition、registry 与最终 compile 语义，但需要一个 adapter-neutral 的纯装配协议：由 owner 静态携带 provider，由当前 authoring contribution 声明 roots，Core 解析本次调用所需的闭包并产出普通 compile options。

## 决策：Core 提供通用 provider graph

```ts
type CoreProviderCapability =
  | 'shape'
  | 'boundary'
  | 'clip'
  | 'arrow'
  | 'pattern'
  | 'pathGenerator'
  | 'pathKind'
  | 'composite';

type CoreProviderKey =
  | Readonly<{
      capability: Exclude<CoreProviderCapability, 'composite'>;
      name: string;
    }>
  | Readonly<{
      capability: 'composite';
      namespace: string;
      type: string;
    }>;

type CoreDependencyProvider = Readonly<{
  key: CoreProviderKey;
  dependencies: ReadonlyArray<CoreProviderKey>;
  datasets: Readonly<Record<string, unknown>>;
  makeDefinition: (mergedDatasets: Readonly<Record<string, unknown>>) => AnyCoreProviderDefinition;
}>;

type CoreProviderContribution = Readonly<{
  roots: ReadonlyArray<CoreProviderKey>;
  providers: ReadonlyArray<CoreDependencyProvider>;
}>;

declare const resolveCoreProviderDependencies: (
  options: ResolveCoreProviderDependenciesOptions,
) => CoreProviderDefinitions;
```

普通 provider 以 `capability + name` 为 identity；Composite 保持 `namespace + type` identity。一个 provider 只物化一个与 key 完全匹配的 Definition。解析结果按 capability 分组为 `shapes`、`arrows`、`clips`、`pathGenerators`、`pathKinds`、`composites` 等普通 compile options，而不是另一套长期 registry。

`roots` 表示当前 authoring 实际需要的能力。resolver 只物化从 roots 可达的稳定闭包，不把 provider catalog 视作全量 preset；provider、maker 和 dataset 仅存在于本次 authoring / compile assembly，不进入 IR、Scene、artifact 或持久化 JSON。

## 解析与装配

1. 校验 key、root、dependency 与 dataset reference，并按完整 key 汇总 provider
2. 同 key 的 provider 必须使用相同 maker 引用和相同、有序的 dependencies
3. 同 key 的同名 dataset 只有 `Object.is(existing, incoming)` 时可去重，否则明确失败
4. 从 authored roots 按依赖优先顺序解析可达闭包；缺失 provider 与 cycle 在 maker 前明确失败
5. maker 输出必须与 provider 的 capability 和 key 匹配；结果与显式 definitions 在同一 resolver 合并，同一对象可去重、不同对象同 key 明确失败

相同 contributions、显式 definitions 与对象引用关系必须得到相同的 Definition 顺序和诊断。解析不执行动态 import、package discovery 或全局注册；调用方仍通过正常 ESM import 显式携带 provider。

## 各入口的使用方式

React `EmbeddableContribution` 与 Vanilla `VanillaTier2Contribution` 都携带 `CoreProviderContribution`。adapter 只按 authored 顺序收集 contribution；Core 是唯一解释 roots、拓扑顺序、dataset 冲突和 Definition 合并的 owner。

直接调用 `compileToScene()` 的作者可以显式提供完整 compile definitions；需要装配传递依赖的工具链调用 `resolveCoreProviderDependencies()`，再将其结果与其它 compile options 一起传入。相同输入在直接 compile、React、Vanilla 和 SSR 中必须保留相同的 registry、Scene 与诊断语义。

## 行为、失败语义与兼容性

- 只解析显式 roots 的传递闭包；未被 root 引用的 provider 不物化 Definition
- 缺失 root 或 dependency、cycle、maker / dependency 冲突、dataset 冲突以及 maker 输出不匹配都在 compile dispatch 前明确失败
- provider 结果与显式 Definition 使用同 key 时，同一对象可去重；不同对象不采用 first-wins 或 last-wins
- 旧的 Composite-only contribution 与 resolver 直接删除，不保留 alias、自动提升或 fallback
- provider graph 不改变 Core registry、IR、Scene 或 renderer 的既有消费语义
