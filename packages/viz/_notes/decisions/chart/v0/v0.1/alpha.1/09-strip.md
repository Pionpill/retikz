# ADR-09：Strip 的分类 band 内 jitter 语义

- 状态：Proposed（只决定延期边界；不构成未来 Strip implementation Gate）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap §7](./roadmap.md) · [ADR-08](./08-ranged-dot.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景

Strip Plot 展示分类分组内的一维观测分布。它需要保留 category 与 value 两个数据角色，同时在 category band 内给每个 Point 一个确定性 jitter offset，避免完全重叠。

当前 Plot `JitterTransform` 只能在数据单位中原地扰动连续 x / y 字段，没有独立输出字段；Position channel 也没有投影后 offset 的数据驱动消费面。直接扰动 value 会改变用户要观察的数值，直接扰动 category 又不满足连续字段契约。

## 决策：冻结 Chart type，但实现等待 Plot position-offset capability

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

缺省配方是 category -> x、value -> y，Point 使用分类 band 内的独立 jitter offset。`jitter` 调整隐式 `transform.jitter`，但不能关闭 transform、覆盖 category / value 或把 offset 改为 value displacement。

当前只冻结与上游字段名无关的 Chart-level contract：

- `category` / `value` 是无 `scale` 的 strict field-only roles；color 复用 ADR-04 strict color union
- `amplitude` 是完整 category band width 的比例，范围 `[0,0.5]`；future Plot transform 在 `[-amplitude * bandWidth,+amplitude * bandWidth]` 内生成对称均匀 offset，`0.5` 恰好到 band 两侧边界
- 复现条件是相同 root transform 后 ordered rows、相同 seed 与相同绑定字段值；排序改变可改变每行 offset，不承诺按 datum key 跨重排稳定
- mark patch 复用 strict Point style patch，并必须排除未来正式 offset consumer 字段、identity、encoding、transform 与 coordinateView
- coordinate / composition 复用 ADR-04 的 defaultView、统一 coordinate registry 与 `roles === ['x','y']`；Polar 只把 category/value roles 投影为 angle/radius，不由 Chart 计算 dx/dy

稳定 semantic ids 预留为 `__chart.strip.transform.jitter` 与 `__chart.strip.mark.main`；实际 Plot output field、offset operation / channel、registry definition 与 capability/version contract 由上游 Plot ADR 冻结。

本 ADR 选择“延期”，不授权产品文件。只有独立 Plot ADR 提供并实现以下公开 capability 后，才能新建一篇 Strip implementation ADR：

1. row-preserving Jitter 可写入独立输出字段
2. position offset 可从字段读取，在 coordinate projection 与 Point lowering 的正式链路中消费
3. offset 语义对 Cartesian / Polar 等 coordinate 正交
4. Plot schema、definition / registry、field collection、lowering、provenance、React / Vanilla 均闭环

新 ADR 必须写入 exact Plot operation / output / offset consumer、完整 PlotSpec recipe、`validateCore`、minimum Plot version或正式 capability key、文件 scope与测试矩阵，并从 Round 1 重新执行 Architecture Gate；不得把本篇 Gate 当作未来实现 Gate。Chart 不提供私有 TransformDefinition + 私有 Node 位移组合来冒充纵向能力，因为现有 Plot ChannelDefinition 明确禁止 Node channel 写 position。

## DSL 表面

```json
{
  "namespace": "chart",
  "type": "strip",
  "data": { "reference": "measurements" },
  "encoding": {
    "category": { "field": "group" },
    "value": { "field": "score" }
  },
  "jitter": { "amplitude": 0.32, "seed": 7 }
}
```

该示例只表达未来 Chart-level roles，不表示当前 `ChartSpecSchema` 接受 `strip`。

## 测试设计

- 当前公开 union 对 `type:'strip'` 按未知 type 拒绝，不进入 Strip resolver
- 当前不提供“缺少 Plot capability”的 runtime error code / path，也不注册不可执行 variant
- gallery / docs 只可把 Strip 标为 planned，不提供可运行示例
- 未来 implementation ADR 必须验证 Point、Jitter、独立输出、offset mapping、same view 与 reserved ids 均不可撤销

## 影响

- 本 ADR 不扩展 ChartSpec union
- 需要独立 Plot owner ADR 与版本依赖
- docs 在 capability 就绪前只能标记 planned，不进入可运行 gallery

## Chart 封装完备性检查

- 核心 recipe：Point + independent jitter + position offset
- 缺失 capability owner：Plot，不在 Chart 内补纵向机制
- 数据：value 不被 jitter 修改，category 不被连续扰动
- coordinate：offset 由 Plot coordinate / channel contract 决定
- 本轮结论：先下沉 Plot；本篇只接受 Chart-level roles 与延期决策，未来实现另开 ADR并重新 Gate

## 不在本 ADR 范围

- beeswarm / collision avoidance
- density / violin / boxplot
- 随机不可复现 jitter
- renderer-only pixel translation
- Plot position-offset contract 的具体字段名与 lowering 设计

---

## 实现契约（必填）🔻

### Level

本 ADR自评 level：`green`，因为当前只记录延期边界，不修改产品 schema、公开 API 或实现。未来 Strip implementation ADR 必须重新判为 `red`。

### Schema 改动

无。上文 schema 仅冻结未来 Chart-level 字段意图；没有上游 exact capability 与新的 Strip implementation ADR 前不得落入 `packages/viz/chart/src`。

### 文件 scope

无产品文件。偏离到 `packages/viz/chart/**` 或 `packages/viz/plot/**` 都必须先有新的 Accepted ADR，不能扩展本篇白名单。

### 测试象限

**当前延期边界**

- `ChartSpecSchema` 不包含 Strip；`type:'strip'` 只得到现有 unknown-type/schema 诊断
- 不存在 Strip resolver、runtime capability probe、fallback Scatter 或私有 offset
- 不新增 executable docs、adapter入口、release surface或产品测试
- 上游就绪后必须新建 implementation ADR，从 Round 1 重新 Gate

未来 implementation ADR 的最低矩阵必须覆盖：strict roles / color / patch、offset distribution与ordered-row复现、Point + Jitter + offset exact recipe、`validateCore`、coordinate/composition、inspection / reserved id、Plot extension冲突、presentation trace与 Kernel gate 后三入口 parity。本篇不宣称这些未来测试已通过。

### 依赖的现有元素

- 当前 ChartSpec 封闭 union 与 unknown-type/schema 诊断
- Plot Jitter transform（未来 owner ADR需扩展独立输出）
- Plot position channel / coordinate contract（未来 owner ADR需新增 offset capability）
- ADR-04 strict roles / color / patch与 coordinate normalization设计
