---
description: 将 Weave 双根版本改为稳定节点引用与 current/pending 双状态，按需隔离可变集合并适配首次编译，批次更新另行设计
keywords: Weave、WeaveNode、WeaveRoot、current、pending、状态隔离、写时复制、提交
---

# ADR-062：Weave 稳定节点与双状态隔离

- 状态：Accepted
- 决策日期：2026-10-21
- 关联：[版本目标](./roadmap.md)、[058](./058-weave-foundation.md)、[059](./059-weave-batch-operations.md)、[061](./061-weave-core-integration.md)

## 背景与目标

Weave 同时保存声明关系和跨节点计算关联。若每个候选版本都更换节点对象，父子关系、依赖、消费者与索引也需要重新对应节点版本。候选隔离应围绕发生变化的状态建立，不应要求每批复制完整节点图。

采用稳定节点对象与 current / pending 双状态。先完成状态模型重构并适配现有首次编译与完整输入替换；批次 update 的输入执行、传播、就绪判断及调度另行设计，不以本决策宣称增量更新已经可用。

本决策获接受后，替代 [058](./058-weave-foundation.md)、[061](./061-weave-core-integration.md) 的双根及整节点版本隔离约定；[059](./059-weave-batch-operations.md) 的候选结构与整批提交语义保持，候选由 pending 状态表达。

## 核心结构

节点对象作为生命周期内稳定的关联目标，状态随计算批次变化。不新增内部字符串 identity，不改变用户 id、scopeId 或位置地址的含义。

| 对象                     | 稳定字段      | 已提交状态 | 候选状态 |
| ------------------------ | ------------- | ---------- | -------- |
| Node / Coordinate / Path | type          | current    | pending  |
| Scope                    | type、scopeId | current    | pending  |
| Root                     | type、scopeId | current    | pending  |

Runtime 直接持有 WeaveRoot，不再增加仅包装 root 的树对象。

current 与 pending 使用对应类别的状态类型，禁止混入其它类别的输入或 compiled。pending 为 null 表示该节点没有候选状态。尚未首次提交的新节点允许 current 为 null；它必须持有候选状态，且只能从候选声明结构和索引访问。已发布树内的节点必须具有 current。

节点状态保留以下事实：

- 基础状态：parent、input、compiled、pendingInputs、dependencies、consumers；input 仍为 own 与 context 两个对象
- Scope 状态额外包含 children 与局部命名空间 ids；own 不重复包含 children
- Root 状态包含 Scene 自身 input、children、environment、ids、scopeIds 与 records；Root 无父节点，也不承担元素 compiled

parent、children、dependencies、consumers、ids、scopeIds 与 records 的节点引用均指向稳定节点对象。读取关系时必须统一选择已提交视图或候选视图，不能沿关联任意混读两个视图。候选读取优先使用 pending，无 pending 时复用 current；复用状态不等于其 compiled 已满足本批依赖就绪条件。

pending 是完整的候选逻辑状态，pendingInputs 是其中的变化记录，二者不等同。未开始批次更新前，不增加虚假的更新入口或调度逻辑。

## 按需隔离与共享

current 的可达可变内容不得在候选计算中原地修改。首次修改节点时建立候选状态，未变字段可共享；共享前提是双方均只读消费。

- Core 输入、上下文、编译产物和稳定环境保持只读共享，发生替换时只写候选字段，不深拷贝整个编译对象图
- children、依赖 Map、消费者 Set、索引及记录等集合，在本批首次修改前取得独占副本；集合内部的数组、记录等可变值同样需要隔离，不能仅复制外层集合后修改共享值
- Scope 仅在子成员增删或顺序改变时复制 children；子节点输入或 compiled 变化不要求复制父 children，也不要求逐层复制祖先
- 一条依赖关系的增删同时更新两端的候选状态；已提交视图中的正反向关系保持一致
- Core 名称绑定、观察会话、资源收集等可变编译工作区由本次计算独占，不因节点对象稳定而跨批共享

隔离成本由触及的状态及被复制集合的大小决定。拥有大量直接子节点的 Scope 在结构修改时仍可能复制较大的 children；Root 索引变化也可能产生全表复制成本，不承诺成本只等于修改节点数量。

## 提交与失败语义

同一棵树同时只允许一个候选计算批次。成功提交前必须完成编译、关联维护和完整输出准备；任何准备失败均丢弃候选状态和工作区，保留已提交状态与输出。新节点在失败后不可从已提交结构或索引到达。

提交以本批触及的节点为集合，统一将候选状态确认为已提交状态并清除 pending。此过程不是单次 root 指针切换；提交区间不得执行用户回调、异步让出或允许读取混合版本。已发布输出不依赖可变节点视图，后续候选计算不得改变旧 Scene。

与 Runtime 协作时，节点状态和完整输出必须属于同一事务结果；事务成功确认前保留必要的旧状态引用，若后续参与者提交失败，须恢复本批已切换状态。回滚保证内部提交一致性，不撤销用户服务已经产生的外部副作用，也不提供用户历史撤销功能。

首次编译在尚未发布的候选结构上完成，成功后形成可提交的完整树与输出。完整输入替换仍创建独立的新树，不推断新旧节点身份；旧树保留到替换事务完成。

稳定节点的 current 会随提交前进，持有旧 Root 或节点引用不构成历史快照。本模型提供单候选隔离，不提供多候选并发、Worker 共享对象、可抢占调度或任意历史版本读取。

## 兼容性

直接替换旧的树级 current / candidate 和节点直接状态字段，不保留旧字段别名或兼容层。Core 仍拥有编译状态与计算语义，Runtime 仍拥有通用事务；本次不改变绘图 IR、Scene、水合地址或 React / Vanilla authoring API，不新增公开可变节点入口。
