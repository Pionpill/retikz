# ADR-02：轨道尺寸 schema 与确定性单轴求解

- 状态：Accepted
- 决策日期：2026-07-23
- 接受日期：2026-07-26
- 关联：[alpha.2 roadmap](./roadmap.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [alpha.1 固定轨道](../alpha.1/04-table-layout.md)

## 背景

alpha.1 的 `columnWidth`、`rowHeight` 与 `headerHeight` 只能为全部同类轨道提供统一固定尺寸，不能表达列级差异、内容自然尺寸、剩余空间份额或上下界。alpha.2 需要一个与内容类型、renderer 和 adapter 无关的数值基础，后续 Cell、span、wrap、border 与 manifest 才能共享同一几何语义。

Table 拥有轨道规则，但不拥有任意 `IRChild` 的测量。Core 负责 proposal / probe / replay；本 ADR 只定义 JSON-safe 轨道表达、canonical index 覆盖、运行时归一化和轴无关 numeric solver。

## 决策

### 轨道尺寸原语

公开四种判别式尺寸：

```ts
type IRTableTrackSize =
  | { kind: 'fixed'; value: number }
  | { kind: 'auto' }
  | { kind: 'fraction'; weight?: number }
  | {
      kind: 'minmax';
      min: { kind: 'fixed'; value: number } | { kind: 'auto' };
      max: { kind: 'fixed'; value: number } | { kind: 'auto' } | { kind: 'fraction'; weight?: number };
    };

type IRTableTrackOverride = {
  index: number;
  size: IRTableTrackSize;
};
```

契约如下：

- `fixed.value` 为有限非负数，`0` 表达显式折叠轨道
- `auto` 使用该 canonical 轨道收到的最大内容 allocation contribution
- `fraction.weight` 为有限正数，运行时省略值物化为 `1`
- `minmax.min` 只接受 fixed / auto；`max` 接受 fixed / auto / fraction
- fixed min 大于 fixed max 时 schema 拒绝；runtime auto min 大于 fixed max 时 min 胜出
- override index 为非负整数，同一数组内必须唯一；相对实际轨道数量的越界在 resolver fail-loud
- standalone `TableTrackOverridesSchema` 不接受 `undefined`，也不物化默认值；resolver 省略 overrides 时使用空数组

`TableTrackSizeKind`、各变体 schema、聚合 schema、override schema 及其 schema 派生类型从 `@retikz/table` 包根公开。resolver 与 solver 属于 pipeline 内部能力，不从包根导出。

### Solver 输入边界

solver 接收与 canonical 轨道同序的 resolved sizes、纯数值 contributions、一个 gap 与可选 `availableSize`：

```ts
type SolveTableTracksInput = Readonly<{
  tracks: ReadonlyArray<ResolvedTableTrackSize>;
  contributions: ReadonlyArray<{ trackIndex: number; size: number }>;
  gap: number;
  availableSize?: number;
}>;
```

它不接收 `IRChild`、definitions、host capabilities、renderer 或 adapter props，也不读取 Structure kind。同轨多个 contribution 取最大值；空轨道自然 contribution 为 `0`。

所有公开或运行时数值都必须满足各自的有限性与正负约束。非法 track kind、negative / fractional / out-of-range contribution index、NaN、Infinity、负 gap 或负 available size 均 fail-loud，不做 clamp 或静默过滤。

### 单轴求解

无 `availableSize` 时不执行剩余空间分配：

- fixed 使用显式值
- auto 与 fraction 使用自然 contribution
- minmax 使用 min 作为下界；fixed max 封顶，但 auto min 高于 fixed max 时保留 auto min

存在 `availableSize` 时，solver 只在内部扣除一次 `(trackCount - 1) * gap`，再按以下顺序分配轨道空间：

1. 物化 fixed、auto 与 minmax 的 base
2. 空间不足时保留全部 base，由上层形成 overflow，不压缩轨道
3. 对非 flex 的 bounded minmax 做等额 water-fill；较小上限封顶后继续重分配
4. 把剩余空间按正 weight 分给 fraction 与 minmax-fraction

浮点均分使用确定性 residual 策略；当平均份额小于最小可表示正数时，残差按 canonical 顺序落入可表示轨道，保证合法正空间不全部丢失且重复执行确定。返回数组冻结、与输入等长同序，不修改输入。

### 两轴编排边界

solver 保持轴无关，但本 ADR 不拥有两轴 transaction。alpha.2 后续编排采用 column-first：父级 x 轴 `exact.value` 或有限 `range.max` 成为 column `availableSize`，intrinsic 或无上界 range 不制造限制；column solver 自行扣 gap。Table 当前不消费父级 y 轴 exact / range，行轴始终按自然 contribution 求解。

column-first、受约束内容后的 row contribution、span 传播、最终 replay 与 manifest 同源性由 ADR-03 和 ADR-06 集成，不进入本 numeric solver。

### 原子迁移边界

本 ADR 只新增 standalone primitives、resolver 与 solver，不改变当前 `TableLayoutSchema` 的解析结果。根 layout 仍使用 alpha.1 的 `columnWidth`、`rowHeight`、`headerHeight`、`columnGap` 与 `rowGap`。

`columnSize`、`rowSize`、`headerRowSize`、`columns` 与 `rows` 的激活，以及旧三个固定字段的删除，必须与 `resolveTableLayout()`、`layoutTable()`、lowering、manifest 和 adapters 在 ADR-06 同一次原子迁移中完成，不提交半迁移状态。届时 `columns` / `rows` 省略值解析为 `[]`。

## 被否决的方案

- 数字 / 字符串混合 shorthand：不利于 JSON 持久化、LLM 生成与 schema 文档
- 用轨道 id 做稀疏覆盖：会泄漏 structure 内部生成身份；canonical index 对 detail / manual / custom 同样成立
- 开放 solver Definition / registry：轨道求解是 span、border、manifest 与 adapter 必须共享的正确性不变量，不是可替换语义
- 在 Table 内测量文字或特判 Node / Path / Plot：突破 Core 通用 `IRChild` layout 边界
- 从 CSS height、viewBox、renderer 或未消费的 y 轴 proposal 猜测 row available size：alpha.2 不承诺有限高度行分配

## 实现与兼容性

- 新增 fixed / auto / fraction / minmax schema、公开 IR 类型与 `TableTrackSizeKind`
- 新增 duplicate-aware sparse override schema、默认值 resolver 和确定性纯 solver
- 公开变化为 additive；现有 alpha.1 `IRTable.layout` JSON 与可见布局行为保持不变
- subnormal residual、极端有限权重、输入冻结与非法 runtime discriminator 均有正式或 adversarial 证据
- span、Cell box、fit / overflow / clip、wrap、border、manifest 与 adapter 接线继续由 ADR-03～07 完成

## 验证

- Architecture Gate Round 2/3：PASS，0 BLOCKING，0 WARNING
- `@retikz/table` ESLint：PASS
- `@retikz/table` TypeScript：PASS
- `@retikz/table` 全量测试：15 files / 137 tests PASS
- track sizing 定向测试：24 tests PASS
- Bug Hunter Round 2：PASS，0 BLOCKING，0 WARNING；scratch 5/5 PASS 并已自动清理
- `@retikz/docs` TypeScript 与 `viz/table` docs integrity：PASS
