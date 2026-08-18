# ADR-05：Boundary provider contract

- 状态：Accepted
- 决策日期：2026-06-29
- 关联：[ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md)

## 背景

`boundary` 决定路径端点和部分 anchor 的连接面。它既可缺省使用视觉 shape，也可显式借用 shape；但纯连接面若必须实现完整视觉 shape，会承担无关的 emit、circumscribe 等职责

## 决策

Boundary 成为一等 provider，同时保留 shape fallback。IR 字段仍为字符串或 `{ type, params }`：

```ts
type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  name: string;
  paramsSchema: z.ZodType<TParams>;
  boundaryPoint: (rect: Rect, toward: Position, params: TParams) => Position;
  anchor?: (rect: Rect, name: string, params: TParams) => Position | undefined;
};

type CompileOptions = {
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  shapes?: ReadonlyArray<ShapeDefinition>;
};
```

解析顺序固定为：

1. `undefined` 或保留字 `"shape"` 使用节点视觉 shape
2. 先查 Boundary registry，内置 `circle`、`rectangle`、`ellipse` 也是普通 builtin provider
3. 未命中时 fallback 到 Shape registry，保留借用已注册 shape 的能力
4. 两者都未命中时 fail-loud，并同时提示 boundaries 与 shapes options

Boundary provider 优先于同名 shape；`"shape"` 不得注册为 boundary。builtin 与 custom 不得覆盖，沿 ADR-01 duplicate 规则处理

## 兼容性与最终结果

纯连接面不再要求视觉 shape 职责，既有 `boundary: "star"` 与 `{ type, params }` 的 shape fallback 保持。Node 与 NodeTarget 的 IR 字段、Scene 和 renderer 不变；boundary provider 不新增 primitive

## 遗留边界

Shape 中的默认 `boundaryPoint` 仍保留；boundary 不拥有视觉绘制、布局或 builtin replacement 机制
