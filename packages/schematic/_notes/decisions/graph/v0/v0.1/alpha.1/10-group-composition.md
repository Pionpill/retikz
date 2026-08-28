# ADR-10：Group 通用包含与边界呈现

- 状态：Accepted
- 决策日期：2026-08-26
- 关联：[Graph alpha.1 roadmap](./roadmap.md) · [Graph context](./09-composable-graph-context.md)

## 背景与目标

Graph 需要一种可持久化的包含语义，表达“这些内容共同属于一个可见分组”。代码结构图、流程图、系统架构图和未来 Diagram compound layout 都需要可嵌套边界；它不能退化为纯视觉矩形，也不能重新建立 Graph-root 成员数据库

Group 接受任意 Core / Tier 2 child，支持框内 caption 和边界 labels，并复用 Core Scope、Layout 与 Standard Surface。它向未来 Diagram 提供 compound structure，但不拥有成员位置、自动布局、routing、避障或 Editor 状态

## 决策

### 可嵌套的语义包含边界

`IRGroup.children` 与 Core `IRChild` 同源，可以包含 Entity、Relation、Group、普通 Core 内容、Layout、Plot、Table 或其它已注册 composite。嵌套 Group 只通过 Source 内容树表达包含，不定义 Graph-only child union、成员索引或隐式 namespace

Group 是闭合结构能力，不建立 role、kind、predicate 或新的 Definition registry。未来 Diagram 可以消费 Group 树进行 compound layout 和跨边界 routing；Group 自身不选择布局 provider 或计算 child 位置、边界与 route

### Scope、identity 与 Graph context

Group 组合完整 `IRScopeProps`。id、localNamespace、Core `theme`、transform、placement、default channels、resetStyle、zIndex、clip、boundingShape、meta 与 animations 保持 Core 名称、默认、继承和诊断

显式 Group id 对应最终 Surface 外框，并在父 namespace 中发布可引用几何；省略 id 时不生成任何 identity。Relation 连接 Group 时复用 Core NodeTarget，不建立 Group 专属 endpoint

Group 可以声明 `graphTheme`，并沿用 ADR-09 的传播边界：只影响可见 Entity / Relation；普通 Core Scope 不切断继承；显式 Core `theme` 建立新 baseline；嵌套 Graph / Group 从外到内叠加；第三方 composite 内部保持不透明

### Surface 外框

Group 的 padding、background、border、cornerRadius 与 overflow 直接复用 Standard Surface 的输入、schema 和 layout-aware lowering。Group 不复制 Surface 的 spacing、proposal、clip、background、border、圆角或 bounds 算法

默认值为：

- padding：`10`
- background：`lightgray`，fillOpacity `0.04`
- border：`lightgray`，strokeWidth `1`，dashPattern `[4, 3]`
- cornerRadius：`4`
- overflow：`visible`
- boundingShape：`rectangle`
- localNamespace：`false`

所有 children 按自身 allocation 规则贡献 body bounds。跨 Group 的 Relation 是否影响某个 Group 的 bounds 由其 Source 放置位置决定，Group 不根据拓扑排除内容

### Caption

可选 `caption` 表达 Surface 内的 title / description。side 为 top 或 bottom，默认 top；direction 为 horizontal 或 vertical，默认 horizontal；itemGap 和 bodyGap 默认 `4`，且必须是非负有限数

Caption 至少包含 title 或 description。文本复用 Core Node 的 text、align、lineHeight、maxTextWidth、textColor、font 与 opacity，不接受 identity、position、shape、boundary、padding、fill、stroke 或 label

Title 默认字号为 `sm`；description 默认字号为 `xs`、opacity 为 `0.7`。显式字段覆盖对应默认。Caption 位于 Surface padding 内并参与 allocation；body 为空时不产生 bodyGap。局部排列复用 Layout 的公开能力

### Boundary labels

`labels` 直接复用 Core `NodeLabelSchema` / `IRNodeLabel`，不定义 Group 专属位置、boundary、placement 或几何词汇。省略值时使用：

- position：`{ boundary: 'bottom', fraction: 0 }`
- placement：Core 默认 `outside`
- align：attachment-tangent `start`
- font size：`xs`
- textColor：`gray`

label 显式字段具有最高优先级，opacity 和其它未覆盖字段继续使用 Core label cascade。Boundary labels 不参与 Group allocation，只按 Core Node label 规则扩展 visual bounds；多个同位置 label 保持 authored order，不自动堆叠或避让

Surface overflow 只裁剪 content，不裁剪外围 labels；显式 Scope clip 仍作用于完整 Group output。Group identity 和 Relation endpoint 始终以 Surface 外框为准，不因长 label 改变

### Source 与 authoring

```ts
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

Scope、Surface、caption text、Node label 与 children 均组合对应 owner 的公开 schema / type。Direct IR、React 与 Vanilla 构造同一 Source；adapter 不生成 id、建立成员数组、解释 boundary 或计算 layout

## 行为、失败语义与兼容性

- child、provider 或 compile 失败继续使用对应 owner 的诊断
- caption 空对象、非法 side / direction、负数或非有限 gap 在 Group schema 拒绝
- labels 完整沿用 Core NodeLabel refinement，不接受同义别名或 Graph fallback
- Group presentation、caption、labels 与 children 必须 JSON-safe
- id、namespace、placement、transform、clip 与 boundingShape 沿用 Core 语义
- Empty、caption-only、labels-only 与 nested Group 均合法
- Group 不自动布局 children，不执行 label collision、compound layout、cross-boundary routing 或避障
- Standard Frame、历史 Container 和旧容器结构不成为 Group alias、fallback 或双轨输入

## 结果

Group 以单一 Source contract 组合 Core Scope、Standard Surface、Layout caption 和 Core Node labels。它提供可嵌套的可见包含边界，同时把布局、几何、引用和渲染交给既有 owner
