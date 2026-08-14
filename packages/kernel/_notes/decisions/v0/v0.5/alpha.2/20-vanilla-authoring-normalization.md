# ADR-20：Vanilla 统一 Authoring 与框架无关处理

- 状态：Proposed
- 决策日期：2026-08-13
- 关联：[alpha.2 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [包职能设计](../../../../../../../notes/architecture/package-responsibility-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景与目标

Core 目前同时拥有可持久化 Source IR 和一部分面向作者的宽松输入类型、简写解析；React builder 也直接将 JSX props 拼装为 Core IR，并复制了 Vanilla 已有的 compile driver、Runtime session 与 retained render 编排。这个边界使同一 authoring 语法和框架无关处理分散在 Core、React 与 Vanilla：新框架包需要重复 IR builder 和处理链，Core 公开面包含非持久化 `*Input` 类型，React 与无框架入口无法保证经由同一归一化链路。

本决策建立唯一的 Core authoring 与处理主链：Vanilla 面向所有框架和无框架调用方提供 TypeScript authoring Input、Input 到 Source IR 的 pure normalize、compile driver、retained processing session 及只读处理结果；React 只负责解释 JSX、props、children、hook、ref、React 生命周期与 React 宿主接线，并直接依赖 Vanilla。Core 继续只拥有 JSON-safe Source IR、Source IR-to-Canonical normalize、compile 与 Scene。浏览器 mount / hydrate 只由 Vanilla 的 DOM 子入口承接，React 不取得这部分 DOM 所有权。

目标是收敛既有职责和公开表面，不增加绘图语义、IR 字段、Scene primitive、renderer 行为或新的通用扩展能力。

## 决策：Vanilla 是唯一的 Authoring 与框架无关处理 Owner

所有框架无关的作者输入类型使用 `InputXxx` 命名，由 `@retikz/vanilla` 定义；它们是 TypeScript-only API，不使用 Zod schema、不进入持久化 JSON，也不得作为 Core compile 输入。

Vanilla 提供纯 `normalizeXxx(InputXxx): IRXxx`。它只负责已类型化 authoring 写法的字段组装、等价简写下沉和 TypeScript 无法表达的必要组合不变量；它不读取 registry、theme、data、host、DOM 或框架状态，也不决定领域默认值、主题色或 Canonical 值。

最小边界如下：

```ts
type InputNode = Omit<IRNode, 'type' | 'position' | 'label'> & {
  readonly type?: 'node';
  readonly position: InputPosition;
  readonly label?: InputNodeLabel | ReadonlyArray<InputNodeLabel>;
};

type InputPath = Omit<IRPath, 'type' | 'children'> & {
  readonly type?: 'path';
  readonly children?: ReadonlyArray<InputStep>;
};

type InputScene = Omit<IRScene, 'type' | 'version' | 'children'> & {
  readonly type?: 'scene';
  readonly version?: never;
} & (
    | { readonly children: ReadonlyArray<InputChild>; readonly layers?: never }
    | { readonly layers: ReadonlyArray<InputLayer>; readonly children?: never }
  );

declare const normalizeNode: (input: InputNode) => IRNode;
declare const normalizePath: (input: InputPath) => IRPath;
declare const normalizeScope: (input: InputScope) => IRScope;
declare const normalizeScene: (input: InputScene, options?: InputNormalizeOptions) => NormalizedInputScene;
```

`InputScene` 取代既有 Vanilla plain spec，成为 plain API 与所有框架 adapter 共用的唯一顶层 typed authoring 契约；不保留另一个平行顶层 spec 或兼容别名。它要么直接拥有有序 `InputChild`，要么拥有有序 `InputLayer`，两种形态不能并存。Layer 只表达 authoring 顺序、身份与运行时缓存提示，不进入 Core IR；归一化以稳定顺序把其 children 汇入唯一的 `IRScene`，同时保留对应 runtime metadata。

`version` 只属于 Core 可持久化 IR Schema：`IRScene.version` 固定为当前 IR 版本。`InputScene` 不携带 `version`，因此 Vanilla 可以在已类型化边界以它与 `IRScene` 区分；不以 `type`、children 或 layer 形态猜测输入阶段。

`InputChild` 由各领域 `InputXxx` 和 `InputEmbed` 组成。`InputEmbed` 是 Tier 2 输入的唯一 authoring 入口：它以稳定的 kind、identity 与领域 typed props 表达嵌入项，不能携带 Core IR、Scene 或独立 session。它只能匹配调用方显式提供的 Vanilla adapter；adapter 产出既有 Core IR contribution 与显式 Composite dependency contribution。Vanilla processing 是该 contribution 的唯一消费者：它用 contribution 与调用方显式提供的既有 Core Composite definitions 调度 Core 的既有 resolver，得到的 definitions 随唯一 `IRScene` 进入 Core compile。不存在全局发现、内置白名单或 adapter 私有 registry。框架包只构造同一 `InputEmbed`，不得绕过它直接拼装 Tier 2 Core contribution。

`InputEmbed` adapter 的 framework-neutral context 包含该 embed 所在 Scene / Scope 链已经生效的 Core Theme，以及调用方提供的 Theme style definitions。Vanilla processing 在同一次 `InputScene` 归一中按 Scope 层级调用 Core 的既有 Theme resolver 准备此 context；它不复制 selector、默认颜色或 style registry 语义，解析结果不进入 Source IR、Scene、artifact 或 Composite dependency。此 context 只让既有 Tier 2 adapter 在正确的 Theme 下产生同一 contribution；它不是新的持久化 Input 字段、全局 Theme registry 或框架专有旁路。

可选 authoring metadata 只用于 provenance 与 framework-neutral compile-driver observation：它随 `InputScene`、Layer、Child 或 Embed 的 authoring site 只读传递，normalizer 不解释、不把它变成图形语义，且它永不写入 Core IR、Scene、artifact、manifest 或 Composite dependency。它不是字段扩展、领域配置或第二条 Input 路径。

`normalizeScene` 是统一顶层入口，返回 `NormalizedInputScene`：其中唯一的 Source IR、按显式 adapter 收集的 Composite dependency contribution、authoring provenance 与 runtime metadata 必须来自同一次有序归一化，不能由调用方再做第二次 children 遍历或手工合并。只有 `NormalizedInputScene.ir` 与 Vanilla processing 通过既有 Core resolver 得到的 definitions 能交给 Core；contribution、provenance 与 runtime metadata 只供 Vanilla processing 使用，既不成为 Core compile 的平行输入，也不替代既有 resolver 输入。其 options 只接收显式 Vanilla adapter 与 processing 已准备的窄 Theme context；调用方的 Core Composite definitions 与 Theme style definitions 只经 `ProcessingOptions.compile` 进入 Vanilla processing，再由该 owner 调度既有 Core resolver。`normalizeNode`、`normalizePath` 等实体 normalizer 仍直接返回对应 `IRXxx`，以便组合出该顶层结果。

`InputPosition`、`InputTarget`、`InputTransform`、`InputNodeLabel`、`InputStepLabel`、`InputStep` 与其它实际存在的 authoring 子结构遵循同一规则：以最窄的 Source IR 类型派生，只在 authoring 形态确实不同处放宽。无差异的 Source IR 字段直接复用 `IRXxx`，不为命名完整性制造平行类型。

Core 的公开 schema 与类型只描述持久化 IR：`XxxSchema` 和由其推导的 `IRXxx`。目前仅为 authoring 宽松写法存在的 Core `*Input` 类型和同义输入 helper 从 Core 公共面移除，不保留别名、deprecated bridge、fallback 或双轨入口。Core compile 仍只接收 `IRScene`。若某个 Core parser 是独立的文本或 DSL 入口，它保留自己的 parser grammar 类型，但不得再借用 `IR*Input` 命名表达框架 authoring Input。

Vanilla 根入口同时拥有不依赖 DOM 的处理链。它以 `InputScene | IRScene` 创建 framework-neutral processing controller；两者都是可更新的 source，`InputScene` 先经 Vanilla normalize，`IRScene` 不重复经 Input 或 schema parse。controller 创建时接收固定 processing configuration，更新时只接收下一个 source 与明确可更新的 processing configuration；浏览器宿主可在该 configuration 中注入文字度量等能力，但不得以此重建 compile driver 或 session。

controller 公开创建、更新、读取、订阅、诊断和释放边界。`read` 与订阅回调只交付不可变 processing result；每份 result 都带 controller 内单调递增的 committed revision，并包含同 revision 的 Core compile result、Scene、只读 layers、artifacts、diagnostics 与 runtime metadata。订阅只观察成功提交的完整 result，取消订阅后不再接收结果。一次更新只有在完整处理成功后才能替换 `read` 的结果并推进 revision；失败不会替换上一个 committed result、不会推进 revision，且通过 controller 的诊断边界报告。释放后 controller 不再接收更新或发布结果。

processing 在创建 Runtime session 前可以接收固定的、领域中立的 transaction participant。该 participant 只能声明 session 创建时所需的 owner snapshot、一次性 commit participant 与后续事务中可更新的 owner snapshot；它不能引入 IR、Schema、registry、compile 规则或第二个 session，也不能在 session 创建后动态追加。此契约是 Vanilla processing 与 DOM materializer 的内部协作边界，不从 Vanilla 根入口暴露为 DOM API 或通用第三方插件机制。

预编译 `Scene` 不进入 controller：它只能经过 Vanilla 根入口的静态处理形成 revision 固定的 static processing result，不能被伪装成可更新的 authoring source。静态 result 与 controller result 使用同一只读结果形态；仅缺少 retained update / subscription 生命周期。这使 React 和未来框架只能订阅 Vanilla 的 committed result，而不拥有另一个 session 或提交协议。根入口不读取浏览器全局，也不提供 mount、hydrate 或元素管理。`@retikz/vanilla/dom` 才拥有默认 DOM materializer、mount、hydrate 和浏览器生命周期：它在 processing 创建 session 前注入 Render participant，使 Core Program、processing result 与 renderer 在同一 Runtime transaction 中完成 mount、update、hydration configuration 和回滚。DOM 不复制 compile、Core Program 或 Runtime session；renderer prepare 失败时，旧 Scene、DOM、processing result 与 revision 必须一起保持。

React 直接依赖 `@retikz/vanilla`。它将 React 专属语法收集为 Vanilla `InputXxx`，调用 Vanilla normalize 与处理 API；它不再定义、复制或直接调用 Core IR builder、Theme resolver、compile driver、Core Program、Runtime session 或 retained renderer 编排。React 只保留 JSX / Fragment / children 解包、开发期 React 提示、hook、ref、React 生命周期、对 Vanilla 只读结果的订阅，以及结果到 React SVG / Canvas 宿主的薄映射。Scene / Scope 的 sparse Theme 和 caller Theme style definitions 随 Input / processing options 原样传入 Vanilla，由其准备 embed context。React 不调用 Vanilla DOM mount 子入口，避免两个 owner 同时管理同一宿主节点。未来 React 以外的框架包同样只依赖相应 Vanilla API，而不重建 Core / Plot authoring 或处理逻辑。

```text
React JSX / props / children
  -> React adapter produces Vanilla InputXxx
  -> Vanilla normalizeXxx
  -> Core IRXxx
  -> Core resolveXxx + normalizeXxx
  -> CanonicalXxx -> Scene
  -> Vanilla readonly processing result
  -> React host bridge
```

Core `parseXxx` 仍是另一条边界：它接受 unknown、序列化 JSON、字符串或独立 DSL，并在单一入口执行外部形态校验后产出 IR。它不是 `InputXxx` normalize 的替代或后门。`parseWay` 与 target 字符串 grammar 是被 Vanilla、Notation 等独立 owner 消费的 Core DSL，继续留在 Core；它们使用 parser-local grammar 类型，不再借用 `IR*Input` 表达框架 authoring。Vanilla 的路径 normalizer 是 typed `way`、target 等 authoring grammar 的唯一调度入口；React 等框架包只能调用它，不能直接调用 Core parser 或拼装其 parser 产物。路径 thickness 目前既被 typed authoring 消费，也被 Plot 领域 channel resolver 消费；Core 保留公开的 closed value vocabulary 与确定性宽度 mapping，Vanilla 的路径 normalizer 决定 typed Input 的显式 `strokeWidth` 优先与 mapping 调度，Plot 继续消费前者而不依赖 Vanilla。Core 不保留 `*SugarInput` 或 typed authoring parser，Core parser 不得重新引入 `InputXxx` 类型或让 Core compile 接受宽松 Input。

## 行为、失败语义与兼容性

- 默认行为：相同 authoring 含义无论来自 Vanilla helper、`InputScene` 或 React JSX，必须得到结构等价的 `NormalizedInputScene.ir`；直接 children 与等价 Layer 输入具有相同的 Core IR 与 contribution 顺序及 compile 结果。随后 Core compile 结果保持不变
- 失败与诊断：unknown、JSON、字符串与 DSL 仍只在 Core parser / schema 边界诊断。Vanilla normalizer 只诊断 TypeScript 不能表达且 Source IR schema 未覆盖的 authoring 组合不变量，不重复 schema 或类型已经保证的检查
- 兼容性 / breaking：Core 不再导出 authoring `*Input` 类型和只服务该层的 helper；消费方改从 Vanilla 导入 `InputXxx` 与 `normalizeXxx`。不保留旧导入别名或自动迁移路径
- React / Vanilla 等价性：React 生成同一 `InputScene` / `InputXxx` 语义并调用同一 Vanilla normalizer 与 processing controller；嵌入式 Tier 2 adapter 在 Vanilla 准备的有效 Scope Theme 下生成 contribution。React 特有的 Fragment / JSX children 遍历、Sugar 展开、开发期提示、hook、ref、React 状态订阅和宿主映射不进入 Vanilla
- 处理状态：controller 只发布完整成功 revision，失败更新保留最后一个 committed result 并经诊断报告；DOM 的 Render participant 与 result participant 属于同一 transaction，任一 renderer prepare 失败都会同时回滚结果、revision 与宿主帧；预编译 `Scene` 只获得不可更新、不可订阅的 static result
- 直接 IR：手写、持久化和外部解析得到的 `IRScene` 继续直接交给 Core `compileToScene`；交给 Vanilla processing 时不经过 Input，而是作为已归一 Source IR 使用同一 processing result 链路

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的 adapter 等价暴露；解决 authoring 输入、IR builder 与框架接线分散导致的平行路径
- 主责包与协作包：Vanilla 拥有 Core `InputXxx`、Input-to-IR normalize、InputEmbed 的有效 Theme context、framework-neutral compile driver、retained processing session 与只读处理结果；React 和未来框架包拥有自身语法、状态模型、生命周期与宿主适配；Core 拥有 Source IR schema、Theme resolver、Canonical、compile 与 Scene；Render 只执行 Scene
- 拥有：Vanilla 的无框架 helpers、plain spec、所有框架可复用的 authoring 输入组装和处理链；Vanilla DOM 子入口的浏览器 materializer、mount、hydrate 与元素生命周期；React 的 JSX / ReactNode 解包、组件协议、状态订阅和 React 宿主接线
- 不拥有：Vanilla 不拥有 Core schema、Theme 默认和 registry 语义、Canonical、lowering 或 Scene 语义；React 不拥有 Core IR builder、Theme resolver、compile driver、Runtime session 或 renderer 编排；Core 不拥有框架通用 Input、framework-neutral processing API 或任一框架专有 host 细节
- 外部扩展与下游闭环：Tier 2 的 Vanilla 包遵循同一模式，拥有本领域 `InputXxx -> Plot / Tier 2 IR`，将其以 `InputEmbed` 接入 `InputScene` 并复用 Vanilla 处理链；其 React 包只将 JSX 映射到该 Vanilla Input 和结果桥接。Core Composite contribution 仍交给既有 Core resolver，不新增 adapter 私有 registry
- 不支持边界：本 ADR 不把 Vanilla plain spec 变为持久化格式，不让 DOM 子入口进入 Vanilla 根入口，也不让 Core 依赖 Vanilla 或任一框架包。它不让 React 直接拥有或调用命令式 DOM mount；React 仅映射 Vanilla 结果到自身宿主

## 架构验证

- 是否可由现有能力组合：不能。现有 Vanilla 已有 FigureSpec normalize、compile driver 与 retained session，但 Node / Path / Scope helpers 直接使用 IR，React 仍直接组装 IR 并复制 compile driver、session 与 retained renderer 编排；仅靠约定无法删除平行 owner 路径
- math / core / render / adapter 责任切分：Math 不变；Core 保持 IR 与编译语义；Vanilla 下沉作者输入并拥有 framework-neutral processing；Vanilla DOM 承担命令式浏览器 materializer；React 只保留框架转换与宿主桥接；Render 不改
- 是否需要新 IR / contract / registry；不采用 registry 的理由：不需要新 IR 或 registry。Input normalize 是闭合的作者侧语法转换，能力扩展仍先由 Core IR / Definition contract 建立，再由 Vanilla 适配，不存在由第三方运行时发现 Input normalizer 的需求
- Scene / manifest / renderer / diagnostics 如何闭环：Vanilla 以单次 `normalizeScene` 得到既有 IR、embed 的有效 Scope Theme 与 Core resolver 所需的显式 contribution 后交给 Core，并把同 revision 的 Scene、artifact、manifest、diagnostics 和只读 layers 作为 processing result 交给 DOM 或框架桥接；DOM 在 session 创建前提供固定 Render participant，因此 Core、result 与 renderer 一次 transaction 成功才提交，失败保持前一结果与宿主帧；renderer 无 Input 认知，React 只订阅该结果并映射自己的 host
- provenance / locator / Interaction Readiness 是否适用：既有 Vanilla / React authored site 与 hydration 收集必须保持来源等价；本 ADR 不新增 target、behavior、intent 或 interaction contract
- 结论：上移。将 framework-neutral authoring normalize 与 processing 从 Core / React 上移到 API 基础包 Vanilla，保持领域语义留在 Core

## 被否决方案

- React 与 Vanilla 继续各自维护 builder、compile driver 或 session：每个新字段、简写和框架包都会复制 IR 组装与处理语义，无法证明跨入口一致
- Core 保留 `*Input` 与 normalize：Core 将同时拥有持久化 IR 和框架通用作者语法，迫使所有新框架依赖或复制 Core authoring helper，违反包边界
- 新建独立 platform 包：当前 Vanilla 已是无框架、SSR 与 runtime API 基础包，再增加一层只会产生无消费者的中转包
- 让 React 直接导入 Core schema 并在 builder 内做最小转换：这只是现状的命名收敛，不能消除第二套 Input-to-IR 路径
- 让 Core parser 反向依赖 Vanilla：会破坏 Core 的独立性，使非 adapter 领域 owner 无法复用文本 / DSL parser

## 测试策略摘要

测试必须证明每个 Input 简写、显式 `0` / `false` 与完整 Source IR 形式得到等价 IR；直接 children 与等价 Layer / Embed 的唯一 `InputScene` 路径也必须得到同一 IR contribution 顺序。Core schema / parser 仍是 unknown 与序列化输入的唯一校验边界。Vanilla helper、`InputScene` 与 React JSX 的 adapter parity 必须覆盖相同领域输入、同一错误语义、同一 Core Scene 与同 revision 的只读 processing result；controller 的成功 revision、失败保持、订阅、更新、释放与静态 Scene 边界必须可观察。DOM retained 测试必须证明 Render participant 与 processing result 原子提交：renderer prepare 失败时不发布新 result/revision、不替换宿主帧，成功更新继续保留 patch、hydration、动画与节点 identity。公开表面测试必须断言 Core 不再导出 authoring Input、Vanilla 公开对应 Input / normalizer / processing API 与 DOM 子入口、React 对 Vanilla 的依赖方向成立且不再拥有 driver / session / retained renderer 编排。React 特有 children / Fragment / Sugar 行为继续以 React adapter 测试覆盖，不能借此复制 Vanilla normalizer 或处理链断言。

## 不在本 ADR 范围

- Core Source IR、Canonical、compile 默认值、theme 解析或 Scene / renderer 语义
- Plot、Table、Notation 等领域包的完整 Input 与 framework processing 迁移；它们各自的 Vanilla / framework 包在对应领域 ADR 中采用本链路。为移除 Core `IR*Input` 而必须处理的无消费 Tier 2 输入别名只可删除或改回其 schema-derived IR 类型，不借本 ADR 新增 Plot authoring API
- 新框架包、Vue / Svelte API、可视化 DSL 或新的 Sugar 图元
- 从 unknown 文档、JSON、字符串或独立 DSL 到 IR 的 Core parser 契约改写，除非某项实现被证明只服务已类型化 Vanilla Input
