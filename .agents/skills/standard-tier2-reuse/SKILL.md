---
name: standard-tier2-reuse
description: Use when designing or reviewing a retikz Tier 2 composite, its schema/type/contract, or a lowering path that emits Standard/Core elements and may duplicate, narrow, drop, or reinterpret lower-layer behavior such as layout, geometry, style, identity, diagnostics, artifacts, or adapter output.
---

# Standard Tier 2 Reuse

## Overview

把 Tier 2 composite 视为下层能力的领域组合与投影：凡是能 lower 到已有 Standard/Core 元素或能力，都必须直接复用其 canonical 契约、逻辑和输出路径。复用不只针对 schema/type，也包括 contract、provider、registry、布局与几何算法、transform、clip、style/theme、identity/namespace、diagnostics、artifact/manifest、compile/replay 及 adapter parity。Tier 2 只负责领域语义、组合以及必要的领域默认和约束；下层缺少通用能力时，应先补下层 capability，或登记显式 capability gap

## 边界

- 先读 `standard-structure`，再按实际改动读取 `standard-schema`、`standard-contract`、`standard-providers`、`standard-pipeline-compile` 和 `test-contract`。本 skill 只负责跨层的完整复用判定与闭环门槛，不替代这些层级 skill
- 固定 `Tier 2 → Standard/Core` 的依赖方向。领域字段留在 Plot、Table 等 owner；去掉领域词汇后仍成立、且有多个消费者的绘图语义才下沉到 Standard/Core
- 以每个 lower target owner 的公开契约、canonical lowering/pipeline、compile、Scene 及 manifest/artifact 行为为 source of truth；Scope 只是最常见的审计案例，不是本 skill 的范围边界
- 如果 Tier 2 的生成结果可以表示为已有下层元素（例如 Scope、Node、Path、Label 或其他 Standard/Core capability），就使用该元素的拥有者和完整逻辑。没有对应下层 owner 时，先判断是否应新增通用 capability，不得在 Tier 2 复制一套等价实现

## 1. 冻结 lower target 与 surface

在设计或实现前，为每个生成的 lower element 和公开字段写清 owner、canonical 来源、默认值、refinement、作用范围、所选 lowering channel、目标和诊断。至少建立以下映射：

| lower target            | 权威 owner / 入口                                                                    | Tier 2 输入        | 下层完整能力                           | 领域专属部分                 |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------ | -------------------------------------- | ---------------------------- |
| 生成的元素或 capability | schema/type、definition、provider、registry、pipeline 或 compile 的 canonical barrel | 输入字段和组合位置 | 下层所有可观察属性、默认值、算法和输出 | 领域数据、语义解析、领域约束 |

一旦 composite 公开或生成一个已有下层元素，默认继承该元素的全部下层功能和语义，包括后续新增的 lower-facing 属性。领域 API 可以增加领域字段，但不得静默收窄、重命名后丢失或重新解释下层 surface。确需收窄时，必须作为显式领域设计例外，写明原因、替代入口、失败/诊断行为、owner、测试和退出条件

Scope 是常见的 lower target，其审计维度包括：

| 维度                 | Scope 的典型能力                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| group / identity     | `id`、`localNamespace`、`zIndex`、`meta`、`animations`                                         |
| geometry / placement | `transforms`、`placement`、`clip`、`boundingShape`                                             |
| Theme environment    | `theme` 及其向后代 composite 的逐字段继承                                                      |
| inherited appearance | 级联 graphic style、`nodeDefault`、`pathDefault`、`labelDefault`、`arrowDefault`、`resetStyle` |
| child-owned          | `children` 及节点、路径、坐标的几何和显式样式                                                  |

这些维度只能帮助发现缺口，不能成为可任意删减的字段白名单。对于明确拥有 Scope-backed public surface、或根语义就是一个 Scope container 的 composite，默认应能承载完整的 Core Scope surface

先确认所选 lowering channel。普通 `CompositeDefinition.expand` 可以返回 `IRChild | Array<IRChild>`；layout-aware `compile` 的 `context.scope()` 只接受 Core 声明的结构属性，`replay` wrapper 只接受已 lowering 的 transforms/clip，不能重新施加 placement、样式 defaults 或 `resetStyle`。每个 lower target 及其字段都必须落到实际可用的 channel；不能把受限 channel 当作完整下层 contract 的替身

| channel                | 根输出规则                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expand`               | 有共享 group 语义时输出普通 `IRScope`；无共享语义时可输出有序 child 数组                                                                                                                            |
| layout-aware `compile` | 使用 `context.scope()` / `replay()` 形成 compile-local opaque child，只能使用该 channel 声明的属性；需要普通 `IRScope` 或其他完整 lower target 才能表达的字段，必须换路径或记录 Core capability gap |

## 2. 原子契约与底层逻辑复用

- 从拥有者 barrel 复用命名 schema/type/contract、definition/provider/registry 和 pipeline/compile 入口；不得复制相同字段声明或另造 lower target 的私有消费路径
- 复用下层元素时，直接调用或组合其 canonical lowering 逻辑，连同 strict unknown-field、默认值、refinement、错误/诊断、JSON 可序列化行为、布局/几何、样式继承和输出 artifact 一并复用。只复用 schema/type、随后自己重写 lowering，不算复用
- 不得在 Tier 2、adapter 或 renderer 中复制下层已有的查表/fallback、边界计算、测量、布局、transform/clip 合成、style/theme 解析、identity 生成、manifest/diagnostics 或 Scene 输出算法。需要改变领域输入时，只做最小的领域转换后继续走下层 canonical path
- 一次性的窄投影可以使用 `pick`、`omit`、`extend` 或 `.shape`；两个以上 Tier 2 重复同一投影或逻辑时，先评估是否应在下层补命名的原子契约或 capability
- 原子边界按可观察语义、不变量和扩展边界划分，不按字段机械拆分，也不为消除一次投影把消费方专属默认值或领域限制下沉

## 3. 完整 lowering 与组合语义

- 对每个生成的 lower element 建立“输入 → canonical lower owner/入口 → channel → 输出/诊断”的映射。每个接受的 lower-facing 字段必须直接 lower、经过明确领域转换后 lower，或作为显式例外拒绝/诊断/deferred；不得静默忽略、伪装成领域字段或由 adapter 私自消费
- 复用目标元素的全部 lower-facing surface；下层增加属性、默认值、refinement 或可观察输出时，Tier 2 不得继续依赖旧的局部副本。公开字段的收窄必须能在映射表和测试中被发现
- composite 暴露 group/inherited Scope 能力，或其领域契约明确表示生成 child 共享一个可观察的 Scope 时，按所选 channel 产出稳定的根 Scope（`expand` 为普通 `IRScope`，layout-aware `compile` 为受限 opaque Scope child），所有生成 child 放入其 children/replay 结构。多个 child 本身不是 wrapper 的充分理由；wrapper 的存在由组合语义决定
- 一旦根形状确定，空输入、嵌套和不同数据形态不能改变根输出契约。无 Scope 语义的普通多 child expand 可以保持数组；有 Scope 语义却省略 wrapper 时，必须给出跨 transform、style、clip、identity、bounds 的等价证明
- 外层 lower 属性只 lower 一次并作用于其声明的组合范围；不要把外层 transform、clip、style、placement 或其他行为重复写入每个 child，也不要在 child 上重新实现下层算法
- 组合语义必须引用下层现有规则：普通 Scope transform 按其数组顺序应用，placement 的时机与 intrinsic layout 对齐，普通 Scope clip 使用 Scope-local 坐标；layout-aware replay wrapper 的 clip 使用 placement 后的 parent-allocation 坐标，runtime transforms 也不等同于完整 `IRTransform`。级联 graphic style 向 child 继承，child 显式值优先，`resetStyle` 按命名通道切断继承。Theme 是独立环境，不因 `resetStyle` 被当作 graphic style 清除。若所选 channel 不支持其中一项，就改变 lowering 路径或显式拒绝，不自行发明等价语义

## 4. Identity 与跨元素组合

- `id` 是 contract，不是普通样式：对每个 lower target 都要追踪 authored id → 生成的 lower element → 下层定义的 parent namespace、anchor/reference、bbox、prune 和 artifact 行为。另行区分 compile occurrence path、领域 item key、宿主 embed id 与 provenance/locator；它们有不同生命周期、唯一范围、碰撞和重排稳定性，只有 owner 明确声明时才能建立映射。不得把数组下标、JSON 内容 hash 或未声明映射的宿主 embed id 冒充稳定 identity
- 写明 lower element 顺序、空输入、嵌套、外层与内部 transform 顺序、clip 范围、placement/bounds、兄弟级 `zIndex`、重复 id、`localNamespace`、空 wrapper/prune 和生成 id 规则，并复用下层既有语义
- 写明默认值与显式值的优先级：用户显式 lower 值不能被 composite 默认覆盖，child 显式样式不能被继承默认覆盖；`undefined`、`false`、`0` 必须保持语义
- Scope `meta` 不自动继承给 child；必须说明用户 meta、root/child provenance 的落点、是否传播和字段级冲突规则，保留用户数据且不得无声覆盖

## 5. 闭环证据与例外

完成一个 composite 前，核对：领域 schema → 下层 schema/type/contract → factory/adapter → provider/registry → pipeline/lowering → canonical Core/Standard compile → IR/Scene、manifest/artifact 和 diagnostics → React/Vanilla parity → 中英文 docs → 最低测试证据。持久化或 registry-backed composite 必须补齐 `definition/registry`、options 注入、未注册诊断和公开导出；authoring-only Sugar 或 adapter-private 转换必须显式标明分类和 canonical Core IR source，不能用“definition 如有”绕过注册链

最低测试证据至少覆盖：每个 lower target 的 canonical path 和所选 expand/compile channel、nested namespace 与 duplicate id、empty/pruned wrapper、Theme 与 `resetStyle` 独立性、placement/transform 顺序、两种 clip 坐标、meta/provenance 落点、下层默认值/refinement/诊断、下层新增属性不被静默丢弃，以及 React/Vanilla canonical IR 或语义等价 Core contribution 对比。宿主 occurrence、embed 或 inspection sidecar 的差异必须有显式映射说明。公共 schema、IR、lowering 或用户可见行为变化，按 `test-contract` 留下行为、不变量、反例和最低测试层

任何不支持或延后的能力必须同时写明：字段和 lower element 清单、语义原因、替代入口、失败/诊断行为、owner 及对 lowering/docs/tests 的影响。永久例外还要固定公开契约和测试，不要求虚构退出日期；临时 `deferred` / `blocked` 则必须补风险、退出条件和承接位置，并在解除前只能称为未闭环，不能称为 complete 或 publish-ready

## 快速审计

| 检查          | 通过条件                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| lower target  | 每个生成元素都有明确 owner、canonical 入口和依赖方向                                                   |
| lower surface | 已有下层元素的全部 lower-facing 功能都能下沉；收窄均为显式例外                                         |
| 逻辑复用      | schema/type、contract、pipeline、算法、诊断和输出路径没有平行实现                                      |
| 根形状        | 共享 Scope 语义时有稳定外层 Scope；无 group 语义的普通多 child 不被机械包装                            |
| 字段          | 每个字段有 owner、权威来源、完整默认/refinement 语义和失败行为                                         |
| lowering      | 每个 lower element 和字段都有直接映射、转换映射或显式诊断                                              |
| identity      | 下层 identity 可追踪；artifact/locator/provenance 仅在其 owner 公开时纳入                              |
| 组合          | transform、clip、style、顺序、空输入和 metadata 规则明确且沿用下层语义                                 |
| 闭环          | React/Vanilla 产出同一 canonical IR，或有明确宿主差异映射的语义等价 Core contribution；docs 与测试同步 |

## 红旗

- Tier 2 生成了已有下层可表达的 Node/Path/Label/Scope，却自行创建 IR、Scene 或 renderer 指令
- 只复用下层 schema/type，随后在 Tier 2、adapter 或 renderer 重写 provider、registry、查表/fallback、测量、布局、几何、transform、clip、style、identity、diagnostics 或 artifact 逻辑
- 下层元素新增一个 lower-facing 属性后，Tier 2 仍依赖旧的 `pick` / `Omit` / destructure 或 wrapper 重建而静默丢失它
- API 接受 `id`、`clip`、`transforms`、style 或其他下层属性，但 pipeline 仍返回无对应 lower wrapper 的 `Path/Node[]`
- 用 layout-aware `context.scope()` 声称支持普通 `IRScope` 不具备的 placement、style defaults 或 `resetStyle`
- 多个 Tier 2 各自复制下层 schema、type、算法或输出路径，或只保留当前测试覆盖的少数字段
- registry-backed composite 由 adapter 直接产出 IR，绕过 Definition/registry；或没有 lower capability 时在 Tier 2 私自造平行机制
- 用“快照会变化”“以后补 adapter/docs/tests”“当前只看 axes/grid”解释静默收窄
- 用数组位置生成长期 id，或把用户 `meta` 直接与 provenance 覆盖合并
- 把不能下沉的领域字段丢弃，却仍把该 composite 标为完成
