# ADR-04：条件视觉 encoding、color scale 与 Legend descriptor

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 selector/rule](./03-cell-selector-and-rule-cascade.md) · [ADR-05 style tokens](./05-style-preset-and-token-resolution.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景与目标

Rule 可以给选中的 Cell 写固定 appearance，却不能把一组 raw values 映射成连续色带、分类颜色或阈值色档。把 scale 放进 Presentation 会把数据映射与内容形态绑定；复用 Plot scale 又会让 Table 依赖另一个领域包。

Table 条件视觉编码需要在一次 scale resolution 中同时得到 Cell evaluator 与可选 Legend descriptor 数据。Table 负责守卫 resolution 的结构、JSON、颜色和确定性；custom Definition 作者负责保证 `of()` 与 `legendForm` / `domain` / `range` / `edges` 表达同一映射。

alpha.3 只覆盖稳定落在 Cell appearance 的背景色与内容主色，不把会改变内容结构的尺寸、图标或 data bar 伪装成颜色 channel。

## 决策

### Encoding 与 scale ref

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
  legend?: false | { title?: string };
};

type IRTableVisualScaleRef = {
  name: string;
  options?: IRJsonObject;
};

type IRTableSpec = {
  encodings?: Array<IRTableCellVisualEncoding>;
};
```

同一 Table 内 encoding id 唯一并保留声明顺序。`encodings` 省略等价空数组，但 authoring IR 不物化默认。任一 encoding opt in Legend descriptor 时，Table root `id` 必须为非空稳定 id。

selector 与 scale 都读取 canonical raw scalar。content Cell 与 null 不进入 scale domain，也不调用 evaluator；formatter 输出不会反向改变 domain。

encoding 按声明顺序写自己拥有的单个 channel，后者覆盖前者；root rules 在 encodings 之后应用，所以显式 rule 可以覆盖 computed color。

### Visual Scale Definition 与 resolution

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

`values` 是 selector 命中的 non-null raw scalar，按 canonical Cell 顺序保留重复项。每个 encoding 只调用一次 `resolve()`，随后按 canonical Cell 顺序对每个候选调用同一个 resolution 的 `of()`。返回 `undefined` 表示当次不产生颜色 patch 或 Legend descriptor。

内置与 custom definition 经同一 `defineCellVisualScale()`、registry、options guard、resolution guard 和 evaluator guard。空名称、重复名称或覆盖内置项均 fail-loud。

Table 对 resolution 执行以下公共守卫：

- options 经 Definition schema 解析后仍须为 JSON-safe object，并以 detached frozen copy 传给 Definition
- `domain` 只包含 JSON scalar；`range` 非空且只包含有效 Core CSS color；可选 `edges` 严格递增
- `ramp` 的 domain / range 都精确为两个端点且没有 edges
- 无 edges 的 `swatch` 要求 domain / range 等长；有 edges 时要求 `range.length === edges.length + 1`，且 domain 与 edges 同序同值
- `of()` 只返回有效 Core CSS color 或 `undefined`；同一 scalar 在一次 resolution 中重复求值必须得到相同结果
- domain / range / edges 被复制并冻结；descriptor 从同一 resolution 复制数据，不再次调用 Definition 或重新训练 domain

结构与确定性守卫不能证明任意 evaluator 与 descriptor 的所有值都一致。custom Definition 若分别编写 `of()` 与 descriptor 数据，必须自行维护它们的语义一致性；Table 不抽样 evaluator，也不引入另一套 mapping 或签发 identity。

### 内置 color scales

- `ordinal-color`：显式 domain 必须 non-empty、non-null 且唯一；省略时按首次出现顺序从候选值推导。range 省略时使用 `data.categorical` style token，不足 fail-loud、不循环，多余颜色不进入 resolution；域外值返回 `undefined`
- `sequential-color`：显式 domain 是 `[min, max]` 且 `min <= max`；省略时取 number extent。range 省略时使用 `data.sequential` style token；使用 `d3-scale` 的线性颜色插值并 clamp 到端点，等值 domain 得到稳定中点色
- `threshold-color`：`thresholds` 严格递增，range 长度为 `thresholds.length + 1`；省略 range 时从 `data.categorical` style token 取得足够颜色。resolution 的 domain 与 edges 都等于 thresholds

sequential / threshold 的任一 selected non-null scalar 不是 number 时 fail-loud。空选择下，显式 ordinal / sequential domain 与 threshold 仍可形成 resolution；只有需要自动推导 domain 且没有候选值时返回 `undefined`。

### Appearance 写入与 descriptor

- `backgroundFill` 只写 `appearance.background.fill`，保留既有 opacity
- `contentColor` 只写 `appearance.content.color`，作为 Core Scope master color

当 `legend` 是 object 且 resolution 存在时，产生 public JSON-safe descriptor：

```ts
type TableLegendDescriptor = DeepReadonly<{
  encodingId: string;
  channel: TableVisualChannelValue;
  scaleName: string;
  title?: string;
  form: 'ramp' | 'swatch';
  domain: Array<IRDataScalarValue>;
  range: Array<string>;
  edges?: Array<number>;
}>;
```

descriptor 是 Table 向通用 Legend 层交接的领域 seed，不是 Standard Legend schema，也不包含 Standard layout/style、selector、formatter 或 Cell ids。Legend 省略或为 false 时不产生 descriptor；Table 不自动绘制 Legend。

### DSL 表面

```ts
const encodings = [
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
];
```

## 功能与包边界

- Table 拥有 selector、channel、scale Definition / resolution、appearance patch 与 descriptor seed
- Core 提供 JSON、CSS color、style 与通用绘图边界
- Standard 拥有通用 Legend 的视觉结构、布局、lowering 与 artifact
- Plot 不被 Table 依赖；adapters 只 author encoding 与传递 definitions

## 影响

- `TableSpec` 增加 `encodings` 与 opt-in Legend descriptor 的 root-id refinement
- runtime options 增加 visual scale definitions
- resolved Cell plan 与 manifest 增加 encoding lineage，manifest 保存同次 resolution 产生的 descriptor seed
- `@retikz/table` 使用 `d3-scale` 完成内置 sequential / threshold 求值，不依赖 Plot

## 测试策略摘要

- schema / registry 证明唯一 id、闭合 channel、scale ref、strict descriptor 与 custom extension
- provider contract 证明三种内置 scale 的 auto / explicit domain、null、类型、range、threshold 与 equal-domain 边界
- pipeline 证明单次 resolution、order、rule precedence、appearance 与 descriptor 来源一致
- parity 证明 manual / detail / custom、direct / React / Vanilla / SSR 和 JSON round-trip 一致

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Presentation、Visual Encoding、Traceability
- **问题归属**：Cell 数据到 Table appearance 的映射属于 Table；通用 Legend 呈现属于 Standard
- **内部闭环**：encoding → scale registry → single resolution → appearance + descriptor seed
- **外部扩展**：builtin / custom scale 经过同一 registry；custom Definition 对 evaluator 与 descriptor 的语义一致性负责
- **结论**：扩展 Table Visual Encoding，组合 Core color 与 Standard Legend，不建立 Plot 依赖

## 被否决方案

- 复用 Plot scale：造成 Table → Plot 领域依赖
- Cell evaluator 与 descriptor 由两个 callback 分别生成：产生两个 resolution 生命周期
- 由 Table 抽样任意 evaluator 推断 Legend：有限抽样不能证明完整映射
- 自动生成 Legend：缺少作者 opt-in 与稳定 identity
- 自定义 channel registry：alpha.3 只有两个真实 appearance consumer

## 不在本 ADR 范围

- size、symbol、opacity、data bar、sparkline 与内容结构 encoding
- 跨 Cell Plot scale / axis / guide 协调
- formatter-based Legend labels、Legend placement / layout / style
- interaction state encoding
- 自定义 channel registry
