# ADR-08：Strip 的分类 band 内 jitter 语义

- 状态：Proposed（只冻结延期边界；不构成未来 Strip implementation Gate）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap §7](./roadmap.md) · [ADR-07](./07-ranged-dot.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Strip Plot 展示分类分组内的一维观测分布，需要保留 category 与 value 两个数据角色，并在 category band 内给每个 Point 一个确定性 jitter offset，避免完全重叠。现有 Plot Jitter 只能在数据单位中扰动连续位置字段，不能提供独立输出字段或投影后的 offset consumer；扰动 value 会改变被观察数值，扰动 category 又不满足连续字段契约。

## 核心决策与基础数据结构

```ts
type StripChartIR = ChartCommon & {
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

未来缺省配方为 category → x、value → y，Point 使用 category band 内的独立 jitter offset。`amplitude` 表示完整 band width 的比例，范围 `[0, 0.5]`；相同 root-transformed ordered rows、seed 与绑定字段值应得到可复现结果，排序改变允许改变逐行 offset，不承诺按 datum key 跨重排稳定。category / value 是严格 field-only roles；mark patch 只调整 Point 表现，不能改写 offset consumer、identity、encoding、transform 或 coordinate view。Chart 不计算 renderer-specific dx / dy。

上述结构只冻结未来 Chart-level 语义，不表示当前 IRChart 已接受 `strip`。

## 行为、失败语义与兼容性

在 Plot 提供独立输出字段、position offset consumer、Cartesian / Polar 等 coordinate 的正式 offset 语义，并让 schema、definition / registry、field collection、lowering、provenance、React 与 Vanilla 形成统一链路前，`strip` 不进入当前 IRChart union；输入继续得到既有 unknown-type / schema 诊断，不注册不可执行 variant，不提供 fallback、adapter surface 或 renderer pixel offset。

未来 implementation ADR 必须基于实际 Plot contract 重新冻结完整 IRPlot recipe、核心不变量、字段与 coordinate 语义；不得由 Chart 私有 transform、Node translation、CSS transform 或 canvas translation 旁路实现。

## 功能与包边界

Chart 只拥有未来 Strip 的 category / value / color / jitter authoring 语义与边界；Plot 拥有 Jitter output、position offset、coordinate consumption、field collection、lowering 与 trace；Core / renderer 只消费 Plot lowering 结果；adapter 不拥有随机数或像素偏移。

## 当前实现结果与遗留风险

本 ADR 仅冻结了未来 Strip 的角色、默认值、可复现性与延期边界，状态仍为 Proposed。长期风险是任何提前公开 `strip` 都会把缺失的 Plot offset contract 伪装成 Chart 能力；value 必须保持原语义，offset 必须沿 Plot 正式 definition / registry、coordinate 与 trace 主链消费。
