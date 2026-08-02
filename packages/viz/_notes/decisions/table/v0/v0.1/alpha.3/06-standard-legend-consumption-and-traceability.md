# ADR-06：Standard Legend 消费、Box Layout 组合与追溯

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-04 descriptor](./04-conditional-visual-encoding-and-scale.md) · [Standard alpha.3 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/roadmap.md) · [Standard Legend ownership ADR](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/01-legend-ownership-and-dependency.md) · [Standard FlexLayout](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/03-flex-layout.md)

## 背景与目标

ADR-04 的 Table Legend descriptor 保存 encoding id、channel、scale resolution 的 domain/range/edges 与 title，能够证明实绘与 Legend 同源，但它不是可绘制的通用 Legend。Legend 的 title、entries、swatch/ramp、内部布局、Core lowering 与 artifact 属于 `@retikz/standard`。

Table 仍需拥有领域映射：把 descriptor 转成 Standard Legend input，表达 Legend 位于 Table body 的 right/bottom，并把 encoding、Cell、Legend occurrence 与 bounds 关联起来。Table 保留自身复杂的 body layout；Legend stack、body 与未来 title/description/caption/source 等外围内容的测量、排列、对齐、overflow 与 replay 统一由 Standard Box Layout 完成。

## 决策

### 设计与实现 hard gate

当前分支必须能从 `@retikz/standard` package root 消费 Accepted：

- `FlexLayout` 的 canonical constructor、module、typed artifact 与公开类型
- JSON-safe Legend input，覆盖 swatch 与 ramp
- Legend composite Definition、显式 module、constrained layout、Core lowering 与 typed artifact
- capability bundle 对传递引入与调用方显式引入同一 module 的确定合并/冲突语义
- direct IR、React 与 Vanilla 的契约证据

Table 直接采用 Standard 真源命名，不建立 alias 或镜像 schema。Gate 未满足时，ADR-06 保持 Proposed，alpha.3 不能完成，且不得新增 Table-local Legend、Flex solver、停靠 helper、renderer 或 placeholder public API。ADR-01～05 的独立能力不因此失效。

当前 ADR 只冻结 Table 拥有的 descriptor mapping、placement intent、manifest projection 与对 Standard 的能力要求，不把尚未 Accepted 的 Standard nominal types 当作已存在事实。Standard Legend Accepted 并可从当前分支 package root 消费后，必须以真实名称、schema、capability-loading 与 artifact contract 对齐本 ADR；在此之前不得实现 ADR-06/07 的跨包链路。

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

默认值：position 为 right，Table body 与 Legend stack 的 gap 为 16，多个 Legend 的 itemGap 为 8，cross-axis align 为 start。gap/itemGap 必须是有限非负数。没有 descriptor 时忽略 `legendLayout`，不产生空占位或无意义 wrapper。

alpha.3 只支持 right/bottom。left/top、overlay、floating、多外围区域或完全自定义 Figure 应在 Table 外直接组合 Standard Flex/Grid/Overlay；Table 不镜像 Standard 的通用 layout props。

### Standard composition 语义

Table 把每个 descriptor 解析为一个 Standard Legend child，按 encoding 声明顺序放入 Legend stack，再把 body 与 stack 交给 Standard FlexLayout：

- right：body 与 stack 横向排列；Legend 纵向排列
- bottom：body 与 stack 纵向排列；Legend 横向排列
- `gap` 只控制 body/stack，`itemGap` 只控制 Legend 之间的距离
- `align` 只控制 Legend stack 相对 body 的 cross-axis 对齐，不移动 body origin
- body 可参与可用空间的 grow/shrink；Legend stack 保持 content size
- Standard 独占 constrained probe、placement、overflow、replay、allocation/visual bounds 与布局 artifact

Table 必须通过 Standard 的 canonical constructor/schema 构造 composition，不手写宽对象或 deep import solver。Table 不读取 Legend 内部 entry bounds，也不复制 wrap、text measurement 或 bounds union。

未来新增外围 title、description、caption、source 时，Table schema 只拥有文字语义、顺序与关联；解析后的通用 child 进入同一 Standard composition tree。本 ADR 不预留空字段、空 item 或 Table 私有文字布局器。

### Descriptor 到 Standard Legend

稳定 Legend id 为 `${tableId}/legend/${encodeURIComponent(encodingId)}`。存在 opt-in Legend 时 root table id 已由 ADR-04 要求为非空；不得从 occurrence、数组位置、随机数或全局状态派生。

映射语义：

| Table descriptor | Standard Legend                                     |
| ---------------- | --------------------------------------------------- |
| `title`          | title text                                          |
| swatch，无 edges | domain/range 同序离散 entries                       |
| swatch，有 edges | 每个 range color 对应一个阈值区间 entry             |
| ramp             | domain endpoints 与 range stops                     |
| encoding id      | stable Legend id/key 来源，不成为 Standard 领域字段 |

无 edges 的 swatch 与 ramp 必须为 domain 中每个 scalar 保留同位置 label，不能因 null 或类型改变 cardinality：finite number 使用 d3 `~g`，string/boolean/null 使用确定性 `String(value)`。Threshold edges 使用 `< x`、`a – < b`、`≥ x`，数值同样使用 `~g`。这些 label 描述 scale descriptor，不调用需要 Cell context 的 formatter。Standard input 不包含 Table field、selector、rule、formatter ref、Cell ids、style token map 或 interaction state。

### Capability loading

`@retikz/table` 声明兼容的 Standard 运行依赖，并使 direct/React/Vanilla/SSR 的 Table runtime contribution 始终精确包含本路径所需的 FlexLayout 与 Legend modules。它不引入完整 Standard preset，也不等 Table resolution 后动态注册能力。

调用方同时显式提供同一 Standard module 时，严格采用 Standard Accepted 的 capability-loading 语义；Table 不按 namespace/name 私自去重，也不吞掉真实不同 definition 冲突。缺少 capability 或冲突均 fail-loud。

### Manifest 与 traceability

Table 提供唯一 public helper，从同一次 Core artifact tree 解析一个 Table occurrence 的最终 manifest：

```ts
type TableManifestSelector =
  | { tableId: string }
  | { occurrence: CompileOccurrenceLocator };

resolveTableManifest(
  artifacts: ReadonlyArray<CompileArtifact>,
  selector: TableManifestSelector,
): TableLayoutManifest;
```

`compileTable()` 继续返回 convenience `result.manifest`，但内部必须调用同一 helper。Generic `compileToScene()`、React、Vanilla 与 SSR 不得各自实现 artifact join。

Selector 必须唯一锚定一个 Table occurrence。tableId 重复时 fail-loud，调用方改用 exact occurrence；缺失、重复、跨 occurrence、顺序/key/id 不一致或 schema-invalid artifacts 都是 contract errors。Table 外层 Standard layout、Cell 内 Standard components 或另一个相同 tableId 的 occurrence不能被误接到当前 Table。

Occurrence selector 必须精确等于该 Table-owned body artifact envelope 的完整 occurrence；public shell、outer Flex、Legend stack 或任意 descendant occurrence 都不匹配。Outer/stack/Legend 只能按同一 Core occurrence tree 中的直接 composition parent-child 关系、稳定 item key 与 descriptor order 关联，不能只按全局 id 搜索；精确 expansion-segment algorithm 属于 mirror plan。

Manifest 保持 Cell/row/column/border geometry 为 body-local coordinate，并增加 composition-local section：

```ts
type TableManifestCompositionItem = {
  key: 'body' | 'legends';
  translation: { x: number; y: number };
  allocationBounds: BoundsRect;
  visualBounds: BoundsRect;
};

type TableManifestComposition =
  | {
      kind: 'body';
      allocationBounds: BoundsRect;
      visualBounds: BoundsRect;
      body: TableManifestCompositionItem;
    }
  | {
      kind: 'standardFlex';
      allocationBounds: BoundsRect;
      visualBounds: BoundsRect;
      body: TableManifestCompositionItem;
      legends: TableManifestCompositionItem;
    };

type TableManifestLegend = {
  encodingId: string;
  legendId: string;
  itemKey: string;
  position: TableLegendPositionValue;
  allocationBounds: BoundsRect;
  visualBounds: BoundsRect;
};
```

Composition item 的 translation、allocationBounds 与 visualBounds 都以 outer composition origin 为坐标系；body-local Cell geometry 不被重写。无 Legend 时 `composition.kind` 为 body，body key 为 `body`、translation 为 `{ x: 0, y: 0 }`，container/body bounds 直接来自 body artifact，不伪造 Standard artifact。存在 Legend 时，outer body/legends item 直接投影为 composition items；stack-local Legend bounds 只叠加一次 outer legends translation 成为 composition-local bounds，不重复叠加已包含在 item bounds 中的 stack translation。Legend 内部 entry bounds 仍只属于 Standard Legend artifact。

Table manifest 继续拥有领域 lineage：resolved style token map/source、encoding 到 Cell/Legend 的关联、Cell formatter/presentation names、matched rule indices、resolved appearance 与 leaf winner source、Border Graph winner provenance。它不复制 Standard Legend item artifact 或 Flex line/item 细节；调用方可在同一 artifact tree 通过 stable ids 查询 Standard artifacts。

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
  legendLayout: { position: 'right', gap: 16, itemGap: 8, align: 'start' },
};
```

## 兼容性与影响

- `@retikz/table` 增加兼容的 Standard 运行依赖
- `TableSpec` additive 增加 `legendLayout`
- generic artifact consumer 从依赖旧根 artifact 迁移到 `resolveTableManifest()`
- 无 descriptor 不增加空 wrapper；composition 仍以 identity 形式显式存在
- capability gate 与 generic artifact envelope 变化需要 changelog 与双语 migration

## 功能与包边界

- Table 拥有 descriptor、label semantics、right/bottom intent、Table body layout 与领域 lineage
- Standard 拥有 Legend visual structure、Legend internal layout、外围 Box Layout、lowering 与 typed artifacts
- Core 拥有 composite execution、measurement、replay 与 artifact tree
- adapters 只贡献 capability 并消费同一 manifest helper

## 测试策略摘要

- mapping contract 证明 swatch/ramp/threshold labels 与 stable ids
- composition contract 证明 right/bottom、多 Legend、gap/alignment、无 descriptor 与 Standard-only layout
- capability contract 证明 direct/transitive/duplicate/conflicting module semantics
- artifact contract 证明 occurrence-safe join、坐标系、干扰 artifacts 与 fail-loud diagnostics
- parity 证明 direct/React/Vanilla/SSR 的 Scene、artifacts、manifest 与 lineage 等价

详细 tree、join path、私有 resolved forms、case、路径、命令和正式证据位于对应 ignored mirror plan 的 `PLAN.md` 与 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Table Visual Encoding/Traceability 与 Standard Drawing Presentation/Box Layout
- **问题归属**：Table 解析领域 descriptor/placement/lineage，Standard 负责通用 Legend 与外围布局
- **内部闭环**：descriptor → Standard Legend input → Standard composition → Core Scene/artifacts → Table manifest
- **外部扩展**：custom Table scale 产生同一 descriptor；其它领域复用同一 Standard Legend/Flex definitions
- **结论**：组合 Standard 与 Core，Table 不新增通用布局或 renderer 能力

## 被否决方案

- Table-local Legend：复制 Standard 的跨领域组件与 artifact
- Table-local dock/Flex solver：复制通用 Box Layout 和 measurement/replay
- adapter 各自 join artifacts：跨入口会产生不同 occurrence 与错误语义
- 从 Cell 内 Plot 自动收集 Legend：越过通用 `IRChild` 边界并建立 Plot 特判

## 不在本 ADR 范围

- Standard Legend/Flex/Grid/Overlay 的 schema、solver、style、artifact 或 adapter 定义
- title、description、caption、source 的新 Table authoring 字段
- left/top/overlay/floating Legend 与全局 decoration collision
- Legend filter/selection interaction
- 跨 Plot Cell guide 协调
- locale/timezone/custom Legend label formatter
