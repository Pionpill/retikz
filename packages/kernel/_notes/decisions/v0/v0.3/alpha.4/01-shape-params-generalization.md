# ADR-01：shape 参数化泛化——注册的 type + params

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-02 circle/ellipse](./02-circle-ellipse.md) · [ADR-03 arc/sector](./03-arc-sector.md) · [ADR-04 rectangle/polygon](./04-rectangle-polygon.md) · [ADR-05 star](./05-star.md) · [ADR-06 connection surface](./06-connection-surface.md)

## 背景

ShapeDefinition 原先只能接收 Rect，形状专属参数又散落在 Node 顶层，无法表达扇形、星形等参数化形状。参数若放在闭包中则不再进入 IR，破坏 JSON 可序列化和自描述契约。连接所需的 boundaryPoint、anchor、edgePoint 已存在，缺的是传入实例参数的统一通道。

## 决策

Node.shape 支持裸字符串或参数化引用：string | { type: string; params?: JsonObject }。

- 裸字符串规范化为 { type, params: {} }；参数化引用保留 JSON 对象并在 compile 校验。未注册 shape 按既有语义抛出错误
- ShapeDefinitionInput<TParams> 包含 paramsSchema，以及接收 TParams 的 circumscribe、boundaryPoint、anchor、可选 edgePoint 和 emit。registry 保存擦除后的 ShapeDefinition；defineShape<TParams> 在定义点提供类型安全，避免 registry 的逆变问题
- compile 先以 paramsSchema 校验领域字段，再以 JsonObjectSchema 做 JSON-safe 护栏，然后将同一参数传给所有几何函数
- circumscribe 必须返回包含完整形状的精确 AABB 半轴；position 是该 AABB 中心。emit、anchor、boundaryPoint 和 circumscribe 必须共享同一局部坐标系，避免 bbox、裁剪和连接不一致
- 现有无参数形状使用空 strict schema 并忽略 params；形状专属参数由各形状 ADR 定义

## 兼容性与实现结果

裸字符串仍合法，既有 IR、DSL、Vanilla 和 renderer 行为保持兼容；新增参数化引用为 additive。注册侧是 breaking：外部 ShapeDefinition 必须提供 paramsSchema，并让几何函数接收末位 params。机制与内置形状已实现。

## 遗留风险

非中心对称形状的相对布局仍以精确 AABB 为边界；若需要更深的中心偏移、范围或裁剪语义，应另开契约。
