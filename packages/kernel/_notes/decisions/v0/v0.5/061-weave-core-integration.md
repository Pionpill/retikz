---
description: 将 Core 单元素编译契约接入 Weave，确定节点缓存、树级环境、版本内绑定、声明树构建与完整输出准备边界
keywords: Weave、Core、编译接入、compiled、CompileEnvironment、上下文、命名空间、Scope、候选隔离
---

# ADR-061：Weave 编译构建与 Core 接入

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本目标](./roadmap.md)、[057](./057-scope-acyclic-geometry-references.md)、[058](./058-weave-foundation.md)、[059](./059-weave-batch-operations.md)、[060](./060-core-element-compilation.md)

## 背景与目标

Core 已提供基础元素编译状态、显式环境、读取事实与输出组装能力，Weave 已持有相应类型，但尚未形成声明树到编译产物的实际接线。本决策确定这些能力在 Weave 中的持有位置与消费契约，使后续批次执行和依赖调度基于同一套编译接入能力。

Reconciler 负责声明结构、状态生命周期、名称绑定关联与计算请求；Core 继续解释默认值、样式、布局、引用、变换和输出。接入不增加平行 IR、几何模型或绘图算法，也不把单元素函数包装成另一套全量编译语义。

## 节点编译状态

| Weave 类别 | compiled 类型        | 持有内容                                         | Core 调用                                 |
| ---------- | -------------------- | ------------------------------------------------ | ----------------------------------------- |
| Node       | `CompiledNode`       | `layout: NodeLayout` 与局部 `output`             | `compileNode`                             |
| Coordinate | `CompiledCoordinate` | id、局部 position，以及按需观察 output           | `compileCoordinate`                       |
| Path       | `CompiledPath`       | 完整 Path kind 编译后的 output                   | `compilePath`                             |
| Scope      | `CompiledScope`      | envelope、无 children 的 group 属性及自身 output | `prepareScopeCompilation`、`compileScope` |

NodeLayout 保留现有名称，是 CompiledNode 的核心布局对象，不替代完整编译状态。Path 不预设统一中心线结构；Coordinate 不强制产生可见图元；Scope 不在 compiled 中重复保存子树。

已完成节点只读持有 Core 产物，不复制其内部几何。新建或失效候选节点的 `compiled` 允许为 `null`，表示当前候选输入尚无有效结果；不得用伪造空结果或旧 compiled 表示就绪。提交条件要求所有参与输出的节点完成计算。旧版本结果只作为复用候选，满足有效性条件后才可成为新版本的有效 compiled。

Core 的 `ElementCompileResult` 区分 compiled 与 pending。pending 只记录读取事实并等待依赖，不发布诊断或半成品；错误不解释为 pending。节点的计算完成与待处理通知是不同事实，不能仅凭 pendingInputs 为空判断就绪。

## 状态持有位置

| 内容                                                      | 持有位置与生命周期                                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Core 编译配置、有效 Definition 注册表、文字测量与公式服务 | 每个版本的 Root.environment 持有 `CompileEnvironment`；配置稳定时可共享只读环境                             |
| Scene 自身配置                                            | Root 持有排除 children 的 Scene 输入；保留默认上下文、viewBox、animations 等最终编译所需事实                |
| 元素自身输入、有效父级继承上下文                          | 节点 input.own 与 input.context；Scope own 不含 children                                                    |
| Scope 子上下文与前置准备结果                              | 候选计算工作区持有 `ScopeCompilationPreparation`；子节点 input.context 接收其有效上下文，不再造一套合并配置 |
| 编译结果                                                  | 对应节点 compiled；局部资源与输出一起保留                                                                   |
| 名称索引与绑定关联                                        | 所属版本的 Root / 局部命名空间 Scope 及编译工作区；不得跨版本混用                                           |
| Scope 定位索引                                            | 每个 Root 持有该版本的 Scope / root 容器索引，与用户名称索引分离                                            |
| 元素读取事实与已完成诊断                                  | 归属对应版本、对应元素的编译记录；复用、失效或删除时一同处理                                                |
| 资源导入、观察会话、输出收集与等待队列                    | 本次候选工作区；成功或失败后结束，不作为跨批可变缓存复用                                                    |

环境由 `createCompileEnvironment` 准备，包含 shapes、boundaries、clips、arrows、patterns、pathGenerators、pathKinds、composites 和 themeStyles 等 Core 注册表。Weave 不逐节点复制注册表，不维护内置能力白名单。Definition 或服务行为改变必须显式替换环境；无法证明缓存仍有效时重新计算。

input.context 表示元素消费的有效继承上下文，Scope 为其 children 解析出的上下文由 Core 产生。根上下文通过 `resolveScopeContext` 从 Scene 默认配置与主题建立。布局 proposal、祖先 Scope 约束、调用位置、坐标变换和 observation 不是该样式上下文的一部分，由调用工作区按 `ElementCompileOptions` 显式传入。

## 声明结构与定位

Weave 保留一套 Root / Scope / 基础元素声明结构；children 有序，parent 与索引均指向所属版本，不额外维护同构 DocumentTree。完整输入建立新树；批次操作按 [059](./059-weave-batch-operations.md) 修改候选声明结构，再消费最终输入进行计算。

所有 Scope 与 root 均有树内唯一的容器定位 id。该 id 由 Reconciler 分配并在容器存续期间保持稳定，不回写 IR，也不改变 Core 包络与名称规则；用户绘图 id 仍从自身输入读取。容器定位 id 与用户 id 属于不同地址空间，不因用户 id 同名而碰撞。删除后重建产生新容器身份，完整输入重建不推断旧 Scope 与新 Scope 的对应关系。

Root 的容器索引覆盖自身与全部 Scope；Root / 局部命名空间 Scope 的 ids 索引服务用户 id 定位。child 索引仅针对指定结构版本的直接 children，不充当稳定 identity。编译调用的 irPath 按声明位置生成，仅用于来源与诊断。外部仍通过地址操作，不获得可变 WeaveNode 引用；水合事件版本关联由后续宿主接入确定。

## 名称绑定与依赖读取

用户查询索引、Core 名称可见性和计算依赖是不同关系。Weave 的 ids 不能直接作为无差别的编译名称表；调用方必须提供符合 Core 声明顺序、局部命名空间和遮蔽规则的 `CompileNamespace` 视图，不能因预先构建整树而放宽引用规则。

每个可引用绑定使用版本内不透明 token，工作区维护 token 到对应 WeaveNode 的映射。未完成绑定登记为 pending；完成后通过 `projectCompileReference` 投影可供读取的布局，再登记 ready。该投影由 Core 生成，不修改原 compiled；Path 不因此获得几何被引用能力。

每次调用返回的 `CompileRead` 均需保留，包括 namespace/name、missing、pending 和 ready。命中绑定映射到当前候选的节点关联；未命中记录保留在名称读取索引中，不能伪造生产者节点。一次编译成功后，以本次读取替换旧读取关系；等待计算保留本次已发现的阻塞信息，继续计算时可以发现更多依赖。

依赖边关联生产者与消费者，读取需求保存为分类数组，暂以 [null] 占位，不表示无依赖；反向 consumers 供后续传播使用。完整 CompileRead 保留在编译记录中，用于名称绑定、缺失名称和遮蔽失效，不作为依赖边的读取需求。分类明确前，传播默认使消费者失效，不根据占位值过滤更新；后续再确定 style / layout 等需求标识及变化匹配算法。细粒度分类与调度算法继续沿 [059](./059-weave-batch-operations.md) 细化。

## Scope 分阶段消费

Scope 上下文下传与包络上收是独立的计算职责：

- `resolveScopeContext` 解析有效继承上下文；`prepareScopeCompilation` 准备 Scope 放置目标与可提前确定的变换，可能等待外部引用
- 子元素在自身实际依赖就绪后调用对应 Core 编译入口，不把父 Scope 包络完成作为所有子元素的前置条件
- `compileScope` 消费 Core 语义要求的局部子布局，生成 Scope 包络、最终变换与自身装饰；不递归编译 children
- 引用布局由 Core 投影到正确坐标系；最终子输出通过 `assembleScopeOutput` 包装，不能重复应用变换

Scope 引用包络、可见边界与布局 allocation 不混为同一对象。Path 不加入现有 Scope 引用包络；匿名与具名 Scope 的几何贡献继续遵循 Core 规则，运行时容器 id 不改变这些规则。若接线仍需解释聚合规则，缺少的选择或投影能力应由 Core 提供，不能由 Weave 复制。

后代不得引用祖先 Scope 的几何结果。是否存在循环须按真实计算阶段与读取判断，不能把 Scope 与 children 的正常双向联系直接视为环，也不能按树深度假设全部引用已经就绪。无进展等待必须区分未定义引用、尚未就绪与实际环，遵循 Core 对应失败语义。

## 候选隔离与输出

沿用 current / candidate 双根。不可变输入、稳定环境和仍有效的 Core 产物可共享；可变 parent / children、索引、依赖集合、绑定与待处理记录必须隔离，候选内引用统一指向候选节点。具体复制算法不改变这一不变量，不预设只复制脏节点即可安全。

Weave 按声明组织已完成贡献，调用 `assembleCompileOutputs`、`assembleScopeOutput` 和 `assembleSceneCompilation` 准备完整结果。资源重映射、zIndex、裁剪、Scene 布局与输出语义继续由 Core 处理；输出组装允许遍历整树，不把单元素计算误报为整次更新已经是局部成本。

同一候选的诊断、观察、artifacts、provenance、空间句柄与 Scene 必须一致。启用观察时使用本次独占的 `createCompileObservationRuntime`；不能把旧会话生成的延迟观察内容直接并入新会话。缺少安全复用契约的附属产物必须重新准备，不能省略或拼接其它版本的 metadata。

候选树与完整输出准备都成功后，才由 Reconciler 与 Runtime 的现有提交边界一起发布；不得先切换 current 再执行可能失败的编译组装。失败丢弃候选，保留 current 与已发布输出。诊断在成功提交后派发，不能保证撤销用户服务已产生的外部副作用。未提交输入由调用方保留，本契约不引入自动无限重试。

## 完整输入与扩展能力

基础元素树直接使用上述能力构建和编译。Composite 的 probe、展开、实例输入与来源语义仍属于 Core，Weave 不运行另一套 lowering，也不从 Scene 反推基础声明。

现有完整准备链路是 Composite 的有效计算边界；当前单元素接口不等于已提供可重建全部 Composite 展开树与绑定的协议。在 Core 提供与产物同版本的展开声明和必要来源交接契约之前，含 Composite 的输入继续走已有完整准备路径，不伪造一棵声称可局部更新的 WeaveTree。替换现有完整输入链路前必须补齐该交接或明确保留该完整计算边界；不能以直接编译基础元素为由缩减既有输入能力。

新增的连接能力先验证基础元素树、单元素计算与完整结果的闭环，再接入批次调度。本文不宣称已实现结构更新算法、属性级失效、Worker 或 Render Patch 优化。React / Vanilla 的 authoring 与静态 compileToScene 行为保持不变，后续共享 Reconciler 接入同一契约，不建立 adapter 专用编译分支。

## 完整输入与批次入口边界

完整 IR 输入继续通过 Source 捕获并进行内容相等判断，变化后完整准备新树与输出。移除旧 CoreChange 变化提示、前后快照索引比对及 ChangeSetMismatch 诊断，不保留兼容出口。该决定替代 [013](./013-incremental-core-compile.md) 与 [055](./055-reconciler-extraction.md) 中有关 Core 变化提示及其私有索引的约定；Runtime 的通用 ChangeSet 契约不受影响。

后续增量修改采用 [059](./059-weave-batch-operations.md) 的显式批次契约，批次不是完整输入的附加提示。图元来源身份、Scene 快照、原子提交与完整替换能力继续保留；删除输入 diff 不改变 Render 和水合的图元定位契约。
