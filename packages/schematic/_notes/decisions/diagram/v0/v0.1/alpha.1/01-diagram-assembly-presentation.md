# ADR-01：Diagram Assembly 与 Presentation

- 状态：Accepted
- 决策日期：2026-08-29
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Graph 已能用 JSON-safe 的 Graph、Group、Block、Entity 与 Relation composite 表达关系语义和可独立绘制的内容，但它不拥有完整图示的外围说明、自动布局或 routing。具体 Diagram 类型需要把 title、description、legend 与自己的 drawing core 组织为一个可独立编译、测量、检查和导出的完整输出

如果这些内容只由 Docs 或其它宿主在图外拼接，同一个 Diagram 在 Scene、renderer、Inspect 和 export 中将不再具有一致边界；如果 Diagram 自建文字、Legend、Frame、Layout 或 renderer 语义，又会复制 Core、Layout 与 Standard 已有能力。Diagram 因此需要先建立 drawing-core-agnostic 的装配 foundation，再由后续具体 Diagram root 提供真实绘图核心

本决策冻结所有具体 Diagram 类型可复用的 Presentation 内容契约、固定槽位、Legend 来源和统一输出边界。区域物理位置、外框、padding、section gap 与 Diagram appearance 由 ADR-02 确定；FlowDiagram 的 Graph Body、公共 Source root、adapter、自动 layout / routing、结果与 artifact 由同一 alpha.1 的后续 ADR 决定

## 决策

### Diagram 拥有完整图示的区域装配语义

`@retikz/diagram` 正式拥有完整 Diagram 中 Presentation 与 drawing core 的结构关系。具体 Diagram 不只是绘图核心的几何结果，而是包含外围说明、绘图核心和整体输出边界的独立 Tier 2 composite

Diagram 不拥有平行的文字、Legend、Layout、Surface、Theme primitive、Scene 或 renderer。title 与 description 复用 Core 文本契约，Legend 复用 Standard Legend，区域排列复用 Layout，完整外壳复用 Standard Surface，最终仍经 Core 的统一 composite Definition、registry、compile 与 Scene 路径执行。Graph 继续独立拥有关系语义、Graph Theme 与 Graph identity，不读取 Diagram Presentation

### Presentation 是长期共享片段，具体 Source root 延后建立

Presentation 是所有具体 Diagram 类型可以复用的长期公开 Source 片段，因此使用 `IRDiagramPresentation` 共享名称，不绑定 Flow drawing core。它只包含可选且唯一的 `title`、`description` 与 `legend`；出现时必须至少包含一个槽位，没有 Presentation 时省略整个字段。该长期公开身份不改变具体 Diagram root 建立前暂不导出的阶段边界

完整 Diagram 的逻辑阅读和结构遍历顺序固定为 title、description、drawing core、legend。具体 Source 字段或框架 authoring 的书写顺序不得改变槽位语义；物理排列可以由 Frame 把 Legend 放在获准方位，但不能改变固定槽位、重复内容或重解释 drawing core

本 ADR 的 Foundation 阶段不建立 `IRFlowDiagram`、任意 body 的通用 `IRDiagram`，也不建立可实例化的临时 Diagram composite。drawing core 只作为 foundation 装配过程接收的不透明内部依赖：foundation 可以测量、排列和包装它，但不能读取或改写其内部语义。同一 alpha.1 的具体 Diagram root 必须在拥有真实 drawing core 契约时再把 Presentation、Frame 与 drawing core 组合成持久化 Source

### title 与 description 使用完整 Core TextBlock

title 与 description 直接使用完整 `IRTextBlock`，支持单行、多行、每行独立的 fill、opacity 与 font、同一行内的 text / math runs，以及 run 级显式样式。Diagram 不把它们收窄为纯字符串，也不建立 `DiagramTextSchema`

Presentation 文本不接受任意 `IRChild` 或完整 Core Node。position、shape、boundary、padding、margin、stroke 等 Node identity、几何和外壳字段不属于文字内容；文本块级默认 font、text color、alignment、line height 与区域 appearance 由 Diagram appearance 解析，`IRTextBlock` 内显式的行级或 run 级样式继续保持作者优先级

title 或 description 出现时必须至少包含一个长度大于零的 text 或 TeX run；校验保持 Core authored text，不执行 trim。省略表示没有该区域；显式空字符串、只有空内容的行或空 run 不静默折叠为省略

### Legend 直接使用显式 Standard Legend

Presentation 的 `legend` 直接接受一个完整 `IRLegend`。Diagram 不定义 Diagram Legend item、ramp、sample、label、方向、换行、内部 gap、padding、key 或 artifact 的平行契约，也不改变 Standard Legend 的有效空内容、失败语义和稳定 item / tick identity

Diagram 不根据 Entity、Relation、Group、role、kind、predicate、shape、颜色或最终 Scene 自动猜测 Legend，也不把 Legend 字段加入 Graph。相同 Graph 语义未必都需要解释，相同视觉样式也未必表示相同语义；在没有显式 encoding 或 legend declaration 真源时，自动推导不能成为确定行为

未来若出现真实的自动 Legend 消费者，应由具体 Diagram 接受明确的派生声明，组合其 drawing-core Canonical 语义与 appearance provider，最终仍产出 Standard Legend。本 foundation 不预留 `manual | derived` union、Graph selector、合并规则或兼容字段

### 所有区域属于同一个可观察输出

存在的 title、description、drawing core 与 legend 都进入最终 Scene，并按各自正常的 allocation 与 visual contribution 共同形成完整 Diagram bounds。SVG、Canvas、图片或其它 renderer / export 消费同一个完整 Scene，不提供仅页面展示、仅 metadata、`render: false` 或 `includeInBounds` 双轨模式

Inspect 与具体 Diagram artifact 必须能区分 `presentation.title`、`presentation.description`、drawing core 与 `presentation.legend` 结构角色。缺失槽位不生成 Scene 子树、空 bounds 或区域 artifact；具体 artifact 与 locator 形态由拥有具体 Diagram orchestration 的决策冻结

只有具体 Diagram Source 显式 id 才建立最外层 identity。Presentation 派生节点和内部 layout item 不发布公共 identity；Standard Legend 已有的显式 id 及 item / tick key 保持其 owner 语义，不由 Diagram 重新编号

### 装配只组合现有绘图能力

Diagram 将 title 与 description 投影为 Core text Node，把 drawing core 当作不透明 child，把 legend 作为 Standard Legend child，再通过 Layout composite 形成区域树，并由 Standard Surface 提供完整图示外壳。具体 Source 不保存这棵 Surface / Layout / Node 派生树

Standard Frame 当前拥有 Node-only body 和自身的 header、gap、padding 与 border 语义；把它扩展为 Diagram 外壳会与固定区域及 Frame / Appearance 契约重叠。Surface 已能包装任意 Core 或 Tier 2 child，Layout 也能排列任意 child，因此本决策不扩展 Standard Frame，Diagram 也不复制 Frame 的排版算法

### 具体 root 建立时保持三入口等价

本 ADR 只建立 Diagram foundation，不导出可实例化 Diagram composite，也不为尚未设计的 concrete root 建立 Direct IR、Vanilla builder 或 React component。`@retikz/diagram-vanilla` 与 `@retikz/diagram-react` 在具体 root 建立前保持空壳，不提供临时 body、占位渲染或 adapter 私有入口

未来具体 Diagram root 必须以 Direct IR 为持久化真源；Vanilla 只把 typed Input 组装为同一 Source，React 只通过 Vanilla normalize 产生相同 Source。框架 authoring 不得拥有 Direct IR 无法表达的 Presentation、Legend、布局、输出或错误恢复能力

## 基础数据结构与长期公开契约

长期最小 Presentation 片段为：

```ts
type IRDiagramPresentation = Readonly<{
  title?: IRTextBlock;
  description?: IRTextBlock;
  legend?: IRLegend;
}>;
```

`IRDiagramPresentation` 由 Diagram schema 唯一派生，并由后续具体 Diagram Source 组合；它不因此建立任意 drawing body 的通用根类型。`IRTextBlock` 与 `IRLegend` 直接组合对应 owner 的公开 schema / type，Diagram 不手写平行字段或复制其默认值

Presentation 是闭合对象，只接受 title、description 与 legend。只有一个 Legend 槽位；需要表达多个离散项目或连续刻度时使用 Standard Legend 自身的 content 契约，不增加 Legend 数组或 Diagram 专属分组层

本 ADR 的实现可以在包内建立并消费该长期契约，但在具体 Diagram root 形成真实公共消费者前不从 package public exports 暴露 foundation schema、类型、resolver 或装配入口

## 行为、失败语义与兼容性

- 未知 presentation 字段、空 presentation、空 title / description 或非 JSON-safe 内容由 Diagram Presentation schema fail-loud
- TextBlock 与 Legend 的结构错误保留对应 owner 的诊断语义，并通过 `presentation.title`、`presentation.description` 或 `presentation.legend` 路径定位；Diagram 不吞掉、改写或降级为 fallback
- presentation 槽位顺序不影响结构顺序和布局输入顺序；缺失槽位完全折叠，区域间距只在相邻的实际区域之间产生
- Legend content、key、内部布局和空 items / ticks 的合法性完整沿用 Standard Legend；Diagram 只要求 legend 字段本身是一个合法 `IRLegend`
- 所有区域必须经过同一 renderer-neutral compile 路径进入 Scene；adapter、Docs 或 renderer 不得在 Scene 外补画 title、description 或 legend
- Foundation 阶段不导出临时 Source root、任意 drawing body、占位字段或 package-public foundation API。同一 alpha.1 的具体 Diagram root 直接采用长期契约，不保留临时 alias、fallback、migration 或双轨实现

## 实施结果

Alpha.1 的 Foundation 阶段已在 `@retikz/diagram` 包内建立严格、JSON-safe 的 Presentation 契约，以及 drawing-core-agnostic 的 resolve 与 assembly foundation。title、description、显式 Standard Legend 和不透明 drawing child 通过既有 Core、Layout 与 Standard 能力进入同一 Scene；缺失区域完全折叠，Presentation 派生内容不发布 Diagram identity 或 artifact

该 foundation 继续保持 package-internal，包根与两个 adapter 不开放临时入口。可实例化 Source、Inspect 角色与具体 Diagram artifact 仍由拥有真实 drawing core 的后续决策建立
