# ADR-01：建立 Layout package family 并迁移排版布局

- 状态：Accepted（2026-08-09，人工确认）
- 决策日期：2026-08-09
- 关联：[alpha.1 roadmap](./roadmap.md) · [Layout v0.1 roadmap](../roadmap.md) · [Layout 布局库设计](../../../../../architecture/layout-library-design.md) · [Library 能力库设计](../../../../../architecture/library-design.md) · [Standard alpha.2 roadmap](../../../../standard/v0/v0.1/alpha.2/roadmap.md) · [Standard alpha.4 roadmap](../../../../standard/v0/v0.1/alpha.4/roadmap.md)

## 背景与目标

Standard alpha.2 已验证 FlexLayout、GridLayout、OverlayLayout、LayoutItem、共享 Box 词汇、typed artifact、Layout Inspector、直接 Definition、React 与 Vanilla authoring。后续 Notation LogicFrame / Callout 与 Standard Legend 还需要组合 canonical solver、child probe / replay、spacing、clip 与 artifact 原子能力。

这些能力已经形成从 schema、确定性求解、layout-aware compile、placement、artifact 到 inspection 的纵向闭环，不再只是 Standard 横向增加的一组简单绘图 composite。继续由 Standard 拥有会让其同时承担官方绘图拓展与布局运行模型两种演进节奏，也迫使上层通过 Standard 获取并不属于 Standard 的布局能力。

本 ADR 建立独立 Layout package family，把当前已验证的排版布局迁入正确 owner，并冻结 Layout、Standard、Core 与算法布局的边界。迁移只改变 package owner 与 canonical namespace，不借机重设计 Flex / Grid / Overlay 行为、建立兼容 facade 或吸收图算法。

## 决策：独立三包与 release group

建立 lockstep package family：

- `@retikz/layout`：宿主无关的排版 schema、Definition、factory、solver、composition、artifact 与 inspection
- `@retikz/layout-react`：React JSX authoring、静态 capability contribution 与 runtime 接线
- `@retikz/layout-vanilla`：无框架 builder、adapter、SSR / mount authoring 与 runtime 接线

三个包使用独立 release group `layout`。`packages/library` 是能力库分组，不创建 `@retikz/library` 聚合包。Layout 只依赖 Core、必要的 Math / Foundation 与 schema 底座，不依赖 Standard、Notation、Plot、Table、renderer 或 DOM。

Standard、Notation、Plot、Table 与未来 Tier 2 按实际需要直接依赖 Layout。Standard 可以组合 Layout 完成 Legend 等自身 composite，但不得 re-export Layout API、deep import Layout 私有实现或复制 solver。

## 基础数据结构与公开契约

### Canonical Layout IR 与 Definition

迁移保留既有公开概念与类型：FlexLayout、GridLayout、OverlayLayout、LayoutItem、Layout size / spacing / alignment / distribution / overflow，以及三类 Layout artifact。宿主无关输入继续是 JSON-safe strict schema，公开 TypeScript 数据类型仍由 schema 推导。

canonical namespace 改为 `layout`：

```ts
type LayoutCompositeIdentity =
  | {
      namespace: 'layout';
      type: 'flexLayout';
    }
  | {
      namespace: 'layout';
      type: 'gridLayout';
    }
  | {
      namespace: 'layout';
      type: 'overlayLayout';
    };
```

对应 Definition / adapter identity 为 `layout.flexLayout`、`layout.gridLayout`、`layout.overlayLayout`。直接 IR、factory、React 与 Vanilla 构造同一 canonical input，并通过 Core `CompositeDefinition` registry 消费。

Layout 不新增专用 solver registry 或 `defineLayout()` 扩展轴。Flex、Grid、Overlay 是具有各自 schema 与确定性语义的闭合官方 composite；第三方自定义布局继续定义普通 Core CompositeDefinition，并可组合 `/compose` 公共能力。内置与自定义因此进入同一 Core registry、compile options、重复 key 诊断与 dispatch 主链。

迁移按以下映射继承已验证契约；本 ADR 覆盖 package owner、namespace、公共入口和依赖方向，表中 ADR 的输入字段、默认值、求解不变量、artifact 与失败语义其余部分按原义纳入本 ADR：

| 继承能力                      | 已验证契约                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Layout Profile 与 Core Gate   | [Standard alpha.2 ADR-01](../../../../standard/v0/v0.1/alpha.2/01-layout-profile-core-gate.md)               |
| Box、LayoutItem 与共享词汇    | [Standard alpha.2 ADR-02](../../../../standard/v0/v0.1/alpha.2/02-box-layout-item-vocabulary.md)             |
| FlexLayout                    | [Standard alpha.2 ADR-03](../../../../standard/v0/v0.1/alpha.2/03-flex-layout.md)                            |
| GridLayout                    | [Standard alpha.2 ADR-04](../../../../standard/v0/v0.1/alpha.2/04-grid-layout.md)                            |
| OverlayLayout                 | [Standard alpha.2 ADR-05](../../../../standard/v0/v0.1/alpha.2/05-overlay-layout.md)                         |
| Artifact、Definition、adapter | [Standard alpha.2 ADR-06](../../../../standard/v0/v0.1/alpha.2/06-layout-artifacts-capabilities-adapters.md) |
| Layout Inspector              | [Standard alpha.2 ADR-07](../../../../standard/v0/v0.1/alpha.2/07-layout-inspector.md)                       |

迁移完成后，这些旧 ADR 的 Superseded 表示 owner 已变化，不表示删除其被本 ADR 明确继承的行为契约。任何未来行为调整都在 Layout 后续 ADR 中进行，不回写 Standard 历史。

### 根入口

`@retikz/layout` 根入口面向直接作者，导出三类 Layout 的 schema、输入 / IR / artifact 类型、Definition、factory、LayoutItem、共享 Box 词汇与 artifact schema。根入口不静态加载 Inspector，不导出仅供跨 owner 组合的低层会话与求解 helper。

### `/compose` 公共入口

`@retikz/layout/compose` 面向 Standard、Notation 与其它 Tier 2 owner，只暴露稳定、无副作用、renderer-agnostic 的布局组合能力：

| 能力组                | 公共契约                                                                                                                            | 不变量与失败语义                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| canonical compiler    | `compileFlexLayout`、`compileGridLayout`、`compileOverlayLayout` 接收已解析 canonical IR 与当前 `LayoutCompositeCompileContext`     | 复用同一 minimum / natural / range / exact、placement、replay、clip 与 artifact 主链；probe / replay 失败 fail-loud |
| child layout session  | intrinsic / exact proposal、required probe、measure、place 与 replay 的 typed stateless helper                                      | handle 只在同次 compile 使用；不缓存 replay、不探测 child 类型、不绕开 Core context                                 |
| geometry 与 artifact  | spacing normalize、content / positioned slot、axis size、alignment、clip、rect union / intersection、artifact item / container 构造 | 坐标统一为 container allocation；非有限、负尺寸或跨坐标输入 fail-loud                                               |
| reusable flow solving | compensated sum、Flex line minimum / natural / cross metrics，以及 paired-flow intrinsic、plan 与 translation                       | 输入不可变、结果确定、数值有限；不读取 Legend、Notation、Plot、Table 等领域字段                                     |

v0.1 的最小 named surface 冻结为：

```ts
import {
  alignAllocationInSlot,
  compensatedLayoutSum,
  compileFlexLayout,
  compileGridLayout,
  compileOverlayLayout,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  exactLayoutProposal,
  intrinsicLayoutProposal,
  layoutClipOf,
  measureLayoutChild,
  normalizeLayoutSpacing,
  placeLayoutChild,
  positionedLayoutSlotOf,
  replayLayoutChildren,
  requiredLayoutProbe,
  resolveFlexLineCrossMetrics,
  resolveFlexLineMainProfile,
  resolveLayoutAxisSize,
  resolvePairedFlowIntrinsicMainProfile,
  resolvePairedFlowPlan,
  translatePairedFlowPlan,
  unionLayoutArtifactRects,
} from '@retikz/layout/compose';

import type {
  CreateLayoutArtifactItemInput,
  FlexCrossItem,
  FlexLineCrossMetrics,
  FlexLineMainProfile,
  FlexMainItem,
  LayoutChildHandle,
  LayoutInsets,
  LayoutRect,
  MeasuredLayoutChild,
  PairedFlowAlignment,
  PairedFlowDirection,
  PairedFlowItem,
  PairedFlowLine,
  PairedFlowMeasuredChild,
  PairedFlowOptions,
  PairedFlowPlan,
  PairedFlowSlot,
  PairedFlowWrap,
  PlacedLayoutChild,
  PositionedLayoutSlotInput,
  ResolvedLayoutAxisSize,
  ResolveLayoutAxisSizeInput,
} from '@retikz/layout/compose';
```

这些类型保持只读、JSON 值或 compile-local opaque handle 边界；opaque handle 不进入 IR、artifact 或跨 compile 状态。上述能力延续当前 Layout solver 与 artifact 真源。`/compose` 不是内部目录镜像：Grid / Overlay 私有中间状态、仅有单一包内调用点的 helper、可变 registry 与实现期缓存不得进入公共面。

直接调用 canonical compiler 只表示一个 composite owner 在自己的 compile 中组合 Layout solver，不经过 Layout composite registry，也不会隐式注册对应 Layout Definition。作者把独立 Layout IR 作为 Scene child 时，宿主仍须显式提供该 LayoutDefinition；nested child 所需的其它 Definition 也由同一 compile environment 显式提供。

### `/inspect` 可选入口

`@retikz/layout/inspect` 拥有 Flex / Grid / Overlay artifact 的 inspector definition、选择与输出组合；`@retikz/layout-react/inspect`、`@retikz/layout-vanilla/inspect` 提供对应 authoring。三个根入口不静态导入 `@retikz/inspect`，普通 Layout 使用不因缺少可选 inspection 依赖而失败。

## 行为、失败语义与兼容性

- 默认行为：除 package owner 与 canonical namespace 外，迁移后的输入、默认值、求解、placement、overflow / clip、artifact 几何、Core Scene 与 renderer 输出保持当前 Standard 契约等价
- schema 与 diagnostics：非法数值、互斥字段、重复 LayoutItem key、无有限解、child probe / replay 与缺失 Definition 继续 fail-loud；诊断中的 Standard owner 改为 Layout
- 空间不足：存在确定几何结果时保留真实 slot、allocation、visual / visible bounds、overflow 与 clip，不通过缩放 primitive 或删除 item 伪装修复
- 兼容性：这是 `0.x` breaking move。Standard 三包的 Layout 导入、`@retikz/standard/layout`、Standard `/inspect` Layout API 与 `standard.*Layout` identity 直接移除，不提供 alias、re-export、deprecation wrapper、双注册或双 namespace
- adapter 等价：直接 IR、React 与 Vanilla 产生同一 canonical Layout IR，进入同一 Definition、Core compile 与 artifact 主链；adapter 不复制 schema、solver、默认值或 diagnostics
- renderer：SVG、Canvas 与其它 renderer 只消费同一 Core Scene，不增加 Layout 分支或布局回读

## Standard 与文档迁移

迁移完成后：

- Standard alpha.2 ADR-01～07 标记为由本 ADR Superseded；旧文件原地保留，记录 Standard 当时验证这些契约的历史
- Standard alpha.2 ADR-08 保持既有 Superseded 历史，不重写其原始后继关系；本 ADR只接管当前 Layout Inspector owner
- Standard alpha.2 ADR-09（Legend）与 ADR-10（Presentation lower reuse）继续 Accepted，改为组合 Layout `/compose`，不再声明 Standard 拥有 Box / Flex / Overlay solver
- Standard alpha.3 ADR-06 的直接 Definition loading 原则继续 Accepted；Layout 复用同一 Core 显式 Definition 机制，不建立 capability bundle
- Notation alpha.1 ADR-01 继续 Accepted；只把其公共 layout composition owner 从 Standard 改为 Layout，不改变 Notation package family、图式元素或依赖 Core 主链的其它决策
- Standard v0.1 alpha.4 记录 breaking removal 与下游迁移，Layout alpha.1 作为现行布局契约真源

文档站把当前 Standard 顶级模块重组为 Library 顶级模块，分组顺序为 `Standard · 拓展`、`Layout · 布局`。Standard 使用 `/library/standard/...`，Layout 使用 `/library/layout/...`；两组分别维护介绍、组件 / capability、参考与所属 release group 的更新日志。旧 Standard Layout 页面、schema registry owner 与示例 import 不保留双份入口。

## 功能与包边界

- 所属能力域与解决的问题：Library Layout，提供领域无关容器排版、约束求解、placement、artifact 与 inspection
- 主责包与协作包：Layout 三包主责排版布局；Core 主责 proposal / probe / replay、Scope、diagnostics 与 Scene；Standard / Notation / Plot / Table 是消费方；docs 提供发现与示例
- 拥有：Layout schema、Definition、solver、composition、artifact、inspector、adapter 与 `layout` namespace
- 不拥有：Core IR / compile 基础协议、renderer、DOM 测量、GraphModel、Tree / Layered / Force、rank、port、edge routing、领域 provenance 与编辑状态
- 外部扩展与下游闭环：第三方布局可通过普通 Core CompositeDefinition 组合 `/compose`；官方与自定义 Definition 复用 Core registry，领域包直接依赖实际 owner
- 不支持边界：本轮不新增布局种类、schema 字段、默认值、算法分支或 renderer 能力

## 架构验证

- 是否可由现有能力组合：布局行为已由 Standard alpha.2 验证；新能力只涉及正确 package owner、release topology、公开 composition boundary 与 namespace
- 能力责任切分：Core 保存 layout-aware 执行协议；Layout 保存排版模型与求解；Standard 保存横向绘图拓展；领域包保存领域解析；renderer 只执行 Scene
- define-registry：不新增 Layout 专用 registry；三类官方 Layout 与第三方 composite 统一使用 Core CompositeDefinition、compile options 与冲突诊断
- pipeline / lowering / renderer / diagnostics：复用当前 Layout solver 与 Core probe / replay 主链，迁移后由 Layout Definition 注入；renderer 无专用分支
- provenance / locator：LayoutItem key、artifact occurrence 与 inspector 继续表达布局局部 identity；领域 provenance 由消费方保存，不写入 Layout
- 结论：把已形成纵向闭环的排版布局从 Standard 拆为独立 owner，同时保留 Standard 与领域 composite 的公开组合能力

## 实施结果

- Layout 三包已形成独立 lockstep package family 与 release group，三类 canonical identity 已切换为 `layout.*Layout`
- Standard、Notation、Plot 与 Chart 已改为直接消费 Layout 根入口或 `/compose`，Standard 不保留旧导出、别名、namespace 或 Inspector 入口
- 直接 IR、React、Vanilla、Inspector 与跨 owner 组合继续进入同一 Core registry、layout-aware compile 与 renderer-neutral Scene 主链
- Library 文档已拆分为 Standard 与 Layout 两组，并分别提供双语入口、参考、Schema Registry 与 changelog；算法布局继续保持在本包边界之外

## 被否决方案

- 继续保留在 Standard：让 Standard 同时承担横向绘图拓展与纵向布局运行模型，未来 solver / artifact / inspection 扩张会持续放大错误边界
- 只建立 `@retikz/layout`，把 React / Vanilla 留在 Standard adapter：形成 schema / solver 与 authoring 双 owner，依赖和发布无法独立闭环
- Standard 保留 re-export 或旧 namespace：形成双入口、双 Schema owner、持久化歧义与长期兼容负担
- 把全部 `layout/internal` 公开：将私有中间状态和无稳定跨 owner 语义的 helper 固化为公共 API
- 把 Tree / Layered / Force 一并纳入：算法布局依赖关系模型与全局约束，不属于领域无关容器排版
- 下沉到 Core：Flex / Grid / Overlay 是可选高层排版能力，Core 只需保持足以承载它们的通用 proposal / probe / replay 协议

## 测试策略摘要

需要 schema / JSON 证据锁定 `layout` namespace、strict 输入、LayoutItem 与 artifact；solver 证据锁定 Flex / Grid / Overlay 的确定性、有限性、输入不可变与当前行为等价；Core integration 证据锁定 probe / replay、nested composite、Definition 与 diagnostics；`/compose` 证据锁定 Standard Legend、Notation 与自定义 composite 真实消费且无 deep import；React / Vanilla 证据锁定 canonical IR 与 runtime 等价；Inspector、renderer、exports、release metadata、docs 与 changelog 证据锁定可选入口、单一 owner 和迁移完整性。

## 不在本 ADR 范围

- 新增 Flex / Grid / Overlay 字段、默认值或求解行为
- Tree、Layered、Force、Radial graph、UML 自动排布与 edge routing
- GraphModel、Port / Group、selection、viewport、history 与编辑器 runtime
- 完整 CSS layout、DOM / renderer 回读、异步测量与跨 compile cache
- Standard Legend、Notation、Plot 或 Table 自身领域契约重设计
- push、tag、publish 与 release 执行
