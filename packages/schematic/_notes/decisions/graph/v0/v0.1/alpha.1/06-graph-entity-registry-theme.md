# ADR-06：建立 Graph 展示作用域与 Entity 注册主题

- 状态：Accepted
- 决策日期：2026-08-16
- 替代：[GraphNode variant ADR](./02-graph-node-variants.md)

## 背景与目标

Entity 当前把 role 限定为四个字符串，并在单个 Definition 内用固定表维护 shape、padding 与 minimum size；variant 同样限定为三个字符串，并通过固定分支生成 paint。新增一个具有相同 Graph 语义的 role 或视觉层级时，使用者只能绕开 Entity、复制 Node 或修改包内白名单，内置与自定义无法经过同一契约和 lowering

Graph 同时缺少一个只负责展示作用域的持久化根。Container 可以为局部后代提供默认 variant，但不能表达整张 Graph 的 Entity 默认、领域 token 与按 role / variant 匹配的规则。Graph 因此需要在不引入全局关系数据模型、不扩张 Core Theme IR 的前提下，建立 owner-local presentation root、Definition registry 与 Theme token resolver

本决策以开放 Entity role / variant、可选 Graph presentation scope、Graph-owned Theme token 和 direct IR / React / Vanilla 等价为目标。Graph 继续把最终结果物化为普通 Core Scope 与 Node，Core、Scene 和 renderer 不感知 Graph 领域词汇

## 决策

### Graph 是可选 presentation root

Graph 新增顶层 discriminator：

```ts
const GraphType = {
  Graph: 'graph',
  Container: 'container',
  Entity: 'entity',
  Relation: 'relation',
} as const;
```

`IRGraph` 是 JSON-safe 的可选展示根，保存 children、Graph-owned Entity Theme 覆盖、selector rules 与后代 Entity 的默认 variant。它不是节点集合、关系数据库、GraphDocument 或自动布局输入；独立 Entity、Container 与 Relation 继续是合法 Graph IR

Graph 在 owner-local resolve 中确定后代 Graph Entity 的 registry lookup、默认值、Theme token 与级联，再由 lowering 输出一个普通 Core Scope。Graph 只把稳定 id 与 children 映射到该 Scope，不复制 Core Scope 的 transform、clip、placement、Theme 或 inherited style surface；需要这些通用能力时，作者使用外层 Core Scope。Graph-owned 字段在此边界全部消费，不进入 Core IR、Scene 或 renderer

### Entity role 与 variant 使用 Definition / registry

Entity `role` 与 `variant` 改为开放非空字符串。`EntityRole` 和 `EntityVariant` 常量继续列出 Graph 包提供的内置名称，但不再代表 schema 的闭合全集

Entity role definition 冻结一个 role 的 Graph 语义 key 与 Node 几何默认：

```ts
type EntityRoleDefinition = Readonly<{
  role: string;
  shape: NonNullable<IRNode['shape']>;
  padding: NonNullable<IRNode['padding']>;
  minimumSize?: NonNullable<IRNode['minimumSize']>;
}>;

declare const defineEntityRole: (definition: EntityRoleDefinition) => EntityRoleDefinition;
```

Entity variant definition 冻结一个 variant key，并根据当前位置的有效 Core Theme 与最终 Entity 主色解析稀疏 appearance token。variant 不改变 role、shape 或其它几何语义：

```ts
type EntityVariantDefinition = Readonly<{
  variant: string;
  resolve: (context: Readonly<{ theme: ResolvedTheme; color: string }>) => IRGraphEntityAppearanceTokenOverrides;
}>;

declare const defineEntityVariant: (definition: EntityVariantDefinition) => EntityVariantDefinition;
```

内置 role 与 variant 也通过上述 Definition 注册和解析。registry 先注册内置项，再注册自定义项；自定义项不能覆盖内置 key。Entity 显式 `shape`、`padding` 与 `minimumSize` 分别优先于 role definition 的对应默认

### Graph 拥有 Entity Theme token 与 selector

Graph Theme token 使用 Graph owner 的稳定 key，并复用 Core paint、color、stroke width 与 opacity 值契约：

```ts
const GraphThemeToken = {
  EntityColor: 'graph.entity.color',
  EntityTextForeground: 'graph.entity.text.foreground',
  EntityFill: 'graph.entity.fill',
  EntityStroke: 'graph.entity.stroke',
  EntityStrokeWidth: 'graph.entity.strokeWidth',
  EntityFillOpacity: 'graph.entity.fillOpacity',
  EntityStrokeOpacity: 'graph.entity.strokeOpacity',
  EntityOpacity: 'graph.entity.opacity',
} as const;
```

Graph Theme style definition 以当前有效 Core Theme 解析完整 Graph token baseline，并可附带有序、稀疏的 Entity token rules：

```ts
type GraphThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => Readonly<{
    tokens: IRGraphThemeTokenResolution;
    tokenRules?: IRGraphEntityThemeTokenRules;
  }>;
}>;

declare const defineGraphThemeStyle: (definition: GraphThemeStyleDefinition) => GraphThemeStyleDefinition;
```

Entity selector 可以按 `role`、`variant` 或两者匹配；每个字段接受一个非空 key 或非空、无重复的 key 列表。selector 至少声明一个字段，同时声明时按 AND 匹配。规则按声明顺序执行，后规则覆盖前规则

`IRGraph.graphThemeTokens` 保存当前 Graph scope 的稀疏 token 覆盖，`IRGraph.graphThemeTokenRules` 保存当前 scope 的有序 selector rules。完整 resolution、Definition 与 resolver 都是运行时 contract，不进入 Graph IR

### 默认 variant 与 Theme 级联

Entity 的有效 variant 按以下顺序确定：

```text
Entity 显式 variant
> 从内到外遇到的第一个 Container.entityVariant 或 Graph.entityVariant
> default
```

Container 与 Graph 按真实嵌套顺序建立同一种 Entity variant scope，不因 owner 类型获得额外优先级。`undefined` 表示继续继承；显式 `default` 是合法注册值，可以重置外层值。作用域只影响当前后代，不泄漏到兄弟分支，也不影响 Relation、Container 外壳或普通 Core Node

对单个 Entity，appearance token 从低到高按以下顺序级联：

```text
默认或当前 Graph Theme style baseline
> 已注册 variant definition 的稀疏 appearance token
> 当前 Graph Theme style 中匹配的 rules
> 从外到内各层 Graph.graphThemeTokens
> 从外到内各层匹配的 Graph.graphThemeTokenRules
> Entity 显式 Core Node appearance 字段
```

最终 Entity 主色先按同一来源确定，Entity 显式 `color` 具有最高优先级；`currentColor` 和缺省值继续按有效 Theme mode 物化为确定黑白色。variant definition 使用该最终主色计算动态 recipe，Graph 局部规则与 Entity 显式字段仍按上述优先级覆盖其结果。内置 `default`、`fill` 与 `mixed` 保持既有不透明颜色预合成和字段级显式覆盖语义

Graph Theme style 由当前 Core Theme 的 `style` 名称选择；没有 style 时使用 Graph 默认 baseline。存在 style 名称但未注册对应 Graph Theme style definition 时 fail-loud，不根据名称猜测或回退到另一 style

### Owner-local resolve、lowering 与组合边界

Graph resolve 消费 Source IR、有效 Core Theme、role / variant registry、Graph Theme style registry 与当前 Graph scope stack，唯一负责 lookup、默认 variant、token selector、级联和显式字段优先级，并形成不持久化的确定 presentation。lowering 只消费该结果，生成等价 Core Scope / Node，不重复查 registry、补默认或解释优先级

Graph presentation resolve 遍历 Graph-owned Graph / Container 结构以及 Core Scope。嵌套 Graph 继承外层 Graph token scope，再用自身默认、token 与 rules 覆盖。Graph / Container 的 `entityVariant` 是 Graph 语义默认，继续穿透普通 Core Scope 和带自身 Theme 的 Core Scope；它在遇到后代 Entity 时物化为显式有效 variant，使该 Entity 随后仍能在新的 Core Theme 中使用正确的 variant definition

Graph-owned token / rule 不跨越带自身 Core Theme 的 Scope；该 Scope 内的 Entity 使用新 Theme 对应的 Graph style baseline 和已经继承的有效 variant。需要在新的 Core Theme 环境中继续使用局部 Graph token / rule 时，作者在该 Scope 内建立新的 Graph root。第三方 composite 对 variant 默认和 Graph token 都是不透明边界；Graph 不递归猜测其 child 结构，也不向 Core Composite context 添加领域 token bag

独立 Entity 使用同一 role / variant resolver 与 Node lowering，但只消费当前位置 Core Theme 对应的 Graph Theme style baseline，不存在 `IRGraph` 局部 token 或默认 variant。Container 继续提供局部 `entityVariant`，其解析与 Graph root 使用同一有效 variant 规则

### Definition、provider 与 authoring 入口

`createGraphDefinitions`、`createGraphProviders` 与 Graph authoring input 接受同一组可选 `entityRoles`、`entityVariants` 与 `graphThemeStyles`。React 通过 `<Graph>`、Vanilla 通过 `graph()` 传入这些 runtime-only Definition options；Graph provider dependency assembly 合并同一次装配中的 Definition 数据，并为 Graph root 与独立 Entity 创建使用同一 registry 的 canonical Definitions

单个 registry 输入中的重复 key 一律拒绝；provider dependency assembly 重复收集同一个 Definition 对象时可以按 key 合并，收集到同 key 的不同对象时视为冲突并 fail-loud。该规则允许同一 adapter contribution 被正常去重，同时不允许两个实现静默争夺同一 role、variant 或 Theme style

默认 `GraphDefinition`、`EntityDefinition`、`GraphProvider`、`EntityProvider` 与现有 Graph adapters 使用 Graph 内置 role、variant 和默认 Theme baseline。直接 IR 使用配置后的 Definitions，React 与 Vanilla 使用配置后的 adapters；三种入口不建立 adapter 私有 registry 或不同的默认值路径

Graph 同步提供 `GraphSchema`、`createGraph`、React `Graph` 与 Vanilla `graph()`。这些入口只构造同一 `IRGraph`，Theme 解析、selector、registry lookup 与 lowering 仍由 `@retikz/graph` 负责

## 基础数据结构与公开契约

`IRGraph` 的最小持久化结构为：

```ts
type IRGraph = Readonly<{
  namespace: 'graph';
  type: 'graph';
  id?: string;
  entityVariant?: string;
  graphThemeTokens?: IRGraphThemeTokenOverrides;
  graphThemeTokenRules?: IRGraphEntityThemeTokenRules;
  children: ReadonlyArray<IRChild>;
}>;
```

Graph token override 是上述 canonical token 字段的严格稀疏对象；完整 resolution 必须包含全部 token。Entity variant definition 只解析 color 之外的 appearance token，不能通过 variant 改变主色、role 或几何。Graph Theme style 与 Graph local rule 可以覆盖 `graph.entity.color`，最终仍受 Entity 显式 `color` 覆盖

Graph 内置 role 保持 `terminal`、`stage`、`decision` 与 `junction`；内置 variant 保持 `default`、`fill` 与 `mixed`。它们从闭合 schema 迁移为 builtin-first registry，并保留已有默认形状与视觉结果

## 行为、失败语义与兼容性

- role、variant、Theme style name 与 selector key 必须是非空字符串；selector 的列表必须非空且不能重复
- 内置之间、自定义之间以及自定义与内置之间的重复 key 都 fail-loud；不提供覆盖内置 role / variant 的选项
- Entity schema 只校验开放 key 的 JSON 形态；未注册 role / variant、selector 引用未注册 key、当前 Theme style 未注册 Graph definition 均在 owner resolver 中 fail-loud，并列出可用 key 或注入入口
- 自定义 role 引用的 shape 仍由 Core shape registry 解析和诊断；Graph 不建立平行 shape registry，也不把未知 shape 改写为内置形状
- Graph local token 不跨越带 Theme 的 Core Scope 或第三方 composite；Graph / Container 的默认 variant 可以穿透前者但不猜测后者的 child 结构
- lower 后的 Core Scope / Node 不保留 Graph namespace、Graph discriminator、role、variant、token、selector 或 registry 数据
- 这是对 alpha.1 GraphNode variant ADR 中“role / variant 闭合且无自定义 registry”和“不接入 Graph Theme style”决策的 breaking supersession；既有内置名称、默认几何、variant 视觉与显式字段优先级保持不变，但不保留闭合 schema、写死表、固定分支或兼容双轨
- Relation role、Container / Relation Theme token、Graph 全局关系模型、Diagram、Editor、Core Theme / Composite context 与 renderer contract 不因本决策改变

## 最终实现结果

Graph presentation root、开放 Entity role / variant registry、Graph Theme token selector 与 assembly-local provider 装配已经形成 direct IR、React、Vanilla 的统一闭环。内置与自定义 Definition 共用同一注册、解析和 lowering 路径，Graph 领域数据在下沉边界全部消费

默认 React JSX 宿主继续只装载内置 Graph Definitions；自定义 Definition 使用显式 configured processing adapter 或 direct IR compile，不引入全局注册
