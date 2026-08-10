# ADR-01：冻结 Layout Profile 并以公开行为验收 Core Gate

- 状态：Superseded by [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md)（2026-08-09）
- 决策日期：2026-07-30
- 关联：[alpha.2 roadmap](./roadmap.md) · [Standard v0.1 roadmap](../roadmap.md) · [Core ADR-08](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/08-layout-proposal-probe-contract.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
- 后继：[Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) 接管当前 owner；本 ADR 保留 Standard 验证期历史

## 背景

Standard alpha.2 要提供可替代调用方私有 CSS/DOM 排版的通用绘图容器。Flex、Grid、Overlay 的算法不同，但都必须在同一条受控链路中回答四类问题：child 在给定条件下贡献多大、父容器分配多大 slot、child 实际占用多大，以及最终把哪次求值结果提交到 Scene。

Core ADR-08 已提供双轴 proposal、`layoutChild()` probe、`slotSize`、真实 allocation/visual bounds、alignment guides、failure isolation 和 one-use replay。Standard 不再设计第二套测量合同；本 ADR 只冻结 Standard 对该公开合同的解释，并用消费方测试决定是否可以开始容器实现。

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

### Core Capability Gate

ADR-02 进入实现前，消费方测试必须同时证明：

1. x/y 的 minimum、natural、range、exact 与显式零/无上限行为
2. plain text 在给定宽度后反馈高度，fixed geometry 不被强制缩放
3. slot、allocation、visual bounds 与 non-zero origin 足以完成对齐和 overflow
4. alignment guide 的存在与缺失可区分，Standard 只读取 Core 公开 guide，不按 child 类型或 primitive 反推
5. nested Composite、custom provider、TeX、Scope transform/clip 与 artifact 在 probe/replay 后仍保持同一 compile 环境
6. failed probe 可丢弃，选中失败可 raise，resolved result 只能 replay 一次

Gate 测试只能从 `@retikz/core` 根入口导入。Core ADR-08 未 Accepted、当前 workspace 行为不通过，或没有 Standard 可消费的 Kernel 版本时，后续 ADR 可以继续设计纯 solver，但不得进入 layout-aware compile 实现。

roadmap 中合写的 `baseline / fallback` 是 milestone 聚合验收项，不改变本 ADR 的阶段所有权：ADR-01 Core Gate 只证明公开 guide 的存在、缺失与传播；fallback 规则由 ADR-02 冻结，并由 ADR-03～05 各容器 compile tests 验收，不在 `core-gate.test.ts` 内用测试替身实现。

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

## 被否决的方案

- Standard 私有 measurer 或 DOM/renderer 回读：会与 Core 文字、TeX、provider 和 nested Composite 形成第二真源
- 先 natural compile，再从 Scene 反推尺寸并二次 compile：破坏 transaction、warning、resource、identity 和 artifact 原子性
- 把 child 简化为一个 width/height：无法表达 non-zero bounds、视觉 overflow、baseline 和一轴影响另一轴
- 删除 `slotSize`：父级分配与 child 真实占用无法同时表达
- 按 Node、Text、Path、TeX 类型建立处理白名单：custom provider 与 nested Composite 无法闭环

## 影响

- 不改 Core、Standard 产品源码或公开导出
- 为 ADR-02～06 建立唯一的上游验收口径；后续容器不得重新解释 Core contract
- Core 发布状态是进入实现的流程 gate，不影响本 ADR 继续设计纯 solver

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的通用 Tier 2 布局消费边界
- 解决的问题：让 Standard 以同一公开机制获得任意 child 的上下文化 contribution 与可提交结果
- 主责包与协作包：Core 主责 proposal/probe/replay；Standard 主责容器 solver；React/Vanilla 仅 authoring
- 是否可由现有能力组合：是，完全组合 Core ADR-08，不新增底层能力
- 是否需要下沉到依赖能力域：否；Gate 失败时回到 Core 修订，不在 Standard 补丁
- 内部表达链路：Core proposal → probe result → Standard pure solver → Core replay
- 外部扩展链路：自定义 child 继续通过 Core `defineComposite` 与唯一 registry；本 ADR 不新增 registry
- 下游执行 / adapter 等价性：输出仍是相同 Scene/artifact，renderer 与 adapter 不参与求解
- 不支持边界与诊断：异步测量、跨 compile cache、renderer readback 明确不支持并 fail-loud
- 本轮结论：组合现有 Core 能力

## 不在本 ADR 范围

- Layout schema、size/alignment/overflow 字段
- Flex、Grid、Overlay 具体算法
- artifact payload、Definition 接入与 React/Vanilla API
- Core ADR-08 的实现修改、接受、版本 bump 或发布

## 遗留风险

- Standard 必须保持 Core ADR-08 冻结的 proposal、`slotSize`、allocation/visual bounds 与 replay 契约不变
- 异步测量、跨 compile cache 与 renderer readback 仍不在支持范围
