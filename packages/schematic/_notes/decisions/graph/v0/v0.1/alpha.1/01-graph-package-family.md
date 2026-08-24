# ADR-01：建立 Diagram Graph package family

- 状态：Accepted
- 决策日期：2026-08-15
- 最近修订：2026-08-21
- 历史边界：本 ADR 只继续冻结 package family 与 owner。GraphNode / GraphConnector 命名由 ADR-05 取代，Variant 与 GraphFrame 默认传播由 ADR-06 的 2026-08-23 breaking revision 删除，Graph / Entity / Relation 组合边界以 ADR-07～09 为准

## 背景

图式节点和连接表达的是 Diagram 领域语义，而不是可以从领域词汇中移除的通用绘图能力。它们当前复用 Core Node、Path、Step、target 与 Layout，但这些底层复用不改变语义 owner。继续把流程角色放在 Standard 会让通用绘图库承担 Graph、Flow、UML 等领域职责

同时，节点和连接的 authored 能力与 Core 绘图能力高度重合。为避免同一批能力产生多套 schema、Definition、provider 与 React / Vanilla 组件，本阶段统一每一类能力的入口：`GraphNode` 通过 `role` 表达节点语义，`GraphConnector` 通过 `role` 表达关系语义

## 决策

### Package family 与 namespace

建立三个 lockstep 包：

- `@retikz/graph`：Graph JSON-safe IR、schema、factory、Definition 与 provider
- `@retikz/graph-react`：Graph React authoring 与 adapter 接线
- `@retikz/graph-vanilla`：Graph framework-neutral builder、Input 与 adapter

三个包使用独立 `graph` release group。所有 Graph composite 使用 `namespace: 'graph'`，当前稳定 discriminator 为：

```ts
const GraphElementType = {
  GraphFrame: 'graphFrame',
  GraphNode: 'graphNode',
  GraphConnector: 'graphConnector',
} as const;
```

旧 Notation package、namespace、导出、路由与兼容层直接删除。Graph 不建立聚合 `@retikz/diagram` 包，也不反向依赖 Flow、Editor、Viz 或 renderer

### GraphNode

`GraphNode` 是一个统一的 JSON-safe semantic IR。它保留适用的 Core Node authored surface，并增加必填闭合 `role`：

```ts
type GraphNodeRole = 'terminal' | 'stage' | 'decision' | 'junction';
```

role 只表达作者和 LLM 需要的 Tier 2 语义，并为 Node 提供默认 shape、padding 与 minimum size。作者显式提供的 `shape` 优先于 role 默认值。GraphNode 每次只下沉为一个同 id Core Node，不创建 artifact、Scope 或 renderer 分支

### GraphConnector

`GraphConnector` 是一个统一的 JSON-safe semantic IR，复用 Core Path 的适用字段、Step `children` 与 `marks`。它增加必填闭合 `role`：

```ts
type GraphConnectorRole = 'flow' | 'branch' | 'dependency' | 'feedback';
```

TypeScript factory、React 与 Vanilla 额外接受互斥的 `way: WayDSL`，并在入口通过 Core `parseWay()` 归一为 canonical `children`。省略 `marks` 才补终点箭头；显式数组（包括空数组）完整覆盖默认值。GraphConnector 每次只下沉为一个同 id Core stroke Path，role 在边界处丢弃

GraphConnector 不复制 Core Path 的 routing、appearance、target、Step 或 geometry 联合，不维护独立路由算法、artifact 或 renderer surface

### GraphFrame

`GraphFrame` 保留可选 header、有序 sections、外壳、divider 与布局 artifact 的既有语义。它直接组合 Layout 的公开布局能力，不复制 Flex solver、spacing、clip 或 geometry。`graphNodeVariant` 只作为后代 GraphNode 的继承默认值，GraphFrame 自身不变成节点

### Lowering 与边界

GraphNode 与 GraphConnector 使用 Core composite Definition 的普通 `expand`，直接返回单一 Core child。role、variant、Graph namespace 与 Graph discriminator 都只存在于 authored Graph IR；lower 后的 Core IR、Scene、SVG 与 Canvas 不感知这些字段。GraphFrame 继续使用 layout-aware Definition，并由宿主显式注入其 child 所需的其它 Definition

直接 JSON、React 与 Vanilla 必须进入同一 Graph factory、Definition、provider 与 Core compile 主链。adapter 不复制 schema、默认值、variant recipe、路径 parser 或布局逻辑

### Graph root 的 Layout composition

Graph root 同时支持 standalone 与 embedded 两种宿主模式，并保持同一份 Graph Source IR、Definition、resolve 与 lowering 语义

- standalone 模式下，React `Graph` 作为 Layout 宿主，接收 Layout 的尺寸、视框、renderer、className、style 与 Core Theme style definitions 等宿主输入，并只创建一个根渲染面
- embedded 模式下，外层已有 Layout 时，Graph 不创建第二个 Layout、renderer 或 SVG / Canvas 宿主，只把自己的 Graph root 作为一个局部内容 Scope 贡献给外层场景；多个 Graph 可以在同一个 Layout 中并列存在
- Graph panel 可以声明 `x`、`y`、`transforms`、`zIndex` 与 `clip`。`x` / `y` 先形成整体平移，再叠加显式 transforms；这些字段只作用于 Graph root Scope，不改变 Entity、Relation 或 Container 的内部坐标
- React 与 Vanilla 对 standalone / embedded 与 panel 的表达必须等价。embedded 模式收到 standalone-only 宿主输入时必须 fail-loud，并提示将其移动到外层 Layout
- `IRGraph` 不增加 Layout 宿主字段。Graph Source `theme` 继续表示 Graph-owned semantic Theme layer；Core Layout 的宿主 Theme 由外层 Layout 提供，不能用同名字段混用

Graph root 的 panel 语义概念上等价于：

```ts
type InputGraphPanel = Pick<InputScope, 'clip' | 'transforms' | 'zIndex'> & {
  x?: number;
  y?: number;
};
```

Graph 不拥有 Layout solver、measurement、spacing、自动布局或 routing。作者、Diagram 或其它消费者仍负责提供 Graph 成员的直接位置、尺寸、端口与路径；root panel 只负责把已经确定的 Graph 内容组合到当前宿主坐标空间

## 长期边界

Graph 只拥有通用图式元素的语义与呈现，不拥有 GraphModel、GraphDocument、自动布局、routing、Editor 状态或 renderer 机制。上层 Diagram、Flow、UML 等领域能力通过新的 owner 与 ADR 建立，不反向扩张本 package family；旧入口不提供兼容别名
