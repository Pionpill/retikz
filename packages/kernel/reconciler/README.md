# @retikz/reconciler

统一执行完整与增量编译，组合 Core 原子阶段，按需保留 Weave 缓存，并协调单个输出目标的原子提交。

```ts
import { compileToScene } from '@retikz/vanilla';

const result = compileToScene({ type: 'scene', version: 1, children: [] });
console.log(result.scene, result.artifacts);
```

所有完整与增量编译都通过 `SceneReconciler`。一次性调用创建 `incremental: false` 的临时实例，取得 `mount(source).compilation` 后在 `finally` 中释放。`incremental` 默认 true；false 不保留 Weave，支持 mount / replace / updateTarget，拒绝批次更新和 updateStrategy。`replace` 接收完整输入；`update` 接收 `WeaveBatch`，可修改含 Composite 场景中的作者基础元素。生成子树不可寻址，Composite 作者输入通过 replace 修改。省略输出目标时不访问 DOM，Render 可通过 `ReconcilerCommitTarget` 对接。
