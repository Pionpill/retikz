# ADR-03：Generation Session 与 LLM 渐进生成

- 状态：Proposed（未排期）
- 决策日期：2026-07-26
- 关联：[ADR-01](./01-cooperative-concurrent-runtime.md) · [ADR-02](./02-progressive-materialization.md)

## 背景

LLM 很少一次稳定地产出完整复杂图形。把 token stream 直接解释成可见 IR 会暴露语法残片和无效引用；把每个小片段直接提交到正式 document 又会污染 history、难以取消，并在基础 revision 改变后覆盖用户修改。

LLM 渐进生成需要的是多个语义合法的 draft transaction。它与 ADR-02 的 progressive materialization 正交：前者逐批改变 draft Snapshot，后者只决定同一个完整 Scene 的显示节奏。Kernel 也不应拥有模型 SDK、prompt 或聊天 UI。

## 决策：独立 Draft Branch，接受时 Squash

`@retikz/runtime` 新增 generic `GenerationSession`。它从正式 Runtime 的已提交 revision 分叉，维护 session-local draft branch；每个 generation batch 在 draft branch 内原子提交一份完整、可验证 Snapshot，但不改变正式 current Snapshot 或正式 history。

```ts
type GenerationBatch<TOperation> = Readonly<{
  id: string;
  operations: ReadonlyArray<TOperation>;
  checkpoint?: string;
}>;

type GenerationDefinition<TInput, TValue, TRead, TChange, TSnapshot, TOperation> = Readonly<{
  key: string;
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;
  snapshot: Readonly<{
    fromRead: (read: TRead) => TSnapshot;
    toInput: (snapshot: TSnapshot) => TInput;
  }>;
  parseOperation: (input: unknown) => TOperation;
  apply: (snapshot: TSnapshot, operations: ReadonlyArray<TOperation>) => TSnapshot;
  validate: (snapshot: TSnapshot) => void;
  diff: (base: TSnapshot, accepted: TSnapshot) => ReadonlyArray<TChange>;
}>;

type GenerationSnapshot<TSnapshot> = Readonly<{
  baseRevision: RuntimeRevision;
  draftRevision: number;
  status: 'active' | 'paused' | 'accepting' | 'accepted' | 'cancelled' | 'conflicted' | 'failed';
  value: TSnapshot;
}>;
```

Generation definition 是按 key 注入的开放 contract，并通过同一个 typed `RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>` token 与正式 owner 绑定。`snapshot.fromRead()` 从 owner 的 immutable read view 建立 draft，`snapshot.toInput()` 把接受后的 draft 转回该 owner 的完整更新输入；二者都由 definition author 实现并接受 conformance 测试。Runtime 只协调 batch、checkpoint、scheduler、revision 和 accept，不解释领域 operation。Core 提供一个默认 generation definition，以稳定 qualified identity 表达 `upsert`、`remove`、`move` 和必要的 owner-specific operation；Plot、Table 或第三方 Tier 2 可以提供自己的 definition，内置与自定义走同一 registry、parse、validation 和 diagnostic 链路。数组下标 JSON Patch 不是公共主协议。

Session 表面：

- `createGenerationSession({ runtime, definition, baseRevision? })` 从 `definition.owner` 的当前正式 read view 分叉；owner 泛型由同一 definition token 推导，不能另传不匹配的 owner。显式旧 base fail-loud。
- `append(batch, { priority?: 'visible' | 'background' })` 先 parse 全批 operation，在隔离 candidate 上 apply / validate，再原子提交下一 draftRevision。
- batch id 在 session 内唯一；重复 id fail-loud，不做隐式幂等覆盖。
- `checkpoint()` 返回包含 base revision、draft revision、完整 draft Snapshot 与 batch log cursor 的 opaque checkpoint。
- `pause()` 停止接收新 batch；`resume(checkpoint)` 校验 definition / owner / base 后恢复。跨进程持久化只有 owner 额外提供 JSON codec 时才支持。
- `cancel()` 取消 scheduled prepare、丢弃 draft branch 并恢复正式 view；正式 Runtime 不变。
- `accept()` 先确认正式 current revision 仍等于 base revision，再调用 definition `snapshot.toInput()` 取得完整 `TInput`、调用 `diff()` 取得领域 change array；Runtime 用已验证的 session base revision经 `createRuntimeChangeSet()` 封装，并以同一个 typed owner token 调用 `createRuntimeOwnerUpdate()`，squash 为一次正式 transaction。Definition 不能自行构造或伪造 ChangeSet revision，也不能把其它 owner 的 input/change 混入本次接受。成功后只有一个正式 revision；generation batch log 不自动进入 history。

生成期间的可见预览由 adapter 显式选择 draft branch 作为 view source，并通过普通 Core Program / retained renderer 编译。每个 draft revision 可以独立选择 atomic 或 progressive materialization；renderer batch 不能反向生成 generation operation，也不能推进 draft revision。

正式 current revision 在 generation 期间变化时，session 进入 `conflicted`：停止追加和接受，保留只读 draft / checkpoint 供导出或人工处理。本提案不自动 rebase、merge 或覆盖 current；调用方只能取消，或基于新正式 revision 创建新 session 并显式重放经 owner 验证的 operation

Operation 输入必须先经过 definition parser；单批任一 operation 无效、apply throw、validation 失败或 scheduled prepare 取消时，整个 draft batch 不提交。Runtime 不接收 token 片段，不猜测缺失字段，也不修复模型输出。

理由：

1. Draft branch 让每批可见且合法，同时不污染正式 document transaction 和 history。
2. 接受时 revision compare + squash 防止 LLM 静默覆盖生成期间的用户修改。
3. Generic definition 让 Core 与 Tier 2 各自拥有领域 operation，Runtime 不成为 LLM 或万能 Patch 引擎。

## 公开影响

- `@retikz/runtime` 新增 GenerationDefinition registry、draft branch、checkpoint、accept/cancel contract。
- `@retikz/core` 新增稳定 identity operation 与默认 generation definition；不新增 LLM 专属 IR 字段。
- React / Vanilla 只负责选择正式或 draft view source、呈现状态和生命周期。
- 公共 API 不 import 任何模型 SDK，不接收 prompt、token stream、message 或 tool-call 对象。

## 长期边界

- 模型调用、prompt、tokenizer、tool schema、聊天 UI、agent loop 或供应商 SDK。
- 自动 merge/rebase、协作、CRDT、正式 undo/redo store 或持久 generation 服务。
- 允许语法不完整或引用无效的部分 IR 进入 draft Snapshot。
- 将 renderer PresentationBatch 当作 generation batch，或将 token 数当作 scheduler budget。

---

Generation 复用 alpha.2 的 Runtime Snapshot、ChangeSet、transaction、scheduler 和 Core stable identity；materialization 只负责 draft revision 的显示节奏，不改变 generation 的 draft 或正式提交语义
