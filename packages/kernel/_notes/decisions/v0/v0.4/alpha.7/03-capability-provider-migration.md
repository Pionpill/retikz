# ADR-03：Capability provider migration

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/03-capability-provider-migration.md`

## 背景

ADR-01 与 ADR-02 定义了统一 registry 与 key contract，但现有 capability 仍分散在旧输入形态和旧目录习惯中。只立规则不迁移代码，会让 alpha.7 变成纸面方案，后续新增 provider 仍会复制旧差异。

alpha.7 需要一次性迁移 kernel 现有 provider 能力，使 shape、arrow、pattern、path generator、path kind、ribbon width profile 与 composite 都遵守同一 contract-provider 模式。

## 决策：迁移所有现有 provider capability 到统一模型

迁移后的公共形态：

```ts
export type CompileOptions = {
  shapes?: ReadonlyArray<ShapeDefinition>;
  arrows?: ReadonlyArray<ArrowDefinition>;
  patterns?: ReadonlyArray<PatternDefinition>;
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  pathKinds?: ReadonlyArray<PathKindDefinition>;
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  composites?: ReadonlyArray<CompositeDefinition>;
};
```

迁移规则：

1. `BUILTIN_*` 全部改为 `ReadonlyArray<AnyXxxDefinition>`。
2. `resolveXxxRegistry(custom)` 全部调用 ADR-01 的统一 helper。
3. compile 内部 lookup 全部使用 `ReadonlyMap`。
4. 删除面向内置 provider 的白名单和 fallback 分支。
5. 迁移测试以行为等价为目标，但旧的 custom 覆盖 builtin 行为删除。

理由：

1. 一次性迁移避免 alpha.7 后仍存在"新模式 + 旧模式"双轨。
2. `CompileOptions` 是用户入口，统一形态能显著降低自定义能力的学习成本。
3. compile 只消费 resolve 后 registry，能让 renderer / adapter 不理解 provider 细节。


## DSL 表面

```tsx
<Layout
  shapes={[pillShape]}
  patterns={[hatchPattern]}
  pathGenerators={[smoothPath]}
  pathKinds={[flowPathKind]}
  composites={[calloutComposite]}
>
  <Node id="a" shape="pill" />
  <Path way={[{ kind: 'generator', name: 'smooth', params: { tension: 0.4 } }]} />
</Layout>
```

```ts
compileToScene(ir, {
  shapes: [pillShape],
  pathKinds: [flowPathKind],
  composites: [calloutComposite],
});
```

## 测试设计

迁移测试分散到各 capability 现有测试目录，重点覆盖 array 输入、Map lookup、unknown 诊断、duplicate 诊断、React / Vanilla 透传。


## 影响

- ⚠️ BREAKING：`CompileOptions.shapes` / `arrows` / `patterns` / `pathGenerators` / `pathKinds` / `ribbonWidthProfiles` 从 record 改为 array。
- ⚠️ BREAKING：`BUILTIN_*` 公共导出类型从 record 改为 array；按 key 访问内置 definition 的代码需要改为 registry resolve 或数组查找。
- ⚠️ BREAKING：custom 覆盖 builtin 行为删除。
- core、react、vanilla 与 docs 的 provider 示例需要统一改写。

## 不在本 ADR 范围

- 不新增新的 provider capability。
- 不设计覆盖 builtin 的替代 API。
- 不改变 IR 中 shape / arrow / pattern / path kind 的用户语义，除非当前 schema 与 provider contract 明确冲突。
- docs 具体页面改写由 ADR-04 约束。
