# v0.5.0-alpha.3 Concurrent 与渐进生成

- 状态：Proposed
- 目标版本：`0.5.0-alpha.3`
- 前置：alpha.2 的 Runtime、增量 compile 与 retained renderer 已 Accepted
- 关联：[v0.5 roadmap](../roadmap.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [交互与增量运行时设计](../../../../../../../notes/architecture/interaction-design.md)

## 目标

alpha.3 在 alpha.2 的同步增量 Runtime 上增加 `concurrent + atomic/progressive` 执行能力。Program 可以按 capability 阻塞执行、协作让出或 offload；Runtime 可以取消过期 prepare，并在 revision 校验后串行原子提交。表现层可以显式选择渐进物化；generation session 可以提交多批语义合法的 draft transaction。

Concurrent、渐进物化与渐进生成是三个不同层次：调度决定工作何时执行，materialization 决定同一 Scene 如何显示，generation 决定语义 Snapshot 如何分批增长或修正。

## ADR 索引

| ADR                                              | 状态     | 主题                 | 交付                                                                                      |
| ------------------------------------------------ | -------- | -------------------- | ----------------------------------------------------------------------------------------- |
| [ADR-01](./01-cooperative-concurrent-runtime.md) | Proposed | Concurrent scheduler | Program capability、优先级、cooperative yield、取消、Worker 与原子 commit                 |
| [ADR-02](./02-progressive-materialization.md)    | Proposed | 渐进物化             | atomic/progressive 策略、materialization revision、回滚、命中一致性与 capability fallback |
| [ADR-03](./03-generation-session.md)             | Proposed | Generation session   | draft transaction、checkpoint、取消、接受后 squash 与 LLM 渐进生成边界                    |

## 执行批次

| 批次 | ADR    | 进入条件                                | 退出条件                                     |
| ---- | ------ | --------------------------------------- | -------------------------------------------- |
| 0    | ADR-01 | alpha.2 Runtime contract Accepted       | concurrent prepare、取消与原子 commit 可验证 |
| 1    | ADR-02 | scheduler 与 retained renderer 可组合   | 渐进画面、geometry、hit-test 与完成状态一致  |
| 2    | ADR-03 | transaction 与 materialization 边界稳定 | 多批 draft 可恢复、取消、接受并 squash       |

## 共同不变量

1. Concurrent 只并发 prepare；正式 semantic commit 串行且原子。
2. 取消是优化，revision 校验是拒绝过期结果的正确性边界。
3. 未声明 capability 的内置或第三方 Program 默认 blocking。
4. 渐进物化不产生部分 document、contribution 或 Scene commit。
5. LLM draft transaction 与 renderer materialization batch 不是同一协议。
6. Kernel generation session 不包含模型调用、prompt、聊天 UI 或 LLM 专属 IR。

## Milestone 验收

- 连续高频 revision 可以取消或废弃旧 prepare，过期结果永不提交。
- blocking / chunkable / offloadable Program 在 React 与 Vanilla 中共享语义。
- atomic 模式保持 alpha.2 的完整 view 原子切换；progressive 模式显式启用、可回退、可诊断。
- 渐进期间可见内容、geometry、hit-test、事件 target 与 materialization state 一致。
- generation session 支持多批合法 draft、checkpoint、取消、恢复和接受后 squash。
- 基准记录最长主线程阻塞、取消浪费、首个可见批次、完整物化时间与 session 内存。

## 不在 alpha.3 范围

- Kernel 内置 pointer / keyboard / focus / selection / drag / brush / zoom behavior。
- prompt 管理、模型 SDK、token stream、聊天界面或业务 AI workflow。
- Workspace history、协作、CRDT 与持久 undo log。
- Tier 2 私有交互语义或编辑器状态机。

## 授权边界

本 roadmap 与 Proposed ADR 只授权设计审查，不授权实现、commit、tag、publish 或 push。
