# ADR-06：用 Typed Artifact、Capability 与等价 Adapter 收口布局容器

- 状态：Accepted
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-02](./02-box-layout-item-vocabulary.md) · [ADR-03](./03-flex-layout.md) · [ADR-04](./04-grid-layout.md) · [ADR-05](./05-overlay-layout.md) · [alpha.1 ADR-05](../alpha.1/05-capability-loading.md)

## 背景

Flex/Grid/Overlay 能产生正确 Scene 还不等于能力闭环。上层 Tier 2、headless 工具和调试器需要稳定读取 container/item slot、真实 bounds、line/track/placement与 overflow；React、Vanilla和直接 JSON必须通过同一 Standard IR与Core registry得到等价结果。

Core layout-aware Composite已经提供typed artifact envelope、occurrence locator和artifact schema验证。Standard应返回领域内artifact payload，而不是把solver对象、replay token或Scene primitive泄漏给调用方。alpha.1 capability module/bundle/preset也已经足够组合三项新definitions，不需要布局专属registry。

## 决策：公开三种可判别 artifact，并沿用 alpha.1 capability loading 完成三包接线

### Shared artifact contract

三种artifact共用strict JSON schema：

```ts
export type LayoutArtifactRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type LayoutArtifactItemBase = Readonly<{
  key: string;
  sourceIndex: number;
  marginBounds: LayoutArtifactRect;
  slotBounds: LayoutArtifactRect;
  allocationBounds: LayoutArtifactRect;
  visualBounds: LayoutArtifactRect;
  visibleBounds: LayoutArtifactRect | null;
  translation: Readonly<{ x: number; y: number }>;
  overflow: Readonly<{
    allocation: Readonly<{ x: boolean; y: boolean }>;
    visual: Readonly<{ x: boolean; y: boolean }>;
    clipped: boolean;
  }>;
  alignmentGuide?: Readonly<{
    name: string;
    position: number;
    fallback: boolean;
  }>;
}>;

export type LayoutArtifactContainer = Readonly<{
  allocationBounds: LayoutArtifactRect;
  contentBounds: LayoutArtifactRect;
  visualBounds: LayoutArtifactRect;
  visibleBounds: LayoutArtifactRect | null;
}>;

export type LayoutTrackArtifact = Readonly<{
  index: number;
  start: number;
  size: number;
  sourceKind: 'fixed' | 'content-minimum' | 'content-natural' | 'fraction' | 'minmax';
  implicit: boolean;
}>;
```

上述代码只展示schema inferred output的形状，不是手写类型真源。实现以公开strict `LayoutArtifactRectSchema`、`LayoutArtifactOverflowSchema`、`LayoutArtifactAlignmentGuideSchema`、`LayoutArtifactItemBaseSchema`、`LayoutArtifactContainerSchema`、`LayoutTrackArtifactSchema`为单一真源，所有同名类型均用`z.infer`。

rect都位于当前container allocation coordinate，x/y有限，width/height有限非负：

- `slotBounds` 是父solver最终分配的无margin child slot；`marginBounds = outset(slotBounds, resolvedMargin)`
- `allocationBounds`/`visualBounds` 是child local rect应用最终translation后的结果，不允许假定local origin为零
- `visibleBounds`：overflow=visible时等于visualBounds；clip时取visualBounds与container allocationBounds交集，无正面积交集或zero-area clip时为null
- item `overflow.allocation.x/y` 表示translated allocationBounds在该轴超出slotBounds；`overflow.visual.x/y`表示visualBounds在该轴超出slotBounds
- `overflow.clipped`只在overflow=clip且visualBounds确有任何部分落在container allocationBounds外时为true；仅启用clip但没有裁切为false
- `alignmentGuide`只记录该item本次alignment实际采用的first/last真实guide或edge fallback；position是应用最终translation/offset后的container-local坐标，fallback区分是否使用边缘
- container visualBounds为所有item visualBounds的union；默认content/content、零padding且空items时使用canonical `(0,0,0,0)`，visibleBounds为null。fixed/fill空container仍保留其非零allocation/content rect，但visual保持canonical zero

artifact不重复Core envelope的namespace/type/occurrence，不保存proposal、probe failure、replay token、definition、函数、Map/Set或child私有IR。item key只在当前container内解释；nested layout有自己的artifact envelope与key空间。

### Container-specific artifact

```ts
export type FlexLayoutArtifact = Readonly<{
  kind: 'flex';
  container: LayoutArtifactContainer;
  items: ReadonlyArray<LayoutArtifactItemBase & { line: number }>;
  lines: ReadonlyArray<{
    index: number;
    itemKeys: ReadonlyArray<string>;
    mainAxis: 'x' | 'y';
    mainStart: number;
    mainSize: number;
    crossStart: number;
    crossSize: number;
  }>;
}>;

export type GridLayoutArtifact = Readonly<{
  kind: 'grid';
  container: LayoutArtifactContainer;
  items: ReadonlyArray<
    LayoutArtifactItemBase & {
      column: number;
      row: number;
      columnSpan: number;
      rowSpan: number;
    }
  >;
  columns: ReadonlyArray<LayoutTrackArtifact>;
  rows: ReadonlyArray<LayoutTrackArtifact>;
}>;

export type OverlayLayoutArtifact = Readonly<{
  kind: 'overlay';
  container: LayoutArtifactContainer;
  items: ReadonlyArray<
    LayoutArtifactItemBase & {
      placement: 'aligned' | 'positioned';
      sizeParticipation: 'include' | 'exclude';
      zIndex: number;
    }
  >;
  paintOrder: ReadonlyArray<string>;
}>;
```

track index必须是从0连续递增；start是container allocation coordinate中的物理x或y坐标，数组按物理start升序，size有限非负。`sourceKind`来自authored/implicit track最外层kind，content细分minimum/natural；minmax统一为minmax。`implicit`在index超出对应authored显式track数组时为true。Grid item placement使用resolved连续track indexes，所有`start + span`必须落在artifact track数组内。

Flex items数组保持authored sourceIndex顺序；lines按最终物理cross placement编号，`itemKeys`按该line layout traversal顺序，并且全部lines对items key形成无重复、无遗漏的精确partition。每个`item.line`必须指向存在的连续line，且该item key恰好出现在该line的itemKeys中；反向也必须一致。wrap-reverse可以使line index与formation顺序不同。Grid items同样保持authored顺序；columns/rows各自连续且resolved placement有效。Overlay items保持authored顺序；paintOrder是全部item key恰好一次的全排列，按zIndex升序、同值sourceIndex升序。

这些跨字段条件由各`artifactSchema.superRefine()`验证，而不是只依赖definition“应该生成正确”：duplicate/missing key、非连续track/line index、越界span、错误paintOrder或sourceIndex不连续都由Core artifactSchema validation fail-loud。

每个definition声明对应artifactSchema并返回artifact。公开：

- `LayoutArtifactRectSchema` / `LayoutArtifactRect`
- `LayoutArtifactOverflowSchema` / `LayoutArtifactOverflow`
- `LayoutArtifactAlignmentGuideSchema` / `LayoutArtifactAlignmentGuide`
- `LayoutArtifactItemBaseSchema` / `LayoutArtifactItemBase`
- `LayoutArtifactContainerSchema` / `LayoutArtifactContainer`
- `LayoutTrackArtifactSchema` / `LayoutTrackArtifact`
- `FlexLayoutArtifactSchema` / `FlexLayoutArtifact` / `FlexLayoutCompileArtifact`
- `GridLayoutArtifactSchema` / `GridLayoutArtifact` / `GridLayoutCompileArtifact`
- `OverlayLayoutArtifactSchema` / `OverlayLayoutArtifact` / `OverlayLayoutCompileArtifact`
- `LayoutArtifactSchema` / `LayoutArtifact` 三种payload union

上述schema/type全部从`composites/shared/layout`与三container public barrel进入Standard包根；不存在引用private rect DTO的public type。compile artifact envelope类型使用Core `CompositeArtifactOf<typeof XxxDefinition>` 推导，不手写平行namespace/type。

overflow是正常可观察状态，不自动发warning。非法输入、solver非有限状态、selected failure和Core contract violation继续fail-loud；clip只把artifact `clipped`/visibleBounds与Scene Scope表现对齐。

三种item schema完成后，`composites/layout-item/` 只做公共聚合：

```ts
export const LayoutItemSchema = z.discriminatedUnion('kind', [
  FlexLayoutItemSchema,
  GridLayoutItemSchema,
  OverlayLayoutItemSchema,
]);

export type IRLayoutItem = z.infer<typeof LayoutItemSchema>;
```

各container仍直接消费自己的精确item schema，不通过宽union后再运行时猜kind。该聚合不拥有solver或registry，只为通用authoring、schema registry和类型收窄提供单一公共入口。

### Capability loading

每个definition提供独立module：

- `FlexLayoutModule`，name `standard.flexLayout`
- `GridLayoutModule`，name `standard.gridLayout`
- `OverlayLayoutModule`，name `standard.overlayLayout`

新增：

```ts
export const StandardLayoutPreset = createStandardBundle([FlexLayoutModule, GridLayoutModule, OverlayLayoutModule]);
```

`StandardAllPreset` 在现有 Grid、Axes、Frame之后按FlexLayout、GridLayout、OverlayLayout顺序扩展。import仍无副作用；direct definition、单module、StandardLayoutPreset、custom bundle和StandardAllPreset全部交给Core唯一Composite registry。重复definition不在Standard去重，由Core给出权威冲突诊断。

不新增 `defineLayout`、layout registry、compile option或package subpath。

### React authoring

公开 `FlexLayout`、`GridLayout`、`OverlayLayout` 与只能作为三者直接语义child的 `LayoutItem`。

`LayoutItemProps` 是以 `kind` 判别的三种item props union：

- JSON字段 `key` 在React中命名 `itemKey`，不读取React保留的 `key`
- 恰好选择一种child输入：一个React drawable child，或显式 `ir: IRChild`
- React child经公开Kernel转换入口必须恰好得到一个IRChild
- transparent Fragment可以包裹LayoutItem，但一个LayoutItem内部不能展开成多个IRChild
- item kind必须与父container匹配；LayoutItem脱离container或container出现普通direct child均fail-loud
- 默认值只由Standard schema产生，adapter不复制solver或schema defaults

嵌套Standard Layout JSX必须闭环。三个React adapter精确共用contribution namespace `standard.layout`、同一个React包模块级函数引用`makeReactStandardLayoutComposites`，该函数每次返回`[...StandardLayoutPreset.compile.composites]`可变Array副本并保持Flex/Grid/Overlay顺序，datasets始终为空。namespace与maker必须同时相同，保证Kernel按namespace聚合时只调用一次maker，不向Core提交重复definition。

Layout container解析每个LayoutItem的drawable child时调用React公开JSX转换入口并读取contributions：零个或多个IRChild都fail-loud；恰好一个IRChild时，只接受所有contribution均满足`namespace === 'standard.layout'`、`makeComposites === makeReactStandardLayoutComposites`且datasets为空。符合者折叠为该container自己的同一family contribution；任一foreign namespace、不同maker或非空datasets立即抛稳定`Standard LayoutItem cannot forward foreign Tier 2 contributions`诊断。

LayoutItem中的foreign Tier 2 React embeddable若产生额外contribution必须fail-loud，并提示改用该领域包后续的内部Standard适配，或使用 `ir` 加宿主显式definitions；不得静默丢失nesteddefinition。这个限制只属于当前React authoring协议，不限制规范Standard IR接受任意合法IRChild。

### Vanilla authoring

公开：

- `flexLayout(id, input)` / `FlexLayoutVanillaAdapter`
- `gridLayout(id, input)` / `GridLayoutVanillaAdapter`
- `overlayLayout(id, input)` / `OverlayLayoutVanillaAdapter`
- shallow-frozen `StandardLayoutVanillaAdapters`，顺序Flex/Grid/Overlay

三个Vanilla adapter同样精确使用namespace `standard.layout`、同一个Vanilla包模块级`makeVanillaStandardLayoutComposites`引用与空datasets；maker每次返回`[...StandardLayoutPreset.compile.composites]`Array副本并保持Flex/Grid/Overlay顺序。React与Vanilla只需各自在本包内共享稳定引用，不要求跨包函数identity相同。`StandardVanillaAdapters`在现有Grid/Axes/Frame后追加三项。Vanilla nested layout child只能是`createFlexLayout/createGridLayout/createOverlayLayout`返回的canonical IRChild；`VanillaEmbedSpec`只允许出现在宿主spec traversal层，不能塞进Layout item的JSON `child`。plain input/factory直接使用Standard schema；adapter不保存DOM、renderer或layout state。

foreign/custom canonical IR child的definitions仍由宿主compile options显式提供，Standard不扫描IR猜测registry。测试必须分别证明nested Standard只产生一组family definitions、foreign/custom IR加宿主definitions可compile，以及重复family definition仍由Core权威诊断。

### 文档闭环

新增双语组件页与真实demo：

- `/standard/layout/flex-layout`：grow/shrink/wrap/baseline/overflow
- `/standard/layout/grid-layout`：tracks/span/auto-placement/fraction/nested
- `/standard/layout/overlay-layout`：aligned/positioned/anchor/participation/paint order

同步：

- Standard composite分组页、introduction和get-start
- capability-loading页的三modules、StandardLayoutPreset、StandardAllPreset与adapter数组
- schema registry/API表、sidebar/data/i18n、source links
- Standard v0.1 changelog草稿
- 一个nested三容器示例、一个typedartifact headless示例、一个overflow/clip对比

文档不修改Plot/Table/Gantt页面，也不公开这些包未来选择哪种container。

## DSL / API 表面

```tsx
<Layout>
  <FlexLayout direction="row" columnGap={8}>
    <LayoutItem kind="flex" itemKey="plot" grow={1}>
      <GridLayout columns={[{ kind: 'fraction', factor: 1 }]}>
        <LayoutItem kind="grid" itemKey="mark">
          <Node position={[0, 0]}>Mark</Node>
        </LayoutItem>
      </GridLayout>
    </LayoutItem>
  </FlexLayout>
</Layout>
```

```ts
const result = compileToScene(ir, {
  composites: StandardLayoutPreset.compile.composites,
});

const flex = result.artifacts.find(artifact => artifact.kind === 'composite' && artifact.type === 'flexLayout');
const flexValue = FlexLayoutArtifactSchema.parse(flex?.value);
```

`StandardLayoutPreset.compile.composites`按现有bundle contract擦除为通用definition数组，因此只判断envelope type不会让`value`在TypeScript中自动收窄；headless调用方使用公开payload schema解析，或直接携带精确definition tuple取得`CompositeArtifactOf`类型。

## 被否决的方案

- 只返回Scene不提供artifact：Tier 2会重新推导slot/track/overflow，形成第二真源
- artifact保存solver对象或replay token：不可序列化且泄漏compile-local能力
- 把item key拼成全局path：nested owner和Core occurrence职责混淆
- 为布局新建registry/preset runtime：alpha.1 module/bundle已经足够
- React读取React key作为IR identity：key不是普通prop，SSR/转换路径也不稳定
- LayoutItem允许多个children并隐式生成items：无法给每项稳定key和per-item策略
- React静默接受foreign Tier 2 nested contribution：会得到IR但缺definition/dataset，错误延迟到compile
- adapter或renderer回读artifact修正layout：artifact是输出，不是第二轮求解输入

## 测试设计

- artifact schema/type：三种kind、rect空间、line/track/paint order、overflow/clip、envelope occurrence与JSON round-trip
- capability：独立modules、layout preset、all preset顺序、third-party module、duplicate Core diagnostic和无import副作用
- React：LayoutItem union、itemKey、single child/ir互斥、nestedStandard、foreignTier2 rejection和direct definition parity
- Vanilla：三builders、partial/all adapter、nestedStandard、SSR/directIR parity
- docs/schema registry/source link/integrity与真实demo
- normal overflow收集到的warnings保持为空；非法schema、非有限solver、selected failure仍fail-loud

详细行为到证据映射见 ignored `TEST_CONTRACT.md`。

## 影响

- 修改三种definition以声明typed artifact
- 扩展Standard根导出、preset和三包authoring表面
- 新增用户可见文档、demo、API表与changelog
- 不改变Core、renderer或其它Tier 2公开契约

## 能力完备性检查

- 所属能力域与能力面：Standard通用布局的可观察产物、加载与跨入口闭环
- 解决的问题：让布局语义可持久化authoring、可组合注册、可诊断compile并由headless调用方读取
- 主责包与协作包：Standard主责artifact/schema/module；Core主责envelope/registry；React/Vanilla主责等价authoring；docs主责用户证据
- 是否可由现有能力组合：组合Core typedartifact和alpha.1 bundle机制，同时扩展Standardadapter/docs
- 是否需要下沉到依赖能力域：否；foreignTier2 React nesting若未来通用化需独立上移到Core React ADR
- 内部表达链路：canonicalIR → definition/solver → typedartifact + Scene
- 外部扩展链路：custom child/Composite继续Core registry；Standard modules与第三方结构module同路
- 下游执行 / adapter 等价性：directJSON、React、Vanilla产出相同IR并得到等价Scene/artifact
- 不支持边界与诊断：foreignTier2 nested JSX明确拒绝；IR+显式definitions仍完整支持
- 本轮结论：组合现有Core能力并扩展Standard跨入口闭环

## 不在本 ADR 范围

- Plot/Table/Gantt适配或领域artifact/provenance
- 通用nestedTier2 React contribution协议修改
- artifact增量diff、跨compile cache或interactive inspection runtime
- renderer-specific layout debug overlay
- package subpath、global registration或implicit preset

## 最终实现摘要

- 公开 `LayoutArtifactSchema` 与 Flex/Grid/Overlay 三种 strict typed payload，统一 container/item rect、overflow、visible bounds 与 alignment guide，并分别补充 line、track、span 与 paint order
- 新增三项 capability modules、`StandardLayoutPreset`、`StandardAllPreset` 接线以及稳定的 React/Vanilla adapter family；direct JSON、React 与 Vanilla 进入同一 Core registry/compile 路径
- 新增 `/standard/layout` 分组、三个组件页、契约参考页、双语 controls/demo、schema registry、changelog 与 ComponentPreview IR→Vanilla 支持

## 验证结果

- Standard、Standard React、Standard Vanilla 与 Docs 的 lint、`tsc --noEmit` 和包级测试通过
- artifact schema/compile、preset、adapter、capability loading、SSR/nested 与 docs canonical IR→Vanilla SVG 测试通过
- docs integrity、production build，以及桌面/500px、zh/en、React/IR/Vanilla、controls 极值与 console 的真实页面检查通过

## 遗留风险

- Plot、Table、Gantt 等 Tier 2 适配明确延期，各包采用的具体容器仍是内部实现细节
- foreign Tier 2 nested JSX 尚无通用 contribution 协议；直接 canonical IR 配合显式 definitions 仍可编译
- artifact 暂不提供增量 diff、跨 compile cache 或 renderer-specific debug overlay
