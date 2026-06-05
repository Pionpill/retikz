# ADR-01：Shape Registry（NodeShape 开放为字符串 + ShapeDefinition 注入面 + 内置 4 shape 改造为注册项）

- 状态：Accepted（已实现）
- 决策日期：2026-05-21
- 关联：[v0 roadmap §Shape Registry 提案](../../roadmap.md#shape-registry-提案) · [core-design.md §1.2 AI 一等公民](../../../../../architecture/core-design.md) · [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · [v0.1-beta.1 ADR-03 geometry 共享 transform / 死 anchor 清理](../../v0.1/v0.1-beta.1/03-geometry-shared-transform-dead-anchor-cleanup.md) · [v0.1-beta.1 ADR-08 onWarn 收集器](../../v0.1/v0.1-beta.1/08-compile-on-warn-collector.md)

> **前置依赖说明**：alpha.6（结构化 Target / Anchor）依赖本 ADR 先固化 anchor 接口。本 ADR 把 anchor 解释面收敛到 `ShapeDefinition.anchor(rect, name)`，alpha.6 的对象化 path target 直接消费同一入口，避免「内置 shape anchor 走旧路径、注册 shape anchor 走新路径」的双轨。是接口先后，非排期紧邻。

## 背景

原 `NODE_SHAPES` 是 `as const` 闭合集合（`rectangle` / `circle` / `ellipse` / `diamond`），`NodeShape = z.nativeEnum(NODE_SHAPES)`。4 shape 的几何 / 边界 / anchor / emit 硬编码在两层：纯数学层 `geometry/{rect,circle,ellipse,diamond}.ts`（结构类型 + ops），与编译分发层 `compile/node.ts`（5 个 `switch (shape)` 分发点 + `rectOf`/`circleOf`/… 转换）。

塑造方案的硬约束：

- **第三方加 `cloud` / `trapezium` / `cylinder` 没法进 IR、也没有可注入面**，`geometry/` 现存 4 文件本质就是这套接口的「硬编码版本」。
- **不能套 Tier 2 `lowerComposites` 钩子** —— shape 是 Tier 1 一等基元，`boundaryPoint` / `anchor` / `circumscribe` / `emit` 四件事下沉不到 Kernel，它本身就是 Kernel 的一部分。
- **AI 一等公民核心约束**：IR 的 `shape` 字段必须仍是字符串（JSON 可序列化），`ShapeDefinition` 含函数、不进 IR；LLM 生成的 IR 永远只写 shape 名字符串，扩展靠宿主编译期注入。

## 决策：抽 `ShapeDefinition`（4 方法、操作外接 `Rect`）+ 运行时注入

shape 只承担**真正多态**的 4 件事（`circumscribe` / `boundaryPoint` / `anchor` / `emit`），统一操作外接 `Rect`（bounding box 是所有内置 shape 的天然单一载体）；文本度量 / 字号缩放 / sep / minimumSize / margin 膨胀 / 数字角度等 generic 逻辑留在 `layoutNode` 与编译分发层。`ShapeDefinition` / `ShapeStyle` 见 `core/src/shapes/types.ts`，内置 4 注册项与 `BUILTIN_SHAPES` 见 `core/src/shapes/`。

字面即决策、故记下的两处形态（schema 开放与内置名分离）：

```ts
// core/src/ir/node.ts —— 内置名（Record key 用）与开放名分离
export type BuiltinShapeName = ValueOf<typeof NODE_SHAPES>;   // 'rectangle' | 'circle' | 'ellipse' | 'diamond'
export type NodeShape = BuiltinShapeName | (string & {});     // 开放名；`& {}` 保内置名 IDE 自动补全
// schema 开放为任意非空字符串（校验不门控内置名；未注册名 compile 期拒）
NodeSchema.shape = z.string().min(1).optional();
```

理由：

1. **达标**：`ShapeDefinition` + `CompileOptions.shapes` 让第三方能发 `@retikz/shapes-flow` / `-uml` 不依赖 core 修改；内置 4 shape 改注册项消除内置特权。
2. **接口最小、贴现实**：4 方法精确对应 5 个分发点的多态部分，generic 逻辑不外溢 —— 第三方写 shape 只关心几何。
3. **AI 友好 + IR 纯净**：IR `shape` 仍是字符串，定义走运行时注入不进 IR，序列化 / LLM tool schema / JSON Patch 全不受影响；schema 只校验非空字符串、未注册名 compile 期拒，内置名经 describe / reference / system prompt 列出。
4. **为 alpha.6 固化 anchor 接口**：`anchor(rect, name): Position | undefined` 是命名 anchor 唯一权威；数字角度 generic 走 boundaryPoint；alpha.6 对象化 path target 直接消费、不开双轨。
5. **renderer-neutral**：emit 出 `ScenePrimitive`，adapter 不感知 shape（延续 v0.1-beta.1 ADR）。

### 决策细节（拍板的 WHY）

- **shape 操作外接 `Rect`**：`circle`/`ellipse`/`diamond` 全由 `rect.width/height` 派生，bounding `Rect`（含 rotate）是单一载体。删除 `compile/node.ts` 的 `rectOf`/`circleOf`/`ellipseOf`/`diamondOf` shape 专属转换。
- **margin 膨胀 generic**：所有 shape 都是 `width += 2m, height += 2m`，提取 generic `inflateRect`，由 `boundaryPointOf` 调用方先膨胀再传 `shape.boundaryPoint`；`anchorOf` / `angleBoundaryOf` 不膨胀（explicit anchor 取视觉边界）。
- **数字角度 generic（anchor 只要命名）**：`angleBoundaryOf` 不进 shape 接口 —— 编译层算出局部 `(cos,sin)` 经 `rect.rotate` 旋转成世界 toward 调 `shape.boundaryPoint`，任何实现了 `boundaryPoint` 的 shape 自动获得 `.30` 角度锚点。
- **`anchor` 返回 `Position | undefined` + 未知名抛错**：返回 `undefined` 时 throw `Unknown anchor '<name>' for shape '<shape>'`（取代旧 geometry 层 RectAnchor cast）；内置 4 shape 仍只认 9 个 `RECT_ANCHORS` 名、行为零变化。
- **emit 收轴对齐 rect（rotate=0）+ `ShapeStyle`**：rotate 由 emitNodePrimitives 末端外层 `GroupPrim` 统一施加，**消除 diamond 的 `unrotated()` 特例**（所有 shape emit 都在轴对齐空间）。**第三方最易写错点（须文档显著提示）**：`emit` 收 rotate=0 轴对齐 rect，而 `boundaryPoint` / `anchor` 收**带 rotate** 的 rect（用 `worldToLocal` / `localToWorld` 处理）—— 两套坐标语义不同。
- **registry 解析**：有效表 = `{ ...BUILTIN_SHAPES, ...(options.shapes ?? {}) }`（注入覆盖内置），解析在 `layoutNode` 入口（避免每个分发点重复查表）；`NodeLayout.shape` → `shapeName: string`（诊断）+ 新增必填 `shapeDef: ShapeDefinition`（已解析定义，取代 switch）。
- **同名覆盖 + warning（onWarn 通道、不门控环境）**：注入含内置同名 key 时覆盖内置、**始终**经 `onWarn` 发 `SHAPE_OVERRIDES_BUILTIN`（与所有 CompileWarning 同通道；用户传 `onWarn` 时即使 production 也收到，仅默认 dispatcher production 静默）。不引入 NODE_ENV 自有分支 —— 库消费者生产构建里仍可检测此配置风险。不加 `allowBuiltinOverride` opt-in 开关（YAGNI）。
- **未知 shape 抛错（throw-only 而非 warn+降级）**：未知 shape 无可降级的正确几何（降到 rectangle 会静默错渲），与 `layoutNode` 现有「position 不可解析即 throw」同级硬失败；throw message 自带 sorted 可用名列表、定位足够，无需先 warn 再 throw。
- **synthetic layout 必挂 `BUILTIN_SHAPES.rectangle`、`shapeDef` 必填非可选**：`compile.ts` 的 `zeroSizeRectAt`（coordinate / scope.id 占位）与 `scope.ts` 的 `registerScopeAsLayout`（scope bbox）不经查表直接构造 rectangle layout，会被 path 端点 / `.north` anchor 引用，故构造点必须显式挂 `shapeDef: BUILTIN_SHAPES.rectangle`（而非"`shapeDef` 可选 + 兜底 rectangle"，避免运行时分支扩散到 coordinate / scope 引用路径）。
- **`BuiltinShapeName` 与 `NodeShape` 分离**：`BUILTIN_SHAPES` 的 Record key 用 `BuiltinShapeName`（4 名）保穷尽性约束；**禁用 `Record<NodeShape, ShapeDefinition>`** —— schema 开放后 `NodeShape` 退化为 `string`、Record 失去对 4 内置的穷尽性。
- **schema 校验不门控内置名**：`NodeSchema.shape = z.string().min(1)`，**不用 `z.union([z.nativeEnum(NODE_SHAPES), z.string().min(1)])`** —— `string().min(1)` 已完全覆盖 enum 分支，union 不增任何校验、只会误导「内置走 enum 校验」；未注册名的拒绝在 compile 期。
- **`ShapeStyle` 独立 type**（不用 `Pick<NodeLayout>`）：扩展面不耦合 internal `NodeLayout`，字段名与 NodeLayout 样式字段一致（单一词汇表）。`circle.emit` 复用 `ellipse.emit`（circle = rx=ry 的 ellipse）。`circumscribe` 半轴进 / 半轴出（最贴 layoutNode 现有 `innerHalfW/H → boundsHalfW/H`）。
- **公开扩展面**：`core/src/shapes/` 导出 `ShapeDefinition` / `ShapeStyle` / `BUILTIN_SHAPES`，并 re-export `Rect` / `Position` / `worldToLocal` / `localToWorld`（后两者脱 `geometry/_transform.ts` 的 `_` 内部前缀、提升为公开 API，供 shape 作者写局部系几何）。
- **shape factory 接口预留（不实现）**：`ShapeDefinition` 是 plain object，`createPolygonShape({ sides })` 这类工厂只是返回它的普通函数、无需工厂语法约定；`CompileOptions.shapes` 接受已实例化的 def，多引脚视觉靠 `emit` 返回 `Iterable<ScenePrimitive>`（一 shape 多 prim）已覆盖。本 ADR 仅断言接口满足这两点。

### 被否决的选项

- **B：`ShapeDefinition` 直译 roadmap 草案（全部方法收 `NodeLayout`、`layout(text, padding)` 整搬进 shape）** —— 把文本度量 / 字号缩放 / sep / min 这些 **shape 无关**逻辑搬进每个 shape，第三方写 `cloud` 要重抄 layout plumbing；`boundaryPoint` / `anchor` 只需几何却被迫依赖 internal `NodeLayout` 全类型；数字角度落到谁不清晰。不达「接口最小、易写第三方」。
- **C：只开 union、不抽统一接口（shape 退化为「外接框近似」）** —— 改动最小，但第三方 shape 无法表达自己的边界 / anchor 几何（`cloud` / `diamond` 类非矩形贴边、`.30` 角度点全错），**等于没有真正的扩展点**，不达「第三方能发 `@retikz/shapes-flow`」的衡量标准。

## 不在本 ADR 范围

- **`{ side, t }` 边上比例点 anchor** → alpha.6（`anchor` v0.2 只要命名 + 数字角度 generic；`{side,t}` 留作内置 shape 专属，第三方 shape 仅必须支持命名 anchor、角度免费）。
- **字符串 target 解析重构**（`'A.north'` / `'A.30'` → 对象 IR）→ alpha.6；本 ADR 不动 `parseTarget` / `parseNodeRef`。
- **shape 继承（`\inheritsavedanchors`）/ shape factory 具体实现 / 形状特化 every（`every diamond node`）** → v0.2 §范围外（v1+）。
- **新增内置 shape**（trapezium / cylinder / cloud 等）→ 维持现有 4 内置，其余全走 registry 由第三方包注入。
- **AST 白名单 / system prompt 硬约束**：`shape` 是 `<Node>` 既有 prop，开放为字符串后不加新组件。

---

> **实现指针**：level `red`（动 `ir/**` node.ts shape 开放 string + `BuiltinShapeName`、`compile/**` registry 查表 + `CompileOptions.shapes` + 分发点重构、新建 `shapes/**` 扩展面、包 index 公开 API）、**向后兼容**（原 4 名仍合法、`CompileOptions.shapes` 可选零破坏；schema 层对 adapter 无感）。真源以代码为准 —— `NodeSchema.shape` / `BuiltinShapeName` / `NodeShape`（`core/src/ir/node.ts`）、`ShapeDefinition` / `ShapeStyle`（`core/src/shapes/types.ts`）、`BUILTIN_SHAPES` + 4 注册项 + helper re-export（`core/src/shapes/`）、5 分发点查表 + `NodeLayout.shapeDef`（`core/src/compile/node.ts`）、`CompileOptions.shapes` + 有效表解析 + 覆盖 warn + 未知 throw + `SHAPE_OVERRIDES_BUILTIN` + synthetic layout 挂 rectangle（`core/src/compile/compile.ts` 与 `compile/scope.ts`）、`worldToLocal` / `localToWorld` 公开（`core/src/geometry/_transform.ts`）、React shape 字符串透传（`react/src/kernel/{builder,unbuilder}`）；测试在 `core/tests/shapes/shape-definition.test.ts`、`core/tests/compile/shape-registry.test.ts` 与改造前后逐字节相等的 `core/tests/compile/shape-baseline-snapshot.test.ts`。完整原文（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。
