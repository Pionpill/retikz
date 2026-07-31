# ADR-05：提供对齐与定位双模式的 OverlayLayout

- 状态：Accepted
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-01](./01-layout-profile-core-gate.md) · [ADR-02](./02-box-layout-item-vocabulary.md) · [ADR-03](./03-flex-layout.md) · [ADR-04](./04-grid-layout.md)

## 背景

图形本体、label、badge、annotation、background/foreground和未来甘特标记经常需要共享一个 container-local 坐标空间并叠放。Flex/Grid 可以通过重叠 track勉强表达部分场景，但会丢失“按容器对齐”或“在某个位置以某个 anchor放置”的直接意图。

OverlayLayout 不是全局 absolute canvas。它只在自己的 content box内提供两类确定语义：aligned item随容器尺寸对齐，positioned item按局部点和归一化 anchor定位。它不做碰撞避让、viewport、selection handle或自动label placement。

## 决策：Overlay item 显式选择 aligned/positioned，并把尺寸参与和绘制顺序正交化

公开 definition key 为 `standard.overlayLayout`。

### IR 表面

```ts
export const OverlayPlacementKind = {
  Aligned: 'aligned',
  Positioned: 'positioned',
} as const;

export const LayoutSizeParticipation = {
  Include: 'include',
  Exclude: 'exclude',
} as const;

export type IROverlayPlacement =
  | Readonly<{ kind: 'aligned' }>
  | Readonly<{
      kind: 'positioned';
      at: Readonly<{ x: number; y: number }>;
      anchor: Readonly<{ x: number; y: number }>;
      width?: number;
      height?: number;
    }>;

export type IROverlayLayoutItem = Readonly<{
  kind: 'overlay';
  key: string;
  child: IRChild;
  margin: number | IRBoxSpacing;
  placement: IROverlayPlacement;
  offset: Readonly<{ x: number; y: number }>;
  justifySelf?: LayoutEdgeAlignmentValue;
  alignSelf?: LayoutAlignmentValue;
  sizeParticipation: LayoutSizeParticipationValue;
  zIndex: number;
}>;

export type IROverlayLayout = Readonly<{
  namespace: 'standard';
  type: 'overlayLayout';
  size: IRLayoutSize;
  padding: number | IRBoxSpacing;
  overflow: LayoutOverflowValue;
  justifyItems: LayoutEdgeAlignmentValue;
  alignItems: LayoutAlignmentValue;
  children: ReadonlyArray<IROverlayLayoutItem>;
}>;
```

`IROverlayLayout`和item/placement均由schema parsed output推导；`OverlayLayoutInput`与item input使用 `z.input` 接受默认省略。`createOverlayLayout(input)` 返回canonical IR。

公开导出 `OverlayPlacementSchema`、`OverlayLayoutItemSchema`、`OverlayLayoutSchema` 及对应 `IROverlayPlacement` / `OverlayPlacementInput`、`IROverlayLayoutItem` / `OverlayLayoutItemInput`、`IROverlayLayout` / `OverlayLayoutInput`；公开 `OverlayPlacementKind` / `OverlayPlacementKindValue`、`LayoutSizeParticipation` / `LayoutSizeParticipationValue`、`createOverlayLayout`、`OverlayLayoutDefinition`、`OverlayLayoutModule`。layout、item与placement各分支都是strict object/discriminated union，unknown field fail-loud；`at`、`anchor`、`offset` 三个嵌套point object也分别使用strict object，并把unknown field诊断定位到对应point字段。

默认值：

- placement `aligned`
- container justifyItems/alignItems `center`
- item justifySelf/alignSelf省略时继承 container
- 所有item sizeParticipation `include`；浮层需显式选择 `exclude`
- offset x/y `0`，zIndex `0`；zIndex必须是finite integer，与Core runtime Scope一致
- positioned anchor `{x:0.5,y:0.5}`
- positioned width/height省略时使用 child natural slot

anchor x/y 必须位于闭区间 [0,1]。`at` 是相对 content box start的有限局部坐标；offset是 placement完成后的有限平移，不参与 anchor求值。width/height是去掉margin后的 exact slot size，不是 primitive scale。

justifySelf不接受baseline；alignItems/alignSelf可接受first/last baseline，但只对aligned placement合法。container schema superRefine检查解析后的effective alignment：positioned item显式baseline，或省略alignSelf却从container alignItems继承baseline，均在该item `alignSelf` path fail-loud；作者必须为positioned item显式选择start/center/end/stretch。aligned baseline item要求`offset.y = 0`，避免post-alignment offset破坏共享target与outgoing guide；x offset仍合法。

### 双轴 proposal 与 replay

Overlay固定采用物理x→y feedback。`finiteX/YLimit`来源与ADR-03/04相同；include/exclude使用完全相同的probe链，participation只决定结果是否进入container contribution。

| placement / 阶段             | x proposal                                                                                                                         | y proposal                                      | replay |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| aligned x minimum/natural    | 对应`intrinsic.minimum/natural`                                                                                                    | 有finiteYLimit时range，否则`intrinsic.natural`  | 否     |
| aligned y minimum/natural    | resolved x为stretch且已有finite content width时exact，否则bounded range；无finite x时用对应x contribution形成exact contextual slot | 对应`intrinsic.minimum/natural`                 | 否     |
| aligned final                | stretch-x为exact，否则range(0,innerWidth)                                                                                          | stretch-y为exact，否则range(0,innerHeight)      | 是     |
| positioned x minimum/natural | 显式width始终exact；省略时用对应intrinsic mode                                                                                     | 显式height为exact，否则`intrinsic.natural`      | 否     |
| positioned y minimum/natural | x使用该profile已解析slot的exact                                                                                                    | 显式height始终exact；省略时用对应intrinsic mode | 否     |
| positioned final             | resolved显式/自然width的exact                                                                                                      | resolved显式/自然height的exact                  | 是     |

顺序为x minimum/natural → y minimum/natural → include contribution与container size求值 → aligned final slot → 所有final probes → baseline/placement → zIndex Scope/replay。aligned content container尚无finite x时，y contextual probe使用同一minimum/natural profile解析出的x slot，确保minimum与natural contribution各自闭合；container获得finite width后不回头重算natural size，只由final probe产生overflow。任一阶段成为上述链路必需结果的failed probe立即`raise()`；exclude item也必须完成final placement，不能因不参与size而吞failure。所有早期resolved probe丢弃，每个item只replay对应final candidate一次。final y反馈不同真实x allocation只记录overflow，不做fixed-point。

### Container content contribution

Overlay同时形成minimum与natural两套content contribution，并把两个有限非负结果一并传给`resolveLayoutAxisSize()`：父`intrinsic.minimum`消费minimum profile，父`intrinsic.natural`消费natural profile，range/exact下由ADR-02从natural候选开始clamp。每个profile只消费proposal矩阵中同名probe解析出的outer slot：

- aligned include item：minimum/natural profile的x/y contribution分别取对应outer minimum/natural slot的最大值
- aligned baseline items：每个profile用对应probe的slot与guide/fallback分别计算first/last ascent、descent和group metric，不跨profile复用自然allocation或guide
- positioned include item：每个profile先解析对应minimum/natural或显式slot和anchor，再把placement后的outer slot正侧extent纳入content size：x为`max(0, marginBounds.maxX - contentStart.x)`，y同构；contentStart已包含padding，不能再次相加
- positioned item落到content origin左/上方的负向部分不移动container原点，也不扩大负侧；它作为visible overflow保留
- exclude item不改变container allocation，但仍执行probe、placement、overflow和artifact
- 没有include item时，两套content contribution都为0，container仍可由fixed/fill/parent exact proposal获得尺寸

sizeParticipation只控制结构contribution，不控制paint、hit-test或artifact。fixed/fill container已由外部确定尺寸时仍计算include结果用于overflow诊断，但不反向改写fixed size。structural contribution一律使用proposal解析的slot与margin；真实allocation/visual bounds只参与guide、placement与overflow。

### Aligned placement

aligned item在最终content box内形成一个可用rect：

1. 先按margin内缩
2. start/center/end使用child resolved slot与allocation bounds计算translation
3. stretch向对应轴发送exact可用size并执行final probe，不scale fixed child
4. first/last baseline按下述独立group聚合公共guide；缺失guide使用ADR-02边缘fallback
5. offset最后应用；baseline participant已由schema保证cross offset为0

aligned items互不占位，全部共享content box。一个item的visual overflow不改变其它item位置。

first/last baseline分别形成group。只有`aligned + include + resolved alignSelf为该baseline`的item进入structural metric与target：使用cross `slotSize`、clamped真实guide offset或start/end edge fallback、margin计算最大ascent/descent，扩大content contribution；真实allocation拒绝不反向撑大。aligned exclude baseline item不改变metric，但若include group存在则对齐到同一target；没有include participant时，exclude first/last分别对齐content start/end且不产生size。

OverlayLayout outgoing dimension=`y` guide只由aligned include item决定。对应baseline group非空时直接返回其最终target；否则first按sourceIndex正序、last按逆序选择第一个暴露真实guide的aligned include item。若全部aligned include item都缺对应真实guide，first稳定选择sourceIndex最小项的allocation start edge，last选择sourceIndex最大项的allocation end edge；物理位置相同时仍以sourceIndex打破tie。positioned与exclude不决定outgoing guide；没有aligned include item时省略。位置包含最终item translation与offset，处于Overlay allocation coordinate。

### Positioned placement

positioned item先得到不含margin的无原点child slot：

- width/height给出时对应轴发送exact proposal
- 省略轴查询natural contribution
- child可拒绝exact，slot与真实allocation保持分离

authored anchor只作用于该child slot；margin不移动anchor、不改变slot size。slot origin计算为：

```text
contentStart + at + offset - anchor * childSlotSize
```

设slot rect为`S`、真实allocation bounds为`B`。x轴start/center/end translation分别为`S.x - B.x`、`S.x + (S.width - B.width)/2 - B.x`、`S.x + S.width - (B.x + B.width)`；y轴同构，stretch只改变final proposal，不改变公式。margin bounds是slot rect按四边margin outset后的rect，用于include structural contribution；因此margin可扩大正侧contribution/负侧overflow，但不会移动authored anchor。anchor不直接作用于allocation或visual bounds，negative allocation origin只由translation显式抵消。

positioned item不接受baseline，也不参与aligned aggregation或outgoing guides。include positioned item的minimum/natural贡献各执行一次前向求值，不因container随后增大而循环重定位；`at`是绝对局部长度，不支持百分比或end inset。

### Paint order 与 clip

- solver和artifact items保持authored order/source index
- Scene paint order按zIndex升序，zIndex相同时按authored index稳定排序
- 每个item通过runtime Scope承载zIndex与replay；布局transform位于该Scope内
- paint order不改变size contribution、probe顺序或item identity
- overflow=clip在最外层container allocation Scope裁剪全部items；item没有私有overflow策略

zIndex必须是finite integer。Overlay不重写child内部zIndex；item Scope只决定各replay子树作为同层单元的顺序。

### 纯 solver

natural contribution、anchor translation、alignment、baseline aggregation、size participation和stable paint sort均为纯函数。compile层只负责probe、Scope/replay和Core failure提升。

## DSL / API 表面

```tsx
<OverlayLayout size={{ x: { kind: 'fixed', value: 240 }, y: { kind: 'fixed', value: 120 } }} overflow="clip">
  <LayoutItem kind="overlay" itemKey="plot" placement={{ kind: 'aligned' }}>
    <Path>{/* plot geometry */}</Path>
  </LayoutItem>
  <LayoutItem
    kind="overlay"
    itemKey="badge"
    placement={{ kind: 'positioned', at: { x: 220, y: 12 }, anchor: { x: 1, y: 0 } }}
    sizeParticipation="exclude"
    zIndex={10}
  >
    <Node>New</Node>
  </LayoutItem>
</OverlayLayout>
```

## 被否决的方案

- 让Overlay等同“Grid同一cell”：无法直接表达局部position、anchor和size participation
- 全局absolute coordinates：container不能复用/nest，且会侵入viewport/editor语义
- anchor基于visual bounds：描边、阴影与renderer保守包络会改变authored位置
- 根据placement隐式切换sizeParticipation默认值：同一字段的省略语义不稳定；统一include并要求浮层显式exclude
- zIndex重排schema children：会破坏authored identity和adapter round-trip
- 百分比/inset双端约束：需要额外的indefinite percentage与constraint resolution合同，alpha.2不引入

## 测试设计

- schema：strict placement union、anchor范围、exact width/height、positioned baseline rejection、integer zIndex和默认值
- pure solver：aligned/positioned、non-zero bounds、anchor/offset、baseline、include/exclude、negative overflow和stable zIndex
- compile：stretch refusal、nested overlay、runtime Scope order、clip、custom Composite与failed probe
- artifact与adapter证据在ADR-06收口

详细行为到证据映射见 ignored `TEST_CONTRACT.md`。

## 影响

- 新增 `standard.overlayLayout` 公开schema/factory/definition/module
- 不新增全局坐标、Scene primitive、renderer或editor API
- StandardAllPreset、React/Vanilla和docs由ADR-06统一接线

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete上层的container-local叠放
- 解决的问题：任意IRChild的共享box对齐、局部anchor定位与稳定paint order
- 主责包与协作包：Standard主责schema/solver；Core主责probe/replay/Scope zIndex/clip；adapter等价authoring
- 是否可由现有能力组合：底层机制可组合，但overlay placement是Standard新能力
- 是否需要下沉到依赖能力域：否
- 内部表达链路：Overlay schema → contribution/placement纯函数 → Core Scope/replay
- 外部扩展链路：语义闭合；custom child通过Core registry同路
- 下游执行 / adapter 等价性：renderer只执行现有transform/clip/zIndex；React/Vanilla生成同一IR
- 不支持边界与诊断：非法anchor/size/zIndex/kind与selected failure fail-loud；collision/viewport延期
- 本轮结论：扩展Standard当前能力域

## 不在本 ADR 范围

- 百分比位置、left/right双inset、viewport、global canvas
- collision avoidance、automatic label placement、port/edge label
- selection handles、drag constraints、history或interaction runtime
- per-item clip/mask/effect
- artifact payload、最终adapter和docs接线

## 最终实现摘要

- 实现 `standard.overlayLayout` strict schema、factory、Definition、capability module，以及 aligned/positioned contribution 与 placement solver
- positioned item 使用 content-local `at`、归一化 `anchor` 和可选 exact slot；`sizeParticipation`、alignment、offset 与稳定 `zIndex` paint order 保持正交
- compile 复用 Core Scope transform/clip/replay；typed item/paint-order artifact 与 adapter/docs 由 ADR-06 收口

## 验证结果

- schema、pure solver 与 compile 测试覆盖 nested strict objects、anchor、baseline、include/exclude、non-zero bounds、negative overflow、stable paint order、nested/custom child 与 selected failure
- Standard、Standard React、Standard Vanilla 包级类型检查、lint 与测试通过
- 双语文档与 controls 预览覆盖 aligned/positioned、anchor、共享对齐和可见 zIndex 变化

## 遗留风险

- percentage/inset、viewport/global canvas、collision avoidance 与自动 label placement 尚未设计
- positioned item 不提供跨容器语义引用；Target、Connector、selection 与交互约束仍由其它能力域拥有
