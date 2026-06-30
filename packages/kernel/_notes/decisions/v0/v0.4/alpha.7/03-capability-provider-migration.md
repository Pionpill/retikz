# ADR-03：Capability provider migration

- 状态：Accepted（2026-06-29 人工签字，待实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)

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

## 待决策点

- **迁移顺序**：倾向先迁基础 helper，再迁 shape / arrow / pattern，最后迁 path kind / path generator / ribbon profile / composite。
- **测试文件是否合并**：倾向保留现有 capability 测试目录，在各自目录补 migration case；通用 helper case 放 `tests/providers/`。
- **旧变量名保留**：`BUILTIN_SHAPES` 等名称保留，但类型从 record 变为 array。

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

具体 case 拆分见下面"实现契约 § 测试象限"。

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

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 修改 `packages/kernel/core/src/compile/**`、public `CompileOptions` 与 `packages/*/*/src/index.ts` 公开面。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/compile/node.ts`
- `packages/kernel/core/src/compile/scope.ts`
- `packages/kernel/core/src/compile/paint.ts`
- `packages/kernel/core/src/compile/path/index.ts`
- `packages/kernel/core/src/compile/path/shrink.ts`
- `packages/kernel/core/src/compile/path/ribbon.ts`
- `packages/kernel/core/src/compile/composite.ts`
- `packages/kernel/core/src/providers/**`
- `packages/kernel/core/src/contract/**`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/react/src/kernel/Layout.tsx`
- `packages/kernel/react/src/index.ts`
- `packages/kernel/vanilla/src/**`
- `packages/kernel/core/tests/shapes/**`
- `packages/kernel/core/tests/arrows/**`
- `packages/kernel/core/tests/patterns/**`
- `packages/kernel/core/tests/compile/**`
- `packages/kernel/core/tests/providers/**`
- `packages/kernel/react/tests/kernel/**`
- `packages/kernel/vanilla/tests/**`

### 测试象限

**Happy path（≥ 3）**：

- `shape_array_registers_custom`：`shapes: [customShape]` → custom node shape compile 成功。
- `arrow_array_registers_custom`：`arrows: [customArrow]` → custom arrow marker compile 成功。
- `path_kind_array_registers_custom`：`pathKinds: [customKind]` → custom path kind compile 成功。

**边界（≥ 2）**：

- `undefined_options_keep_all_builtins`：不传 provider options → builtin shape / arrow / pattern / path kind 行为不变。
- `empty_arrays_keep_all_builtins`：传空数组 → builtin 仍存在。

**错误路径（≥ 2）**：

- `custom_shape_collides_builtin_throws`：custom shape name 为 `rectangle` → throw。
- `duplicate_path_generator_throws`：同一 options 中两个 generator 同名 → throw。
- `unknown_pattern_reports_registered_names`：pattern 引用不存在 → 报错列出 registered pattern providers。

**交互（≥ 2）**：

- `react_layout_forwards_provider_arrays`：React `<Layout shapes={[...]}>` → core compile 接收到 custom shape。
- `vanilla_forwards_provider_arrays`：vanilla render / builder options 透传 custom provider。
- `composite_uses_same_registry_contract`：custom composite 与 builtin composite 走同一 duplicate / unknown 规则。

### 依赖的现有元素

- ADR-01 `resolveProviderRegistry` helper——修改所有 capability registry 的共同基础。
- ADR-02 provider key helper——用于从 definition 提取 registry key。
- 现有 `BUILTIN_SHAPES` / `BUILTIN_ARROWS` / `BUILTIN_PATTERNS` / `BUILTIN_PATH_KINDS` 等导出——修改公共类型但保留名称。
- 现有 provider adversarial tests——更新覆盖破坏性新规则。
