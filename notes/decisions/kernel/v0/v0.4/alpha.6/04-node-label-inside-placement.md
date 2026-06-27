# ADR-04: Node label inside placement and boundary position

- Status: Proposed
- Decision date: 2026-06-27
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)
  - [v0.1-alpha.4 ADR-03 Node label](../../v0.1/alpha.4/03-node-label.md)
  - [v0.2-alpha.4 ADR-04 Node label rotate](../../v0.2/alpha.4/04-node-label-rotate.md)

## 背景

graph / plot 的关系图 demo 里有两类标签容易被混在一起：流带自身的标签属于 `Ribbon`，而矩形 block、interval bar、cell 等节点状图元的名称或数值标签属于节点本体。

现有 `Node.label` 已经支持 `text`、`position`、`distance`、样式、`rotate` / `keepUpright` 与 `pin`。这足够表达节点外侧标签，例如 `position: "above"`；也能用 `position: "center"` 表达中心标签。但它不能表达“贴近节点内部上边缘”“内部右侧”“内部左上角”这类常见图表标签。

同时，仅靠方向 keyword 也不够表达图表标注中很常见的“在某条边界的 30% 处”：

- bar 顶部靠左一点放数值。
- Sankey block 右边界中上部放端口名。
- 矩形 cell 的 bottom boundary 按比例放小标签。

plot 当前只能在 lowering 前额外生成一个 text mark，并预计算 `labelX` / `labelY`。这样文字不再是节点的附属标签，不能继承 node-level transform、locator / provenance 关系、未来 label policy，也会让 graph grammar 多一套并行约定。

本 ADR 给 `Node.label` 增加显式 `placement` mode，并扩展 `position`，让同一套 label 字段既能用方向 keyword，也能用结构化边界位置表达节点边界上的自定义位置。

## 决策：`Node.label` 增加 `placement` 与 boundary position

新增 `NodeLabelPlacement` 与 `NodeLabelBoundaryPositionSchema`：

```ts
export const NodeLabelPlacement = {
  Outside: "outside",
  Inside: "inside",
} as const;

export const NodeLabelBoundarySide = {
  Top: "top",
  Right: "right",
  Bottom: "bottom",
  Left: "left",
} as const;

export const NodeLabelBoundaryPositionSchema = z.object({
  boundary: z.enum(NodeLabelBoundarySide),
  t: z.number().min(0).max(1).optional(),
}).strict();

export const NodeLabelSchema = z.object({
  text: z.union([z.string(), MixedLineSchema]),
  position: z
    .union([
      z.enum(NodeLabelPosition),
      z.number(),
      NodeLabelBoundaryPositionSchema,
    ])
    .optional(),
  placement: z.enum(NodeLabelPlacement).optional(),
  distance: z.number().nonnegative().optional(),
  // existing style / rotate / pin fields unchanged
});
```

默认语义：

1. `placement` 缺省为 `"outside"`，保持现有行为。
2. `position` 缺省为 `"above"`，保持现有行为。
3. `position: "center"` 忽略 `placement`，始终位于节点中心。
4. 方向 enum 与数字角度 position 沿用当前 label layout：先求 `position` 对应的节点边界点，再按方向向量偏移 `distance`。
5. `placement: "outside"` 沿边界点外法线方向偏移 `distance`。
6. `placement: "inside"` 使用同一个边界点，但沿内法线方向偏移 `distance`。
7. `placement: "inside"` 与 `pin` 同时出现时拒绝。pin 的 leader line 表达外侧标注关系，内侧 leader line 容易误读，首版不渲染也不静默忽略。

结构化 boundary position 语义：

- `position: { boundary: "top", t: 0.25 }` 表示节点局部 top boundary 上从 left 到 right 的 25% 位置。
- `position: { boundary: "bottom", t: 0.25 }` 表示节点局部 bottom boundary 上从 left 到 right 的 25% 位置。
- `position: { boundary: "left", t: 0.25 }` 表示节点局部 left boundary 上从 top 到 bottom 的 25% 位置。
- `position: { boundary: "right", t: 0.25 }` 表示节点局部 right boundary 上从 top 到 bottom 的 25% 位置。
- `t` 缺省为 `0.5`，也就是该边界中点。
- `distance=0` 时 label center 落在边界点；inside / outside 只决定 `distance` 的偏移方向。

首版 boundary position 仅承诺 rectangle / box-like 节点。对 circle / ellipse / diamond / custom shape，compile 应抛出清晰诊断，说明 `{ boundary, t }` 需要 box-like boundary；这些形状仍可继续使用方向 enum 或数字角度 position。后续如果需要非矩形 shape 的 boundary sampling，应另起 ADR 定义 shape-specific boundary parametrization。

旋转节点仍沿用 v0.2-alpha.4 的局部坐标约定：label center 在 node-local box / shape 上计算，再由 node group transform 统一应用一次。

理由：

1. `placement` 是 JSON-safe、显式且 AI 友好的字段，不复用负 `distance` 这种隐藏语义。
2. 继续复用现有方向 `position` vocabulary，避免新增 `inside-above` / `inside-right` 等组合枚举。
3. `{ boundary, t }` 像 Path label 的 numeric position 一样给用户一个连续参数，不把位置写死为几个方向 keyword。
4. boundary position 直接服务 plot 的 bar / block / cell 标签，不让 graph 创建并行 text mark 约定。
5. 默认 outside 不破坏旧图，也不改变现有 label rotate / style / bbox 行为。

## DSL 表面

React:

```tsx
<Node
  id="bar-137"
  position={[0, 0]}
  shape="rectangle"
  minimumWidth={40}
  minimumHeight={80}
  fill="#2563eb"
  label={{
    text: "137",
    position: { boundary: "top", t: 0.25 },
    placement: "inside",
    distance: 6,
    textColor: "#ffffff",
  }}
/>
```

Vanilla / JSON IR 使用同一字段：

```ts
node({
  id: "bar-137",
  position: [0, 0],
  shape: "rectangle",
  minimumWidth: 40,
  minimumHeight: 80,
  fill: "#2563eb",
  label: {
    text: "137",
    position: { boundary: "top", t: 0.25 },
    placement: "inside",
    distance: 6,
    textColor: "#ffffff",
  },
});
```

传统 keyword 仍可用：

```tsx
<Node
  id="block-a"
  position={[0, 0]}
  shape="rectangle"
  label={{
    text: "A",
    position: "right",
    placement: "inside",
    distance: 8,
  }}
/>
```

## 测试设计

`packages/kernel/core/tests/compile/node-label-placement.test.ts` 与 schema 测试覆盖：

- direction / numeric position 的 inside 几何。
- boundary position 的 `top` / `right` / `bottom` / `left` 几何。
- boundary position 的 `t=0` / `t=0.5` / `t=1`。
- center placement neutral。
- inside 与 rotate / style / pin 的交互。
- schema 拒绝非法 placement、非法 boundary、越界 `t` 与 inside pin。
- 非 box-like shape 使用 boundary position 时有清晰诊断。

## 影响

- `packages/kernel/core/src/schemas/node.ts` 增加 `NodeLabelPlacement`、`NodeLabelBoundarySide`、`NodeLabelBoundaryPositionSchema` 与 `NodeLabelSchema.placement`。
- `packages/kernel/core/src/compile/node.ts` 的 label center 计算需要根据 placement 选择 offset 方向，并支持 box boundary interpolation。
- React / Vanilla 若从 `IRNode["label"]` 派生类型，通常无需额外 API 分支；若字段白名单或文档 API 表列出 label 子字段，需要同步。
- 文档需要更新 node overview / schema reference，并新增内侧 label 与 boundary position demo。
- 不新增 renderer primitive，不改变 text measurement、collision avoidance、viewBox expansion policy。

## 不在本 ADR 范围

- 不给 Ribbon block names 增加 ribbon label；block name 属于矩形 node / mark。
- 不新增 core text mark 或 graph text workaround。
- 不让 label 参与 layout、自动避让、自动裁剪或自动对比色。
- 不支持负 `distance` 表示 inside。
- 不为 circle / ellipse / diamond / custom shape 定义 `{ boundary, t }` 采样。
- 不实现 graph 的 data-bound label placement；core 只接收已经解析好的 JSON-safe label 字段。

---

## 实现契约

### Level

`red`

本 ADR 修改 core IR schema 与 compile layout 行为，并带用户可见文档更新。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/node.ts` | 新增 | `NodeLabelPlacement` | const object enum: `"outside" \| "inside"` | 无 | 节点附属标签相对边界的解析方向 |
| `packages/kernel/core/src/schemas/node.ts` | 新增 | `NodeLabelBoundarySide` | const object enum: `"top" \| "right" \| "bottom" \| "left"` | 无 | 矩形 / box-like 节点边界名称 |
| `packages/kernel/core/src/schemas/node.ts` | 新增 | `NodeLabelBoundaryPositionSchema.boundary` | `z.enum(NodeLabelBoundarySide)` | 无 | label 附着的节点局部边界 |
| `packages/kernel/core/src/schemas/node.ts` | 新增 | `NodeLabelBoundaryPositionSchema.t` | `number 0..1` | `0.5` at compile | 沿所选边界的归一化位置 |
| `packages/kernel/core/src/schemas/node.ts` | 修改 | `NodeLabelSchema.position` | existing union + `NodeLabelBoundaryPositionSchema` | `"above"` | 支持方向 / 数字角度 / `{ boundary, t }` |
| `packages/kernel/core/src/schemas/node.ts` | 新增 | `NodeLabelSchema.placement` | `z.enum(NodeLabelPlacement).optional()` | `"outside"` | 使用同一个 position 在节点边界外侧或内侧放置 label |
| `packages/kernel/core/src/schemas/node.ts` | 修改 | `NodeLabelSchema.pin` | existing union with refine | 无 | `placement="inside"` 时不得与 pin 同时使用 |
| `packages/kernel/core/src/schemas/index.ts` / `packages/kernel/core/src/index.ts` | 修改 | export | named export | 无 | 暴露 `NodeLabelPlacement`、`NodeLabelBoundarySide` 与派生类型 |

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/node.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/src/compile/node.ts`
- `packages/kernel/core/tests/compile/node-label-placement.test.ts`
- `packages/kernel/core/tests/compile/node-label.test.ts`
- `packages/kernel/core/tests/ir/*node*label*.test.ts`
- `packages/kernel/react/src/kernel/Node.tsx`
- `packages/kernel/react/tests/kernel/*.test.tsx`
- `packages/kernel/vanilla/src/builder/types.ts`
- `packages/kernel/vanilla/tests/*.test.ts`
- `apps/docs/src/contents/core/components/node/overview/**`
- `apps/docs/src/contents/core/reference/schema/entity/**`

不允许在本 ADR 下修改：

- renderer primitive 类型系统
- plot / graph 包
- 与 node label 无关的 Path / Ribbon / Layout 行为

### 测试象限

Happy path：

- `node-label-inside-above-rect`: rectangle `above + inside + distance=6` 落在 top boundary 内侧。
- `node-label-boundary-top-quarter`: rectangle `{ boundary: "top", t: 0.25 } + inside` 落在 top boundary 25% 处并向内偏移。
- `node-label-boundary-right-mid`: rectangle `{ boundary: "right" } + inside` 落在 right boundary 中点并向内偏移。
- `node-label-inside-angle-circle`: numeric angle on circle 沿径向内收。

边界：

- `node-label-center-placement-neutral`: `position="center"` 忽略 placement。
- `node-label-inside-distance-zero`: inside + distance 0 合法，落在边界点。
- `node-label-boundary-position-extremes`: `t=0` / `t=1` 分别落在对应边界端点。
- `node-label-inside-small-node-overflow`: 小节点标签可能视觉溢出，但 compile 不崩溃、不裁剪。

错误路径：

- `node-label-inside-pin-rejected`: inside + pin schema 或 compile 失败，错误信息指向 label placement / pin 冲突。
- `node-label-invalid-placement-rejected`: unknown placement literal 被 schema 拒绝。
- `node-label-invalid-boundary-rejected`: unknown boundary literal 被 schema 拒绝。
- `node-label-boundary-t-range-rejected`: `t < 0` 或 `t > 1` 被 schema 拒绝。
- `node-label-boundary-non-box-shape-rejected`: 非 box-like shape 使用 `{ boundary, t }` 时 compile 失败并给出诊断。

交互：

- `node-label-inside-rotate-node`: rotated node 的 inside label 仍在局部坐标算一次，再由 node group 旋转一次。
- `node-label-inside-rotate-label`: `rotate="radial"` / `"tangent"` 仍围绕 label center 自旋。
- `node-label-inside-style-inheritance`: font / textColor / opacity 继承与 outside label 一致。
- `node-label-boundary-outside-pin`: `{ boundary, t } + placement="outside" + pin` 保持外侧 leader line 行为。

### 依赖的现有元素

- `NodeLabelSchema`（`packages/kernel/core/src/schemas/node.ts`）：扩展字段。
- `labelBorderPoint` / `labelCenter`（`packages/kernel/core/src/compile/node.ts`）：修改 offset 方向并增加 boundary interpolation。
- `DirectionVectorByAtDirection` / `LabelAnchorByAtDirection`（`packages/kernel/core/src/compile/direction.ts`）：复用方向向量与 anchor 映射。
- `angleBoundaryOf` / shape boundary logic：继续服务数字角度 position。
- Node label rotate ADR 的局部坐标约定：保持 rotated node 不双重旋转。

### 设计评估记录

按 `develop-design`，red ADR 应做独立多 LLM 设计评估。当前 Codex 工具规则要求只有用户明确要求 sub-agent / 并行 agent 时才能 spawn sub-agent，因此本 ADR 草案尚未执行独立模型评估。进入实现前需由人工确认是否补评估，或明确接受当前草案作为实现输入。
