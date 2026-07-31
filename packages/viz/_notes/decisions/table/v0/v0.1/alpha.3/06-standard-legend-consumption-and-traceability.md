# ADR-06：Standard Legend 消费、停靠布局与追溯

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-04 descriptor](./04-conditional-visual-encoding-and-scale.md) · [Standard alpha.3 roadmap](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/roadmap.md) · [Standard Legend ownership ADR](../../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/01-legend-ownership-and-dependency.md)

## 背景

ADR-04 的 Table Legend descriptor 保存 encoding id、channel、scale resolution 的 domain/range/edges 与 title。它能证明实绘与 Legend 同源，但还不是可绘制内容。通用 title、entries、swatch/ramp、内部布局、Core lowering 与 artifact 已明确归 `@retikz/standard`。

Table 仍需要完成自己的领域链路：把 descriptor 解析为 Standard Legend 输入，把所需 capability 显式贡献给 Core compile，在 Table box 旁停靠一个或多个 Legend，并把 encoding、Cell、Legend occurrence 与 bounds 关联起来。

Standard alpha.3 的最终 schema、module 组合与重复 capability 语义尚在 Proposed 阶段。Table 不能提前复制一份临时 Legend，也不能猜测一个私有 Standard deep import。本 ADR 因此同时冻结 Table 侧可独立确定的行为，并设置实现前 hard gate。

## 决策：descriptor 解析为 Standard public Legend input，由 Table 负责领域停靠与 lineage

### Hard gate

本 ADR 进入实现前，Standard alpha.3 必须已有 Accepted 合同并在当前分支可消费，至少公开：

1. JSON-safe Legend input schema / type，覆盖 swatch 与 ramp
2. Legend composite Definition 与显式 `LegendModule`
3. constrained layout / Core lowering / typed artifact
4. capability bundle 对“领域包传递引入 + 调用方显式引入同一 module”的确定合并或冲突语义
5. direct IR、React、Vanilla 的契约测试

Table 实现只使用 `@retikz/standard` package root public API。若 Standard 最终公开命名不同，Table 直接采用其真源命名，不在 Table 建 alias 或镜像 schema；本 ADR 的行为映射、边界与测试不因此改变。

Gate 未满足时：

- ADR-06 保持 Proposed
- ADR-01～05 可以独立设计 / 实现，但 alpha.3 milestone 不能完成
- 不新增 Table-local legend child、layout helper、renderer 或 placeholder public API

### Table Legend layout

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

`gap` / `itemGap` 为有限非负数。没有 descriptor 时忽略 `legendLayout`，不产生空占位。

alpha.3 只支持 right / bottom，避免为 left / top 引入负原点迁移和额外 placement 语义；作者需要任意外围 composition 时可在 Table 外使用 Standard / Core 容器。

### Descriptor 到 Standard input

新增纯 resolver：

```ts
resolveTableLegendInput(
  descriptor: TableLegendDescriptor,
  tableId: string,
): StandardLegendInput;
```

它必须先构造 plain JSON，再由 Standard public Legend schema / factory 解析。映射语义固定如下：

| Table descriptor            | Standard Legend 语义                                  |
| --------------------------- | ----------------------------------------------------- |
| `encodingId`                | stable Legend id/key 的来源，不作为 Standard 领域字段 |
| `title`                     | Standard title text                                   |
| `form: 'swatch'` + no edges | domain/range 同序的离散 entries                       |
| `form: 'swatch'` + edges    | 每个 range color 对应一个阈值区间 entry               |
| `form: 'ramp'`              | domain endpoints + range colors 的连续 ramp           |
| `range` color               | swatch fill / ramp stops                              |

稳定 Legend id 为 `${tableId}/legend/${encodeURIComponent(encodingId)}`。ADR-04 已要求存在 opt-in Legend 时 TableSpec 显式提供 root `id`；Table 不从 callback 不可见的 occurrence identity、数组位置、随机数或隐藏全局状态派生 id。

label 规则：

- ordinal entry：`null` 不进入 domain；其余使用确定性 `String(value)`
- sequential endpoints：使用 `d3-format('~g')`
- threshold：`< x`、`a – < b`、`≥ x`，边界数字使用 `~g`

这些 label 只描述 scale descriptor，不复用需要 Cell context 的 Formatter Definition。自定义 Legend label formatter、locale 与 timezone 延后；作者可在未来扩展 encoding legend config，但不能把 callback 写入 IR。

Standard input 不包含 Table field、selector、rule、formatter ref、source、Cell ids、theme definition 或 interaction state。

### Capability loading

`@retikz/table` 声明兼容的 `@retikz/standard` 运行依赖。只要当前 Table 有至少一个 Legend input，Table compile / runtime contribution 显式组合 `LegendModule`：

- direct `compileTable()` 把 Legend module 的 Core definitions 合入 compile options
- React / Vanilla 的 Table runtime contribution 经共同 `makeTableRuntimeComposites()` 贡献同一 definitions
- 纯 `lowerTables()` 不依赖全局注册；调用方必须消费返回的 Table runtime bundle / contribution contract

调用方同时显式提供同一 `LegendModule` 时，严格采用 Standard Accepted capability-loading 语义；Table 不按 namespace/name 私自去重，也不吞掉真实不同 definition 冲突。

### 停靠布局

每个 Standard Legend 作为不透明 `IRChild` 进入 Table 已有 layout-aware composite：

1. Table 完成 Cell 内容、track、border 与 background 的布局
2. 对 Standard Legend children 执行 natural probe
3. 按 descriptor / encoding 声明顺序组成 Legend stack
4. right：Legend stack 放在 Table box 右侧，沿 y 轴排列
5. bottom：Legend stack 放在 Table box 下方，沿 x 轴排列
6. `align` 沿与 stack 垂直的 cross axis 对齐
7. 最终 Table composite allocation / visual bounds 是 Table 与 Legend contributions 的 union

Table 不读取 Legend 内部 item bounds，不重新 layout entries，也不复制 Standard wrap / overflow。Table 只消费 child allocation / visual bounds 并 replay；nested Standard artifact 由 Core artifact tree 保留。

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
  allocationBounds: BoundsRect;
  visualBounds: BoundsRect;
};
```

每个 manifest Cell 增加：

- `formatterName?`
- `presentationName?`
- `matchedRuleIndices`
- `encodingIds`
- resolved `appearance`

Table manifest 只保留领域 lineage 与 Legend occurrence/bounds，不复制 Standard Legend item artifact。调用方通过 Core typed artifact tree 和 `legendId` 取得 Standard artifact；两者必须来自同一次 compile / replay。

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

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-06.md`。长期摘要：

- descriptor 到 Standard swatch/ramp input 的 JSON/schema 映射
- Standard Legend module 直接、传递、重复消费与冲突诊断
- right/bottom、多 Legend、empty descriptor、alignment 与 overall bounds
- Table manifest / Standard nested artifact / Scene 同次 compile lineage
- Table 不含 Standard 内部 layout、item schema 或 renderer 分支

## 影响

- `@retikz/table` 新增 `@retikz/standard` 兼容依赖
- `TableSpecSchema` 增加 `legendLayout`
- Table compile/runtime contribution 显式贡献 Standard Legend module
- layout transaction 增加 opaque Legend child probe / stack / replay
- manifest 扩展 presentation、rules、encodings 与 legends lineage
- alpha.3 release 受 Standard alpha.3 可消费版本 gating，但 release group 不 lockstep

## 能力完备性检查

- **所属能力域与能力面**：Table 的 Visual Encoding / Traceability；Standard 的通用 Drawing Presentation
- **解决的问题**：把 Table scale descriptor 呈现为可布局 Legend，并保持 Cell → encoding → Legend → Core artifact 追溯
- **主责包与协作包**：Table 主责 descriptor、label semantics、停靠与 lineage；Standard 主责 Legend schema/内部 layout/lowering/artifact；Core 主责 probe/replay
- **是否可由现有能力组合**：ADR-04 descriptor + Standard Legend + Core layout-aware composite 可组合，不新增 Table renderer
- **是否需要下沉**：Standard gate 必须先完成；Table 不下沉或复制通用 Legend
- **内部表达链路**：descriptor → Standard public input → LegendModule → probe/stack/replay → Core IR + dual artifacts
- **外部扩展链路**：custom Table visual scale 仍产生同一 descriptor；Standard direct/Plot/Table 走同一 Legend definition
- **下游执行 / adapter 等价性**：React/Vanilla 共用 Table contribution；renderer 不认识 Table/Legend 私有类型
- **不支持边界与诊断**：不含 interaction、left/top、custom labels、Plot Cell guide coordination；missing Standard capability fail-loud
- **本轮结论**：组合 Standard + Core；Table 只扩展领域解析、停靠与追溯

## 不在本 ADR 范围

- Standard Legend schema、内部布局、style 或 artifact 的定义
- left/top/overlay/floating Legend 与全局 decoration collision
- Legend filter / selection interaction
- 跨 Plot Cell guide 协调或从 Cell 内 Plot 自动收集 Legend
- locale / timezone / custom label formatter

---

## 实现契约

### Level

`red`：修改 Table public schema、package dependency、layout-aware compile、runtime capability loading 与 manifest。

### Schema 改动

| 文件                          | 操作 | 字段名                           | 类型                          | 默认值            | describe 中文摘要          |
| ----------------------------- | ---- | -------------------------------- | ----------------------------- | ----------------- | -------------------------- |
| `schemas/legend/schema.ts`    | 新增 | `position`                       | right/bottom?                 | right             | Legend dock side           |
| 同上                          | 新增 | `gap`                            | nonnegative number?           | 16                | Table 与 Legend stack gap  |
| 同上                          | 新增 | `itemGap`                        | nonnegative number?           | 8                 | Legend 间距                |
| 同上                          | 新增 | `align`                          | start/center/end?             | start             | cross-axis alignment       |
| `schemas/table/schema.ts`     | 新增 | `legendLayout`                   | legend layout?                | resolved defaults | optional dock config       |
| `contract/manifest/schema.ts` | 新增 | encodings / legends / Cell trace | exact JSON-safe arrays/fields | empty arrays      | Table presentation lineage |

Standard Legend schema 不在 Table 中重建。

### 文件 scope

- `packages/viz/table/package.json`
- `packages/viz/table/src/schemas/{legend,table}/**`
- `packages/viz/table/src/contract/{legend,manifest,model}/**`
- `packages/viz/table/src/pipeline/{legend,layout,lower,manifest,contribution,compile}.ts`
- `packages/viz/table/src/{schemas,contract,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,legend,layout,lower,manifest,pipeline,public-api}/**`
- adapters 的 runtime contribution / artifact parity tests
- `pnpm-lock.yaml`
- alpha.3 对应 docs 文件（ADR-07）
- Standard 产品文件不在本 ADR scope；所需 Standard 能力由其自己的 ADR 实现

### 测试象限

**Happy path**

- ordinal / threshold descriptor 映射 Standard swatch，sequential 映射 ramp
- 单 Legend right、单 Legend bottom、多 Legend stack 布局
- Table manifest 与 Standard artifact 同时可查询

**边界**

- no descriptor、empty auto-domain、single/equal domain、zero gap/itemGap
- long title/labels 的 Standard constrained bounds 被 Table 当作 opaque child
- Table 或 Legend zero-area visual/allocation bounds union

**错误路径**

- Standard gate / module 缺失、Standard input schema 拒绝、duplicate capability 冲突 fail-loud
- duplicate/unstable encoding id 不能产生相同 legendId
- opt-in Legend 缺少 Table root id 时在 TableSpec schema 阶段拒绝
- nested artifact 或 replay identity 与 manifest legendId 不一致作为合同错误

**交互**

- explicit Standard bundle + Table transitive LegendModule 采用 Standard Accepted 重复语义
- theme palette → encoding resolution → descriptor → Standard Legend 全链同源
- React/Vanilla/direct compile 对 Scene、Table manifest 与 Standard artifact 等价
- Cell content 内含其它 Tier 2 composite 时，不被当作 Table Legend source

### 依赖的现有元素

- ADR-04 `TableLegendDescriptor`
- Core layout-aware probe / replay 与 typed artifact tree
- Table layout / manifest / runtime contribution
- Standard alpha.3 Accepted Legend input、Definition、module、layout 与 artifact public API（hard gate）
