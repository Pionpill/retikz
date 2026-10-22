# @retikz/reconciler

保留 Weave 编译状态，以显式批次更新基础元素，并协调单个输出目标的原子提交。

```ts
import { ReconcilerSession } from '@retikz/reconciler';

const session = new ReconcilerSession();
session.mount({ type: 'scene', version: 1, children: [] });
const result = session.read();
session.dispose();
```

`replace` 接收完整输入并重新编译；`update` 接收 `WeaveBatch`，仅支持基础元素场景。Composite 使用 Core 完整编译。省略输出目标时不访问 DOM，Render 可通过 `ReconcilerCommitTarget` 对接。
