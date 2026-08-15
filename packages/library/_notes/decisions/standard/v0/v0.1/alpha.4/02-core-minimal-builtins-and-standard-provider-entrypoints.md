# ADR-02：Core 最小内置集合与 Standard provider 子入口

- 状态：Accepted（2026-08-15，公开契约、Tier 2 装配与跨入口闭环完成）
- 决策日期：2026-08-13
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.4 roadmap](./roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md) · [Standard alpha.3 ADR-06](../alpha.3/06-direct-definition-loading.md) · [Core ADR-18](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md)

## 背景与目标

Core 已为 Shape、Boundary、Clip、Arrow、Pattern、Path Generator 与 Path Kind 等能力建立 Definition、define helper、registry、compile options、统一 lookup 与诊断。此前多数官方实现仍随 Core 根包一起分发，即使一幅图没有使用 star、contour 或 compound clip，也会把这些可选实现纳入 Core 的默认依赖图。

这使 Core 同时承担“绘图语言和编译机制 owner”与“官方扩展内容全集”两种职责。前者属于 Drawing Complete 的稳定底座，后者是可按需安装的横向能力。继续把所有官方实现加入 Core 会让每次新增箭头、Shape 或 Path Kind 都扩大最底层包，也迫使 Plot 等 Tier 2 在“依赖 Core 即隐式获得全部内容”和“各自拼装 definitions”之间选择。

本 ADR 的目标是建立长期边界：Core 继续拥有通用 IR、Definition / registry、provider assembly、compile 与诊断，只保留不依赖 Standard 也能完成基础绘图闭环的最小官方实现；其余官方通用实现迁入 `@retikz/standard` 的能力子入口。调用方只装配实际需要的能力，Tier 2 可以声明自己的静态依赖，而不是依赖全局状态、副作用导入或 package discovery。

## 决策：以能力准入原则收敛 Core 内置集合

一个官方 implementation 只有同时满足以下条件，才进入 Core 默认内置集合：

1. 缺少它会破坏对应 Core IR 的基础绘图闭环或既有默认值
2. 它是该能力最小、稳定、领域中立的基线，而不是样式丰富度、便利用途或特定图式惯例
3. 它复用与外部 definition 相同的 contract、registry、resolver 与 dispatch，不拥有内置旁路
4. 单项实现的体积和依赖适合作为所有 Core 消费者的常驻成本

内置项数量不构成独立准入或排除条件。Core 可以只保留一个能力的最小集合，也允许某类可选能力没有默认内置项；新增实现仍须逐项满足上述原则并进入正确 owner。

本次边界冻结如下：

| 能力           | Core 默认内置                                                      | Standard 官方扩展                    | 理由                                                                                                 |
| -------------- | ------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Shape provider | `rectangle`、`ellipse`、`polygon`                                  | `cross`、`sector`、`star`、`contour` | 前三者覆盖基础盒、曲面和任意直边轮廓；其它属于可选形态                                               |
| Shape preset   | `circle`、`diamond`                                                | 无                                   | 它们是基础 Shape 的参数化预设，不增加 provider implementation                                        |
| Arrow          | `normal`、`open`、`stealth`、`openStealth`、`circle`、`openCircle` | `diamond`、`openDiamond`             | 六个基础箭头覆盖实心 / 空心三角、Stealth 与圆点端点；菱形箭头属于可选扩展                            |
| Pattern        | `lines`、`dots`、`grid`                                            | 无                                   | 当前三项已是小型基础集合；后续新增内容仍按能力归属判断                                               |
| Boundary       | `rectangle`、`circle`、`ellipse`                                   | 无                                   | 三项与基础 Node 连接面闭环，保持 Core 内置                                                           |
| Clip           | `rect`、`circle`、`ellipse`                                        | `polygon`、`path`、`compound`        | 基础几何裁剪保留在 Core；多边形、结构化路径和递归组合按需装配并复用 Core clip contract 与 Scene 表达 |
| Path Generator | 无                                                                 | 无                                   | Path step 不依赖 generator 也能闭环；本 ADR 不建立 Standard 官方实现                                 |
| Path Kind      | `stroke`、`ribbon`                                                 | 无                                   | Stroke 是 Path 默认语义；Ribbon 暂留 Core，待 ADR-03 完成完整 owner 迁移                             |
| Theme baseline | 保留现状                                                           | 不在本次迁移                         | Core theme 默认和 shared colors 属于基础编译环境，不是内容扩展集合                                   |

表中“Standard 官方扩展”仍使用 Core 定义的 `XxxDefinition`、`defineXxx()`、registry option 和消费语义。迁移不把 Core contract、IR discriminator、registry 或 compile lookup 复制到 Standard，也不改变第三方定义能力。

迁出项对应的官方名称常量、参数 schema 和 schema-derived 类型一并归 Standard；Core 只保留开放的 provider key / spec 基础契约和默认内置项的名称。多数能力当前已经用开放字符串或 definition schema 完成该边界；`compound` Clip 是例外，其专用递归 schema 也随 definition 迁出。Core 的通用 Clip spec 继续接受注册项的 JSON-safe object，并在 compile lookup 后用所选 `ClipDefinition.schema` 解析；Core 不为迁出的 `compound` 保留 reserved key 或静态 schema 分支。

## Standard 能力子入口

`@retikz/standard` 为迁入的官方 provider implementations 提供以下公共入口：

```ts
import { CrossShapeDefinition } from '@retikz/standard/shape';
import { DiamondArrowDefinition } from '@retikz/standard/arrow';
import { CompoundClipDefinition } from '@retikz/standard/clip';
```

每个子入口只导出该能力族的稳定定义、名称常量、定义参数类型、单项 Definition，以及需要传递依赖或合并 owner-local datasets 时使用的静态 provider。它不创建跨能力的 Standard registry，不改变 Core definition 类型，也不暴露私有几何 helper。

这些 provider extensions 不从 `@retikz/standard` 根入口、`@retikz/standard-react` 根入口或 `@retikz/standard-vanilla` 根入口转发。Standard 已有 composites 仍可按其既有根入口契约导出；本决策只禁止把迁入的 Core provider extensions 重新聚合成另一个隐式全集。各子入口是明确的 package exports，并具有独立构建入口；包保持 `sideEffects: false`，未导入的子入口不得执行注册或进入调用方模块图。

子入口名称按 Core 能力名而不是当前消费者命名。本决策只建立 `shape`、`arrow`、`clip` 三个子入口；Path Generator 与 Ribbon 不发布空入口，后续真实能力必须由其自身 ADR 决定完整契约与公开面。

## Core provider dependency graph 与 assembly

现有 Composite dependency graph 只装配 `CompositeDefinition`，不能表达 Shape、Arrow、Clip、Path Generator、Path Kind 等普通 Core provider。Core 将它泛化为 adapter-neutral 的 provider dependency graph；一次 authoring contribution 声明实际需要的 roots，并携带可解析这些 roots 的 providers：

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
  contributions: ReadonlyArray<CoreProviderContribution>,
  explicit?: CompileProviderOptions & Pick<CompileCompositeOptions, 'composites'>,
) => ResolvedCoreProviderOptions;
```

这是等价的最小跨层形状；最终公开命名应复用既有 Composite graph vocabulary，但不得拆成 adapter 私有协议。`capability + name` 是普通 provider 的完整 identity；Composite 继续使用独立的 `namespace + type` identity，不能编码进字符串或退化成 owner namespace、数组位置。resolver 最终按 `CompileProviderOptions` 的能力复数名返回分组 definitions。

`datasets` 是 provider owner 合并同一 key 多次 authored contribution 的唯一扩展槽；每个 owner 用自身稳定的数据项 key 写入独立值。Core 只提供按数据项 key 与 reference identity 的确定性合并和冲突检查，不解释 Composite runtime data 或其它 owner-local 内容。没有 datasets 的普通单项 definition 使用空表和固定 maker；Ribbon 与 Width Profile 的数据模型不由本 ADR 冻结。

Theme Style 不进入本次 dependency graph。它是完整 compile environment 的显式主题解析配置，不由 authored child 自动要求；调用方继续通过 `CompileOptions.themeStyles` 提供。若未来出现跨包传递 Theme Style 依赖，必须用独立 ADR 验证其生命周期和冲突语义，不能借本次 provider 内容迁移顺带扩张。

assembly 遵循以下确定性规则：

- contributions 按 authored 顺序解析；resolver 只物化从 roots 可达的稳定闭包，不把 provider catalog 当成全量 preset
- 同一 key 重复携带时，必须使用相同 maker 引用和相同有序 dependencies；否则在执行 maker 前 fail-loud
- 同一 key 的 dataset 属性按名称合并；重复属性只有在 `Object.is(existing, incoming)` 时允许去重，否则 fail-loud
- 缺失 dependency、cycle、maker 输出 capability/key 不匹配或 maker 抛错都在 dispatch 前 fail-loud；依赖先于消费者，首次可达顺序作为稳定 tie-break
- Composite 继续复用既有完整 key、datasets 与拓扑语义；泛化不得弱化现有 Composite graph 的闭包和冲突契约
- 调用方显式传入的 compile definitions 与 provider graph 结果在同一 Core resolver 中合并；相同引用允许去重，同 key 不同定义继续 fail-loud
- resolver 返回普通 `CompileOptions` 可消费的 definitions，不创建长期全局 registry、module identity、版本 catalog 或 runtime loader
- 所有冲突必须在 compile dispatch 前报告 capability、冲突 key 与来源；缺少已被 IR 引用的 definition 仍由对应 Core registry / lookup fail-loud，并列出当前可用项

Core 是 dependency / assembly contract、resolver 和冲突语义的 owner。Standard 子入口只提供静态 definitions 或静态 providers；Plot、Table、Notation 等 Tier 2 只声明所需 roots 和 provider catalog，不实现 merge、去重或 lookup。

## 各入口与 Tier 2 闭环

- 直接 Core compile：调用方可以把从 Standard 子入口导入的单项 definitions 直接放入对应 `CompileOptions`；也可以显式调用 Core dependency resolver 组合若干 contributions
- Vanilla：每个 Tier 2 adapter contribution 同时返回 Core child 与 Core provider contribution；Vanilla 收集后只调用 Core resolver，并把结果交给统一 compile 入口
- React：每个 embeddable adapter 返回相同的 Core provider contribution；React builder 只按 authored tree 收集，Layout runtime 只调用 Core resolver
- SSR、retained runtime 与观察编译：复用 Vanilla / React 得到的同一 resolved options，不拥有第二套 provider 状态
- 官方 Tier 2：在自身公开依赖中静态导入精确 Standard 子入口，并在其 adapter-neutral contribution 中声明 definitions。它不得假设宿主已经全量注册 Standard，也不得从生成后的 IR 反向扫描 provider 名称

相同 IR、相同显式 definitions 和相同 contribution 顺序必须在直接 compile、Vanilla、React 与 SSR 产生相同 registry、Scene、artifact、spatial sidecar 和诊断。provider contribution 只存在于 authoring / compile assembly runtime，不进入 IR、Scene、manifest、artifact 或持久化 JSON。

## 行为、失败语义与兼容性

- Core 默认能力减少是 0.x 的 breaking change。仅依赖迁出名称且未显式装配 Standard definition 的输入会得到现有“未注册 provider”诊断
- Core IR 仍接受开放的 provider 名称或注册项 spec；不把 Standard 名称从 JSON schema 变成非法值，也不增加 `standard:` 前缀
- Core 保留项的默认值不变：Node 默认 Shape、Path 默认 Stroke、默认 Arrow 仍必须指向 Core 内置 definition
- 迁入 Standard 的 definition 在相同输入、theme、precision 和 host services 下必须保持迁移前的 Scene 几何、bounds、marker、clip 与诊断语义
- 同一调用显式提供冲突 definition 时 fail-loud；不会因它来自 Core、Standard、Tier 2 或用户自定义而使用不同优先级
- 不提供旧 Core definition re-export、弃用 alias、自动安装 Standard、兼容 fallback 或“若已安装则发现”的双轨行为

## 接受结果

Core 已以统一 provider dependency graph 装配普通 provider 与 Composite，并把解析结果合并进同一 compile options；Standard 的 `shape`、`arrow`、`clip` 子入口提供上述可选 definitions 与静态 providers，根入口不聚合这些扩展。React、Vanilla、SSR 与官方 Tier 2 均沿同一 contribution 闭包传递依赖，Plot 等消费者显式携带其所需的 Standard providers，不依赖宿主预装或全局注册。
