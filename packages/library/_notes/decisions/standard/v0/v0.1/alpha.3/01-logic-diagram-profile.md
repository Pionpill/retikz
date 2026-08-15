# ADR-01：Standard Logic Diagram Profile

- 状态：Superseded（由 [Graph alpha.1 ADR-01](../../../../../../../diagram/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 取代；2026-08-15）
- 决策日期：2026-08-01
- 关联：[alpha.3 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Standard Drawing Library](../../../../../architecture/standard-library-design.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [能力完备性总纲](../../../../../../../../notes/architecture/capability-design.md)
- 后继：[Graph alpha.1 ADR-01](../../../../../../../diagram/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 已把本 ADR 的图式语义迁入 Diagram owner；本页保留为历史设计记录

## 背景与目标

retikz 的文档、架构说明和流程示例反复需要开始 / 结束、处理步骤、条件判断、分叉 / 汇合、带结构化内容的说明块以及它们之间的连接。如果只保存 Node shape、颜色和绝对坐标，持久化文档、工具与 LLM 无法区分“菱形图形”和“条件判断”，也无法在替换视觉样式后保留逻辑角色。

另一方面，完整 GraphModel、端口、拓扑、自动布局和编辑器状态属于 Diagram / Workspace 能力域。Standard 只能拥有移除具体业务与图模型词汇后仍成立、可独立绘制的局部语义组件。

本 ADR 冻结 alpha.3 的共同 profile：identity、target、开放 role、外观覆盖、定位产物和能力边界。具体 Block、基础逻辑节点、Connector 与 Callout 由后续 ADR 冻结。

## 决策：Standard 拥有局部语义组件，不拥有逻辑图模型

Standard alpha.3 提供一组 JSON-safe Tier 2 composite。每个组件以自身 discriminator 保存逻辑角色，并按需通过 Core `CompositeDefinition` 的 expand 或 layout-aware compile 分支，以及既有 Path 与 Scope 下沉到 Core IR。

理由：

1. 同一语义会在流程图、架构图、实现说明和文档图中重复消费，去除具体领域词汇后仍然成立
2. shape 与 paint 是可替换呈现，不能承担持久化语义真源
3. 局部组件可以脱离 Graph / Flow 独立绘制；全局关系、算法与交互不应反向进入 Standard

## 基础数据结构与公开契约

所有公开逻辑组件都使用非空稳定 `id`。普通 GraphNode 沿用 Core 已解析对象 target；`GraphFrame` 额外允许引用一个 authored section：

```ts
type LogicDiagramTarget =
  | {
      id: string;
      anchor?: AnchorRef;
      offset?: Position;
    }
  | {
      kind: 'graphFrame';
      id: string;
      section?: string;
      anchor?: AnchorRef;
      offset?: Position;
    };

type LogicDiagramPoint = Position | LogicDiagramTarget;
```

`kind: 'logicFrame'` 表示调用方引用公开 Block identity，而不是内部 Scope id。省略 `section` 时引用整体 Block；提供时声明该 Block 中具有相同 key 的 section。当前 Core 只有扁平 string target，因此 alpha.3 先闭环整体 Block target；带 `section` 的 target 保留为稳定输入但在 Connector / Callout lowering 时 fail-loud，直到 Core 提供 composite-owned structured subtarget 后再沿同一公开输入接通。offset 只在 anchor 解析后应用，不改变 artifact bounds。

`LogicDiagramPoint` 用于 Connector endpoint 与显式折点；直接 Position 不产生组件 identity，也不能作为 Callout boundary target。

`LogicDiagramTarget` 只统一公开寻址形态，不统一所有消费者的解析时序与失败等级。Connector endpoint / waypoint 作为 Core Path target 延迟解析；Callout target 作为布局 placement target 即时解析。两类消费者不得为了共享类型而改写各自主链的 namespace 生命周期。

除 `Terminal.role` 明确闭合为 `start | end` 外，角色与分类使用非空开放字符串。内置常量只提供常见拼写和 authoring 便利；未知值合法并保持原样，在组件提供 typed artifact 时也原样保留，但不触发隐藏 provider lookup、布局、样式或验证分支。

需要公开布局区域的 `GraphFrame`、基础 GraphNode 与 `Callout` 输出 typed artifact，并共享以下不变量：

- artifact 带组件 kind、稳定 id、allocation / visual / visible bounds
- 可寻址子区域保留 authored key / role 与 bounds
- artifact 不保存业务 payload、执行状态、Graph edge collection、selection 或 renderer 对象
- target identity 来自 authored Standard IR，不从 Scene primitive 顺序或视觉 shape 反推

这些 artifact 复用以下完整公共几何词汇：

```ts
type LogicLayoutItemArtifact = Omit<LayoutArtifactItemBase, 'key' | 'sourceIndex'>;

type LogicOuterArtifact = {
  allocationBounds: LayoutArtifactRect;
  shellVisualBounds: LayoutArtifactRect | null;
  visualBounds: LayoutArtifactRect;
  visibleBounds: LayoutArtifactRect | null;
};
```

`LogicLayoutItemArtifact` 只保存单一 region / content 的 placement，不伪造不存在的 item key 或 source index。`LogicOuterArtifact.allocationBounds` 必须等于同一 artifact 的 `container.allocationBounds`；`shellVisualBounds` 只包含 outer shape 的 fill、outline 与 shadow，完全透明且无可见 outline / shadow 时为 null。`visualBounds` 是 shell、content item visual 与该组件 decoration 的 union，无正面积时使用 canonical `(0, 0, 0, 0)`；`visibleBounds` 是 shell、content item visible 与不受 content overflow 裁剪的 decoration 的 union，全部无正面积时为 null。`container` 始终保留 alpha.2 原义：其 visual / visible 只来自 authored content items，不包含 outer shell、divider 或 leader。

`Connector` 例外地使用轻量、无布局的 expand 分支直接 lower 为同 id 的 Core Path，不声明重复的 Connector typed artifact，也不承诺 Core 当前没有公开的 Path occurrence artifact。它的路径几何与可见范围由 Core Path 主链拥有；Standard canonical Connector IR 继续是 role、routing 与 endpoint 的语义真源。Core 按现有 Scene contract 把 id stamp 到代表整条 Path 的最外层主体 primitive 或 transform group；label、mark 与其它附属 primitive 不建立第二个 Connector identity。领域 provenance 在 lowering 前通过 authored Connector id join，不从 Scene 反推 Standard 关系语义。

## 行为、失败语义与兼容性

- 默认行为：每项能力有中性可用的默认 appearance，但显式 appearance 可以替换 shape、paint、spacing 与线型；替换不改变 discriminator、id、target 或 artifact 语义
- 失败与诊断：空白 id / role、非法数值和变体不匹配在 schema 阶段拒绝；缺失 definition 与 child layout failure 在 compile 阶段 fail-loud。Connector unresolved whole-target id 沿用 Core Path warning + skip 合同，其余 anchor / geometry 失败也不改写 Core Path；当前 Core 下任何带 `section` 的 Connector / Callout target 都以明确的 unsupported diagnostic fail-loud。Callout 缺失或 forward whole-target id / anchor 同样 fail-loud
- 兼容性：alpha.3 是新增 Standard `0.x` 能力，不改变未加载 capability 时的 Core compile 与 renderer 行为
- React / Vanilla 等价性：两套 adapter 只归一 author input，并必须产生与直接 factory 相同的 canonical Standard IR

全局 duplicate id 与 namespace shadowing 继续使用 Core 当前合同。Connector 的整体 target 在所在 namespace 的注册阶段闭合后随 pending Path 解析，因此可以引用同一可见 namespace 中位于 Connector 前后的普通单元或整体 Block；解析阶段仍不可见的 id 沿用 Core Path unresolved-target 诊断并跳过整条 Path，其余 anchor / geometry 失败也沿用 Core Path。Callout 通过 Core authored Scope placement 只读取此前已解析的整体 target；forward、缺失 id / anchor 均 fail-loud。带 `section` 的 target 在结构化 Core subtarget 出现前明确拒绝，Standard 不建立第二个全局索引、不派生扁平 section id，也不把 warning、skip 或失败静默改写为 last-resort placeholder。

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete 的可选语义绘图组件，使局部逻辑角色在持久化、diff、工具与 LLM 编辑后仍可识别
- 主责包与协作包：`@retikz/standard` 拥有 schema、definition、lowering、适用组件的 artifact 与 capability；React / Vanilla 只负责 authoring；Core 提供执行合同
- 拥有：局部逻辑角色、Block / section target、外观覆盖、适用布局组件的 typed artifact 与明确诊断
- 不拥有：GraphModel、全局 nodes / edges、Port / Group、拓扑、算法布局、自动路由、业务执行和编辑器状态
- 外部扩展与下游闭环：调用方通过任意 `IRChild`、开放 role、appearance 与 Core provider 扩展内容和视觉；不新增 LogicDiagram definition family
- 不支持边界：需要全局关系真源、自动布局或交互编辑时，上移到未来 Graph / Flow / Workspace，不在 Standard 局部补丁

## 架构验证

- 是否可由现有能力组合：Core 已能表达图形、Path、整体 target 与 authored Scope placement，但缺少持久化逻辑 discriminator 与 collision-safe Block section target；alpha.3 先组合现有能力闭环整体 target，并把 section target 保留为显式 deferred 分支。Path 几何与 Scene identity 继续由 Core 自身承载
- 责任切分：Standard 保存高层语义并下沉；Core 解析 child、target、Path、Scope 与 Scene；renderer 只绘制 Scene；adapter 不解释语义
- 是否需要新 IR / contract / registry：新增 Standard composite IR；每项继续使用 Core CompositeDefinition registry。组件集合和 route vocabulary 是闭合能力，内容与 role 已通过开放字段扩展，因此不增加新 registry
- pipeline / lowering / renderer / diagnostics 如何闭环：Standard schema → CompositeDefinition expand 或 layout-aware compile → Core IR 与适用的 typed artifact → Scene → SVG / Canvas；失败沿 Core layout / namespace 诊断提升
- provenance / locator 是否适用：布局组件 artifact 的 id / section key 支撑 headless 定位；Connector 只保留同 id Scene 主体挂点，不提供 compile artifact locator。领域 provenance 由消费方在 lowering 前与 authored id join，不写入 Standard
- 结论：逻辑语义扩展当前 Standard Drawing Complete 能力，不上移为 Graph；通用 structured subtarget 缺口留在 Core，未闭环前由 Standard 明确拒绝 section target

## 被否决方案

- 只提供 diamond、capsule、bar 等 shape：视觉变化会丢失逻辑角色，工具仍需反推语义
- 新建 `LogicNodeDefinition` / role registry：role 不改变执行算法，任意内容与 appearance 已覆盖扩展需求
- 在 Standard 保存完整 nodes / edges：会复制未来 GraphModel，并引入拓扑与全局 identity owner
- 让 renderer 识别逻辑组件：破坏 renderer-agnostic Scene 主链
- 用 ReactNode 或 callback 自定义内容：无法 JSON round-trip，也会让 Vanilla 与直接 IR 失去等价性

## 测试策略摘要

需要 schema 证据锁定 discriminator、identity、开放 role、闭合 Terminal role 与 target union；compile 证据分别锁定 Connector pending Path 的 forward / unresolved 行为、Callout previous-only placement、布局组件 artifact identity 与 Connector lowered Scene 主体 identity；appearance 证据证明替换 shape 后语义不变；capability 与 adapter 证据证明未加载时 fail-loud、加载后直接 IR / React / Vanilla 等价；renderer 只验证同一 Scene parity。

## 不在本 ADR 范围

- 各组件的具体字段、默认形状、布局算法和 route 参数
- Graph / Flow / Workspace 包、公共 API 或 release group
- UML、BPMN、schema validator、workflow engine 或业务 adapter
- 自动布局、自动避障、交互连线和拓扑分析
