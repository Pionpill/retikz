---
name: standard-tier2-reuse
description: Use when designing or reviewing a retikz Tier 2 composite or its shared schema/type and lowering, especially when a composite wraps Core children, exposes Scope-like props, projects a Core contract, or risks duplicated fields, dropped props, unstable identity, or React/Vanilla/docs/test drift across Standard, Plot, Table, or other Tier 2 packages.
---

# Standard Tier 2 Reuse

## Overview

把 Tier 2 composite 视为 Core 能力的组合与投影：复用下层已有契约和 pipeline 能力，并保持可观察语义完整。不要把“当前组件能画出来”当作复用完成；默认要求 scope、identity、lowering 和 authoring 入口形成闭环

## 边界

- 先读 `standard-structure`，再按实际改动读取 `standard-schema`、`standard-contract`、`standard-providers`、`standard-pipeline-compile` 和 `test-contract`。本 skill 只负责跨层的复用判定与闭环门槛，不替代这些层级 skill
- 固定 `Tier 2 → Standard/Core` 的依赖方向。领域字段留在 Plot、Table 等 owner；去掉领域词汇后仍成立、且有多个消费者的绘图语义才下沉到 Standard/Core
- 以当前 Core `ScopeSchema`、`IRScope`、definition 和 compile 行为为 source of truth；以下 scope 分类是审计维度，不是可任意删减的字段白名单

## 1. 冻结 owner 与 surface

在设计或实现前，为每个公开字段写清 owner、来源契约、默认值、refinement、作用范围和目标。按以下维度分类：

| 维度 | 当前 Scope 的典型能力 |
| --- | --- |
| group / identity | `id`、`localNamespace`、`zIndex`、`meta`、`animations` |
| geometry / placement | `transforms`、`placement`、`clip`、`boundingShape` |
| Theme environment | `theme` 及其向后代 composite 的逐字段继承 |
| inherited appearance | 级联 graphic style、`nodeDefault`、`pathDefault`、`labelDefault`、`arrowDefault`、`resetStyle` |
| child-owned | `children` 及节点、路径、坐标的几何和显式样式 |
| domain-owned | 刻度、网格、数据、scale、表格规则等领域语义 |

对明确拥有 Scope-backed public surface、或根语义就是一个 Scope container 的 composite，默认应能承载完整的 Core Scope surface。若所选 channel 不具备该能力，必须改用能保留语义的路径，或把收窄登记为显式例外；不能把不可能的映射写成“已支持”。普通 `expand` 仅返回多个、彼此没有共享 group 语义的 child 时，不得为了数量机械制造 wrapper。任何收窄都必须是显式例外，而不是通过 `Omit`、destructure 或 wrapper 重建悄悄丢失

先确认所选 Core lowering channel。普通 `CompositeDefinition.expand` 可以返回 `IRChild | Array<IRChild>`；layout-aware `compile` 的 `context.scope()` 只接受 Core 声明的结构属性，`replay` wrapper 只接受已 lowering 的 transforms/clip，不能重新施加 placement、样式 defaults 或 `resetStyle`。因此每个字段必须落到实际可用的 channel；不能把 `context.scope()` 当作完整 `IRScope` 的替身

| channel | 根输出规则 |
| --- | --- |
| `expand` | 有共享 Scope 语义时输出普通 `IRScope`；无共享语义时可输出有序 child 数组 |
| layout-aware `compile` | 使用 `context.scope()` / `replay()` 形成 compile-local opaque child，只能使用该 channel 声明的属性；需要普通 `IRScope` 才能表达的字段必须换路径或记录 Core capability gap |

## 2. 原子契约与组合

- 从拥有者 barrel 复用命名 schema/type/contract；不得复制相同字段声明。复用后核对 strict unknown-field、默认值、refinement、JSON 可序列化行为和 lowering 语义
- 一次性的窄投影可以使用 `pick`、`omit`、`extend` 或 `.shape`；两个以上 Tier 2 重复同一投影时，先评估是否应在下层补命名的原子契约
- 原子边界按可观察语义、不变量和扩展边界划分，不按字段机械拆分，也不为消除一次投影把消费方专属默认值或领域限制下沉

## 3. 根 Scope 与完整 lowering

- composite 暴露 group/inherited Scope 能力，或其领域契约明确表示生成 child 共享一个可观察的 Scope 时，按所选 channel 产出稳定的根 Scope（`expand` 为普通 `IRScope`，layout-aware `compile` 为受限 opaque Scope child），所有生成 child 放入其 children/replay 结构。多个 child 本身不是 wrapper 的充分理由；wrapper 的存在由组合语义决定，不由快照方便、数组长度或当前实现决定
- 一旦根形状确定，空输入、嵌套和不同数据形态不能改变根输出契约。无 Scope 语义的普通多 child expand 可以保持数组；有 Scope 语义却省略 wrapper 时，必须给出跨 transform、style、clip、identity、bounds 的等价证明
- 每个已接受字段必须记录输入路径、owner、权威来源、所选 lowering channel、目标或转换、失败阶段、可观察诊断、owner 和 deferred 退出条件。字段只能直接 lower、转换后 lower，或在明确边界处拒绝 / 诊断 / deferred；不得静默忽略或把领域字段伪装成 Standard 字段
- 外层 Scope 属性只 lower 一次并作用于整个 composite；不要把外层 transform、clip、style 或 placement 重复写入每个 child
- 组合语义必须引用 Core 的现有规则：普通 Scope transform 按其数组顺序应用，placement 的时机与 intrinsic layout 对齐，普通 Scope clip 使用 Scope-local 坐标；layout-aware replay wrapper 的 clip 使用 placement 后的 parent-allocation 坐标，runtime transforms 也不等同于完整 `IRTransform`。级联 graphic style 向 child 继承，child 显式值优先，`resetStyle` 按命名通道切断继承。Theme 是独立环境，不因 `resetStyle` 被当作 graphic style 清除。若所选 channel 不支持其中一项，就改变 lowering 路径或显式拒绝，不自行发明等价语义

## 4. Identity 与组合语义

- `id` 是 contract，不是普通样式：至少追踪 authored Scope id → 根 Scope/生成 child → Core 定义的 parent namespace、anchor/reference、bbox 和 prune 行为。另行区分 compile occurrence path、领域 item key、宿主 embed id 与 provenance/locator；它们有不同生命周期、唯一范围、碰撞和重排稳定性，只有 owner 明确声明时才能建立映射。不得把数组下标、JSON 内容 hash 或未声明映射的宿主 embed id 冒充稳定 identity
- 写明 child 顺序、空输入、嵌套、外层与内部 transform 顺序、clip 范围、placement/bounds、兄弟级 `zIndex`、重复 id、`localNamespace`、空 wrapper/prune 和生成 id 规则，并复用 Core 的既有语义
- 写明默认值与显式值的优先级：用户显式 Scope 值不能被 composite 默认覆盖，child 显式样式不能被继承默认覆盖；`undefined`、`false`、`0` 必须保持语义
- Scope `meta` 不自动继承给 child；必须说明用户 meta、root/child provenance 的落点、是否传播和字段级冲突规则，保留用户数据且不得无声覆盖

## 5. 闭环证据与例外

完成一个 composite 前，核对：schema → 派生 type → factory/adapter → pipeline/lowering → Core IR/Scene 及 owner 已公开的 manifest/artifact 可观察结果 → React/Vanilla parity → 中英文 docs → 最低测试证据。持久化或 registry-backed composite 必须补齐 `definition/registry`、options 注入、未注册诊断和公开导出；authoring-only Sugar 或 adapter-private 转换必须显式标明分类和 canonical Core IR source，不能用“definition 如有”绕过注册链。公共 schema、IR、lowering 或用户可见行为变化，按 `test-contract` 留下行为、不变量、反例和最低测试层

最低测试证据至少覆盖：所选 expand/compile channel、nested namespace 与 duplicate id、empty/pruned wrapper、Theme 与 `resetStyle` 独立性、placement/transform 顺序、两种 clip 坐标、meta/provenance 落点，以及 React/Vanilla canonical IR 或语义等价 Core contribution 对比。宿主 occurrence、embed 或 inspection sidecar 的差异必须有显式映射说明。修改 adapter 或 docs 时，继续读取其就近 `AGENTS.md` 和对应 docs skill

任何不支持或延后的能力必须同时写明：字段清单、语义原因、替代入口、失败/诊断行为、owner 及对 lowering/docs/tests 的影响。永久例外还要固定公开契约和测试，不要求虚构退出日期；临时 `deferred` / `blocked` 则必须补风险、退出条件和承接位置，并在解除前只能称为未闭环，不能称为 complete 或 publish-ready

## 快速审计

| 检查 | 通过条件 |
| --- | --- |
| 根形状 | 共享 Scope 语义时有稳定外层 Scope；无 group 语义的普通多 child 不被机械包装 |
| 字段 | 每个字段有 owner、权威来源和完整默认/refinement 语义 |
| lowering | 每个接受字段都有直接映射、转换映射或显式诊断 |
| identity | Core identity 可追踪；artifact/locator/provenance 仅在其 owner 公开时纳入 |
| 组合 | transform、clip、style、顺序、空输入和 metadata 规则明确 |
| 闭环 | React/Vanilla 产出同一 canonical IR，或有明确宿主差异映射的语义等价 Core contribution；docs 与测试同步 |

## 红旗

- API 接受 `id`、`clip`、`transforms` 或 style，但 pipeline 仍返回无 wrapper 的 `Path/Node[]`
- 用 layout-aware `context.scope()` 声称支持普通 `IRScope` 不具备的 placement、style defaults 或 `resetStyle`
- 多个 Tier 2 各自复制 `ScopeSchema` 字段，或只保留当前测试覆盖的少数字段
- registry-backed composite 由 adapter 直接产出 IR，绕过 Definition/registry
- 用“快照会变化”“以后补 adapter/docs/tests”“当前只看 axes/grid”解释静默收窄
- 用数组位置生成长期 id，或把用户 `meta` 直接与 provenance 覆盖合并
- 把不能下沉的领域字段丢弃，却仍把该 composite 标为完成
