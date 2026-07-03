# ADR-01：Provider registry contract

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md) · [plot-design.md](../../../../../../viz/_notes/architecture/plot-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/01-provider-registry-contract.md`

## 背景

kernel 已经有多组运行时扩展能力：shape、arrow、pattern、path generator、path kind、ribbon width profile 与 composite。它们都遵守"definition 含函数、不进 IR，通过 compile options 注入"这个大方向，但 registry 输入形态和冲突处理并不一致。

当前实现里有的能力使用 `Record<string, Definition>`，有的使用 `Array<Definition>`；有的 custom 覆盖 builtin 时发 warn，有的直接替换；有的空 custom 会保留 builtin，有的把 builtin 也替掉。随着 alpha.6 引入 `Path.kind` provider，这些差异已经开始影响下游 plot / viz 的扩展心智。

plot 在 v0.1-alpha.12 已经完成一轮 registry 收敛：`ReadonlyArray<AnyXxxDefinition>` 输入、builtin first、custom duplicate throw、resolve 后使用 `Map` 分派。kernel alpha.7 应吸收这套经验，把 provider registry 变成明确契约，而不是每个能力各自发明。

## 决策：统一 provider registry 解析规则

所有 kernel provider registry 使用同一套解析语义：

```ts
export type ProviderRegistryOptions<TDefinition> = {
  capability: string;
  builtins: ReadonlyArray<TDefinition>;
  custom?: ReadonlyArray<TDefinition>;
  keyOf: (definition: TDefinition) => string;
  optionName: string;
};

const shapes = resolveProviderRegistry({
  capability: 'shape',
  builtins: BUILTIN_SHAPES,
  custom: options.shapes,
  keyOf: shapeDefinitionKey,
  optionName: 'shapes',
});
```

规则：

1. `builtins` 与 `custom` 都是 definition 数组；公共 API 不再接受 `Record<string, Definition>`。
2. resolve 输出为 `ReadonlyMap<string, TDefinition>`。
3. builtin 总是先注册，custom 后注册。
4. builtin 内部重复 key、custom 内部重复 key、custom 撞 builtin key 都直接 throw。
5. alpha.7 不提供覆盖 builtin 的逃生口；后续确有需要时另开 ADR。
6. unknown provider lookup 必须 fail-loud，错误消息包含 capability、失败 key、可用 key 和对应 options 字段名。
7. registry helper 是 core 内部基础设施，不作为 alpha.7 公共 API 承诺。

理由：

1. 数组输入与 plot 对齐，definition 自身成为注册单元，避免 key 和 definition 内容分离。
2. 禁止覆盖 builtin 能最大化设计收敛期的可诊断性；需要替换内置行为时应显式设计新名字或新 ADR。
3. `Map` 输出让 compile lookup 的语义统一，避免 `Record` 原型键、own-property 检查和排序诊断在各能力里重复实现。


## DSL 表面

本 ADR 不新增用户 DSL 元素，但会统一所有 provider 注入形态：

```tsx
<Layout
  shapes={[customShape]}
  arrows={[customArrow]}
  pathKinds={[customPathKind]}
>
  <Node id="a" shape="custom-shape" />
  <Path kind="custom-path" way={[['a'], ['b']]} />
</Layout>
```

```ts
renderToSvgString(ir, {
  shapes: [customShape],
  pathKinds: [customPathKind],
});
```

## 测试设计

`packages/kernel/core/tests/providers/registry-contract.test.ts` 覆盖 provider helper 的通用行为，并由各 capability migration 测试补充真实 lookup。


## 影响

- ⚠️ BREAKING：`CompileOptions` 中 provider 字段不再接受 `Record<string, Definition>`。
- ⚠️ BREAKING：custom provider 不能覆盖 builtin provider；旧的 warn + override 行为删除。
- 所有 provider registry 的错误消息将统一，相关测试快照需要更新。
- React / Vanilla 透传 provider 时也必须使用数组形态。

## 不在本 ADR 范围

- 各 capability 的具体字段迁移由 [ADR-03](./03-capability-provider-migration.md) 处理。
- provider key 来源分类由 [ADR-02](./02-provider-key-contract.md) 处理。
- docs 与 adapter authoring surface 由 [ADR-04](./04-adapter-surface-and-docs.md) 处理。
- 不新增 `overrideBuiltin`、`replaceBuiltins` 或 registry namespace escape hatch。
