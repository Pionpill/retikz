# ADR-04：条件视觉 encoding、color scale 与 Legend descriptor

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 selector/rule](./03-cell-selector-and-rule-cascade.md) · [ADR-05 style tokens](./05-style-preset-and-token-resolution.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景与目标

Rule 可以写固定 appearance，却不能把一组 raw values 映射成连续色带、分类颜色或阈值色档。把 scale 放进 Presentation 会把数据映射和内容形态绑定；复用 Plot scale 又会让 Table 依赖另一个领域包。

Table 条件视觉编码需要同时产出实际 Cell appearance 与可选 Legend descriptor。两者若分别训练 domain、选择颜色或计算阈值标签，会产生实绘与 Legend 漂移；任意 evaluator 也无法通过有限抽样证明自己与连续色带或全部阈值色档一致。

因此 alpha.3 使用单次 resolution：可生成 Legend 的 resolution 以声明式 mapping 为唯一真源；只用于实绘的任意 evaluator 必须显式标记为 opaque。当前只覆盖稳定落在 Cell appearance 的背景色与内容主色，不把会改变内容结构的尺寸、图标或 data bar 伪装成颜色 channel。

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

同一 Table 内 encoding id 唯一并保留声明顺序。`encodings` 省略等价空数组，但 authoring IR 不物化默认。任一 encoding opt in Legend 时，Table root `id` 必须为非空稳定 id；不得从数组位置、随机值或隐藏全局状态生成 Legend identity。

selector 与 scale 都读取 canonical raw scalar。content Cell 与 null 不进入 scale domain，也不调用 evaluator；formatter 输出不会反向改变 domain。

encoding 按声明顺序写自己拥有的单个 channel，后者覆盖前者；root rules 在 encodings 之后应用，所以显式 rule 可以覆盖 computed color。

### Visual Scale Definition 与 resolution 双模式

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
      kind: 'ordinal';
      entries: ReadonlyArray<Readonly<{ value: IRDataScalarValue; color: string }>>;
    }>
  | Readonly<{
      kind: 'threshold';
      edges: ReadonlyArray<number>;
      colors: ReadonlyArray<string>;
    }>
  | Readonly<{
      kind: 'continuous';
      domain: readonly [number, number];
      stops: ReadonlyArray<Readonly<{ offset: number; color: string }>>;
    }>;

type CellVisualScaleResolution =
  | Readonly<{
      kind: 'declarative';
      mapping: CellVisualScaleMapping;
      of: (value: IRDataScalarValue) => string | undefined;
    }>
  | Readonly<{
      kind: 'opaque';
      of: (value: IRDataScalarValue) => string | undefined;
    }>;

declare const createCellVisualScaleResolution: (
  mapping: CellVisualScaleMapping,
) => Extract<CellVisualScaleResolution, { kind: 'declarative' }>;

declare const createOpaqueCellVisualScaleResolution: (
  of: (value: IRDataScalarValue) => string | undefined,
) => Extract<CellVisualScaleResolution, { kind: 'opaque' }>;

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

`values` 是 selector 命中的 non-null raw scalar，按 canonical Cell 顺序保留重复项；definition 不得回读 semantic model。每个 encoding 只调用一次 `resolve()`，随后按 canonical Cell 顺序对每个 non-null 候选调用一次返回 resolution 的 `of()`；不得重建 resolution 或改变求值顺序。

`undefined` 只表示当次 selector 没有 non-null value，无法建立自动 domain。`values` 非空时 definition 返回 `undefined` 必须 fail-loud；opt-in Legend 时诊断同时包含 encoding id 与 scale name。

`createCellVisualScaleResolution()` 是声明式 resolution 的公共构造边界：它验证、detached clone 并 freeze mapping，再从 mapping 生成唯一 evaluator，调用方不能另行注入 `of()`。`createOpaqueCellVisualScaleResolution()` 接受任意纯 evaluator，但不附带 mapping，只能驱动 Cell 实绘。两个 factory 是 resolution 的唯一签发边界；resolution guard 只接受由其中之一签发的 runtime identity，结构相似的 raw object 必须携带 scale name fail-loud。Custom Definition 必须通过二者之一明确选择能力边界。

内置与 custom definition 经同一 `defineCellVisualScale()`、registry、options guard、resolution guard 和 evaluator guard。空名称、重复名称或覆盖内置项均 fail-loud。

声明式 mapping 满足以下闭合不变量：

- mapping、options 与所有颜色均 JSON-safe、detached、frozen；ordinal/threshold 复用 Core CSS color contract，continuous stop color 必须经 Core context-free color contract 规范化
- ordinal entries 非空、value 不含 null，并按类型保真的 canonical scalar identity 唯一；`-0` 与 `0` 视为同一数值
- threshold edges 是严格递增的有限数值，`colors.length === edges.length + 1`；空 edges 表示单一色档，evaluator 对所有有限 number 返回 `colors[0]`
- continuous domain 精确为两个有限 number 且前端点不大于后端点；stops 至少两项，offset 在 `[0, 1]` 内严格递增，首尾精确为 `0` 与 `1`
- declarative evaluator 完全由 frozen mapping 决定；opaque evaluator 的纯度与确定性由 Definition 作者保证
- opaque resolution 不得携带 mapping；与 opt-in Legend 组合时必须携带 encoding id 与 scale name fail-loud
- descriptor 只 clone declarative mapping，不再次调用 definition、不抽样 evaluator，也不重新训练 domain

ordinal 按 canonical scalar identity lookup；threshold 使用左闭右开色档，最后一档包含大于等于最后 edge 的值；continuous 先 clamp 到 domain，再使用 Core canonical linear-gradient stop 求值语义插值。threshold/continuous 遇到非有限 number fail-loud，ordinal 的域外值返回 `undefined`。continuous domain 两端相等时，factory 保留 authored stops 的严格递增 offsets，把每个 stop color 都规范为 authored stops 在 offset `0.5` 的同一 canonical 中点色；evaluator 对所有有限 number 返回该颜色。

### Continuous paint hard gate

continuous mapping 进入实现前，Core 必须冻结 renderer-agnostic 的 context-free color 与 linear-gradient stop 求值契约：解析 authored CSS color 为 canonical RGBA，拒绝 `currentColor`、CSS variables、环境相关或不可解析的颜色，定义确定的 canonical CSS serialization，并覆盖 sRGB/alpha 插值、边界 offset 与 multi-stop 分段。continuous factory 在 freeze mapping 前把全部 authored stop colors 规范为这一 canonical serialization；Table evaluator、Standard Legend gradient child 与 SVG/Canvas renderer 因而消费同一组 context-free stops。Table 不保留独立的颜色解析或插值语义。

Core 契约未就绪时，continuous 能力保持实现 gate。Standard Legend 只消费普通 Core gradient child，不新增 scale 或插值字段。

### 内置 color scales

- `ordinal-color`：显式 domain 必须 non-empty、non-null 且按 canonical scalar identity 去重；省略时按首次出现顺序去重。range 省略时使用 `data.categorical` style token，不足 fail-loud、不循环，多余颜色不进入 mapping；域外值返回 `undefined`
- `sequential-color`：显式 domain 是 `[min,max]` 且 `min <= max`；省略时取 finite number extent。range 省略时使用 `data.sequential` style token；生成 continuous mapping，range 对应 offset `0/1` 的 stops，越界 clamp，相等 domain 使用稳定中点色
- `threshold-color`：thresholds 严格递增，range 长度为 `n + 1`；省略 range 时从 `data.categorical` style token 取得足够颜色。生成 threshold mapping，endpoint 采用左闭右开语义

sequential/threshold 的任一 selected non-null scalar 不是 finite number 时，在产生任何 patch、trace 或 descriptor 前 fail-loud，不跳过、不 coercion。空选择下，显式 ordinal/sequential domain 与 threshold 仍可形成 resolution；只有自动 domain 可以返回 `undefined`。

### Appearance 写入与 descriptor

- `backgroundFill` 只写 `appearance.background.fill`，保留既有 opacity
- `contentColor` 只写 `appearance.content.color`，作为 Core Scope master color

当 `legend` 是 object 且 declarative resolution 存在时，产生 public JSON-safe descriptor：

```ts
type TableLegendDescriptor = DeepReadonly<{
  encodingId: string;
  channel: TableVisualChannelValue;
  scaleName: string;
  title?: string;
  mapping: CellVisualScaleMapping;
}>;
```

descriptor schema 是单一真源，只保存 detached declarative mapping；`items | ramp` 由 mapping kind 派生，不保存可独立漂移的 form/domain/range/edges 副本。它不包含 Standard Legend layout/style、selector、formatter 或 Cell ids。Legend 省略或为 false 时不产生 descriptor；Table 不自动添加 Legend。

## DSL 表面

```ts
const encodings = [
  {
    id: 'revenue-heat',
    selector: { fields: ['revenue'], locations: ['body'] },
    channel: 'backgroundFill',
    scale: { name: 'sequential-color' },
    legend: { title: 'Revenue' },
  },
];
```

## 原子实施约束

ADR-04 与 ADR-05 是同一原子产品实施与评审单元。缺省 range 需要 ADR-05 的 resolved palette；palette token 又只能在真实 scale consumer 存在时加入。不得发布临时 palette、未消费 token、module-level fallback 或仅支持 explicit range 的中间状态。

两篇 ADR 保持独立长期所有权，但产品实现、验证与交付必须作为同一原子单元。

## 功能与包边界

- Table 拥有 selector、channel、scale Definition、declarative/opaque resolution contract 与 descriptor
- Core 提供 color/style 与 canonical gradient-stop 求值语义
- Standard 拥有通用 Legend 的视觉结构、布局、lowering 与 artifact
- Plot 不被 Table 依赖；adapters 只 author encoding 与传递 definitions

## 兼容性与影响

- `TableSpec` additive 增加 `encodings` 与 opt-in Legend 的 root-id refinement
- runtime options additive 增加 visual scale definitions
- 既有 custom scale 的结构式 resolution 是 alpha breaking change；作者必须迁移到 `createCellVisualScaleResolution(mapping)` 或 `createOpaqueCellVisualScaleResolution(of)`，不保留旧 `legendForm/domain/range/edges` 形状的 alias 或 bridge
- lineage source additive 增加 `encodingId`
- continuous mapping 依赖 Core canonical gradient-stop contract，但 Table 不依赖 Plot

## 测试策略摘要

- schema/registry 证明唯一 id、闭合 channel、scale ref、strict descriptor 与 custom extension
- provider contract 证明三种内置 scale 的 auto/explicit domain、null/type/range/threshold/equal-domain 边界
- pipeline 证明单次 resolution、declarative mapping 同时驱动 evaluator/descriptor、opaque Legend fail-loud、order 与 rule precedence
- renderer contract 证明 context-dependent color fail-loud，continuous 与 SVG/Canvas gradient 共用 Core canonical RGBA/stop 语义
- parity 证明 manual/detail/custom、direct/React/Vanilla/SSR 和 JSON round-trip 一致

详细 case、路径、命令和正式证据位于对应 ignored mirror plan 的 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Presentation、Visual Encoding、Traceability
- **问题归属**：Cell 数据到 Table appearance 的映射属于 Table；颜色插值基础语义属于 Core；通用 Legend 呈现属于 Standard
- **内部闭环**：encoding → scale registry → single declarative/opaque resolution → appearance；仅 declarative mapping → descriptor
- **外部扩展**：builtin/custom scale 经过同一 registry，custom 通过公共 factory 显式选择可生成 Legend 或仅实绘
- **结论**：扩展 Table Visual Encoding，组合 Core color/gradient 与 Standard Legend，不建立 Plot 依赖

## 被否决方案

- 任意 `of()` 外加 form/domain/range/edges：有限抽样不能证明 evaluator 与 Legend 一致
- 所有 custom scale 强制声明式：会不必要地禁止仅用于 Cell 实绘的纯 evaluator
- Cell evaluator 与 descriptor 由两个 callback 分别生成：保留两个可独立漂移的映射真源
- 复用 Plot scale：造成 Table→Plot 领域依赖
- 自动生成 Legend：缺少作者 opt-in 与稳定 identity
- 自定义 channel registry：alpha.3 只有两个真实 appearance consumer

## 不在本 ADR 范围

- Core canonical gradient-stop 求值契约的公开 API 与 renderer 实现
- size、symbol、opacity、data bar、sparkline 与内容结构 encoding
- 跨 Cell Plot scale/axis/guide 协调
- formatter-based Legend labels、Legend placement/layout/style
- interaction state encoding
- 自定义 channel registry
