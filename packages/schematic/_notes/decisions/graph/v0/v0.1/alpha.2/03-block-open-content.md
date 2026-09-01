# ADR-03：Block 开放内容与布局容器

- 状态：Accepted
- 决策日期：2026-08-30
- 关联：[Graph v0.1 alpha.2 roadmap](./roadmap.md) · [被替代的固定结构决策](./01-block-composition.md) · [Block 整体宽度约束](./02-block-sizing.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [Group 通用包含与边界呈现](../alpha.1/10-group-composition.md)

## 背景与目标

Graph 需要一种可以作为关系节点使用、同时允许作者自由组织内部视觉内容的结构容器。代码、工程和节点图中的对象通常共享“外层边界内按稳定方向排列内容”的基本形态，但 Header、Section、Row 只是一种常见写法，并不是所有 Block 都必须保存的领域事实。若把这一写法固化为 Block Source grammar，用户必须先把任意内容改写成预设层级，官方类图等更高层封装也会与基础容器争夺同一语义真源

本决策把 `Block` 定义为具有 Graph identity、Standard Surface 和单一纵向布局的开放内容容器。Block 接受任意 JSON-safe Core 或 Tier 2 children；常见结构由独立、可选的 Graph 子组件表达，类图等封装则作为独立 Tier 3 语义下沉到 Block

## 决策

### Block 是开放内容的 Graph composite

Block 保持 `namespace: 'graph'`、`type: 'block'`，与 Graph、Group、Entity、Relation 并列。它表达“一个可被关系引用、内部内容按统一布局组织的图节点容器”，而不是特定代码结构、UML compartment 或产品节点格式

Block 接受零个或多个有序 `IRChild`。每个 child 可以是 Core Node、Path、Coordinate、Scope，现有 Graph composite、Layout、Standard composite，或其它已注册 Tier 2 composite。Block 不根据 child 类型、字段名称或声明位置推断 Header、Section、Row、port 或领域角色，也不收集成员数据库

Group 与 Block 保持不同职责。Group 表达任意内容属于同一个可见分组，不主动排列 authored children；Block 以纵向布局排列全部 children，并提供适合作为图节点的 Surface 默认。Group 可以包含 Block，Block 也可以包含 Group，二者不共享 discriminator、Source schema 或兼容别名

### Source 组合完整 Scope、Surface 与纵向布局能力

Block 复用完整 Core Scope surface，包括 `localNamespace`。Block 的显式 `id` 由包裹最外层 Surface 的根 Core Scope 发布，该 Scope 的整体边界与 Surface allocation 对齐；`localNamespace: true` 时，内部 child identity 使用 Core 既有局部 frame 隔离规则。Block 不自动为 children 创建 id、不为后代 id 添加 Block 前缀，也不提供跨 namespace fallback

Block 外框继续复用 Standard Surface 的 padding、background、border、cornerRadius 与 overflow。内容布局固定为 Layout FlexLayout 的 column 方向，按 authored order 排列 children；`gap` 复用 Layout 的非负间距语义。Block 不复制 Flex solver、proposal、allocation、artifact、overflow、measurement 或诊断

Block 的 `width` 与 `minWidth` 继续表示包含水平 padding 的外层 Surface 总宽度，并沿用独立宽度决策。省略两个尺寸字段时，Block 使用有效 `minWidth: 240`，内容需要更宽时继续自然增长；显式 `width` 或 `minWidth` 优先。该默认只进入 resolve 后的 Canonical，不写回 Source。Block 不保存布局结果或把外层尺寸复制到 child

Block 的组合默认是有效 `minWidth: 240`、纵向 `gap: 8`、外层 `padding: 8`、透明背景、`currentColor / 0.2 / 1` 边框、`cornerRadius: 8` 与 `overflow: 'visible'`。显式值优先于这些默认；默认不修改 Layout、Standard 或 Core 独立使用时的行为

### 常见结构是独立可选组件，不是 Block grammar

Header、Section 与 Row 不再是 `IRBlock` 的必填或嵌套字段，也不形成 Block-only child union。它们分别成为独立 Graph composite，可以作为普通 `IRChild` 出现在 Block 或其它接受 `IRChild` 的内容树中；Block 不识别、重排或要求这些类型

Header 组合 icon、title、description 与 trail，并下沉为横向 Layout。`direction` 只控制 title 与 description 文本区使用横向或纵向 Layout，不改变 icon、文本区、trail 的外层横向顺序。Section 组合任意有序 `IRChild`，以纵向 Layout 和可选 Surface 表达常见分区。Row 组合有序 Flex items，以横向 Layout 和可选 Surface 表达常见行。三者拥有自己的 discriminator、strict schema、Definition 与 lowering，不依赖隐式 Block 父上下文；Section 与 Row 额外复用完整 Scope identity

Header 的 title 必填，icon、description、trail、`direction`、`itemGap` 与 `justifyContent` 可选；省略 `direction` 时 title / description 默认纵向排列，显式 `horizontal` 时改为横向排列。外层默认使用 `8` 的横向 gap 和居中对齐，title / description 文本区默认使用 `4` 的最小间距和 Layout `start` 主轴分布。`itemGap` 直接复用 Layout gap 的有限非负数值契约，`justifyContent` 直接复用 FlexLayout 主轴分布的闭合集合与算法；横向使用 `space-between` 时，固定 gap 保持为最小间距，剩余空间由 Layout 在两个文本 item 之间分配。二者只影响文本区，不改变 icon、文本区、trail 的外层顺序或间距。title 默认使用 `base`、粗体与完全不透明文字，description 默认使用 `xs` 与 `0.7` 不透明度；显式 Core 文字字段优先

Section 默认使用 `8` padding、`4` 纵向 gap、`currentColor / 0.037` 背景、`currentColor / 0.1 / 1` 边框与 `8` 圆角。Row 默认不提供 padding（有效值 `0`），横向 gap 为 `8`，背景透明且不设置边框或圆角。Section / Row 的显式 Surface 与 Layout 字段优先，这些组合默认不改变 Standard 或 Layout 独立使用时的默认

Row 为常规文本提供 `content: IRBlockText | IRBlockText[]` Source 简写。`IRBlockText` 与 Header、Section 的文本字段复用同一结构：字符串表示常规文本，对象以必需的 `text` 搭配可选的 align、lineHeight、maxTextWidth、textColor、font 与 opacity 覆盖表达文本内容和样式。单个文本项下沉为一个无外框的普通 Core Node 并占满 Row；文本项数组按顺序下沉为多个普通 Core Node，每项使用相同的默认 Flex 分配并均分可用主轴空间，数组可以混合字符串与对象。Row content 默认使用 `sm` 字号，对象中的显式 `font.size` 及其它文本字段优先于 Row 的文本默认。`content` 保持为 sparse Source fact，生成的 Node、Flex item 与 key 只存在于 lowering，不写回 Source

Row 的高级 Source 通过 `children` 直接保存有序 `IRChild`，用于完整 Core Node 外壳、其它 composite 或任意自定义内容，不增加 `{ child }` 包装或公开的 item descriptor。`content` 与 `children` 是互斥内容来源。Graph 在 Row lowering 中把 content Node 与直接 child 统一为 effective Flex item，并设置 `basis: 0`、`grow: 1`、`shrink: 1` 与 lowering-only `min: 0`，使单个 item 占满 Row、N 个 item 均分可用主轴空间，不受 child intrinsic minimum 偏置。这些只是 Row item 的领域默认，不改变 FlexLayout item 的全局默认，也不写回 Source。React `<BlockRow>` 与 Vanilla Row 提供同一个 `content` 简写，并直接接受任意 children

Header、Section 与 Row 不建立成员、port 或 endpoint resolver。Section 与 Row 的显式 identity、Surface、NodeTarget、anchor、boundary 与 namespace 继续由实际 Standard / Core lower target 提供；Header 不额外声明 identity。renderer 不增加专用分支

具有显式 identity 的 Section、Row 或自定义 child 是否可被 Relation 引用，由其实际 lower target owner 的 NodeTarget、anchor、boundary 与 namespace 契约决定。Block 只保证自身根 Scope identity 与最外层 Surface allocation 的对齐，不把所有 children 自动升级为连接点

### 官方与用户 Tier 3 使用同一扩展方向

类图、数据结构、服务结构等具有独立持久化语义的封装属于 Block 之上的 Tier 3。它们拥有自己的 discriminator、schema、Definition、provider、领域默认与诊断，并把 Block 作为公开 lower target；不得通过 `Block.kind`、`Block.role` 或内置白名单挤入 Block Source

只提供便捷写法而没有独立持久化语义的封装可以直接生成 Block Source。需要 JSON 持久化与独立语义的官方或用户扩展必须经过同一个 Core composite Definition / provider 主链。Block 本身不为未知 Tier 3 建立第二套 registry，也不预建类图、socket、执行或编辑器字段

### Graph Theme 与下游职责保持不变

Block 可以提供局部 `graphTheme`，并把 Graph context 投影到可见 children 中的 Entity / Relation。投影沿用 Graph、Group、Block、Header、Section、Row 与 Core Scope 的已知内容边界，未知 Tier 2 composite 保持不透明。Graph Theme 不直接样式化 Block shell、结构组件 shell、普通 Layout / Standard / Core child 或未知 Tier 2 composite；child 显式样式仍优先

Diagram 可以把 Block 作为自动布局节点，并从 child 的显式 identity 派生所需 endpoint 投影。Graph 不保存 Diagram layout result、routing、endpoint 所属索引或 port constraint；Editor 的交互状态、选择、拖拽、历史与运行时执行也不进入 Block Source

### Direct IR、React 与 Vanilla 使用同一 Source

Direct IR、React `Block` 与 Vanilla `block` 必须产出同一个 schema-derived Block Source。React children 与 Vanilla authoring child 只负责归一为 JSON-safe `IRChild` 数组；adapter 不生成公共 identity、不解释 Tier 3 语义，也不计算布局

Header、Section 与 Row 的 Direct IR、React、Vanilla 入口同样产生各自唯一 Source；adapter 不把这些结构重新嵌回 `IRBlock`，也不建立只有某一入口可表达的私有 child 形态

Block 可以独立出现在 Scene、Layout、Graph、Group、另一个 Block 或其它接受 `IRChild` 的位置。renderer 只消费最终 Scene，不识别 Block 或其组合 sugar

## 基础数据结构与公开契约

以下结构表达 Block 的长期公开组合关系；实际 `IRBlock` 由 strict Zod schema 推导，并直接组合对应 owner 的公开 schema：

```ts
type IRBlock = IRScopeProps &
  BlockSurfaceFields &
  Readonly<{
    namespace: 'graph';
    type: 'block';
    graphTheme?: IRGraphThemeLayer;
    children?: ReadonlyArray<IRChild>;
    width?: number;
    minWidth?: number;
    gap?: number;
  }>;
```

`IRScopeProps` 是完整 Core Scope contract，不再排除 `localNamespace`。`BlockSurfaceFields` 直接组合 Standard Surface 的 padding、background、border、cornerRadius 与 overflow；字段默认、refinement 与失败语义以对应 owner 为真源。`gap` 使用 Layout 的有限非负间距契约。children 省略或为空都表示没有 authored content，但 Block 仍保持同一个 Surface 与纵向布局根形状

Header、Section 与 Row 的最小关系为：

```ts
type IRBlockHeader = Readonly<{
  namespace: 'graph';
  type: 'blockHeader';
  icon?: IRChild;
  title: IRBlockText;
  description?: IRBlockText;
  direction?: 'horizontal' | 'vertical';
  itemGap?: number;
  justifyContent?: FlexMainDistributionValue;
  trail?: IRChild;
}>;

type IRBlockSection = IRScopeProps &
  BlockSurfaceFields &
  Readonly<{
    namespace: 'graph';
    type: 'blockSection';
    title?: IRBlockText;
    children?: ReadonlyArray<IRChild>;
    gap?: number;
  }>;

type IRBlockRow = IRScopeProps &
  BlockSurfaceFields &
  Readonly<{
    namespace: 'graph';
    type: 'blockRow';
    gap?: number;
  }> &
  (
    | Readonly<{ content: IRBlockText | ReadonlyArray<IRBlockText>; children?: never }>
    | Readonly<{ content?: never; children?: ReadonlyArray<IRChild> }>
  );
```

Section 与 Row 的 Scope、Surface 和 gap 分别复用与 Block 相同的 Core、Standard 与 Layout owner。Header、Section title 与 Row content 共享同一个 `IRBlockText`，该结构只投影 Core Node 的文本内容和文本样式字段，不开放 Node identity、geometry 或 shell。Header 的 `itemGap` 与 `justifyContent` 分别直接组合 Layout 的 `LayoutGapSchema` 与 `FlexMainDistributionSchema`；Row 只在 lowering 中为 content Node 与直接 child 补齐统一的 Row-local Flex 默认

## 行为、失败语义与兼容性

- children 按声明顺序进入纵向布局；Block 不按类型重排、分组、去重或推断结构角色
- 省略 `width` 与 `minWidth` 时，Block 的有效外层最小宽度为 `240`；该默认不写回 Source，显式 `width` 或 `minWidth` 优先
- Header 缺失 title、`direction` 不是 `horizontal` / `vertical`、`itemGap` 为负数或非有限数、`justifyContent` 不属于 FlexLayout 主轴分布闭合集合，或 Header / Section / Row 出现未知字段、非法文本或 Surface 时，由各自 strict schema fail-loud。Row 同时提供 `content` 与 `children` 时 fail-loud；省略两者、空 content 数组或空 children 都合法，并保持稳定的 Surface / Layout 根形状
- child 的未知 composite、缺失 provider、schema、layout、identity 或 compile 失败使用对应 owner 的原诊断；Graph 不改写为 Block member 错误
- 重复 id、local namespace、未解析 target、anchor 与 boundary 继续由 Core fail-loud；Block 不增加 fallback、自动前缀或第二套 resolver
- 非有限或负数 gap、width、minWidth，非法 Surface 字段和未知 Block 字段由对应 strict schema fail-loud；`minWidth > width` 继续是非法状态
- Block 不自动创建 Relation、port、Header、Section、Row 或 Tier 3 结构，也不根据空内容切换另一种 lower 根形状
- 旧 `header`、`sections`、嵌套 rows / cells 与 `BlockHeader.trailing` 不再属于公开 Source；Header、Section、Row 改为独立 Source composite，Row 不再使用公开 Cell descriptor，而是直接保存 children，Header 右侧 slot 统一命名为 `trail`。alpha.2 直接删除旧契约，不提供 alias、migration、fallback 或新旧双轨
- ADR-03 supersede ADR-01 的固定 grammar、内部 region host 与排除 `localNamespace` 决策；ADR-02 的外层 width / minWidth 契约继续有效
