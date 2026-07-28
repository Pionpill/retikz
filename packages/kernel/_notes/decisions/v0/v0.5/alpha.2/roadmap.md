# v0.5.0-alpha.2 增量性能与 Box Layout 基建

- 状态：执行中（ADR-01～04 Accepted；ADR-05～06 Proposed）
- 目标版本：`0.5.0-alpha.2`
- 关联：[v0.5 roadmap](../roadmap.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标

alpha.2 交付 `sync + atomic + incremental` 的第一条完整更新链路，并补齐 Standard Box Layout 所需的通用 Core child layout contract：完整 Snapshot 仍是真源，同步 Runtime 根据 ChangeSet 或前后 Snapshot 做局部失效，Core 只重算必要 contribution，renderer 只提交必要 Scene Patch；任何阶段无法证明局部等价时扩大失效范围或完整重建。Flex、Grid、Overlay solver 仍由 Standard 拥有，Kernel 只提供双轴 constraint、slot feedback、显式 composite allocation 与 replay wrapper。

本 milestone 不以极限大数据吞吐为目标，而以中等规模图形持续更新时减少无效工作、缩短更新延迟和 renderer commit 为验收重点。首次完整渲染不得明显退化。

## ADR 索引

| ADR                                                  | 状态     | 主题                             | 交付                                                                                       |
| ---------------------------------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| [ADR-01](./01-performance-observability-baseline.md) | Accepted | 性能观测与 baseline              | 冻结场景、指标、tracing 与回归预算                                                         |
| [ADR-02](./02-runtime-identity-owner-registry.md)    | Accepted | Runtime identity / owner         | 冻结 identity、Snapshot、owned value、Owner Definition 与 registry                         |
| [ADR-03](./03-program-transaction-lifecycle.md)      | Accepted | Program / transaction lifecycle  | 冻结依赖图、revision、candidate、fallback、observer 与同步原子提交                         |
| [ADR-04](./04-incremental-core-compile.md)           | Accepted | Core 增量编译                    | 冻结完整 Program、stable Diff、fallback 与首个安全局部更新闭环                             |
| [ADR-05](./05-scene-patch-retained-renderer.md)      | Proposed | Scene Patch 与 retained renderer | 冻结 identity topology、commit participant 与 SVG/Canvas retained lifecycle                |
| [ADR-06](./06-box-layout-composite-contract.md)      | Proposed | Box Layout Composite contract    | 冻结双轴 constraint、allocation / slot-size feedback、nested propagation 与 replay wrapper |

## 当前进度

- ADR-01～03 已完成实现、自动化验证、Runtime 中英文文档与 changelog，并于 2026-07-27 获人工接受。
- ADR-04 已完成 canonical Scene topology、Core Program full oracle、ChangeSet/Snapshot 校验、stable/nested Diff、full fallback 与单 root Node fill 局部增量闭环，并于 2026-07-28 按当前安全子集获人工接受；通用 contribution 与其它图元局部失效不属于本次 Accepted 事实。
- ADR-05 已建立 Scene Patch 数据契约；retained SVG/Canvas commit、adapter session 接线与收益验证尚未完成。
- ADR-06 已建立 replay runtime output tree 与 Scope wrapper 基础；双轴 constraint、`slotSize`、显式 composite allocation 和完整 wrapper clip 合同尚未完成。

## 执行批次

| 批次 | ADR    | 进入条件                                              | 退出条件                                                                   |
| ---- | ------ | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| 0    | ADR-01 | alpha.1 发布准备完成                                  | Runtime trace 切片、full baseline 与预算获得人工确认                       |
| 1    | ADR-02 | ADR-01 runtime/trace 可复现                           | identity、Owner Definition/registry 与 owned value 稳定                    |
| 2    | ADR-03 | ADR-02 owner contract Accepted                        | 同步 Program graph / transaction lifecycle 稳定                            |
| 3    | ADR-04 | ADR-03 Accepted                                       | 完整 Program、stable Diff、fallback 与首个安全局部更新闭环稳定             |
| 4    | ADR-06 | alpha.1 ADR-07 已 Accepted；Standard Core Gate 已明确 | 完整 compile 的双轴 constraint、slot size、nested 与 wrapper contract 稳定 |
| 5    | ADR-05 | ADR-04 可产出稳定 Scene Patch                         | SVG / Canvas patch 与完整 redraw 等价，并有可测收益                        |

批次存在硬依赖，不并行实施。每条 ADR 分别完成 `test-contract`、Architecture Gate 与人工实现授权。

## 共同不变量

1. Snapshot 是完整事实；ChangeSet、Patch、cache 和 retained state 都可丢弃并从 Snapshot 重建。
2. alpha.2 虽只同步执行，候选 revision 与当前已提交状态仍隔离，commit 一次切换 document、Scene、provenance 与索引。
3. 领域 owner 决定 identity、依赖、key 和最小失效边界；Runtime 不猜测 Plot、Table 或 Core 语义。
4. 增量与完整重建可观察等价；fallback 只影响性能。
5. React / Vanilla、SVG / Canvas 共享契约，adapter 与 renderer 不建立平行 IR 或更新协议。
6. 内置与第三方 Program 使用同一 full-run、incremental、fallback 与 diagnostics 边界。

## Milestone 验收

- benchmark 覆盖首次渲染、单实体更新、reorder、全局 layout fallback、快速连续 revision 与至少一个 Tier 2 嵌套场景。
- 至少一个真实持续更新场景贯通 `Snapshot / ChangeSet → Core 增量 compile → Scene Patch → SVG / Canvas retained commit`。
- 任意合法 `IRChild` 可通过同一 layout-aware composite 主链接受双轴 constraint，返回真实 allocation / slot size / visual bounds，并以 transform / clip wrapper replay；target slot位置与对齐由父solver决定，nested layout与空container不需要Standard私有测量或透明primitive。
- 每个增量场景都有与完整重建的等价性证据；错误或不安全输入明确 fallback。
- 同时记录更新延迟、最长阻塞、访问实体数、patch 命中、renderer commit 与 session 内存。
- 首次完整渲染和静态 SSR / 导出路径没有超出 ADR-01 冻结的回归预算。
- React 与 Vanilla 暴露等价的同步 update 语义；不承诺 Concurrent 或 progressive presentation。

## 不在 alpha.2 范围

- cooperative scheduler、优先级、取消、Worker 与时间片预算。
- progressive materialization 与 LLM generation session。
- pointer、keyboard、focus、selection、drag、brush、zoom 等交互语义。
- Plot / Table 的完整领域增量算法；alpha.2 只要求至少一个跨 Tier fixture 验证通用契约。
- Flex / Grid / Overlay solver、LayoutItem schema、baseline alignment 与完整 CSS intrinsic sizing。
- 为既有 `0.x` API 保留兼容桥接。

## 授权边界

本 roadmap 的 Accepted 状态只记录已获人工确认的完成事实。其余 Proposed ADR 仍不授权实现；本文件也不授权 commit、tag、publish 或 push。

## 历史设计记录

本目录中的 [上下文化 Composite 布局事务](./01-contextual-composite-layout.md) 曾以 alpha.2 ADR-01 立项，现已由 [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) 取代并完成实现、测试、文档与 Accepted 收尾。该文件仅保留为 Superseded 设计记录，不属于本 milestone 的现行 ADR 序列。
