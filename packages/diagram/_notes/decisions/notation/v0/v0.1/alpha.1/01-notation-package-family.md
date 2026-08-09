# ADR-01：建立 Notation package family 并迁移图式元素

- 状态：Accepted（2026-08-08，人工确认）
- 决策日期：2026-08-08
- 关联：[alpha.1 roadmap](./roadmap.md) · [Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [Diagram 制图能力域设计](../../../../../../../../notes/architecture/diagram-design.md) · [Standard alpha.3 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/roadmap.md)

## 背景与目标

Standard alpha.3 已验证 LogicFrame、Terminal、Stage、Decision、Junction、Connector 与 Callout 的 schema、Core Sugar、Tier 2 lowering、React / Vanilla authoring 和双语文档。但这些名称表达流程、分支、局部关系与说明等图式职责，不满足 Standard“移除领域词汇后仍成立”的长期准入条件；继续扩展 UML Class、State 等元素会把 Standard 变成功能收纳桶。

本 ADR 建立 Diagram 领域的统一 Notation 入口，把现有元素迁入正确 owner，并冻结 Notation 与 Standard / Core / Graph 的依赖边界。迁移必须复用当前已验证行为，不借机创建 GraphModel、复制布局算法或保留两个公共真源。

## 决策：独立三包，按底层机制迁移，公共布局仍由 Standard 拥有

建立 lockstep package family：

- `@retikz/notation`：宿主无关的 schema、factory、Core Sugar、Definition、lowering 与 artifact
- `@retikz/notation-react`：React JSX authoring 与 runtime 接线
- `@retikz/notation-vanilla`：无框架 builder、SSR / mount authoring 与 runtime 接线

三包使用 release group `notation`。`packages/diagram` 是领域目录，不创建 `@retikz/diagram` 聚合包。未来 Graph 可以单向依赖 `@retikz/notation`，Notation 不依赖 Graph、Flow 或 Editor。

首批迁移保持七个公开元素的名称、输入字段、默认值、identity、target、artifact 与失败语义：LogicFrame、Terminal、Stage、Decision、Junction、Connector、Callout。canonical composite / adapter namespace 从 `standard` 改为 `notation`；Standard 根入口、adapter 入口、schema registry 与 docs 不保留 re-export、别名或旧 namespace 兼容。

## 基础数据结构与公开契约

Notation 继续保留两类公开机制：

1. Terminal、Stage、Decision、Junction 是 Core Node Sugar。它们固定 shape、默认值和职责 describe，输出 `type: 'node'`，不注册 Notation composite 或 artifact。
2. LogicFrame、Connector、Callout 是 Tier 2 composite。它们保留当前 JSON-safe schema、Definition、factory、target 与适用 artifact，经 Notation namespace lowering 为 Core IR。

组件字段与类型名本轮不变；import owner 改为：

```ts
import {
  CalloutDefinition,
  ConnectorDefinition,
  DecisionSchema,
  LogicFrameDefinition,
  createLogicFrame,
} from '@retikz/notation';
```

React 与 Vanilla 使用对应 Notation adapter 包。直接 IR 注入实际使用的 LogicFrame、Connector、Callout Definition；四个语义 Node 不需要 Definition。

## Standard 公共 layout composition contract

LogicFrame 通过 canonical FlexLayout 排布 header 与 sections；Callout 的内容外壳复用 Standard 的尺寸、spacing、allocation、clip 与 artifact 语义。Notation 不允许跨包引用 Standard `internal`、`pipeline` 或私有 compiler 路径，也不允许复制算法。

Standard 因此提供无副作用的 `@retikz/standard/layout` 公共子入口，只暴露上层 Tier 2 组合当前需要且具有稳定通用语义的原子能力：

| 能力                                                        | 输入                                                                                                          | 输出与不变量                                                                                                                                 | 失败语义                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `compileFlexLayout`                                         | 已由 `FlexLayoutSchema` 解析的 `IRFlexLayout` 与当前 `LayoutCompositeCompileContext`                          | `LayoutCompositeCompileResult<FlexLayoutArtifact>`；复用 canonical minimum / natural / exact probe、placement、replay、clip 与 artifact 主链 | child probe、fill 无有限父 allocation、非法求解或 replay 失败沿现有 layout-aware context fail-loud，不降级 |
| `normalizeLayoutSpacing`、`contentRectOf`                   | Core spacing 或 container-local allocation / insets                                                           | canonical 四边 spacing 与非负 content rect；padding 超过 allocation 时 content size clamp 为零                                               | 非有限或不满足 Core spacing 契约的输入 fail-loud                                                           |
| `resolveLayoutAxisSize`                                     | 轴、Standard size policy、Core axis proposal、minimum / natural contribution                                  | allocation size 与可选 finite available；继续遵守 content / fill / fixed、min / max 与 proposal 交集语义                                     | contribution 非有限 / 负值或 fill 缺少 finite parent allocation 时 fail-loud                               |
| `alignAllocationInSlot`、`layoutClipOf`                     | container-local slot / allocation / alignment，或非负 size                                                    | 对应轴的 translation；正面积 size 生成 rect clip，退化 size 生成 canonical zero-area path clip                                               | 非有限坐标或负尺寸 fail-loud                                                                               |
| `createLayoutArtifactItem`                                  | authored key / source index、margin、slot、child layout result、translation、container allocation 与 overflow | 把 child-local bounds 变换到 container-local 坐标，统一计算 margin、allocation / visual overflow、clip 与 nullable visible bounds            | 非法 rect / translation 或不一致 child result 不做修复，沿几何合同 fail-loud                               |
| `createLayoutArtifactContainer`、`unionLayoutArtifactRects` | 同一 container-local 坐标系的 item / rect 集合                                                                | 汇总 allocation / content / visual / nullable visible bounds；空 rect 集合返回 canonical zero rect                                           | 不接受跨坐标系或非有限 rect；输入违反几何合同时 fail-loud                                                  |

这些函数及其输入 / 结果类型构成一个版本化公共 surface，但不暴露 distribution engine、Flex line 中间状态、Grid / Overlay 私有 pipeline 或可变 registry。它们继续调用同一 Standard 实现，不建立第二套 solver、schema、Definition 或 artifact 语义。

直接调用 `compileFlexLayout` 是一个 composite owner 在自己的 `compile` 内组合 Standard solver，不经过 composite registry，也不会隐式注册 `FlexLayoutDefinition`；因此 Notation 的 `LogicFrameDefinition` 只需注册自身。若作者把独立 `IRFlexLayout` 作为 scene child，宿主仍须按现有 Standard 契约显式注入 `FlexLayoutDefinition`。两种入口共享相同 compiler 与失败语义，子节点所需的其它 Definition 也始终由宿主显式提供。

## 行为、失败语义与兼容性

- 默认行为：迁移后的七个元素生成与当前 Standard 契约等价的 Core IR、Scene 与适用 artifact；唯一有意差异是 package owner 和 canonical namespace
- 失败与诊断：schema、缺失 Definition、target、child layout、duplicate provider 与 adapter authoring 继续保持当前 fail-loud / warning 语义；错误文案中的 Standard owner 改为 Notation
- 兼容性：这是 `0.x` breaking move。旧 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla` 导入直接失效，不提供 deprecated alias、转发包或双注册
- React / Vanilla 等价性：三种 authoring 面构造同一 canonical Notation / Core IR，并进入同一 Definition 与 lowering；adapter 不复制 schema、默认值或布局
- namespace：`standard.logicFrame` 等 owner namespace 改为 `notation.logicFrame` 等 Notation namespace；不接受旧 namespace 输入

## Standard ADR supersede 映射

迁移完成并通过测试与文档闭环后：

- Standard alpha.3 ADR-01（Logic Diagram Profile）、ADR-02（LogicFrame）、ADR-03（语义 Node）、ADR-04（Connector / Callout）与 ADR-05（跨 adapter authoring / recipe）标记为由本 ADR Superseded；长期行为保留在 Notation owner，不表示删除这些能力
- Standard alpha.3 ADR-06（直接 Definition loading）继续保持 Accepted，因为它仍约束 Grid、Axes、Frame、布局、Legend 等 Standard 能力；本 ADR只复用同一原则，不 supersede 它
- Standard alpha.3 roadmap 保留为已完成的历史 milestone，并明确其图式契约已由 Notation alpha.1 取代；Standard v0 / v0.1 roadmap 删除继续拥有图式元素的长期表述
- `@retikz/standard/layout`、FlexLayout、artifact 与公共 composition contract 始终由 Standard 维护，不迁入 Notation，也不随 Standard alpha.3 ADR 一并 supersede

## 功能与包边界

- 所属能力域与解决的问题：Diagram Notation Complete，提供可独立绘制并可由未来 Graph 复用的图式元素
- 主责包与协作包：Notation 三包主责图式语义；Standard 主责通用布局 composition；Core 主责 Node / Path / target / Scene；docs 提供发现与示例
- 拥有：七个元素的 schema / factory / Definition / adapter / artifact、Notation namespace 与图式职责 describe
- 不拥有：GraphModel、全局拓扑、自动布局 / routing、Editor 状态、UML / 状态执行模型、renderer、Standard layout solver
- 外部扩展与下游闭环：开放 role / appearance 继续沿当前输入；未来 Graph 通过 Notation 公共入口选择元素，不依赖其私有文件
- 不支持边界：本轮不增加新的图式元素、字段、registry 类别或自动行为

## 架构验证

- 是否可由现有能力组合：七个元素的语义与行为已由 Standard alpha.3 验证；需要新增的只有正确 package owner、release topology 与 Standard 公共 composition boundary
- 能力责任切分：Notation 保存图式语义；Standard 保存领域无关布局；Core 保存图元、几何、target 和 Scene；renderer 无专用分支
- 是否需要新 IR / contract / registry：不新增能力轴或 registry；迁移既有 schema，新增 Standard layout 公共组合入口和 Notation package namespace
- pipeline / lowering / renderer / diagnostics：复用当前 Definition / layout-aware lowering / Core compile 主链，迁移后从 Notation owner 注入；SVG / Canvas 消费同一 Scene
- provenance / locator：保持 authored id、LogicFrame / Callout artifact 与 Connector Scene identity；不新增 Graph provenance
- 结论：把既有图式元素上移到 Diagram owner，同时把复用的布局原子契约留在 Standard

## 实施结果

- Notation 三包已形成独立 lockstep package family 与 release group，七个图式元素只从 Notation owner 导出
- LogicFrame 直接组合 Standard 的 canonical Flex compiler；Callout 复用同一公共布局原子，Standard 继续唯一拥有通用布局求解与 artifact 语义
- canonical namespace 已切换为 `notation`，Standard 不保留旧导出、别名或 namespace 兼容；直接 IR、React 与 Vanilla 进入同一 Core compile 主链
- Diagram 文档、Schema 发现与 SVG / Canvas 预览已迁入 Notation。structured section target 仍按既有契约 fail-loud，Graph、UML 与自动布局继续留给后续独立设计

## 被否决方案

- 继续放在 Standard：图式角色不满足跨领域 Drawing Complete 准入，未来 UML / State 会持续扩大错误 owner
- 建立 `@retikz/logic`：名称把统一入口限制为当前流程式组件，不能覆盖完整 Diagram notation
- 建立 `@retikz/diagram` 聚合包：目录分组不需要无独立问题边界的发布包，也会模糊未来 Graph / Flow 的版本依赖
- Standard 保留 re-export：形成双 owner、双文档入口和长期兼容负担
- Notation deep import 或复制 Standard layout：跨包私有依赖不可发布，复制 solver 会破坏同一布局真源
- 本轮同时实现 Graph / UML Class / State：超出 package foundation 与迁移目标，且相关长期契约尚未验证

## 测试策略摘要

需要 package exports 与 release metadata 证据锁定三包边界；schema / factory 证据锁定 Core Sugar 与 Tier 2 canonical IR；compile / artifact 证据锁定 Standard public layout composition、target、identity 和 failure parity；React / Vanilla 证据锁定 adapter 等价；迁移负证据锁定 Standard 不再导出七个元素；renderer 与 docs 证据锁定同一 Scene 的 SVG / Canvas 行为和双语 import / navigation 一致。

## 不在本 ADR 范围

- GraphModel、GraphGeometry、Flow、自动布局与全局 routing
- Graph editor adapter、selection、viewport、history 与交互工具
- UML Class、State、actor、lifeline 等新元素及完整 UML / 状态模型
- 七个既有元素的重命名、字段扩张或默认视觉重设计
- push、tag、publish 与 release 执行
