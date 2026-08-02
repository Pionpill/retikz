# ADR-04：条件视觉 encoding、color scale 与 Legend descriptor

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-02 appearance](./02-presentation-context-and-cell-appearance.md) · [ADR-03 selector/rule](./03-cell-selector-and-rule-cascade.md) · [ADR-05 style tokens](./05-style-preset-and-token-resolution.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景与目标

Rule 可以写固定 appearance，却不能把一组 raw values 映射成连续色带、分类颜色或阈值色档。把 scale 放进 Presentation 会把数据映射和内容形态绑定；复用 Plot scale 又会让 Table 依赖另一个领域包。

Table 条件视觉编码还必须保证实绘与可选 Legend descriptor 同源。若两条链路分别训练 domain、选择 range 或计算 thresholds，就会产生可见漂移。本 ADR 的目标是让一个 scale resolution 同时驱动 Cell appearance 与 descriptor，并允许内置/custom scale 走同一扩展链路。

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

encoding 按声明顺序写自己拥有的 channel，后者覆盖前者；root rules 在 encodings 之后应用，所以显式 rule 可以覆盖 computed color。

### Visual Scale Definition

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

`values` 是 selector 命中的 non-null raw scalar，按 canonical Cell 顺序保留重复项。每次 Table resolution 中，每个 encoding 只调用一次 `resolve()`；实绘与 descriptor 共用该 resolution，不二次训练 domain 或重新选择 palette。父级 layout 可以重新执行整个 Table composite，但不能依赖跨 probe/compile 的全局缓存。

内置与 custom definition 经同一 `defineCellVisualScale()`、registry、options guard、resolution guard 和 evaluator guard。空名称、重复或覆盖内置项 fail-loud。options、domain、range 与 edges 都必须 JSON-safe、detached、frozen；range 复用 Core 的开放 color string contract并额外拒绝空白字符串。

结构不变量：

- `ramp` 的 domain/range 均为两个端点且没有 edges；domain endpoint 可以是任意 JSON scalar，Legend label 规则由 ADR-06 对每种 scalar 完整定义
- 无 edges 的 `swatch` 要求 domain/range 等长；包括显式 null 在内的每个 domain scalar 都必须保留一个同位置 label，不得在 Legend handoff 时丢弃或改变 cardinality
- 有 edges 的 `swatch` 要求 edges 严格递增、`range.length === edges.length + 1`，domain 与 edges 同序同值
- evaluator 只返回合法 color string 或 `undefined`
- 同次输入中自然重复的相同 non-null scalar 必须得到相同结果
- definition 返回 `undefined` 表示本 encoding 无 resolution，不产生 patch、trace 或 descriptor

Custom definition 作者必须保证 `of()` 与同一 resolution 的 form/domain/range/edges 描述同一映射。Table 能验证结构、JSON、颜色与自然重复值确定性，但不额外 probe 任意 evaluator 来伪称证明完整语义。

### 内置 color scales

- `ordinal-color`：显式 domain 必须 non-empty、non-null 且严格去重；省略时按首次出现顺序去重。range 省略时使用 `data.categorical` token，不足 fail-loud、不循环，多余颜色截断；域外值返回 `undefined`；form 为 swatch
- `sequential-color`：显式 domain 是 `[min,max]` 且 `min <= max`；省略时取 finite number extent。无论 domain 是 auto 还是 explicit，只要任一选中的 non-null scalar 不是 finite number，整个 encoding 在产生任何 patch/trace/descriptor 前 fail-loud；不跳过、不 coercion。range 省略时使用 `data.sequential` token；越界 clamp，相等 domain 使用稳定中点色；form 为 ramp
- `threshold-color`：thresholds 严格递增，range 长度为 `n + 1`；省略 range 时从 categorical token 取得足够颜色。任一选中的 non-null scalar 不是 finite number 时，整个 encoding 在产生任何 patch/trace/descriptor 前 fail-loud；不跳过、不 coercion。endpoint 遵循 `value < threshold` 进低档、`value >= threshold` 进后一档；form 为 swatch

空选择下，auto ordinal/sequential 返回 `undefined`；显式 domain 与 threshold 仍可形成 resolution。数值类型错误的诊断必须包含 encoding id 与 scale name。所有内置行为不做 scalar coercion。

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

descriptor schema 是单一真源，复用 channel、Data scalar 和 Core color schema，并执行与 resolution 相同的结构 refinement。descriptor 不包含 Standard Legend layout/style、selector、formatter 或 Cell ids；ADR-06 负责将它解析为 Standard input 并保留 Table lineage。Legend 省略或为 false 时不产生 descriptor，Table 不自动添加 Legend。

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

两篇 ADR 保持独立长期所有权，但产品实现、验证与交付必须作为同一原子单元，不能只完成其中一侧。

## 功能与包边界

- Table 拥有 selector、channel、scale Definition、resolution contract 与 descriptor
- Core 提供 color/style 基础契约
- Standard 后续拥有通用 Legend 的视觉结构、布局、lowering 与 artifact
- Plot 不被 Table 依赖；adapters 只 author encoding 与传递 definitions

## 兼容性与影响

- `TableSpec` additive 增加 `encodings` 与 opt-in Legend 的 root-id refinement
- runtime options additive 增加 visual scale definitions
- lineage source additive 增加 `encodingId`
- Table 增加 d3-scale 运行依赖，但不依赖 Plot

## 测试策略摘要

- schema/registry 证明唯一 id、闭合 channel、scale ref、strict descriptor 与 custom extension
- provider contract 证明三种内置 scale 的 auto/explicit domain、null/type/range/threshold 边界
- pipeline 证明单次 resolution、evaluator 生命周期、appearance/descriptor 同源、order 与 rule precedence
- parity 证明 manual/detail/custom、direct/React/Vanilla/SSR 和 JSON round-trip 一致

详细 case、路径、命令和正式证据位于对应 ignored mirror plan 的 `TEST_CONTRACT.md`。

## 能力完备性与架构验证

- **所属能力域**：Tabular Visualization Complete / Presentation、Visual Encoding、Traceability
- **问题归属**：Cell 数据到 Table appearance 的映射属于 Table；通用 Legend 呈现属于 Standard
- **内部闭环**：encoding → scale registry → single resolution → appearance + descriptor + lineage
- **外部扩展**：builtin/custom scale 同一 registry 与 guard
- **结论**：扩展 Table Visual Encoding，复用 Core color 并把通用 Legend 交给 Standard

## 被否决方案

- 复用 Plot scale：造成 Table→Plot 领域依赖
- 在 Presentation 中解析 scale：将数据映射绑定到内容形态
- 实绘与 descriptor 分别 resolve：会产生 domain/range 漂移
- 自动生成 Legend：缺少作者 opt-in 与稳定 identity
- 自定义 channel registry：alpha.3 只有两个真实 appearance consumer，不预留无消费能力

## 不在本 ADR 范围

- size、symbol、opacity、data bar、sparkline 与内容结构 encoding
- 跨 Cell Plot scale/axis/guide 协调
- formatter-based Legend labels、Legend placement/layout/style
- interaction state encoding
- 自定义 channel registry
