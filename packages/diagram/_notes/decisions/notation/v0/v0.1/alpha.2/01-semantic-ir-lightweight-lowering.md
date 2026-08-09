# ADR-01：保留 Notation 语义 IR 并轻量下沉到 Core

- 状态：Accepted
- 决策日期：2026-08-09
- 关联：[alpha.2 roadmap](./roadmap.md) · [Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [Diagram 制图能力域设计](../../../../../../../../notes/architecture/diagram-design.md) · [alpha.1 ADR-01](../alpha.1/01-notation-package-family.md)

## 背景与目标

Notation 的根问题是用稳定、JSON-safe、renderer-neutral 的元素表达可复用图式语义，使作者、工具、LLM 与未来 Graph presentation 不必从 shape、颜色或几何反推职责。alpha.1 已建立正确的 package owner，但把 Terminal、Stage、Decision 与 Junction 定义为直接输出 Core Node 的 Sugar；生成后只剩 `type: 'node'` 与固定 shape，不能可靠区分它们原本承担的 Notation 语义。

Connector 已保留 Notation composite 身份，但又维护一套与 Core Path Step 逐项对应的 `from/to/routing/appearance` 输入与 lowering。它最终只生成一条 Core Path，没有独立几何算法或 artifact；继续复制路由联合和 Path 外观投影会让 Core 新增 target、Step 或 Path 能力时产生静默收窄。

本 ADR 统一两者：正式 Notation 元素在 authored IR 中保留 `notation` namespace 与元素判别值；当前只需要一个 Core Node 或 Core Path 的元素使用轻量 expansion Definition，一对一下沉到 canonical Core IR。语义身份归 Notation，图形 surface、parser、几何、compile 与 Scene 行为归 Core。

## 决策

### 正式 Notation 元素保留语义身份

所有以独立 Notation 元素公开、需要被持久化、工具或未来 Graph presentation 识别的 canonical IR 都保留：

- `namespace: 'notation'`
- 稳定且元素专属的顶层 `type`
- authored `id`

公开元素判别集合使用统一的 `NotationElementType` const object，覆盖 `logicFrame`、`terminal`、`stage`、`decision`、`junction`、`connector` 与 `callout`。判别集合描述稳定的领域元素，不再以元素当前使用 Core Sugar、expansion composite 或 layout-aware composite 的实现机制分类；旧 `LogicCompositeType` 因此不再作为 canonical 公共词汇，也不提供别名。

“是否保留 Notation 语义身份”与“lower target 是否复杂”分开判断。语义身份决定 authored IR owner；lower target 复杂度只决定使用轻量 `expand` 还是 layout-aware `compile`。只有没有独立持久化语义的便捷写法才可以作为纯作者 Sugar 直接消失为 Core IR。

### 基础单元是一对一 Node lowering

Terminal、Stage、Decision 与 Junction 分别拥有 canonical Notation schema、IR 类型、factory 与 expansion Definition。它们复用 Core Node 的适用 authored surface，但不接受 Core `type` 或可替换 `shape`：

- Terminal lower 为胶囊形 rectangle Node
- Stage lower 为圆角 rectangle Node
- Decision lower 为 diamond Node
- Junction lower 为 circle Node

既有尺寸、padding、fill、stroke 与其它 Node 默认行为保持不变。用户显式提供的适用 Core Node 字段按原名、原约束和原优先级下沉；Definition 只替换 namespace / semantic type 并补入固定 shape，不重写 Core Node layout、shape、target、style、theme 或 Scene emit。

每个基础单元生成且只生成一个同 id Core Node，不创建 typed artifact、外层 Scope、布局 compiler 或专用 renderer 分支。缺少相应 Definition 时沿 Core composite registry 诊断 fail-loud。

### Connector canonical IR 复用 Core stroke Path

Connector 保留 `namespace: 'notation'`、`type: 'connector'`、authored `id` 与可选开放式 `role`。`role` 继续接受非空自定义字符串；`ConnectorRole` 只提供常用开放词汇，不把 schema 收窄为内置枚举。其余 canonical 绘制字段直接复用 Core stroke Path 的公开契约：

- `children` 使用 canonical Core Step 数组
- target、label、marks、stroke、fill、transform、metadata、animation 与 stacking 等适用字段沿用 Core 名称、约束、默认值和诊断
- Core `type` 由 Connector semantic type 取代
- Connector 固定 lower 为 stroke Path，不开放 `kind`、`kindOptions` 或 `ribbon`

省略 `marks` 时默认添加一个终点箭头；显式 `marks`（包括空数组）优先，不与默认值合并。Connector Definition 只移除 Notation 专属判别与 `role`，输出一个同 id Core Path；`role` 保留在 authored Notation IR，不隐式写入 Path `meta`、Scene primitive 或 artifact。

Connector 不再拥有 `from/to/routing/appearance` canonical 字段，也不维护直线、折线、正交、二次 / 三次曲线或 bend 的平行联合。对应表达直接使用 Core `move`、`line`、`fold`、`curve`、`cubic`、`bend` 等 Step。

### Path 与 Draw 是两个作者入口、一个 canonical IR

Connector 提供两种互斥的作者语法：

1. **Path 语法**：直接提供 canonical Core Step `children`
2. **Draw 语法**：提供 Core `WayDSL` 的 `way` shorthand

`way` 只存在于 TypeScript factory、React 与 Vanilla 作者输入。它通过 Core canonical `parseWay` 在入口一次性转换为 Step `children`，不进入 `ConnectorSchema`、持久化 JSON 或 lowering。直接 JSON 只接受 canonical `children`。

同一次输入必须且只能提供 `children` 或 `way`；同时提供或两者都缺失时 fail-loud。`parseWay` 的运算符、target 与错误语义全部沿用 Core，不在 Notation 复制 parser 或维护 Connector 专用 route enum。

Draw form 只复用 `WayDSL` 的路径几何语法，不复制 React `Draw` 的独有 props 层。路径粗细、箭头与其它视觉行为使用 canonical Core Path 字段；Connector 自身已经提供默认终点箭头。

## 基础数据结构与公开契约

概念上的 canonical IR 为：

```ts
type IRNotationNodeUnit = {
  namespace: 'notation';
  type: 'terminal' | 'stage' | 'decision' | 'junction';
  id: string;
  // 适用的 canonical Core Node authored fields；不含 Core type 与 shape
};

type IRConnector = {
  namespace: 'notation';
  type: 'connector';
  id: string;
  role?: string;
  children: Array<IRStep>;
  // 适用的 canonical Core stroke Path fields；不含 Core type / kind / kindOptions / ribbon
};
```

上述结构只冻结跨层公开契约，不规定 Zod 拼装、内部 helper 或文件拆分。公开 TS 类型继续由各元素 schema 推导，不维护手写平行 interface。

Factory 输入与 canonical IR 分离：四个基础单元 factory 补入 namespace / type；Connector factory 接受 `children | way` 互斥输入并始终返回 canonical `IRConnector`。React 与 Vanilla 只负责把宿主写法归一为同一 factory 输入并注入实际使用的 Definition，不建立 adapter 私有 IR。

Definition 是闭合内置元素的 lowering contract，不新增可由第三方注册的元素类别、shape provider 或 route provider。第三方仍可组合 Core Node / Path、使用 Core 自定义 provider，或在自己的 namespace 定义 composite；本 ADR不建立第二个 Notation element registry。

## 行为、失败语义与兼容性

- identity：每个元素的 authored `id` 传递给唯一 lower target；不以数组位置、shape 或 adapter embed id 替代 authored identity
- 默认值：基础单元保持既有视觉与尺寸默认值；Connector 省略 marks 时使用终点箭头，显式值始终优先
- Definition：直接 IR、React 与 Vanilla 都必须注入所用语义元素的 Definition；缺失时使用 Core 未注册 composite 诊断
- canonical JSON：基础单元与 Connector 都可 JSON 序列化；Connector JSON 只保存 Step `children`，不保存 `way`
- parser：Draw form 完整沿用 Core `parseWay` 的成功与错误行为；Notation 不吞掉、替换或降级 parser 诊断
- target：Connector 只接受 Core Step 支持的 target；不再接受当前无法 lower 的 LogicFrame section target。Callout 的 target 契约不受影响
- artifact：四个基础单元与 Connector 均无 typed artifact；Scene 与 renderer 只观察 lower 后的 Core Node / Path
- adapter parity：直接 TypeScript、React 与 Vanilla 对相同作者输入生成等价 canonical Notation IR，并进入同一 Definition / Core compile 主链
- 兼容性：这是 `0.x` breaking change。旧 `type: 'node'` 基础单元、Connector `from/to/routing/appearance`、旧 route 常量与无需 Definition 的调用方式直接移除，不提供 alias、migration、fallback 或新旧双轨

本 ADR 部分 supersede alpha.1 ADR-01 中“四个基础单元是直接 Core Node Sugar”及“Connector 保留旧 JSON-safe route surface”的决策。alpha.1 的 package family、owner、release group、Standard layout composition、LogicFrame、Callout 与其它边界继续有效。

Diagram architecture、Notation completeness 与 Diagram / Notation family `AGENTS.md` 统一采用以下长期边界：正式持久化元素保留 Notation semantic IR，lower target 复杂度只决定 expansion 或 layout-aware channel；没有独立持久化语义的便利写法仍可使用纯 Core Sugar。

## 功能与包边界

- 所属能力域与能力面：Diagram Notation Complete；semantic identity、Core lowering、authoring parity、diagnostics 与 docs / LLM discoverability
- 解决的问题：让正式 Notation 元素的语义身份在 authored IR 中可持久化，同时避免为简单呈现复制 Core Node / Path 能力
- 主责包与协作包：Notation 主责元素 schema、factory、Definition 与语义默认；Core 主责 Node、Path、Step、Way parser、target、compile 与 Scene；React / Vanilla 只做等价 authoring
- 内部表达链路：canonical Notation IR → explicit expansion Definition → 一个 canonical Core Node / Path → Core compile → Scene
- 外部扩展链路：本轮元素集合闭合，不新建 provider registry；Core 的 shape、target、arrow、path generator 等开放能力仍通过 Core 自己的 contract 使用
- 下游执行：renderer 不识别 Notation discriminator；未来 Graph 可以消费 authored Notation IR，但本轮不创建 Graph contract 或 provenance
- 不支持边界：全局 edge 集合、拓扑、端口约束、自动 routing、障碍规避、布局与编辑状态继续留在 Graph / Flow / Editor
- 本轮结论：扩展 Notation semantic identity contract，并完全组合现有 Core Node / Path / Way 能力，不下沉新的 Core capability

## 架构验证

- 问题归属：元素身份是 Notation 领域契约；Node / Path 绘制能力继续属于 Core，没有把 Graph 关系模型或 renderer 语义吸入 Notation
- 原子复用：基础单元和 Connector 复用完整适用 lower surface，不手工维护旧字段 allowlist；Draw form 直接复用 `WayDSL` 与 `parseWay`
- define-registry：每个持久化 semantic type 通过 Core composite Definition 明确 dispatch；元素种类闭合，因此不建立 Notation 自定义元素 registry
- lowering channel：五个元素都使用普通 `expand` 返回单一 lower target，不使用 layout-aware compile、受限 replay Scope 或自建 pipeline
- identity 与组合：authored id 一对一传给 lower target；没有 wrapper、child identity、artifact 或多元素顺序歧义
- 端到端闭环：direct JSON / TypeScript、React、Vanilla 归一为同一 Notation IR，Core SVG / Canvas 消费同一 Scene；schema、tests 与双语 docs 同步更新
- 长期演进：后续元素新增字段时仍先判断其是否为真实 Notation 语义；只有 lower target 出现多元素、局部布局、artifact 或其它当前 Core 无法组合的行为时才升级 lowering 复杂度
- 治理一致性：architecture、completeness 与就近 AGENTS 已同步，不让新 ADR 与旧 Core Sugar 规则并列生效

## 被否决方案

- 四个基础单元继续直接输出 Core Node：生成后语义身份丢失，与 Notation“无需从 shape 反推职责”的根问题冲突
- 为语义身份增加 `meta` 但仍输出 Core IR：opaque metadata 不能代替稳定 discriminator、schema 与 Definition，也会让 Core IR 反向承载 Notation owner
- Connector 保留当前 route union：与 Core Step 一一映射，持续造成 target、Step、appearance 与诊断收窄
- 同时持久化 `children` 与 `way`：形成两个等价真源，解析默认值、错误与后续编辑会分叉
- 在 Notation 复制 Draw component 或 parser：React sugar 与 Core parser 已有 canonical owner，复制会破坏 direct / React / Vanilla parity
- 为五个元素创建 layout compiler 或 typed artifact：当前每个元素只有一个 lower target，没有独立布局或 artifact 语义
- 保留旧 API alias 或自动迁移：`0.x` 阶段直接采用长期契约，避免双 schema、双 Definition 与双文档入口

## 测试策略摘要

需要 schema / factory 证据锁定 namespace、semantic type、JSON canonicalization、默认值与互斥作者输入；Definition / compile 证据锁定同 id 单 Node / Path lowering、完整适用 lower surface、无 artifact 与缺失 Definition 诊断；Core parser 等价证据锁定 `way` 与手写 Step 产生同一 canonical Connector；React / Vanilla 证据锁定两个作者入口和 Definition 注入 parity；负证据锁定旧 Core Node Sugar 与 Connector route surface 已移除；docs 与 renderer 证据锁定双语 API、LLM describe 及 SVG / Canvas 可见结果不依赖 Notation renderer 分支。

## 不在本 ADR 范围

- LogicFrame、Callout 的公开契约或 layout-aware compile
- GraphModel、Edge / Port / Group、GraphGeometry、Flow、自动布局或 routing
- Editor selection、viewport、history 与交互工具
- 新 Notation 元素、UML / State 完整模型或自定义元素 registry
- 主题 token、appearance preset、默认视觉重设计或 renderer 新能力
- 具体文件拆分、私有 helper、测试 case、执行命令、commit、push、tag 与 publish
