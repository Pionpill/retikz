# ADR-05：Boundary provider contract

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-29
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)

## 背景

当前 `boundary` 是连接面选择器：缺省等价于 `shape`，也就是路径端点、数字角度 anchor 与 compass anchor 使用节点自己的视觉 shape 作为连接面。用户可以显式写 `boundary: "circle"`、`boundary: "rectangle"`、`boundary: "ellipse"`，也可以写其它 shape 名或 `{ type, params }`，编译期再借用已注册 shape 的 `boundaryPoint` / `anchor`。

这套逻辑保留了一个重要能力：视觉 shape 与连接面可以解耦。例如视觉是 `star`，连接面可以是 `circle` 或 `rectangle`。但它也把"纯连接面"强行绑定到 `ShapeDefinition`。用户如果只想定义一个新的连接面，现在必须实现完整 shape：`circumscribe`、`emit`、`scaleParams` 等视觉职责都要补齐，即使这些函数与连接面无关。

alpha.7 已经把 provider contract 作为扩展面收敛目标。`boundary` 虽然目前复用 shape registry，但从语义上它是独立能力：它不决定节点布局、不绘制 primitive，只决定连接点与部分 anchor 的几何。继续只借用 shape 会让 provider authoring 心智不够干净。

## 决策：Boundary 成为一等 provider，保留 shape fallback

新增 `BoundaryDefinition`，作为独立 provider capability。`boundary` IR 字段形态保持不变，仍然是字符串或 `{ type, params }`，但编译期解析顺序改为：

1. `undefined` / `"shape"`：使用节点自己的视觉 shape。默认行为不变。
2. 查 `BoundaryDefinition` registry。内置 `circle` / `rectangle` / `ellipse` 都降为 builtin boundary providers。
3. boundary registry 查不到时，再 fallback 到 shape registry，保留现有"借用已注册 shape 作为连接面"能力。
4. 两边都查不到时 fail-loud，错误消息同时提示 `options.boundaries` 与 `options.shapes`。

```ts
export type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  /** Registry key referenced by IR `boundary`. */
  name: string;
  /** JSON-safe params schema for this connection surface. */
  paramsSchema: z.ZodType<TParams>;
  /** Center-to-toward ray hit on the connection surface. */
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  /** Optional named anchor support for compass-like connection points. */
  anchor?: (rect: Rect, name: string, params: TParams) => Position | undefined;
};

export type BoundaryDefinition = BoundaryDefinitionInput<IRJsonObject>;

export type CompileOptions = {
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  shapes?: ReadonlyArray<ShapeDefinition>;
  // ...
};
```

`"shape"` 继续是保留字，不进入 boundary registry；它永远表示"节点自身视觉 shape"。如果用户注册名为 `"shape"` 的 boundary，registry resolve 阶段应按 duplicate / reserved key 规则拒绝。

`"circle"`、`"rectangle"`、`"ellipse"` 不再在 `compile/boundary.ts` 里写特殊分支，而是 builtin boundary definitions。它们与 custom boundary 走同一 registry，但 custom 不能覆盖 builtin。

当 `boundary: "foo"` 同时匹配 `BoundaryDefinition.name === "foo"` 与 `ShapeDefinition.name === "foo"` 时，**boundary provider 优先，shape fallback 其次**。理由是 `boundary` 字段语义首先是连接面 provider 引用；shape fallback 是兼容现有借用能力，不应压过一等 provider。

理由：

1. 纯连接面不应要求用户实现视觉 shape 的 `emit` / `circumscribe` 等无关职责。
2. 保留 shape fallback 能兼容现有 `boundary: "star"` / `boundary: { type: "polygon", params }` 的表达力。
3. lookup 优先级明确后，用户可以用同名 boundary 覆盖连接面语义，而不影响同名视觉 shape 的绘制与布局。

## 待决策点

- **builtin boundary 清单**：本 ADR 固定首批 builtin 为 `circle`、`rectangle`、`ellipse`；`shape` 是保留语义，不是 provider。
- **错误消息格式**：倾向 `compileToScene: unknown connection surface provider "<key>"; registered boundaries: <names>; registered shapes: <names>; pass boundary definitions via options.boundaries or shape definitions via options.shapes`。
- **anchor fallback**：倾向 boundary provider 自己没有 `anchor` 或返回 `undefined` 时，对 compass anchor 回退到 rectangle AABB；非 compass 专属 anchor 仍只由视觉 shape 自身处理。
- **Shape fallback 生命周期**：本 ADR 保留 shape fallback，不设弃用计划。后续如果发现 fallback 与一等 boundary provider 造成长期歧义，再单独 ADR 讨论。

## DSL 表面

React:

```tsx
import { defineBoundary } from '@retikz/core';
import { Layout, Node, Path } from '@retikz/react';

const pillBoundary = defineBoundary({
  name: 'pill-boundary',
  paramsSchema: z.object({ radius: z.number().nonnegative() }),
  boundaryPoint: (rect, toward, params) => hitRoundedRect(rect, toward, params.radius),
});

export const Diagram = () => (
  <Layout boundaries={[pillBoundary]}>
    <Node id="a" shape="star" boundary="pill-boundary" label="A" />
    <Node id="b" shape="rectangle" position={[6, 0]} label="B" />
    <Path way={[['a'], ['b']]} />
  </Layout>
);
```

Vanilla / core:

```ts
const scene = compileToScene(ir, {
  boundaries: [pillBoundary],
  shapes: [customVisualShape],
});
```

IR 仍保持 JSON-safe：

```ts
{
  type: 'node',
  id: 'a',
  shape: 'star',
  boundary: { type: 'pill-boundary', params: { radius: 8 } },
  position: [0, 0]
}
```

## 测试设计

`packages/kernel/core/tests/boundaries/` 与现有 shape / compile 测试覆盖 boundary provider 独立注册、shape fallback、priority、错误诊断和 adapter 透传。

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- 新增 public provider capability：`BoundaryDefinition`、`defineBoundary`、`BUILTIN_BOUNDARIES`、`resolveBoundaryRegistry`、`CompileOptions.boundaries`。
- `compile/boundary.ts` 从硬编码 `circle` / `rectangle` / `ellipse` 分支改为消费 resolved boundary registry。
- `BoundarySchema` 字段类型保持不变，但 `.describe(...)` 需要说明 `CompileOptions.boundaries` 优先、`CompileOptions.shapes` fallback。
- React `<Layout>` 与 Vanilla render / builder 需要透传 `boundaries`，并与 ADR-04 的 provider authoring docs 同步。
- ⚠️ BREAKING：如果用户已有 custom shape 与 custom boundary 同名，`boundary: "name"` 将优先解析为 boundary provider。alpha.7 仍处 0.x 设计收敛期，不保留旧优先级别名。

## 不在本 ADR 范围

- 不新增 renderer primitive 或视觉 shape。
- 不改变 `Node.boundary` / `NodeTarget.boundary` 的 IR 字段形态。
- 不为 boundary provider 设计覆盖 builtin 的逃生口；沿用 ADR-01 的 duplicate throw。
- 不删除 shape fallback。
- 不把 `boundaryPoint` 从 `ShapeDefinition` 中移除；视觉 shape 仍需要声明自己的默认连接面。

---

## 实现契约（必填）

### Level

`red`

自评 level：`red`。本 ADR 新增 public provider capability，修改 `packages/kernel/core/src/compile/**`、`packages/kernel/core/src/contract/**`、`packages/kernel/core/src/providers/**`、`packages/*/*/src/index.ts` 与 React / Vanilla provider surface。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/kernel/core/src/schemas/boundary/schema.ts` | 改 | `BoundarySchema` | `z.union([z.string().min(1), ShapeRefSchema])`（类型不变） | `undefined` 等价 `"shape"` | 连接面引用优先查 `CompileOptions.boundaries`，查不到再借用 `CompileOptions.shapes` 中的 shape |
| `packages/kernel/core/src/compile/compile.ts` | 加 | `CompileOptions.boundaries` | `ReadonlyArray<BoundaryDefinition>` | `undefined` | 运行时注入 boundary definitions，不进 IR |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/contract/boundary/**`（新建）
- `packages/kernel/core/src/providers/boundary/**`（新建）
- `packages/kernel/core/src/providers/index.ts`
- `packages/kernel/core/src/compile/boundary.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/compile/node.ts`
- `packages/kernel/core/src/compile/anchor-cache.ts`
- `packages/kernel/core/src/compile/scope.ts`
- `packages/kernel/core/src/schemas/boundary/**`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/tests/boundaries/**`（新建）
- `packages/kernel/core/tests/shapes/boundary.test.ts`
- `packages/kernel/core/tests/compile/shape-registry.test.ts`
- `packages/kernel/react/src/kernel/Layout.tsx`
- `packages/kernel/react/src/index.ts`
- `packages/kernel/react/tests/kernel/**`
- `packages/kernel/vanilla/src/**`
- `packages/kernel/vanilla/tests/**`
- `apps/docs/src/contents/kernel/**`
- `apps/docs/src/data/**`
- `apps/docs/src/i18n/**`

偏离白名单的改动需要更新本 ADR 或新开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `boundary_provider_custom_point`：注册 `boundaries: [pillBoundary]`，节点 `boundary="pill"` → path endpoint 使用 custom `boundaryPoint`。
- `boundary_provider_custom_params`：节点 `boundary={{ type: 'pill', params: { radius: 8 } }}` → params 经 `paramsSchema.parse` 后传入 provider。
- `builtin_boundaries_registry`：`circle` / `rectangle` / `ellipse` 都来自 `BUILTIN_BOUNDARIES`，行为与旧硬编码一致。

**边界（≥ 2）**：

- `boundary_default_shape_unchanged`：未写 `boundary` 与显式 `"shape"` → 结果等价。
- `boundary_empty_custom_keeps_builtins`：`boundaries: []` → builtin boundary 仍可用。
- `boundary_shape_fallback_kept`：未注册 boundary，但注册 custom shape `soft-box`，`boundary="soft-box"` → 借用 shape boundary 生效。

**错误路径（≥ 2）**：

- `boundary_duplicate_builtin_rejected`：custom boundary 叫 `"circle"` 或 `"rectangle"` → duplicate / reserved key throw。
- `boundary_unknown_lists_boundaries_and_shapes`：`boundary="missing"` → 错误列出 registered boundaries、registered shapes，并提示 `options.boundaries` / `options.shapes`。
- `boundary_params_schema_rejects`：`boundary={{ type:'pill', params:{ radius:-1 } }}` → provider params schema 抛错并定位到 boundary。

**交互（≥ 2）**：

- `boundary_provider_priority_over_shape_fallback`：同时注册 boundary `foo` 与 shape `foo`，`boundary="foo"` → 使用 boundary provider。
- `boundary_provider_with_visual_shape`：节点 `shape="star"` + `boundary="pill"` → 视觉 emit 仍是 star，连接端点使用 pill boundary。
- `react_layout_boundaries_passthrough`：`<Layout boundaries={[pillBoundary]}>` → core compile 收到并生效。
- `vanilla_boundaries_passthrough`：vanilla render / builder options `boundaries` → core compile 收到并生效。

### 依赖的现有元素

- `BoundarySchema`（`packages/kernel/core/src/schemas/boundary/schema.ts`）——修改 describe，保持 IR 字段形态。
- `resolveBoundary`（`packages/kernel/core/src/compile/boundary.ts`）——修改为消费 boundary registry，并保留 shape fallback。
- `ShapeDefinition.boundaryPoint` / `ShapeDefinition.anchor`（`packages/kernel/core/src/contract/shape/types.ts`）——作为 default `"shape"` 与 shape fallback 的来源。
- `resolveProviderRegistry` / `providerDefinitionOf`（`packages/kernel/core/src/providers/registry.ts`）——复用 ADR-01 的统一 registry helper。
- React `<Layout>` provider props 与 Vanilla compile options——扩展 `boundaries` 透传。
