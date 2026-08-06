# ADR-02：Runtime Identity 与 Owner Registry

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-01](./01-performance-observability-baseline.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [包拓扑](../../../../../../../notes/architecture/package-topology.md)

## 背景

Core、Render、Data、Plot、Table 与 adapter 都需要跨更新稳定地描述领域 owner、完整 Snapshot 和实体 identity。现有 `VanillaRuntimeMeta` 只有 adapter-local 字符串索引，Core compile occurrence 也只在单次 compile 内稳定；两者都不能成为跨 revision 公共寻址契约。

Identity 与 owner value 的捕获、只读访问和释放是 transaction 的前置，但不应与 Program graph、调度或 renderer commit 一次冻结。本 ADR 只建立零领域依赖的 owner registry 与 owned-value contract。

## 决策：结构化 Identity、Typed Owner Definition 与统一 Registry

```ts
declare const RuntimeRevisionType: unique symbol;
declare const RuntimeChangeSetType: unique symbol;

type RuntimeRevision = number & Readonly<{ [RuntimeRevisionType]: true }>;

type RuntimeChangeSet<TChange> = Readonly<{
  baseRevision: RuntimeRevision;
  changes: ReadonlyArray<TChange>;
  [RuntimeChangeSetType]: true;
}>;

type RuntimeIdentity = Readonly<{
  owner: string;
  path: ReadonlyArray<string>;
}>;

type RuntimeOwnedValueDefinitionInput<TInput, TValue, TRead> = Readonly<{
  capture: (input: TInput) => TValue;
  read: (value: TValue) => TRead;
  equals: (left: TValue, right: TValue) => boolean;
  dispose?: (value: TValue) => void;
}>;

type RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange> = Readonly<{
  key: string;
  value: RuntimeOwnedValueDefinitionInput<TInput, TValue, TRead>;
  collectIdentities?: (value: TValue) => ReadonlyArray<RuntimeIdentity>;
  validateChangeSet?: (previous: TRead, next: TRead, changeSet: RuntimeChangeSet<TChange>) => 'valid' | 'fallback';
}>;

declare const RuntimeOwnerTokenBrand: unique symbol;
declare const RuntimeOwnerType: unique symbol;

type RuntimeOwnerToken = Readonly<{
  key: string;
  [RuntimeOwnerTokenBrand]: true;
}>;

type RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> = RuntimeOwnerToken & Readonly<{
  [RuntimeOwnerType]: (input: TInput, value: TValue, read: TRead, change: TChange) => void;
}>;

const defineRuntimeOwner = <TInput, TValue, TRead, TChange>(
  input: RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange>,
): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;

type RuntimeOwnerRegistryInput = Readonly<{
  builtins?: ReadonlyArray<RuntimeOwnerToken>;
  custom?: ReadonlyArray<RuntimeOwnerToken>;
}>;

type RuntimeOwnerRegistry = Readonly<{
  resolve<TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;
  find(key: string): RuntimeOwnerToken | undefined;
  definitions(): ReadonlyArray<RuntimeOwnerToken>;
}>;

const createRuntimeOwnerRegistry = (input: RuntimeOwnerRegistryInput): RuntimeOwnerRegistry;
```

`RuntimeRevision` / `RuntimeChangeSet`在本 ADR只是 TypeScript branded vocabulary：revision运行时表示仍是 number，无法鉴别 JavaScript对合法 safe integer的伪造。Runtime只承诺验证 `0..Number.MAX_SAFE_INTEGER`整数、current/base equality和 exhaustion，不承诺判断数值来源；ChangeSet object的 private brand/WeakSet由 ADR-03 factory保证不可伪造，changes array复制为不可变容器。

`RuntimeOwnerDefinition` 是公开的 typed token，不公开 author callbacks；只有 `defineRuntimeOwner()` 能创建 token。`RuntimeOwnerTokenBrand`不导出 value，外部 object literal不能构造合法 token；Runtime另外以 private `WeakSet`做 object-identity guard，JavaScript伪造或其它 Runtime实例的 foreign token以 `RUNTIME_OWNER_TOKEN_INVALID` fail-loud。helper在闭包中把 author-facing泛型 callbacks封装成 registry-private erased executor，registry直接接受具体 Definition并保存 token/executor一一对应。TypeScript无法原生表达 existential collection，因此实现只允许在 `defineRuntimeOwner()` 内做一次由 token object identity守卫的 `unknown` narrowing；禁止 `any`，也禁止 registry/session重新 cast callback。`resolve(definition)`只接受原 token并恢复泛型；动态 string lookup只能返回无 callback的 `RuntimeOwnerToken`，不能据此提交 value。

异构输入不直接写成 `Array<RuntimeOwnerDefinition<unknown, ...>>`。ADR-03 的 typed input/update builder 在具体 Definition 泛型仍在作用域内时生成闭包 command；session 和 registry 只消费该 erased command。这样 `unknown` 不会作为参数进入 `capture/read/equals/validateChangeSet`，错误 value/change 类型在 builder 调用点由 TypeScript 拒绝。

`capture()` 必须产生 session-owned value，不与调用方共享可变引用；`read()` 必须产生不携带 disposable handle、可安全共享和缓存的 deeply immutable / persistent `TRead`；`equals()` 只比较语义完整 Snapshot。Persistent immutable structure 可以安全复用引用；nested object / Array / Map / Set 必须由 Definition 复制并深冻结，或转成 persistent immutable representation。class instance 只有在 read view 不暴露 mutable method、外部引用或 disposable handle 时允许；`TRead` 禁止携带需要 Runtime 释放的 handle。`dispose()` 只释放传入 value，重复调用不是合法路径。

这是受信任的 Definition author contract，而不是 Runtime 能对任意泛型值自动证明的安全属性。Runtime 不做通用 deep-clone/deep-freeze，也不承诺防御恶意第三方 provider；内置 Definition 必须通过 conformance/alias-attack 测试，第三方扩展示例和文档必须显式说明该责任。ADR-03 的 candidate 隔离只依赖通过该 conformance contract 的 `TRead`，不再声称可防御恶意 callback。

`defineRuntimeOwner()` 是唯一作者入口；`createRuntimeOwnerRegistry({ builtins, custom })` 合并并解析 Definition token，重复 key fail-loud，没有内置覆盖优先级。动态 `find(key)` 只用于诊断和存在性检查；所有 typed read/update 都必须持有原 Definition token。

`registry.definitions()` 固定按 key JavaScript code-unit升序返回 immutable copy，与 builtins/custom注册顺序无关。

Owner key 与 identity path segment 都是非空字符串，按 JavaScript code-unit exact equality 判等，不对 `/`、`.`、`:` 做规范化。Identity 相等当且仅当 owner、段数和每段完全相等；内部使用结构化 trie 或长度前缀编码，不暴露可歧义字符串 key。

公共 identity API 固定为：

```ts
const createRuntimeIdentity = (owner: string, path: ReadonlyArray<string>): RuntimeIdentity;
const runtimeIdentityEquals = (left: RuntimeIdentity, right: RuntimeIdentity): boolean;

type RuntimeIdentityIndex = Readonly<{
  owner: string;
  size: number;
  has: (identity: RuntimeIdentity) => boolean;
  values: () => ReadonlyArray<RuntimeIdentity>;
}>;

const createRuntimeIdentityIndex = (
  owner: string,
  identities: ReadonlyArray<RuntimeIdentity>,
): RuntimeIdentityIndex;
```

`createRuntimeIdentity()`是公共构造/校验入口；`createRuntimeIdentityIndex()`是 Core/Render/owner executor共用的唯一 validated index factory，复制输入、再次校验全部 identity属于指定 owner且按 segment exact equality唯一，并按 path code-unit lexicographic顺序返回 values。没有 collector的 owner executor不会自动产生 index，其 owner-level snapshot/read仍可用；领域 Program仍可从自身 canonical traversal调用公共 factory建立 validated runtime-only index，Runtime不解析其领域 value。

Registry 自身不执行 lifecycle。Runtime 包内唯一的 owner executor 负责 `capture → collect/validate identity → read candidate view → compare → publish/retire`；session、Program 与 adapter 都不能直接调用 author callbacks。capture 成功后 collector、identity validation或首次 read 失败，executor 立即 dispose该 candidate；dispose secondary只追加 diagnostic，不覆盖 primary。未发布 candidate与被替换 committed value都只允许 executor反向 exactly-once retire；重复 retire是内部 invariant error，session dispose重复调用仍由 ADR-03定义为 no-op。

Owner executor的跨 ADR envelope固定为：

```ts
type RuntimeOwnerPhase = 'capture' | 'collect-identities' | 'read' | 'compare' | 'validate-change-set' | 'retire';
type RuntimeOwnerErrorCode =
  | 'RUNTIME_OWNER_DUPLICATE'
  | 'RUNTIME_OWNER_UNKNOWN'
  | 'RUNTIME_OWNER_TOKEN_INVALID'
  | 'RUNTIME_IDENTITY_INVALID'
  | 'RUNTIME_OWNER_CAPTURE_FAILED'
  | 'RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED'
  | 'RUNTIME_OWNER_READ_FAILED'
  | 'RUNTIME_OWNER_COMPARE_FAILED'
  | 'RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED';

type RuntimeOwnerLifecycleDiagnostic = Readonly<{
  code: 'RUNTIME_OWNER_DISPOSE_FAILED';
  owner: string;
  phase: 'retire';
  message: string;
  cause: unknown;
}>;

type RuntimeOwnerExecutionResult<T> = Readonly<{
  value: T;
  diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
}>;

class RuntimeOwnerError extends Error {
  readonly code: RuntimeOwnerErrorCode;
  readonly owner: string;
  readonly phase: RuntimeOwnerPhase;
  readonly cause: unknown;
  readonly diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
}
```

Private executor的 `prepare/compare/validateChangeSet`成功返回 `RuntimeOwnerExecutionResult`；validator throw以 `RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED`、phase `validate-change-set`、owner/cause包装，立即反向清理该次 candidate owner，dispose secondary附 error，session current保持不变。primary失败抛 `RuntimeOwnerError`，cleanup产生的 secondary diagnostics按发生顺序附在 error上，供 ADR-03聚合。`retire`不产生 primary throw，返回全部 lifecycle diagnostics以便继续清理其它 value。collector结果除逐项调用 identity validator外，还必须验证 `identity.owner === definition.key`，并用 segment exact equality检查整个集合在 owner内唯一；稀疏/非数组/duplicate/mismatch都属于 collect-identities phase。

稳定错误分类：

- `RUNTIME_OWNER_DUPLICATE`
- `RUNTIME_OWNER_UNKNOWN`
- `RUNTIME_OWNER_TOKEN_INVALID`
- `RUNTIME_IDENTITY_INVALID`
- `RUNTIME_OWNER_CAPTURE_FAILED`
- `RUNTIME_OWNER_COLLECT_IDENTITIES_FAILED`
- `RUNTIME_OWNER_READ_FAILED`
- `RUNTIME_OWNER_COMPARE_FAILED`
- `RUNTIME_OWNER_CHANGESET_VALIDATION_FAILED`
- `RUNTIME_OWNER_DISPOSE_FAILED`（非致命 diagnostic）

理由：

1. Owner registry 是 Program、Core contribution、Scene Patch 和未来 interaction ownership 的共同入口。
2. Runtime 只验证结构和生命周期，不理解 Core、Plot、Table 的 value / change。
3. 把 owner 从 transaction 拆开后，可独立证明类型恢复、identity 唯一性和 mutable alias 隔离。

## 最终实现与验证

- `@retikz/runtime` 公开结构化 identity、typed Owner Definition、owned value executor 与统一 Owner registry。
- builtin/custom owner 复用同一 define、merge、resolve 和重复 key 诊断；Runtime 只验证结构与生命周期，不读取领域 value/change 语义。
- capture/read/equals/dispose、identity collector 与 registry 均使用稳定错误 code/phase，并在失败时保持 candidate 隔离和剩余资源清理。
- 自动化验证覆盖 Unicode/特殊 segment、owner mismatch、duplicate path、mutable alias、异构 typed registry、动态 string lookup 拒绝和 lifecycle failure。
- 类型与自动化验证已覆盖公共泛型恢复、registry dispatch、identity 校验、只读隔离和生命周期失败路径。
- 中英文 Runtime package 文档与 alpha.2 changelog 已同步 identity、Owner Definition、registry 和生命周期边界。

## 公开影响

- `@retikz/runtime` 新增 identity、owned value、Owner Definition / registry 公共 API；Revision、Snapshot 与 ChangeSet 的构造和校验由 ADR-03冻结。
- 不修改 Core IR / Scene；不新增 React prop 或 Vanilla spec 字段。
- Core、Render 与真实 Tier 2 consumer 通过 Definition 接入，不把领域 schema 移入 runtime。

## 能力完备性检查

- 所属能力域与能力面：跨 Drawing / Data / Visualization 的零领域运行时基础。
- 解决的问题：稳定 owner、identity、完整 Snapshot 和 owner value 生命周期。
- 主责包与协作包：runtime 拥有结构契约；领域包拥有 value/change/identity 派生。
- 内部表达链路：input → capture → identity validation → read-only Snapshot → dispose。
- 外部扩展链路：内置和第三方 owner 统一 Definition / define / registry / resolve。
- define-registry：完整适用，重复 key 无优先级覆盖。
- 下游闭环：ADR-03 消费 registry 构造 transaction；ADR-04 Core owner、ADR-05 Render identity topology复用。
- 不支持边界与诊断：不提供 Program、session、history、scheduler 或 renderer state；本轮结论为下沉到 runtime。

## 不在本 ADR 范围

- Program graph、candidate transaction、revision commit 和 observer。
- Core contribution / Scene Patch / retained renderer。
- concurrent scheduler、generation 或 interaction。

## 遗留风险与后续

- Owner author 必须保证 capture/read 返回值满足只读与 alias 隔离合同；Runtime 无法自动证明任意 class 或 closure 的不可变性。
- identity 只表达 owner-qualified 稳定寻址，不替代 compile-local occurrence、renderer DOM identity 或领域 schema。
- Program graph、revision commit 和 renderer participant 分别由 ADR-03、ADR-04、ADR-05 继续消费本契约。
