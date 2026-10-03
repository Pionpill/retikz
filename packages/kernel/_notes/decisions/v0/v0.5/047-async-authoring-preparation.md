---
description: Vanilla 统一异步作者输入准备与候选发布，支持 Tier 2 嵌入、SSR、更新和失效隔离，保持 Core 编译与 Runtime 事务同步
keywords: Vanilla、InputEmbed、prepare、Promise、SSR、revision、AbortSignal、processing
---

# ADR-047：共享异步作者输入准备

- 状态：Accepted
- 决策日期：2026-10-02
- 关联：[kernel v0.5 roadmap](./roadmap.md) · [包职能设计](../../../../../../notes/architecture/package-responsibility-design.md) · [Core 能力边界](../../../architecture/core-drawing-complete.md)
- 前置：[Vanilla Authoring](./029-vanilla-authoring-normalization.md) · [匿名嵌入身份](./045-anonymous-input-embed-identity.md)
- 约束：[同步事务](./012-program-transaction-lifecycle.md) · [Retained Renderer](./014-scene-patch-retained-renderer.md)
- 实例接入：[Composite 运行时输入](./048-composite-runtime-input.md)

## 背景与目标

Tier 2 作者输入可能先等待数据引擎等异步结果，再生成可同步编译的贡献。当前 InputEmbed 只有同步 lower，独立组件自行发请求不能覆盖 Layout 嵌入、无框架调用和 SSR，也无法统一防止旧请求覆盖新输入。

目标是由 Vanilla 拥有领域中立的作者输入准备和发布生命周期，领域 adapter 贡献准备逻辑。Core compile、领域 lowering、Runtime transaction 和 renderer 仍只消费完整同步输入；Promise 不进入 Source IR、Scene 或事务 participant。

## 决策：在同步编译前准备完整作者贡献

`@retikz/vanilla` processing 提供异步作者入口。它确定与同步路径相同的声明位置、匿名身份和有效 Theme，先收集本次作者树的全部 preparation，准备成功后才依声明顺序执行并汇合 contribution。之后复用唯一的同步 Source 归一化、provider graph resolver、compile driver 和 static/retained 发布链。

prepare 只检查能力、解析声明和建立依赖，不执行数据变换或搬运行数据。execute 完成领域计算并生成既有 InputEmbedContribution；所有 contribution 就绪后才开始 Core 编译和 Runtime transaction。准备失败或输入失效不发布部分 contribution、部分 Scene 或新 revision。

同步与异步 adapter 使用同一个按 kind 注册的入口，重复 kind 失败。一个 adapter 可以同时提供同步 lower 和异步准备能力，官方 Tier 2 不需要注册两个同 kind 的 adapter。同步入口只消费 lower；异步入口要求 prepare，不在执行阶段调用未经准备的 lower。内置与第三方没有特殊分支。

## 基础数据结构与公开契约

| 公开契约                        | 必要内容                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InputEmbedPreparation`         | execute() 返回 InputEmbedContribution 或 Promise，执行权只可消费一次                                                                             |
| `InputEmbedChildrenPreparation` | execute() 返回 NormalizedInputEmbedChildren 或 Promise，保留子项顺序、identity 与 contribution                                                   |
| `InputEmbedPreparationContext`  | 复用 InputEmbedContext，以 signal、prepareChildren(children) 替代 normalizeChildren；prepareChildren 返回 Promise<InputEmbedChildrenPreparation> |
| `SynchronousInputEmbedAdapter`  | kind + lower，可选 prepare；lower 同步返回贡献，prepare 返回 preparation 或 Promise                                                              |
| `InputEmbedAdapter`             | 同步 adapter，或仅提供 kind + prepare 的 adapter                                                                                                 |
| `AsyncProcessingOptions`        | 保留 processing 选项，adapters 必须具有 prepare，可传 signal                                                                                     |
| `PreparedAsyncStaticProcessing` | 完整 result、commit()、discard()                                                                                                                 |
| `ProcessingUpdateOutcome`       | committed + result，或 superseded                                                                                                                |
| `AsyncProcessingController`     | 复用 controller 的读取、订阅和释放语义，update(source) 返回 Promise<ProcessingUpdateOutcome>                                                     |

`prepareStaticProcessingAsync(source, options, revision)` 返回 `Promise<PreparedAsyncStaticProcessing>`。commit 与 discard 是该候选互斥的终态：重复 commit 或重复 discard 无副作用；discard 后 commit、commit 后 discard 均诊断终态冲突，signal 已取消后 commit 诊断失效，不通知 driver 或发布帧。候选只保留同 revision 的完整结果，不在 commit 时重新计算。调用方放弃候选时必须 discard；候选及 preparation 借用的应用连接不因此由 Vanilla 关闭。

`processToStaticInputResultAsync(source, options)` 等待准备、同步编译并提交，返回 `Promise<ProcessingResult>`，静态 revision 为 0。SSR await 同一入口后使用既有 renderer；首个贡献失败则整次调用 reject，没有部分 SVG。取消不承诺撤销外部已经发生的计算。

`createProcessingControllerAsync(source, options)` 在初始准备和同步提交成功后返回 `Promise<AsyncProcessingController>`。options.signal 控制本次 controller 的生命周期；初始化前取消导致创建 reject，创建后取消等价于 dispose。update 到达即让更早的待提交请求失效，不等前一请求完成；旧请求最终返回 superseded，不把旧结果或旧错误发布为当前诊断。当前请求失败则 reject、进入现有 diagnostics，保留最后 committed result。

请求序号只用于 Vanilla 内部判断发布权，不等于 committed revision，不写入 Source IR 或 ProcessingResult。只有一次完整同步事务成功才推进 committed revision；失败或 superseded 不推进。read 与 subscribe 只暴露已提交结果，不返回 Promise、待准备内容或部分 artifact。

prepareChildren 在准备阶段收集作者声明中的嵌套输入，返回由当前请求管理的子项执行权。父级不得在 prepare 中调用任何 execute。需要嵌入子项结果时，父级 execute 调用已准备的子项 execute；每个实际嵌入位置只执行一次。执行中不得引入新的异步 InputEmbed，不能把动态发现的未准备依赖塞进 contribution。与数据行数有关的领域分区属于领域 preparation 内部计算，不新增作者嵌入位置。

同步 adapter 的 lower 和 prepare adapter 的 execute 返回相同 contribution，并进入相同 identity 校验、作者来源、provider 依赖解析和 Source 归一化。异步入口遇到没有 prepare 的作者嵌入时，在全树准备阶段拒绝；需要支持该入口的同步 adapter 可以提供不计算数据的 prepare，并在 execute 中复用其同步逻辑。嵌套作者输入必须先通过 prepareChildren 登记，execute 不调用 normalizeChildren 再发现作者嵌入。normalizer 只消费已完成贡献，不执行异步逻辑、不调用引擎；异步 preparation 不增加 normalizeSceneAsync 或 compileToSceneAsync。IRScene 没有作者 preparation，异步入口直接复用同步处理。

## 行为、失败语义与兼容性

完整贡献通过 ADR-048 的 runtimeInputs 与实际 Source 位置关联。嵌套作者子项由父 adapter 按实际输出字段转交绑定；共享 processing 在同一请求内完成 Source、provider 与绑定汇合，并在 retained 更新时将 Source 和绑定置于同一事务。重复 Layout 测量只消费准备结果，不再次执行 preparation。

- 同步 processing options 的 adapters 收窄为 SynchronousInputEmbedAdapter；async options 只接受具有 prepare 的 adapter。提供 lower 的 adapter 必须在计算前诊断当前输入不能同步消费的情况；不能调用 prepare、执行部分异步任务或在 callback 返回后检测 Promise。两种入口共用完整贡献与编译链，是明确的执行能力边界，不是新旧兼容路径。
- React 的同步 SSR 消费现有同步 lower 路径；需要异步准备的 SSR 通过 Vanilla 静态异步入口等待完整结果再交给 renderer，不在同步 React render 中启动网络任务。客户端异步作者路径复用 AsyncProcessingController；输入/结果和 AbortSignal 的框架接线不解释领域 mode 或重复调用引擎。
- React Layout 的 `runtime.preparation` 选择 `sync` 或 `async`，省略为 `sync`；`runtime.signal` 控制异步路径的生命周期。此选择与 retained/static 更新方式独立，异步树的每个 adapter 都必须具有 prepare。官方 Viz 独立组件使用异步客户端路径，同步 React SSR 仍消费 lower；异步 SSR 由应用等待 Vanilla 的静态入口。
- 每次请求固定 typed Input 的声明结构、位置、IR 和 options；准备期间应用不得修改借入的 props、行数据或源资源。回调与 opaque 句柄只留在 runtime，Vanilla 不做任意 class/连接实例的 JSON 克隆。
- prepare/execute 前后及进入同步编译、事务、发布前都检查任务失效。adapter 忽略 signal 也不能让旧结果发布；网络中止只是额外的资源优化。dispose 使所有待提交任务失效，之后 read/update/subscribe 遵守既有 disposed 错误语义。
- prepare 或 execute 的同步抛错、Promise rejection、身份冲突与非法贡献均终止当前请求。Vanilla 添加嵌入位置并包装为 RetikzVanillaError，保留领域错误和原始 cause 链；当前请求发生的外部副作用和应用日志不获得回滚保证。
- 每个 preparation 的 execute 第一次调用即消耗执行权，成功、失败、等待中或取消后均不能再次执行；再次调用在新计算前报错。重新执行需要新的 preparation，不隐式重试。
- 准备任务、signal 与 candidate 状态归 Vanilla processing；React 只收集 typed Input、消费 Promise 状态和订阅结果，独立组件与 Layout 嵌入共用该生命周期。
- 沿用 ADR-045 的身份规则，同一作者位置的同步和异步输入具有相同匿名 runtime identity 和 Source 结果；匿名 identity 不成为持久化引用。有效 Theme 和 options 来自同一请求，旧 Theme 结果不能覆盖新输入。
- 不改变 Core compile、Runtime participant、Scene、renderer、Source IR 或领域 operation 的同步契约；不依赖未排期的 cooperative scheduler、generation session 或流式 materialization。
