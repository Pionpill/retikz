# ADR-02：Provider key contract

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [plot-design.md](../../../../../../viz/_notes/architecture/plot-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/02-provider-key-contract.md`

## 背景

统一 registry 机制后，还需要回答每种 provider 的 key 从哪里来。此前 kernel 大多使用 `Record<string, Definition>`，key 位于对象外部；definition 本身可能不知道自己注册成什么名字。这会导致错误消息、文档示例和类型契约分离。

plot 的经验说明 key 来源不应该机械统一。scale、transform、coordinate 这类完整 operation provider 从 schema literal 抽 `type` / `kind`，可以避免 schema 和 registry key 漂移；mark、channel 这类行为分派 definition 则直接从 `type` / `channel` 字段取 key。

kernel 也有两类 provider：一类是 IR 中的字符串引用，如 `node.shape`；另一类是完整 operation object，如 `Path.kind` 和 composite。alpha.7 应明确分类，不把所有 definition 都强行改成单一 `name`。

## 决策：按 provider 语义分两类 key 来源

kernel provider 分为两类：

```ts
// String reference provider
export type ShapeDefinition = {
  name: string;
  paramsSchema?: z.ZodType<IRJsonObject>;
  // ...
};

// Operation provider
export type PathKindDefinition<TOptions> = {
  schema: z.ZodType<{ kind: string } & TOptions>;
  compile: (path, options, ctx) => PathKindCompileResult;
};
```

### String Reference Provider

IR 只保存字符串引用，definition 使用 `name` 作为唯一 registry key：

- `ShapeDefinition.name` ↔ `node.shape`
- `ArrowDefinition.name` ↔ `arrowDetail.shape`
- `PatternDefinition.name` ↔ pattern 引用字段
- `PathGeneratorDefinition.name` ↔ generator step `name`
- `RibbonWidthProfileDefinition.name` ↔ ribbon width profile 引用

### Operation Provider

IR 保存完整 operation object，registry key 从 operation discriminant 或 namespace 提取：

- `PathKindDefinition` 从 schema literal `kind` 提取 key。
- `CompositeDefinition` 使用 `namespace` + `type` 作为 key，格式为 `${namespace}.${type}`。

理由：

1. string reference provider 没有 operation schema 可抽 key，`definition.name` 是最清晰的真源。
2. operation provider 的 key 应和 IR discriminant 绑定，避免 `definition.name` 与 schema literal 双真源漂移。
3. composite 保留 namespace 防撞，对齐 plot 的 namespace 设计和 core Tier 2 lowering 模型。

## 不在本 ADR 范围

- registry duplicate / unknown 的统一错误行为由 [ADR-01](./01-provider-registry-contract.md) 处理。
- 各 provider 的实际迁移由 [ADR-03](./03-capability-provider-migration.md) 处理。
- 不引入全局 namespace registry；namespace 仍是 composite 自身语义。
