# @retikz/reconciler

Retikz Core 增量编译包，复用 Core 的静态编译能力与 Runtime 的事务底座。

```ts
import { CoreSourceDefinition, createCoreComputation } from '@retikz/reconciler';
```

该包提供 Core 文档 Source、Computation、SceneRuntimeSnapshot 与 ScenePatch。输入仍是完整 IR 快照；当前仅支持受限的节点填充色快路径，其余变化回退完整编译。增量机制仍为实验性功能。

Core 的 `prepareSceneCompilation` 提供不派发 warning 的单次编译结果，以及按需收集的来源信息；Reconciler 负责跨版本身份、复用与更新产物，不复制绘图语义。

Incremental Core compilation and Runtime integration. This package owns the document Source and Computation, cross-revision identity and reuse, SceneRuntimeSnapshot, and ScenePatch. It currently accepts full IR snapshots, supports a restricted node-fill fast path, and falls back to full compilation for other changes. The incremental mechanism is experimental.
