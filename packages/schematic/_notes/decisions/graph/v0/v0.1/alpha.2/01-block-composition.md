# ADR-01：Block 结构化内容与局部连接点

- 状态：Superseded
- 决策日期：2026-08-28
- 关联：[Graph v0.1 alpha.2 roadmap](./roadmap.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md) · [Group 通用包含与边界呈现](../alpha.1/10-group-composition.md)

> 后续演进：[`ADR-03`](./03-block-open-content.md) 已将固定结构迁移为可选独立 composite，并把 Block 重塑为开放内容的布局容器

## 背景与目标

Group 已能表达“这些任意内容属于同一个可见分组”，Entity / Relation 已能表达普通节点与关系，但代码和工程结构图还需要另一类稳定语义：一个对象自身具有可阅读的内部结构，并且关系可以连接到对象整体或其中某个结构区域。例如类、接口、模块、数据结构和服务说明通常由名称、说明、字段、方法或输入输出行组成；若把这些内容全部压成 Entity 文本，内部层次、排版意图和可寻址区域都会丢失

Blender、Gaea 等节点图同样要求关系连接到节点内部的具体行或区域。它们验证“稳定局部连接点”是实际需求，但其 socket 类型、执行、值传播、连接数量与编辑器状态属于各自领域，不应反向决定 Graph 的基础数据结构

本决策建立第五类 Graph semantic composite `Block`：以非递归、JSON-safe 的结构表达 Header、Section、Row 与 Cell，复用 Layout 排版和 Core NodeTarget 形成局部连接点，同时不建立平行 Port IR、执行模型或自动布局系统

## 决策

### Block 是独立结构化 composite

Block 使用 `namespace: 'graph'`、`type: 'block'`，与 Graph、Group、Entity、Relation 并列。它不是 Entity role：Entity 的长期语义是一个 Graph 实体下沉为单个 Core Node；Block 则拥有固定内部 grammar、局部布局、多个可寻址区域和多图元 lowering。把 Block 放入 Entity role 会使 role Definition 同时承担结构 schema、布局与 endpoint 发布，破坏 Entity 的一对一 lower 边界

Block 也不是 Group 变体。Group 接受任意 children 并只表达可见包含；Block 表达一个对象内部的稳定阅读结构。Group 可以包含 Block，Block Cell 也可以包含 Group 或其它合法 child，但二者不得共享 discriminator、Source schema 或兼容别名

Block 是闭合的结构能力。当前没有按名称切换 Block 结构或算法的真实消费者，因此不建立 Block role、kind、Definition registry 或预防性的 extension layer；Block 仍通过 Core composite Definition / provider 接入统一 compile 主链

### Source grammar 固定为 Header、Section、Row 与 Cell

Block 的长期结构为：

```text
Block
├─ Header
│  ├─ icon
│  ├─ title + description
│  └─ trailing
└─ Sections[]
   └─ Rows[]
      └─ Cells[]
```

Header 必须存在且 title 必填。icon、description 与 trailing 可选；icon 和 trailing 各承载一个任意 JSON-safe `IRChild`，中间区域固定按 title 在上、description 在下排列。trailing 是结构槽位名称，只表达右侧任意内容，不预设 badge、按钮、状态或端口语义

Section 可以声明显式 id 与可选 title，并且至少包含一个 Row。Row 可以声明显式 id，并且至少包含一个 Cell。Cell 承载一个任意 `IRChild`，同时直接组合 Layout Flex item 除固定 `kind` 外的公开字段；`key` 是 Row 内稳定排版身份，`basis`、`grow`、`shrink`、`min`、`max`、`margin` 与 `alignSelf` 的 schema、默认、refinement 和物理语义均以 Layout 为唯一真源

Block 的 sections 可以省略；出现时必须非空，因此 header-only Block 合法且不会保存与省略等价的空数组。Section 与 Row 不递归自身 grammar。需要更复杂的内容时，作者在 Cell 中放入另一个 Block、Group、Layout、Entity、普通 Core child 或其它已注册 composite；Graph 不为树形表格、UML compartment 或产品节点类型建立第二套嵌套模型

Header title、description 与 Section title 精确组合 Core Node 的文本字段，不复制文字、字体、颜色、换行、宽度、透明度或对齐 schema。结构文字不接受独立 position；其位置由 Block 内部 Layout 确定

### Layout 与可见结构复用现有 owner

Block 是 layout-aware composite。Header 外层使用横向 Flex，中央 title / description 使用纵向 Flex；Section、Row 与 Cell 的排列继续调用 Layout 公开 compiler，并继承 probe、replay、allocation、visual bounds、overflow、artifact 与诊断。Graph 不 deep import 或复制 Flex engine，也不把 Layout 的计算结果缓存进 Block Source

Block 根外框与内容 padding、background、border、cornerRadius、overflow 复用 Standard Surface 的公开字段与 lowering。Section / Row 的可见分隔和 endpoint host 使用固定 rectangle Core Node 的窄 lower-facing surface；Graph schema 只精确组合 identity、boundary、label 与可见 appearance 所需的现有 Node 字段，并排除由 Block 自身生成的 `type`、`shape`、`position` 与内部文本。Block 不建立平行 Surface、Node style、anchor 或 boundary schema

不能把 Core Node 的其余字段机械开放给结构 host：`rotate`、`scale`、padding、margin、minimum size 或 z-order 若只改变 Node 而不改变 Section / Row 内容布局，会使 endpoint geometry、可见边界与真实 allocation 分离。这些影响尺寸、变换或排序的字段保持不支持，而不是静默只作用于 host；未来若要开放，必须证明它们同时进入对应 Layout / Scope 语义并形成新的完整能力决策

Block、Header、Section、Row 与 Cell 之间的默认 gap、padding 和 Neutral appearance 属于 Block 组合默认：Block 外层与 Section 内容默认使用相同的 8 user units padding，Row 保持 8 user units padding。它们不能修改 Layout、Surface 或 Core 独立使用时的默认，也不得引入新的间距算法或公共 primitive

### Section 与 Row 通过 Core Node host 成为局部 endpoint

Block 最外层显式 id 由稳定根 Scope 发布，Relation 可以使用 Core NodeTarget 连接 Block 整体。每个具有显式 id 的 Section / Row 在 lowering 后生成一个与其最终 allocation 完全重合的 Core Node host；该 id 在当前 Core namespace 中发布，Node 的 anchor、boundary、margin、transform 后几何与失败语义全部沿用 Core

因此局部连接仍使用同一个 Relation endpoint：

```ts
source: { id: 'user.name', anchor: 'right' }
target: { id: 'validator.input', anchor: { side: 'left', fraction: 0.5 } }
```

Graph 不根据 `role`、字段名、数组下标或 child 类型猜测 endpoint，也不增加 `IRPort`、`PortSchema`、`port`、`connectable`、input / output 或第二套 resolver。Section / Row 是 Source 结构区域，Node host 是其 Core lower target，anchor / boundary 才决定区域上的具体连接点

省略 Section / Row id 时不生成公共 identity，也不能被 Relation 引用。重复 id、unresolved target 与非法 anchor / boundary 继续由 Core fail-loud。Block 复用除 `localNamespace` 外的 `IRScopeProps`；Block、Section 与 Row 的显式 id 始终发布到当前 Core namespace，作者应使用 `user`、`user.fields`、`user.name` 一类在当前 namespace 内稳定的 id

Block 不接受 `localNamespace`。Core namespace 当前没有从父 frame 限定访问子 frame identity 的 NodeTarget 形式，而 Block 的结构内容必须先完成 layout probe 才能发布 Section / Row host；若允许 `localNamespace: true`，局部 target 会同时对外部 Relation 隐藏、对参与 probe 的内部内容不可解析，形成不可消费的公共 identity。Graph 不新增跨 namespace fallback、自动前缀或平行限定路径；未来若 Core 建立通用的层级 NodeTarget，再以新的能力决策评估 Block 隔离

Cell、Header icon / trailing 内的任意 child 若自身公开 id，继续遵循其 owner 的 identity / endpoint 语义；Graph 只保证 Block、Section、Row 的上述映射，不把所有 cell 或 artifact key 自动升级为 endpoint

### Graph Theme 只作用于已有 Graph 语义

Block 可以组合除 `localNamespace` 外的 Core Scope context，并沿用 Graph / Group 的 `graphTheme` 可见树投影规则。Graph Theme 仍只影响 Block 固定槽位或 Cell 中可见的 Entity / Relation，不直接样式化 Block shell、Header、Section、Row、结构文字或普通 Core / Tier 2 child

Block 自身的 Surface、Node host 与结构文字使用 Core / Standard style fields 和 Theme cascade。未来若出现多种稳定 Block 语义外观，需要以真实消费者重新证明 Definition / registry 的必要性；不得借 alpha.2 预建万能 Block style registry

### Diagram 从 Source 派生布局投影

Graph Block 保存唯一的结构事实源，不保存 endpoint 所属索引、布局缓存、route、port constraint 或 Diagram identity 投影。未来 Diagram 可以遍历 Block 的 Section / Row id，派生“endpoint 属于哪个 Block”并把 Block 作为整体参与外部自动布局；Relation routing、跨 Block 约束与 ELK 一类 port constraint 由 Diagram 拥有

Graph 不预先决定 Diagram 是把局部 endpoint 转换为算法 port、compound child 还是 routing obstacle。任何派生投影都必须可由 Block Source 与 Core identity 确定，并由消费方按需生成，不能作为第二事实源写回公共 IR

### Direct IR、React 与 Vanilla 使用同一 Source

Direct IR、React `Block` 与 Vanilla `block` 必须产出同一个 schema-derived Block Source。React 组合式 authoring 只负责把 Header slots、Section、Row、Cell 转成 JSON-safe IR；Vanilla normalize 只组装同一结构。adapter 不生成 id、不根据 JSX 位置推断 endpoint、不保存 ReactNode，也不计算布局或重写 Core / Layout 默认

Block 可以独立出现在 Scene、Layout、Graph、Group、Block Cell 或其它接受 `IRChild` 的位置。renderer 只消费最终 Scene，不识别 Block discriminator，不增加 SVG / Canvas 专用分支

## 基础数据结构与公开契约

以下代码只表达跨 owner 的等价组合关系；实际 `IRBlock*` 类型必须由最终 strict Zod schema 推导，不能手写平行类型：

```ts
type IRBlockText = Omit<
  Pick<IRNode, 'text' | 'align' | 'lineHeight' | 'maxTextWidth' | 'textColor' | 'font' | 'opacity'>,
  'text'
> &
  Readonly<{ text: NonNullable<IRNode['text']> }>;

type IRBlockHeader = Readonly<{
  icon?: IRChild;
  title: IRBlockText;
  description?: IRBlockText;
  trailing?: IRChild;
}>;

type IRBlockCell = Omit<IRFlexLayoutItem, 'kind'>;

type IRBlockRow = BlockRegionSurface &
  Readonly<{
    cells: ReadonlyArray<IRBlockCell>;
  }>;

type IRBlockSection = BlockRegionSurface &
  Readonly<{
    title?: IRBlockText;
    rows: ReadonlyArray<IRBlockRow>;
  }>;

type IRBlock = Omit<IRScopeProps, 'localNamespace'> &
  BlockSurfaceFields &
  Readonly<{
    namespace: 'graph';
    type: 'block';
    graphTheme?: IRGraphThemeLayer;
    header: IRBlockHeader;
    sections?: ReadonlyArray<IRBlockSection>;
  }>;
```

`BlockRegionSurface` 表示从 Core `NodeSchema` 精确组合的窄 host 字段集合，排除固定 `type` / `shape`、由 Block Layout 生成的 `position` 与结构自有 `text`；它至少保留显式 id、boundary、label 与可见 appearance 的同源契约。Section / Row 固定 lower 为 rectangle，使其内容 slot、可见边框、endpoint host 与父布局 allocation 使用同一个矩形事实源；影响结构 allocation、变换或整体排序的 Node 字段不进入该集合。`BlockSurfaceFields` 直接组合 Standard Surface 字段；字段名称、默认物化和互斥约束以对应 owner 的公开 schema 为真源

## 行为、失败语义与兼容性

- Header 缺失、title 缺失、空 Section rows、空 Row cells、空 sections、未知字段或非法 Flex item 由 Block strict schema fail-loud
- `localNamespace` 作为 Block 未支持字段由 strict schema fail-loud；Graph 与 Group 的 Scope 契约不受影响
- Cell child 的未知 composite、缺失 provider 或自身 schema / compile 失败使用对应 owner 的原诊断；Graph 不改写为 Block member 错误
- Section / Row host 的 Node 字段、identity、label、anchor、boundary 与 style 失败使用 Core 原诊断；Block 不重复 parse 或增加 fallback
- Block 与全部内部内容必须 JSON-safe；函数、ReactNode、DOM、renderer resource、执行状态、selection、history 与 transaction 不进入 Source
- Block 不自动创建 Relation、不推断 input / output、不校验连接数量或数据类型，也不自动 layout / route Block 之间的拓扑
- alpha.2 是未发布的新契约，不提供 Container、Entity role、Port 或产品节点格式的 alias、migration、fallback 或双轨 Source

## 落实结果

Block 已通过 Graph 的公开 composite / provider 主链接入，并把 Flex 的真实 slot allocation 映射为固定矩形 Node host

Direct IR、React 与 Vanilla 共用同一 strict Source schema；Section / Row identity、Relation endpoint、anchor / boundary、Graph Theme 投影和 renderer-neutral Scene 均沿用既有 owner。实现没有修改 Core、Layout、Standard 或 renderer 的公开契约，也没有增加 Port、限定 target、自动前缀或第二套布局结果
