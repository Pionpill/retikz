# ADR-05：Boundary provider contract

- 状态：Accepted（2026-06-29 人工签字，2026-07-03 已实现）
- 决策日期：2026-06-29
- 关联：[alpha.7 roadmap](./roadmap.md) · [ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)
- 压缩前全文：`git show b7744b60565aa579a6f1deb892b56021633c6754:packages/kernel/_notes/decisions/v0/v0.4/alpha.7/05-boundary-provider-contract.md`

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


## 不在本 ADR 范围

- 不新增 renderer primitive 或视觉 shape。
- 不改变 `Node.boundary` / `NodeTarget.boundary` 的 IR 字段形态。
- 不为 boundary provider 设计覆盖 builtin 的逃生口；沿用 ADR-01 的 duplicate throw。
- 不删除 shape fallback。
- 不把 `boundaryPoint` 从 `ShapeDefinition` 中移除；视觉 shape 仍需要声明自己的默认连接面。
