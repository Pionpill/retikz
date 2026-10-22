---
description: 将 Core 专属增量执行与 Scene 更新协议迁入 Reconciler，以无 Runtime 依赖的静态编译准备和来源契约连接两包，保持既有执行行为
keywords: Reconciler、Core、Runtime、迁移、编译来源、ScenePatch、静态编译、trace
---

# ADR-055：分离 Core 静态编译与 Reconciler 增量执行

- 状态：Accepted
- 决策日期：2026-10-18
- 接受日期：2026-10-18
- 关联：[v0.5 Roadmap](./roadmap.md)、[013](./013-incremental-core-compile.md)、[014](./014-scene-patch-retained-renderer.md)、[016](./016-runtime-execution-policy.md)、[050](./050-runtime-trace-owner-declarations.md)、[Drawing Complete](../../../architecture/core-drawing-complete.md)

> 后续调整：[061](./061-weave-core-integration.md) 已替代本文的 CoreChange 提示、快照 diff 索引与 mismatch 诊断约定；完整输入和 Scene 提交边界继续保留。

## 背景与目标

Core 当前同时提供静态绘图编译和跨 revision 的增量执行。Source 捕获、身份匹配、Computation、运行时快照与 Patch 同绘图编译绑定，导致静态编译包直接依赖 Runtime。仅搬迁 Computation 无法解除这种关系：编译还接收 candidate revision，生成 Runtime identity，并公开 Runtime trace 类型。

本决策将现有增量能力完整归属到 Reconciler，建立其调用 Core 的公开边界。迁移保持已有完整快照输入、保守局部编译、完整回退与事务行为，不同时扩大局部更新范围。通用编译树、依赖响应和权威局部命令继续由后续决策完善。

## 决策：Core 提供静态编译，Reconciler 持有跨次执行状态

`@retikz/reconciler` 单向依赖 `@retikz/core`、`@retikz/runtime` 与实际消费的 `@retikz/foundation` 能力。Core 不直接依赖 Runtime 或 Reconciler，包括公开类型与生产实现；也不通过 Foundation 间接放置增量专用契约。

Core 继续拥有 IR、Definition / registry、resolve、几何、布局、Composite、Scene、资源、空间句柄和绘图诊断。编译内测量、试算、replay 与缓存仍属于一次静态编译，不因名称带有 runtime 而迁出。

Reconciler 拥有 Core Source 与 Composite 输入 Source 的 Runtime 包装、Computation 接线、跨次身份关联、输入 Diff、复用状态、局部更新选择、运行时快照及 Scene Patch 契约与生成。Runtime 继续拥有通用 Source / Computation / Participant、revision 和事务；Reconciler 不维护第二个提交时钟或事务引擎。

Render 的 retained 能力消费 Reconciler 的公开输出契约，静态能力继续消费 Core Scene。Vanilla 组装 Reconciler、Runtime 与 Render，React 继续通过 Vanilla 接入；本决策只要求已有消费者适配新的所有权，不新增上层局部更新入口或领域增量算法。

## 基础数据结构与公开契约

### Core 静态编译准备

Core 保留 `compileToScene`、`observeCompileToScene` 及现有结果语义，新增 `prepareSceneCompilation` 作为需要延后派发 warning、读取编译来源的静态能力。它同步完成一次编译，不创建持续实例，不接收 revision、Runtime Source 或事务对象。

该入口接收 `IRScene`、不含 `onWarn` 的编译选项，以及包含 `observers` 与 `captureProvenance` 的准备选项；两者分别默认空列表和 `false`。返回 `PreparedSceneCompilation`：

| 字段              | 契约                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `result`          | 完整 `CompileResult`，保留 Composite artifact 的泛型关联                                    |
| `diagnostics`     | 本次成功编译产生、按 canonical 顺序排列的完整 warnings；不派发 warning 回调或默认控制台警告 |
| `observerOutputs` | 本次显式观察器输出；未提供观察器时为空                                                      |
| `provenance`      | 仅在请求收集时存在的 `CompileProvenance`；只关联本次结果，不承诺跨次身份                    |

普通完整入口与准备入口消费同一绘图编译语义。普通入口保持成功后派发 warning 的行为；Reconciler 在候选内使用准备入口，成功提交后才派发 warning。观察器仍按已有编译观察语义执行，不因准备入口而获得宿主事务回滚能力。

准备入口不是任意子树的脱离上下文编译器。现有孤立 Node 快路径只能在既有安全条件下构造独立输入；任意子树复用所需的上下文与依赖契约不由此自动成立。

### 编译来源与运行时身份分离

Core 公开 `validateCompositeInputBindings(source: IRScene, inputs: CompositeInputBindings | undefined): void`，验证 opaque bindings 与完整输入的配对关系。未提供 bindings 时通过；无效来源或不匹配时沿用 `RetikzCoreError` 的 `CompositeContractViolation`。该能力不执行编译、不产生 warning、不返回私有 scope；静态编译与 Reconciler 复用同一校验语义。

Core 提供只读 `CompileProvenance`，描述本次编译的来源事实，不提供 Runtime identity 或稳定性结论。其跨包数据由以下集合组成：

| 集合        | 必需信息                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `owners`    | 编译内唯一的 `key`、可选父 `parent`、实体 `kind`、可选作者 `id`、输入位置 `index`、是否属于生成内容的 `generated`；文档根由 `root` 指定 |
| `bindings`  | 名称注册所在的编译内 `namespace` 标识、名称 `name` 和来源 `owner`；保留注册顺序及重复注册，不提前去重                                   |
| `emissions` | 最终 Scene 中图元 occurrence 的 `primitivePath`、来源 `owner`、发射 `role` 与同 owner/role 下的 `ordinal`                               |

编译内标识为不透明键，只能在同一份来源结果内关联。每个最终图元 occurrence 恰有一条 emission；provider 复用同一对象不会合并不同出现位置。最终顺序包含编译产生的排序和包装效果，嵌套贡献保留原来源。试算中未选中的输出不进入最终 emission；选中 replay 的名称注册与来源仍须准确记录。此 sidecar 不进入持久 IR 或 Scene schema，也不替代空间句柄和诊断 locator。

Core 负责准确记录内置及自定义绘图能力的来源。Reconciler 根据这些事实及 candidate revision，沿用既有稳定身份和 candidate-local 身份规则，生成运行时拓扑。Render 不从 Scene 的 public id 或对象引用反推运行时身份。

### Reconciler 公开表面

以下现有能力改由 `@retikz/reconciler` 公开，领域名称继续描述所处理的 Core 输入，不因移动包而批量改名：

- `CoreSourceDefinition`、`CoreCompositeInputSourceDefinition`、`CORE_SOURCE_KEY`。
- `createCoreComputation`、`CORE_COMPUTATION_ID` 及其公开 options、definition、output、public read 类型。
- `CoreChange` 与配套的 Core 输入变化类型。
- `CoreComputationDiagnosticCode` 提供增量执行诊断，包括沿用 `CORE_CHANGESET_MISMATCH` 的 `ChangeSetMismatch`；该成员不再属于 Core 的静态 `CompileWarningCode`。
- `RuntimeScene`、运行时图元 / 资源类型、`SceneRuntimeSnapshot`、运行时拓扑 / subtree 类型、`ScenePatch` 与 operation 类型。

Core 删除这些旧出口，不 re-export Reconciler，不保留兼容别名。Source key、Computation id、Runtime identity owner 的既有值保持不变：它们标识绘图领域及数据源，不要求等于当前实现包名。

完整 Snapshot 仍是真源，ChangeSet 仍为带 base revision 的可选提示，不能单独构造下一状态。运行时快照、topology、Patch 的数据形态与 coherence 规则保持现有契约；本决策不将完整结果改成惰性读取或持久化序列。

### 编译工作量观测

Core 不提供 trace 选项、reporter 或工作量计数；编译工作量由持有执行策略与提交边界的 Reconciler 报告。Foundation 保留通用 `PerformanceTraceRecord` 与 `PerformanceTraceSink` 契约。

Reconciler 在成功提交后报告 `update` 阶段：Weave 使用 `element-compile` 记录实际元素编译次数，包含 Composite 的完整 Core 编译使用 `scene-compile`，每次计 1，不统计内部展开、布局探测或 replay。完整编译报告 `full`，增量批次报告 `incremental`；`reused` 为 0，`changed` 等于 `visited`。

Reconciler 通过 `ReconcilerTracePhase`、`ReconcilerTraceUnit` 公开自己的观测词汇，隔离接收函数异常并提供诊断；观测失败不撤销已发布结果，失败事务不报告成功记录。空批次与只更新输出目标的调用不报告编译工作量。

Render 自行拥有 `RenderTracePhase` 与 `RenderTraceUnit.ScenePrimitive`，SVG / Canvas 的图元计数保持原语义。Core 旧 trace 出口直接删除，不保留别名；编译 observer 与 provenance 契约不受影响。

## 行为、失败语义与兼容性

- **静态路径**：不建立增量 Source、Computation、跨 revision 身份或快照。普通静态入口默认不收集 provenance；Core 内部为一次布局或测量使用缓存不受此限制。整个 adapter bundle 的裁剪不等同于 Core 依赖解耦，本决策不保证统一 adapter 入口零增量下载字节。
- **保留路径**：initial 完整编译；`auto` 保持已有 bailout / 局部更新 / fallback；`full` 保持强制完整编译和独占 `replaceScene`。现有单根 Node fill 安全子集及其排除条件不扩大，无法证明局部等价时仍完整回退。
- **身份**：稳定 parent 下唯一有效 id 的身份规则保持；匿名、重复 id、生成内容继续按既有规则处理；跨 Scope 移动仍可表现为 remove + add，不新增跨父保留身份保证。
- **候选隔离**：Source、编译结果、复用状态与身份索引均由 Runtime 生命周期管理。准备、计算或 Participant 发布前失败不推进已提交 revision；回滚失败继续遵守 Runtime broken 语义。
- **诊断**：warning 只在成功提交后派发，失败候选不泄漏 warning。ChangeSet mismatch 的 fallback 与 Runtime diagnostic 保持既有 code 和派发边界。无效 Patch 不通过完整替换掩盖。
- **错误归属**：绘图解析、布局和编译失败仍为 Core 错误；Runtime 事务错误与 Render 提交错误保留原 owner。迁出的输入捕获、配置隔离及增量装配错误由 `RetikzReconcilerError` 表达，保留可区分的 code 和 cause；原来针对 Core 错误类识别这些增量失败的调用方需调整。Reconciler 不无条件包装已有 Core / Runtime 错误。
- **扩展行为**：自定义 Definition、Composite、实例运行时输入、空间句柄、artifacts 与 observer 继续经同一编译能力处理。compile-local replay 不升级为跨次缓存凭证；options 的隔离与生命周期固定规则保持不变。
- **React / Vanilla**：现有作者输入、默认模式、更新策略和宿主生命周期保持一致，仅调整内部依赖与类型来源。上层包需要的必要接线属于迁移闭环，新的局部 authoring API 和领域性能优化另行设计。
- **关联决策**：本决策获批后替代 ADR-013 中由 Core 承载增量执行的归属、ADR-014 中由 Core 拥有运行时 Scene/Patch 的归属，以及 ADR-050 中 Core 静态接口直接使用 Runtime trace 类型的要求。其余身份、事务、快照真源、局部安全性和观测不影响产品结果的原则继续有效。Proposed 状态不改变已发布实现与历史决策的效力。
