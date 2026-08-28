# v0.5.0-alpha.4 Headless Interaction 候选

- 状态：Candidate
- 目标版本：`0.5.0-alpha.4`
- 前置：alpha.2 的 identity / ownership / retained renderer 已 Accepted；若交互方案依赖 scheduler / presentation，须先由独立 milestone 交付
- 关联：[v0.5 roadmap](../roadmap.md) · [交互与增量运行时设计](../../../../../../../notes/architecture/interaction-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 根问题

当前 hydration 可以把 DOM 或 Canvas 事件绑定到 Scene id，但 Kernel 没有统一的 headless target、ownership routing、behavior、presentation 与 domain intent 契约。React、Vanilla、SVG、Canvas 和 Tier 2 若各自解释 hover、selection、drag 或 brush，会形成平行交互语义。

alpha.4 候选目标是在不引入编辑器 UI 或业务状态机的前提下，让 renderer event 通过稳定 identity 与 ownership 路由到 Core 或 Tier 2 owner；瞬时反馈进入 presentation，持久修改回到 owner transaction。

## 候选 ADR 分解

| 候选                            | 根问题                                           | 预期边界                                                                |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Interaction target 与 manifest  | Scene id 不足以表达多 primitive 对一个语义 owner | Core 定义 renderer-agnostic target / role / intent / ownership manifest |
| Event normalization 与 behavior | SVG / Canvas 事件、坐标和生命周期不一致          | Render 归一事件，Interaction 组合 behavior，不建立内置领域白名单        |
| Presentation 与 domain intent   | 高频反馈不应逐帧改 IR，持久更新不能绕过 owner    | presentation 驱动瞬时反馈，intent 经 transaction 提交领域 Snapshot      |

## 进入 Proposed 的条件

1. alpha.2 的 identity、transaction 与 retained view 契约已稳定；所需 materialization / scheduler 能力已先行交付或明确不依赖
2. 至少提供 Core 图元与一个 Tier 2 的真实交互场景，证明 ownership routing 的最小需求。
3. 分别确认 pointer、keyboard、focus 与 viewport 事件的可观察边界，不从单一 DOM demo 反推 API。
4. 每条 ADR 独立创建 `test-contract` 矩阵并通过 Architecture Gate。

## 不在本轮草案范围

- 具体 TypeScript API、事件列表、behavior 状态机和默认手势。
- 编辑器 UI、selection store、tooltip、form、workspace history 或协作。
- Plot brush、Table Cell 编辑或 Graph 连边等领域实现。
- alpha.4 的实现授权与 commit 排期。
