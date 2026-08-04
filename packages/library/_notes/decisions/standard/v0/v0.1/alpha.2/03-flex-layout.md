# ADR-03：提供确定性 FlexLayout

- 状态：Accepted
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-01](./01-layout-profile-core-gate.md) · [ADR-02](./02-box-layout-item-vocabulary.md) · [Core ADR-08](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md)

## 背景

Legend entries、label bands、toolbar-like annotations、Gantt 行内片段等场景都需要沿一个主轴排列任意绘图 child，并在空间变化时 grow、shrink、wrap 和跨轴对齐。调用方手写坐标会复制文本重排、baseline 和 overflow 处理；直接依赖 CSS 又无法进入 renderer-agnostic Scene、headless compile 和 JSON IR。

FlexLayout 只解决一维 Box Layout。它借鉴 CSS Flexbox 的成熟核心模型，但删除 order、auto margin、writing mode、visibility collapse 和浏览器兼容算法，只保留绘图场景需要且可以确定性求值的 line formation、freeze/redistribute 与 alignment。

## 决策：以 authored order 和有界 freeze loop 求解一维 flex lines

公开 definition key 为 `standard.flexLayout`，schema 为 strict JSON object，使用 Core layout-aware `compile` 分支。

### IR 表面

```ts
export const FlexLayoutDirection = {
  Row: 'row',
  RowReverse: 'row-reverse',
  Column: 'column',
  ColumnReverse: 'column-reverse',
} as const;

export const FlexLayoutWrap = {
  NoWrap: 'nowrap',
  Wrap: 'wrap',
  WrapReverse: 'wrap-reverse',
} as const;

export type IRFlexLayoutItem = Readonly<{
  kind: 'flex';
  key: string;
  child: IRChild;
  margin: number | IRBoxSpacing;
  basis: number | 'content';
  grow: number;
  shrink: number;
  min?: number;
  max?: number;
  alignSelf?: LayoutAlignmentValue;
}>;

export type IRFlexLayout = Readonly<{
  namespace: 'standard';
  type: 'flexLayout';
  size: IRLayoutSize;
  padding: number | IRBoxSpacing;
  overflow: LayoutOverflowValue;
  direction: FlexLayoutDirectionValue;
  wrap: FlexLayoutWrapValue;
  columnGap: number;
  rowGap: number;
  justifyContent: FlexMainDistributionValue;
  alignItems: LayoutAlignmentValue;
  alignContent: LayoutDistributionValue;
  children: ReadonlyArray<IRFlexLayoutItem>;
}>;
```

`IRFlexLayout`/`IRFlexLayoutItem` 是schema parsed output；`FlexLayoutInput`/`FlexLayoutItemInput` 使用 `z.input` 并允许省略下列默认字段。`createFlexLayout(input)` 接收去掉namespace/type的Input并返回canonical IR。`FlexMainDistributionValue` 从shared distribution排除stretch，不能用宽类型掩盖schema限制。

默认值：

- direction `row`，wrap `nowrap`
- columnGap/rowGap `0`
- justifyContent/alignContent `start`
- alignItems `stretch`
- item basis `content`、grow `0`、shrink `1`
- item min 缺省使用当前 cross context 下的 child minimum slot，max 缺省为无上限；显式 min/max 是父级 slot 的硬约束，可以让 slot 小于 child 真实 minimum allocation 并形成 overflow
- alignSelf 省略继承 alignItems

justifyContent 不接受 `stretch` 或 baseline；alignContent 接受 distribution 全集，但单 line 的 `nowrap` 不应用 alignContent；alignItems/alignSelf 接受 alignment 全集。主轴为 y 的 column/column-reverse 不允许 baseline cross alignment，因为 Core baseline guide 属于 y dimension，不能拿来对齐 x。

`columnGap` 永远是物理水平方向 gap，`rowGap` 永远是物理垂直方向 gap：row 的 item gap 使用 columnGap、line gap 使用 rowGap；column 相反。这样 nested Flex/Grid 共享同一术语，不随 direction 改字段含义。

### 求解阶段

#### 0. Container size profile

fixed/fill轴直接遵守ADR-02。content main轴先从item contributions形成container contribution：

- nowrap minimum/natural分别是所有item对应outer contribution与固定gaps之和
- wrap minimum是最大单item outer minimum，wrap natural在无界proposal下仍是单line natural总和
- range先计算natural contribution，再clamp到作者min/max与父range的可交集；得到finite main content size后才执行line formation
- exact使用父slot作为可用空间，但作者hard min/max仍可使真实container allocation与父slot不同

content cross轴在lines完成后由line cross sizes与line gaps形成minimum/natural contribution。alpha.2不对任意非单调main↔cross响应做fixed-point；stretch final probe反向改变已冻结main allocation时统一记录overflow。

#### 1. 轴映射与 contribution

solver 先把物理 x/y 映射为 main/cross，不改变 artifact 中的物理坐标。每个 item 至少取得：

- main minimum contribution
- main natural contribution，或显式 numeric basis
- 在选定 main slot 下的 cross natural contribution
- 真实 allocation/visual bounds 与 alignment guides

每个 item 在同一个 cross basis context 下取得 `childMinimumSlot`；content basis 额外取得 `childNaturalSlot` 并令 `flexBaseSlot = childNaturalSlot`，numeric basis 直接令 `flexBaseSlot = basis`。numeric basis 不发送没有消费方的 `exact(basis)` 候选；contextual cross contribution 统一由 line distribution 冻结后的 cross-metric probe 取得，不把 child 真实 allocation 当作 base slot。

有效边界与首次 clamp 固定为：

- `effectiveMin = authoredMin ?? childMinimumSlot`
- `effectiveMax = authoredMax`，省略时保留 unbounded 分支，不在 DTO 中写 `Infinity`
- 显式 min 存在时替代 automatic child minimum，因此 `authoredMin < childMinimumSlot` 合法，child 拒绝较小 exact slot 时以 allocation overflow 表达
- min 省略且 `childMinimumSlot > authoredMax` 时，显式 hard max 优先，令 `effectiveMin = effectiveMax = authoredMax`；不能偷偷扩大 authored max
- schema 拒绝同时显式声明的 `authoredMin > authoredMax`
- `hypotheticalMainSlot = clamp(flexBaseSlot, effectiveMin, effectiveMax)`；`hypotheticalOuterMainSize` 再加 main-start/main-end margin，line formation 与初始 free space 都使用该值

freeze loop 从已经首次 clamp 的 hypothetical slot 开始；后续分配命中 effective min/max 时冻结。shrink 权重仍为 `shrink × flexBaseSlot`，numeric/content 两类使用各自 clamp 前的非负 base；base 为零的 item 不获得 shrink 权重。

#### 2. proposal 矩阵与 line formation

物理 x/y proposal 先按 direction 映射成 main/cross，再按下表构造，不能在 compile 层自行选择 range 或 exact。`finiteCrossLimit` 是 container cross policy 在当前父 proposal 下已经可确定的有限 content-box 上限：fixed 使用真实 fixed content size；fill 使用已解析的 finite fill content size；content 仅在父 exact 或 finite range max 与作者边界形成有限上限时存在。

| 阶段          | main proposal          | cross proposal                                                                                 |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| child minimum | `intrinsic.minimum`    | 有 `finiteCrossLimit` 时 `range { min: 0, max: finiteCrossLimit }`，否则 `intrinsic.natural`   |
| content basis | `intrinsic.natural`    | 同上                                                                                           |
| cross-metric  | `exact(finalMainSlot)` | container cross 已有有限 content size/上限时 `range { min: 0, max }`，否则 `intrinsic.natural` |
| stretch final | `exact(finalMainSlot)` | `exact(finalItemCrossSlot)`                                                                    |

cross-metric probe 是所有 non-stretch item 的最终候选，也是 stretch item 计算初始 line cross metrics 的候选。只有 stretch item 在最终 line slot 形成后重新 probe；该 exact-cross 结果是其唯一 replay 候选。任何 final 候选的真实 main allocation 与已冻结 main slot 不同都只形成 overflow，不重新分行或分配。

line formation 规则为：

- nowrap 始终形成 0 或 1 条 line
- wrap/wrap-reverse 只有在 container main content size 有限时换行；无界 main size 等价单 line
- 按 authored order 累加 outer hypothetical main size和 item gap；加入下一项会超过 available size时开新 line
- line 的第一项即使自身超宽也必须进入该 line，不能产生空 line
- reverse 只把 main-start 与 placement cursor 放到物理轴另一端，不改变 line membership、authored children、key 或 source index
- wrap-reverse 只反转 cross 方向的 line placement，不改变 line 内 authored identity

#### 3. grow/shrink freeze loop

每条 line 独立求解：

1. 计算 available main size 减去 margin、固定 gaps 与各 `hypotheticalMainSlot` 后的 initial free space；`flexBaseSlot` 不参与这次扣减
2. free > 0 时按 grow factor 分配；free < 0 时按 `shrink × base slot` 权重回收
3. 命中 item min/max 的 slot clamp 并冻结
4. 对剩余 item 重新分配剩余 free space
5. 没有可分配 factor、所有项冻结或剩余量在 epsilon 内时终止

每轮至少冻结一个 item或终止，因此迭代次数不超过 line item 数量加一。grow/shrink factor 必须有限非负；全部 factor 为零时不分配。最后的浮点残差按 ADR-01 规则归入最后一个仍可接收的 item。

省略 authored min 时，slot 不会压到 automatic child minimum 以下；显式 min/max 可以把 slot 压得更小，child 是否接受由 exact probe 决定。若 effective min、margin、gap 总和仍超过 container，slot 保持 effective min 并形成显式 overflow。

#### 4. cross metrics、container cross 与最终 line slot

main slot 确定后，按 proposal 矩阵执行 cross-metric probe。文本可以因此增加高度；minimum 与 content-basis contribution probe 都不得直接作为最终结果。先由这些结果计算每条 line 的初始 cross metrics，再按 ADR-02 求值 container cross allocation，最后应用 alignContent 形成每条 line 的最终 cross slot 与位置。`alignContent: stretch` 在此时等分增加 line cross slot，且发生在任何 stretch final probe 之前。

line structural cross size 只由 cross-metric `slotSize`、margin、baseline metric 和 container cross 条件共同决定；真实 `allocationBounds`/`visualBounds` 不反向撑大 line，只参与 guide offset、placement 与 overflow：

- start/center/end 以 allocation bounds 对齐
- first-baseline 使 guide 到 line start 的距离取最大值；缺 guide fallback 到 allocation start edge
- last-baseline 使 line end 到 guide 的距离取最大值；缺 guide fallback 到 allocation end edge
- stretch item 在最终 line cross slot 确定后，以扣除 cross margin 的非负 item slot 发送 exact cross proposal；fixed child 可以保留真实 allocation overflow

line baseline metrics 使用公开 guide。对真实 guide，先计算 `guide.position - allocationBounds.crossStart`，再 clamp 到 `[0, cross slotSize]` 作为 structural guide offset；缺失 first guide 的 structural offset 为 `0`，缺失 last guide为 `cross slotSize`。first ascent/descent分别取 `marginStart + offset` 与 `cross slotSize - offset + marginEnd` 的最大值，last baseline对对应last guide使用同式；因此 `slotSize != allocationBounds.size` 时line仍服从父slot，真实guide通过placement translation对齐，超出部分只记overflow。stretch final probe不重新执行main distribution，也不反向改变已经形成的line cross slot；反馈差异只进入overflow与artifact。

#### 5. distribution、outgoing guides 与 placement

- justifyContent 处理每条 line 的剩余 main space
- alignContent 只处理多 line 容器的剩余 cross space；其结果已在阶段 4 用于形成最终 line slot
- positive free space按对应 start/end/center/space-\* 公式分配
- negative free space下 space-\* 退化为 start且附加 gap 为零；start/end/center 仍分别把 overflow 放在尾部、头部或两侧
- space-between 在少于两项时退化 start；space-around/space-evenly 在零项时不产生虚拟 spacing
- placement transform 使用 child allocation bounds origin、item margin和已解析 alignment，不假设 bounds 从零开始

所有最终 child 通过同一个 runtime Scope 输出；overflow=clip 时 Scope 使用 container allocation clip。paint order 保持 authored children 顺序，不随 reverse 或 wrap-reverse 改变；布局顺序与绘制顺序是两个独立量。

FlexLayout 只在 row/row-reverse 时向父布局显式返回 dimension=`y` 的 first/last baseline guides；column/column-reverse 始终省略，因为 baseline 不能用于 x 对齐。每条非空 line 在最终 placement 后分别合成 resolved first/last guide：

1. first guide 先取 resolved alignSelf 为 first-baseline 的 participants，last guide先取last-baseline participants；participant 的真实guide或allocation edge fallback都经最终translation转为container coordinate，solver必须验证这些已对齐坐标在ADR-01 epsilon内相等
2. participant集合中有真实guide时，以最低sourceIndex的真实guide坐标为canonical值；否则以最低sourceIndex的edge fallback为canonical值
3. 没有对应baseline participant时，first按line layout traversal正序、last按逆序选择第一个暴露对应真实guide的item；仍没有时，对相同顺序的第一个item使用allocation start/end edge fallback

container first guide取物理 y 最小的line之resolved first guide，last guide取物理 y 最大的line之resolved last guide；物理位置相同时以line index为tie-break。wrap-reverse因此按最终物理位置选择，不按formation数组猜测。空容器不返回guide。所有guide都包含line/item translation并处于FlexLayout allocation coordinate中。

最终执行顺序固定为：main line formation 与 distribution → cross-metric probes → 初始 line metrics → container cross 求值 → alignContent/最终 line slots → stretch exact-cross probes → child alignment/placement → outgoing guides → replay/Scope 与 artifact。selected failed 候选在其成为某阶段必需结果时立即 `raise()`；未选中的 probe 全部丢弃。

### 纯 solver

line formation、freeze/redistribute、line cross metrics、distribution 和 placement 必须是无 Core context 的纯函数。compile 层负责 probe/result 转换和 replay；纯 solver 输入只含冻结的有限数值 DTO，输出冻结的 line/item placement DTO，不修改输入。

## DSL / API 表面

```tsx
<FlexLayout
  direction="row"
  size={{ x: { kind: 'fill' }, y: { kind: 'content' } }}
  columnGap={8}
  alignItems="first-baseline"
>
  <LayoutItem kind="flex" itemKey="symbol" shrink={0}>
    <Node shape="circle" minimumSize={12} />
  </LayoutItem>
  <LayoutItem kind="flex" itemKey="label" grow={1} min={40}>
    <Node>Long legend label</Node>
  </LayoutItem>
</FlexLayout>
```

规范 JSON/Vanilla 输入使用 `children: IRFlexLayoutItem[]`；React `LayoutItem` 的 `itemKey` 转换为 JSON `key`，具体 adapter 由 ADR-06 冻结。

## 被否决的方案

- 完整复制 CSS Flexbox：order、auto margin、writing mode 等增加复杂度但不服务当前绘图消费方
- 单次 natural measurement 后缩放 primitive：文本重排、fixed geometry 和 baseline 都会错误
- grow/shrink 不设 freeze loop：item 命中 min/max 后剩余空间无法守恒
- reverse 同时反转 paint order：布局方向变化不应无意改变 overlay/overflow 的视觉层级
- stretch 直接改 transform scale：会改变描边、文字和视觉 bounds 语义
- 保存跨 compile flex state：alpha.2 是静态确定性布局，不引入增量 solver

## 测试设计

- pure solver：line formation、wrap/reverse、grow/shrink freeze、min/max、gap、distribution、终止性与不可变性
- compile：text main→cross feedback、baseline、stretch fixed child、non-zero bounds、nested Flex、overflow/clip
- schema：默认值、零值、非法 factor、min>max、kind mismatch、duplicate key
- artifact 与 adapter 证据在 ADR-06 收口

详细行为到证据映射见 ignored `TEST_CONTRACT.md`。

## 影响

- 新增 `standard.flexLayout` layout-aware Composite、factory、Definition与公共类型
- 不改变 Core、renderer 或 alpha.1 composite
- React/Vanilla 与 docs 接线在 alpha.3 ADR-06 统一修改
- 新增公开 IR，无兼容迁移负担

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 上层的一维通用 Box layout
- 解决的问题：任意 IRChild 的线性分配、换行和跨轴对齐
- 主责包与协作包：Standard 主责 schema/solver/definition；Core 主责 probe/replay；adapter 等价 authoring
- 是否可由现有能力组合：Core 机制可组合，但一维 solver 是 Standard 新能力
- 是否需要下沉到依赖能力域：否
- 内部表达链路：Flex schema → contextual probes → pure line solver → Scope/replay
- 外部扩展链路：Flex 语义闭合，不设 provider registry；custom child 通过 Core registry 同路消费
- 下游执行 / adapter 等价性：输出既有 transform/clip Scene；React/Vanilla 生成同一 IR
- 不支持边界与诊断：非法 factor/minmax/kind、无界 fill与最终 selected failure fail-loud
- 本轮结论：扩展 Standard 当前能力域

## 不在本 ADR 范围

- CSS order、auto margin、writing mode、visibility collapse
- percentage/calc basis、aspect-ratio negotiation
- masonry、二维 track、全局 collision
- artifact payload、React/Vanilla 最终接线和 docs 页面

## 最终实现摘要

- 实现 `standard.flexLayout` strict schema、factory、Definition、line formation、wrap/reverse 与有界 grow/shrink freeze solver
- compile 通过 Core contextual probe 处理 minimum/natural、exact slot、文本主轴到交叉轴反馈、baseline、stretch refusal、overflow/clip 与 nested layout
- authored order 与 paint order 保持稳定，reverse 只改变 traversal/placement；typed lines 与 adapter/docs 由 ADR-06 收口

## 验证结果

- schema、pure solver 与 compile 测试覆盖 wrap/reverse、grow/shrink freeze、min/max、gap、distribution、baseline、nested、fixed overflow 与 selected failure
- Standard、Standard React、Standard Vanilla 包级类型检查、lint 与测试通过
- 双语文档包含基础、controls 与 overflow/clip 的真实 React/IR/Vanilla 预览

## 遗留风险

- 未支持 CSS order、auto margin、percentage/calc basis、writing mode 与 aspect-ratio negotiation
- 文本测量仍取决于宿主 measurer、字体及加载状态；solver 只保证给定相同 measurement 时确定
