---
description: 移除独立 Runtime 包，将增量执行归 Reconciler、宿主提交归 Render、作者接线归 adapter，建立无渲染依赖的最小 Weave 更新闭环
keywords: Runtime、Reconciler、Weave、事务、Render、依赖移除
---

# ADR-064：移除 Runtime 并收敛增量执行职责

- 状态：Accepted
- 决策日期：2026-10-21
- 接受日期：2026-10-21
- 关联：[Roadmap](./roadmap.md)、[055](./055-reconciler-extraction.md)、[061](./061-weave-core-integration.md)、[062](./062-weave-node-state-isolation.md)、[063](./063-weave-incremental-update.md)、[Drawing Complete](../../../architecture/core-drawing-complete.md)

## 背景与目标

Weave 已拥有编译树、批次操作、依赖传播、缓存及候选状态隔离。现有公开链路仍通过 Runtime Source / Computation 包装完整输入，更新回退到完整准备，未直接使用已有 Weave 批次能力。通用计算图与完整快照捕获增加接线复杂度，不能作为元素增量计算的必要条件。

本决策移除 `@retikz/runtime` 及其生产依赖，让 Reconciler 在没有 Render、DOM、React、Vanilla 和通用 Source / Computation 注册的环境中完成首次编译与连续批次更新。Composite 增量处理不参与本决策；已有 Composite 静态编译保持 Core 的完整编译语义，不新增其缓存、阶段调度或局部更新契约。

## 决策：按领域归还职责，不迁移通用 Runtime 框架

Reconciler 单向依赖 Core 与实际使用的 Foundation 能力，拥有基础元素的增量编译、跨次身份、结果版本、候选提交及同步执行协调。Weave 复用已有稳定节点和 current / pending 状态，不复制一套 Source 快照树、Computation 图或通用 Participant 注册系统。

Core 继续拥有绘图语义、逐元素编译与完整结果组装。静态编译不初始化 Reconciler 会话，不引入跨次事务。Composite 的既有完整编译路径继续调用 Core；含 Composite 的完整输入不得伪装成支持基础元素批次更新的 Weave 树。

Render 拥有 SVG / Canvas 宿主修改、渲染配置、动画、水合和渲染资源生命周期。Reconciler 定义可选的输出提交边界，由 Render 实现并由宿主接线注入；Reconciler 不导入 Render，不持有 DOM 类型，也不实现后端失败恢复算法。

Vanilla 拥有作者输入转换、处理结果投影、渲染配置接线和宿主生命周期；React 复用 Vanilla。两者不另建计算事务或复制 Weave 操作语义。现有静态、retained、SSR 和自定义 renderer 使用场景继续成立，Runtime 的移除不等于取消保留式宿主。

运行期 Scene 身份、revision 及 Scene 更新输出契约归 Reconciler；Core 的编译内来源不升级为跨次身份。绘图诊断归 Core，执行与版本错误归 Reconciler，宿主错误归 Render，作者输入错误归 adapter。各包拥有自己的 trace 词汇和发射边界；无领域含义且存在实际共享消费者的观测原子契约才进入 Foundation，不把 Runtime 注册图、事务或领域诊断搬进 Foundation。Foundation 仅保留共享 trace record / sink 类型，不定义执行结果枚举或 reporter。Core、Reconciler、Render 各自定义阶段、结果与计数语义，并在发射边界隔离观察回调异常；阶段注册、记录校验、聚合与展示由 Bench / 开发工具负责，不进入生产编译热路径。

## 基础契约与最小运行闭环

### 编译输入与结果

首次编译接收基础元素组成的 Core 场景与编译配置，建立可持续更新的 Weave 根并返回完整 Core 编译产物。后续局部更新直接使用既有 `WeaveBatch`，不增加 Runtime 专用命令，不要求每次重新提交完整 IR，也不先做根输入深比较。

候选更新复用既有 `WeavePreparedUpdate` 语义：`compilation` 是本批完整输出，`commit()` 切换候选状态但保留恢复依据，`rollback()` 丢弃候选或恢复尚未最终确认的提交，`finish()` 最终确认并释放恢复依据。候选生命周期只有一个协调者，调用方不得绕过正在进行的发布修改树。

没有渲染接入时，调用方可直接准备、提交并最终确认，读取新的完整结果；计算会话不要求图元拓扑快照、渲染身份索引或 Scene Patch 才能运行。完整输入替换是明确的重新构建行为，不能作为错误批次的隐式补救。

输入及共享编译产物按只读契约消费；调用方通过显式更新替换输入，不得原地修改会话仍持有的对象。隔离复用 Weave 的写时复制，不对每次局部操作执行整树深拷贝或无条件递归冻结。JSON 等未知输入的解析保持在现有入口，不把内部可信类型重新解析一遍。

### 可选输出提交

同步执行入口可接收一个输出提交目标。目标使用本次完整编译结果与所属会话的候选版本准备宿主变化，返回 `commit()`、`rollback()`、`dispose()` 三个操作：准备不得发布新画面；commit 应用宿主变化；rollback 能放弃准备并恢复尚未最终确认的宿主修改；dispose 释放候选或恢复所需的临时资源。SVG、Canvas 及自定义 renderer 使用同一边界；多图层由 Render 在一次目标提交内组织，不新增通用参与方图。

协调者先完成编译与宿主准备，保留旧状态，提交 Weave 与宿主，二者均成功后才最终确认、发布版本和处理结果。准备期间公共读取仍返回上次已提交结果；提交期间拒绝重入读取或更新，防止暴露中间状态。warning 与提交通知只在成功发布后派发，观察回调异常隔离为诊断，不反向撤销成功结果。

会话只允许一个同步候选。版本在成功发布后推进，失败或空批次不推进；版本只在所属会话内有意义，旧会话或旧版本的提交请求必须拒绝。身份仍由对应树与输出契约管理，不以全局自增 revision 替代节点身份。

只改变 Render 配置时复用已提交编译结果，由 Render 准备配置更新并参与同一发布边界，不重新执行 Core 编译。完整 Scene 替换是本决策允许的渲染输出，不要求同时实现细粒度 Scene Patch。

## 行为、失败语义与兼容性

- 无效批次、编译或输出准备失败保留上次已提交状态与结果，不通知成功、不自动重试、不隐式回退完整编译。
- 宿主提交失败时先恢复宿主，再恢复候选编译状态，保留原始原因。恢复也失败时报告原始错误与恢复错误，会话进入不可继续更新状态，只允许诊断读取和释放；不得声称已恢复一致画面。
- 最终确认后的旧资源清理、观察回调失败只产生所属包诊断，不撤销已发布结果。销毁释放会话与宿主各自持有的资源，不允许销毁后继续更新。
- 基础元素的批次结果保持与同一最终输入的 Core 完整编译可观察等价；延后 Path 引用、Scope 包络、名称可见性与自定义基础能力继续遵守现有 Core / Weave 契约。
- 删除 Runtime 包、Source / Computation / Participant API 及对它们的包装出口，不保留旧名转发或兼容层。保留式 renderer 工厂调整为新的提交接线契约，调用方同步迁移。
- Adapter 的 `static | retained` 模式及现有默认值保持；现有 `runtime` 配置字段是执行配置入口，不再表示依赖同名包，本决策不为包删除强制更名。`auto | full` 作为 Reconciler 执行策略保留既有含义：auto 的权威基础批次使用 Weave，完整输入走完整准备；full 使用最终输入完整准备。两种策略都不得掩盖无效批次。
- React 与 Vanilla 保持等价配置语义；完整输入更新、SSR、动画、水合、只读图层和已有 Composite 完整编译接线必须同步去除 Runtime 类型与运行依赖，但不增加 Composite 增量或交互地址能力。

本决策获批后替代 [011](./011-runtime-identity-source-registry.md) 与 [012](./012-computation-transaction-lifecycle.md) 中独立 Runtime Source / Computation / Participant 的包契约；调整 [014](./014-scene-patch-retained-renderer.md)、[016](./016-runtime-execution-policy.md)、[050](./050-runtime-trace-owner-declarations.md)、[055](./055-reconciler-extraction.md)、[061](./061-weave-core-integration.md) 和 [063](./063-weave-incremental-update.md) 对 Runtime 的所有权与接线要求。Core 绘图语义、Weave 批次语义、候选隔离和渲染一致性要求继续有效。Proposed 状态不改变现有实现与历史决策效力。
