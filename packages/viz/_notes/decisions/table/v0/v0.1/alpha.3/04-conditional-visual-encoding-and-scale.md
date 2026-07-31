# ADR-04：条件视觉 encoding、color scale 与 Legend descriptor

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 selector/rule](./03-cell-selector-and-rule-cascade.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景

Rule 可以给选中的 Cell 写固定 appearance，但不能把一组 raw values 映射到连续色带、分类颜色或阈值色档。把 scale 逻辑写进 presentation provider 会把同一个数据映射与 text/badge 等内容形态绑定；把它借用 Plot scale 又会让 Table 依赖 Plot 领域 IR。

Table 条件视觉编码需要同时产出实际 Cell appearance 与可选 Legend descriptor。两者若分别训练 domain、挑选 range 或计算阈值标签，会产生实绘与 Legend 漂移。因此 scale 必须单次 resolution，公开同源 evaluator 与 descriptor 数据。

alpha.3 先覆盖最常见且可稳定落在 Cell appearance 的颜色编码：Cell 背景与内容主色。尺寸、图标、data bar 等会改变或新增内容结构，不应伪装成颜色 channel。

## 决策：Table root 声明 ordered visual encodings，scale Definition 单次解析实绘与 descriptor

### Encoding schema

```ts
const TableVisualChannel = {
  BackgroundFill: 'backgroundFill',
  ContentColor: 'contentColor',
} as const;

type IRTableCellVisualEncoding = {
  id: string;
  selector: IRTableCellSelector;
  channel: TableVisualChannelValue;
  scale: IRTableVisualScaleRef;
  legend?:
    | false
    | {
        title?: string;
      };
};

type IRTableVisualScaleRef = {
  name: string;
  options?: IRJsonObject;
};
```

Table root 增加 `encodings?: Array<IRTableCellVisualEncoding>`，省略等价空数组；同一 Table 内 `id` 必须唯一。

任一 encoding 将 `legend` 设为 object 时，TableSpec 必须显式提供非空 root `id`。layout-aware composite callback 当前不暴露 occurrence identity，Table 不用数组位置、随机值或隐藏全局状态伪造稳定 Legend identity。

Encoding 先把 selector 结果收窄为 value Cell，selector 与 scale 均读取 raw scalar。content Cell 永不进入 scale；formatter 输出不会反向改变 domain。null 在所有 visual scale 中都属于缺失值：不传给 definition 的 `values`，也不调用 resolution `of()`，不写 appearance channel。

encoding 按声明顺序解析并写入 appearance；多个 encoding 命中同一 Cell / channel 时后者覆盖前者。ADR-03 的 root rule appearance 在 encoding 之后应用，因此显式 rule 可以覆盖 computed color。

### Visual scale Definition

```ts
type CellVisualScaleResolveContext = Readonly<{
  categoricalColors: ReadonlyArray<string>;
  sequentialColors: readonly [string, string];
}>;

type CellVisualScaleResolution = Readonly<{
  of: (value: IRDataScalarValue) => string | undefined;
  legendForm: 'ramp' | 'swatch';
  domain: ReadonlyArray<IRDataScalarValue>;
  range: ReadonlyArray<string>;
  edges?: ReadonlyArray<number>;
}>;

type CellVisualScaleDefinition<TOptions extends IRJsonObject = IRJsonObject> = {
  name: string;
  optionsSchema: ZodType<TOptions>;
  resolve: (
    options: TOptions,
    values: ReadonlyArray<IRDataScalarValue>,
    context: CellVisualScaleResolveContext,
  ) => CellVisualScaleResolution | undefined;
};
```

`values` 是 selector 命中的 non-null raw scalar，按 canonical Cell 顺序保留重复项；definition 不得回读 semantic model。每个 encoding 只调用一次 `resolve()`，随后按 canonical Cell 顺序对每个 non-null 候选调用一次同一个 `of()`。

`defineCellVisualScale()`、`AnyCellVisualScaleDefinition`、`resolveCellVisualScaleRegistry()` 与 lookup 沿用统一 Definition / registry 模式。内置先注册，custom 不能覆盖或重复。

resolution 是 runtime contract，不进入 IR。Table 在使用前后执行以下 guard：

- options 必须是 JSON object，definition options schema 的产物仍需 JSON-safe
- domain / range / edges detached、frozen，domain 只含 scalar，range 只含 Core CSS color
- range 非空；edges（若存在）为严格递增有限数值
- `ramp` 必须满足 domain / range 均精确为两个端点且无 edges
- 无 edges 的 `swatch` 必须满足 domain / range 等长；有 edges 的 `swatch` 必须满足 `range.length === edges.length + 1` 且 domain 与 edges 数值同序同值
- `of()` 每次输出为 CSS color 或 `undefined`，相同输入重复调用必须等值
- descriptor 数据与 `of()` 来自同一个 resolution，不再次调用 definition 或重训 domain

### 内置 color scales

提供三个内置 Definition：

1. `ordinal-color`
   - options：`domain?: Array<IRDataScalarValue>`、`range?: Array<string>`
   - explicit domain 必须是非空、non-null、按 JSON scalar 严格相等去重的数组
   - domain 省略时按 selected non-null values 首次出现顺序去重
   - range 省略时使用 resolved theme `categoricalColors`
   - range 数量少于 domain 时 fail-loud，不循环复用；多余颜色不进入 resolution / descriptor；domain 外值返回 `undefined`
   - Legend form 为 `swatch`

2. `sequential-color`
   - options：`domain?: [number, number]`、`range?: [string, string]`
   - explicit domain 必须满足前端点小于等于后端点
   - domain 省略时取 selected finite numbers extent；非 null 非 number 值 fail-loud
   - range 省略时使用 resolved theme `sequentialColors`
   - domain 两端相等时映射到中点颜色；越界 clamp 到端点
   - 使用 `d3-scale` 的稳定颜色插值，输出规范 CSS color string
   - Legend form 为 `ramp`

3. `threshold-color`
   - options：`thresholds: Array<number>`、`range?: Array<string>`
   - thresholds 必须严格递增；range 长度必须为 `thresholds.length + 1`
   - range 省略时从 theme categorical palette 取所需数量，不足 fail-loud
   - non-null non-number 值 fail-loud
   - resolution `domain` 与 `edges` 都精确等于 thresholds，Legend form 为 `swatch`

空 selected set 的处理：

- 显式 domain 的 ordinal / sequential 仍可产生 resolution 与 descriptor
- 自动 domain 没有 non-null value时返回 `undefined` resolution，不调用 `of()`，不产生 appearance patch 或 Legend descriptor，也不抛错
- threshold domain 由 thresholds 明确，仍可产生 descriptor

### Appearance channel 写入

- `backgroundFill` 写入 `appearance.background.fill`，保留既有 background opacity
- `contentColor` 写入 `appearance.content.color`，作为 Core Scope 的 master color default

encoding 只写自己拥有的单个 channel，不覆盖其它 appearance 字段。输出 color 在写入前再次通过对应 Core color schema。

### Table Legend descriptor

当 encoding 的 `legend` 为 object 且 resolution 非空时，产生 JSON-safe descriptor：

```ts
type TableLegendDescriptor = Readonly<{
  encodingId: string;
  channel: TableVisualChannelValue;
  scaleName: string;
  title?: string;
  form: 'ramp' | 'swatch';
  domain: ReadonlyArray<IRDataScalarValue>;
  range: ReadonlyArray<string>;
  edges?: ReadonlyArray<number>;
}>;
```

descriptor 不是 Standard Legend schema，也不包含 Standard layout/style。ADR-06 负责把它解析为当时已冻结的 Standard Legend input，并保留 Table lineage。Legend 省略或 `false` 时不产生 descriptor；Table 不自动添加 Legend。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: detailStructure,
  encodings: [
    {
      id: 'revenue-heat',
      selector: { fields: ['revenue'], locations: ['body'] },
      channel: 'backgroundFill',
      scale: {
        name: 'sequential-color',
        options: { range: ['#eff6ff', '#1d4ed8'] },
      },
      legend: { title: 'Revenue' },
    },
    {
      id: 'status-color',
      selector: { fields: ['status'] },
      channel: 'contentColor',
      scale: {
        name: 'ordinal-color',
        options: {
          domain: ['ok', 'warning', 'error'],
          range: ['#067647', '#b54708', '#b42318'],
        },
      },
    },
  ],
};
```

## 测试设计

详细矩阵见 `notes/plans/table-alpha3-design/TEST_CONTRACT-04.md`。长期摘要：

- schema / registry 覆盖唯一 id、channels、scale refs、options 与 custom definitions
- 三种内置 scale 覆盖 auto / explicit domain、null、invalid type、range / threshold 边界
- appearance 与 descriptor 同源，encoding order 与 rule precedence 确定
- empty Table、manual/detail/custom、React/Vanilla 与 JSON round-trip 保持一致

## 影响

- `TableSpecSchema` 增加 `encodings`
- TableSpec 增加跨字段 refinement：存在 opt-in Legend 时 root `id` 必填
- 新增 visual scale Definition / registry 与 `LowerTablesOptions.visualScaleDefinitions`
- `@retikz/table` 增加 `d3-scale` 及类型依赖；不依赖 Plot
- resolved Cell plan 增加 encoding ids / appearance patches
- pipeline 输出 Table Legend descriptors，最终 Standard 消费与 manifest 由 ADR-06 完成

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Presentation、Visual Encoding、Traceability
- **解决的问题**：把 Cell raw values 映射为 Table appearance，并让实绘与 Legend descriptor 同源
- **主责包与协作包**：Table 拥有 selector/channel/scale/descriptor；Core 提供 color/style；Standard 后续呈现 Legend
- **是否可由现有能力组合**：rule 可写固定 style，但不能训练/求值 scale，需要扩展 Table
- **是否需要下沉**：不依赖 Plot；颜色 schema 复用 Core，通用 Legend 呈现交给 Standard
- **内部表达链路**：encoding → scale registry → single resolution → appearance patches + descriptor
- **外部扩展链路**：builtin/custom scale 同一 registry，options / resolution / evaluator 统一 guard
- **下游执行 / adapter 等价性**：adapters 只 author encoding 与 definitions；renderer 只看到 Core colors
- **不支持边界与诊断**：不支持 content value extraction、函数 scale、Plot scale ref 或自动 Legend；非法 domain/range/type fail-loud
- **本轮结论**：扩展 Table Visual Encoding，组合 Core color 与 Standard Legend，不建立 Plot 依赖

## 不在本 ADR 范围

- size、symbol、opacity、data bar、sparkline 与任意内容结构 encoding
- 跨 Cell Plot scale / axis / guide 协调
- formatter-based Legend labels、Legend placement / layout / style
- interaction state encoding
- 自定义 channel registry

---

## 实现契约

### Level

`red`：新增 TableSpec schema、Definition / registry、pipeline 与 public descriptor。

### Schema 改动

| 文件                         | 操作 | 字段名      | 类型                        | 默认值       | describe 中文摘要        |
| ---------------------------- | ---- | ----------- | --------------------------- | ------------ | ------------------------ |
| `schemas/encoding/schema.ts` | 新增 | `id`        | non-empty string            | —            | Table 内唯一 encoding id |
| 同上                         | 新增 | `selector`  | Cell selector               | —            | value Cell 候选          |
| 同上                         | 新增 | `channel`   | backgroundFill/contentColor | —            | appearance 目标 channel  |
| 同上                         | 新增 | `scale`     | visual scale ref            | —            | registered color scale   |
| 同上                         | 新增 | `legend`    | false / descriptor config?  | none         | 可选 Legend descriptor   |
| `schemas/table/schema.ts`    | 新增 | `encodings` | encoding array?             | `[]` runtime | ordered visual encodings |

### 文件 scope

- `packages/viz/table/package.json`
- `packages/viz/table/src/schemas/{encoding,table}/**`
- `packages/viz/table/src/contract/{encoding,model}/**`
- `packages/viz/table/src/providers/encoding/**`
- `packages/viz/table/src/pipeline/{encoding,presentation,manifest,contribution}/**`
- `packages/viz/table/src/{schemas,contract,providers,pipeline,index}.ts`
- `packages/viz/table/tests/{ir,encoding,presentation,manifest,pipeline,public-api}/**`
- adapter root authoring/runtime definitions 与 parity tests
- `pnpm-lock.yaml`
- alpha.3 对应 docs 文件（ADR-07）

### 测试象限

**Happy path**

- ordinal 首次出现 domain 与 explicit domain 都产生确定颜色 / swatch descriptor
- sequential auto extent 与 explicit domain 产生同源 ramp
- threshold 按 edge 分档并产生同源 swatch descriptor

**边界**

- null、empty selection、single/equal numeric domain、domain endpoint 与 threshold endpoint
- explicit ordinal domain 的 null / duplicate 拒绝、extra range 截断与 sequential reversed domain 拒绝
- theme palette 恰好满足 range、explicit range 覆盖 theme
- 多 encoding 同 Cell / channel 按声明顺序，root rule 最终覆盖

**错误路径**

- duplicate id、unknown scale、bad options、bad resolution / evaluator output fail-loud
- opt-in Legend 但 TableSpec 缺少 root id 时由 schema 拒绝
- ordinal range 不足、threshold 未排序/长度不符、numeric scale 收到非 number fail-loud
- custom resolution domain/range/edges 非 JSON / 非 color / 非 finite 被拒绝

**交互**

- formatter 不改变 scale raw values
- theme palette、encoding、rule appearance 形成规定 precedence
- manual/detail/custom 相同 canonical values 形成同一 resolution
- React / Vanilla 合并 custom scale definitions 并保持 conflict diagnostics

### 依赖的现有元素

- ADR-02 `IRTableCellAppearance`
- ADR-03 `IRTableCellSelector` / resolved Cell plan
- Core CSS color / paint schema
- Table runtime contribution Definition merge
- Standard alpha.3 Legend ownership ADR（仅依赖边界，不依赖未冻结 schema）
