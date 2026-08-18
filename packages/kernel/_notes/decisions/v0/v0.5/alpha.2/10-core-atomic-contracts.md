# ADR-10：Core 原子绘图契约与 Tier 2 / Tier 3 组合边界

- 状态：Accepted
- 决策日期：2026-08-03
- 接受日期：2026-08-04
- 关联：[ADR-11](./11-layout-aware-scope-output.md)

## 背景与目标

Core 当前已经拥有若干可复用的叶子契约，但完整的路径基础契约同时承载了实例身份、通用图形样式、描边、填充、路径几何、provider 选择、标记、标签和结构字段。Standard、Plot 等 Tier 2 及 Chart 等 Tier 3 在表达自己的输入时，因而反复从大型 Core schema 中 `pick` / `omit` 字段，或者重新声明已经属于 Core 的 paint、opacity、dash、shadow、blend mode 等词汇

这会带来三类长期问题：

1. 上层组合依赖底层 schema 的偶然字段组织，而不是依赖可读的稳定语义
2. 同一字段可能在 schema、类型、lowering、patch merge 或 inspection 中出现多份白名单，新增字段时容易出现接受但未消费的漂移
3. 为了减少一次投影而把上层领域默认、禁用字段或 preset 反向下沉，会形成更大的底层 bundle，模糊 Core、Standard 与领域包的所有权

本 ADR 的目标是冻结一条长期规则：Core 向外导出按稳定语义划分的原子 schema/type，Tier 2 / Tier 3 按需组合并保有自己的领域语义；原子化不等于把每个字段机械公开，也不等于建立能力加载 bundle 或 preset 层

## 决策：Core 提供原子契约，上层拥有组合与收窄

Core 在不改变现有完整 Path 语义的前提下，提供可独立复用的严格 Zod schema，并同步导出由 schema 推导的 `IRXxx` 类型。完整 Path 契约组合这些原子；Tier 2 / Tier 3 可以组合或按 owner 语义收窄原子，但不从完整 Path 偶然投影出平行词汇

通用 style 按以下稳定语义组织：

- `GraphicPaintSchema`：`color`、`fill`、`stroke`
- `GraphicOpacitySchema`：`opacity`、`fillOpacity`、`strokeOpacity`
- `GraphicEffectsSchema`：`shadow`、`blendMode`
- `StrokeStyleSchema`：`strokeWidth`、`dashPattern`、`dashOffset`

跨聚合复用的稳定 value leaf 由 Core 提供命名 schema：

- `FontFamilySchema`、`FontSizeSchema`、`FontWeightSchema` 与 `FontStyleSchema`：字体族、字号、字重与字体样式
- `TextAlignSchema` 与 `LineHeightSchema`：多行文字对齐与用户单位行高
- `StrokeWidthSchema`：非负的用户单位描边宽度

`FontSchema`、Node 文字字段与 `StrokeStyleSchema` 必须组合这些 leaf，而不是让上层从聚合 schema 的偶然字段结构提取约束。value leaf 只冻结既有值边界，不拥有宿主字段的 optional、默认、继承或领域 token 语义

路径按以下稳定语义组织：

- `PathStrokeSchema`：复用 `StrokeStyleSchema`，并增加 `lineCap`、`lineJoin`
- `PathFillSchema`：`fillRule`
- `PathGeometrySchema`：`roundedCorners`、`rotate`、`scale`、`children`
- `PathDecorationSchema`：`label`、`marks`
- `PathStructureSchema`：`type`、`kind`、`kindOptions`、`ribbon`

对应数据类型固定为 `IRGraphicPaint`、`IRGraphicOpacity`、`IRGraphicEffects`、`IRStrokeStyle`、`IRPathStroke`、`IRPathFill`、`IRPathGeometry`、`IRPathDecoration` 与 `IRPathStructure`，全部由对应 schema 通过 `z.infer` 推导。`strokeWidth` 与 dash 是 Core 共享描边词汇，不属于 Path 独占语义；`PathStrokeSchema` 只是 Path 所需描边字段的稳定组合

现有 `GraphicStyleSchema`、`CascadingGraphicStyleSchema`、`DrawableStyleSchema`、`PathBaseSchema`、`PathSchema`、`PathDefaultSchema` 及其派生类型继续作为兼容聚合契约。它们改由上述原子组合，但首轮不删除名称、不扩大或收窄接受字段：`GraphicStyleSchema` 继续接受当前的 `strokeWidth`，`CascadingGraphicStyleSchema` 继续保留当前可继承字段，完整 Path 继续保持当前字段集合与 refinement。聚合与原子出现同名字段时必须复用同一个叶子 schema 实例，不复制约束或描述

通用的 `DrawableInstanceSchema` 与其它基础词汇继续由 Core 各自拥有。共享原子与上述 Path fragment 组合为完整的 Path authoring / IR 契约；完整契约继续负责跨 fragment 的 kind、结构和字段关系校验。fragment 自身只负责 strict unknown-field 与稳定局部不变量，不因独立复用而成为另一个 Path 编译入口

Core 的原子契约遵循以下原则：

1. 原子边界按可观察语义、不变量和扩展边界划分，不按字段数量拆分
2. 原子 schema 是字段接受、描述、派生类型与聚合组合的单一真源；compile / lowering 与 Scene / manifest 继续消费完整 IR，不得因上层组合便利复制一套平行词汇或消费路径
3. 稳定的 Core 叶子优先复用。`GraphicStyleSchema` 与 `CascadingGraphicStyleSchema` 可以继续保持不同组合，因为 effect 是否可继承是不同契约；Node border、Scope default 等也可在各自 owner 内组合并保留不同默认和继承规则
4. 完整 Path 契约继续存在，作为合法 Path 的统一入口；原子 fragment 不是替代完整 Path 的新 preset，也不要求调用方按固定 bundle 加载能力
5. Path kind、custom provider、marker、paint、font 等需要扩展时，继续沿既有 Core contract / registry / pipeline；原子化本身不新增 parallel registry

### 最小契约形态

以下表达的是稳定语义形态，不规定具体 schema 拼装方式或内部文件组织：

```ts
type IRGraphicPaint = {
  color?: CssColor;
  fill?: PaintValue;
  stroke?: PaintValue;
};

type IRGraphicOpacity = {
  opacity?: Opacity;
  fillOpacity?: Opacity;
  strokeOpacity?: Opacity;
};

type IRGraphicEffects = {
  shadow?: Shadow;
  blendMode?: BlendMode;
};

type IRStrokeStyle = {
  strokeWidth?: number;
  dashPattern?: StrokeDashPattern;
  dashOffset?: StrokeDashOffset;
};

type IRPathStroke = IRStrokeStyle & {
  lineCap?: PathLineCap;
  lineJoin?: PathLineJoin;
};

type IRPathFill = {
  fillRule?: PathFillRule;
};

type IRPathBase = IRDrawableInstance &
  IRGraphicStyle &
  IRPathStroke &
  IRPathFill &
  IRPathGeometry &
  IRPathDecoration &
  IRPathStructure;

type IRPathDefault = IRGraphicStyle & IRPathStroke & IRPathFill & Omit<IRPathGeometry, 'children'>;
```

以上类型只说明公开组合关系；schema 是字段约束、默认语义与描述的单一真源。`IRGraphicStyle` 继续对应兼容聚合 `GraphicStyleSchema`，因此保留现有 `strokeWidth`。`IRPathGeometry`、`IRPathDecoration` 与 `IRPathStructure` 的字段按前述清单固定，并继续服从现有 Path 的 JSON-safe、strict unknown-field 和 kind-specific refinement 规则。`IRPathDefault` / `PathDefaultSchema` 是 Core Scope owner 的兼容组合，不从完整 Path 偶然 `omit`；它排除 instance、structure、decoration 与 `children`，保持当前接受字段集合。原子只提供可复用的数据边界，不承诺能独立编译为 Scene

`Scope.pathDefault` 的消费继续按 Path kind 保持当前语义：普通 stroke path 接受并消费 `IRPathDefault` 的全部适用字段；ribbon 只消费其中的 `IRGraphicStyle` 子集，包括 `color`、paint、`strokeWidth`、opacity 与 effect，不消费 `dashPattern`、`dashOffset`、`lineCap`、`lineJoin`、`fillRule`、`roundedCorners`、`rotate` 或 `scale`。这些 Path-only 默认字段对 ribbon 继续保持 schema 可接受但不适用，不新增诊断；显式写在 ribbon 自身的合法 Path 字段仍按完整 Path 契约处理

Scene、manifest 与 renderer 输出只用于证明本轮重组前后等价。Scene type-only fragment、primitive type 重组和 renderer contract 原子化不属于本 ADR 首轮交付；未来如实施，必须按 resolved Scene 语义独立设计，不能直接复用 authoring IR schema

## Tier 2 / Tier 3 组合规则

Tier 2 / Tier 3 在表达与 Core 同义的绘图字段时必须消费 Core 原子契约，并由自身负责组合、默认值、禁用字段、输入收窄和领域语义：

- Standard 的 `StandardPathStrokeStyle` 保留为 Standard presentation composite 的组合输入。它服务 Grid、Axes、Frame 等多个 Standard consumer，但不是 Core 应提供的通用 path bundle
- Standard 的 border、layout item、presentation defaults 继续由 Standard 拥有；Core 只提供可复用的绘图语义，不拥有 Standard 的布局或 preset 默认
- Plot 可以组合 Core 的 paint、opacity、stroke、effect、font 和 path fragment，但 `drawOpacity`、guide 几何、mark value 绑定和 visualization theme mapping 继续由 Plot 拥有
- Chart 等 Tier 3 可以继续对 Point、Path、Frame 和 presentation 输入做领域收窄。recipe-owned spatial fields、禁用字段和 Chart token 不因减少 `pick` / `omit` 而下沉到 Core
- Table 的 line border、shared-edge priority、cell content cascade 等具有表格语义的契约继续由 Table 拥有；Table 可以复用 Core 叶子，但不直接把 Table border 变成 Core Path stroke
- Data 继续以自己的 schema、contract、provider 和 pipeline 为真源，不因本 ADR 增加绘图 style bundle

因此，`pick` / `omit` 的判断标准不是“是否出现”，而是它是否表达了上层自己的 owner 语义。上层可以从一个 Core 原子继续 `pick` / `omit` 自己的子集；不得再从 `PathBaseSchema` 等完整聚合契约投影已由原子命名的同义字段。首轮迁移覆盖仓库内直接依赖完整 Core 聚合做同义投影的 Standard 与 Plot；Chart、Table 或其它 Tier 3 只有存在直接重复 Core 词汇时才修改，领域 owner 投影和经 Standard / Plot 间接消费不为凑迁移范围改写

## 单一真源与字段消费闭环

每个原子字段只在一个权威叶子 schema 中声明约束与 `.describe(...)`；原子、兼容聚合和上层组合通过复用该 schema 实例形成接受契约，公开类型从对应 schema 推导。凡是允许 sparse patch、主题覆盖或领域 projection 的能力，接受字段、派生类型和最终消费必须可追溯到这份语义契约。除兼容聚合已明示的 kind-specific 不适用字段外，schema 通过的字段不得在 lowering、merge、inspection 或 manifest 阶段被静默丢弃；新增字段必须同时保持输入校验、类型表达和最终产物的一致性

这一规则不要求所有 Tier 2 共享一个大 schema。领域 owner 可以只开放 Core fragment 的子集，但该子集必须明确属于该领域，并且其默认、禁用字段和失败诊断不能被 Core 的通用契约掩盖

## 行为、失败语义与兼容性

- 默认行为：现有 `GraphicStyleSchema`、`CascadingGraphicStyleSchema`、`DrawableStyleSchema`、`PathDefaultSchema`、完整 Path、Node、Scope、Scene、Standard composite 以及 Tier 2 / Tier 3 的默认值和 lowering 结果保持不变。原子契约为可组合的表达入口，不改变省略字段的既有默认和继承语义
- 失败与诊断：fragment 对未知字段保持 strict 失败；完整 Path 继续负责 kind、provider、ribbon、children 等跨 fragment 约束。除 `PathDefaultSchema` 已冻结的 ribbon kind-specific 不适用字段外，schema 接受但 pipeline 未消费的字段视为契约错误，不得静默忽略
- 兼容性 / breaking：本轮只新增原子 schema/type export，并以原子重组既有聚合；现有公开名称、合法输入、非法输入、IR JSON 形态、默认值、refinement、compile / lowering 和 Scene 结果必须等价。删除旧公开名称、改变接受范围或改变领域默认必须另行说明并通过对应版本门禁，不以本 ADR 自动授权
- React / Vanilla 等价性：本 ADR 不新增宿主专属语义。Core fragment 若被 React 或 Vanilla 暴露，两个 adapter 必须写入同一 JSON / IR 契约；不存在的宿主能力应明确不适用，不得在 adapter 内复制一份 fragment schema

## 功能与包边界

- 所属能力域与解决的问题：Drawing Complete；解决后端中立绘图契约缺少稳定原子边界、上层重复投影和跨层字段漂移的问题
- 主责包与协作包：`@retikz/core` 主责；`@retikz/math` 提供纯几何基础；`@retikz/render` 执行 Scene；`@retikz/standard`、Plot、Chart、Table 和 adapters 协作消费
- 拥有：Core 的 JSON-safe schema fragment、derived type、通用绘图 style / path 语义、完整 Path 组合及其跨字段校验
- 不拥有：Tier 2 的领域 token、preset 具体值、布局规则、recipe-owned patch、表格边界冲突、交互状态、renderer 特有能力以及 adapter 生命周期
- 外部扩展与下游闭环：自定义 Path kind、shape、paint、marker 等仍通过现有 Definition / registry / compile contract；fragment 只描述数据契约，不创建新的扩展注册点。Core 输出现有 Scene / manifest，render、React、Vanilla 与 headless consumer 继续消费同一产物
- 不支持边界：不提供按场景加载的全量 capability bundle，不把 Standard composite 或 Chart / Plot / Table preset 下沉到 Core，不以 fragment 取代完整 Path 编译，不承诺 Core 统一所有领域的 style token

## 最终结果
Core 已公开严格的 style / Path fragment 与字体、文字、描边 value leaf，并以同一叶子 schema 实例重组既有 Font、Node、Stroke、style、Path 与 Scope 默认聚合。Standard 与 Plot 的直接完整 Path 投影已迁移为按 owner 语义组合原子 fragment；Chart、Table、compile、Scene、renderer 与 adapter 保持原有边界和行为

## 长期边界

- 新增 Path kind、shape、paint、marker、effect 或 renderer capability
- Box、Flex、Grid、Overlay 等领域布局算法及 Standard layout defaults
- Plot / Chart / Table 的 recipe、scale、token、patch merge 或领域 provenance 重新设计
- Table border conflict、cell cascade 和 Chart presentation 的领域契约下沉
- 通过兼容别名长期保留错误的 schema / type 分层
- capability / preset 目录的包加载机制或发包策略改造
- Scene primitive type fragment、renderer contract 或 manifest 数据结构重组
- 版本发布、tag、publish 或 push 操作
