# ADR-01：冻结 Layout Profile 并以公开行为验收 Core Gate

- 状态：Superseded by [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md)（2026-08-09）
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Core ADR-08](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
- 后继：[Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) 接管当前 owner；本 ADR 保留 Standard 验证期历史

## 背景

Standard alpha.2 要提供可替代调用方私有 CSS/DOM 排版的通用绘图容器。Flex、Grid、Overlay 的算法不同，但都必须在同一条受控链路中回答四类问题：child 在给定条件下贡献多大、父容器分配多大 slot、child 实际占用多大，以及最终把哪次求值结果提交到 Scene。

Core ADR-08 已提供双轴 proposal、`layoutChild()` probe、`slotSize`、真实 allocation/visual bounds、alignment guides、failure isolation 和 one-use replay。Standard 不再设计第二套测量合同；本 ADR 冻结 Standard 对该公开合同的解释。

这里的双轴是物理 x/y 尺寸轴，不是 Plot 坐标轴，也不引入 writing mode。一个轴的 proposal 可以改变另一个轴的 contribution，例如文本在给定 x 宽度后重新计算 y 高度。任何容器 solver 都必须保留这种上下文关系，不能把 child 简化为一次性的自然宽高。

## 决策：统一采用 proposal → contribution → solve → placement → replay 五阶段 profile

每个布局容器只通过 Core 根入口消费 `LayoutProposal` 与 `LayoutCompositeCompileContext`：

1. **proposal**：容器读取自己从父级收到的 x/y 条件，并为候选 child 构造上下文化 proposal
2. **contribution**：通过 `layoutChild()` 获得 minimum、natural 或受限结果；失败结果只作为候选，不立即污染 compile
3. **solve**：纯 solver 根据 resolved `slotSize`、真实 `allocationBounds`、guide 和容器规则形成 line、track 或 overlay placement
4. **placement**：以 child allocation bounds 为基准计算 translation，显式处理 margin、padding、alignment、overflow 和 clip
5. **replay**：只 replay 最终选中的结果一次；丢弃其它 probe，选中失败时调用 `raise()`

### 双轴 proposal 解释

| proposal            | Standard 解释                                         | 必须保留的差异                                            |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `intrinsic.minimum` | 查询在当前另一轴条件下不可再压缩的 contribution       | 不是零，也不等于 natural                                  |
| `intrinsic.natural` | 查询在当前另一轴条件下不受额外拉伸的自然 contribution | 不自动填满父级                                            |
| `range`             | 在有限或单侧无界区间内求一个 resolved slot            | 省略 `max` 表示无上限，显式零仍是有效上限                 |
| `exact`             | 父级要求确定 slot                                     | child 可以拒绝重排/缩放，真实 allocation 仍可与 slot 不同 |

proposal 是输入条件；`slotSize` 是该输入求值后的无原点父级 slot；`allocationBounds` 是 child 的真实布局占用；`visualBounds` 是最终静态绘制包络。Standard 不允许用其中任一量覆盖其它量。

### 坐标与数值约束

- 每个 Standard container 的局部 allocation box 固定从 `(0, 0)` 开始，width/height 为有限非负数
- padding 内缩得到 content box；item margin 位于 child slot 外，不参与 margin collapse
- child allocation/visual bounds 可以有非零或负 origin；placement 必须对 bounds rect 做变换，不能假设 child 从原点开始
- 所有中间尺寸、累计 gap、分配余量和 transform 必须保持有限；任何算术溢出 fail-loud
- 浮点比较统一使用 `epsilon(a, b) = max(1, abs(a), abs(b)) * Number.EPSILON * 64`，只用于尺寸相等、约束命中、free-space 收敛和 residual 是否可忽略的判定，不修改公开 artifact 中可确定的原始数值
- `abs(a - b) <= epsilon(a, b)` 视为阈值内相等；比较 min/max 时阈值内优先取精确约束值，free-space 在阈值内直接进入残差归属，不再启动新一轮分配
- 最后一份浮点残差稳定归入 authored order 中最后一个按 min/max 检查后仍可接收该残差的 item/track；候选是否可接收使用应用残差后的值与边界比较，阈值内钳到精确边界，保证总量守恒和跨运行确定性
- 所有会影响 solve 的多项和——item/track size、margin、padding、gap、weight、free-space 与 residual——统一按 authored/index 升序使用 Neumaier compensated summation；不得依赖原生无补偿累加、Map/Set iteration 或并行归并顺序
- epsilon 的两个实参必须有限；无上限 max 以 optional/unbounded 分支表达，禁止把 `Infinity` 写入 solver DTO、JSON、artifact 或传给 epsilon。最终 residual 用补偿和重算 `available - assigned` 后再执行上述稳定接收规则

### failure、diagnostics 与 replay

- 非法 proposal、非法 Standard schema、重复 key 和 solver 不可能状态直接 fail-loud
- child probe 的 provider/schema/reference 等可恢复失败返回 `failed`；solver 可以比较其它候选
- 最终必须使用某个 failed 候选时调用 `raise(failure)`，保留 Core provider key 与 occurrence
- 未 replay 的 probe 不得发布 primitive、resource、namespace、warning 或 artifact
- Standard 不保存 replay token，不跨 callback/compile 复用，不复制 child primitive tree

## DSL / API 表面

本 ADR 不新增用户 API、IR 或 schema。以下代码只表示后续 definition 必须遵守的 Core 消费形态：

```ts
const compile = (node: IRContainer, context: LayoutCompositeCompileContext) => {
  const candidate = context.layoutChild(node.children[0].child, {
    x: { kind: LayoutAxisProposalKind.Exact, value: 240 },
    y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
  });

  if (candidate.kind === LayoutChildProbeKind.Failed) {
    return context.raise(candidate.failure);
  }

  return {
    children: [context.replay(candidate.result, { transforms: [{ kind: 'translate', x: 0, y: 0 }] })],
  };
};
```

## 长期边界

- Layout schema、size/alignment/overflow 字段
- Flex、Grid、Overlay 具体算法
- artifact payload、Definition 接入与 React/Vanilla API

## 遗留风险

- Standard 必须保持 Core ADR-08 冻结的 proposal、`slotSize`、allocation/visual bounds 与 replay 契约不变
- 异步测量、跨 compile cache 与 renderer readback 仍不在支持范围
