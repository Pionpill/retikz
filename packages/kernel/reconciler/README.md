# @retikz/reconciler

Retikz Core 增量编译包，复用 Core 的静态编译能力与 Runtime 的事务底座。

```ts
import { CoreSourceDefinition, createCoreComputation } from '@retikz/reconciler';
```

该包提供 Core 文档 Source、Computation、SceneRuntimeSnapshot 与 ScenePatch。输入仍是完整 IR 快照。基础元素通过 Weave 保存声明关系、Core 编译状态与版本内引用；含 Composite 的输入保留 Core 完整准备路径。当前输入替换完整准备新树并发布 replaceScene，原节点填充色特例已移除；WeaveBatch 与细粒度增量调度尚未接入。

Core 的 `prepareSceneCompilation` 提供不派发 warning 的单次编译结果，以及按需收集的来源信息；Reconciler 负责跨版本身份、复用与更新产物，不复制绘图语义。

Incremental Core compilation and Runtime integration. This package owns the document Source and Computation, cross-revision identity and reuse, SceneRuntimeSnapshot, and ScenePatch. It accepts full IR snapshots. Basic elements are compiled through Weave; Composite input retains Core full preparation. Snapshot replacement prepares a new tree and publishes replaceScene. The previous node-fill special case is removed; WeaveBatch execution and fine-grained incremental scheduling are not yet connected.
