# ADR-03：Plot 绘图边界与 Chart presentation 归属

- 状态：Accepted
- 决策日期：2026-08-10
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [ADR-01：Plot 主题 token 所有权与 Chart 消费边界](./01-chart-layering.md) · [Chart ADR-03：Chart presentation 与 Standard FlexLayout](../../../../chart/v0/v0.1/alpha.1/03-presentation-standard-layout.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md)
- Supersedes in part：[ADR-01](./01-chart-layering.md) 中 Plot static label、`plot.label.*` token 与 `IRPlotTheme.labelText` 映射；其余 Plot 主题所有权、token cascade 与 Chart 消费边界继续有效

## 背景与目标

Plot 是把数据、scale、coordinate、mark 与 guide 映射为 Core 图形语义的 Grammar-of-Graphics owner。Chart 是建立在 Plot 之上的封闭类型与单图 presentation owner，通过 Standard 把唯一 Plot body 与 title、subtitle、caption、note、source、credit 或其它 renderer-neutral 内容组合为完整结果。

现有 Plot contract 仍保留一套独立的静态 labels 与外围占位语义，可以表达 title、caption、note、source 和 custom text；Plot theme 也为这套能力保留 `labelText` 与 `plot.label.*` token。它与 Chart presentation 形成两个 presentation 真源，并迫使 Plot lowering 处理不依赖 data、scale、coordinate、mark 或 guide 的外层内容。

本 ADR 收敛 Plot 的长期边界：Plot 只承担绘图本体及与可视化语义直接相关的文字；描述整个独立图表的 presentation 交由 Chart，通过 Standard 组合，不继续保留 Plot 级同义功能或主题配置。

## 决策：删除 Plot presentation labels，统一交由 Chart 组合

PlotSpec 删除通用静态 presentation labels 及只服务其外围占位的 Plot-level layout。Plot 不再接受 title、subtitle、caption、note、source、credit 或任意 frame-level custom text，也不为这些内容计算预留空间或生成 decoration layer。

Chart presentation 是这些内容的唯一领域入口。Chart 负责 presentation item 的语义、顺序、默认样式与唯一 Plot body；Standard 负责领域无关的布局、测量和组合；Core 负责 renderer-neutral text 与 Scene 执行。Plot 不解释 Chart presentation，也不提供简化别名、隐式转换或兼容桥接。

Plot 继续拥有与绘图本体直接相关的文字语义：axis title、tick label、legend title / label、facet / track header、datum / mark label、reference label、数据锚定 annotation 及其它由 Plot operation 产生的文本。它们继续沿各自的 guide、composition、mark 或 annotation contract 表达，不进入通用 Plot presentation label 集合。

理由：

1. presentation 内容不参与数据到图形的映射，把它保留在 Plot 会扩大 Visualization Complete 的问题边界
2. Chart 已拥有 renderer-neutral presentation contract 与 Standard 组合主链，Plot 再维护同义 labels 会形成重复 schema、layout、theme 与 lowering
3. 与 axis、legend、facet、datum 或 mark 绑定的文字仍有明确 Plot owner，不需要依赖通用 static label 才能表达
4. 删除旧入口可以让 Plot theme 与文件职责直接对应真实消费模块，不保留无图形语义的 token 和 mapping

## 基础数据结构与公开契约

PlotSpec 不再包含 Plot-level `labels` 与只为其服务的 `layout`，也不增加替代字段。data、transform、scale、coordinate、mark、guide、composition 与 Plot theme 输入继续组成绘图本体契约。

Plot theme 收敛为绘图表面、文字基线、guide 与 palette，顶层成员固定为 `background`、`typography`、`axis`、`legend` 与 `palette`。这些保留成员继续复用现有 value contract，不因删除 presentation labels 改变数据形态。

`typography` 不对应独立图元。它是 Plot-owned 文本的共享默认样式，Axis、Legend、Facet 等具体 owner 可以提供更精确的覆盖；具体 guide、composition、mark 或 annotation 上的显式样式继续优先。Chart presentation 使用 Chart-owned typography 与 preset token，不读取或复制 Plot `typography`。

Plot canonical token contract 删除 `plot.label.foreground` 与 `plot.label.font.size`。完整 Plot token map、内建 style definition、局部 token override、native Plot theme mapping 与 inspection 均不得继续声明、生成、接受或报告这两个 key；`IRPlotTheme` 同时删除 `labelText`。

Chart 不再向完整 PlotSpec 转发 Plot-level `labels` 或 presentation `layout`。Chart-level title、subtitle、caption、note、source、credit 与 custom child 继续进入 Chart presentation；datum / mark label、axis、legend、facet 与 annotation 仍通过正式 Plot members 进入 PlotSpec。

## 行为、失败语义与兼容性

- 严格 Plot schema 对 `labels`、Plot-level `layout`、theme `labelText` 和 `plot.label.*` token fail-loud，不忽略未知字段
- Plot lowering 不生成 static presentation decoration，也不因这类内容扩大或收缩 plot area
- 直接 Plot 不提供图表标题、说明或来源快捷入口；需要完整单图 presentation 时使用 Chart，或由更上层宿主通过领域无关布局显式组合
- `typography` 为 Plot-owned 文本提供共享默认；Axis、Legend、Facet 等局部主题与 authoring 值按既有优先级覆盖
- axis title、tick label、legend、facet / track header、datum / mark label、reference label 与 annotation 的语义和可见结果不因本 ADR 被删除
- Chart presentation 的 authored order、唯一 Plot body、preset、custom child、inspection 与 Standard layout 语义保持由 Chart owner 决定
- 这是 `0.x` breaking change，不保留旧字段 alias、migration、fallback、自动迁移或双读
- React、Vanilla 与手写 JSON 同步删除 Plot presentation authoring；Chart 三种入口继续表达同一 presentation contract

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Plot / Chart 边界；删除 Plot 中不参与绘图映射的 presentation 能力
- 主责包与协作包：Plot 主责删除旧 IR、theme 与 lowering；Chart 主责单图 presentation；Standard 负责组合布局；Core 负责文本与最终图形执行
- Plot 拥有：surface、typography、axis、legend、facet / track、datum / mark / reference / annotation text、palette、lowering 与可视化 provenance / locator
- Plot 不拥有：Chart title、subtitle、caption、note、source、credit、presentation item 顺序或外层 composition
- Chart 拥有：唯一 Plot body、presentation preset 与 custom child 的 Chart-level 语义、Chart typography 与 inspection
- 外部扩展与下游闭环：自定义绘图内容继续沿 Plot definition / registry；自定义 presentation child 继续沿 Chart 的 renderer-neutral `IRChild` 与 Standard composition 主链
- 不支持边界：Plot 不提供 presentation compatibility layer；Chart 不复制 Plot guide、mark、theme 或 lowering
- Chart presentation 的发布与 adapter gate 继续由 Chart ADR 决定；本 ADR 不以删除 Plot 重复入口代替 Chart owner 的独立验收

## 架构验证

- 是否可由现有能力组合：可以。Chart presentation、Standard FlexLayout、Core text 与 Plot 的专门 guide / mark / composition label 已覆盖保留能力
- Data / Plot / Table / Chart / Standard / Core 责任切分：Data 不受影响；Plot 只保留绘图语义；Chart 承担单图 presentation；Standard / Core 执行通用组合与文本
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：不新增能力，只删除重复公开字段与 token；presentation 继续复用既有 Chart contract，不需要新 registry
- pipeline / lowering / renderer / diagnostics 如何闭环：Plot 移除 presentation lowering，Chart presentation 继续映射为 Standard composition，renderer 只执行最终 Core Scene；旧 Plot 字段由严格 schema 诊断
- provenance / lineage / locator 是否适用：删除的 static decoration 不再生成 Plot provenance；保留的 guide、mark、facet、annotation 与 Chart presentation inspection 沿各自 owner 继续工作
- 结论：上移。Chart-level presentation 从 Plot 完全上移到 Chart，通用布局与文本继续由 Standard / Core 执行

## 被否决方案

- 保留 Plot labels，只从 theme 删除 `labelText`：功能仍与 Chart 重复，并会失去明确默认样式 owner
- 把 Plot labels 收窄成 title / caption shorthand：仍建立第二套 Chart presentation 入口与外围布局
- 自动把旧 Plot labels 转换为 Chart presentation：PlotSpec 无法在不知道 Chart 宿主的情况下完成上移，并会形成 migration 主链
- 把 facet、datum 或 annotation text 一并移交 Chart：这些内容依赖 Plot 数据、scale、coordinate、mark 或 composition，Chart 不拥有其语义
- 让 adapter 或 renderer 补标题和来源：会破坏 JSON、React、Vanilla、SSR、SVG 与 Canvas 等价性

## 测试策略摘要

需要 schema、public surface、theme resolver / mapping、Plot lowering、Chart resolution、inspection、adapter parity 与 docs 证据。关键不变量是 Plot 不再接受或生成 presentation labels，Plot theme 不再暴露无 consumer 的 label token，保留的 Axis、Legend、Facet、datum / mark / reference / annotation text 继续工作，Chart presentation 仍以唯一 Plot body 和 authored order 生成 renderer-neutral 组合结果。

## 最终实现与验证

Plot 的 presentation labels、专用外围 layout、对应 theme member/token、decoration lowering 与跨入口 authoring 已删除；Chart 不再转发 Plot-level presentation 字段，并继续通过自身 presentation contract 与 Standard 组合唯一 Plot body。

Plot `typography` 继续作为绘图内文本的共享基线，Axis、Legend、Facet 的局部主题与显式 authoring 按既定优先级覆盖。最终验证覆盖严格 schema、主题解析与 inspection、lowering、保留文本能力、Chart presentation、React / Vanilla parity、文档 registry 与用户路径；未保留兼容层或已知契约风险。

## 不在本 ADR 范围

- 新增或重设计 Chart presentation preset、布局字段、surface、inspection 或 adapter runtime
- 删除 datum / mark / reference / annotation label、axis title / tick label、legend text 或 facet / track header
- 改变 Chart Canonical Type、recipe、数据角色或 Plot extension 规则
- 改变 Plot background、palette、mark paint、scale 或 coordinate 行为
