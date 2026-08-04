# ADR-10：Core 原子绘图契约与 Tier 2 组合边界

- 状态：Proposed
- 决策日期：2026-08-03
- 关联：[alpha.2 roadmap](./roadmap.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md) · [Schema 设计](../../../../../../../notes/architecture/schema-design.md)

## 背景与目标

Core 当前已经拥有若干可复用的叶子契约，但完整的路径基础契约同时承载了实例身份、通用图形样式、描边、填充、路径几何、provider 选择、标记、标签和结构字段。Standard、Plot、Chart、Table 等上层在表达自己的输入时，因而反复从大型 Core schema 中 `pick` / `omit` 字段，或者重新声明已经属于 Core 的 paint、opacity、dash、shadow、blend mode 等词汇

这会带来三类长期问题：

1. 上层组合依赖底层 schema 的偶然字段组织，而不是依赖可读的稳定语义
2. 同一字段可能在 schema、类型、lowering、patch merge 或 inspection 中出现多份白名单，新增字段时容易出现接受但未消费的漂移
3. 为了减少一次投影而把上层领域默认、禁用字段或 preset 反向下沉，会形成更大的底层 bundle，模糊 Core、Standard 与领域包的所有权

本 ADR 的目标是冻结一条长期规则：Core 向外导出按稳定语义划分的原子契约，Tier 2 按需组合并保有自己的领域语义；原子化不等于把每个字段机械公开，也不等于建立能力加载 bundle 或 preset 层

## 决策：Core 提供原子契约，上层拥有组合与收窄

Core 在不改变现有完整 Path 语义的前提下，提供可独立复用的图形原子契约，并由完整 Path 契约组合这些原子。路径至少按以下语义边界组织：

- `PathStroke`：路径专有的描边宽度、dash、端点线帽和拐角连接等语义；描边 paint 与透明度来自共享 graphic style 原子
- `PathFill`：路径专有的填充规则；填充 paint 与透明度来自共享 graphic style 原子
- `PathGeometry`：路径构造、圆角及路径自身的几何选项
- `PathDecoration`：沿路径的 marks、几何标签等附加语义
- `PathStructure`：path kind、kind options、ribbon 等 provider / 结构选择

通用的 `DrawableInstance`、graphic paint / opacity / effect 原子、字体与其它基础词汇继续由 Core 各自拥有。`GraphicStyle` 与 `CascadingGraphicStyle` 是基于这些原子的不同组合契约，而不是新的底层词汇。共享原子与上述 Path fragment 组合为完整的 Path authoring / IR 契约；完整契约继续负责跨 fragment 的 kind、结构和字段关系校验。fragment 自身只负责其稳定局部不变量，不因独立复用而成为另一个 Path 编译入口

Core 的原子契约遵循以下原则：

1. 原子边界按可观察语义、不变量和扩展边界划分，不按字段数量拆分
2. schema、schema-derived type、contract、compile / lowering 与 Scene / manifest 使用同一语义真源；不得因上层组合便利复制一套平行词汇或消费路径
3. 稳定的 Core 叶子优先复用。`GraphicStyle` 与 `CascadingGraphicStyle` 可以继续保持不同组合，因为 effect 是否可继承是不同契约；Node border、Scope default 等也可在各自 owner 内组合并保留不同默认和继承规则
4. 完整 Path 契约继续存在，作为合法 Path 的统一入口；原子 fragment 不是替代完整 Path 的新 preset，也不要求调用方按固定 bundle 加载能力
5. Path kind、custom provider、marker、paint、font 等需要扩展时，继续沿既有 Core contract / registry / pipeline；原子化本身不新增 parallel registry

### 最小契约形态

以下表达的是稳定语义形态，不规定具体 schema 拼装方式或内部文件组织：

```ts
type PathContract = DrawableInstance &
  GraphicStyle &
  PathStroke &
  PathFill &
  PathGeometry &
  PathDecoration &
  PathStructure;

type GraphicStyle = GraphicPaint & GraphicOpacity & GraphicEffects;

type GraphicPaint = {
  color?: CssColor;
  fill?: PaintValue;
  stroke?: PaintValue;
};

type GraphicOpacity = {
  opacity?: Opacity;
  fillOpacity?: Opacity;
  strokeOpacity?: Opacity;
};

type GraphicEffects = {
  shadow?: Shadow;
  blendMode?: BlendMode;
};

type PathStroke = {
  strokeWidth?: number;
  dashPattern?: StrokeDashPattern;
  dashOffset?: StrokeDashOffset;
  lineCap?: PathLineCap;
  lineJoin?: PathLineJoin;
};

type PathFill = {
  fillRule?: PathFillRule;
};
```

`GraphicStyle` 的实际叶子集合仍由 Core 的通用 style 契约定义；上面的 `GraphicPaint`、`GraphicOpacity`、`GraphicEffects` 只表示拆分方向。`PathGeometry`、`PathDecoration` 与 `PathStructure` 的字段继续服从现有 Path 的 JSON-safe、strict unknown-field 和 kind-specific refinement 规则。它们表示可命名的组合边界，不承诺所有 fragment 都能独立编译为 Scene

Scene 输出也遵循相同的原子化方向，但不强制与 IR 使用同一 schema。Scene type 可以按 primitive 的实际 resolved 语义共享 paint、stroke、effect、metadata 等 type-only fragment；primitive-specific narrowing、marker 资源限制和 renderer-neutral Scene 形态仍由 Scene contract 自己拥有

## Tier 2 组合规则

Tier 2 必须消费 Core 原子契约，并由自身负责组合、默认值、禁用字段、输入收窄和领域语义：

- Standard 的 `StandardPathStrokeStyle` 保留为 Standard presentation composite 的组合输入。它服务 Grid、Axes、Frame 等多个 Standard consumer，但不是 Core 应提供的通用 path bundle
- Standard 的 border、layout item、presentation defaults 继续由 Standard 拥有；Core 只提供可复用的绘图语义，不拥有 Standard 的布局或 preset 默认
- Plot 可以组合 Core 的 paint、opacity、dash、shadow、blend mode、font 和 path fragment，但 `drawOpacity`、guide 几何、mark value 绑定和 visualization theme mapping 继续由 Plot 拥有
- Chart 可以继续对 Point、Path、Frame 和 presentation 输入做领域收窄。recipe-owned spatial fields、禁用字段和 Chart token 不因减少 `pick` / `omit` 而下沉到 Core
- Table 的 line border、shared-edge priority、cell content cascade 等具有表格语义的契约继续由 Table 拥有；Table 可以复用 Core 叶子，但不直接把 Table border 变成 Core Path stroke
- Data 继续以自己的 schema、contract、provider 和 pipeline 为真源，不因本 ADR 增加绘图 style bundle

因此，`pick` / `omit` 的判断标准不是“是否出现”，而是它是否表达了上层自己的 owner 语义。多个 Tier 2 以相同语义反复投影同一字段子集，才是补充 Core 命名 fragment 的信号

## 单一真源与字段消费闭环

凡是允许 sparse patch、主题覆盖或领域 projection 的能力，接受字段、派生类型和最终消费必须来自同一份语义契约。schema 通过的字段不得在 lowering、merge、inspection 或 manifest 阶段被静默丢弃；新增字段必须同时保持输入校验、类型表达和最终产物的一致性

这一规则不要求所有 Tier 2 共享一个大 schema。领域 owner 可以只开放 Core fragment 的子集，但该子集必须明确属于该领域，并且其默认、禁用字段和失败诊断不能被 Core 的通用契约掩盖

## 行为、失败语义与兼容性

- 默认行为：现有完整 Path、Node、Scope、Scene、Standard composite 以及 Tier 2 的默认值和 lowering 结果保持不变。原子契约为可组合的表达入口，不改变省略字段的既有默认和继承语义
- 失败与诊断：fragment 对未知字段保持 strict 失败；完整 Path 继续负责 kind、provider、ribbon、children 等跨 fragment 约束。schema 接受但 pipeline 未消费的字段视为契约错误，不得静默忽略
- 兼容性 / breaking：当前 `0.x` 阶段允许调整公开 schema / type 的组织以获得正确边界，但本 ADR 的首轮迁移应保持既有合法输入、非法输入、IR JSON 形态和 Scene 结果等价。删除旧公开名称、改变接受范围或改变领域默认必须另行说明并通过对应版本门禁，不以本 ADR 自动授权
- React / Vanilla 等价性：本 ADR 不新增宿主专属语义。Core fragment 若被 React 或 Vanilla 暴露，两个 adapter 必须写入同一 JSON / IR 契约；不存在的宿主能力应明确不适用，不得在 adapter 内复制一份 fragment schema

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete；解决后端中立绘图契约缺少稳定原子边界、上层重复投影和跨层字段漂移的问题
- 主责包与协作包：`@retikz/core` 主责；`@retikz/math` 提供纯几何基础；`@retikz/render` 执行 Scene；`@retikz/standard`、Plot、Chart、Table 和 adapters 协作消费
- 拥有：Core 的 JSON-safe schema fragment、derived type、通用绘图 style / path 语义、完整 Path 组合及其跨字段校验
- 不拥有：Tier 2 的领域 token、preset 具体值、布局规则、recipe-owned patch、表格边界冲突、交互状态、renderer 特有能力以及 adapter 生命周期
- 外部扩展与下游闭环：自定义 Path kind、shape、paint、marker 等仍通过现有 Definition / registry / compile contract；fragment 只描述数据契约，不创建新的扩展注册点。Core 输出现有 Scene / manifest，render、React、Vanilla 与 headless consumer 继续消费同一产物
- 不支持边界：不提供按场景加载的全量 capability bundle，不把 Standard composite 或 Chart / Plot / Table preset 下沉到 Core，不以 fragment 取代完整 Path 编译，不承诺 Core 统一所有领域的 style token

## 架构验证

- 是否可由现有能力组合：可以。现有 Core 已有完整 Path、style、font、paint、stroke、Scene 和 compile 链路；本决策首先整理命名契约和复用边界，不增加平行 IR 或第二条 lowering 管线
- math / core / render / adapter 责任切分：math 继续拥有无绘图语义的纯几何；Core 拥有 JSON IR、通用图形语义和 Scene contract；render 只执行 Scene；React / Vanilla 只做等价 authoring 与宿主接线；Tier 2 在 Core 之上组合并 lowering
- 是否需要新 IR / contract / registry：需要补充可复用的 Core schema / type fragment；不需要新的 IR 顶层实体、definition 或 registry。fragment 是封闭的 JSON 数据契约，provider / kind 的开放性继续由现有 registry 承载
- Scene / manifest / renderer / diagnostics 如何闭环：完整 Path 仍编译成现有 renderer-neutral Scene 与 manifest；Scene type fragment 只改善 resolved output 的类型复用。任何不支持或非法组合继续由 Core diagnostics 或 renderer capability 诊断，不由 Tier 2 静默改写
- provenance / locator / Interaction Readiness 是否适用：本 ADR 不新增 locator 或 interaction 语义。`id`、`meta`、z-order 和已有 provenance / manifest 信息继续由现有 Core instance / Scene contract 传递；原子 fragment 不得复制这些索引字段
- 结论：下沉稳定绘图原子契约，保留完整 Core contract；Tier 2 组合、收窄并拥有领域语义；不新增 capability / preset bundle

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Primitive / Scene、Style / Resource、Composition 基础契约
- 解决的问题：让多个上层可以通过统一 Core 原子语义表达和复用图形，不再依赖大型 schema 的偶然投影或重复 style vocabulary
- 主责包与协作包：`@retikz/core` 主责；math、runtime、render、Standard、Plot、Chart、Table、React / Vanilla 按各自边界协作
- 是否可由现有能力组合：完整 Path、Scene、definition / registry 和 compile 已存在；新增的是可复用的命名契约边界
- 是否需要下沉到依赖能力域：Path style、paint、stroke、font 等稳定绘图语义应留在 Core；纯几何算法仍留在 math；Standard / Plot / Chart / Table 的领域组合不下沉
- 内部表达链路：Core schema / type fragment → 完整 Core IR → 既有 contract / provider / registry → compile / lowering → Scene / manifest
- 外部扩展链路：开放 provider 继续走既有 Definition / registry；第三方 Tier 2 组合 Core fragment，不因原子化获得绕过 Core compile 的私有路径
- 下游执行 / adapter 等价性：Scene 形态和 renderer 执行语义保持不变；React、Vanilla、headless 入口写入或消费同一 JSON / IR 与 Scene contract
- 不支持边界与诊断：不支持领域 preset、领域 layout、交互状态和 renderer 私有 style；未知字段、非法跨 fragment 组合和未消费字段必须 fail-loud 或产生既有可观察诊断
- 本轮结论：下沉 Core 原子契约，扩展当前 Drawing Complete 域的可组合表达；上层领域组合保留在 owner 包，不新增平行能力

## 绘图完备性检查

- 能力面与解决的问题：通用 Primitive / Scene 与 Style / Resource 的原子表达，消除多个上层重复定义绘图语义的缺口
- 是否属于 Drawing Complete：属于。它增强 JSON-safe、renderer-neutral 的 Core 图形表达，不引入数据、布局、renderer 或宿主语义
- 主责包与协作包：Core 主责；math、render、Standard、各 Tier 2 与 adapters 协作
- 是否可由现有能力组合：可以由现有 Path、style、Scene 和 compile 组合，首轮不新增 provider 能力
- math / core / render / adapter 的责任切分：保持现有边界，不把 fragment 验证或默认值复制到 renderer / adapter
- 是否需要新 IR / contract / registry：补充 schema / type fragment；不新增顶层 IR、registry 或 renderer contract
- Scene / manifest 如何承载：沿现有完整 Path 和 Scene primitive 输出，不改变 manifest 的 identity、metadata、z-order 或 locator 语义
- renderer 实现或诊断降级：renderer 继续按现有 Scene capability 执行；不支持能力沿既有诊断降级，不从 fragment 推导 renderer 私有行为
- React / Vanilla 如何等价暴露：若公开使用，均映射到同一 JSON / IR；不为某个 adapter 建立平行 style / path schema
- Interaction Readiness 是否适用：仅保持既有 id、meta、provenance 和 manifest 传递，不新增交互语义
- 不支持边界与本轮结论：不支持全量 preset / capability bundle 和领域语义下沉；本轮结论为在 Core 下沉稳定原子契约，并由 Tier 2 按需组合

## 被否决方案

- 删除所有 `pick` / `omit`：否决。Frame、Chart recipe、Table border 等投影表达了 owner-specific 禁用字段、默认值或领域边界，机械删除会把领域语义错误地下沉
- 把 `StandardPathStrokeStyle` 直接下沉为 Core bundle：否决。Standard 组合包含自己的呈现用途和字段选择，Core 应提供原子 stroke / paint 语义而不是 Standard composite
- 保留各 Tier 2 的重复 paint / opacity / dash / shadow / blend mode 定义：否决。相同的 Core 叶子必须只有一个语义真源，否则 schema 与 lowering 会持续漂移
- 把每个字段都拆成独立顶层 API：否决。字段数量不是原子边界；没有独立不变量或复用语义的字段会增加公共面和认知成本
- 建立 Core capability / preset 加载 bundle：否决。用户消费的是按需组合的公开契约和 Definition，bundle 不增加新的 IR、registry 或 compile 语义

## 测试策略摘要

需要锁定以下证据层：原子 fragment 的 JSON-safe、strict unknown-field 和局部不变量；完整 Path 组合后的跨字段 refinement 与既有 parse 等价；schema-derived type 与 contract 的一致性；Core lowering、Scene / manifest 和 renderer 输出等价；Standard、Plot、Chart、Table 的组合、收窄、patch 消费和 React / Vanilla parity。还需证明合法输入不会在 schema 通过后于 lowering、merge、inspection 或 manifest 阶段被静默丢弃

## 不在本 ADR 范围

- 新增 Path kind、shape、paint、marker、effect 或 renderer capability
- Box、Flex、Grid、Overlay 等领域布局算法及 Standard layout defaults
- Plot / Chart / Table 的 recipe、scale、token、patch merge 或领域 provenance 重新设计
- Table border conflict、cell cascade 和 Chart presentation 的领域契约下沉
- 通过兼容别名长期保留错误的 schema / type 分层
- capability / preset 目录的包加载机制或发包策略改造
- 本 ADR 之外的代码实现、版本发布、文档站页面和 commit / tag / publish 操作
