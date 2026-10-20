---
description: 定义 WeaveNode 的组合输入、编译状态、声明结构与计算关联，以及 WeaveTree 的已提交与候选根状态模型
keywords: Weave、WeaveNode、WeaveTree、compiled、pendingInputs、依赖、命名空间
---

# ADR-058：Weave 编译树与节点状态模型

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本目标](./roadmap.md)、[Reconciler 包归属](./055-reconciler-extraction.md)、[Scope 无环几何引用](./057-scope-acyclic-geometry-references.md)

## 目标与职责

以单一 Weave 节点体系承载输入、编译状态和关联，区分声明层级与计算依赖，不重复维护同构的输入树和编译树。Core 拥有绘图解析与编译产物；Reconciler 只读持有产物并管理关联，不建立平行布局模型。

本决策确定基础逻辑模型。更新状态、传播和算法由后续 ADR-059 设计；Core 编译状态契约与实际接入在 roadmap 第二阶段处理。

## WeaveNode

Scope、Node、Coordinate、Path 组成按 `type` 区分的联合，复用 Core 对应输入类型；Composite 展开后的基础元素进入该模型。Root 仅作声明入口，不承担 Layout 计算。

| 字段            | 形态与职责                                                   |
| --------------- | ------------------------------------------------------------ |
| `type`          | 节点类别的字符串字面量                                       |
| `parent`        | 所属 Root 或 Scope                                           |
| `input`         | `{ own, scope }`：当前自身输入与有效继承上下文               |
| `compiled`      | `unknown`：Core 编译状态的类型占位                           |
| `pendingInputs` | `Array<{ ... }>`：自身修改、上下文变化与依赖通知的待处理记录 |
| `dependencies`  | `Map<WeaveNode, DependencyUsage>`：依赖节点及读取需求        |
| `consumers`     | `Set<WeaveNode>`：消费本节点结果的节点                       |

`input` 不重复保存合并后的输入，默认与覆盖语义由 Core 决定；Scope 的 own 不携带递归 children。输入相同不能掩盖依赖变化。`compiled` 仅持有和传递，不强转或探测内部结构；接入时由 Core 提供与 NodeLayout 同等职责、按元素区分的明确类型，并保证可达状态只读。

`pendingInputs` 不是完整 props 数组：自身修改保持命令顺序，通知按来源与影响范围合并，不统一采用后来者覆盖，也不入队即编译。有效上下文与读取需求类型留待 Core 接入和依赖契约确定；待处理条目由 [059](./059-weave-batch-operations.md) 定义为固定来源与影响范围的联合，不再保留任意条目的泛型参数。

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

## WeaveTree

```ts
type WeaveTree = {
  /** 已提交版本的声明根 */
  current: WeaveRoot;
  /** 候选版本的声明根，无候选计算时为 null */
  candidate: WeaveRoot | null;
};
```

WeaveTree 直接持有两份 Root 入口，不增加版本包装对象。每个节点对象表示一个树版本中的状态，不在节点内部再拆 current / candidate state。候选计算期间 current 的可达状态保持只读；整批成功后切换 current，失败或取消时放弃 candidate，保留已提交版本。

- 不可变输入与 Core 编译产物可以共享；可变的声明关系、依赖与消费者集合、待处理记录和索引必须隔离，不得通过共享引用污染 current
- 节点引用与索引必须按所属版本一致解析；复制范围、跨版本引用及复用算法由后续更新契约确定，不预设仅复制变化节点即可满足隔离
- 失效或尚未完成的节点不能将旧 compiled 当作本批已就绪结果；只有完整候选结果才能发布给 Render，已发布输出不得被后续计算修改
- 放弃候选不等于丢弃更新请求；未提交请求的保留、重试与合并由后续更新机制确定
- 不重复建立独立依赖图；Scope 定位注册表随 Core 接入设计，并遵守版本隔离

## 后续契约与兼容性

ADR-059 负责首次未编译状态、pendingInputs 条目与生命周期、依赖读取分类、传播、就绪判断、失败恢复、环检测、计算调度和优化。候选构建、提交与丢弃算法及 Runtime 输出发布衔接由后续契约确定；双根结构不代表已实现 Worker、异步或可抢占并发计算。

本决策不改变现有静态编译、React、Vanilla 或 Runtime 的公开行为，不新增 authoring API，不对外暴露可变节点。Accepted 表示基础模型获批，不表示增量计算或运行时接入已经实现。
