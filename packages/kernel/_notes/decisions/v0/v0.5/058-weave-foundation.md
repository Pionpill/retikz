---
description: 定义 WeaveNode 的组合输入、编译状态、声明结构与计算关联，以及稳定节点的已提交与候选状态模型
keywords: Weave、WeaveNode、WeaveRoot、compiled、pendingInputs、依赖、命名空间
---

# ADR-058：Weave 编译树与节点状态模型

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本目标](./roadmap.md)、[Reconciler 包归属](./055-reconciler-extraction.md)、[Scope 无环几何引用](./057-scope-acyclic-geometry-references.md)

## 目标与职责

以单一 Weave 节点体系承载输入、编译状态和关联，区分声明层级与计算依赖，不重复维护同构的输入树和编译树。Core 拥有绘图解析与编译产物；Reconciler 只读持有产物并管理关联，不建立平行布局模型。

本决策确定基础逻辑模型。更新状态、传播和算法由后续 ADR-059 设计；Core 编译状态契约与实际接入在 roadmap 第二阶段处理。

## WeaveNode

按 [062](./062-weave-node-state-isolation.md)，节点对象保留稳定 type 与 Scope 定位地址，以下输入、编译、声明及关联字段由 current / pending 状态持有。

Scope、Node、Coordinate、Path 组成按 `type` 区分的联合，复用 Core 对应输入类型；Composite 展开后的基础元素进入该模型。Root 仅作声明入口，不承担 Layout 计算；Root 状态持有 Core 的 `CompileEnvironment`，节点不重复保存环境注册表。

| 字段            | 形态与职责                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------ |
| `type`          | 节点类别的字符串字面量                                                                     |
| `parent`        | 所属 Root 或 Scope                                                                         |
| `input`         | `{ own, context }`：当前自身输入与有效继承上下文                                           |
| `compiled`      | Core 按元素定义的 `CompiledNode` / `CompiledCoordinate` / `CompiledPath` / `CompiledScope` |
| `pendingInputs` | `Array<{ ... }>`：自身修改、上下文变化与依赖通知的待处理记录                               |
| `dependencies`  | `Map<WeaveNode, ReadonlyArray<WeaveDependencyKind>>`：依赖节点及读取需求                   |
| `consumers`     | `Set<WeaveNode>`：消费本节点结果的节点                                                     |

`input` 不重复保存合并后的输入，默认与覆盖语义由 Core 决定；Scope 的 own 不携带递归 children。输入相同不能掩盖依赖变化。`compiled` 仅持有和传递，不强转或探测内部结构；由 [060](./060-core-element-compilation.md) 定义 Core 完整状态及输出贡献，按元素区分明确类型，消费者只读访问其可达状态。

`pendingInputs` 不是完整 props 数组：自身修改保持命令顺序，通知按来源与影响范围合并，不统一采用后来者覆盖，也不入队即编译。有效上下文采用 Core 的 `ElementCompileContext`，依赖读取需求仍由后续调度契约确定；待处理条目由 [059](./059-weave-batch-operations.md) 定义为固定来源与影响范围的联合，不再保留任意条目的泛型参数。

## 声明结构与索引

| 类别                     | parent        | children            | ids                                   |
| ------------------------ | ------------- | ------------------- | ------------------------------------- |
| Root                     | `null`        | 有序 WeaveNode 数组 | 根命名空间的 `Map<string, WeaveNode>` |
| Scope                    | Root 或 Scope | 有序 WeaveNode 数组 | 仅开启局部命名空间时持有              |
| Node / Coordinate / Path | Root 或 Scope | 不设置              | 不设置                                |

`ids` 以用户绘图 id 为 key；普通 Scope 沿用所属命名空间，不同命名空间允许同名，无 id 节点不以自身名称入表。id 从自身输入读取，不另存可独立修改的副本；用户 id 与 irPath 均不充当内部全局稳定身份。索引遵循 Core 的绑定、遮蔽及可见性规则，存在目标不等于当前位置允许引用，保留 Path 延后引用能力。

Scope 上下文沿声明树下传，不重复登记继承依赖边。Node 标签和 Path 步骤仍属自身输入。仅保存直接父子关联，不预存完整祖先或后代集合。

## 计算关联

B 依赖 A 时，B.dependencies 记录 A 及读取需求，A.consumers 包含 B；两端统一维护，不另设 producer/consumer 边对象。读取需求只存于消费者，通知表达本次变化来源与内容，接收方据此判断是否重算。例如只读取布局的消费者可忽略纯样式变化；无法可靠细分时保守失效，具体分类待定。

节点关联直接支持遍历，不复制独立依赖图。Scope 与子元素的双向关联不等于计算成环；就绪与环检测须依据实际计算职责，并遵守 [057](./057-scope-acyclic-geometry-references.md)。

## WeaveRoot

按 [062](./062-weave-node-state-isolation.md)，Runtime 直接持有稳定 WeaveRoot，节点与 Root 各自持有 current / pending。声明和计算关联指向稳定对象，读取时统一选择状态视图。未变输入与 Core 编译产物只读共享，可变集合在写入前隔离；子节点属性变化不要求复制父 children。

整批成功后提交触及的状态，失败丢弃 pending，保留已提交状态和输出。提交不是单次 root 指针切换，稳定节点引用也不是历史快照；事务恢复和初次未提交状态遵循 062。

## 后续契约与兼容性

ADR-059 负责首次未编译状态、pendingInputs 条目与生命周期、依赖读取分类、传播、就绪判断、失败恢复、环检测、计算调度和优化。候选构建、提交与丢弃算法及 Runtime 输出发布衔接由后续契约确定；双状态结构不代表已实现 Worker、异步或可抢占并发计算。

本决策不改变现有静态编译、React、Vanilla 或 Runtime 的公开行为，不新增 authoring API，不对外暴露可变节点。Accepted 表示基础模型获批，不表示增量计算或运行时接入已经实现。
