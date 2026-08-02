# ADR-06：Standard Legend 消费、外围组合与追溯

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-04 descriptor](./04-conditional-visual-encoding-and-scale.md) · [Standard alpha.2 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/roadmap.md) · [Standard Legend ADR-09](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md)

## 背景

ADR-04 的 Table Legend descriptor 保存 encoding id、channel、scale name、title 与 detached declarative mapping。该 mapping 同时是 Cell evaluator 和 Legend 呈现的唯一真源，但 descriptor 还不是可绘制内容。通用 title、`items | ramp`、任意 `IRChild` sample、内部布局、layout-aware compile 与 artifact 已明确归 `@retikz/standard`。

Table 仍需要完成自己的领域链路：把 descriptor 解析为 Standard Legend 输入，把所需 capability 显式贡献给 Core compile，在 Table box 旁停靠一个或多个 Legend，并把 encoding、Cell、Legend occurrence 与 bounds 关联起来。

Standard alpha.2 ADR-09 的最终 schema、module 组合与重复 capability 语义尚在 Proposed 阶段。Table 不能提前复制一份临时 Legend，也不能猜测一个私有 Standard deep import。本 ADR 因此同时冻结 Table 侧可独立确定的行为，并设置实现前 hard gate。

## 决策：descriptor 解析为 Standard public Legend input，由 Table 负责 placement intent 与 lineage

### Hard gate

本 ADR 进入实现前，Standard alpha.2 ADR-09 必须已有 Accepted 合同，Core replayed-child artifact link 也必须在当前分支可消费；组合能力至少公开：

1. JSON-safe `LegendInput` / `LegendSchema`、`createLegend()` 与 canonical `IRLegend`，覆盖 `items | ramp` 与任意 `IRChild` sample
2. Legend composite Definition、`createFlexLayout()` 与显式 `LegendModule` / `FlexLayoutModule`
3. constrained layout / layout-aware compile / typed artifact
4. capability bundle 对“领域包传递引入 + 调用方显式引入同一 module”的确定合并或冲突语义
5. direct IR、React、Vanilla 的契约测试
6. Core 提供通用、compile-local 的 parent-owned key → replayed child occurrence artifact 关联；现有 `LayoutChildResult` 不暴露 child occurrence，因此该能力未就绪前不得预测 `expansionPath`、从 probe/replay index 反推 locator 或在 Table artifact payload 中伪造关联

Table 实现只使用 `@retikz/standard` package root 的上述 public API，不在 Table 建 alias、镜像 schema 或 deep import。

Gate 未满足时：

- ADR-06 保持 Proposed
- ADR-01～05 可以独立设计 / 实现，但 alpha.3 milestone 不能完成
- 不新增 Table-local legend child、layout helper、renderer 或 placeholder public API

### Table Legend placement sugar

Table root 增加可选停靠配置：

```ts
const TableLegendPosition = {
  Right: 'right',
  Bottom: 'bottom',
} as const;

type IRTableLegendLayout = {
  position?: TableLegendPositionValue;
  gap?: number;
  itemGap?: number;
  align?: 'start' | 'center' | 'end';
};

type IRTableSpec = {
  // existing fields
  legendLayout?: IRTableLegendLayout;
};
```

defaults：

- `position: 'right'`
- `gap: 16`：Table box 与 Legend stack 的间距
- `itemGap: 8`：多个 Legend 之间的间距
- `align: 'start'`：stack 相对 Table cross axis 的对齐

`gap` / `itemGap` 为有限非负数。没有 descriptor 时忽略 `legendLayout`，不产生空占位。该配置只保存 Table 领域 placement intent，不授权 Table 建立外围布局 solver。

alpha.3 只支持 right / bottom，避免为 left / top 引入负原点迁移和额外 placement 语义；作者需要任意外围 composition 时可在 Table 外使用 Standard / Core 容器。

### Descriptor 到 Standard Legend

Table 把 `TableLegendDescriptor` 与 root `tableId` 解析为 Standard public `LegendInput` plain JSON，再调用 `createLegend()` 校验并取得 canonical `IRLegend`。Table 不返回自有 Legend input 类型，也不镜像 Standard schema。映射语义固定如下：

| Table descriptor             | Standard Legend 语义                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `encodingId`                 | Table 领域 `legendId` 与 item/tick key 的命名空间，不写入 Standard 领域字段                           |
| `title`                      | 文本进入显式 Core Node child 的 `IRTextBlock`；不存在时省略 title                                     |
| `mapping.kind: 'ordinal'`    | `kind: 'items'`；entries 同序，每项生成稳定 key、固定 swatch sample child 与 value label child        |
| `mapping.kind: 'threshold'`  | `kind: 'items'`；每个 color 对应一个由 edges 定义的阈值区间 item                                      |
| `mapping.kind: 'continuous'` | `kind: 'ramp'`；固定连续 sample child，stops 直接生成 gradient，domain endpoints 生成 `0` / `1` ticks |

Standard form 严格由 mapping kind 派生，descriptor 不保存可与 mapping 漂移的 `form`、`domain`、`range` 或 `edges` 副本。Table 只从 mapping 构造 sample child 的 fill / gradient stops；Standard 不解释颜色领域语义。opaque resolution 不会产生 descriptor，因此不能进入本 ADR 的 Standard 解析链路。

稳定 Table `legendId` 为 `table/${utf16Token(tableId)}/legend/${utf16Token(encodingId)}`。`utf16Token(value)` 按顺序把每个 UTF-16 code unit 编为恰好四位小写十六进制并直接连接，因此对空串、分隔符、astral character 与孤立 surrogate 都有定义且无碰撞。它只建立 encoding 与 Table manifest legend 的领域 lineage，不写入 `IRLegend`，也不作为 Standard artifact 查询键。ADR-04 已要求存在 opt-in Legend 时 TableSpec 显式提供 root `id`；Table 不从数组位置、随机数或隐藏全局状态派生领域 identity。

item / tick key 使用以下类型保真、无数组 index 的稳定语法；最终 key 仍由 Standard schema 执行 form 内唯一性校验：

- ordinal item：`${legendId}/item/${scalarToken}`；`scalarToken` 从 entry value 按 JSON scalar 类型编码为 `boolean:0|1`、`number:<canonical finite number>` 或 `string:<utf16Token(value)>`，因此数值 `1` 与字符串 `"1"` 不碰撞，任意合法 JSON string 都能稳定编码
- threshold item：空 edges 产生唯一 `${legendId}/item/all` 且省略 label；非空时首区间为 `${legendId}/item/lt/${numberToken(firstEdge)}`，中间区间为 `${legendId}/item/gte/${numberToken(leftEdge)}/lt/${numberToken(rightEdge)}`，末区间为 `${legendId}/item/gte/${numberToken(lastEdge)}`；严格递增 edges 保证区间 key 唯一
- ramp tick：固定为 `${legendId}/tick/start` 与 `${legendId}/tick/end`；即使两个 endpoint value 相等仍保持两个 authored role 与唯一 key

`canonical finite number` / `numberToken` 先把 `-0` 规范为 `0`，再使用 ECMAScript `Number.prototype.toString()` 的十进制结果；descriptor 已拒绝 `NaN` 与无穷值。

Table-owned Core children 使用以下 canonical 形状：

- authored title 与每个未省略的 label 都是 `{ type: 'node', position: [0, 0], text, padding: 0, stroke: 'none', fill: 'none' }`；`text` 使用 `IRTextBlock` 的 string 分支，空字符串仍保留为空文本 child
- swatch sample 是 `{ type: 'node', position: [0, 0], minimumSize: { width: 16, height: 16 }, padding: 0, stroke: 'none', fill: color }`；省略 `text`，使 natural size 不受字体与 line height 影响
- ramp sample 是 `{ type: 'node', position: [0, 0], minimumSize: { width: 16, height: 120 }, padding: 0, stroke: 'none', fill: { kind: 'linearGradient', angle: 90, stops: mapping.stops } }`，对应 `direction: 'vertical'`；省略 `text`
- ramp start/end tick 的 `offset` 固定为 `0` / `1`；各自 label 使用 continuous mapping domain 首尾值，两个 endpoint 相等时仍保留两个 authored role

ADR-04 的 mapping guard 保证 ordinal entries 不含 null 且 canonical identity 唯一、threshold colors 与 edges 完整对应，并保证 continuous domain 是两个有限 number、stops 从 `0` 到 `1` 严格有序。continuous endpoint 相等时，factory 已把全部 stops 规范为同一中点颜色，因此 sample 退化为纯色 gradient，两个同值 tick 仍保留 start/end 身份，不会把一个 Cell 值解释为两种颜色。

label 规则：

- ordinal entry：`null` 不进入 entries；其余 value 使用确定性 `String(value)`
- sequential endpoints：使用 `d3-format('~g')`
- threshold：`< x`、`a – < b`、`≥ x`，边界数字使用 `~g`

这些 label 只描述 scale descriptor，不复用需要 Cell context 的 Formatter Definition。自定义 Legend label formatter、locale 与 timezone 延后；作者可在未来扩展 encoding legend config，但不能把 callback 写入 IR。

Standard input 不包含 Table field、selector、rule、formatter ref、source、Cell ids、theme definition 或 interaction state。

### Capability loading

`@retikz/table` 声明兼容的 `@retikz/standard` 运行依赖。Table compile / runtime contribution 无条件显式组合 `LegendModule` 与 `FlexLayoutModule`：

- direct `compileTable()` 把两个 Standard modules 的 Core definitions 合入 compile options，不以 resolution 结果动态改写 registry
- React / Vanilla 的 Table runtime contribution 经共同 `makeTableRuntimeComposites()` 贡献同一 definitions
- 纯 `lowerTables()` 不依赖全局注册；其 Table runtime bundle / contribution contract 始终携带两个 Standard modules，调用方必须在 Core compile 前消费该 contribution

这个无条件传递是 compile 时序契约：scale resolution 发生在 Table composite callback 内，当时 Core registry 已经冻结，不能根据 descriptor 结果补注册 capability。没有 Legend 的 Table 只是不使用这两个 definition，不改变输出 IR 或 artifact。

调用方同时显式提供同一 `LegendModule` 或 `FlexLayoutModule` 时，严格采用 Standard Accepted capability-loading 语义；Table 不按 namespace/name 私自去重，也不吞掉真实不同 definition 冲突。

### Standard 外围组合

Table 把已解析的 body contribution 与 Standard Legend children 组装为 Standard public `FlexLayoutInput`，再由 `createFlexLayout()` 产生 canonical 外围组合；Table 不直接 probe、放置或 union 这些 children 的 bounds：

- `position: 'right'`：外层 Flex 使用 `direction: 'row'`、`columnGap: gap`，children 依次为 Table body 与 Legend stack；stack 使用 `direction: 'column'`、`rowGap: itemGap`
- `position: 'bottom'`：外层 Flex 使用 `direction: 'column'`、`rowGap: gap`，children 依次为 Table body 与 Legend stack；stack 使用 `direction: 'row'`、`columnGap: itemGap`
- 外层 `alignItems` 使用 `align`，stack 的 `alignItems` 固定为 `start`；所有 Flex item 使用 Table-owned stable key，Legend item key 使用对应 `legendId`
- descriptor / encoding authored order 同时决定 Legend stack 的 child 顺序与最终 paint order；没有 Legend 时直接保留 Table body，不建立空 Flex

Standard FlexLayout 负责外围 children 的 probe、gap、alignment、placement、replay 与 allocation / visual bounds；Legend 继续负责自身内部布局。Table 不读取 Legend item bounds、不复制 Standard wrap / overflow，也不建立私有停靠或 bounds-union solver。nested Standard artifacts 由 Core artifact tree 保留，Table 在同次 compile 完成后经通用 artifact link 消费真实 occurrence 与 bounds。

### Manifest 与 lineage

`TableLayoutManifest` 扩展：

```ts
type TableManifestEncoding = {
  id: string;
  channel: TableVisualChannelValue;
  scaleName: string;
  cellIds: Array<string>;
  legendId?: string;
};

type TableManifestLegend = {
  encodingId: string;
  legendId: string;
  position: TableLegendPositionValue;
};

type TableLegendArtifactLink = {
  legendId: string;
  occurrence: CompileOccurrenceLocator;
};
```

每个 manifest Cell 增加：

- `formatterName?`
- `presentationName?`
- `matchedRuleIndices`
- `encodingIds`
- resolved `appearance`

Table manifest typed artifact 只保留领域 `legendId`、position 与 encoding 关联，不复制 Standard Legend item artifact，不提前写入 nested Legend bounds，也不承诺 callback 尚不可见的 child locator。Core 通用 artifact-link contract 在 replay 提交后把 parent-owned `legendId` 解析为真实 Legend `occurrence`；Table compile API 从同一次 Core result 暴露 authored order 的 immutable `legendArtifactLinks` 视图，React / Vanilla 透传同一结果。调用方以该 occurrence 查询 Standard Legend typed artifact，再读取 allocation / visual / visible bounds；Table 不在自己的 artifact 内建立延迟回填或第二份 geometry 副本。该 locator 只在同一次 canonical compile 内确定，不作为跨编辑稳定 identity；generic compile 消费方使用同一 Core link collection，不按 artifact 数组位置或结构化路径猜测关联。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  id: 'sales',
  structure: detailStructure,
  encodings: [
    {
      id: 'revenue-heat',
      selector: { fields: ['revenue'] },
      channel: 'backgroundFill',
      scale: { name: 'sequential-color' },
      legend: { title: 'Revenue' },
    },
  ],
  legendLayout: {
    position: 'right',
    gap: 16,
    itemGap: 8,
    align: 'start',
  },
};
```

## 测试设计

长期测试语义：

- ordinal / threshold / continuous mapping 到 Standard `items | ramp` input、显式 title/label child、sample child 与稳定 item/tick key 的 JSON/schema 映射
- continuous 全部 stops 直接生成 gradient，equal domain 只保留同一中点色；opaque resolution 无法进入 Standard 链路
- Standard Legend / FlexLayout modules 直接、传递、重复消费与冲突诊断
- 无 Legend 与 callback 内才产生 Legend 的 Table 都在 compile 前无条件获得同一 Standard module contribution
- right/bottom 到 Standard outer/stack Flex 的 canonical 映射、多 Legend、empty descriptor、alignment 与 overall bounds
- Table manifest 只保留领域 lineage，replay 后 link occurrence 可查询同次 Standard nested artifact 与 bounds
- Core artifact link 在 replay 后按 `legendId` 解析真实 occurrence，且不预测 probe/replay index
- Table 不含 Standard 内部 layout、item schema 或 renderer 分支

## 影响

- `@retikz/table` 新增 `@retikz/standard` 兼容依赖
- `TableSpecSchema` 增加 `legendLayout`
- Table compile/runtime contribution 在 Core compile 前无条件贡献 Standard Legend 与 FlexLayout modules
- Table compile contribution 构造 Standard outer/stack Flex composition，不新增外围 solver
- manifest 扩展 presentation、rules、encodings 与 legends lineage，但不复制 nested Legend bounds；compile result 增加同次 `legendArtifactLinks`
- Table alpha.3 release 受 Standard alpha.2 可消费版本 gating，但 release group 不 lockstep

## 能力完备性检查

- **所属能力域与能力面**：Table 的 Visual Encoding / Traceability；Standard 的通用 Drawing Presentation
- **解决的问题**：把 Table scale descriptor 呈现为可布局 Legend，并保持 Cell → encoding → Legend → Core artifact 追溯
- **主责包与协作包**：Table 主责 descriptor、label semantics、placement intent 与 lineage；Standard 主责 Legend schema、内部布局、外围 Flex composition、layout-aware compile 与 artifact；Core 主责 probe/replay 与 compile-local artifact link
- **是否可由现有能力组合**：ADR-04 descriptor + Standard Legend + Core layout-aware composite 可组合，不新增 Table renderer
- **是否需要下沉**：Standard gate 与 Core 通用 replayed-child artifact link 必须先完成；Table 不下沉或复制通用 Legend，也不预测 Core occurrence path
- **内部表达链路**：declarative mapping descriptor → Standard LegendInput → Standard FlexLayoutInput → Standard modules → Core probe/replay → Core IR + dual artifacts
- **外部扩展链路**：custom Table visual scale 只有返回 declarative resolution 时才产生同一 descriptor；opaque resolution 仅实绘；Standard direct/Plot/Table 走同一 Legend definition
- **下游执行 / adapter 等价性**：React/Vanilla 共用 Table contribution；renderer 不认识 Table/Legend 私有类型
- **不支持边界与诊断**：不含 interaction、left/top、custom labels、Plot Cell guide coordination；missing Standard capability fail-loud
- **本轮结论**：组合 Standard + Core；Table 只扩展领域解析、placement intent 与追溯

## 不在本 ADR 范围

- Standard Legend schema、内部布局、style 或 artifact 的定义，以及 Standard Flex solver
- left/top/overlay/floating Legend 与全局 decoration collision
- Legend filter / selection interaction
- 跨 Plot Cell guide 协调或从 Cell 内 Plot 自动收集 Legend
- locale / timezone / custom label formatter
