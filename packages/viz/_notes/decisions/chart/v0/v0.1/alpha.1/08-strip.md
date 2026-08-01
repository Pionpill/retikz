# ADR-08：Strip 的分类 band 内 jitter 语义

- 状态：Proposed（只冻结延期边界；不构成未来 Strip implementation Gate）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap §7](./roadmap.md) · [ADR-07](./07-ranged-dot.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Strip Plot 展示分类分组内的一维观测分布。它需要保留 category 与 value 两个数据角色，同时在 category band 内给每个 Point 一个确定性 jitter offset，避免完全重叠。

当前 Plot Jitter 只能在数据单位中扰动连续位置字段，没有独立输出字段；position channel 也没有投影后 offset 的数据驱动消费面。扰动 value 会改变被观察数值，扰动 category 又不满足连续字段契约，因此 Chart 不能用现有能力正确组合 Strip。

## 决策：冻结 Chart-level 语义，实现等待 Plot position-offset capability

```ts
type StripChartSpec = ChartCommon & {
  type: 'strip';
  encoding: {
    category: { field: string };
    value: { field: string };
    color?: StrictColorChannel;
  };
  jitter?: {
    amplitude?: number;
    seed?: number;
  };
  mark?: StripPointPatch;
};
```

未来缺省配方是 category -> x、value -> y，Point 使用 category band 内的独立 jitter offset。`amplitude` 表示完整 band width 的比例，范围 `[0, 0.5]`；相同 root-transformed ordered rows、seed 与绑定字段值应得到可复现结果。排序改变允许改变逐行 offset，不承诺按 datum key 跨重排稳定。

category / value 是严格 field-only roles；mark patch 只能调整 Point 表现，不能改写未来 offset consumer、identity、encoding、transform 或 coordinate view。Coordinate / composition 仍由 Plot 正式二维 role 与 offset contract 投影，Chart 不计算 renderer-specific dx / dy。

上述结构只冻结未来 Chart-level 语义，不表示当前 ChartSpec 接受 `strip`。

## 行为、Capability gate、失败语义与兼容性

只有独立 Plot ADR 提供并实现以下公开能力后，才能新建 Strip implementation ADR：

1. row-preserving Jitter 可以写入独立输出字段
2. position offset 可以从字段读取，并在 coordinate projection 与 Point lowering 主链中消费
3. offset 对 Cartesian、Polar 等 coordinate 具有正式、可诊断的语义
4. Plot schema、definition / registry、field collection、lowering、provenance、React 与 Vanilla 形成闭环

在 gate 解除前：

- 当前 ChartSpec union 不包含 `strip`，输入继续得到既有 unknown-type / schema 诊断
- 不注册不可执行 variant，不提供 runtime fallback 或“缺少 capability”的新错误分支
- 不新增 executable docs、adapter surface 或 release capability
- 不允许 Chart 私有 TransformDefinition、Node translation 或 renderer pixel offset 冒充上游能力

未来 implementation ADR 必须基于实际 Plot contract 重新冻结完整 PlotSpec recipe、核心不变量、capability dependency 与架构验证；本篇结论不能替代该设计决策。

## 功能与包边界

- Chart 只拥有未来 Strip 的 category / value / color / jitter authoring 语义与延期边界
- Plot 拥有 Jitter output、position offset、coordinate consumption、field collection、lowering 与 trace
- Core / renderer 只消费 Plot lowering 结果，不按 Strip 名称特判
- adapter 不拥有随机数、CSS transform 或 canvas translation 旁路

## 架构验证

- Canonical Type 判定：Point + category-band offset 是稳定 type 意图，但当前缺失纵向 Plot capability
- 能力归属：缺口属于 Visualization Complete 的 Transform / Channel / Coordinate / Lowering 链，不属于 Chart recipe
- 外部扩展：未来内置与自定义 Jitter / offset 必须复用 Plot definition / registry 与正式消费路径
- 下游结论：当前选择先下沉 Plot并延期；Chart 不建立局部实现

## 被否决方案

- 扰动 value：改变用户要观察的数据语义
- 把 category 当连续字段扰动：违反现有字段与 scale contract
- Chart 私有 output / offset 或 renderer-only translation：形成平行 Plot pipeline并破坏 parity
- 先把不可执行 `strip` 加入 union：会把设计缺口变成 runtime 陷阱

## 测试策略摘要

当前只需锁定延期边界：公开 union 拒绝 `strip`，不存在 resolver、fallback、adapter 或 executable docs。未来 implementation ADR 需要 schema、row-preserving Jitter、独立 output、position offset、coordinate parity、core invariant、inspection / trace 与三入口证据，且必须证明 value 不被扰动、相同输入可复现。

## 不在本 ADR 范围

- beeswarm / collision avoidance
- density、violin 与 boxplot
- 随机不可复现 jitter
- renderer-only pixel translation
- Plot position-offset contract 的具体字段、provider 与 lowering 设计
