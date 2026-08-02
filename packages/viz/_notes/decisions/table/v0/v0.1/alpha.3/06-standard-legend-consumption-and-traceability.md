# ADR-06：Standard Legend 消费、外围组合与追溯

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-04 descriptor](./04-conditional-visual-encoding-and-scale.md) · [Standard alpha.2 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/roadmap.md) · [Standard Legend ADR-09](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/09-generic-legend.md) · [Standard FlexLayout](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/03-flex-layout.md)

## 背景与目标

ADR-04 的 Table Legend descriptor 保存 encoding id、channel、scale name、title 与 detached declarative mapping。该 mapping 同时是 Cell evaluator 和 Legend 呈现的唯一真源，但 descriptor 还不是可绘制内容。通用 title、`items | ramp`、任意 `IRChild` sample、内部布局、layout-aware compile 与 artifact 属于 `@retikz/standard`。

Table 仍需完成自己的领域链路：把 descriptor 解析为 Standard Legend 输入，把所需 capability 显式贡献给 Core compile，在 Table body 旁排列一个或多个 Legend，并把 encoding、Cell、Legend occurrence 与 bounds 关联起来。

Table 保留自身复杂的 body layout；Legend stack、body 与未来 title/description/caption/source 等外围内容的测量、排列、对齐、overflow 与 replay 统一由 Standard Box Layout 完成。

## 决策

### 设计与实现 hard gate

本 ADR 进入实现前，当前分支必须能从 `@retikz/standard` package root 消费 Accepted：

1. JSON-safe `LegendInput` / `LegendSchema`、`createLegend()` 与 canonical `IRLegend`，覆盖 `items | ramp` 与任意 `IRChild` sample
2. `LegendDefinition`、`LegendModule`、`createFlexLayout()` 与 `FlexLayoutModule`
3. constrained layout、layout-aware compile 与 typed Legend/Flex artifacts；Flex 把每个 authored item key 关联到最终 replayed child occurrence
4. capability bundle 对领域包传递引入与调用方显式引入同一 module 的确定幂等/冲突语义
5. direct IR、React 与 Vanilla 的等价契约

Core 还必须提供 compile-local 的 parent-owned key → replayed child occurrence artifact link，并在 child 经过嵌套 replay container 导入与 occurrence remap 后仍传播到最终 occurrence。Standard Flex 必须用该能力发布 authored item key 到其 replayed child occurrence 的 typed link。现有 layout callback 不能安全预测最终 child occurrence；该能力未就绪时，不得从 probe/replay index 反推 locator，也不得在 Table artifact 中伪造关联。

当前 Table layout transaction 的 body 输出包含 callback-local opaque replay handle，不能作为 `FlexLayoutInput` 的 JSON-safe `IRChild`。ADR-06 实现必须先建立 Table-owned、lowering-only 的 body composite boundary，使 Table root 能把 body 表达为 canonical JSON-safe `IRChild` 再与 Standard Legend 组合；该边界不增加第二套 body layout，不暴露新的 authoring surface，也不得把 `CompositeCompileChild` 序列化或跨 callback 传给 Standard。该边界未形成前，外围 Flex 同样保持实现 gate。

Table 只使用 Standard package root 的真实公共 API，不建立 alias、镜像 schema、deep import 或临时兼容层。Gate 未满足时：

- ADR-06 保持 Proposed，alpha.3 milestone 不能完成
- ADR-01～05 的独立能力不因此失效
- 不新增 Table-local Legend、外围 solver、renderer 或 placeholder public API

### Table placement sugar

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
  legendLayout?: IRTableLegendLayout;
};
```

默认值：`position: 'right'`、`gap: 16`、`itemGap: 8`、`align: 'start'`。gap/itemGap 必须是有限非负数。没有 descriptor 时忽略 `legendLayout`，不产生空占位或无意义 wrapper。

alpha.3 只支持 right/bottom。left/top、overlay、floating 与完全自定义 Figure 应在 Table 外直接组合 Standard Flex/Grid/Overlay；Table 不镜像 Standard 通用 layout props。

### Descriptor 到 Standard Legend

Table 把 `TableLegendDescriptor` 与 root table id 解析为 Standard public `LegendInput` plain JSON，再由 `createLegend()` 取得 canonical `IRLegend`。Table 不返回自有 Legend input 类型，也不镜像 Standard schema。

| Table descriptor             | Standard Legend 语义                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `encodingId`                 | Table 领域 legend identity 与 item/tick key 的命名空间，不写入 Standard 领域字段         |
| `title`                      | 文本进入显式 Core Node child；不存在时省略 title                                         |
| `mapping.kind: 'ordinal'`    | `kind: 'items'`；entries 同序，每项生成稳定 key、swatch sample 与 value label            |
| `mapping.kind: 'threshold'`  | `kind: 'items'`；每个 color 对应一个由 edges 定义的阈值区间 item                         |
| `mapping.kind: 'continuous'` | `kind: 'ramp'`；stops 直接生成 gradient sample，domain endpoints 生成 offset `0/1` ticks |

Standard form 严格由 mapping kind 派生。descriptor 不保存可与 mapping 漂移的 form/domain/range/edges 副本；opaque resolution 不产生 descriptor，因此不能进入 Standard 链路。

稳定 Table legend id 为 `table/${utf16Token(tableId)}/legend/${utf16Token(encodingId)}`。`utf16Token` 按顺序把每个 UTF-16 code unit 编为四位小写十六进制并连接，对分隔符、astral character 与孤立 surrogate 都保持确定且无碰撞。它只建立 Table manifest 的领域 lineage，不写入 `IRLegend`，也不作为 Standard artifact 查询键。

item/tick key 不使用数组 index：

- ordinal item：`${legendId}/item/${scalarToken}`；`scalarToken` 为 `boolean:0|1`、`number:<numberToken>` 或 `string:<utf16Token(value)>`，保持 boolean/number/string 类型且无分隔符碰撞
- threshold item：空 edges 使用唯一 `${legendId}/item/all` key 且省略 label；非空 edges 的首区间为 `${legendId}/item/lt/${numberToken(firstEdge)}`，中间区间为 `${legendId}/item/gte/${numberToken(leftEdge)}/lt/${numberToken(rightEdge)}`，末区间为 `${legendId}/item/gte/${numberToken(lastEdge)}`
- ramp tick：固定使用 `${legendId}/tick/start` 与 `${legendId}/tick/end`，即使两端值相等也保留两个 authored role

`numberToken` 先把 `-0` 规范为 `0`，再使用 ECMAScript `Number.prototype.toString()` 的十进制结果；mapping 已拒绝 `NaN` 与无穷值。

Table 构造的 title/label 是无隐式外观的 Core text Node；swatch 是固定 `16×16`、无描边的 color Node；vertical ramp 是固定 `16×120`、无描边的 linear-gradient Node。continuous stops 原样进入 gradient，start/end tick offset 固定为 `0/1`。这些 child 都经过 Standard 对任意 `IRChild` 的通用 probe/replay，不引入 Legend sample registry。

label 规则：ordinal value 使用确定性 `String(value)`；continuous endpoint 使用 d3 `~g`；非空 threshold 使用 `< x`、`a – < b`、`≥ x`，边界同样使用 `~g`；空 threshold 省略 label。`~g` 必须来自 Table-owned、immutable 的 `formatLocale()` 实例，固定 decimal `.`、thousands `,`、grouping `[3]`、空 currency、minus `−` 与 nan `NaN`，不得读取或修改 d3 的 process-global default locale。这些 label 描述 scale mapping，不调用需要 Cell context 的 Formatter Definition。

Standard input 不包含 Table field、selector、rule、formatter ref、Cell ids、style token map 或 interaction state。

### Capability loading

`@retikz/table` 声明兼容的 `@retikz/standard` 运行依赖。direct compile 与共享 Table runtime contribution 在 Core registry 冻结前无条件组合同一个 `LegendModule` 与 `FlexLayoutModule`；不能等 Table callback 解析出 descriptor 后再动态注册。

没有 Legend 的 Table 只是不使用这两个 definitions，不改变输出。调用方同时显式提供同一 module object 时，严格采用 Standard Accepted 的 capability-loading 语义；Table 不按 namespace/name 私自去重，也不吞掉真实不同 definition 冲突。

### Standard 外围组合

Table root 先通过 Table-owned body composite boundary 取得 JSON-safe body `IRChild`，再把它与 Standard Legend children 组装为 public `FlexLayoutInput`，由 `createFlexLayout()` 产生 canonical composition。opaque replay handle 不进入该 IR：

- right：外层 row，`columnGap = gap`；children 为 body 与 Legend stack；stack 为 column，`rowGap = itemGap`
- bottom：外层 column，`rowGap = gap`；children 为 body 与 Legend stack；stack 为 row，`columnGap = itemGap`
- 外层 `alignItems` 使用 Table `align`，stack 的 `alignItems` 固定为 start
- body、stack 与每个 Legend 使用 Table-owned stable item key；每个 Legend 的 stack Flex item key 必须精确等于对应 `legendId`，descriptor authored order 同时决定 stack child 顺序与 paint order
- 没有 Legend 时直接保留 Table body，不建立空 Flex

Standard 独占外围 children 的 probe、gap、alignment、placement、overflow、replay、allocation/visual bounds 与布局 artifact。Table 不读取 Legend item bounds、不复制 wrap/text measurement/bounds union，也不建立私有停靠 solver。

未来新增 title、description、caption、source 时，Table schema 只拥有文字语义、顺序与关联；解析后的通用 child 进入同一 Standard composition tree。本 ADR 不预留空字段或 Table 私有文字布局器。

### Manifest 与 traceability

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

Table manifest 只保存领域 legend id、position、encoding/Cell 关联，以及既有 formatter/presentation、matched rules、resolved appearance、style token 与 Border Graph provenance。它不复制 Standard Legend item artifact、Flex item 细节或 nested Legend bounds。

Standard Flex 在 replay 提交后经 Core link contract 把 item key `legendId` 解析为真实 Legend occurrence；该 link 必须穿过外层 Flex、Legend stack 与 replay occurrence remap。Table compile API 从同一次 Core result 暴露 authored-order、immutable `legendArtifactLinks`。调用方以 occurrence 查询 Standard typed artifact 和 bounds。该 locator 只在同一次 canonical compile 内确定，不作为跨编辑稳定 identity；generic consumer 不按 artifact 数组位置或结构化路径猜测关联。

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

## 功能与包边界

- Table 拥有 descriptor mapping、label semantics、right/bottom placement intent、Table body layout 与领域 lineage
- Standard 拥有 Legend visual structure、内部 layout、外围 Box Layout、lowering 与 typed artifacts
- Core 拥有 composite execution、measurement、replay、artifact tree、nested replay link propagation 与 compile-local artifact link
- adapters 只贡献 capability 并消费同一 manifest/link helper

## 兼容性与影响

- `@retikz/table` 增加兼容的 Standard 运行依赖
- `TableSpec` additive 增加 `legendLayout`
- compile/runtime contribution 无条件携带 Legend/Flex modules
- manifest additive 增加 legend lineage，compile result 增加同次 artifact links
- Table 与 Standard release group 不 lockstep，但 Table alpha.3 发布受可消费的 Standard alpha.2 契约 gating

## 测试策略摘要

- mapping contract 证明 ordinal/threshold/continuous 到 Standard items/ramp、label/sample 与 stable key 的映射
- capability contract 证明 direct/transitive/duplicate/conflicting module 语义
- composition contract 证明 JSON-safe body boundary、right/bottom、多 Legend、gap/alignment、无 descriptor 与 Standard-only layout
- artifact contract 证明 Legend Flex item key 等于 `legendId`，nested replay 后的 Core link occurrence 可查询同次 Standard typed artifact，不预测 probe/replay index
- parity 证明 direct/React/Vanilla/SSR 的 Scene、artifacts、manifest 与 lineage 等价

详细 tree、identity helper、case、路径、命令和正式证据位于对应 ignored mirror plan 的 `PLAN.md` 与 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Table Visual Encoding/Traceability 与 Standard Drawing Presentation/Box Layout
- **问题归属**：Table 解析 descriptor/placement/lineage，Standard 负责通用 Legend 与外围布局，Core 负责 occurrence-safe artifact link
- **内部闭环**：Table body composite + declarative descriptor → Standard Legend/Flex input → Core Scene/artifacts → Table lineage + artifact links
- **外部扩展**：custom Table scale 只有返回 declarative resolution 时进入同一链路；其它领域复用同一 Standard definitions
- **结论**：组合 Standard 与 Core，Table 不新增通用布局、artifact 副本或 renderer 能力

## 被否决方案

- Table-local Legend：复制 Standard 的跨领域组件与 artifact
- Table-local dock/Flex solver：复制通用 Box Layout 与 measurement/replay
- 把 Table callback-local replay handle 塞入 Flex IR：破坏 JSON-safe IR 与 callback-local ownership
- 从 probe/replay index 预测 occurrence：依赖内部遍历顺序，不能形成稳定 artifact contract
- adapter 各自 join artifacts：跨入口会产生不同 occurrence 与错误语义
- 从 Cell 内 Plot 自动收集 Legend：越过通用 `IRChild` 边界并建立 Plot 特判

## 不在本 ADR 范围

- Standard Legend/Flex/Grid/Overlay 的 schema、solver、style、artifact 或 adapter 定义
- Core artifact-link 公共契约的具体 schema 与实现
- title、description、caption、source 的新 Table authoring 字段
- left/top/overlay/floating Legend 与全局 decoration collision
- Legend filter/selection interaction
- 跨 Plot Cell guide 协调
- locale/timezone/custom Legend label formatter
