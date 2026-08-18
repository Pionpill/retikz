# ADR-04：撤回缺少用例验证的 Callout 公共契约

- 状态：Accepted
- 决策日期：2026-08-10
- 关联：[alpha.1 ADR-01](./01-graph-package-family.md) · [alpha.1 ADR-03](./03-semantic-ir-lightweight-lowering.md)

## 背景与目标

Graph 只应冻结已经有明确图式职责、真实使用路径和稳定跨入口语义的元素。Callout 从 Standard 迁入 Graph 时沿用了既有实现，但当前没有已验证场景能够回答它究竟是独立说明节点、目标附属 label、任意内容容器、带 leader 的局部关系，还是未来 Graph annotation model 的呈现形式。

现有契约同时冻结 target、side / gap / offset、任意 Core child 内容、内容外壳、可选 leader、layout artifact 与 previous-only 放置。它因此需要 layout-aware compile，并组合 Core Node、Path 与 Standard layout；但这些复杂度来自预设方案，而不是已确认的领域不变量。继续保留或轻量改写都会让现有 API 反向限制未来真实需求。

本 ADR 的目标是完整撤回 Callout 公共能力，让 Graph 当前能力集只包含已有明确职责的元素。未来若出现稳定标注场景，必须重新从用户问题、语义身份、lower target 与 Graph 边界设计，不继承本轮删除的字段形态。

## 决策

### Callout 不再属于当前 Graph 元素集合

Graph 的稳定元素判别集合只覆盖 GraphFrame、GraphNode 与 GraphConnector，不再包含 `callout`。Callout 不再拥有 canonical semantic IR、schema、factory、Definition、typed artifact 或包级公开导出。

直接 JSON、TypeScript、React 与 Vanilla 同步移除 Callout authoring 入口和运行时注册。文档站不再提供 Callout 组件页、schema 发现、demo、导航或当前能力说明，避免代码已删除但作者入口仍暗示受支持。

### 删除完整契约，不保留轻量替身

本轮不把 Callout 改写成一对一 Core Node，也不保留 `target`、`placement`、`leader`、`content`、`appearance` 或 artifact 的任何子集。Core Node 的 anchor-to-anchor position、Node label、Path target 与 GraphConnector 仍可独立使用，但它们不自动组合成名为 Callout 的 Graph 语义。

删除后的空位不是 deferred implementation。它表示当前没有足够信息建立该能力；未来需求必须通过新的 ADR 决定是否属于 Graph、Graph、Core Sugar、普通 recipe 或其它 owner。

### 不改写历史事实

本 ADR supersedes alpha.1 ADR-01 中 Callout 迁入 Graph、作为 layout-aware composite、保持 artifact 与 adapter 闭环的决策，也 supersedes alpha.1 ADR-03 中 Callout 继续保留在稳定判别集合且公开契约不受影响的部分。

已被 Graph supersede 的 Standard milestone 与历史 changelog 继续记录当时存在过 GraphConnector / Callout 设计，不被改写成从未发生。当前架构、roadmap、包职责与用户文档则必须以本 ADR 为准，不再把 Callout 描述为现有能力。

## 基础数据结构与公开契约

完成后，Graph 顶层稳定元素判别集合概念上为：

```ts
type GraphElementTypeValue = 'graphFrame' | 'graphNode' | 'graphConnector';
```

以下 Callout 公共契约整体删除，不提供替代名称或兼容入口：

- `CalloutSchema`、`CalloutSideSchema`、`CalloutPlacementSchema`、`CalloutArtifactSchema`、`LogicDiagramTargetSchema`、`GraphConnectorAppearanceSchema` 及其派生类型
- `IRCallout`、`CalloutInput`、Callout target / placement / appearance / artifact 类型
- `createCallout`、`CalloutDefinition` 与 Callout compile artifact
- React `Callout`
- Vanilla `callout` 与 `CalloutVanillaAdapter`
- `CalloutSide`、Callout schema registry 项与 `graph.callout` adapter namespace

GraphFrame 与共享布局 artifact 仍按自己的现有契约存在；只被 Callout 消费的契约随 Callout 删除。其它稳定元素的 schema、factory、Definition、adapter 与 public identity 不改变。

## 行为、失败语义与兼容性

- public imports：从三个 Graph 包导入任何 Callout 标识符都会在 TypeScript / ESM 导出层失败，不提供 deprecated export
- canonical JSON：`namespace: 'graph'`、`type: 'callout'` 不再是 Graph schema 或内置 composite definition 支持的输入
- runtime：未由用户自行提供其它 namespace / definition 的 `graph:callout` 输入沿 Core 未注册 composite 路径 fail-loud，不提供隐式 Node fallback
- authoring parity：React 与 Vanilla 同步删除，不允许某一 adapter 保留私有 Callout 入口
- docs：现有 Callout 路由、schema reference 与 demo 不再可发现；其它 Graph 页面不链接或推荐该能力
- compatibility：这是 `0.x` breaking removal。不存在 alias、migration、fallback、自动转换为 Node / label 或新旧双轨
- existing capabilities：GraphFrame、GraphNode、GraphConnector、Core Node relative position、Node label 与 Path target 行为不变

## 长期边界

Graph 当前不拥有通用 annotation、leader routing、目标附属内容、自动避障、全局注释管理或 annotation model。Core Node relative position、Node label、Path target、Scope placement、GraphFrame 与其它稳定 Graph 元素的行为不因本次删除改变；未来标注需求必须以新的语义身份和公开契约重新决策
