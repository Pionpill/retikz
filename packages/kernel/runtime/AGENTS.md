# @retikz/runtime 工作指南

本文件只写 `@retikz/runtime` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 Core、Tier 2 与宿主 adapter 提供领域中立的 identity、ownership、Computation graph、transaction 与执行观测底座
- **拥有的契约**：Source / Computation typed token 与 registry、Runtime Snapshot transaction 生命周期、Participant 提交与回滚、revision 和 trace
- **不拥有的能力**：Core IR / Scene、几何与 layout、renderer patch 算法、React / Vanilla authoring、Plot / Table 等领域 operation、模型 SDK 或业务交互状态
- **输入与输出**：接收 Source 定义、完整 Snapshot 输入、Computation 定义、可选变更提示与 Participant，输出已提交 revision、Source read view、Computation result、Participant read 和结构化 trace / diagnostic；不解释领域值
- **缺口流向**：绘图语义进入 core；后端物化进入 render；宿主生命周期进入 adapter；Tier 2 operation 留在各领域包；模型调用和交互策略留在应用层

## 硬约束

- 运行时只直接依赖 `@retikz/foundation`，不 import `@retikz/core`、renderer、框架、DOM 或领域包
- Snapshot 是完整真源；change set 只能作为带 base revision 的可选提示，不能独立构造下一状态
- Source / Computation / Participant token 必须保持 typed identity；异构 registry 只能在受控定义入口擦除泛型
- prepare candidate 与 current state 隔离；只有 transaction commit 可以推进 current pointer 与 revision
- trace、diagnostic 与 scheduler 不得改变产品结果，用户 callback 失败必须隔离

## 目录职责

```text
src/
  trace/      领域中立执行计数、owner-bound reporter 与局部诊断
  diagnostic/ 结构化 warning / error diagnostic 契约
  error/      统一 Runtime 错误与稳定错误码
  identity/   稳定结构化 identity 与 owner index
  source/     Source typed token、作者契约与 registry-bound lifecycle executor
  computation/ Computation typed token、结果生命周期与 dependency read view
  participant/ Participant typed token、prepare / commit / rollback 与宿主 read 契约
  registry/   Source / Computation registry、重复 identity 诊断与计算拓扑顺序
  runtime/    同步事务编排、候选状态、原子发布与资源释放
  transaction/ Snapshot、revision、revision-bound change hint 与 opaque Source command
```

目录只在相应 ADR 落地时创建，不提前放占位实现。公开入口使用 owner barrel 的 `export *` 聚合。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/runtime exec oxlint . --fix
pnpm --filter @retikz/runtime exec tsc --noEmit
pnpm --filter @retikz/runtime test:changed
```
