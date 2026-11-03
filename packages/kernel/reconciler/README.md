# @retikz/reconciler

统一执行完整与增量编译，组合 Core 原子阶段，按需保留 Weave 缓存，并协调单个输出目标的原子提交。

```ts
import { ReconcilerSession } from '@retikz/reconciler';

const session = new ReconcilerSession();
session.mount({ type: 'scene', version: 1, children: [] });
const result = session.read();
session.dispose();
```

一次性入口 `compileToScene` / `compileSceneSnapshot` 与会话使用同一执行器。`incremental` 默认 true；false 不保留 Weave，只允许 mount / replace，并拒绝 updateStrategy。`replace` 接收完整输入；`update` 接收 `WeaveBatch`，可修改含 Composite 场景中的作者基础元素。生成子树不可寻址，Composite 作者输入通过 replace 修改。省略输出目标时不访问 DOM，Render 可通过 `ReconcilerCommitTarget` 对接。
