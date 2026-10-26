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
| 颜色与 Source  | 统一颜色解析、Theme 来源、Source 分组与 schema 边界                    | [024](./024-lightweight-theme-resolution.md)、[032](./032-contextual-color-resolution.md)、[035](./035-json-undefined-field-contracts.md)、[036](./036-source-ir-semantic-grouping.md)、[037](./037-theme-source-fragments.md)、[071](./071-macro-visual-property-resolution.md)                      |
| 路径与诊断     | 完善裁剪、居中标签断线、箭头重叠与 Inspect                             | [021](./021-extensible-inspector-content.md)、[031](./031-single-clip-definition.md)、[073](./073-clip-params-envelope.md)、[033](./033-stroke-path-label-interruption.md)、[034](./034-path-endpoint-arrow-overlap.md)、[039](./039-builtin-inspection.md)                                           |
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
- 统一 Vanilla 与 React 的默认文字测量、显式覆盖及无浏览器能力时的估算降级：[056](./056-vanilla-default-text-measurement.md)。

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
- 本版本完成可选 Reconciler 的同步增量编译能力：Core 保持唯一绘图编译语义，Reconciler 管理编译贡献、缓存与依赖失效，Reconciler 管理 candidate 隔离、结果生命周期和单目标原子提交。
- 包边界确定为 Reconciler 单向依赖 Core 与 Foundation，Core 不再直接依赖 Runtime 或 Reconciler。Core 保留静态编译及其所需的 IR、绘图语义、编译贡献与来源契约；同次编译的布局、测量和缓存仍由 Core 负责。
- Core 专属的增量更新能力统一归 Reconciler，包括编译会话接线、跨次身份与版本关联、编译树、依赖响应、缓存复用、运行时拓扑、快照与 Scene Patch 契约及生成逻辑。Reconciler 复用 Core 的静态计算能力和已有 Weave 状态事务，不复制绘图算法或事务引擎；Render 的 retained 路径消费 Reconciler 的公开输出契约。
- 静态编译保持独立，不初始化跨次缓存或增量事务；完整快照与权威局部更新进入同一状态模型，局部更新不依赖根 IR 的全量深比较。
- 支持多次独立更新请求在明确批次边界内合并为一次事务，基于最终有效变化统一分析依赖并整体重算、生成 Patch 和提交，避免逐请求重复完整计算；在领域语义可证明等价时压缩更新，覆盖式赋值保留最终值，相对增量累积。合批与压缩必须保持必要的顺序、校验和失败语义，批次边界及领域合并契约在后续设计中明确。
- 移除独立 Runtime；trace 原子类型归 Foundation，各 owner 发射，工具负责校验与聚合：[064](./064-remove-runtime.md)。

Reconciler 按以下能力依赖顺序推进；各阶段共同构成本版本目标，单节点改色不是最终交付边界：

| 阶段                      | 目标与主要内容                                                                                                                                                | 完成边界                                                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Weave 编译树基础       | 确定 WeaveNode、WeaveRoot 的数据结构、输入与 Core 只读编译缓存、声明关系、计算关联、名称索引及已提交与候选版本隔离边界                                        | 结构与操作语义可独立验证，采用稳定节点与 current / pending 双状态隔离，明确依赖就绪与整批提交边界；暂不接入现有编译与更新链路                                                                                                                                      |
| 2. 编译接入与最小更新闭环 | 重构 Core，为各类基础元素提供与 NodeLayout 同等职责的可缓存编译状态；构建 Weave 树 并接入完整输入、权威局部更新、同步计算与单目标输出提交，实现定点 Node 更新 | Core 明确只读编译状态的类型、跨次有效性及公开获取契约，替换阶段一的 compiled 类型占位；不通过根 IR 深比较完成局部编译和 Patch；整批计算完成后发布输出，失败不发布部分输出；失败时保留 current 并丢弃 pending，明确未提交更新的重试、完整编译回退及完整结果读取语义 |
| 3. 依赖响应               | 记录语义读取依赖，传播失效，按需重算并以输出版本停止无效传播                                                                                                  | Node 几何变化更新实际关联的 Path；输出未变时复用下游结果，不默认建立属性级响应式状态                                                                                                                                                                               |
| 4. 结构与 Scope           | 支持插入、删除、重排、Scope 上下文、名称解析与布局边界                                                                                                        | 正确处理前向引用、未命中后新增、同名遮蔽与跨 Scope 引用；Scope 可作组织边界，但不强制整组重算                                                                                                                                                                      |
| 5. 完整产物与扩展         | 纳入资源、文本度量、空间句柄、artifacts、诊断、Composite 与观察能力                                                                                           | 全部可观察产物保持同 revision 一致；不跨次复用 compile-local token；内置和自定义能力共用契约，无法安全细分的边界明确重算                                                                                                                                           |
| 6. 上层接入契约           | 预留完整输入、局部命令、身份映射、领域贡献与失效信息的交接契约                                                                                                | Kernel 内验证契约闭环；Vanilla、React、Plot 等上层包的实际接入与领域优化不作为本版本完成条件                                                                                                                                                                       |
| 7. 性能与版本收口         | 验证静态与 retained 首次计算、局部更新、完整替换、内存与失败恢复；同步文档并收敛旧路径                                                                        | 局部计算成本主要随变化及真实依赖范围增长；明确剩余全量成本，保证与完整编译可观察等价，不承诺 retained 首次计算快于 static                                                                                                                                          |

第二阶段通过 [060](./060-core-element-compilation.md) 明确 Core 的逐元素编译状态、可独立调度入口、可持有环境、依赖读取和输出组装契约，全量与增量编译复用同一计算语义；通过 [061](./061-weave-core-integration.md) 确定 Weave 构建、环境与绑定持有、单元素调用及输出准备的接入边界；通过 [062](./062-weave-node-state-isolation.md) 建立稳定节点双状态并适配首次编译，通过 [063](./063-weave-incremental-update.md) 定义批次更新、分阶段依赖调度与事务提交；依赖粒度和局部 Render 更新继续独立细化。

后续待办：先由 Core 保持有效属性的语义组织，分离可复用布局结果与绘制计算，明确 layout / paint 变化影响及依赖传播边界：[065](./065-compiled-layout-paint.md)。编译产物及 Scene 不强制按 layout / paint 分组；更细的 size / position 等分类及结果比较算法继续独立设计。

后续待办：细粒度失效比较。当前保留保守传播：节点失效时递归标记直接与间接消费者，Scope 同时标记子元素，不先比较编译结果是否实际变化。后续结合 context / compile 来源、paint / layout 等变化维度及消费者实际依赖，比较有效输入与编译产物，只传播真实影响；输出未变时停止下游失效传播，避免无关消费者和 Scope 后代重复编译。具体粒度与比较算法另行设计，不纳入当前实现。

后续待办：自身输入的前后比较。当前更新操作直接写入 own 输入并传播失效，即使新旧内容相同也会重新编译；缓存复用检查仅比较继承 context，未比较 own。后续在写入自身输入并传播失效前比较新旧输入，优先通过引用相等快速判断，必要时比较结构内容；相等时跳过该次输入引起的失效与下游传播，但不清除其他来源已产生的失效标记。比较与批次合并语义一并明确，不纳入当前实现。

后续待办：接入 Composite 编译结果。由 Core pipeline 处理 Composite，展开后的 Node、Coordinate、Path、Scope 统一进入 Weave 构建与计算；Weave 不承担 Composite 解析或展开语义。接入须保留同次编译的来源、artifacts 与必要上下文，保证最终输出一致；当前先完善基础元素链路，含 Composite 的输入继续保留 Core 完整编译路径，统一接线另行处理。

第二阶段对接 Core 时建立 Scope 定位能力：增量模式下所有 Scope 均具备同一 Weave 树 内唯一的 id，未提供时自动分配，并在对应 Scope 生命周期内保持稳定；WeaveRoot 维护 Scope id 注册表，root 提供同等定位入口。自动 id 属于 Weave 运行时信息，不回写用户 IR，不额外触发包络计算，也不受子元素局部命名空间影响。为后续水合与 API 更新保留“所属 Scope id + 直接 children 索引”的元素定位关联；索引只对对应结构版本有效，新旧 Scope 的匹配及结构变化后的地址有效性须在接入时明确。上层可直接定位并更新 Scope，由 Weave 传播上下文，无需上层逐元素提交修改；水合交互与 Plot 实际接入仍按各自后续范围推进。

后续待办：接通 Weave 元素地址、渲染快照与水合回调。SVG / Canvas 使用统一的事件目标契约，携带所属容器 scopeId 与直接 children 下标，并关联对应快照版本；同一声明元素生成的多个绘制图元映射到同一个元素地址，由 Reconciler 定位节点，不对外暴露可变 WeaveNode。接入时明确完整重建、删除与重排后的地址失效规则，防止旧事件误更新新树；该能力随后续水合接入处理，不纳入当前基础编译实现。

采用单一 Weave 节点体系承载输入、Core 只读编译产物与关联状态；声明层级、结果归属和计算依赖是不同逻辑关系，不预设维护独立同构的输入树与编译树。Scope 上下文沿声明结构传递，跨元素计算依赖支持后续失效传播与调度。现有增量能力的包归属迁移与 Core 静态编译边界见 [055](./055-reconciler-extraction.md)；Weave 基础结构与状态语义先行确定：[058](./058-weave-foundation.md)；批次增删改与更新计算契约见 [059](./059-weave-batch-operations.md)；编译接入与依赖响应继续分阶段明确。

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
- 收敛动画属性与关键帧值契约，补齐填充／描边透明度和虚线偏移动画，统一 SVG／Canvas 求值边界：[074](./074-animation-property-contract.md)。
- 箭头与 Pattern 内容统一使用基础场景图元，定义侧封装归能力 owner，补齐资源与运行时消费：[070](./070-marker-scene-primitives.md)。
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
- 完整承接上层职责内适用的基础绘制属性，统一实例配置与 Definition 消费边界：[072](./072-complete-drawing-property-propagation.md)。
- 默认配置按宿主组织，完整支持标签与箭头默认、字体继承及宿主级重置：[067](./067-host-owned-defaults.md)。

预期效果：

作者可以理解颜色和默认配置的来源，并在嵌套组合中精确覆盖。

### 路径与诊断

主要场景：

- 路径中部标签与端点箭头会影响连线的可见范围。
- 宿主需要检查当前图形、布局与扩展能力的结果。

规划内容：

- 完善裁剪、居中标签断线和箭头视觉重叠处理。
- 分离端点箭头与沿线标记，支持普通图元标记和箭头外观复用，统一弧长定位：[075](./075-path-arrows-and-marks.md)。
- 优化标签断线的编译开销：按实际断线需求选择处理路径，无需断线时跳过专用计算，有断线需求时才进入完整截断链路；保持标签定位、箭头与最终绘制结果一致。
- 扩展 Inspect 内容与内置检查能力，不把诊断实现混入领域模型。

预期效果：

路径呈现与检查工具能反映真实图形关系，便于理解和诊断。

### 候选方向

主要场景：

- 复杂内容可能需要协作调度、渐进呈现或生成会话。
- 后续交互能力需要宿主无关的共享底座。

规划内容：

- 保留 Headless Interaction、Concurrent、渐进物化与生成会话候选。
- Inspect 实现替换（后续规划）：移除现有编译观察机制，替代方案与能力闭环待设计。
- 候选不作为必交项；设计接受、实现授权与实际交付分别判断。

预期效果：

后续能力保留明确探索入口，但不会绑架已完成内容的正常发布。

## 边界与依赖

领域图形、自动图布局、编辑器与单一 renderer 特性不进入 Kernel；候选是否进入执行须独立确认。

- Scope 不再绘制外框，保留包络与引用：[068](./068-remove-scope-frame.md)

- 主题名称与定义入口统一命名：[069](./069-theme-naming.md)

- Shape 内容包围尺寸与中心偏移统一返回，保持布局和定位行为：[076](./076-shape-circumscribed-geometry.md)
