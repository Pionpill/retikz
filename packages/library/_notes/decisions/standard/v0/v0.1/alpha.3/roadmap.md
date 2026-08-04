# Standard v0.1 alpha.3 Roadmap：语义逻辑图组件

> 状态：设计中；ADR-01～05 为 Proposed
>
> 主题：提供可持久化的基础逻辑单元、headless `LogicBlockBase`、局部连接与说明能力，让作者、工具与 LLM 不必从 shape、颜色或坐标反推逻辑图语义
>
> 关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard library design](../../../../../architecture/standard-library-design.md) · [逻辑制图能力域设计](../../../../../../../../notes/architecture/logical-diagram-design.md) · [能力完备性与模块边界](../../../../../../../../notes/architecture/capability-design.md)

## 定位

alpha.3 建设 Standard 自身可独立绘制、可跨领域复用的局部逻辑图语义。它同时覆盖两类内容：

1. `Terminal`、`Stage`、`Decision` 与 `Junction` 等轻量逻辑单元
2. 只规定纵向外壳、区域布局与定位能力的 headless `LogicBlockBase`

`Connector` 与 `Callout` 负责显式局部关系和定位说明，使这些组件可以形成完整逻辑图。它们仍然只是独立 Standard composite，不建立 GraphModel、全局 nodes / edges、Port / Group、拓扑校验、算法布局或编辑器状态。

文档可以基于 `LogicBlockBase` 组合 Process、Class、Data 等内部 recipe，展示输入、配置、伪代码、输出、类成员、schema、context 或 payload。recipe 只属于 retikz 自身示例，不进入任何包的公开出口，也不增加新的持久化 discriminator。

## 版本目标

- 以独立 Standard discriminator 持久化 `Terminal`、`Stage`、`Decision` 与 `Junction`，默认形状只是可替换 preset
- 建立内容 headless、外观中性可用的 `LogicBlockBase`，用任意 `IRChild` 组合 header 与 authored-order sections
- 建立统一的整体 / section target，并以前置 Core composite-owned subtarget contract 避免调用方拼接内部 id 或 Standard 派生扁平全局 id
- 支持直线、显式折线、TikZ 风格正交折线、quadratic、cubic 与 bend 曲线
- 复用 Core layout-aware composite、Path host label、target / anchor、Scope 与 Standard Box Layout 词汇，不建立私有测量、target resolver、路径采样或 renderer 路径
- 接入各项 Definition、React / Vanilla 等价 authoring 与双语文档 dogfood

## 能力边界

- Standard 拥有局部逻辑角色、headless Block 外壳、显式连接呈现、Callout 布局、适用布局组件的 typed artifact 与 direct Definition loading
- Core 拥有 `IRChild`、Path step、target / anchor、namespace、layout-aware probe / replay、Scene 与 renderer 执行
- React / Vanilla 只把宿主 authoring 归一为同一 Standard canonical IR，不复制 schema、布局、路由或 target 解析
- `role`、`category` 等开放字符串只保存作者语义，在组件提供 typed artifact 时也原样保留，不触发隐藏 registry、布局或样式规则
- 每项公开组件沿用 Core `CompositeDefinition` registry；alpha.3 不增加 LogicUnit、Block kind、routing 或 appearance provider registry
- Process、Class、Data recipe 只消费公开能力，不成为 Standard schema、Definition 或 adapter 的前置依赖

## ADR 顺序

| ADR                                     | 主题                    | 主要决策                                                                           | 依赖                                       | 状态     |
| --------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| [01](./01-logic-diagram-profile.md)     | Logic Diagram Profile   | 冻结能力归属、identity、共享 target、开放 role、外观与 locator / artifact 公共边界 | alpha.1 composite；Core target / composite | Proposed |
| [02](./02-headless-logic-block-base.md) | Headless LogicBlockBase | 冻结 header / sections、纵向约束布局、中性外观、section target 与 typed artifact   | ADR-01；alpha.2 Box Layout                 | Proposed |
| [03](./03-semantic-logic-units.md)      | Semantic Logic Units    | 冻结 Terminal / Stage / Decision / Junction 的统一 content、默认形状与覆盖语义     | ADR-01                                     | Proposed |
| [04](./04-connector-and-callout.md)     | Connector 与 Callout    | 冻结局部 target、关系 role、标签、折线 / 正交 / 曲线路由与显式 Callout placement   | ADR-01～03；Core Path                      | Proposed |
| [05](./05-capability-and-authoring.md)  | Definition 与 Authoring | 冻结按项 Definition、React / Vanilla / 直接 IR 等价与内部 recipe 边界              | ADR-01～04；alpha.3 ADR-06                 | Proposed |

```text
01 shared profile
├─→ 02 LogicBlockBase ─┐
└─→ 03 logic units ────┼─→ 04 Connector / Callout
                       └─→ 05 definitions / adapters
```

## 关键设计不变量

- 逻辑语义存在于 Standard composite 输入；lowering 后的 shape、Path、Scope 与 Scene 不是反向恢复真源
- `LogicBlockBase` 只理解 header、section、spacing、appearance、bounds 与 target，不理解标题、图标、字段、方法、代码、输入或输出
- section 顺序只由 `sections` authored order 决定；不维护第二份 order，也不使用 `visible: false`
- 基础逻辑单元全部使用 `content: IRChild`；`Decision` 不拥有 condition 专有字段或 outcome 列表
- branch 语义只保存在 `Connector`，不同时写入 `Decision`
- Connector 是局部关系 composite，不是 Edge 集合；它不统计连接数量、不验证拓扑，也不自动移动端点组件
- Connector label 直接复用 Core `IRGeometryLabelInput` 与 Path host label，不接受任意复合 `IRChild`，也不由 Standard 测量或放置
- Connector 直接 lower 为同 id 的 Core Path，不重复输出 typed path artifact；路径几何与 bounds 由 Core 主链拥有，Scene id 只 stamp 到 Path 最外层主体，附属 label / mark 不建立第二 identity
- Connector 不提供 compile artifact locator；领域 provenance 在 lowering 前通过 authored id join，不从 Scene 或 Core IR 反推 Standard role / endpoint
- Connector target 随 Core pending Path 在 namespace 注册闭合后解析，允许同一可见 namespace 内的前后目标；Callout placement 只读取此前已发布的 target snapshot，不等待 forward target
- Callout placement 必须显式，不执行碰撞检测或最佳位置搜索
- Callout side 固定 target / shell 对向 side anchor；gap 沿 outward normal，offset 沿屏幕正 x / y 切向，leader 连接解析后 target anchor 与最终 shell anchor
- `LogicBlockBase`、基础逻辑单元与 Callout artifact 都使用 strict JSON schema；`LogicLayoutItemArtifact` 去除单一 content 不适用的 key / sourceIndex，`LogicOuterArtifact` 独立合并 shell、content 与 divider / leader，且不改写 alpha.2 `LayoutArtifactContainer` 的 item-union 原义
- 任意 child 的测量、失败与 replay 只经过 Core layout-aware contract；SVG / Canvas 不回读布局或路由

## 用户可观察默认

- `LogicBlockBase` 提供透明背景、`currentColor` 中性边框 / divider、8-unit 默认区域 padding 与圆角，可全部显式覆盖
- 空 header 合法，空 sections 合法，但二者不能同时为空；section key 必须局部唯一
- `Terminal` 默认使用 start / end 语义与 capsule 外观，`Stage` 默认 rounded rectangle，`Decision` 默认 diamond，`Junction` 默认 dot / bar preset
- Logic Unit 的 shape-specific 参数只存在于完整 `IRShapeRef.params`；显式 shape 替换不继承旧 preset params，不暴露对部分 shape 静默失效的通用 cornerRadius
- 未知 category / role 合法并保持原值，但不会触发未声明的样式或路由
- Connector label 的 position、side、sloped、文本 / TeX 与样式默认完全沿用 Core Path host label；正交三段的中间带默认位于两端间的 `0.5`
- 缺失 definition、Callout 缺失或 forward id / section / anchor、以及 child layout failure 均 fail-loud；Connector unresolved target 发 Core Path warning 并跳过整条 Path。两者都不使用 placeholder 或隐式 fallback，Connector 解析后退化行为沿用 Core Path

## Architecture Gate

Gate 至少证明：

- 去除 UML、Graph、Flow、Workspace、React、Class、Schema、Context 等领域词后，公开组件仍是可独立消费的 Drawing Complete 能力
- `LogicBlockBase` 的开放性来自任意 `IRChild` 与显式 appearance，而不是新 Block registry 或 callback
- 语义单元的 discriminator 与默认 shape 分离；替换 shape 后语义和 artifact 不变
- Connector routing 只组合 Core Path step，未复制 curve / fold 数学，也未建立自动 routing pipeline
- section target 通过前置 Core composite-owned subtarget contract 安全映射，不暴露调用方必须手写的内部 id，也不派生可与 authored id 冲突的扁平字符串
- 直接 IR、React、Vanilla 与显式 Definition 注入进入同一 schema、definition 与 compile 主链；布局组件 artifact 和 Connector lowered Scene 主体 id 保持跨入口等价
- 内部 Process / Class / Data recipe 不进入 package exports 或 schema registry
- section target / Callout 实现前，独立 Kernel ADR 必须冻结 composite-owned subtarget 的 pending-Path / previous-placement 两种 lookup 生命周期与 target-aware opaque replay；Connector label 实现前，Core built-in stroke Path 必须闭环公开 host label 契约

以下方案不能通过 Gate：

- 以 diamond、capsule、颜色或图标代替持久化逻辑 discriminator
- 为 Process、Class、Data 或 category 建立公开封闭 union、definition registry 或 renderer 分支
- 把 Connector 扩张为 GraphModel、端口系统、全局 edge collection 或自动避障器
- 让 React children、render callback、class instance 或函数进入 Standard IR
- 由 adapter 或 renderer 私自测量 content、重算 section layout 或解释 role

## 测试与文档基线

- schema 证据覆盖 strict JSON、canonical defaults、开放 role、section identity、routing union 与非法状态拒绝
- layout 证据覆盖 natural / constrained / fixed / fill、任意 IRChild、nested Block、overflow / clip 与 child failure 提升
- semantic 证据覆盖 discriminator 与 appearance 解耦、共享 content 和 stable target
- routing 证据证明 straight、polyline、四种正交 pattern、quadratic、cubic、bend 与 Core Path 语义等价
- artifact / identity 证据覆盖整体、header、section、content 与 Callout 的完整 strict artifact、Connector lowered Scene 主体 id，以及 Connector / Callout 各自的 target 诊断
- Callout geometry 证据覆盖四个 side、默认 / 显式 target anchor、法向 gap、切向 offset、最终 shell anchor 与 leader 端点
- Definition / adapter 证据覆盖按项 Definition、重复 provider key 冲突、直接 IR、React 与 Vanilla 等价
- docs 以内部 Process / Class / Data recipe 绘制真实流程、类结构与 payload / context 图，并公开源码供读者参考
- renderer 只验证同一 Scene 的 SVG / Canvas parity，不参与布局、target 或 route 决策

## 完成标准

- [ ] ADR-01～05 完成 test contract、Architecture Gate 与人工确认
- [ ] `LogicBlockBase`、四个基础逻辑单元与 Callout 的 schema、Definition、artifact 与 factory 形成闭环；Connector 的 schema、Definition、同 id Core Path lowering 与 factory 形成闭环
- [ ] 直接 IR、React 与 Vanilla authoring 产生等价 canonical IR 与 Scene，并保持适用 artifact / Connector lowered Scene 主体 identity 等价
- [ ] straight、polyline、`-|`、`|-`、`-|-`、`|-|`、quadratic、cubic 与 bend 均有确定结果和失败诊断
- [ ] 整体 Block、section 与普通逻辑单元可以被 Connector / Callout 稳定定位；Connector 支持 pending forward target，Callout 保持 previous-only placement
- [ ] Core built-in stroke Path host label 闭环，且 composite-owned subtarget / target-aware opaque replay 已由独立 Kernel ADR 冻结并实现；Standard 未复制 Path sampling、target resolver 或扁平派生 id
- [ ] Process / Class / Data recipe 只存在于 docs 内部实现，且至少服务三类真实逻辑图
- [ ] Standard 三包与双语 docs 完成受影响范围验证，无 renderer 特判、隐式 registry 或领域反向依赖

## 不在 alpha.3 范围

- 完整 UML metamodel、JSON Schema / Zod validator、React Context runtime 或工作流执行
- GraphModel、全局 nodes / edges、Port / Group、拓扑校验、算法布局、自动路由与避障
- selection、drag、history、viewport、snapping、交互连线或其它 Workspace 状态
- swimlane、BPMN、sequence diagram、state machine execution、database lineage 与业务 adapter
- 从 lowering 后的 Core IR / Scene 恢复原始逻辑语义
- 导出 ProcessBlock、ClassBlock、DataBlock 或其它 docs recipe
