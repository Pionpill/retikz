# ADR-04：条件视觉 encoding、color scale 与 Legend descriptor

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 selector/rule](./03-cell-selector-and-rule-cascade.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景

Rule 可以给选中的 Cell 写固定 appearance，但不能把一组 raw values 映射到连续色带、分类颜色或阈值色档。把 scale 逻辑写进 presentation provider 会把同一个数据映射与 text/badge 等内容形态绑定；把它借用 Plot scale 又会让 Table 依赖 Plot 领域 IR。

Table 条件视觉编码需要同时产出实际 Cell appearance 与可选 Legend descriptor。两者若分别训练 domain、挑选颜色或计算阈值标签，会产生实绘与 Legend 漂移。任意 evaluator 也无法通过有限抽样证明与连续色带或全部阈值色档一致。因此 scale 必须单次 resolution：可生成 Legend 的 resolution 以声明式 mapping 作为唯一真源，仅用于实绘的任意 evaluator 必须显式标记为 opaque。

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

### Visual scale Definition 与 resolution 双模式

```ts
type CellVisualScaleResolveContext = Readonly<{
  categoricalColors: ReadonlyArray<string>;
  sequentialColors: readonly [string, string];
}>;

const CellVisualScaleMappingKind = {
  Ordinal: 'ordinal',
  Threshold: 'threshold',
  Continuous: 'continuous',
} as const;

type CellVisualScaleMapping =
  | Readonly<{
      kind: typeof CellVisualScaleMappingKind.Ordinal;
      entries: ReadonlyArray<
        Readonly<{
          value: IRDataScalarValue;
          color: string;
        }>
      >;
    }>
  | Readonly<{
      kind: typeof CellVisualScaleMappingKind.Threshold;
      edges: ReadonlyArray<number>;
      colors: ReadonlyArray<string>;
    }>
  | Readonly<{
      kind: typeof CellVisualScaleMappingKind.Continuous;
      domain: readonly [number, number];
      stops: ReadonlyArray<
        Readonly<{
          offset: number;
          color: string;
        }>
      >;
    }>;

const CellVisualScaleResolutionKind = {
  Declarative: 'declarative',
  Opaque: 'opaque',
} as const;

type DeclarativeCellVisualScaleResolution = Readonly<{
  kind: typeof CellVisualScaleResolutionKind.Declarative;
  mapping: CellVisualScaleMapping;
  of: (value: IRDataScalarValue) => string | undefined;
}>;

type OpaqueCellVisualScaleResolution = Readonly<{
  kind: typeof CellVisualScaleResolutionKind.Opaque;
  of: (value: IRDataScalarValue) => string | undefined;
}>;

type CellVisualScaleResolution =
  | DeclarativeCellVisualScaleResolution
  | OpaqueCellVisualScaleResolution;

declare const createCellVisualScaleResolution: (
  mapping: CellVisualScaleMapping,
) => DeclarativeCellVisualScaleResolution;

declare const createOpaqueCellVisualScaleResolution: (
  of: (value: IRDataScalarValue) => string | undefined;
) => OpaqueCellVisualScaleResolution;

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

`values` 是 selector 命中的 non-null raw scalar，按 canonical Cell 顺序保留重复项；definition 不得回读 semantic model。每个 encoding 只调用一次 `resolve()`，随后按 canonical Cell 顺序对每个 non-null 候选调用一次返回 resolution 的 `of()`；不得重建 resolution 或改变 Cell 求值顺序。

`undefined` 不是第三种 resolution，只表示当次 selector 没有 non-null value，因此无法建立自动 domain。`values` 非空时 definition 返回 `undefined` 必须 fail-loud；若 encoding 已 opt-in Legend，诊断必须同时包含 encoding id 与 scale name。这使 absent resolution 不能成为绕过 declarative / opaque 选择的第三条路径。

`createCellVisualScaleResolution()` 是声明式 resolution 的公共构造边界。它验证、detached clone 并 freeze mapping，再从该 mapping 生成唯一 evaluator；definition 不能向声明式 resolution 另行注入 `of()`。因此 Cell 实绘与 Legend descriptor 都只能从同一 mapping 派生。`createOpaqueCellVisualScaleResolution()` 接受任意纯 evaluator，但不附带可序列化 mapping，只能驱动 Cell 实绘。两个公共 factory 是 custom Definition 构造 resolution 的唯一支持路径。

`defineCellVisualScale()`、`AnyCellVisualScaleDefinition`、`resolveCellVisualScaleRegistry()` 与 lookup 沿用统一 Definition / registry 模式。内置先注册，custom 不能覆盖或重复。

resolution 是 runtime contract，不进入 IR。Table 在使用前后执行以下 guard：

- options 必须是 JSON object，definition options schema 的产物仍需 JSON-safe
- resolution 必须由两个公共 factory 之一签发；custom Definition 直接返回结构相似的 raw object 必须携带 scale name fail-loud
- declarative mapping 必须 JSON-safe、detached 且 frozen；所有颜色均通过 Core CSS color schema
- ordinal `entries` 非空，value 不含 null 且按类型保真的 canonical scalar identity 唯一，其中 `-0` 与 `0` 视为同一数值
- threshold `edges` 为严格递增的有限数值，`colors.length === edges.length + 1`，因此空 edges 是单一色档的合法 mapping
- continuous `domain` 精确为两个有限 number 且前端点不大于后端点；`stops` 至少两项，offset 为 `[0, 1]` 内严格递增有限数值，首尾必须精确为 `0` / `1`
- `of()` 每次输出为 CSS color 或 `undefined`；declarative evaluator 的确定性由 frozen mapping 与共享求值语义保证，opaque evaluator 的纯度与确定性是 Definition 作者契约，Table 不声称可在有限调用中证明该性质
- opaque resolution 不得携带 mapping；它遇到 opt-in `legend` 时必须 fail-loud，诊断同时包含 encoding id 与 scale name
- descriptor 只 detached clone declarative mapping，不再次调用 definition、不抽样 evaluator 也不重训 domain

声明式 evaluator 由 mapping kind 完整决定：ordinal 按 canonical scalar identity lookup；threshold 在 `edges` 为空时对任意有限 number 返回 `colors[0]`，否则首档命中小于首个 edge 的值，中间档命中大于等于左 edge 且小于右 edge 的值，末档命中大于等于最后一个 edge 的值；continuous 先把有限 number clamp 到 domain，归一化为 offset，再使用 Core 拥有的 canonical linear-gradient stop 求值语义对相邻 stops 插值。threshold / continuous 遇到 non-number 或非有限 number 值 fail-loud；ordinal 的 domain 外值返回 `undefined`。domain 两端相等时，factory 先对 authored stops 在 offset `0.5` 求值一次，再把所有 stop color 规范为该中点色；evaluator 对所有有限 number 也只返回该颜色。

### Continuous paint hard gate

continuous mapping 进入实现前，独立 Core ADR 必须冻结 renderer-agnostic 的 linear-gradient stop 求值契约，覆盖 CSS color 解析、sRGB 与 alpha 插值、边界 offset 及 multi-stop 分段。该契约必须同时作为 Table declarative evaluator 与 SVG / Canvas linear-gradient renderer 的语义真源；Table 不保留独立 `d3-scale` 颜色插值语义。Core 契约未就绪时，continuous resolution 不得以“只共享 stops 形状”声称 Cell 与 Legend 同源，Table 的 continuous 能力保持实现 gate。Standard Legend 仍只消费普通 Core gradient child，不新增 scale 或插值字段。

### 内置 color scales

提供三个内置 Definition：

1. `ordinal-color`
   - options：`domain?: Array<IRDataScalarValue>`、`range?: Array<string>`
   - explicit domain 必须是非空、non-null、按 JSON scalar 严格相等去重的数组
   - domain 省略时按 selected non-null values 首次出现顺序去重
   - range 省略时使用 resolved theme `categoricalColors`
   - range 数量少于 domain 时 fail-loud，不循环复用；多余颜色不进入 resolution / descriptor；domain 外值返回 `undefined`
   - 生成 ordinal mapping，entries 按 domain 顺序保存 value / color

2. `sequential-color`
   - options：`domain?: [number, number]`、`range?: [string, string]`
   - explicit domain 必须满足前端点小于等于后端点
   - domain 省略时取 selected finite numbers extent；非 null 非 number 值 fail-loud
   - range 省略时使用 resolved theme `sequentialColors`
   - 生成 continuous mapping，authored range 映射为 offset `0` / `1` 的 stops；domain 两端相等时按公共 factory 规范为同一中点颜色
   - 使用 Core canonical gradient-stop 求值契约，输出规范 CSS color string；越界 clamp 到端点

3. `threshold-color`
   - options：`thresholds: Array<number>`、`range?: Array<string>`
   - thresholds 必须严格递增；range 长度必须为 `thresholds.length + 1`
   - range 省略时从 theme categorical palette 取所需数量，不足 fail-loud
   - non-null non-number 值 fail-loud
   - 生成 threshold mapping，edges 精确等于 thresholds，colors 按色档顺序保存

空 selected set 的处理：

- 显式 domain 的 ordinal / sequential 仍可产生 declarative resolution 与 descriptor
- 仅当传入 definition 的 `values` 为空时，自动 domain 才可返回 `undefined`；此时不调用 `of()`、不产生 appearance patch 或 Legend descriptor，也不抛错
- threshold edges 由 thresholds 明确，仍可产生 descriptor

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
  mapping: CellVisualScaleMapping;
}>;
```

descriptor 不是 Standard Legend schema，也不包含 Standard layout/style。它只能由 opt-in Legend 的 declarative resolution 产生，`mapping` 是 resolution mapping 的 detached frozen clone；`items | ramp` 形态由 mapping kind 派生，不再作为独立字段。ADR-06 负责把它解析为当时已冻结的 Standard Legend input，并保留 Table lineage。Legend 省略或 `false` 时不产生 descriptor；Table 不自动添加 Legend。opaque resolution 仅在 Legend 未 opt-in 时合法，不存在“无 descriptor 但继续声称 Legend 成功”的静默降级。

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

## 被否决方案

- **任意 `of()` 外加 `legendForm/domain/range/edges` 与抽样 guard**：有限抽样不能证明 threshold 的所有色档或 continuous 的内部区间与 Legend 一致，而且平铺字段能表达相互矛盾的状态
- **所有 custom scale 强制声明式**：能完全排除漂移，但会不必要地禁止只用于 Cell 实绘的任意纯 evaluator；opaque 分支在不伪造 Legend 的前提下保留这一扩展性
- **Cell evaluator 与 Legend descriptor 由两个 callback 分别生成**：即使两者同属一个 Definition，仍会保留两个可独立漂移的映射真源

## 测试设计

长期测试策略：

- schema / registry 覆盖唯一 id、channels、scale refs、options 与 custom definitions
- 三种内置 scale 覆盖 auto / explicit domain、null、invalid type、range / threshold 边界与 equal continuous domain
- declarative mapping 同时决定 evaluator 与 descriptor，ordinal / threshold / continuous 不存在可独立注入的第二映射
- non-empty resolution absence fail-loud；empty threshold 对所有有限 number 映射到唯一色档
- opaque custom evaluator 可实绘，但 opt-in Legend 必须携带 encoding id 与 scale name fail-loud
- continuous 中间 stop、半透明颜色、equal domain 与 SVG / Canvas 采样使用同一 Core gradient-stop 语义
- encoding order 与 rule precedence 确定
- empty Table、manual/detail/custom、React/Vanilla 与 JSON round-trip 保持一致

## 影响

- `TableSpecSchema` 增加 `encodings`
- TableSpec 增加跨字段 refinement：存在 opt-in Legend 时 root `id` 必填
- 新增 visual scale Definition / registry、declarative / opaque resolution factories 与 `LowerTablesOptions.visualScaleDefinitions`
- continuous mapping 依赖 Core canonical gradient-stop 求值契约；Table 不依赖 Plot 或建立独立颜色插值真源
- resolved Cell plan 增加 encoding ids / appearance patches
- pipeline 输出 Table Legend descriptors，最终 Standard 消费与 manifest 由 ADR-06 完成

## 能力完备性检查

- **所属能力域与能力面**：Tabular Visualization Complete / Presentation、Visual Encoding、Traceability
- **解决的问题**：把 Cell raw values 映射为 Table appearance，并让实绘与 Legend descriptor 同源
- **主责包与协作包**：Table 拥有 selector/channel/scale/descriptor；Core 提供 color/style；Standard 后续呈现 Legend
- **是否可由现有能力组合**：rule 可写固定 style，但不能训练/求值 scale，需要扩展 Table
- **是否需要下沉**：不依赖 Plot；颜色 schema 与 continuous gradient-stop 求值语义下沉 Core，通用 Legend 呈现交给 Standard
- **内部表达链路**：encoding → scale registry → single declarative / opaque resolution → appearance patches；仅 declarative mapping → descriptor
- **外部扩展链路**：builtin/custom scale 同一 registry，custom 通过公共 factory 在可生成 Legend 的 mapping 与仅实绘的 opaque evaluator 之间显式选择
- **下游执行 / adapter 等价性**：adapters 只 author encoding 与 definitions；renderer 只看到 Core colors
- **不支持边界与诊断**：不支持 content value extraction、Plot scale ref 或自动 Legend；非法 mapping / type 与 opaque Legend opt-in fail-loud
- **本轮结论**：扩展 Table Visual Encoding，组合 Core color 与 Standard Legend，不建立 Plot 依赖

## 不在本 ADR 范围

- Core canonical gradient-stop 求值契约的公开 API 与双 renderer 实现；由独立 Core ADR 冻结
- size、symbol、opacity、data bar、sparkline 与任意内容结构 encoding
- 跨 Cell Plot scale / axis / guide 协调
- formatter-based Legend labels、Legend placement / layout / style
- interaction state encoding
- 自定义 channel registry
