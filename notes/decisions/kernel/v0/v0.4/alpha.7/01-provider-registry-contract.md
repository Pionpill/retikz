# ADR-01：Provider registry contract

- 状态：Accepted（2026-06-29 人工签字，待实现）
- 决策日期：2026-06-28
- 关联：[alpha.7 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [core-design.md](../../../../../architecture/core-design.md) · [plot-design.md](../../../../../architecture/plot-design.md)

## 背景

kernel 已经有多组运行时扩展能力：shape、arrow、pattern、path generator、path kind、ribbon width profile 与 composite。它们都遵守"definition 含函数、不进 IR，通过 compile options 注入"这个大方向，但 registry 输入形态和冲突处理并不一致。

当前实现里有的能力使用 `Record<string, Definition>`，有的使用 `Array<Definition>`；有的 custom 覆盖 builtin 时发 warn，有的直接替换；有的空 custom 会保留 builtin，有的把 builtin 也替掉。随着 alpha.6 引入 `Path.kind` provider，这些差异已经开始影响下游 plot / graph 的扩展心智。

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

## 待决策点

- **helper 文件归属**：倾向放在 `packages/kernel/core/src/providers/registry.ts`，因为它服务 provider resolve；`contract` 只定义 capability-specific definition 与 key helper。
- **错误消息英文格式**：倾向统一为 `compileToScene: unknown <capability> provider "<key>"; registered <capability> providers: <names>; pass definitions via options.<optionName>`。
- **可用 key 排序**：倾向按字典序输出，保证测试稳定。

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

具体 case 拆分见下面"实现契约 § 测试象限"。

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

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 会动 `packages/kernel/core/src/compile/**` 与 provider resolve 基础设施。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/providers/registry.ts`（新建 provider registry helper）
- `packages/kernel/core/src/providers/index.ts`（导出内部 helper，如实现需要）
- `packages/kernel/core/src/compile/compile.ts`（接入统一 registry 输出类型的最小适配）
- `packages/kernel/core/src/compile/provider-lookup.ts`（可选新建 lookup helper）
- `packages/kernel/core/tests/providers/registry-contract.test.ts`（新建）
- `packages/kernel/core/tests/providers/registry-diagnostics.test.ts`（可选新建）

偏离白名单的改动需要更新本 ADR 或转入 ADR-03。

### 测试象限

**Happy path（≥ 3）**：

- `builtin_first_registers_all`：传入两个 builtin definition → registry 包含两个 key。
- `custom_after_builtin_registers_new_key`：custom key 不撞 builtin → registry 包含 builtin + custom。
- `readonly_map_lookup`：resolve 返回值可按 key lookup，compile 侧不依赖 Record own-property。

**边界（≥ 2）**：

- `empty_custom_keeps_builtins`：custom 省略或空数组 → builtin 仍可 lookup。
- `diagnostic_names_sorted`：注册 key 乱序 → unknown 报错里的 available names 稳定排序。

**错误路径（≥ 2）**：

- `duplicate_builtin_registration_throws`：builtin 内部重复 key → throw。
- `duplicate_custom_registration_throws`：custom 内部重复 key → throw。
- `custom_collision_with_builtin_throws`：custom key 撞 builtin → throw，不 warn。

**交互（≥ 2）**：

- `unknown_lookup_reports_option_name`：lookup 未注册 key → 报错包含 `options.<optionName>`。
- `capability_name_in_error`：shape/path-kind 等不同 capability 复用 helper 时错误消息带 capability。

### 依赖的现有元素

- `CompileOptions`（`packages/kernel/core/src/compile/compile.ts`）——修改 provider 字段的消费方式。
- `resolveShapeRegistry` / `resolveArrowRegistry` / `resolvePatternRegistry` 等现有函数——由 ADR-03 迁移为统一 helper 的调用方。
- plot `resolveScaleRegistry` / `resolveCoordinateRegistry` 经验——仅参考，不引入包依赖。
