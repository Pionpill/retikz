# ADR-04：Adapter surface and provider authoring docs

- 状态：Proposed
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [core-design.md](../../../../../architecture/core-design.md)

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

## 待决策点

- **docs 页面位置**：倾向新增 `apps/docs/src/contents/kernel/concepts/provider-contract/` 或 `reference/provider-contract/`，具体按 docs sidebar 现状决定。
- **示例覆盖数量**：倾向至少 shape、path kind、composite 三类；arrow / pattern 可在对应组件页补。
- **React prop 类型命名**：倾向与 `CompileOptions` 完全同名，不另起 `customShapes` / `shapeDefinitions`。

## DSL 表面

```tsx
import { Layout, Node, Path } from '@retikz/react';
import { defineShape, definePathKind } from '@retikz/core';

const pill = defineShape({ name: 'pill', /* ... */ });
const flow = definePathKind({ schema: FlowPathSchema, /* ... */ });

export const Diagram = () => (
  <Layout shapes={[pill]} pathKinds={[flow]}>
    <Node id="start" shape="pill" label="Start" />
    <Path kind="flow" way={[['start'], [4, 0]]} />
  </Layout>
);
```

```ts
import { compileToScene } from '@retikz/core';

const scene = compileToScene(ir, {
  shapes: [pill],
  pathKinds: [flow],
});
```

## 测试设计

Adapter 测试验证 React / Vanilla 只透传 provider definitions，不重新解释 provider 语义；docs 通过 `git diff --check` 与 docs typecheck 验证结构化改动。

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- ⚠️ BREAKING：React `<Layout>` provider props 改为 definition 数组。
- ⚠️ BREAKING：Vanilla render / builder provider options 改为 definition 数组。
- docs 中旧 `Record<string, Definition>` 写法全部删除，不保留兼容写法。
- provider authoring 成为 kernel docs 的一等概念页。

## 不在本 ADR 范围

- 不实现 provider registry 迁移本身；由 ADR-03 处理。
- 不新增 docs demo 的视觉能力，只展示 provider authoring 机制。
- 不写 changelog；changelog 由 develop-wrapup 阶段统一处理。

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 会动 `packages/kernel/react/src/index.ts` / `packages/kernel/vanilla/src/index.ts` 等公开入口，并改 docs 结构化文件。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/react/src/kernel/Layout.tsx`
- `packages/kernel/react/src/index.ts`
- `packages/kernel/react/tests/kernel/Layout-shapes.test.tsx`
- `packages/kernel/react/tests/kernel/Layout-provider-contract.test.tsx`（新建）
- `packages/kernel/vanilla/src/**`
- `packages/kernel/vanilla/tests/**`
- `apps/docs/src/contents/kernel/concepts/provider-contract/index.zh.mdx`（新建，具体路径可按 docs 现状调整）
- `apps/docs/src/contents/kernel/concepts/provider-contract/index.en.mdx`（新建，具体路径可按 docs 现状调整）
- `apps/docs/src/contents/kernel/**` 中 shape / path / pattern / arrow 相关页面
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`
- `apps/docs/src/components/**` 中 provider demo 需要的最小支撑文件

### 测试象限

**Happy path（≥ 3）**：

- `react_layout_shapes_array`：`<Layout shapes={[customShape]}>` → custom shape 生效。
- `react_layout_path_kinds_array`：`<Layout pathKinds={[customKind]}>` → custom path kind 生效。
- `vanilla_provider_arrays`：vanilla render / builder options 数组 provider 生效。

**边界（≥ 2）**：

- `react_empty_provider_arrays_keep_builtins`：React 传空 arrays → builtin 仍可用。
- `vanilla_undefined_provider_options_keep_builtins`：Vanilla 不传 provider options → builtin 仍可用。

**错误路径（≥ 2）**：

- `react_duplicate_provider_error_surfaces`：React 透传重复 provider → core 错误不被吞。
- `vanilla_unknown_provider_error_surfaces`：Vanilla 引用 unknown provider → core 错误包含 options 名称。

**交互（≥ 2）**：

- `docs_provider_demo_typechecks`：docs demo 使用 shape + path kind provider arrays → docs typecheck 通过。
- `react_and_core_compile_options_same_shape`：React Layout props 与 core CompileOptions provider 字段类型保持同名同形态。
- `vanilla_and_core_compile_options_same_shape`：Vanilla options 与 core CompileOptions provider 字段类型保持同名同形态。

### 依赖的现有元素

- ADR-03 迁移后的 `CompileOptions`——React / Vanilla 透传的单一真源。
- `apps/docs/AGENTS.md` 与 docs skills——文档阶段确定最终页面路径、双语和 sidebar / i18n 同步。
- 现有 React `<Layout>` provider props——修改为数组形态。
- 现有 Vanilla render / builder options——修改为数组形态。
