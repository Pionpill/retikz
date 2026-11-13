---
description: 以 SceneReconciler 统一底层完整与增量编译，Vanilla 提供一次性编译门面并管理临时实例，保持输入归一化与渲染接入边界
keywords: SceneReconciler、编译入口、Vanilla、SSR、incremental、compileToScene、compileToSceneAsync、生命周期
---

# ADR-082：以 SceneReconciler 统一编译入口

- 状态：Accepted
- 决策日期：2026-11-07
- 接受日期：2026-11-07
- 关联：[roadmap](./roadmap.md)、[统一执行器](./080-unified-reconciler-compilation.md)、[同步提交](./064-remove-runtime.md)、[编译产物](./077-compile-output-contract.md)、[异步作者准备](./047-async-authoring-preparation.md)、[Drawing Complete](../../../architecture/core-drawing-complete.md)、[包职能设计](../../../../../../notes/architecture/package-responsibility-design.md)

> 首轮调度归属由 [ADR-086](./086-independent-compilation-drivers.md) 调整为全量与 Weave 独立驱动；共享绘图语义、会话入口与事务约束保持

## 背景与目标

全量与增量已经共享底层执行器，但独立完整编译函数和 SceneReconciler 仍提供两类公开调用入口。持续处理通过会话编译，一次性处理可以直接进入底层完整驱动，调用生命周期和诊断接线分别维护。

本决策收敛底层编译执行：所有独立的 Core IR 到 Scene 编译都经过 SceneReconciler，复用已有同步计算、内部事务和结果发布能力。Vanilla 为一次性使用者提供便捷门面，隐藏临时实例的创建和释放；持续处理按实际生命周期持有实例，不新增调用方分阶段提交的能力。

## 决策：复用现有 SceneReconciler

`@retikz/reconciler` 以 SceneReconciler 作为唯一公开底层编译执行入口。删除该包的 `compileToScene` 和 `compileSceneSnapshot`，不保留旧名转发、静态方法替代或另一套一次性底层编译 API。内部执行器仍可组合 Core 原子阶段、遍历和输出组装，但不能成为包外可独立调用的完整编译入口。

独立 IR 消费者可以直接创建协调器。Vanilla 在 processing 内部持有协调器，管理编译配置、输出目标和释放，并公开一次性编译门面；React 及其它框架继续复用 Vanilla processing 与 controller。领域包的独立完整编译、Inspect 的独立辅助编译和 SSR 同样经过协调器，保持各自既有结果消费方式。底层或领域实现不为使用便捷门面而反向依赖 Vanilla。

Core 继续拥有绘图语义、原子阶段、Scene 与 Definition；Reconciler 拥有执行、缓存与内部提交；Render 拥有后端绘制及宿主恢复。Composite 的子树、测量、probe 与 replay 继续由当前执行环境调度，不为内部子树创建独立的顶层会话。

## 基础数据结构与公开契约

### 现有会话操作

SceneReconciler 保留现有公开操作，不增加新的准备句柄或公开提交阶段：

| 操作                        | 语义                                                    |
| --------------------------- | ------------------------------------------------------- |
| `mount(source)`             | 首次完整编译并同步发布结果；已经挂载时拒绝              |
| `replace(source, options?)` | 完整重建并同步发布，成功后才替换输入与编译配置          |
| `update(batch, expected?)`  | 在增量会话上执行既有权威 WeaveBatch，校验当前会话与版本 |
| `updateTarget()`            | 复用当前编译结果，仅提交输出目标配置更新                |
| `read()`                    | 读取最后一次已提交结果                                  |
| `diagnostics()`             | 读取并清空非致命执行诊断                                |
| `dispose()`                 | 释放会话及其拥有的输出目标                              |

`CompileOptions`、`CompileResult`、`SceneCompilationSnapshot` 与 `ReconcilerResult` 继续分别表达编译配置、普通结果、诊断与按需来源、会话版本，类型不因删除函数而一并删除。迁移须保留具体 Composite Definition 集合与 artifact 联合的类型关联，不因改用实例而丢失原完整编译入口的产物类型信息。

输入和选项继续按只读契约消费，不重新解析已类型化 IR。完整替换继续重新建立计算状态，不隐式匹配新旧元素或生成局部批次；既有配置更新与失败恢复语义保持。

### 模式与实例生命周期

`incremental` 在创建时固定，默认仍为 `true`：

- `false`：通过同一执行器完整编译，不保留 Weave 跨次缓存；支持完整替换与输出配置更新，拒绝批次更新及 `updateStrategy` 配置
- `true`：首轮计算后保留 Weave 状态，后续权威批次复用有效阶段产物；既有 `auto | full` 策略及默认值保持

一次性编译创建 `incremental: false` 的临时实例，调用 `mount` 取得结果，并在成功或失败后释放。已交付的普通 Scene、artifacts 和诊断不依赖实例继续存活。持续处理保持现有 controller 的实例生命周期、执行模式和默认值；本次不调整缓存策略或清理其它配置接口。

所有完整编译最终使用相同的同步协调器执行方式。warning 与非致命执行诊断采用协调器既有发布规则，不另造静态编译专属的派发逻辑。

### Vanilla 的一次性编译门面

`@retikz/vanilla` 将无框架作者 API 分为输入归一化、编译使用入口与渲染宿主接入。`normalizeXxx` 只处理 typed authoring 到 Core IR 的组装，不触发编译；一次性门面组合已有 processing 并隐藏协调器生命周期；SSR 与 DOM 接口继续复用既有编译和后端能力。

一次性作者编译使用以下入口：

```ts
declare const compileToScene: (source: ProcessingSource, options?: ProcessingOptions) => ProcessingResult;

declare const compileToSceneAsync: (
  source: ProcessingSource,
  options?: AsyncProcessingOptions,
) => Promise<ProcessingResult>;
```

`ProcessingSource` 保持为 `InputScene | IRScene`，配置继续复用现有 processing options，编译参数位于 `options.compile`。省略 options 时使用既有默认配置。返回现有不可变 ProcessingResult，包括 Scene、artifacts、compileResult、layers、diagnostics 与 runtimeMeta，静态 revision 为 0；不增加另一套结果类型或要求调用方释放句柄。

同步门面在完整作者输入就绪后编译并完成既有驱动成功通知；异步门面沿用异步作者准备、取消与失效检查，准备完成后复用同一个同步编译过程。两者均在内部使用临时非增量协调器并负责释放。默认文字测量、provider 解析、诊断归属及错误 cause 保持现有 Vanilla processing 规则。

门面替换 Vanilla 既有 `processToStaticInputResult` 与 `processToStaticInputResultAsync`，旧名直接删除，不保留转发。Reconciler 不重新公开同名函数。需要持续更新时使用既有 controller；需要框架掌握交付时机时沿用已有候选处理接口。React 与 Vanilla 继续表达同一作者和编译契约，React 仅持有框架生命周期及宿主接线。

已编译的 Scene 不属于该作者编译门面的输入，继续使用既有 Scene 消费与渲染接口，不进行反向编译。

### Vanilla 与其它消费者接入

Vanilla 继续拥有 `InputScene` 归一化、作者贡献准备、provider 依赖收集及只读 ProcessingResult。完整贡献就绪后进入同步协调器。已有 controller 初始调用 `mount`，完整输入更新调用 `replace`；static、SSR 和其它一次性编译使用临时实例。

Vanilla 的异步作者准备、取消、过期请求判断及既有静态处理句柄保持在 processing 层。准备结束进入同步编译前检查发布权，处理结果对外交付前继续执行既有失效检查。静态处理句柄管理已有的结果交付和驱动通知，不向 Reconciler 增加跨调用的编译提交阶段。

现有 compile driver 从协调器输出读取同次 `result` 与真实 `diagnostics`，继续生成只读图层和扩展诊断，并按既有 processing 规则通知成功。主图编译由协调器完成，驱动保持 primary result 身份，不再自行调用独立完整编译函数，也不以空诊断替代真实输出。驱动失败仍按现有规则保留最后成功的 ProcessingResult；不扩大为已完成编译及 warning 的撤销协议。

Inspect、Plot、Table 等现有独立编译消费者同步迁移，领域输入、lowering、辅助绘图与结果语义保持。React 继续消费 Vanilla，不直接管理协调器或重建编译驱动。Vanilla 与框架包不新增局部批次 authoring、自动整树 diff 或作者身份推断。

已编译的 Scene 继续直接交给 Render，无需反向构造 IR 或建立编译会话；该输入没有作者编译产生的 artifacts。动画、水合和宿主模式沿用既有能力。

## 行为与失败语义

- 相同输入与确定性宿主条件下，两种模式的 Scene、资源、artifacts、诊断及请求的来源信息保持等价；增量结果继续与最终输入的完整编译可观察等价。
- 会话版本、过期更新拒绝、空批次、同步重入限制与单目标提交继续采用既有语义。编译或目标提交失败不发布新的计算结果；恢复失败时保持既有不可更新状态及错误诊断。
- warning 在协调器成功发布本次编译后派发；编译及目标准备失败不派发。warning、trace 和最终清理异常继续隔离为执行诊断；仅输出配置更新不重复派发已有编译 warning。Vanilla 作者请求与处理结果的生命周期不改变这一同步编译边界。
- 绘图、执行、宿主和作者错误保持 Core、Reconciler、Render 与 Vanilla 各自 owner，穿越边界保留原始 cause。
- 直接删除 Reconciler 的旧编译函数及 Vanilla 被替换的一次性处理名称，生产消费者、文档示例和测试同步迁移，不保留兼容别名、静默回退或全量专用驱动。Vanilla 门面只管理既有处理流程，不形成第二套底层编译实现。
- 本决策替代 [080](./080-unified-reconciler-compilation.md) 的独立完整编译函数入口约定，以及 [064](./064-remove-runtime.md) 中静态编译不创建协调器会话的约定；其余执行、内部事务和 adapter 行为沿用既有决策。
