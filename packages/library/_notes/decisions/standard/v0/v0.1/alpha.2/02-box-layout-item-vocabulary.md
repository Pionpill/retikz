# ADR-02：建立 Box、LayoutItem 与共享布局词汇

- 状态：Accepted
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-01](./01-layout-profile-core-gate.md) · [Core ADR-08](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

Flex、Grid、Overlay 都需要表达容器尺寸、padding、item margin、alignment、overflow 和稳定 item identity。如果三种容器各自复制字段，不同默认值和坐标口径会迅速漂移；如果提前抽象成可插拔“布局框架”，又会在没有第四种真实语义前制造无消费方的 registry 和策略层。

本 ADR 只抽取三种 alpha.2 容器已经确认共享的数据词汇、规范化规则和纯几何不变量。具体 line、track、positioned placement 仍由后续 ADR 所有。共享词汇是 JSON-safe 的闭合 schema，不选择算法实现，因此不需要 `defineLayout`。

## 决策：采用固定通用两级 Box 模型与带 kind 的 LayoutItem

布局统一分为两级：

1. **container box**：allocation box 从 `(0,0)` 开始，padding 内缩得到 content box
2. **item box**：父 solver 分配 margin box/slot，child 在 slot 中按 allocation bounds 对齐；visual bounds 只决定可见 overflow

不增加 CSS 的 content-box/border-box 切换。作者声明的 container size 始终是包含 padding 的 allocation size；alpha.2 没有 border，因此不存在第三层 border box。margin 位于 item slot 外，只做逐边加法，不支持负值、相邻折叠或 auto margin。

### 共享公开词汇

```ts
export const LayoutAxisSizeKind = {
  Content: 'content',
  Fixed: 'fixed',
  Fill: 'fill',
} as const;

export type IRLayoutAxisSize =
  | Readonly<{ kind: 'content'; min?: number; max?: number }>
  | Readonly<{ kind: 'fixed'; value: number }>
  | Readonly<{ kind: 'fill'; min?: number; max?: number }>;

export type IRLayoutSize = Readonly<{
  x: IRLayoutAxisSize;
  y: IRLayoutAxisSize;
}>;

export const LayoutItemKind = {
  Flex: 'flex',
  Grid: 'grid',
  Overlay: 'overlay',
} as const;

export type IRLayoutItemBase = Readonly<{
  kind: 'flex' | 'grid' | 'overlay';
  key: string;
  child: IRChild;
  margin: number | IRBoxSpacing;
}>;
```

所有 `IRXxx` 类型均由 schema 的 parsed output 推导，schema default 在类型中是必填 canonical 值；允许省略默认值的作者输入单独使用 `XxxInput = z.input<typeof XxxSchema>`。factory 接收 Input 并返回 IR，不能手写一套 optional IR interface。

另公开以下 const object enum 与派生 value type：

- `LayoutAlignment`：`start | center | end | stretch | first-baseline | last-baseline`
- `LayoutEdgeAlignmentValue`：从 LayoutAlignment 排除 baseline 的派生类型，供 x 轴和不支持 guide 的字段使用
- `LayoutDistribution`：`start | center | end | stretch | space-between | space-around | space-evenly`
- `LayoutOverflow`：`visible | clip`

baseline 只在对应维度具有 Core guide 时成立。具体容器 schema 必须限制哪些字段能接受 baseline；不能因为共享 enum 存在就让所有 alignment 组合合法。

`composites/shared/layout/index.ts` 与 Standard 包根精确公开：

- schema：`LayoutAxisSizeSchema`、`LayoutSizeSchema`、`LayoutContainerBoxSchema`、`LayoutItemBaseSchema`、`LayoutAlignmentSchema`、`LayoutEdgeAlignmentSchema`、`LayoutDistributionSchema`、`LayoutOverflowSchema`
- parsed output / input type：`IRLayoutAxisSize` / `LayoutAxisSizeInput`、`IRLayoutSize` / `LayoutSizeInput`、`IRLayoutContainerBox` / `LayoutContainerBoxInput`、`IRLayoutItemBase` / `LayoutItemBaseInput`
- const object enum / value type：`LayoutAxisSizeKind` / `LayoutAxisSizeKindValue`、`LayoutItemKind` / `LayoutItemKindValue`、`LayoutAlignment` / `LayoutAlignmentValue`、`LayoutDistribution` / `LayoutDistributionValue`、`LayoutOverflow` / `LayoutOverflowValue`
- 派生收窄类型：`LayoutEdgeAlignmentValue`；其 schema 为上述公开 `LayoutEdgeAlignmentSchema`

除此之外的 resolver、rect、axis mapping、weighted water-fill DTO 与 helper 均只存在于 internal barrel，不从 `composites/shared/layout/index.ts` 或包根导出。

### Container size 求值

每个轴省略 size 等价 `{ kind: 'content' }`：

- `content`：以 solver 得到的 minimum/natural contribution 为候选，再受作者 min/max 与父 proposal 约束
- `fixed`：真实 container allocation 始终为 value；父 exact/range 仍可能形成不同 `slotSize`，由上层处理 underfill/overflow
- `fill`：父 exact 取 exact；finite range 取 max；intrinsic 或省略 max 的 range 没有 finite available，必须失败
- `min`/`max` 是作者硬边界，必须有限非负且 min ≤ max；与父 proposal 无交集时保留作者边界形成的真实 allocation，并让 slot/allocation 差异显式暴露，不伪造满足

content contribution 的 clamp 顺序固定为：先计算未约束 contribution，再应用作者 min/max，最后在有交集时落入父 range/exact。fixed 不经过 content clamp。fill 选择 finite available 后应用作者 min/max。

共享纯函数 `resolveLayoutAxisSize()` 的输入固定为 `{ axis, policy, proposal, minimumContribution, naturalContribution }`，`axis` 只能是 `x | y`；两个 contribution 必须是有限非负数，即使 fixed/fill 分支不消费也由调用者显式传入。输出为 `{ allocationSize, finiteAvailable? }`：exact 与 finite range 分支返回对应 `finiteAvailable`，intrinsic 与 unbounded range 不包含该字段。`finiteAvailable` 只能来自当前 Core axis proposal 的 `exact.value` 或 finite `range.max`，不得从作者 max、renderer viewport、另一轴或隐式宿主状态推导。Core 仍独立产生父级 `slotSize`，本函数不伪造或覆盖它。

无界 fill 由 `resolveLayoutAxisSize()` 抛出稳定的 Standard contract error：`Standard layout fill requires a finite parent allocation on <axis>`。根 layout 在 natural compile 中直接暴露该错误；nested layout 经父级 `layoutChild()` probe 时由 Core 现有 failure isolation 转为 `LayoutChildProbe.Failed`，父级只能丢弃该候选或用 `raise()` 提升，不新增 Standard failure 类型，也不伪造 `LayoutChildFailure`。

### Spacing、对齐与 overflow

- padding、margin 均接受有限非负 number 或 Core `BoxSpacingSchema`；number 展开到四边，side 字段按 Core 既有 precedence 规范化
- padding 计入 container allocation；item margin 计入父 solver 的 outer size，但不进入 child proposal
- 每轴 content rect 固定为 `start = allocationStart + leadingPadding`、`size = max(0, allocationSize - leadingPadding - trailingPadding)`；padding 总和超过 allocation 时不扩张 fixed container、不缩短 authored padding，content rect 退化为位于 authored leading inset 的零尺寸 rect，超出的 padding 与后续 child placement 都作为显式 overflow
- start/center/end/stretch 始终相对当前物理轴；x start 是左，y start 是上
- stretch 表示给 child 发送 slot 对应的 exact proposal，不表示 primitive scale；child 拒绝时 slot 与 allocation 可以不同
- first/last baseline 只消费 `alignmentGuides`；缺失 first guide fallback 到 allocation start edge，缺失 last guide fallback 到 end edge
- `visible` 不加 clip；`clip` 以 container allocation box 创建一个 Core runtime Scope clip。allocation width/height 都大于零时使用 rect clip；任一轴为零时使用退化闭合 path：`move(0,0) → line(width,0) → line(width,height) → line(0,height) → close`，其填充区域确定为空。两种表达都保留最终 replay 与 artifact，只改变 visible bounds，不反向改变 contribution、slot 或 allocation

### LayoutItem identity

- `key` 必填、非空、只在当前 container children 中唯一
- key 不等于 Core namespace id、全局 semantic identity 或 React key
- artifact envelope 的 `occurrence` 定位 container；item key 定位该 container 内的 authored item
- nested container 各自维护本地 key 空间，不拼接或重写 child artifact
- 三个 item variant 由后续 ADR 扩展同一个 base shape；父 container 必须拒绝 kind 不匹配的 item

### 纯函数边界

共享层可以提供 spacing normalization、rect inset/outset、finite arithmetic、axis mapping、alignment translation、overflow intersection、duplicate-key validation，以及 Flex 和 Grid 共同消费的纯数值 weighted water-fill。该 water-fill 只接收 base/min/max/weight 与可分配总量，使用 ADR-01 唯一 epsilon，按稳定 index 执行 freeze 和残差归属，不知道 line、track 或 item schema。共享层不保存 compile context、probe result 或 replay token，不调 registry，也不决定 Flex line/Grid track/Overlay position。

public `composites/shared/layout/index.ts` 只导出 schema、类型和常量。纯几何 helper 放入不向包根导出的 `composites/shared/layout/internal/` barrel，三个 container 从该 secondary owner barrel 消费；alpha.2 不把实现 helper 误承诺为长期用户 API。

## DSL / API 表面

```ts
const boxInput = {
  size: {
    x: { kind: 'fill', min: 120, max: 480 },
    y: { kind: 'content', min: 40 },
  },
  padding: { x: 12, y: 8 },
  overflow: 'clip',
} satisfies LayoutContainerBoxInput;

const itemInput = {
  kind: 'flex',
  key: 'legend-label',
  margin: { right: 8 },
  child: { type: 'node', position: [0, 0], text: 'Revenue' },
} satisfies FlexLayoutItemInput;
```

## 被否决的方案

- 复制 CSS box-sizing、auto margin、负 margin 和 margin collapse：浏览器兼容历史不服务确定性绘图布局
- 用 width/height/minWidth 等平铺字段：轴策略与 min/max 组合难以形成闭合 union，错误路径不清楚
- 让 `fill` 在无界空间默认为零或自然尺寸：同一输入会因宿主是否提供 available size产生隐式语义
- 省略 item key并只用数组 index：插入/reorder 后 artifact identity 漂移
- 建立可注册 LayoutDefinition：三种容器是闭合的官方 Composite，自定义容器直接使用 Core `defineComposite`
- 用 visual bounds 做 size contribution：阴影、描边等视觉外溢会反向改变结构布局

## 影响

- 新增 Standard 公共 layout shared schema、常量与派生类型；纯 solver helper 只在 private internal barrel 共享
- 不新增 Core IR、Scene primitive、renderer contract、compile option 或 registry
- ADR-03～05 必须复用这些 schema/规范化函数，不能复制默认值
- 公开 IR 是 alpha.2 新能力，不迁移 alpha.1 `Grid`、`Axes` 或 `Frame`

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 上层的通用静态 Box layout vocabulary
- 解决的问题：三种容器共享一致的 JSON 输入、尺寸与坐标不变量
- 主责包与协作包：Standard 主责 schema/纯几何；Core 提供 IRChild、spacing、proposal/replay；adapter 只转换 authoring
- 是否可由现有能力组合：Core 提供底层机制，但不拥有这些上层容器字段，需要扩展 Standard
- 是否需要下沉到依赖能力域：否；没有新的通用 Core 机制
- 内部表达链路：strict schema → canonical spacing/size → container-specific solver → Core replay
- 外部扩展链路：闭合 vocabulary 不需要 registry；第三方布局通过 Core CompositeDefinition 自定义
- 下游执行 / adapter 等价性：React/Vanilla 都产生相同 Standard IR；renderer 只执行已有 transform/clip
- 不支持边界与诊断：无界 fill、非法数值、重复 key、kind mismatch fail-loud
- 本轮结论：扩展 Standard 当前能力域

## 不在本 ADR 范围

- Flex grow/shrink/wrap、Grid track、Overlay anchor/position
- auto margin、negative margin、margin collapse、percentage、calc、writing mode
- border、background、scroll、pagination、fragmentation
- 全局 identity、Target、Connector、selection 或编辑器状态

## 遗留风险

- percentage、calc、auto/negative margin、writing mode 与 fragmentation 尚未设计，未来引入时需要新的公开契约
- 共享层当前只服务已实现的三种容器；出现第四种真实模型前不抽象可注册 layout framework
