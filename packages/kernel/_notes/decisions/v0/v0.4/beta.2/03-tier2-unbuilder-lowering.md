# ADR-03：Tier 2 IR lowering 后反向转换为 Kernel JSX

- 状态：Accepted
- 决策日期：2026-07-12
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [v0.3-alpha.2 Tier 2 支撑](../../v0.3/alpha.2/01-tier2-support.md) · [core-design.md §4.3 Tier 2 / Composite](../../../../../../../notes/architecture/core-design.md)

## 背景

`convertIRToReactNode(ir)` 的公开参数是完整 `IRScene`，而 `IRScene.children` 合法包含带 `namespace` 的 Tier 2 composite。当前 unbuilder 遇到 composite 会直接抛错，因此公开类型、运行时行为和文档中的“DSL / IR 双向桥”并不一致。

这个问题不能由 React adapter 自行解释 composite。Tier 2 的 schema、Definition registry、payload 校验、递归展开和深度限制均由 `@retikz/core` 拥有；React 重写一套展开逻辑会形成平行 lowering 语义。反过来，仅把参数收窄成 Tier 1 也会让 schema 解析得到的普通 `IRScene` 难以直接消费，并放弃已经存在的 composite 扩展模型。

反向转换也不能承诺恢复原始自定义 React 组件。CompositeDefinition 只定义 IR schema 与 `expand()`，并不知道某个 React 组件名称或 props 映射；能够稳定保证的是先展开成 Tier 1，再生成语义等价的 Kernel JSX。

## 决策：core 提供 fail-loud lowering，React 先 lowering 再 unbuild

`@retikz/core` 新增公开纯函数 `lowerIRToKernel()`。它复用现有 CompositeDefinition registry 和递归展开实现，把完整 `IRScene` 转换为不再包含 composite 的 `LoweredIRScene`：

```ts
export type LoweredIRChild = IRNode | IRPathBase | IRCoordinate | LoweredIRScope;

export type LoweredIRScope = Omit<IRScope, 'children'> & {
  children: Array<LoweredIRChild>;
};

export type LoweredIRScene = Omit<IRScene, 'children'> & {
  children: Array<LoweredIRChild>;
};

export type LowerIRToKernelOptions = Pick<CompileCompositeOptions, 'composites' | 'maxCompositeDepth'>;

export const lowerIRToKernel = (
  ir: IRScene,
  options?: LowerIRToKernelOptions,
): LoweredIRScene;
```

`lowerIRToKernel()` 与 `compileToScene()` 复用同一套 registry 解析、payload 校验、fixpoint 展开和最大深度语义，但未注册 composite 的策略不同：

- `compileToScene()` 保持现状：warning 后跳过未注册节点，继续渲染其余内容。
- `lowerIRToKernel()` 必须 fail-loud：抛出包含 `namespace.type` 与 IR path 的错误，不返回丢失节点的结果。

`@retikz/react` 为 `convertIRToReactNode()` 增加可选 options，并始终消费 lowering 后的类型：

```ts
export type ConvertIRToReactNodeOptions = LowerIRToKernelOptions;

export const convertIRToReactNode = (
  ir: IRScene,
  options?: ConvertIRToReactNodeOptions,
): ReactNode;
```

Tier 1 输入不需要 options，行为与现在一致。Tier 2 输入必须通过 `options.composites` 提供所需 Definition；转换结果是等价的 `Node` / `Path` / `Coordinate` / `Scope` Kernel JSX。转换失败统一以 `convertIRToReactNode:` 开头包装原始 cause，保留 composite key、IR path、payload 校验或深度诊断。

结构 round-trip 契约明确区分两类输入：

```ts
convertReactNodeToIR(convertIRToReactNode(tier1IR)) === tier1IR;

convertReactNodeToIR(convertIRToReactNode(tier2IR, { composites })) === lowerIRToKernel(tier2IR, { composites });
```

Tier 2 只保证 lowering 后的渲染语义等价，不保证恢复原始高层 JSON 结构或自定义 React 组件。

理由：

1. Tier 2 展开始终由 core Definition / registry 拥有，React 只做 adapter，不产生第二套 lowering 规则。
2. 完整 `IRScene` 继续可作为公开输入；Tier 1 零迁移，Tier 2 在提供 Definition 后获得真实能力而不是类型谎言。
3. fail-loud 防止反向转换静默丢节点；compile 的容错渲染策略不被改变。
4. `LoweredIRScene` 是 compile 消费态的递归结构视图，不新增 IR 字段或平行 schema。

### 被否决的选项

- **只收窄为 Tier 1 输入**：实现最小，但普通 `IRScene` 需要额外 type guard / cast，完整 IR 互操作能力仍断裂。
- **注册 React 反向 adapter 恢复自定义组件**：可以保留高层 JSX 形态，但要求每个 composite 作者再维护 React 专属 reverse mapping，且无法复用于 Vanilla；当前需求只要求语义等价，成本过高。
- **React 内部自行展开 composite**：违反 owner 与依赖方向，容易和 core 的 registry、校验、深度限制漂移。

## 待决策点 🔻

无。API 名、未注册策略、结构 round-trip 边界和文档措辞均在本 ADR 中冻结。

## DSL / API 表面

Tier 1 保持原调用：

```tsx
const children = convertIRToReactNode(tier1IR);

<Layout>{children}</Layout>;
```

Tier 2 使用与 `<Layout composites={...}>` 相同的 Definition：

```tsx
const children = convertIRToReactNode(tier2IR, {
  composites: [panelComposite],
});

<Layout>{children}</Layout>;
```

如果调用方只想直接渲染持久化 IR，无需先转 JSX，仍优先使用：

```tsx
<Layout ir={tier2IR} composites={[panelComposite]} />
```

## 测试设计

core spec test 先锁定 `lowerIRToKernel()` 的输出类型对应行为、递归 lowering 与 fail-loud 诊断；React unbuilder 测试再锁定 Tier 1 结构 round-trip 和 Tier 2 lowering 后 round-trip。

具体 case 见“实现契约 § 测试象限”。

## 影响

- `@retikz/core` 新增 `lowerIRToKernel`、`LoweredIRScene`、`LoweredIRChild`、`LoweredIRScope`、`LowerIRToKernelOptions` 公共导出。
- `@retikz/react` 的 `convertIRToReactNode` 增加可选 options；现有 Tier 1 调用源码兼容。
- Tier 2 从“无条件抛错”变为“Definition 齐全时成功，缺失时带路径 fail-loud”。
- compile 对未注册 composite 的 warning + skip 行为不变；IR / Scene schema 无改动。
- React README、Layout overview 中英文页和 beta.2 changelog 同步说明语义 lowering 与非结构保真边界。

## 不在本 ADR 范围

- 恢复原始自定义 React composite 组件或 Sugar 组件。
- 在 IR 中持久化 Definition、React component、datasets 或函数。
- 修改 `compileToScene()` 对未注册 composite 的 warning + skip 策略。
- 修改 CompositeDefinition、IRComposite、Scene schema 或 renderer。
- 为 Vanilla 新增 JSX 类反向转换 API；Vanilla 可直接消费 `lowerIRToKernel()` 的纯 JSON 结果。

---

## 实现契约（必填）🔻

### Level

`red`

原因：修改 core compile lowering 与包公共入口，并调整 React public API。

### Schema 改动

无。`LoweredIRScene` 是现有 IR 类型的 compile 消费态结构视图，不新增或修改 Zod schema。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/_notes/decisions/v0/v0.4/beta.2/03-tier2-unbuilder-lowering.md`（新增）
- `packages/kernel/_notes/decisions/v0/v0.4/beta.2/roadmap.md`（修改）
- `packages/kernel/core/src/compile/types.ts`（修改：lowering public types）
- `packages/kernel/core/src/compile/lower.ts`（新增：公开 fail-loud wrapper）
- `packages/kernel/core/src/compile/index.ts`（修改：`export *` 新入口）
- `packages/kernel/core/src/compile/orchestration/composite.ts`（修改：共享未注册处理钩子与 lowered 返回类型）
- `packages/kernel/core/tests/compile/lower-kernel.test.ts`（新增）
- `packages/kernel/core/tests/compile/orchestration/lower-composites.test.ts`（修改：compile warning + skip 回归）
- `packages/kernel/core/tests/compile/orchestration/lower-composites.adversarial.test.ts`（修改：深度与嵌套诊断回归）
- `packages/kernel/core/tests/compile/public-api.test.ts`（修改）
- `packages/kernel/core/README.md`（修改）
- `packages/kernel/react/src/kernel/adapter/unbuilder.ts`（修改）
- `packages/kernel/react/tests/kernel/adapter/unbuilder.test.tsx`（修改）
- `packages/kernel/react/tests/public-api.test.ts`（修改）
- `packages/kernel/react/README.md`（修改）
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.zh.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.en.mdx`（修改）
- `apps/docs/src/modules/docs/data/changelog/kernel-0-4.ts`（修改）

偏离白名单需要先修订本 ADR 并重新确认。

### 测试象限

**Happy path（≥ 3）**：

- Tier 1 scene：`lowerIRToKernel(ir)` 不需要 definitions，输出结构等价且不含 composite。
- 顶层 Tier 2：注册 `demo.panel` 后展开为 Tier 1 node。
- scope 内 Tier 2：递归展开并保留 scope 的样式、transform、id 与层级。
- fixpoint：composite 展开产物仍为 composite，继续展开到 Tier 1。
- React Tier 2：`convertIRToReactNode(ir, { composites })` 生成 Kernel element。

**边界（≥ 2）**：

- 空 scene：返回空 `LoweredIRScene`，React 返回空 children。
- 纯 Tier 1 且传空 definitions：与省略 options 完全等价。
- `maxCompositeDepth` 恰好允许最后一层时成功，下一层时失败。

**错误路径（≥ 2）**：

- 未注册顶层 composite：错误包含 `demo.panel` 与 `children[0]`，不返回删节点结果。
- scope 内未注册 composite：错误包含完整 `children[0].children[0]`。
- payload 不符合 definition schema：保留 provider key 与 IR path 的校验诊断。
- 递归展开超过最大深度：fail-loud，不产生部分 JSX。

**交互（≥ 2）**：

- Tier 1：`convertReactNodeToIR(convertIRToReactNode(ir))` 与原 IR 相等。
- Tier 2：React round-trip 结果与 `lowerIRToKernel(ir, options)` 相等，而非与原 Tier 2 IR 强行相等。
- 同一 definitions 同时传给 `<Layout composites>` 和 `convertIRToReactNode`，两条路径产生等价 Scene。
- composite 展开出的 scope / path 与现有 unbuilder 字段表共同工作，不丢样式和 path children。

### 依赖的现有元素

- `IRScene` / `IRChild` / `IRScope`——派生 lowering 后的递归消费态类型，不改 schema。
- `CompositeDefinition` / `resolveCompositeRegistry()`——复用现有 author contract 与 registry 解析。
- `lowerComposites()`——复用现有 DFS、payload 校验、fixpoint 与深度限制，增加 fail-loud 未注册钩子。
- `CompileCompositeOptions`——复用 `composites` 与 `maxCompositeDepth` 字段契约。
- `convertReactNodeToIR()` / unbuilder 字段表——验证 Tier 1 结构 round-trip 与 Tier 2 lowering 后 round-trip。
