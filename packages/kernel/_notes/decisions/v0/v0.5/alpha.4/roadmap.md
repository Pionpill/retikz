# v0.5.0-alpha.4 Path 几何、Source 校验、Source 分组、Theme 协议与 Headless Interaction 候选

- 状态：ADR-01、ADR-04、ADR-05 Proposed；ADR-02、ADR-03 Accepted；Headless Interaction Candidate
- 目标版本：`0.5.0-alpha.4`
- 前置：现有 Geometry Label、Stroke Path、Arrow Definition、Foundation JSON 与 alpha.2 identity / ownership / retained renderer 契约保持稳定；若交互方案依赖 scheduler / presentation，须先由独立 milestone 交付
- 关联：[v0.5 roadmap](../roadmap.md) · [交互与增量运行时设计](../../../../../../../notes/architecture/interaction-design.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标与 ADR

alpha.4 收敛五项 Kernel 契约与提案：无填充 Stroke Path 的居中标签产生真实描边断口；端点箭头可以按最终视觉后缘跨过逻辑端点；Source 输入只以 owner Zod schema 的 `parse` 结果作为校验与结构投影边界，删除 schema 前后的重复 JSON 处理；Core Source IR 以浅层固定分组区分视觉覆盖、布局参数、Theme、后代默认值与主要绘图事实；Theme 以目标类型组织同构的稀疏 Source 片段，保留字段覆盖和领域 owner 边界。五项契约都保持 Scene 与 renderer 边界稳定，并由 Core 或领域 owner 继续拥有最终行为与诊断。

Headless Interaction 仍只保留候选边界，尚未形成 Proposed ADR，不因与上述 ADR 同属 alpha.4 而获得实现授权。

| ADR                                              | 状态     | 主题                   | 交付                                                                |
| ------------------------------------------------ | -------- | ---------------------- | ------------------------------------------------------------------- |
| [ADR-01](./01-stroke-path-label-interruption.md) | Proposed | Stroke Path 标签断线   | 条件默认、真实几何断口、装饰连续性与不支持组合的失败语义            |
| [ADR-02](./02-path-endpoint-arrow-overlap.md)    | Accepted | Path 端点箭头重叠比例  | 视觉后缘完整进入、实例级归一化重叠、Core 统一几何与 definition 语义 |
| [ADR-03](./03-json-undefined-field-contracts.md) | Accepted | Source Zod 输入边界    | owner schema 单次 parse、删除重复 JSON 处理并保留独立 runtime 隔离  |
| [ADR-04](./04-source-ir-semantic-grouping.md)    | Accepted | Source IR 浅层语义分组 | 核心事实留根、继承语义保持、Source 扩展契约与实际消费方同步迁移     |
| [ADR-05](./05-theme-source-fragments.md)         | Proposed | Theme 稀疏 Source 片段 | 目标片段同构、字段覆盖语义、环境与默认通道分离、领域 owner 边界     |

ADR-05 承接 ADR-04 的分组契约，冻结共同 Theme 协议；各领域精确 Source、Theme 与 rules 仍由其独立版本 ADR 决定，不因本条目进入 Kernel lockstep。

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
- Source 校验统一不让 Foundation 接管领域对象 schema、错误文案、默认值、Definition 嵌套结构或 adapter-local 清理；独立 runtime mutation isolation / immutable-output 契约继续使用既有边界
- Source 分组以现行 owner Zod 输入边界为前置，同步迁移 Kernel Source、authoring、消费 Source 的扩展契约和实际下游引用；保持继承、视觉结果、Scene、identity 与既有增量能力，不保留 flat / nested 双轨，也不纳入领域 Theme 重设计
- Headless Interaction 候选不冻结具体 TypeScript API、事件列表、behavior 状态机和默认手势，也不纳入编辑器 UI、selection store、tooltip、form、workspace history 或领域交互实现
- 本 roadmap 与 Proposed ADR 不授权实现、commit、push、tag 或 publish
