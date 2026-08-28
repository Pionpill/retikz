# ADR-01：建立 Layout package family 并迁移排版布局

- 状态：Accepted（2026-08-09，人工确认）
- 决策日期：2026-08-09
- 关联：[alpha.1 roadmap](./roadmap.md) · [Layout v0.1 roadmap](../roadmap.md) · [Layout 布局库设计](../../../../../architecture/layout-library-design.md) · [Library 能力库设计](../../../../../architecture/library-design.md)

## 背景与目标

FlexLayout、GridLayout、OverlayLayout、LayoutItem、共享 Box 词汇、layout artifact、Inspector、React 与 Vanilla authoring 已形成从 schema、确定性求解、layout-aware compile、placement 到 inspection 的纵向闭环，不再只是 Standard 中的一组绘图 composite

本决策建立独立 Layout package family，把排版布局迁入正确 owner，并冻结 Layout、Standard、Core 与算法布局的边界。迁移只改变 package owner 与 canonical namespace，不重设计 Flex / Grid / Overlay 行为，不建立兼容 facade，也不吸收图算法

## 决策

### Package family 与依赖方向

建立三个 lockstep 包和独立 release group `layout`：

- `@retikz/layout`：宿主无关的 schema、Definition、factory、solver、composition、artifact 与 inspection
- `@retikz/layout-react`：React authoring、静态 capability contribution 与 runtime 接线
- `@retikz/layout-vanilla`：无框架 builder、adapter、SSR / mount authoring 与 runtime 接线

Library 只是能力域分组，不创建 `@retikz/library` 聚合包。Layout 只依赖 Core 及必要的 Math / Foundation，不依赖 Standard、Graph、Plot、Table、renderer 或 DOM

Standard、Graph、Plot、Table 与其它 Tier 2 按需直接依赖 Layout。Standard 可以组合 Layout 完成自身 composite，但不得 re-export Layout API、deep import 私有实现或复制 solver

### Canonical identity 与既有行为

FlexLayout、GridLayout 与 OverlayLayout 的 canonical identity 分别为 `layout.flexLayout`、`layout.gridLayout` 与 `layout.overlayLayout`。Direct IR、factory、React 与 Vanilla 构造同一 canonical input，并通过 Core `CompositeDefinition` registry 消费

Layout 不建立专用 solver registry 或 `defineLayout()` 扩展轴。三个内置布局是具有独立 schema 与确定性语义的闭合官方 composite；第三方布局继续定义普通 Core CompositeDefinition，并可组合 `/compose` 公共能力

迁移继承 Standard alpha.2 已冻结的输入、默认、求解、artifact 与失败语义：

| 能力                  | 被继承的决策                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout Profile        | [Standard alpha.2 ADR-01](../../../../standard/v0/v0.1/alpha.2/01-layout-profile-core-gate.md)                                                                                                            |
| Box 与 LayoutItem     | [Standard alpha.2 ADR-02](../../../../standard/v0/v0.1/alpha.2/02-box-layout-item-vocabulary.md)                                                                                                          |
| Flex / Grid / Overlay | [ADR-03](../../../../standard/v0/v0.1/alpha.2/03-flex-layout.md) · [ADR-04](../../../../standard/v0/v0.1/alpha.2/04-grid-layout.md) · [ADR-05](../../../../standard/v0/v0.1/alpha.2/05-overlay-layout.md) |
| Artifact 与 adapter   | [Standard alpha.2 ADR-06](../../../../standard/v0/v0.1/alpha.2/06-layout-artifacts-capabilities-adapters.md)                                                                                              |
| Inspector             | [Standard alpha.2 ADR-07](../../../../standard/v0/v0.1/alpha.2/07-layout-inspector.md)                                                                                                                    |

这些旧 ADR 的 Superseded 只表示 owner 迁移；被本 ADR 明确继承的行为仍然有效，后续调整进入新的 Layout ADR

### 公开入口

`@retikz/layout` 根入口面向直接作者，导出三类 Layout 的 schema、输入 / IR / artifact 类型、Definition、factory、LayoutItem、共享 Box 词汇与 artifact schema。根入口不静态加载 Inspector，也不暴露低层 composition helper

`@retikz/layout/compose` 面向 Standard、Graph 与其它 composite owner，提供稳定、无副作用、renderer-agnostic 的组合能力：

| 能力                 | 稳定边界                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| canonical compiler   | 编译已解析 Flex / Grid / Overlay，并复用同一 proposal、placement、replay、clip 与 artifact 主链 |
| child layout session | 构造 proposal、执行 required probe、measure、place 与 replay；handle 只在同次 compile 有效      |
| geometry / artifact  | spacing、slot、axis size、alignment、clip、rect 运算与 artifact 构造                            |
| reusable flow solver | compensated sum、Flex line metrics 与 paired-flow intrinsic / plan / translation                |

`/compose` 只暴露跨 owner 已验证复用的能力，不镜像内部目录，不导出单一调用点 helper、可变 registry、私有中间状态或跨 compile cache。所有输入保持只读，输出为 JSON 值或 compile-local opaque handle；非法尺寸、非有限数与跨坐标输入 fail-loud

直接调用 canonical compiler 不会隐式注册 Layout Definition。独立 Layout IR 作为 Scene child 时，宿主仍须显式提供对应 Definition；nested child 所需 Definition 也由同一 compile environment 提供

`@retikz/layout/inspect` 拥有 Flex / Grid / Overlay artifact 的 inspector definition、选择与输出组合；React / Vanilla 的 `/inspect` 子入口提供对应 authoring。三个根入口都不静态依赖 `@retikz/inspect`

## 行为、失败语义与兼容性

- 除 owner 与 namespace 外，迁移后的输入、默认、求解、placement、overflow / clip、artifact 几何、Scene 与 renderer 输出保持等价
- 非法数值、互斥字段、重复 LayoutItem key、无有限解、child probe / replay 与缺失 Definition 继续 fail-loud
- 空间不足但存在确定结果时保留真实 allocation、bounds、overflow 与 clip，不缩放 primitive 或删除 item
- Standard 三包的 Layout 导出、`@retikz/standard/layout`、旧 Inspector API 与 `standard.*Layout` identity 直接删除，不提供 alias、双注册或双 namespace
- Direct IR、React 与 Vanilla 进入同一 canonical IR、Definition、compile 和 artifact 主链；adapter 不复制 schema、solver、默认或诊断
- renderer 只消费 Core Scene，不增加 Layout 分支或布局回读

## 结果与长期边界

Layout 三包已形成独立 owner 和 release group；Standard、Graph、Plot 与 Chart 只通过 Layout 公共入口消费布局能力

Layout 拥有排版 schema、solver、composition、artifact、inspection 与 adapter，不拥有 Core compile 协议、renderer、DOM 测量、Tree / Layered / Force、routing、GraphModel、编辑状态或跨 compile cache。新的布局种类和行为变化需要新的 Layout 决策
