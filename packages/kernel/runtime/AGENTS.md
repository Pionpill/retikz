# @retikz/runtime 工作指南

本文件只写 `@retikz/runtime` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：为 Core、Tier 2 与宿主 adapter 提供领域中立的 identity、ownership、program graph、transaction、调度和执行观测底座
- **拥有的契约**：owner / program typed token 与 registry、Snapshot transaction 生命周期、revision、trace 和后续 cooperative scheduler
- **不拥有的能力**：Core IR / Scene、几何与 layout、renderer patch 算法、React / Vanilla authoring、Plot / Table 等领域 operation、模型 SDK 或业务交互状态
- **输入与输出**：接收 owner 定义、完整 Snapshot 输入、Program 定义与可选变更提示，输出已提交 revision、owner read view、program artifact 和结构化 trace；不解释领域值
- **缺口流向**：绘图语义进入 core；后端物化进入 render；宿主生命周期进入 adapter；Tier 2 operation 留在各领域包；模型调用和交互策略留在应用层

## 硬约束

- 运行时零依赖，不 import `@retikz/core`、renderer、框架、DOM 或领域包
- Snapshot 是完整真源；change set 只能作为带 base revision 的可选提示，不能独立构造下一状态
- owner / program token 必须保持 typed identity；异构 registry 只能在受控定义入口擦除泛型
- prepare candidate 与 current state 隔离；只有 transaction commit 可以推进 current pointer 与 revision
- trace、diagnostic 与 scheduler 不得改变产品结果，用户 callback 失败必须隔离

## 目录职责

```text
src/
  trace/      领域中立执行计数、owner-bound reporter 与诊断
  diagnostic/ 结构化 warning / error diagnostic 契约
  identity/   稳定结构化 identity 与 owner index
  owner/      owner typed token、author contract 与 registry-bound lifecycle executor
  registry/   owner / program typed definition registry 与重复 key 诊断
  session/    Snapshot、revision 与同步 transaction 生命周期
  program/    program graph、artifact 和 dependency read view
  transaction/ revision-bound change hint 与 opaque owner command
```

目录只在相应 ADR 落地时创建，不提前放占位实现。公开入口使用 owner barrel 的 `export *` 聚合。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/runtime exec eslint . --fix
pnpm --filter @retikz/runtime exec tsc --noEmit
pnpm --filter @retikz/runtime test:changed
```
