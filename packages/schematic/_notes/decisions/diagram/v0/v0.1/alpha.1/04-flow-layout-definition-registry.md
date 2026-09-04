# ADR-04：Flow Layout Definition 与 Registry

- 状态：Accepted
- 决策日期：2026-08-30
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [ADR-03：Flow Source 模型与 LLM-first Authoring](./03-flow-source-model.md) · [ADR-07：Flow 平级 Source、Group 与 Layout](./07-flow-catalog-source-layout-groups.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

ADR-03/07 已冻结唯一、LLM-first 的 Flow Source：Entity / Group / Layout 在平级 catalog 中声明，根与各 scope 的 `children` 引用是包含真源；根 relations 可以连接任意层级 Entity 或 Group，rank、自动布局与 routing 只表达 provider-neutral 意图，Layout 的 direction / gap / align 则表达必须保留的固定 placement。它们尚未决定谁执行这些意图、如何开放替换算法、缺省值从哪里产生，以及不同算法能力不等价时怎样在调用前诊断

ELK、Graphviz、Mermaid、PlantUML 与 D2 都把关系结构和布局引擎选择分开，但也共同证明布局引擎并非可无条件互换：compound graph、跨层级 relation、cycle、self-loop、parallel relation、label 与 routing 的支持范围不同。直接把某个引擎的 graph/options 形态暴露为 Flow Source 会重新引入 ports、engine-specific key、异步调用和多套等价写法；只提供一个不可描述能力的 callback，又会让 LLM 无法判断当前运行时能生成什么

本决策冻结 Diagram-owned 的同步 Flow Layout Definition、统一 registry、运行时默认选择、结构化 capability、LLM catalog、已测量 provider 输入、最小几何输出、确定性和失败边界。ADR-05 将消费本契约，负责测量、有效意图解析、callback 编排、输出验证、Graph materialization、artifact 与完整 Scene；本决策不把这些阶段合并进 provider

## 决策

### Diagram 拥有关系图算法布局扩展轴

`@retikz/diagram` 拥有 `FlowLayoutDefinition`、`defineFlowLayout`、内置与自定义 registry、默认选择和 catalog。它们只服务 Flow 的关系结构、层级布局与 routing，不进入 `@retikz/layout`

Layout 继续拥有任意 child 在容器内的 proposal、measurement、spacing、placement 与 replay；Graph 继续拥有 Group / Block / Entity / Relation 语义、Theme、identity 与 lowering；Core 继续拥有 Composite Definition、provider dependency assembly、Scene 与同步 compile。Flow layout registry 是 Diagram 领域 Definition registry，不是 Core provider dependency graph，也不建立通用 solver registry

Flow layout provider 可以复用 Math 几何和 Layout / Core 测量结果，但不能接收 renderer、DOM、React node、Core replay、Scene primitive 或 Graph 私有 canonical 状态。移除关系图语义后仍成立并出现多个真实消费方的纯算法或几何能力，后续才下沉到对应 owner

### Layout 与 routing 使用一个原子 Definition

一个 `FlowLayoutDefinition` 在同一次同步 callback 中确定全部 element bounds、relation route 与可选 relation label bounds。compound placement、跨 Group relation、obstacle avoidance 与 edge routing 在成熟引擎中共享同一层级模型和坐标系；v0.1 不建立第二套 routing Definition、组合优先级或 layout-result-to-router 公共中间协议

Definition 只接收已经规范化、完成 Graph appearance 解析和测量、且所有 layout 默认已经确定的只读输入。它不解析 Flow Source、Graph role、Theme token、style 或 registry，也不生成 Graph / Core IR。callback 输出只是 ADR-05 可以验证和物化的 renderer-neutral 几何，不是 Diagram artifact、Canonical Flow、Graph Source、Scene 或可持久化布局缓存

Provider-specific options 不进入 `IRFlowDiagram`、Flow Theme 或 callback input。宿主需要配置第三方引擎时，通过闭包或 factory 创建一个确定的 Definition；同一 Definition 对相同输入仍必须产生相同输出

### Definition options 选择运行时默认，不改变 Source

`DiagramDefinitionOptions` 增加 `flowLayouts` 与 `defaultFlowLayout`。`flowLayouts` 注入自定义 Definition；内置与自定义经过同一 `defineFlowLayout`、definition validation、registry、lookup、capability preflight、callback、output validation 与消费路径。内置名称不能被自定义项覆盖，同名 Definition fail-loud

`defaultFlowLayout` 是一次 Diagram definition assembly 的运行时选择，不写入 `IRFlowDiagram`。省略时选择内置 `layered`；显式名称必须在同一次 assembly 的 registry 中存在。这样 ADR-03 保持唯一 Source 形态，Direct IR、Vanilla 与 React 也不会通过 adapter 私有字段选择不同算法

v0.1 不支持同一 `diagram.flow` Definition 内按 occurrence 选择不同 provider。未来只有出现同一 Scene 内多 provider 的真实消费者时，才能另行决定 Source 是否需要稳定的选择字段；不能先加入无消费者的 engine enum 或任意 options bag

### Definition defaults 是缺省 layout intent 的唯一末端

每个 Definition 必须公开完整、JSON-safe 的 `defaults`：direction、node gap、rank gap、默认 routing kind，以及支持 orthogonal 时独立的 orthogonal corner radius。ADR-03 的 Flow token、结构化 `flowTheme.layout`、Group 局部 layout 与 Relation layout 仍按既定优先级覆盖这些默认；provider callback 只接收每个 scope 和 relation 已经补全的有效值

内置 `layered` 的默认值固定为：`direction: 'right'`、`nodeGap: 24`、`rankGap: 48`、`routing: { kind: 'straight', orthogonalCornerRadius: 8 }`。默认 straight routing 不消费 corner radius；显式 orthogonal 省略 corner radius 时使用所选 Definition 的 `orthogonalCornerRadius`。只支持 straight 的 Definition 不声明该值；声明支持 orthogonal 的 Definition 必须声明它，即使默认 routing kind 是 straight

更换运行时默认 Definition 可以改变所有未显式配置的 layout 值，因此 catalog 必须同时暴露被选中的默认项及其 defaults。更换 provider 不得改变 Source identity、Graph 语义、style、relation direction 或 Presentation / Frame 行为

### Provider 输入只包含布局所需的独立事实

provider 输入保持递归 scope。Flow resolve 先按 ADR-07 校验平级 catalog 与 owner-side `children`，再严格按每个 owner 的 `children` 顺序重建递归输入；catalog 声明顺序不参与 provider 顺序。根和每个 Group 都携带已经补全的有效自动布局配置；Layout 携带固定 direction、有效 node gap、align 与有序 children。有序 elements 数组本身就是确定性 tie-breaker，不额外保存 source index、parent id、path、membership 或拓扑缓存

Entity 在 provider 输入中投影为固定测量尺寸的 leaf，Definition 不能依赖 Graph role、kind 或 style 选择算法。leaf 的 resolved margin 作为独立 insets 参与 sibling spacing，不混入可连接的 element size。Group 投影为携带真实 Graph shell minimum、content insets、有效局部 layout 与有序 children 的递归 scope。Layout 投影为独立 `kind: 'layout'` scope，不携带 shell 数值，其 direct children 必须通过执行 context 的 `placeLayout` 固定排列。Graph Block 当前不属于 Flow Source；通用 leaf 输入保持不绑定具体 Graph element，未来不得在 Block 契约稳定前加入 Block 专用字段

Relation 只携带 source / target element id、有效 Graph direction、有效 routing 与可选已测量 label size。全部 relations 保持根级有序集合；其数组位置是 callback 输入输出的唯一对齐方式，provider 不接收复制到 Group 的 relation、NodeTarget、port、anchor、offset、marker、route step 或 appearance

### Provider 输出使用一个根坐标系

provider 输出为所有 element 的 root-local `BoundsRect`、所有 relation 的 root-local point chain，以及有 label 时的 root-local label bounds。elements 输出把递归输入按 depth-first pre-order 展平并保留 authored id；relations 输出与输入按数组位置一一对应。provider 不能生成、删除或重排记录

leaf 的输出宽高必须等于输入测量尺寸；provider 用 leaf bounds 按 margin 向四边扩张后的 margin box 参与同级间距与碰撞，但 route 仍连接不含 margin 的真实 bounds。Group 可以扩张，但不得小于 shell minimum，且直接 children 必须位于扣除 content insets 后的 content rect。非祖先关系的 sibling margin / group allocation box 不得重叠。route 至少包含两个有限点，连接对应 source / target bounds；straight route 只有起终点，orthogonal route 的相邻非零线段必须轴对齐。输入有 label 时必须返回同尺寸 label bounds，没有 label 时不得返回 label bounds

corner radius 是有效 routing intent，不烘焙成 provider-specific curve command；ADR-05 用 route point chain 和该 intent 生成 Graph / Core 可消费的路径。Graph boundary、marker shortening、label lowering、route output validation、坐标归一、artifact 与 Scene 仍由 ADR-05 拥有

### Capability 是权威预检契约和 LLM catalog 数据

每个 Definition 必须声明 compound scope、Group endpoint、跨 scope relation、cycle、self-loop、parallel relation、relation label、Relation direction 取值与 routing kind 的支持范围。rank、递归 scope 的有效 layout、element 稳定 id、relation positional order、Layout 固定 placement 和有限二维几何是所有合法 Definition 的基础契约，不做可选 capability

resolve 从 Canonical Flow 推导当前请求实际需要的 capability，在 callback 前一次性比较。缺失 capability 必须 fail-loud，并指出 definition name、缺失项、相关 relation / element id 与可用 provider；不得调用 callback 后再猜测 fallback、删除关系、展平 Group、反转 direction 或切换 routing

capability 是 Definition 对调用方的真实保证，不是提示性 metadata。callback 对已声明支持的结构失败时属于 provider contract failure；Retikz 保留 cause，但不会把该 Definition 自动降级为另一项。Definition registration 同时验证 capability 组合：`groupEndpoints` 或 `crossScopeRelations` 为 true 时 `compoundScopes` 也必须为 true，direction 与 routing 列表必须非空、唯一且只含公共词汇，默认 routing kind 必须位于 `routingKinds`，orthogonal 默认 radius 必须与 orthogonal capability 同时存在或同时省略

存在任意 Group 或 Layout 时要求 `compoundScopes`；relation 直接引用 Group id 时要求 `groupEndpoints`。Layout endpoint 已由 Source resolve 拒绝，不进入 capability preflight；两个合法 endpoint 不是同一 Flow scope 的直接 sibling 时要求 `crossScopeRelations`。source 与 target 相同要求 `selfLoops`；相同无序 endpoint pair 出现多条 relation 时要求 `parallelRelations`；出现 label 时要求 `relationLabels`。cycle 只检查由 forward 的 source → target 与 reverse 的 target → source 形成的有向先后环；both 与 none 的可用性由 `relationDirections` 独立声明，不把每条 both relation 自动视为二节点 cycle。每条 relation 的有效 routing kind 与 direction 分别必须出现在对应 capability 列表。这些推导规则固定，provider 不自行重解释 capability

同一次 registry assembly 必须提供 JSON-safe `FlowLayoutCatalogEntry` 投影，只包含 name、description、capabilities、defaults 与是否为当前默认，不暴露 callback。catalog 的顺序稳定为内置项后接自定义注入顺序，并与真正用于 lookup / preflight / dispatch 的 registry 同源；Docs、工具或 LLM 不维护静态 provider 白名单

内置 `layered` 支持递归 compound scope、Group endpoint、跨 scope relation、cycle、parallel relation、relation label、四种 Relation direction 以及 straight / orthogonal routing；v0.1 不声明 self-loop 支持。self-loop 仍是合法 Flow Source，使用不支持它的 Definition 时在 callback 前得到 capability 诊断

### callback 保持同步、纯输入与确定输出

Core `compileToScene` 和 layout-aware Composite callback 是同步契约，因此 v0.1 的 `layout` callback 必须同步返回 `FlowLayoutOutput`。Promise、async iterator、worker handle、外部进程 token 或稍后回填结果都不是合法输出；React / Vanilla / Docs 不得建立 adapter 私有 await 路径

ELK 等异步引擎若要直接参与 compile，必须先有统一的异步 compile / prelayout 架构决策。在此之前，宿主可以把预计算结果转换为一个同步、确定的 Definition，但不能把异步状态或 engine payload写入 Source

provider 收到脱离 Source 的深只读快照。输出必须是有限数值、plain-data、JSON-safe 的新值；Retikz 在 ADR-05 边界验证并脱离 provider 所持引用。同一 Flow Source、definitions、有效 Theme、测量结果与 Definition 必须产生逐字段相同的 input 和 output；Definition 不得读取时间、随机数、DOM、renderer、可变全局状态或 callback 次序。v0.1 不增加 seed，因为确定性是所有 Definition 的必需契约而非可选算法模式

callback 同时接收只读 `FlowLayoutExecutionContext`。每个 authored Layout 必须恰好调用一次 `placeLayout`；该入口以 direct child 的真实 size / margin 调用 `@retikz/layout` Flex compiler，并返回 Layout 与 children 的固定 bounds。provider 可以把完整 Layout 当作 compound box 参与外层自动布局和 routing，但不得忽略、重排或改写其相对 placement。Layout 内 Relation 不参与 placement，只在全部 bounds 确定后 routing

## 基础数据结构与公开契约

最小运行时扩展契约为：

```ts
type FlowLayoutRouting = Readonly<{ kind: 'straight' }> | Readonly<{ kind: 'orthogonal'; cornerRadius: number }>;

type EffectiveFlowLayout = Readonly<{
  direction: 'up' | 'right' | 'down' | 'left';
  nodeGap: number;
  rankGap: number;
  routing: FlowLayoutRouting;
}>;

type FlowLayoutDefaults = Readonly<{
  direction: EffectiveFlowLayout['direction'];
  nodeGap: number;
  rankGap: number;
  routing: Readonly<{
    kind: FlowLayoutRouting['kind'];
    orthogonalCornerRadius?: number;
  }>;
}>;

type FlowLayoutSize = Readonly<Pick<BoundsRect, 'width' | 'height'>>;

type FlowLayoutLeafInput = Readonly<{
  kind: 'leaf';
  id: string;
  rank?: number;
  size: FlowLayoutSize;
  margin: Readonly<BoundsInsets>;
}>;

type FlowLayoutGroupInput = Readonly<{
  kind: 'group';
  id: string;
  rank?: number;
  minimumSize: FlowLayoutSize;
  contentInsets: Readonly<BoundsInsets>;
  layout: EffectiveFlowLayout;
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

type FlowLayoutContainerInput = Readonly<{
  kind: 'layout';
  id: string;
  rank?: number;
  layout: EffectiveFlowLayout;
  align: 'start' | 'center' | 'end';
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

type FlowLayoutElementInput = FlowLayoutLeafInput | FlowLayoutGroupInput | FlowLayoutContainerInput;

type FlowLayoutPlacementInput = Readonly<{
  layout: Readonly<{
    id: string;
    direction: EffectiveFlowLayout['direction'];
    gap: number;
    align: 'start' | 'center' | 'end';
  }>;
  elements: ReadonlyArray<Readonly<{ id: string; size: FlowLayoutSize; margin: Readonly<BoundsInsets> }>>;
}>;

type FlowLayoutPlacementOutput = Readonly<{
  bounds: Readonly<BoundsRect>;
  elements: ReadonlyArray<FlowLayoutElementOutput>;
}>;

type FlowLayoutExecutionContext = Readonly<{
  placeLayout: (input: FlowLayoutPlacementInput) => FlowLayoutPlacementOutput;
}>;

type FlowLayoutRelationInput = Readonly<{
  source: string;
  target: string;
  direction: RelationDirectionValue;
  routing: FlowLayoutRouting;
  labelSize?: FlowLayoutSize;
}>;

type FlowLayoutInput = Readonly<{
  layout: EffectiveFlowLayout;
  elements: ReadonlyArray<FlowLayoutElementInput>;
  relations: ReadonlyArray<FlowLayoutRelationInput>;
}>;

type FlowLayoutElementOutput = Readonly<{
  id: string;
  bounds: Readonly<BoundsRect>;
}>;

type FlowLayoutRelationOutput = Readonly<{
  points: ReadonlyArray<Readonly<Position>>;
  labelBounds?: Readonly<BoundsRect>;
}>;

type FlowLayoutOutput = Readonly<{
  elements: ReadonlyArray<FlowLayoutElementOutput>;
  relations: ReadonlyArray<FlowLayoutRelationOutput>;
}>;

type FlowLayoutCapabilities = Readonly<{
  compoundScopes: boolean;
  groupEndpoints: boolean;
  crossScopeRelations: boolean;
  cycles: boolean;
  selfLoops: boolean;
  parallelRelations: boolean;
  relationLabels: boolean;
  relationDirections: ReadonlyArray<RelationDirectionValue>;
  routingKinds: ReadonlyArray<'straight' | 'orthogonal'>;
}>;

type FlowLayoutDefinition = Readonly<{
  name: string;
  description: string;
  capabilities: FlowLayoutCapabilities;
  defaults: FlowLayoutDefaults;
  layout: (input: FlowLayoutInput, context: FlowLayoutExecutionContext) => FlowLayoutOutput;
}>;

type FlowLayoutCatalogEntry = Readonly<
  Pick<FlowLayoutDefinition, 'name' | 'description' | 'capabilities' | 'defaults'> & {
    isDefault: boolean;
  }
>;

declare const defineFlowLayout: (definition: FlowLayoutDefinition) => FlowLayoutDefinition;
declare const getFlowLayoutCatalog: (options?: DiagramDefinitionOptions) => ReadonlyArray<FlowLayoutCatalogEntry>;
```

`BoundsRect`、`BoundsInsets` 与 `Position` 复用 `@retikz/math` 的公开几何词汇；Definition 不建立平行 point / rect primitive。上述输入输出是同步 callback 的公开 TypeScript 契约，不是持久化 IR，因此不增加 Source schema，也不允许作者把它写入 `IRFlowDiagram`

`DiagramDefinitionOptions` 的增量为：

```ts
type DiagramDefinitionOptions = Readonly<{
  diagramThemeStyles?: ReadonlyArray<DiagramThemeStyleDefinition>;
  flowThemeStyles?: ReadonlyArray<FlowThemeStyleDefinition>;
  flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
  defaultFlowLayout?: string;
}>;
```

Flow Theme 与 Flow Layout 使用不同 registry：前者按 Core `theme.style` 解析 tokens，后者选择一个算法 Definition 并提供缺省 layout intent。它们可以在同一次 Diagram options assembly 合并，但不能共享 key space、Definition 类型或 callback

## 行为、失败语义与兼容性

- Definition name 与 description 必须为非空字符串；defaults、capabilities 与 catalog projection 必须是闭合、plain-data、JSON-safe 值。非法 Definition 使用 `DIAGRAM_DEFINITION_INVALID`
- 内置或自定义重名使用 `DIAGRAM_DEFINITION_DUPLICATE`；未知 `defaultFlowLayout` 使用 `DIAGRAM_DEFINITION_NOT_REGISTERED`，details 包含 `capability: 'flow-layout'`、请求名称与有序可用名称
- 同一次 Core provider assembly 中重复贡献同一个 Definition object 时按 identity 去重；同名不同 object 仍是重复定义。省略 default 的 contribution 不参与冲突，恰有一个显式 default 时采用它，多个不同显式 default 使用 `DIAGRAM_DEFINITION_INVALID`，不按出现顺序覆盖
- 当前 Flow 所需能力不被所选 Definition 覆盖时使用 `DIAGRAM_FLOW_LAYOUT_CAPABILITY_UNSUPPORTED`，details 包含 definition、缺失 capability、相关 id 与可用 provider；不执行 callback
- callback 抛错或返回 Promise 使用 `DIAGRAM_DEFINITION_CALLBACK_FAILED` 并保留原 cause；不得静默选择 `layered`、重复执行或使用上一次结果
- callback 返回 element 缺失 / 多余 / 重复 id、relation 数量不一致、非有限几何、尺寸不一致、非法 route、错误 label coverage、scope 不包含 children、未为每个 Layout 恰好调用一次 `placeLayout`、改写固定 placement 或其它违反输出契约的值时使用 `DIAGRAM_FLOW_LAYOUT_OUTPUT_INVALID`，并附带 definition、精确 output path 与相关 endpoint element id
- rank 与关系方向形成无解时继续使用 ADR-03 的 `DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE`；provider capability 不足与输入约束无解不能互相替代
- catalog 只描述同一次 registry 的真实 Definition，且 `isDefault` 恰有一项为 true。catalog 不序列化 callback，不接受静态 schema 枚举或 Docs 维护的平行名称集合
- 内置与自定义 Definition 的输入 snapshot、preflight、callback、output validation 与错误包装完全相同；内置 `layered` 不拥有绕过公开 contract 的私有输入或成功条件
- 本能力是新的 v0.1 公共扩展契约，不保留 engine-specific options、ELK / Graphviz payload、异步 adapter、手写 geometry fallback、旧 provider 名、旧 capability 名或无 capability 的 callback 兼容入口。ADR-01～03 的 Presentation、Frame、Theme 与 Graph lowering边界保持不变；Source containment 与 Group / Layout 边界以 ADR-07 为准

## 实现摘要与遗留风险

Flow Layout Definition、统一 registry、runtime default、capability preflight、JSON-safe catalog、Layout execution context 与 provider output 校验已闭合。平级 Source 在 resolve 后按 `children` 还原为同一递归 provider contract；Group 与 Layout 都触发 compound-scope capability，只有 Group endpoint 触发 group-endpoint capability。内置 `layered` 和自定义同步 Definition 经过同一注册、选择、调用与错误包装路径

v0.1 只内置 `layered`，不预注册 tree、force 或 engine-specific provider。self-loop 仍是合法 Source，但当前内置 Definition 不声明该 capability并在 callback 前拒绝；异步或增量布局需要新的长期 contract，不能复用同步 callback 做兼容扩张
