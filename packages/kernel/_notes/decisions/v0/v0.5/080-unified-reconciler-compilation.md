---
description: 将全量与增量编译统一到 Reconciler 执行链路，Core 提供原子阶段及共享产物，Weave 仅保存增量复用状态，迁移完整编译 API 与生命周期归属
keywords: Core、Reconciler、Weave、原子编译、阶段产物、全量编译、增量编译、compileToScene、Composite、生命周期
---

# ADR-080：统一编译执行链路与原子阶段产物

- 状态：Accepted
- 决策日期：2026-11-03
- 接受日期：2026-11-03
- 关联：[Roadmap](./roadmap.md)、[055](./055-reconciler-extraction.md)、[058](./058-weave-foundation.md)、[060](./060-core-element-compilation.md)、[061](./061-weave-core-integration.md)、[064](./064-remove-runtime.md)、[065](./065-compiled-layout-paint.md)、[077](./077-compile-output-contract.md)、[Drawing Complete](../../../architecture/core-drawing-complete.md)、[包职能设计](../../../../../../notes/architecture/package-responsibility-design.md)

## 背景与目标

共享元素解析和几何函数仍不足以保证全量与增量行为一致。两套执行链路可以分别决定阶段顺序、包装不同的中间结果、收集资源和组装输出；增量缓存还可能只保存位置等简化信息，消费时重新生成全量流程已经产出的布局。Composite 若继续走另一条完整编译路径，统一仅覆盖基础元素。

本决策调整包职责与公开 API：Core 专注绘图领域的原子计算及产物契约；Reconciler 统一持有编译执行和组装生命周期。全量和增量首轮经过同一主流程，差别只在是否记录并保留后续更新所需的 Weave 缓存。后续更新在同一执行体系中复用有效结果、重新计算失效阶段。

## 决策：Core 定义计算，Reconciler 统一执行

### Core 的原子能力

Core 继续拥有 JSON-safe IR / schema、Scene、Definition / registry、领域解析、测量布局、几何、lowering、图元生成、资源语义和绘图诊断。各阶段公开实际需要的输入、窄能力上下文和结果；阶段不依赖完整执行环境、Weave 节点、候选版本或此前遍历遗留的可变状态。

Core 可以提供纯粹的资源重映射、边界计算、变换、排序与图元组合算法；完整结果由哪些片段组成、何时调用这些算法、如何收集和发布由 Reconciler 决定。Core 不再持有 Scene 全量驱动、树遍历、等待队列、编译会话、试算工作区生命周期或结果提交。原子化按领域职责和依赖就绪点划分，不要求每个 helper 都公开，也不强制每类元素存在统一的完整编译包装。

查询、测量、资源登记、诊断及 Composite 子内容计算通过显式窄能力注入。算法可使用局部临时状态；会影响其它计算的写入必须由执行方控制，不能隐藏全局状态或提交副作用。

### Reconciler 的执行与组装

Reconciler 单向依赖 Core 与实际使用的 Foundation 能力，拥有完整编译入口、执行环境、遍历与阶段组装、命名空间实例、依赖等待、试算与重放调度、资源工作区、输出汇总、来源记录、诊断派发及候选生命周期。Core 不反向导入 Reconciler，包括类型与转发出口。

名称可见性、几何引用和绘图输出的语义仍由 Core 契约定义；Reconciler 按这些规则提供查询与组织执行，不维护第二套样式默认、形状参数或几何算法。运行期 Scene 身份、revision、更新协议和可选提交目标继续属于 Reconciler；DOM、后端渲染及宿主资源属于 Render，authoring 与框架接线属于 Vanilla / React。

## 基础数据结构与公开契约

### 一套阶段产物

相同领域阶段只定义一种权威产物，由 Core 产生，全量和增量消费同一结构。Weave 保存阶段实际返回的结果，不为缓存建立简化的平行布局、复制属性投影或完整元素模型；是否跨次保留不改变产物的类型和语义。

| 元素       | 共享阶段产物与约束                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Coordinate | `CanonicalCoordinate` 保存完整位置意图，`CompiledCoordinate` 仅保存实际位置；引用投影不构造虚拟 Node，不要求可见输出           |
| Node       | `CanonicalNode` 保存有效配置和能力绑定；`CompiledNode` 仅保存 geometry、layout、style、text、labels、animations 等最终计算结果 |
| Path       | 保留不同 kind 的解析与计算契约，统一其绘制与边界贡献；不要求所有 kind 存在中心线，不把完整输出伪装为布局                       |
| Scope      | 前置继承与放置准备、子布局完成后的包络与变换、分组属性和输出分别按就绪点产生；不重复保存后代声明或完整子树输出                 |

布局产物不承担声明身份和来源。名称来自当前输入，来源与出现位置来自本次执行记录；投影及重新发布引用使用当前记录，不能从旧缓存推断新的声明位置。引用包络、可见边界与父布局 allocation 保持各自语义，不因共用产物而合并。

Weave 额外维护的节点身份、current / pending、依赖、失效及版本记录属于执行状态，不成为 Core 的领域产物。只读阶段结果可以被不同有效版本共享；包含可变工作区、局部 token 或回调闭包的对象不自动具有跨次复用资格。

### 完整编译入口

以下入口及完整执行契约迁至 `@retikz/reconciler`，Core 删除原出口：

- `compileToScene`：同步编译完整 `IRScene`，成功后派发绘图 warning，返回 `CompileResult`；不保留可用于后续增量更新的会话。
- `compileSceneSnapshot`：执行相同完整编译，返回 `SceneCompilationSnapshot`，收集诊断而不派发 warning，并按执行选项收集来源。
- `CompileOptions` 及完整调用配置组合、`ExecuteOptions`、`CompileResult`、`SceneCompilationSnapshot` 由 Reconciler 拥有；Core 继续拥有这些组合所消费的原子绘图配置、Definition、Scene、Composite artifact、绘图诊断和阶段契约。

入口名称不因迁包而增加同义替代。现有 Definition 集合到 artifact 返回类型的泛型关联必须保留。Node、Coordinate、Path、Scope 分别拥有独立 Canonical 与 Compiled 产物；仅为增量封装来源与重复输出的元素包装删除。

普通结果继续遵循 [077](./077-compile-output-contract.md)：只返回 Scene 与 Composite artifacts。诊断与按需来源通过快照契约交付；中间产物共享不增加普通结果的节点布局表、观察出口或空间句柄。

### 会话模式与更新

`ReconcilerSession` 继续提供 `mount`、`replace`、`read`、`update`、`updateTarget` 和 `dispose`。会话执行选项增加 `incremental?: boolean`，默认 `true`，在创建时固定：

- `incremental: false`：完整执行并返回结果，结束后释放本次计算记录，不保留 Weave 更新缓存；会话可以保留已发布结果和输出目标，通过 `replace` 重新编译完整输入。调用 `update` 报告执行契约错误。
- `incremental: true`：首轮完成相同计算，将有效阶段结果、输入及依赖等必要记录提交到 Weave；后续 `update` 消费权威批次并复用仍有效的结果。

一次性完整编译入口使用不保留缓存的模式。`updateStrategy: auto | full` 继续作为增量会话的更新策略：auto 按有效性复用；full 强制重算同一执行链路中的适用阶段，不能调用另一个完整编译器。是否启用增量缓存与是否强制重算是两个不同的决定；在非增量会话配置更新策略属于无效组合。

首次 `mount` 和完整输入 `replace` 在两种模式下使用同一阶段顺序、引用可见性和输出组装主流程。模式只控制跨次记录及缓存保留，不选择不同的元素计算器或 Composite 驱动。完整替换建立新计算状态，不隐式推断新旧输入的元素身份。

## 统一执行与缓存语义

```text
IR → Reconciler 执行与组装 → Core 原子阶段 → 共享阶段结果
                                      ↓
                        增量模式保留 Weave 缓存
                                      ↓
                           统一输出准备与发布

后续 update → 依赖与有效性判断 → 复用或执行同一阶段 → 准备与提交
```

全量执行同样需要临时名称环境、引用结果、诊断和等待信息，但不因此建立第二种全量中间模型。缓存写入成功与结果可对外发布属于同一候选提交边界，不能先修改已提交 Weave 再准备可能失败的输出。

复用依据包括自身输入、继承、名称绑定、位置与布局提案、Definition、配置和宿主测量条件。不能证明有效时在同一执行器内重算，不能用对象存在或输入未变替代有效性判断。缺失引用、尚未就绪与真实依赖环保持可区分；pending 不放宽原有声明顺序限制。

资源引用与其定义必须随可复用输出配套保存。Reconciler 管理资源工作区及导入时机，复用 Core 资源算法生成本次引用，不原位修改旧片段。输出顺序、裁剪、动画、可见边界、Scene 布局和 artifact 出现顺序在两种模式下相同。

Core 的 resolve 阶段负责默认值、样式与定义解析；依赖已编译布局的位置求值、目标绑定与边界计算属于 compile。引用直接消费完整布局，标识、来源与就绪状态独立保存；Weave 复用已有编译产物，不持久化可由布局派生的引用几何副本。

## Composite 与布局执行

内置和自定义 Composite、实例输入、布局 proposal、几何查询、probe 和 replay 均进入同一 Reconciler 执行链路。Definition 和 lowering 语义仍由 Core 与相应领域包定义；涉及子树执行的能力由 Reconciler 注入，不允许 Core 在内部重新启动完整 Scene 驱动。

试算候选与正式输出隔离；未选中的候选不发布名称、资源、诊断、来源和 artifacts。选中结果按同一领域产物导入，执行方管理资源映射及当前出现位置。compile-local token 不自动成为跨次缓存凭证。

Composite 的最小安全重算边界可为整个 Composite 实例及其生成内容；无法证明更细复用时重算该边界，不回退到旧 Core 全量路线。外部环境或引用变化同样参与该边界的失效。

已有批次地址针对作者声明，不将生成内容的出现位置升级为可跨版本编辑地址。基础元素批次继续遵循既有操作契约；它们不能直接修改 Composite 生成的内部节点。需要替换 Composite 作者输入或不在现有批次输入范围内的声明时，使用 `replace`；这不限制含 Composite 的场景通过同一链路完成首轮编译，或在合法基础元素更新时按依赖重新计算相关 Composite。

Scope 的上下文下传与包络上收保持独立。延迟 Path、后置变换与引用重发布按真实依赖执行；只有真实子输出就绪后才裁剪空组和解析组动画，不能为统一缓存提前决定最终输出。

## 行为、失败语义与兼容性

- 相同 IR、配置和确定性宿主服务下，全量与增量首轮的 Scene、资源、布局、artifacts、诊断及请求的来源事实一致；内部缓存身份和会话 revision 不参与跨会话相等要求。增量更新结果与对最终作者输入执行一次完整编译可观察等价。
- 编译及输出准备失败不发布候选结果、缓存或 warning；已提交输入、产物与版本保持不变。输出目标提交和恢复继续遵循 [064](./064-remove-runtime.md)，不承诺撤销用户服务的任意外部副作用。
- 绘图解析与几何错误保留 Core owner；执行、模式、版本及调度错误属于 Reconciler；宿主错误保留 Render owner。穿越边界保留原始 cause，等待中断不得被误当成 provider 失败或可恢复试算错误。
- Reconciler 不依赖 DOM、Render 或框架；无输出目标也能编译、读取和增量更新。只改变输出目标配置时复用已发布计算结果。
- Vanilla 与 React 通过同一 Reconciler 能力接入，作者 DSL、持久 IR、renderer 的 Scene 契约不因此改变。SSR、静态输出、retained、动画、水合、Inspect 独立编译及 Tier 2 standalone 调用一并迁移，不形成 adapter 专用编译分支。
- 本次直接调整 API 和包职责，不提供兼容别名、旧入口转发、双驱动或静默回退。Core 不重新导出 Reconciler。缓存统一不代表增加通用 Runtime、异步调度或无条件的细粒度性能保证。
- 本决策接受后，替代 [055](./055-reconciler-extraction.md)、[060](./060-core-element-compilation.md)、[061](./061-weave-core-integration.md)、[064](./064-remove-runtime.md) 中 Core 完整驱动与 Reconciler 增量驱动分立、Composite 另走完整 Core 路线的规定；替代 [058](./058-weave-foundation.md)、[060](./060-core-element-compilation.md)、[061](./061-weave-core-integration.md)、[065](./065-compiled-layout-paint.md) 中按元素固定缓存包装及强制 output 随完整 compiled 保存的规定。原子领域语义、变化影响、候选隔离、权威批次、输出事务与 [077](./077-compile-output-contract.md) 的结果收敛原则继续有效。Proposed 不改变现行实现或既有决策效力。
