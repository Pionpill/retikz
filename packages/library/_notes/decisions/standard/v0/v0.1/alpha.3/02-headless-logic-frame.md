# ADR-02：Headless GraphFrame（历史验证）

- 状态：Superseded（由 [Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 取代；2026-08-15）
- 决策日期：2026-08-01
- 关联：[alpha.3 roadmap](./roadmap-graph-history.md) · [ADR-01](./01-logic-diagram-profile.md) · [alpha.2 Box Layout](../alpha.2/roadmap.md) · [Core layout-aware composite](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.1/07-layout-aware-composite.md)
- 后继：[Graph alpha.1 ADR-01](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/alpha.1/01-graph-package-family.md) 已把 GraphFrame 迁入 Graph，并继续复用 Layout 公共组合契约

## 背景与目标

逻辑图经常需要比单行流程节点更丰富的内容，例如输入、配置、伪代码、输出、类成员、schema、context 与 payload。为每一种内容建立封闭 Standard schema 会把软件设计术语和业务模型固化进绘图库；只接受一个自由 Scope 又会丢失统一外框、纵向区域、约束布局、section identity 与定位能力。

本 ADR 建立内容 headless、外观中性可用的 `GraphFrame`。Standard 只提供框、header、authored-order sections、spacing、appearance、target 与 artifact，不解释任何 child 的内部含义。

## 决策：固定纵向外壳，内容完全由 IRChild 组合

`GraphFrame` 是公开、可持久化的 layout-aware composite。header 与每个 section 都只接收任意 JSON-safe `IRChild`；Process、Class、Data 等结构只作为 docs 内部 recipe 组合，不形成公开 discriminator 或 schema。

理由：

1. 固定外壳提供一致布局、目标和 artifact，解决重复手算边框与 section bounds 的真实问题
2. 任意 `IRChild` 已经是 Core / Standard 统一扩展面，不需要 Block kind registry 或 render callback
3. authored-order sections 同时适合直接作者、工具和 LLM，且不会维护第二份顺序真源

## 基础数据结构与公开契约

```ts
type GraphFrameRegionInput = {
  child: IRChild;
  padding?: number | IRBoxSpacing;
};

type GraphFrameSectionInput = GraphFrameRegionInput & {
  key: string;
  role?: string;
};

type GraphFrameAppearanceInput = {
  style?: IRDrawableStyle;
  cornerRadius?: number;
  dashPattern?: IRPathBase['dashPattern'];
  dashOffset?: IRPathBase['dashOffset'];
  divider?: false | LogicOutlineAppearanceInput;
  zIndex?: number;
};

type LogicOutlineAppearanceInput = Pick<
  IRPathBase,
  | 'color'
  | 'stroke'
  | 'strokeWidth'
  | 'strokeOpacity'
  | 'opacity'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
>;

type GraphFrameInput = {
  id: string;
  header?: GraphFrameRegionInput;
  sections: Array<GraphFrameSectionInput>;
  size?: LayoutSizeInput;
  padding?: number | IRBoxSpacing;
  rowGap?: number;
  overflow?: 'visible' | 'clip';
  appearance?: GraphFrameAppearanceInput;
};
```

`padding` 是所有 region 的默认内部 padding；header / section 自身的 padding 可以覆盖它，不再叠加第二层 outer padding。`sections` 的数组顺序是唯一布局与 paint 顺序。省略 section 表示不创建该区域，不提供 `visible` 字段或独立 order。

canonical IR 显式包含 `namespace: 'standard'`、`type: 'logicFrame'` 与 schema defaults。Factory、React 与 Vanilla 必须经过同一 schema 得到 canonical IR。

typed artifact 的完整公开形态为：

```ts
type GraphFrameArtifact = {
  kind: 'logicFrame';
  id: string;
  outer: LogicOuterArtifact;
  container: LayoutArtifactContainer;
  header: LogicLayoutItemArtifact | null;
  sections: Array<{
    key: string;
    role?: string;
    geometry: LogicLayoutItemArtifact;
  }>;
  dividerVisualBounds: Array<LayoutArtifactRect>;
};
```

artifact 使用 strict JSON schema；所有 rect 与 translation 都沿用 alpha.2 layout artifact 合同，位于当前 Block allocation coordinate。`container` 只描述 header / section content layout，contentBounds 包含 padding，visual / visible 不包含 outer shell 或 divider。`outer.shellVisualBounds` 包含 Block fill、outline 与 shadow；`dividerVisualBounds` 按实际 paint order 保存每条 divider 的可见包络。`outer.visualBounds` 是 shell、container.visualBounds 与全部 divider 的 union；`outer.visibleBounds` 是 shell、container.visibleBounds 与 divider 的 union，content overflow 不裁剪 shell 或 divider。header 独立保存，sections 数组顺序和 key 与 authored sections 完全一致，因此不需要伪造 `LayoutArtifactItemBase.key/sourceIndex`。

整体 Block 可立即由 `LogicDiagramTarget` 定位；artifact 仍完整保存每个 authored section 的 key 与 geometry。当前 Core 没有 composite-owned structured subtarget，因此带 `section` 的 target 在消费方明确 fail-loud，不生成内部扁平全局 id；Core 能力补齐后沿同一 Block id 与 authored section key 接通。

## 布局与用户可观察行为

- header 可省略，sections 可以为空，但二者不能同时缺失 / 为空
- section key 必须是局部唯一的非空字符串；role 是可选开放字符串，不改变布局或默认 style
- 默认 size 为两轴 content、padding 为 8、rowGap 为 0、overflow 为 visible
- 默认 style 为透明 fill、1-unit solid currentColor stroke；divider 使用相同 outline，cornerRadius 为 8，zIndex 为 0
- `style` 完整复用 Core `IRDrawableStyle`；顶层 dashPattern / dashOffset 只覆盖 outer border 对应字段，divider 自身的显式字段覆盖默认 outline。省略字段按上述默认逐字段补齐，不接受第二套 background / border alias
- divider 只出现在两个实际相邻的非空 region 之间；`divider: false` 完全关闭
- 自然宽度是全部 region outer contribution 的最大值，自然高度是 region outer contribution、真实 rowGap 与 divider 占用的纵向总和
- 有限 content width 传给每个 child 的 x proposal；child 可以自行 reflow，Standard 不按文本 / code / primitive kind 估算
- 最终 region slot 沿 x 轴 stretch 到 resolved content width，child 自己决定 exact proposal 下的 allocation；额外宽度留在 region 右侧，不隐式缩放视觉内容
- overflow / clip 只使用 resolved container allocation；visual overflow 不反向扩大 fixed / fill allocation
- 所有 child 最终 probe 成功后才 replay；失败通过 Core `raise` 提升，不生成空 section 或 placeholder

## 行为、失败语义与兼容性

- 默认行为：组件开箱可见但不携带领域样式；所有 appearance 字段可显式覆盖，header / section child 对自身内容与内部视觉负责
- 失败与诊断：空 Block、重复 key、负 spacing、非法 size / overflow 在输入阶段拒绝；缺失 child definition、无法解析引用或 probe failure 在 compile 阶段 fail-loud
- 兼容性：新增 composite，不改变 Frame、FlexLayout、GridLayout 或 OverlayLayout；不把 Frame 迁成 GraphFrame
- React / Vanilla 等价性：React authoring 可以用 marker children 表达 header / section，Vanilla 与直接 IR 使用 plain input；三者必须得到同一 canonical `IRGraphFrame`

## 功能与包边界

- 所属能力域与解决的问题：Standard Drawing Complete 的 headless 结构化容器，统一逻辑图富内容外壳、测量和定位
- 主责包与协作包：Standard 拥有 schema、layout、appearance 与 artifact；Core 拥有 probe / replay、IRChild、Scope、target 与 Scene；adapter 只归一 authoring
- 拥有：纵向 region 语义组合、默认外框、section identity、整体 / section bounds、整体 target 与未来 structured section target 的稳定输入
- 不拥有：header / section 内部模型、Process / Class / Data schema、syntax highlighting、业务 category、Graph port 或交互状态
- 外部扩展与下游闭环：任意注册 Core / Tier 2 composite 都可作为 child；未知 role 保留；appearance 显式覆盖
- 不支持边界：需要自定义非纵向外壳时直接组合 Flex / Grid / Overlay / Frame，不为 GraphFrame 增加 layout registry

## 长期边界

- Process、Class、Data、Schema、Context 或 Payload 的公开 IR
- horizontal / freeform Block shell、collapsible region 或交互编辑
- HTML、DOM、syntax highlighter、renderer callback 或 runtime template
- Connector routing、Callout placement 与完整逻辑图拓扑
