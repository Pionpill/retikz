# ADR-05：Logic Diagram 跨 adapter authoring 与内部 recipe

- 状态：Accepted（2026-08-08，人工确认）
- 决策日期：2026-08-01
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-logic-diagram-profile.md) · [ADR-02](./02-headless-logic-block-base.md) · [ADR-03](./03-semantic-logic-units.md) · [ADR-04](./04-connector-and-callout.md) · [ADR-06](./06-direct-definition-loading.md)

## 背景与目标

alpha.3 新增七项公开 composite。如果它们只能通过 React 私有 adapter 或 docs helper 使用，就会破坏直接 IR、React 与 Vanilla 的等价性。LogicBlockBase 的 headless 目标还要求文档展示真实组合方式，但 Process、Class、Data 等示例不能沉淀成未设计的公共 API

本 ADR 冻结每项 definition、canonical factory 与 adapter authoring 边界，并规定 retikz 内部 recipe 的非公开地位

## 决策：每项能力直接注入，recipe 只做非公开组合

以下能力各自提供同名 CompositeDefinition：

```ts
LogicBlockBaseDefinition;
TerminalDefinition;
StageDefinition;
DecisionDefinition;
JunctionDefinition;
ConnectorDefinition;
CalloutDefinition;
```

直接 IR 根据实际使用项把所需 definitions 传给 Core `CompileOptions.composites`。这些 definitions 不创建新的 registry，不依赖 import side effect，也不自动收集其它逻辑能力

每项 factory 接受允许省略固定 discriminator 与默认字段的 `XxxInput`，统一经过权威 strict schema，返回带 `namespace: 'standard'`、固定 `type` 与完整默认值的 canonical `IRXxx`。持久化、diff、compile 与 adapter parity 只比较 canonical IR

## React authoring

基础逻辑单元以 React children 表达单一 content，Connector 以 plain prop 接收 Core `IRGeometryLabelInput`，Callout 以 children 表达 content。adapter 只把合法 React content 归一为 JSON-safe `IRChild`，不把 ReactNode 写入 Standard IR，也不为 Connector 建立 label marker 或复合 child 通道

`LogicBlockBase` 提供只用于 authoring 的 marker：

```tsx
<LogicBlockBase id="validate-payload">
  <LogicBlockHeader>{headerChild}</LogicBlockHeader>
  <LogicBlockSection sectionKey="input" role="input">
    {inputChild}
  </LogicBlockSection>
  <LogicBlockSection sectionKey="logic" role="code">
    {codeChild}
  </LogicBlockSection>
</LogicBlockBase>
```

marker 只描述 header / section 边界与 authored order，不是独立 Standard composite，也不进入 Scene 或持久化 IR。重复 header、非 Section child、空 section key 与无法归一为单个 `IRChild` 的内容在 authoring 阶段 fail-loud

React 也可以直接传 plain canonical child input；无论采用 marker 还是 plain input，最终都必须调用同一 factory / schema

## Vanilla 与直接 IR authoring

Vanilla 为每项能力提供只构造 canonical IR 的 builder / factory，并把相同 definition 接入现有 embeddable adapter。它不复制 React marker、layout、route、target resolver 或 recipe

直接 IR authoring 显式使用 factory 或完整 canonical `IRXxx`，并把对应 definitions 作为 `CompileOptions.composites` 传给宿主。未传入 definition 时保持 Core 未注册 composite 的明确诊断

## 内部 recipe

retikz docs 可以内部实现：

- Process recipe：组合 header、input / configuration / logic / output sections
- Class recipe：组合 stereotype、attributes、operations sections
- Data recipe：组合 schema、context、payload、state 或 config sections

这些 recipe：

- 只使用公开 LogicBlockBase、Core / Standard children 与 React authoring marker
- 不从 `@retikz/standard`、`@retikz/standard-react` 或 `@retikz/standard-vanilla` 导出
- 不注册独立 composite type、schema registry entry 或 Standard preset
- 源码通过 docs preview 对读者可见，读者可以复制并自行拥有
- 可以随 docs 场景演进，不构成 package semver 契约

## 行为、失败语义与兼容性

- 默认行为：直接 compile 只注册调用方传入的 definitions；React / Vanilla 与直接 IR 共享同一 definition / schema / compile 路径
- 失败与诊断：真实 composite key 冲突、重复 React header / section key、非法 marker nesting、缺失 definition 与 schema error 保持明确诊断，不 silent skip
- 兼容性：新增 component definitions 与 authoring exports；三个 Standard 包仍保持 `sideEffects: false`，不保留未曾发布的 recipe alias
- React / Vanilla 等价性：相同 plain input 产生同一 canonical IR 与 Core Scene；适用的布局组件还产生同一 typed artifact，Connector 则产生同 id 的 lowered Core Path Scene 主体。React marker 只是 canonical input 的 authoring sugar

## 功能与包边界

- 所属能力域与解决的问题：Standard direct definition loading 与跨宿主 authoring 闭环
- 主责包与协作包：standard 拥有 schema / factory / definition；standard-react 与 standard-vanilla 只适配 authoring；docs 拥有内部 recipe
- 拥有：稳定 package exports、canonical input、显式 definition 注入和 adapter parity
- 不拥有：docs recipe schema、业务 category、React runtime template、隐式 registry 或宿主全局配置
- 外部扩展与下游闭环：自定义内容通过 IRChild / React children / Vanilla plain child；自定义 appearance 使用既有 Core / Standard 契约
- 不支持边界：需要发布稳定业务 Block 时由真实领域包设计自己的 Tier 2 schema，再组合 LogicBlockBase；不把 docs recipe 上移

## 架构验证

- 是否可由现有能力组合：复用 Core CompositeDefinition / CompileOptions.composites 与现有 adapter protocol，只新增能力实例与必要 marker
- 责任切分：standard 生成 canonical IR；adapter 只归一宿主输入；Core compile 消费 definitions；docs recipe 不参与 package runtime
- 是否需要新 IR / contract / registry：ADR-02～04 已定义 composite IR；本 ADR 不新增 provider registry，只增加 definition 与 authoring sugar
- pipeline / lowering / renderer / diagnostics 如何闭环：authoring → canonical factory → Core compile（direct definitions）→ Scene、适用的 typed artifact 与 Connector lowered Scene 主体 id；renderer 无 Logic Diagram 入口
- provenance / locator 是否适用：adapter 保留 authored id 与 section key；布局组件使用 typed artifact，Connector 不提供 compile artifact locator。docs recipe 不增加隐藏 locator layer
- 结论：直接复用 Core definition / compile 机制，不新增 Standard 组合基础设施

## 被否决方案

- 只加入全量组合入口：破坏按实际 definition 选择的按需使用目标
- 导出 ProcessBlock / ClassBlock / DataBlock：把 docs 示例升级为未经验证的长期 API
- 为 React recipe 建 runtime render callback：无法与 direct IR / Vanilla 等价
- adapter 自行补默认值或 route：canonical IR 会因宿主而漂移
- marker 成为持久化 composite：会把 authoring 结构泄漏到 IR 与 Scene
- 自动全局注册：破坏 Standard 显式 definition 注入与 `sideEffects: false`

## 测试策略摘要

需要 factory / schema 证据证明 canonical defaults 与 strict parsing；direct-definition 证据证明按项注入、composite key 冲突与缺失 definition；React 证据覆盖 marker order、header / section 约束、arbitrary content child 与 Connector plain label；Vanilla / direct IR 证据覆盖 canonical Scene、适用 artifact 与 lowered Scene 主体 identity parity；package 证据证明 side-effect 与 export 边界；docs 证据证明三个内部 recipe 可复制且未进入任何 package public surface

## 不在本 ADR 范围

- implementation plan、具体文件布局、实施细节与文档信息架构
- 发布 Process、Class、Data、UML、Schema、Context 或 workflow adapter
- runtime plugin、dynamic recipe loader、Block registry 或 user component marketplace
- editor palette、drag/drop authoring、selection 与 live preview state
