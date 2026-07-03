# ADR-02：Provider key contract

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md) · [plot-design.md](../../../../../../graph/_notes/architecture/plot-design.md)

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

## 待决策点

- **Pattern IR 字段是否改名**：倾向不为统一而把 `pattern.shape` 机械改成 `pattern.name`；本 ADR 只要求该字段引用 `PatternDefinition.name`。
- **Path kind schema key helper 名称**：倾向 `extractPathKindKey(schema)`，对齐 plot 的 `extractScaleType` / `extractTransformKind`。
- **Composite key helper 名称**：倾向 `extractCompositeKey(definition)`，返回 `${namespace}.${type}`。

## DSL 表面

```tsx
<Layout shapes={[customShape]} arrows={[customArrow]}>
  <Node id="box" shape="custom-box" />
  <Path arrow="->" arrowDetail={{ shape: 'custom-tip' }} way={[['box'], [3, 0]]} />
</Layout>
```

```ts
const customComposite = defineComposite({
  namespace: 'acme',
  type: 'callout',
  schema: CalloutSchema,
  expand: node => [/* kernel IR */],
});
```

## 测试设计

`packages/kernel/core/tests/providers/provider-key-contract.test.ts` 覆盖 key 提取规则；各 capability 测试验证 IR 引用与 definition key 对齐。

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- ⚠️ BREAKING：string reference provider definition 必须带 `name` 字段。
- ⚠️ BREAKING：`PathKindDefinition` 需要明确 schema literal key；不允许 schema 与注册 key 分离。
- ⚠️ BREAKING：`CompositeDefinition` 不再仅从 schema 反推 namespace / type；definition 必须显式声明 namespace 与 type，schema 负责 payload 校验。
- docs 中所有自定义 provider 示例都要展示 key 字段或 key helper。

## 不在本 ADR 范围

- registry duplicate / unknown 的统一错误行为由 [ADR-01](./01-provider-registry-contract.md) 处理。
- 各 provider 的实际迁移由 [ADR-03](./03-capability-provider-migration.md) 处理。
- 不引入全局 namespace registry；namespace 仍是 composite 自身语义。

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 改 public definition 类型，并会牵动 `packages/*/*/src/index.ts` 的公开导出。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/contract/shape/types.ts`
- `packages/kernel/core/src/contract/shape/define.ts`
- `packages/kernel/core/src/contract/arrow/types.ts`
- `packages/kernel/core/src/contract/arrow/define.ts`
- `packages/kernel/core/src/contract/pattern/types.ts`
- `packages/kernel/core/src/contract/pattern/define.ts`
- `packages/kernel/core/src/contract/path/types.ts`
- `packages/kernel/core/src/contract/path/define.ts`
- `packages/kernel/core/src/contract/ribbon/types.ts`
- `packages/kernel/core/src/contract/ribbon/define.ts`
- `packages/kernel/core/src/contract/composite/types.ts`
- `packages/kernel/core/src/contract/composite/define.ts`
- `packages/kernel/core/src/contract/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/tests/providers/provider-key-contract.test.ts`（新建）
- `packages/kernel/core/tests/providers/composite-key-contract.test.ts`（可选新建）

### 测试象限

**Happy path（≥ 3）**：

- `shape_name_key`：`defineShape({ name: 'pill', ... })` → key helper 返回 `pill`。
- `path_kind_schema_literal_key`：`definePathKind({ schema: z.object({ kind: z.literal('route') }) })` → key helper 返回 `route`。
- `composite_namespace_type_key`：`defineComposite({ namespace: 'plot', type: 'axis', ... })` → key helper 返回 `plot.axis`。

**边界（≥ 2）**：

- `provider_name_trim_not_allowed`：空字符串或 whitespace-only name → define helper throw。
- `composite_namespace_type_non_empty`：namespace / type 为空 → define helper throw。

**错误路径（≥ 2）**：

- `path_kind_schema_without_literal_kind_throws`：schema 无 `kind: z.literal(...)` → key extraction throw。
- `definition_missing_name_throws`：string reference provider 缺 name → define helper throw。

**交互（≥ 2）**：

- `ir_string_matches_definition_name`：IR 引用 custom shape name → registry lookup 到同一 definition。
- `schema_parse_uses_same_operation_key`：custom path kind operation parse 后仍按 literal kind 分派。

### 依赖的现有元素

- `JsonObjectSchema` / `IRJsonObject`（`packages/kernel/core/src/ir/json.ts`）——用于 params / operation JSON 边界。
- `defineShape` / `defineArrow` / `definePattern` / `definePathGenerator` / `definePathKind` / `defineComposite`——修改为 key contract 的定义点。
- plot `extractScaleType` / `extractTransformKind`——参考 schema literal key 提取方式。
