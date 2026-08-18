# ADR-04：提供显式 Track 与稳定 Auto-placement 的 GridLayout

- 状态：Superseded by [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md)（2026-08-09）
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-01](./01-layout-profile-core-gate.md) · [ADR-02](./02-box-layout-item-vocabulary.md) · [ADR-03](./03-flex-layout.md) · [Core ADR-08](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md)
- 后继：[Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) 接管当前 owner；本 ADR 保留 Standard 验证期历史

## 背景

Plot panels、legend matrices、label bands、Gantt 区块和未来简单文档排布需要二维行列轨道、span 和稳定自动放置。现有 Standard `Grid` 是可视格线 composite，只绘制背景网格，不拥有 child layout；复用其名称或 schema 会混淆“画格线”和“用网格排版”。

CSS Grid 的 track sizing 证明了 fixed、intrinsic、fraction 与 minmax 可以覆盖大量二维排版，但其 named lines、areas、percentage、subgrid、dense placement、writing mode 和兼容细节不适合当前绘图内核。GridLayout 采用显式、JSON-safe、零基 index和有界 water-fill 算法。

## 决策：以 track constraint aggregation、x→y contextual feedback 和稀疏稳定占位求解二维网格

公开 definition key 为 `standard.gridLayout`；现有 `standard.grid` 保持不变。

### Track IR

```ts
export type IRGridTrackBreadth =
  | Readonly<{ kind: 'fixed'; value: number }>
  | Readonly<{ kind: 'content'; mode: 'minimum' | 'natural' }>
  | Readonly<{ kind: 'fraction'; factor: number }>;

export type IRGridTrack =
  | IRGridTrackBreadth
  | Readonly<{
      kind: 'minmax';
      min: Exclude<IRGridTrackBreadth, { kind: 'fraction' }>;
      max: IRGridTrackBreadth;
    }>;

export type IRGridPlacement = Readonly<{
  start?: number;
  span: number;
}>;

export type IRGridLayoutItem = Readonly<{
  kind: 'grid';
  key: string;
  child: IRChild;
  margin: number | IRBoxSpacing;
  column?: IRGridPlacement;
  row?: IRGridPlacement;
  justifySelf?: LayoutEdgeAlignmentValue;
  alignSelf?: LayoutAlignmentValue;
}>;
```

track 规则：

- fixed value有限非负
- content minimum使用 child minimum contribution；content natural使用 natural contribution
- fraction factor必须有限且大于零
- minmax 的 min 不允许 fraction；max 可以 fixed/content/fraction
- min/max 都是 fixed 时，max.value < min.value 由 schema 拒绝
- runtime max 小于已解析 min 时，growth limit clamp到 min，不反向缩小 base

### Container IR

```ts
export type IRGridLayout = Readonly<{
  namespace: 'standard';
  type: 'gridLayout';
  size: IRLayoutSize;
  padding: number | IRBoxSpacing;
  overflow: LayoutOverflowValue;
  columns: ReadonlyArray<IRGridTrack>;
  rows: ReadonlyArray<IRGridTrack>;
  implicitColumn: IRGridTrack;
  implicitRow: IRGridTrack;
  autoFlow: GridAutoFlowValue;
  overlap: GridOverlapValue;
  columnGap: number;
  rowGap: number;
  justifyItems: LayoutEdgeAlignmentValue;
  alignItems: LayoutAlignmentValue;
  justifyContent: LayoutDistributionValue;
  alignContent: LayoutDistributionValue;
  children: ReadonlyArray<IRGridLayoutItem>;
}>;
```

`IRGridLayout`、item、placement和track类型都从schema parsed output推导。`GridLayoutInput = Omit<z.input<typeof GridLayoutSchema>, 'namespace' | 'type'>`；`GridLayoutItemInput`、`GridPlacementInput`、`GridTrackInput`、`GridTrackBreadthInput`保持完整`z.input`。`createGridLayout(input)`只接受省略discriminator的GridLayoutInput并注入固定`namespace/type`，返回canonical IR；adapter不得手写optional output。

公开导出精确为：

- schema：`GridTrackBreadthSchema`、`GridTrackSchema`、`GridPlacementSchema`、`GridLayoutItemSchema`、`GridLayoutSchema`
- parsed/input type：`IRGridTrackBreadth` / `GridTrackBreadthInput`、`IRGridTrack` / `GridTrackInput`、`IRGridPlacement` / `GridPlacementInput`、`IRGridLayoutItem` / `GridLayoutItemInput`、`IRGridLayout` / `GridLayoutInput`
- const/value：`GridAutoFlow` / `GridAutoFlowValue`、`GridOverlap` / `GridOverlapValue`、`GRID_LAYOUT_MAX_TRACKS_PER_AXIS`
- capability：`createGridLayout`、`GridLayoutDefinition`

layout、item、placement、track与breadth对象全部使用strict schema；unknown field fail-loud。placement refinement把错误定位到对应`column/row.start/span`，minmax refinement定位到`min/max`。

默认值：

- `GridAutoFlow` 公开 `row | column` const object enum，不进入ADR-02 shared vocabulary
- columns 至少一项；rows 省略等价空显式 rows
- implicitColumn/implicitRow 为 `{ kind:'content', mode:'natural' }`
- autoFlow `row`，overlap `reject`
- columnGap/rowGap `0`
- justifyItems/alignItems `stretch`
- justifyContent/alignContent `start`
- item span `1`；column/row 省略或其中 start 省略时，该轴参与 auto-placement；`{ span: n }` 表示自动起点与显式跨度

column/row start 是可选零基 track index，span 是正 safe integer。start 存在时该轴显式放置，省略时由 solver 选择起点并保留 authored span。单轴 resolved track 数超过导出的 `GRID_LAYOUT_MAX_TRACKS_PER_AXIS = 10_000` 时 fail-loud，避免稀疏恶意 index导致不可控内存；该 guard 同时适用于显式、implicit 与 span 扩张。

justifySelf 不接受 baseline；alignItems/alignSelf 可接受 first/last baseline，并只在 y 维度对齐 row 内 item。Grid 不从 child 类型推断 baseline。

### Placement

placement 在 track sizing 前完成。初始显式 extent 为 `columnCount = columns.length`、`rowCount = max(rows.length, 1)`；rows 为空时先建立一个由 implicitRow 描述的 seed row，保证 row/column flow 都有有限次轴。所有 occupied rect 都进入同一稀疏 occupancy；`overlap=allow` 只允许fully explicit authored rect重叠，partial与fully-auto的缺失轴均由solver选择，始终避开occupancy。

1. 先登记 row/column start 都存在的 fully explicit items
2. fully explicit item先安全校验两个endExclusive并扩张extent，再按authored order登记；reject检查冲突，allow仍登记occupancy
3. 再按authored order处理单轴explicit item：row start存在时在该row从column 0递增找首个容纳 authored column span 的完整空rect；column start存在时在该column从row 0递增找首个容纳 authored row span 的完整空rect。每个item独立从0开始，找到后扩张缺失轴extent；这一步不使用fully-auto cursor
4. 最后处理两轴auto item，唯一global cursor从`(row:0,column:0)`开始。autoFlow=row按column递增、越过当前column extent后column归零并row加一；column flow对调row/column
5. fully-auto搜索从当前cursor开始，绝不检查词典序早于cursor的candidate；放置后cursor移动到该item flow方向末端的下一个cell，因此不dense回填hole
6. span大于当前次轴extent时，先把次轴扩张到span；其它candidate跨过次轴extent时推进flow轴而不在尾部制造残缺rect。flow轴按首次需要逐轨扩张
7. explicit/partial扩张后的extent是fully-auto扫描的当前extent；每次新implicit track都使用对应implicitColumn/implicitRow定义

overlap=reject时，fully explicit placement与既有占位重叠fail-loud并指向后加入item key。overlap=allow时只允许fully explicit item共享cell，所有重叠item仍参与各自contribution，paint order保持authored order。partial与fully-auto item永远寻找空矩形，不主动制造overlap。

占位使用稀疏区间/集合，不按最大authored index预先分配数组。任何`endExclusive = start + span`都用安全不溢出判断`start <= GRID_LAYOUT_MAX_TRACKS_PER_AXIS - span`；显式track数组长度也不得超过guard。auto scan第一次需要第10,001轨时立即以item key与axis fail-loud，不继续扫描或物化dense grid。`start/span`即使各自safe integer，只要上述条件失败仍非法。

### Track sizing

行列使用同一纯 solver，输入是 track definitions、gap、finite/indefinite available size和按 span聚合的 contribution constraints。

#### 1. constraint aggregation

- 同一 `start/span` 范围内多个 item的 minimum/natural contribution分别取最大值
- constraints 按 span长度升序、start升序处理，与 item authored order无关
- item margin加入该轴 contribution；span内部 gaps计入当前可用长度
- structural sizing只使用 allocation contribution，不使用 visual bounds

#### 2. minimum base 与 natural/intrinsic limit

solver为每条track维护有限非负`base`与optional `growthLimit`；省略limit表示unbounded，不写`Infinity`。初始化：

- standalone fixed：`base=limit=value`，任何item constraint都不能增长
- standalone content minimum/natural：`base=0`；minimum phase均可增长，natural phase只有content natural可继续增长
- standalone fraction：`base=0`、limit省略，minimum phase可容纳minimum，finite fraction phase按factor分配
- minmax：min fixed以value初始化base，min content以0初始化；max fixed给出hard limit，max content由对应minimum/natural constraints形成limit，max fraction省略limit并进入fraction phase；每次resolved limit都clamp到不低于base

solver对同一组constraints确定性返回`minimumProfile`与`naturalProfile`两套track sizes。breadth在两个profile中的目标固定为：

| track/breadth              | minimum profile                                                                                       | natural profile                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| fixed                      | authored value                                                                                        | authored value                                                                  |
| standalone content.minimum | item minimum target                                                                                   | 与minimum相同                                                                   |
| standalone content.natural | item minimum target                                                                                   | item natural target                                                             |
| standalone fraction        | item minimum target                                                                                   | indefinite时item natural target；finite时先保留minimum base再进入fraction phase |
| minmax min=fixed           | fixed lower bound                                                                                     | fixed lower bound                                                               |
| minmax min=content.minimum | item minimum hard lower bound                                                                         | 相同lower bound                                                                 |
| minmax min=content.natural | item natural hard lower bound                                                                         | 相同natural lower bound                                                         |
| minmax max=fixed           | 两profile都不得超过fixed，若lower已更大则limit clamp到lower                                           | 同左                                                                            |
| minmax max=content.minimum | limit由item minimum target形成，不为natural继续增长                                                   | 同左                                                                            |
| minmax max=content.natural | minimum只按其lower/minimum demand增长但以natural target为limit；natural profile可增长到natural target | 同左                                                                            |
| minmax max=fraction        | minimum先容纳hard lower/minimum demand；不设limit                                                     | natural/finite阶段再按factor参与                                                |

single-span与multi-span都按这张表选择target，区别只在constraint range和water-fill；`min=content.natural`即使位于minimum profile也必须使用natural target，不能降格为minimum。

每个item每轴形成两个span target：`max(0, outerSlotContribution - internalGaps)`，outer slot contribution只使用该probe的`slotSize + start/end margin`。`allocationBounds`/`visualBounds`不进入track target，只参与后续guide、placement与overflow。相同start/span的minimum/natural target各自取最大值。

constraints按span长度、start升序执行；同一range相同target只处理一次：

1. **minimum-base phase**：先处理single-span，再处理multi-span minimum target。deficit只分给range内`base`仍可增长的non-fraction track并等权water-fill至hard/intrinsic limit；仍有deficit再按fraction factor分给plain fraction或fraction-max minmax。content.minimum、content.natural及有可增长max的minmax即使没有single-span item也属于eligible，因此两个空content.minimum tracks可以共同承接spanning minimum
2. **natural-limit phase**：从minimum bases出发按相同顺序处理natural target。先增长content.natural与max=content.natural的track；max=content.minimum只允许到minimum phase形成的limit，content.minimum standalone不再为natural增长。indefinite profile下仍有deficit时，fraction/fraction-max按factor增长natural base；finite profile把这部分留给下一阶段的available free space
3. fixed-only range或全部命中limit后仍有deficit时停止增长，该item相对最终area显式overflow，不突破track定义

所有water-fill、求和、epsilon、freeze、index tie-break与residual receiver复用ADR-01/02的Neumaier与稳定规则。每轮至少冻结一条track或消除deficit。

axis `minimumContribution` 是minimumProfile sizes、gaps与padding的补偿和；`naturalContribution`同理来自naturalProfile。每次`resolveLayoutAxisSize()`都同时接收两者：父`intrinsic.minimum`选择minimum，父`intrinsic.natural`选择natural，content在range/exact下先以natural为候选再按ADR-02 clamp。fixed/fill仍计算两套profile，但只用于artifact/overflow诊断，不改写authored/resolved allocation。

#### 3. finite free space 与 fraction

在 finite container axis中，从 available size扣除 gaps和 non-fraction bases后求 fraction unit。若某 fraction track的 minimum base大于 `factor × unit`，先冻结该 base，再对剩余 factors重算；最多冻结每个 fraction track一次。

在indefinite axis中，fraction不表示无限：它使用natural-limit phase得到的finite natural base参与container contribution，factor只在之后收到finite proposal时生效。

全部 track加gap仍超过 available size时不产生负 track；保留 bases并记录 container overflow。

#### 4. content distribution

fraction 和 minmax growth完成后仍有正 free space时：

- justifyContent/alignContent 的 start/end/center/space-\* 平移或增加 track间额外 spacing
- stretch可在intrinsic growth limit之后等量增长非fixed tracks；fixed及fixed-max minmax不参与，没有eligible track时退化start
- negative free space遵循 ADR-03 的 distribution fallback，不反向压缩 fixed/minimum base

### 双轴 contextual feedback

GridLayout使用确定的物理x→y顺序。`finiteYLimit`与Flex相同，只能来自已解析fixed/fill y content size，或content y与父exact/finite range形成的有限上限。item area扣除四边margin后得到非负`innerWidth/innerHeight`；resolved justify/align为stretch时该轴使用exact，否则使用`range { min:0,max:innerSize }`。

| 阶段      | x proposal                                                | y proposal                                       | 结果用途              |
| --------- | --------------------------------------------------------- | ------------------------------------------------ | --------------------- |
| x minimum | `intrinsic.minimum`                                       | 有finiteYLimit时range，否则`intrinsic.natural`   | column minimum target |
| x natural | `intrinsic.natural`                                       | 同上                                             | column natural target |
| y minimum | stretch-x时`exact(innerWidth)`，否则`range(0,innerWidth)` | `intrinsic.minimum`                              | row minimum target    |
| y natural | 同上                                                      | `intrinsic.natural`                              | row natural target    |
| final     | stretch-x时exact，否则range；使用最终innerWidth           | stretch-y时exact，否则range；使用最终innerHeight | 唯一replay候选        |

顺序固定为：placement → x minimum/natural probes → indefinite column profiles → 按ADR-02求值container x allocation → 在finite x content size内完成fraction/distribution并冻结columns → y minimum/natural probes → indefinite row profiles → 求值container y allocation → 在finite y content size内完成fraction/distribution并冻结rows → final probes → baseline/placement → outgoing guides → replay/artifact。

content container先用indefinite natural track profile形成contribution，再由父proposal与作者边界解析allocation；fixed/fill先有allocation但仍计算intrinsic profile供overflow诊断。所有item的minimum/natural constraint都是track求解必需结果，probe failed时立即`raise()`；final failed也`raise()`，未被replay的早期resolved probe丢弃。final probe因exact/range y反馈不同真实x allocation时只形成x overflow，不重启columns；同理不做第二轮rows。vertical writing mode与y→x排版留后续ADR。

### Item slot 与 placement

item grid area是span覆盖的track rect（包含内部gaps跨越的完整区域）。margin内缩后得到child slot；final proposal严格按上表使用exact/range，stretch不scale primitive。translation使用完整allocationBounds origin。

baseline只接纳rowSpan=1且resolved alignSelf为对应first/last-baseline的item。structural guide offset、真实guide/edge fallback、slot/allocation分离、margin ascent/descent与participant canonical坐标完全复用ADR-03规则，cross slot换成item row-area inner slot。baseline metric产生的row deficit回到该row的track growth规则：content或仍有growth capacity的minmax可增长；fixed/fixed-max保持size并记录allocation overflow。跨多row item不参与row metric，只在自身area按start/end edge fallback放置。

GridLayout向父级显式返回dimension=`y` guides。每个有single-row item的物理row按ADR-03 participant→真实guide→edge fallback→sourceIndex规则合成resolved first/last guide；container first取物理y最小的eligible row，last取物理y最大的eligible row，位置相同时按row index。没有single-row item、空container时省略；multi-row item不单独制造outgoing guide。guide包含最终track/item translation并位于GridLayout allocation coordinate。

overflow=clip 使用 container allocation Scope clip；clip不改变 tracks。nested GridLayout与任意 child均只通过Core probe/replay。

## DSL / API 表面

```tsx
<GridLayout
  columns={[
    { kind: 'content', mode: 'natural' },
    { kind: 'fraction', factor: 1 },
  ]}
  columnGap={12}
  rowGap={6}
  alignItems="first-baseline"
>
  <LayoutItem kind="grid" itemKey="label" column={{ start: 0 }}>
    <Node>Revenue</Node>
  </LayoutItem>
  <LayoutItem kind="grid" itemKey="value" column={{ start: 1 }}>
    <Node>123,456</Node>
  </LayoutItem>
</GridLayout>
```

## 长期边界

- named lines/areas、negative line、percentage/calc、subgrid、masonry、dense
- vertical writing mode或任意双向fixed-point
- Table border/cell/data/manifest语义
- track animation、interactive resize、virtualization

## 遗留风险

- named line/area、dense、subgrid、percentage/calc、masonry 与 writing mode 尚未设计
- 固定 x→y 顺序不承诺求解需要无界双轴 fixed-point 的自定义 child；此类能力需独立 ADR
