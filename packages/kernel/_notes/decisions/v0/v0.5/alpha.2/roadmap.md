# v0.5.0-alpha.2 增量性能、Runtime 策略、Box Layout 与 Theme 基建

- 状态：ADR-01～09 已完成实现、测试、双语文档与 Accepted 收口
- 目标版本：`0.5.0-alpha.2`
- 关联：[v0.5 roadmap](../roadmap.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标

alpha.2 交付 `sync + atomic + incremental` 的第一条完整更新链路，并补齐 Standard Box Layout 所需的通用 Core child layout contract：完整 Snapshot 仍是真源，同步 Runtime 根据 ChangeSet 或前后 Snapshot 做局部失效，Core 只重算必要 contribution，renderer 只提交必要 Scene Patch；任何阶段无法证明局部等价时扩大失效范围或完整重建。Box、Flex、Grid、Overlay solver 的领域规则与 baseline alignment policy 仍由 Standard 拥有，Kernel 提供双轴 proposal、minimum / natural probe、resolved slot、真实 allocation / visual bounds、alignment guide、隔离失败与 replay wrapper。

本 milestone 另补一条可持久化的通用 Theme 环境：Scene / Scope 保存共享 style 与 mode，Core 按字段继承并把完整有效 Theme 交给 Composite；领域 owner 继续拥有自己的 token vocabulary、preset 具体值和 mapping，Core primitive 与 renderer 不按主题分支。

本 milestone 不以极限大数据吞吐为目标，而以中等规模图形持续更新时减少无效工作、缩短更新延迟和 renderer commit 为验收重点。首次完整渲染不得明显退化。

## ADR 索引

| ADR                                                  | 状态     | 主题                                 | 交付                                                                                       |
| ---------------------------------------------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| [ADR-01](./01-performance-observability-baseline.md) | Accepted | 性能观测与 baseline                  | 冻结场景、指标、tracing 与回归预算                                                         |
| [ADR-02](./02-runtime-identity-owner-registry.md)    | Accepted | Runtime identity / owner             | 冻结 identity、Snapshot、owned value、Owner Definition 与 registry                         |
| [ADR-03](./03-program-transaction-lifecycle.md)      | Accepted | Program / transaction lifecycle      | 冻结依赖图、revision、candidate、fallback、observer 与同步原子提交                         |
| [ADR-04](./04-incremental-core-compile.md)           | Accepted | Core 增量编译                        | 冻结完整 Program、stable Diff、fallback 与首个安全局部更新闭环                             |
| [ADR-05](./05-scene-patch-retained-renderer.md)      | Accepted | Scene Patch 与 retained renderer     | 冻结 identity topology、commit participant 与 SVG/Canvas retained lifecycle                |
| [ADR-06](./06-box-layout-composite-contract.md)      | Accepted | Box Layout Composite contract        | 冻结双轴 constraint、allocation / slot-size feedback、nested propagation 与 replay wrapper |
| [ADR-07](./07-runtime-execution-policy.md)           | Accepted | Runtime 执行模式与更新策略           | 显式选择 static / retained，并在 retained Session 中选择 auto / full 更新                  |
| [ADR-08](./08-layout-proposal-probe-contract.md)     | Accepted | Layout proposal / probe contract     | 冻结双轴 proposal、minimum / natural、resolved slot、guide、failure isolation 与 replay    |
| [ADR-09](./09-inherited-theme-context.md)            | Accepted | 可继承 Theme IR 与 Composite context | 冻结 Scene / Scope Theme、字段级继承、Composite 消费与领域边界                             |

## 当前进度

- ADR-01～03 已完成实现、自动化验证、Runtime 中英文文档与 changelog，并于 2026-07-27 获人工接受。
- ADR-04 已完成 canonical Scene topology、Core Program full oracle、ChangeSet/Snapshot 校验、stable/nested Diff、full fallback 与单 root Node fill 局部增量闭环，并于 2026-07-28 按当前安全子集获人工接受；通用 contribution 与其它图元局部失效不属于本次 Accepted 事实。
- ADR-05 已完成 Runtime commit participant、Render retained runtime、SVG/Canvas事务后端、React/Vanilla session接线、5000规模确定性/计时门禁与双语文档，并于2026-07-29获人工接受。
- ADR-06 已完成双轴 constraint、`slotSize`、显式 composite allocation、完整 replay wrapper、Table consumer 迁移、对抗测试与双语文档，并于 2026-07-28 获人工接受。
- ADR-07 已完成 Architecture Gate、Runtime/Core/Render/React/Vanilla实现、SVG/Canvas三策略Bench A/B、对抗测试与双语文档，并于2026-07-29获人工接受。
- ADR-08 已完成双轴 proposal、resolved slot、真实 allocation / visual bounds、alignment guide、隔离 failure、one-use replay、Table consumer 迁移、对抗测试与双语文档；Architecture Gate Round 3/3 PASS，并于 2026-07-30 获人工接受。
- ADR-09 已完成严格 JSON Theme IR、Scene / Scope 字段级继承、expand 与 layout-aware Composite context、runtime Scope、probe / replay、lowering、retained fallback、React / Vanilla parity、renderer parity、对抗复验与双语文档；Architecture Gate Round 2 PASS、Plan Gate Round 4 PASS，并于 2026-08-03 完成 Accepted 收口。

## 执行批次

| 批次 | ADR    | 进入条件                                               | 退出条件                                                                   |
| ---- | ------ | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| 0    | ADR-01 | alpha.1 发布准备完成                                   | Runtime trace 切片、full baseline 与预算获得人工确认                       |
| 1    | ADR-02 | ADR-01 runtime/trace 可复现                            | identity、Owner Definition/registry 与 owned value 稳定                    |
| 2    | ADR-03 | ADR-02 owner contract Accepted                         | 同步 Program graph / transaction lifecycle 稳定                            |
| 3    | ADR-04 | ADR-03 Accepted                                        | 完整 Program、stable Diff、fallback 与首个安全局部更新闭环稳定             |
| 4    | ADR-06 | alpha.1 ADR-07 已 Accepted；Standard Core Gate 已明确  | 完整 compile 的双轴 constraint、slot size、nested 与 wrapper contract 稳定 |
| 5    | ADR-05 | ADR-04 可产出稳定 Scene Patch                          | SVG / Canvas patch 与完整 redraw 等价，并有可测收益                        |
| 6    | ADR-07 | ADR-03～05 Accepted                                    | static / retained 与 auto / full 可显式选择、对比并保持默认行为不变        |
| 7    | ADR-08 | ADR-06 Accepted；Standard alpha.2 Core Gate 缺口已明确 | proposal / probe / slot / guide / failure / replay contract 稳定           |
| 8    | ADR-09 | 通用视觉主题 owner 与 Scene / Scope 继承方向已人工确认 | Theme IR、Composite context、第三方消费边界与入口等价性稳定                |

批次存在硬依赖，不并行实施。每条 ADR 分别完成 `test-contract`、Architecture Gate 与人工实现授权。

## 共同不变量

1. Snapshot 是完整事实；ChangeSet、Patch、cache 和 retained state 都可丢弃并从 Snapshot 重建。
2. alpha.2 虽只同步执行，候选 revision 与当前已提交状态仍隔离，commit 一次切换 document、Scene、provenance 与索引。
3. 领域 owner 决定 identity、依赖、key 和最小失效边界；Runtime 不猜测 Plot、Table 或 Core 语义。
4. 增量与完整重建可观察等价；fallback 只影响性能。
5. React / Vanilla、SVG / Canvas 共享契约，adapter 与 renderer 不建立平行 IR 或更新协议。
6. 内置与第三方 Program 使用同一 full-run、incremental、fallback 与 diagnostics 边界。
7. Theme 选择持久化在 Scene / Scope IR；Core 只解析继承并传递有效环境，领域 owner 自行物化默认 token，renderer 不读取 style / mode。

## Milestone 验收

- benchmark 覆盖5000实体首次渲染、单实体更新、稳定Group update、replace fallback与真实dispose live handles。
- 至少一个真实持续更新场景贯通 `Snapshot / ChangeSet → Core 增量 compile → Scene Patch → SVG / Canvas retained commit`。
- 任意合法 `IRChild` 可通过同一 layout-aware Composite 主链接受双轴 minimum / natural / range / exact proposal，返回 resolved slot、真实 allocation / visual bounds、可选 alignment guides 或隔离 failure，并以 transform / clip wrapper replay；target slot 位置、baseline alignment policy 与 overflow 由父 solver 决定，nested layout 与空 container 不需要 Standard 私有测量或透明 primitive。
- 每个增量场景都有与完整重建的等价性证据；错误或不安全输入明确 fallback。
- 同时记录同环境median/p95/max、访问/复用/变更实体数、Patch/trace基数、renderer commit与live handles。
- 首次完整渲染和静态 SSR / 导出路径没有超出 ADR-01 冻结的回归预算。
- React 与 Vanilla 暴露等价的同步 update 语义；不承诺 Concurrent 或 progressive presentation。
- Scene / Scope Theme 可 JSON 往返并按字段继承，两类第三方 Composite 在相同位置读取同一有效 Theme；runtime Scope 与 probe / replay 语义明确，Core-only 子树保持输出不变。领域默认物化与旧字段迁移由各领域后续 ADR 验收。

## 后续性能遗留

- reorder、全局layout fallback、快速连续revision与真实Tier 2 nested fixture尚未进入正式benchmark门禁。
- 最长阻塞与session内存尚未形成稳定、可复现的机器预算；alpha.2只冻结wall-clock统计、确定性work与live handle证据。
- 上述场景需在后续milestone补独立fixture、full oracle和同fingerprint baseline，不能从alpha.2现有结果外推。

## 不在 alpha.2 范围

- cooperative scheduler、优先级、取消、Worker 与时间片预算。
- progressive materialization 与 LLM generation session。
- pointer、keyboard、focus、selection、drag、brush、zoom 等交互语义。
- Plot / Table 的完整领域增量算法；alpha.2 只要求至少一个跨 Tier fixture 验证通用契约。
- Box / Flex / Grid / Overlay solver、LayoutItem schema、Standard baseline alignment policy 与完整 CSS intrinsic sizing；Core 只提供领域中立的 alignment guide contract。
- 为既有 `0.x` API 保留兼容桥接。

## 授权边界

本 roadmap 的 Accepted 状态只记录已获人工确认的完成事实。其余 Proposed ADR 仍不授权实现；本文件也不授权 commit、tag、publish 或 push。

## 历史设计记录

本目录中的 [上下文化 Composite 布局事务](./01-contextual-composite-layout.md) 曾以 alpha.2 ADR-01 立项，现已由 [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) 取代并完成实现、测试、文档与 Accepted 收尾。该文件仅保留为 Superseded 设计记录，不属于本 milestone 的现行 ADR 序列。
