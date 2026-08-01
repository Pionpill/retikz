# ADR-05：Bubble 的不可撤销 size 语义

- 状态：Proposed
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-04](./04-scatter.md)

## 背景与目标

Bubble 与 Scatter 共用 Point Mark，但 field-bound size 是持续成立的类型身份。仅把点画大、允许常量半径，或把 size mapping 变成可删除装饰，都不能构成 Bubble。

## 决策：`bubble` 固定 Point + field-bound size

```ts
type BubbleChartSpec = ChartCommon & {
  type: 'bubble';
  encoding: {
    x: IRPlotChannel;
    y: IRPlotChannel;
    size: { field: string; scale?: string };
    color?: StrictColorChannel;
    opacity?: IRPlotOpacityChannel;
    shape?: IRPlotShapeChannel;
  };
  mark?: BubblePointPatch;
};
```

Bubble 复用 Scatter 的二维空间与 guide 配方，并把 Point、field-bound size 与 sqrt size scale 共同定义为不可撤销核心。`encoding.size` 不接受 constant；Point patch 不得覆盖 size。用户可以调整 size scale 的合法表现参数、替换表现性 legend 或追加其它 Plot marks，但不能移除 size role、改变字段绑定或把核心 scale 改为不保持面积感知的类型。

`BubblePointPatch` 精确复用 ADR-04 `ScatterPointPatch`，并进一步排除 `size`。其余字段继续使用 Plot Point 的公开 value contract，严格拒绝未知字段；recipe 的 field-bound size 在 patch 之前写入且不属于覆盖面。

## 行为、失败语义与兼容性

- size scale identity 来自显式 `encoding.size.scale` 或稳定默认；核心 Point 与 size binding 必须引用同一 scale
- 默认 size legend 是可替换的表现性 guide，不属于 type 核心
- 缺 size、constant size、核心 Point / size binding / sqrt scale 被删除或改写时 fail-loud
- size 字段全零等退化数据沿用 Plot 的正式 size 语义；Chart 不另补半径算法
- 当前 Plot 不能用具名 selector 消歧多个 size descriptor；出现第二个 field-bound size mark 时沿用 Plot 诊断，用户可显式替换 guides 或避免歧义
- React、Vanilla 与 JSON 共用同一 Bubble variant，无 Bubble 私有 runtime

## 功能与包边界

- Chart 拥有 Bubble 的 size 必需角色、Point + sqrt scale recipe 与覆盖边界
- Plot 拥有 Point size channel、sqrt scale、legend descriptor、数据校验与 lowering
- Chart 不扫描 runtime rows、不修补 degenerate radius，也不在 adapter 中消歧 legend

## 架构验证

- Canonical Type 判定：field-bound size 改变持续成立的数据角色与核心配方，区别于 Scatter pattern
- 内部表达：完全组合 Plot Point、size channel 与 sqrt scale，无新能力轴
- 外部扩展：scale 与额外 marks 沿 Plot 正式 contract 进入；核心 size 不可由扩展撤销
- trace：inspection 能区分 Point、size scale 与默认 legend 的来源，Chart 包裹不改写 Plot lineage

## 被否决方案

- 把 Bubble 作为 Scatter 的大半径 preset：没有稳定 size 数据语义
- 允许 constant size 或 Point patch 覆盖 size：会撤销 Canonical Type identity
- Chart 自己计算 radius 或 legend：会复制 Plot channel / guide pipeline

## 测试策略摘要

需要 schema、recipe、core invariant、scale / legend interaction、退化数据、Plot extension、inspection / trace 与三入口 parity 证据。关键不变量是 Point、field-bound size 与 sqrt scale始终一致存在，表现性覆盖不能撤销 size 语义，多个 size descriptor 的失败仍由 Plot 正式诊断。

## 不在本 ADR 范围

- packed bubble / circle packing
- 只有常量半径的 Scatter pattern
- size 数据清洗、负值补偿或新的 radius 算法
- Plot 具名 size legend selector
