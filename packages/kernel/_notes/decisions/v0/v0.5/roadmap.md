# kernel v0.5 Roadmap

## 版本目标

完善跨图元机制与组合能力，完成基于 Reconciler 的同步增量编译计算层闭环。

## 重点功能

| 重点能力       | 目标                                                                   | 相关 ADR                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 几何与文字     | 完善锚点、单轴连接、标签间距、对比色、TeX 与固定宽度                   | [001](./001-node-anchor-position.md)、[002](./002-scope-anchor-and-transform-pivot.md)、[003](./003-single-axis-path-connection.md)、[004](./004-node-text-auto-contrast.md)、[005](./005-node-label-box-spacing.md)、[006](./006-tex-math-syntax-compatibility.md)、[038](./038-node-fixed-width.md) |
| 布局与组合     | 支持上下文布局、完整 Scope 输出及跨 namespace 空间引用                 | [007](./007-layout-aware-composite.md)、[009](./009-contextual-composite-layout.md)、[017](./017-layout-proposal-probe-contract.md)、[020](./020-layout-aware-scope-output.md)、[028](./028-qualified-spatial-handles.md)                                                                             |
| 增量运行时     | 完成 Reconciler 编译树、依赖响应与同步增量计算闭环                     | [011](./011-runtime-identity-source-registry.md)、[012](./012-computation-transaction-lifecycle.md)、[013](./013-incremental-core-compile.md)、[014](./014-scene-patch-retained-renderer.md)、[016](./016-runtime-execution-policy.md)                                                                |
| 基础契约与入口 | 建立 Foundation、统一 authoring 与能力依赖接入                         | [019](./019-core-atomic-contracts.md)、[023](./023-foundation-package.md)、[026](./026-foundation-schema-primitives.md)、[027](./027-composite-dependency-provider-graph.md)、[029](./029-vanilla-authoring-normalization.md)                                                                         |
| 颜色与 Source  | 统一颜色解析、Theme 来源、Source 分组与 schema 边界                    | [024](./024-lightweight-theme-resolution.md)、[032](./032-contextual-color-resolution.md)、[035](./035-json-undefined-field-contracts.md)、[036](./036-source-ir-semantic-grouping.md)、[037](./037-theme-source-fragments.md)                                                                        |
| 路径与诊断     | 完善裁剪、居中标签断线、箭头重叠与 Inspect                             | [021](./021-extensible-inspector-content.md)、[031](./031-single-clip-definition.md)、[033](./033-stroke-path-label-interruption.md)、[034](./034-path-endpoint-arrow-overlap.md)、[039](./039-builtin-inspection.md)                                                                                 |
| Scope 外框     | 在保持内容包络、锚点与布局不变的前提下添加背景装饰                     | [044](./044-scope-frame.md)                                                                                                                                                                                                                                                                           |
| 候选方向       | Headless Interaction、协作并发、渐进物化与生成会话；不作为本版本必交项 | [040](./040-cooperative-concurrent-runtime.md)、[041](./041-progressive-materialization.md)、[042](./042-generation-session.md)                                                                                                                                                                       |

## 功能规划

### 几何与文字

主要场景：

- 节点与 Scope 需要明确的对齐点、固定宽度和变换参照。
- 标签、箭头与公式在组合图中需要更可靠的视觉定位。

规划内容：

- 完善锚点定位、单轴连接、标签间距和宽度表达。
- 补齐文字自动对比色、标签对齐与 TeX 数学语义。

预期效果：

复杂组合中的文字、标签和连接位置更可控，减少宿主侧手工修正。

### 布局与组合

主要场景：

- 嵌套 composite 要在父容器约束下完成布局。
- 一个组合需要引用另一个 namespace 中公开的空间位置。

规划内容：

- 统一上下文布局、proposal / probe 和完整 Scope 输出；作者主位置由 `position` 承担，局部变换保持辅助职责：[049](./049-scope-position-contract.md)。
- 支持空间引用与跨组合装配，保留真实布局边界及公开职责。
- 支持按需尺寸贡献查询与同次编译跨试算缓存，减少嵌套布局重复求值：[053](./053-layout-measurement-reuse.md)。
- 复用同次回调中的真实几何查询环境，减少端点与路线验证的重复编译：[054](./054-geometry-query-reuse.md)。

预期效果：

组合内容在容器约束和跨区域引用下仍能形成完整布局结果。

### 增量运行时

主要场景：

- 宿主持续修改图形，希望复用未受影响的计算与显示。
- 一组修改需要作为完整更新被运行时消费。

规划内容：

- 建立 identity、事务、增量编译和 Scene patch 的共同底座。
- 明确执行策略与 retained renderer 的协作边界。
- 本版本完成可选 Reconciler 的同步增量编译能力：Core 保持唯一绘图编译语义，Reconciler 管理编译贡献、缓存与依赖失效，Runtime 管理 candidate 隔离、结果生命周期和原子提交。
- 包边界确定为 Reconciler 单向依赖 Core 与 Runtime，Core 不再直接依赖 Runtime 或 Reconciler。Core 保留静态编译及其所需的 IR、绘图语义、编译贡献与来源契约；同次编译的布局、测量和缓存仍由 Core 负责。
- Core 专属的增量更新能力统一归 Reconciler，包括 Source / Computation 接线、跨次身份与版本关联、编译树、依赖响应、缓存复用、运行时拓扑、快照与 Scene Patch 契约及生成逻辑。Reconciler 复用 Core 的静态计算能力和 Runtime 的通用事务，不复制绘图算法或事务引擎；Render 的 retained 路径消费 Reconciler 的公开输出契约。
- 静态编译保持独立，不初始化跨次缓存或增量事务；完整快照与权威局部更新进入同一状态模型，局部更新不依赖根 IR 的全量深比较。
- 将 trace 领域阶段与计数单位交由 owner 声明并注入，保持 Runtime 领域中立：[050](./050-runtime-trace-owner-declarations.md)。

Reconciler 按以下能力依赖顺序推进；各阶段共同构成本版本目标，单节点改色不是最终交付边界：

| 阶段                | 目标与主要内容                                                                                 | 完成边界                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1. 基础契约         | 明确包职责、Core 编译贡献、权威局部命令、稳定身份、候选状态与完整结果读取契约                  | 定义输入到提交的完整语义；区分非法命令拒绝与合法候选的完整编译回退，确定完整结果的物化时机                                |
| 2. 编译树与最小闭环 | 建立可选 Reconciler；首次编译收集贡献，维护 current / candidate 与结构共享，实现定点 Node 更新 | 不通过根 IR 深比较完成局部编译和 Patch；缓存及索引随 Runtime 事务发布，失败不污染 current                                 |
| 3. 依赖响应         | 记录语义读取依赖，传播失效，按需重算并以输出版本停止无效传播                                   | Node 几何变化更新实际关联的 Path；输出未变时复用下游结果，不默认建立属性级响应式状态                                      |
| 4. 结构与 Scope     | 支持插入、删除、重排、Scope 上下文、名称解析与布局边界                                         | 正确处理前向引用、未命中后新增、同名遮蔽与跨 Scope 引用；Scope 可作组织边界，但不强制整组重算                             |
| 5. 完整产物与扩展   | 纳入资源、文本度量、空间句柄、artifacts、诊断、Composite 与观察能力                            | 全部可观察产物保持同 revision 一致；不跨次复用 compile-local token；内置和自定义能力共用契约，无法安全细分的边界明确重算  |
| 6. 上层接入契约     | 预留完整输入、局部命令、身份映射、领域贡献与失效信息的交接契约                                 | Kernel 内验证契约闭环；Vanilla、React、Plot 等上层包的实际接入与领域优化不作为本版本完成条件                              |
| 7. 性能与版本收口   | 验证静态与 retained 首次计算、局部更新、完整替换、内存与失败恢复；同步文档并收敛旧路径         | 局部计算成本主要随变化及真实依赖范围增长；明确剩余全量成本，保证与完整编译可观察等价，不承诺 retained 首次计算快于 static |

编译贡献树负责结果归属与复用，输入树保留声明结构，依赖图表达跨实体计算关系，三者不强求一一对应。具体公开 API、数据结构与失败语义通过后续 ADR 冻结。

本轮范围限于计算层与必要的输出契约，不包含绘制层优化。上层包后续按实际接入需求逐步优化，不提前实现 Plot / Table 领域增量引擎。Concurrent、Scheduler、时间切片与渐进呈现仍属于候选方向，不纳入本轮必交范围。

预期效果：

已知局部变化可以直接定位编译单元，沿真实依赖重算并复用其它贡献，以完整事务发布一致结果；完整输入替换仍保留安全的全量处理路径。

### 基础契约与入口

主要场景：

- 多个包需要共享原子契约与基础 schema。
- 作者和扩展包需要一致的输入规范化与能力依赖表达。

规划内容：

- 建立 Foundation，收敛通用契约和基础 schema 所有权。
- 统一 authoring 入口与 composite 依赖接入，减少平行解释。
- Composite 统一使用 compile，布局能力按需调用，移除独立展开通道：[052](./052-unified-composite-compilation.md)。
- 支持共享异步作者准备与实例运行时输入，保持同步编译和原子发布：[047](./047-async-authoring-preparation.md)、[048](./048-composite-runtime-input.md)。

预期效果：

跨包基础概念有独立真源，扩展和作者输入不再重复定义共同机制。

### 颜色与 Source

主要场景：

- 主题需要继承、覆盖并投影到不同能力 owner。
- Source 默认片段与颜色来源需要保持清晰且可组合。

规划内容：

- 统一轻量 Theme、上下文颜色与 Source 语义分组。
- 收敛默认片段和 schema 边界，使源输入不承载冗余派生状态。

预期效果：

作者可以理解颜色和默认配置的来源，并在嵌套组合中精确覆盖。

### 路径与诊断

主要场景：

- 路径中部标签与端点箭头会影响连线的可见范围。
- 宿主需要检查当前图形、布局与扩展能力的结果。

规划内容：

- 完善裁剪、居中标签断线和箭头视觉重叠处理。
- 扩展 Inspect 内容与内置检查能力，不把诊断实现混入领域模型。

预期效果：

路径呈现与检查工具能反映真实图形关系，便于理解和诊断。

### 候选方向

主要场景：

- 复杂内容可能需要协作调度、渐进呈现或生成会话。
- 后续交互能力需要宿主无关的共享底座。

规划内容：

- 保留 Headless Interaction、Concurrent、渐进物化与生成会话候选。
- 编译产物与 Inspect 数据来源统一（待研究）：评估丰富节点等附加产物，让 Inspect 消费统一产物契约，减少布局摘要与观察输出的重叠。需明确按需收集、主题与坐标上下文、辅助图形编译及增量结果一致性；是否保留观察通道、调整节点产物命名，留待后续设计决定。
- 候选不作为必交项；设计接受、实现授权与实际交付分别判断。

预期效果：

后续能力保留明确探索入口，但不会绑架已完成内容的正常发布。

## 边界与依赖

领域图形、自动图布局、编辑器与单一 renderer 特性不进入 Kernel；候选是否进入执行须独立确认。
