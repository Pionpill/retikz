# ADR-01：撤回缺少用例验证的 Callout 公共契约

- 状态：Accepted
- 决策日期：2026-08-10
- 关联：[alpha.3 roadmap](./roadmap.md) · [Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [Diagram 制图能力域设计](../../../../../../../../notes/architecture/diagram-design.md) · [alpha.1 ADR-01](../alpha.1/01-notation-package-family.md) · [alpha.2 ADR-01](../alpha.2/01-semantic-ir-lightweight-lowering.md)

## 背景与目标

Notation 只应冻结已经有明确图式职责、真实使用路径和稳定跨入口语义的元素。Callout 从 Standard 迁入 Notation 时沿用了既有实现，但当前没有已验证场景能够回答它究竟是独立说明节点、目标附属 label、任意内容容器、带 leader 的局部关系，还是未来 Graph annotation 的呈现形式。

现有契约同时冻结 target、side / gap / offset、任意 Core child 内容、内容外壳、可选 leader、layout artifact 与 previous-only 放置。它因此需要 layout-aware compile，并组合 Core Node、Path 与 Standard layout；但这些复杂度来自预设方案，而不是已确认的领域不变量。继续保留或轻量改写都会让现有 API 反向限制未来真实需求。

本 ADR 的目标是完整撤回 Callout 公共能力，让 Notation 当前能力集只包含已有明确职责的元素。未来若出现稳定标注场景，必须重新从用户问题、语义身份、lower target 与 Graph 边界设计，不继承本轮删除的字段形态。

## 决策

### Callout 不再属于当前 Notation 元素集合

Notation 的稳定元素判别集合只覆盖 LogicFrame、Terminal、Stage、Decision、Junction 与 Connector，不再包含 `callout`。Callout 不再拥有 canonical semantic IR、schema、factory、Definition、typed artifact 或包级公开导出。

直接 JSON、TypeScript、React 与 Vanilla 同步移除 Callout authoring 入口和运行时注册。文档站不再提供 Callout 组件页、schema 发现、demo、导航或当前能力说明，避免代码已删除但作者入口仍暗示受支持。

### 删除完整契约，不保留轻量替身

本轮不把 Callout 改写成一对一 Core Node，也不保留 `target`、`placement`、`leader`、`content`、`appearance` 或 artifact 的任何子集。Core Node 的 anchor-to-anchor position、Node label、Path target 与 Connector 仍可独立使用，但它们不自动组合成名为 Callout 的 Notation 语义。

删除后的空位不是 deferred implementation。它表示当前没有足够信息建立该能力；未来需求必须通过新的 ADR 决定是否属于 Notation、Graph、Core Sugar、普通 recipe 或其它 owner。

### 不改写历史事实

本 ADR supersede alpha.1 ADR-01 中 Callout 迁入 Notation、作为 layout-aware composite、保持 artifact 与 adapter 闭环的决策，也 supersede alpha.2 ADR-01 中 Callout 继续保留在稳定判别集合且公开契约不受影响的部分。

已被 Notation supersede 的 Standard milestone 与历史 changelog 继续记录当时存在过 Connector / Callout 设计，不被改写成从未发生。当前架构、roadmap、包职责与用户文档则必须以本 ADR 为准，不再把 Callout 描述为现有能力。

## 基础数据结构与公开契约

完成后，Notation 顶层稳定元素判别集合概念上为：

```ts
type NotationElementTypeValue = 'logicFrame' | 'terminal' | 'stage' | 'decision' | 'junction' | 'connector';
```

以下 Callout 公共契约整体删除，不提供替代名称或兼容入口：

- `CalloutSchema`、`CalloutSideSchema`、`CalloutPlacementSchema`、`CalloutArtifactSchema`、`LogicDiagramTargetSchema`、`ConnectorAppearanceSchema` 及其派生类型
- `IRCallout`、`CalloutInput`、Callout target / placement / appearance / artifact 类型
- `createCallout`、`CalloutDefinition` 与 Callout compile artifact
- React `Callout`
- Vanilla `callout` 与 `CalloutVanillaAdapter`
- `CalloutSide`、Callout schema registry 项与 `notation.callout` adapter namespace

LogicFrame 与共享布局 artifact 仍按自己的现有契约存在；只被 Callout 消费的契约随 Callout 删除。其它稳定元素的 schema、factory、Definition、adapter 与 public identity 不改变。

## 行为、失败语义与兼容性

- public imports：从三个 Notation 包导入任何 Callout 标识符都会在 TypeScript / ESM 导出层失败，不提供 deprecated export
- canonical JSON：`namespace: 'notation'`、`type: 'callout'` 不再是 Notation schema 或内置 composite definition 支持的输入
- runtime：未由用户自行提供其它 namespace / definition 的 `notation:callout` 输入沿 Core 未注册 composite 路径 fail-loud，不提供隐式 Node fallback
- authoring parity：React 与 Vanilla 同步删除，不允许某一 adapter 保留私有 Callout 入口
- docs：现有 Callout 路由、schema reference 与 demo 不再可发现；其它 Notation 页面不链接或推荐该能力
- compatibility：这是 `0.x` breaking removal。不存在 alias、migration、fallback、自动转换为 Node / label 或新旧双轨
- existing capabilities：LogicFrame、四个基础单元、Connector、Core Node relative position、Node label 与 Path target 行为不变

## 功能与包边界

- 所属能力域与能力面：Diagram Notation Complete；元素准入、semantic identity、authoring parity、diagnostics 与 docs discoverability
- 解决的问题：避免在缺少真实场景时把一个猜测性的标注模型固化成 Notation 长期契约
- 主责包与协作包：Notation 主责决定哪些图式元素具备稳定语义；Core / Standard 继续拥有通用 Node、Path、target 与 layout，不因 Callout 删除而缩减
- 内部表达链路：本轮删除 Callout 链路，不建立替代 schema、Definition、registry 或 lowering
- 外部扩展链路：Callout 是被撤回的闭合内置元素，因此 define-registry 不适用；第三方仍可在自己的 namespace 定义 composite，不获得或依赖 Notation Callout 约定
- 下游执行：renderer 仍只消费 Core Scene；React / Vanilla / docs 同步移除对应入口，不留下仅在单一宿主成立的残余能力
- 不支持边界：Notation 当前不拥有通用 annotation、leader routing、目标附属内容、自动避障、全局注释管理或 Graph annotation model
- 本轮结论：明确不支持并撤回当前契约；未来需求重新进入 Alpha 设计，而不是把现有实现标记为 deferred

## 架构验证

- 问题归属：撤回动作发生在拥有 Callout semantic identity 的 Notation，不修改 Core / Standard 的通用绘图能力，也不把 Graph 语义下沉
- 内部表达：现有 Callout 虽能产生 Scene，但其 schema 与 layout-aware pipeline 建立在未验证字段组合上；视觉可运行不能证明领域契约成立
- 外部扩展：删除闭合内置元素后不存在需要保留的 Callout registry；第三方 composite 继续走 Core 自有 contract，不与本 ADR 建立双轨
- define-registry：本 ADR不新增或保留开放标注能力，因此无需 Definition / provider / registry；若未来建立开放 annotation capability，必须在新的 owner 决策中重新检查
- 端到端闭环：semantic IR、Definition、React、Vanilla、tests、docs 与当前架构同步删除，防止只删实现却残留可发现 API
- 边界与阶段：这是 alpha `0.x` 的公开能力收敛，可以直接 breaking removal；未来需求必须重新证明语义身份与完整链路
- 长期结论：Notation 元素准入由真实问题和稳定不变量决定，不因已有代码、迁移历史或可能复用而保留尚未成立的能力

## 被否决方案

- 把 Callout 轻量下沉为 Core Node：仍需猜测文本、任意 child、target、placement 与 identity 的关系，只是减少实现代码，没有解决语义不确定性
- 保留 Node + 可选 Path leader：继续冻结 leader 是否属于 Callout、端点如何连接与多元素 identity，缺少场景依据
- 保留现有 layout-aware composite：以实现已经存在代替能力准入，持续维护无明确消费者的 shell、artifact 与 adapter 闭环
- 仅隐藏文档但保留代码：形成不可发现却仍需维护的公共 schema 与导出，不能真正收紧契约
- 标记 deprecated 或保留别名：`0.x` 阶段没有兼容要求，残余入口会让未来设计被旧字段绑架
- 立即设计 Graph annotation：当前没有 GraphModel、全局注释管理或编辑场景输入，不应为删除局部元素而提前扩张上层能力

## 测试策略摘要

需要公共导出与类型证据确认三个 Notation 包不再暴露 Callout；schema 与 composite 证据确认稳定判别集合、内置 Definition 与 adapter namespace 已移除；负向编译证据确认旧 `notation:callout` 不会静默转换为 Node；回归证据确认 LogicFrame、基础单元与 Connector 的 canonical IR、lowering 和 renderer 输出不受影响；docs 证据确认路由、导航、schema registry、preview 转换与双语页面不再发现 Callout，同时不存在失效的当前站内链接。

## 不在本 ADR 范围

- 新 annotation、note、label、badge、leader 或 target-attached content 语法
- GraphModel、Graph annotation collection、端口、自动布局、routing、避障或 Editor 状态
- Core Node relative position、Node label、Path target、Scope placement 或 Standard OverlayLayout 的行为变化
- LogicFrame、Terminal、Stage、Decision、Junction 与 Connector 的公开字段、默认值或 lowering
- 重写已 supersede 的 Standard ADR、历史 changelog 或已发布版本事实
- 具体文件清单、私有 helper、测试 case、验证命令、commit、push、tag 与 publish
