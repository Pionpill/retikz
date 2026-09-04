# v0.5.0-alpha.4 Path 几何、JSON 字段与 Headless Interaction 候选

- 状态：ADR-01、ADR-03 Proposed；ADR-02 Accepted；Headless Interaction Candidate
- 目标版本：`0.5.0-alpha.4`
- 前置：现有 Geometry Label、Stroke Path、Arrow Definition、Foundation JSON 与 alpha.2 identity / ownership / retained renderer 契约保持稳定；若交互方案依赖 scheduler / presentation，须先由独立 milestone 交付
- 关联：[v0.5 roadmap](../roadmap.md) · [交互与增量运行时设计](../../../../../../../notes/architecture/interaction-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标与 ADR

alpha.4 收敛三项已确认的 Kernel 契约：无填充 Stroke Path 的居中标签产生真实描边断口；端点箭头可以按最终视觉后缘跨过逻辑端点；Foundation 以一次严格 JSON 快照统一 Source IR 的 `undefined` 与 JSON-safe 边界，并为 runtime sparse patch 提供独立的 known-key 省略原子。三项能力都保持 Scene 与 renderer 边界稳定，并由 Core 或领域 owner 继续拥有最终行为与诊断。

Headless Interaction 仍只保留候选边界，尚未形成 Proposed ADR，不因与上述 ADR 同属 alpha.4 而获得实现授权。

| ADR                                              | 状态     | 主题                     | 交付                                                                             |
| ------------------------------------------------ | -------- | ------------------------ | -------------------------------------------------------------------------------- |
| [ADR-01](./01-stroke-path-label-interruption.md) | Proposed | Stroke Path 标签断线     | 条件默认、真实几何断口、装饰连续性与不支持组合的失败语义                         |
| [ADR-02](./02-path-endpoint-arrow-overlap.md)    | Accepted | Path 端点箭头重叠比例    | 视觉后缘完整进入、实例级归一化重叠、Core 统一几何与 definition 语义              |
| [ADR-03](./03-json-undefined-field-contracts.md) | Proposed | Source JSON 快照与省略值 | 一次 JSON 全树预处理、Source fail-loud 与独立的 runtime known-key undefined 省略 |

## Headless Interaction 候选

当前 hydration 可以把 DOM 或 Canvas 事件绑定到 Scene id，但 Kernel 没有统一的 headless target、ownership routing、behavior、presentation 与 domain intent 契约。React、Vanilla、SVG、Canvas 和 Tier 2 若各自解释 hover、selection、drag 或 brush，会形成平行交互语义。

Headless Interaction 的候选目标是在不引入编辑器 UI 或业务状态机的前提下，让 renderer event 通过稳定 identity 与 ownership 路由到 Core 或 Tier 2 owner；瞬时反馈进入 presentation，持久修改回到 owner transaction。

## 候选 ADR 分解

| 候选                            | 根问题                                           | 预期边界                                                                |
| ------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Interaction target 与 manifest  | Scene id 不足以表达多 primitive 对一个语义 owner | Core 定义 renderer-agnostic target / role / intent / ownership manifest |
| Event normalization 与 behavior | SVG / Canvas 事件、坐标和生命周期不一致          | Render 归一事件，Interaction 组合 behavior，不建立内置领域白名单        |
| Presentation 与 domain intent   | 高频反馈不应逐帧改 IR，持久更新不能绕过 owner    | presentation 驱动瞬时反馈，intent 经 transaction 提交领域 Snapshot      |

## Headless Interaction 进入 Proposed 的条件

1. alpha.2 的 identity、transaction 与 retained view 契约已稳定；所需 materialization / scheduler 能力已先行交付或明确不依赖
2. 至少提供 Core 图元与一个 Tier 2 的真实交互场景，证明 ownership routing 的最小需求。
3. 分别确认 pointer、keyboard、focus 与 viewport 事件的可观察边界，不从单一 DOM demo 反推 API。
4. 每条 ADR 独立创建 `test-contract` 矩阵并通过 Architecture Gate。

## 共同边界

- Path 标签断口与端点箭头重叠不新增 Scene primitive、renderer mask、DOM 测量或 adapter-local 几何，也不改变逻辑 Path、NodeTarget 或命中身份
- JSON 字段统一不让 Foundation 接管领域对象 schema、错误文案、默认值、Definition 嵌套结构或 adapter-local 清理
- Headless Interaction 候选不冻结具体 TypeScript API、事件列表、behavior 状态机和默认手势，也不纳入编辑器 UI、selection store、tooltip、form、workspace history 或领域交互实现
- 本 roadmap 与 Proposed ADR 不授权实现、commit、push、tag 或 publish
