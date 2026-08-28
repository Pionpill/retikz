# ADR-10：Group 通用包含与边界呈现

- 状态：Accepted
- 决策日期：2026-08-26
- 关联：[Graph v0.1 alpha.1 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [Graph 可选上下文与可组合 Relation 引用](./09-composable-graph-context.md)

## 背景与目标

Entity 与 Relation 已能独立出现在任意 Core 内容树，Graph 也已收敛为可选上下文，但 Graph 仍缺少一种可持久化的包含语义，用来表达“这些内容共同属于一个可见分组”。代码结构图、流程图、系统架构图和未来 Diagram compound layout 都需要可嵌套的边界；它既不能退化为只有视觉矩形的页面 recipe，也不能重新建立 Graph-root 成员数据库

Standard Frame 曾提供固定上方 title / description 和 Node-only body，但它限制 child 类型、把 caption 与 body 间距混为单一字段，并自行维护外框与文字布局。Group 需要接受任意 Core / Tier 2 child、支持上下 caption 和边界内外 labels，同时直接复用 Core、Layout 与 Standard 的公开能力。Group 不成为 Frame 的别名或迁移入口，Standard Frame 的后续移除由 Standard 自身版本处理

本决策建立第四类 Graph semantic composite `Group`：它保存通用包含边界和可见呈现，向未来 Diagram 提供 compound structure，但不拥有成员位置、自动布局、routing、避障或 Editor 状态

## 决策

### Group 是可嵌套的语义包含边界

`IRGroup.children` 与 Core `IRChild` 同源，可以包含 Entity、Relation、Group、普通 Node / Path / Scope、Layout、Plot、Table 或其它已注册 composite。Group 不定义 Graph-only child union，不收集成员、不建立 identity 索引，也不把 child 类型改写为 Graph member。嵌套 Group 只通过 Source 内容树表达包含关系

未来 Diagram 可以遍历 Group 内容树，把它作为 compound layout、分组边界和跨边界 routing 的结构输入；Group 自身不选择布局 provider，不计算 child 位置、边界或 route。需要普通排版时，作者在 Group children 中显式组合 Flex / Grid / Overlay 等 Layout，或由未来 Diagram 产出已经确定的内容

Group 是闭合的结构能力，不建立 group role、kind、predicate 或新的用户 Definition registry。内置 Group 与 adapter 仍通过 Graph composite provider 进入 Core 的统一 Definition / registry 路径；appearance、caption、labels 与任意 children 已构成其公开扩展面

### Group 组合完整 Scope 与局部 Graph context

Group Source 组合完整 Core `IRScopeProps`。`id`、`localNamespace`、Core `theme`、transforms、placement、default channels、resetStyle、zIndex、clip、boundingShape、meta 与 animations 保持 Core 名称、schema、默认、继承和诊断；Group 不复制或收窄 Scope surface

显式 Group id 落在稳定的最外层 Core Scope，并在父 namespace 中发布该 Group 外框的可引用几何；省略 id 时不生成 Source id、Core id 或 Diagram identity。Relation 连接 Group 时继续使用 Core NodeTarget 与 namespace，不建立 Group endpoint wrapper

Group 可以声明 `graphTheme`，并沿用 ADR-09 的 Graph context 规则：只影响 schema 可见的 Entity / Relation 后代，穿透普通 Core Scope，遇到显式 Core `theme` 的 Scope / Graph / Group 时切断外层 Graph-local layers，遇到嵌套 Graph / Group 时从外到内叠加当前 layer，第三方 composite 内部保持不透明。Group 外框、caption、labels 与普通 Core / Tier 2 children 不消费 `graphTheme`

### Surface 拥有 Group 外框

Group 的 padding、background、border、cornerRadius 与 overflow 直接复用 Standard Surface 的公开输入、schema 和 layout-aware lowering。Group 只在自身 Source 上声明下述领域组合默认，不改变 Surface 独立使用时的默认。Group 不引用 Standard Frame，不复制 Surface 的 spacing 归一化、proposal、clip、background、border、圆角或 bounds 算法

Group body 是一个承载 authored children 的普通内部 Scope，并作为 Surface content 的组成部分。所有 child 按自身 Core / Tier 2 allocation 规则贡献 body bounds；Group 不按 Entity、Relation 或其它类型排除 contribution。跨 Group 的 Relation 若不应扩大某个 Group，应由作者或 Diagram 声明在适当的共同祖先，而不是由 Group 猜测拓扑并忽略其几何

Group 的默认 padding 为 10，默认 background 为 `lightgray`、fillOpacity 0.04，默认 border 为 `lightgray`、strokeWidth 1、dashPattern `[4, 3]`，cornerRadius 默认为 4，overflow 默认为 visible。`boundingShape` 缺省 rectangle，`localNamespace` 缺省 false；显式 Scope 或 Surface 字段保持各自 owner 的优先级和失败语义

### Caption 是外框内的结构化说明区

Group 使用可选 `caption` 表达框内 title / description。Caption 的 `side` 为 top 或 bottom，默认 top；`direction` 为 horizontal 或 vertical，默认 horizontal。`itemGap` 表示 title 与 description 的间距，`bodyGap` 表示 caption 与非空 body 的间距，二者默认 4，必须为非负有限数

Caption 至少包含 title 或 description。两类文本直接组合 Core Node 的 text、align、lineHeight、maxTextWidth、textColor、font 与 opacity 字段 schema，不接受 id、position、shape、boundary、padding、margin、fill、stroke、label 或其它 Node identity / geometry 字段。Title 缺省使用 `sm` 且不指定粗细；description 缺省使用 `xs`、opacity 0.7；显式字段最终覆盖对应缺省

Caption 位于 Surface padding 内并参与 Group allocation：top 顺序为 caption、bodyGap、body，bottom 顺序为 body、bodyGap、caption。没有非空 body 时不产生 bodyGap。Caption 内部排布直接复用 Layout 的公开布局与 probe / replay 语义，不复制 Flex solver 或 Standard Frame 的手工排布算法

### Labels 直接复用 Core Node label

Group 使用可选 `labels: ReadonlyArray<IRNodeLabel>` 表达附着在外框内外的文字。Graph 不定义 `GroupLabelSchema`、`GroupLabelPositionSchema`、`GroupLabelBoundaryPositionSchema`、同义值类型或位置常量；每个元素直接使用 Core `NodeLabelSchema` / `IRNodeLabel`，其中 position、`{ boundary, fraction }`、placement、distance、rotate、keepUpright、pin、字体与外观的 schema、值类型和 refinement 均以 Core 为唯一真源

Group 外框是 box-like label host。lowering 使用一个与最终 Surface allocation 完全重合、无公开 id、无可见 shape 的 Core rectangle Node 承载这些 labels，因此八方向、center、数字角度、Core boundary position、旋转后视觉盒净距、inside / outside、pin、Core label style cascade、Scene 输出与 bounds 都走 Node 的 canonical resolve / layout / emit 路径。Graph 不只复用 schema 后重写测量或边界几何。Group 只为边界 labels 在 host lowering 处提供 `{ boundary: 'bottom', fraction: 0 }` 的省略位置默认，使文字附着在外框下边界左端并向外侧下方偏移；显式 position 仍完全按 Core 解析

Group host 为 boundary labels 注入与 description 对齐字号、并使用灰色文字：`font.size` 为 `xs`、`textColor` 为 `gray`；label 自身显式字体与颜色字段保持优先，`opacity` 仍沿用 Core 的 labelDefault 解析，不由 Group 默认改写

Boundary labels 不参与 Group allocation，也不改变 Surface 尺寸或 caption / body 排布；它们按 Core Node label 规则扩展 visual bounds。多个 label 位于相同位置时保持 authored order，不自动堆叠或避让。Surface overflow 只裁剪 Surface content，不裁剪外围 labels；显式 Core Scope `clip` 仍按完整 Scope 语义作用于 Group output

无可见 shape 的 label host 同时为最外层 Scope 提供与 Surface 一致的矩形 layout envelope，使 Group id、boundingShape、Scope placement 与 Relation endpoint 以外框为准，而不因长 label 改变。该内部 Node 不发布 id，不成为 Graph member、Relation endpoint、Diagram entity 或 authored provenance

Group 的 Core `nodeDefault` 继续作用于 authored descendants，但不能使 caption 的测量 Node 或 label host 产生可见 shape、公开 identity 或额外 allocation。Group host 注入的默认字号与颜色优先于 Core `labelDefault`，`labelDefault` 仍补齐其它未注入字段；单个 label 的显式字段保持最高优先级

### Direct IR、React 与 Vanilla 使用同一 Source

Direct IR、React `Group` 与 Vanilla `group` 产出同一个 `IRGroup`。React children 只负责把任意可嵌入内容归一为 `IRChild`，Vanilla 只把 typed authoring Input 组装为 Group Source；adapter 不建立 Group member 数组、生成 id、解释 position / boundary、计算 caption layout 或重写 Surface / Node label 默认

Group 作为独立 composite 可以出现在 Scene、Layout、Graph、Group 或其它接受 Core child 的位置。它不建立 standalone Scene host；需要独立渲染时继续由普通 Layout / Graph host 承载

## 基础数据结构与公开契约

Group Source 的长期最小结构为：

```ts
type IRGroupCaptionText = Readonly<{
  text: NonNullable<IRNode['text']>;
  align?: IRNode['align'];
  lineHeight?: IRNode['lineHeight'];
  maxTextWidth?: IRNode['maxTextWidth'];
  textColor?: IRNode['textColor'];
  font?: IRNode['font'];
  opacity?: IRNode['opacity'];
}>;

type IRGroupCaption = Readonly<{
  side?: Extract<SideValue, 'top' | 'bottom'>;
  direction?: 'horizontal' | 'vertical';
  itemGap?: number;
  bodyGap?: number;
  title?: IRGroupCaptionText;
  description?: IRGroupCaptionText;
}>;

type IRGroup = IRScopeProps &
  Readonly<{
    namespace: 'graph';
    type: 'group';
    graphTheme?: IRGraphThemeLayer;
    caption?: IRGroupCaption;
    labels?: ReadonlyArray<IRNodeLabel>;
    padding?: SurfaceInput['padding'];
    background?: SurfaceInput['background'];
    border?: SurfaceInput['border'];
    cornerRadius?: SurfaceInput['cornerRadius'];
    overflow?: SurfaceInput['overflow'];
    children?: ReadonlyArray<IRChild>;
  }>;
```

`IRGroup` 由 Graph schema 唯一派生；上面的结构只表达跨 owner 的公开组合关系。Scope properties、Surface fields、Node caption text fields、`IRNodeLabel`、`SideValue` 与 `IRChild` 均直接组合对应 owner 的公开 schema/type，不在 Graph 手写平行 primitive、枚举或默认。`children` 省略时按空数组消费；`labels` 出现时必须非空

## 行为、失败语义与兼容性

- Group children 可以是任意合法 Core child；未知 composite、缺失 provider、child 自身 schema 或 compile 失败继续使用 Core / 对应 owner 的原诊断，Graph 不改写为成员错误
- Caption 空对象、未知 side / direction、负数或非有限 gap 由 Group schema fail-loud；caption text 的 JSON、文字、字体、颜色、opacity、换行与宽度约束直接沿用 Core Node 字段诊断
- Group labels 的 `align`、position、boundary、fraction、placement、distance、rotate、keepUpright 与 pin 完整沿用 Core `NodeLabelSchema`；省略 `align` 时，Group host 注入 Core attachment-tangent `start`，显式 `align` 保持作者优先级；省略 position 时，Group host 默认使用 Core boundary position `{ boundary: 'bottom', fraction: 0 }`，并保持 Core 默认的 `placement: outside`；省略字体与颜色时，Group host 默认使用 description 的 `xs` 字号与灰色 `gray`，显式 label 字段保持优先，opacity 继续沿用 Core `labelDefault`。Graph schema 不接受同义别名，不补 Graph 专属错误或 fallback
- Group labels、caption 与 Surface presentation 必须 JSON-safe；ReactNode、函数、DOM、renderer resource、layout solver 状态、selection、history 与 transaction 不进入 Source IR
- Group id 的重复、local namespace、Scope target、placement、transform、clip 与 boundingShape 使用 Core 统一语义；Graph 不预检 child id，也不为 caption、Surface 或 label host 生成可见 identity
- Core `theme` 与 Scope default channels 正常影响对应 authored descendants；`graphTheme` 只影响 Entity / Relation。Caption、Surface 与 label host 不参与 Graph Theme selector，也不改变 selector context
- Empty Group 合法，并按默认 padding / background / border / corner radius 形成确定的空 Surface；caption-only、labels-only 与 nested Group 保持同一最外层 Scope 和 Surface 根形状
- Group 不自动排布 authored children、不排除 Relation allocation、不执行 label collision、compound layout、cross-boundary routing 或避障；这些行为只能由显式 Layout、作者或未来 Diagram 拥有
- Standard Frame、历史 Container 名称或旧容器结构不成为 Group alias、fallback、re-export 或双轨 Source。Group 是 v0.1 alpha.1 的新增契约，没有已发布 npm 输入需要兼容

## 结果

Group 已形成 Direct IR、React 与 Vanilla 的同源闭环。外框、caption、body allocation 与 boundary labels 分别复用 Standard Surface、Layout 和 Core Node label 主链；Group id 与 Relation endpoint 以 Surface 外框为准，外围 label 只扩展 visual bounds

嵌套 Graph / Group 从外到内叠加 `graphTheme`，显式 Core `theme` 切断外层 Graph-local layer，且最终只影响 Entity / Relation。Group 不自动排列 authored children，不解释跨边界 Relation，也不处理 routing、避障或 label collision
