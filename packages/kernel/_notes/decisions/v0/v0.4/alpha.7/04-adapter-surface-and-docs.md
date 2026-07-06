# ADR-04：Adapter surface and provider authoring docs

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/04-adapter-surface-and-docs.md`

## 背景

provider contract 的破坏性收敛不只发生在 core。用户通常通过 React `<Layout>` 或 Vanilla builder / render API 注入扩展能力；如果 adapter 保留旧的 `Record` 输入或私有命名，core 的统一 contract 对用户仍然不可见。

同时，docs 目前按单个能力讲 shape / arrow / pattern 等扩展点，缺少一页总览解释"IR 中保存 JSON-safe 引用，runtime definition 通过 provider 注入"。这会让用户误以为不同扩展点各有一套规则。

## 决策：adapter 与 docs 对齐 core provider contract

React 与 Vanilla 的 provider surface 与 core `CompileOptions` 保持同名、同形态：

```tsx
<Layout
  shapes={[pillShape]}
  arrows={[triangleTip]}
  patterns={[hatchPattern]}
  pathGenerators={[smoothGenerator]}
  pathKinds={[flowKind]}
  ribbonWidthProfiles={[taperProfile]}
  composites={[calloutComposite]}
/>
```

```ts
const scene = compileToScene(ir, {
  shapes: [pillShape],
  pathKinds: [flowKind],
});
```

docs 新增 provider authoring 总览，说明：

1. `contract/` 定义第三方要实现的 runtime definition。
2. `providers/` 提供内置 definition 与 registry resolve。
3. runtime definition 可以包含函数和 zod schema，但不进 IR。
4. IR 只保存字符串引用或 operation object，保持 100% JSON-safe。
5. builtin 与 custom definition 共用同一 registry，custom 不覆盖 builtin。

理由：

1. React / Vanilla 与 core 同形态能降低 API 记忆成本。
2. 文档总览能把 alpha.7 的破坏性改动转化成清晰 authoring 心智。
3. docs 先讲机制，再讲具体 shape / path kind 示例，更适合 LLM 和用户生成自定义 provider。


## 不在本 ADR 范围

- 不实现 provider registry 迁移本身；由 ADR-03 处理。
- 不新增 docs demo 的视觉能力，只展示 provider authoring 机制。
- 不写 changelog；changelog 由 develop-wrapup 阶段统一处理。
