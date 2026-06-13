# v0.2.0-alpha.3 实施待办：Shape Registry（打开 NodeShape + ShapeDefinition 注入面）

> ✅ **完工留档（2026-05-22）**：按本 plan + [ADR-01](.//01-shape-registry.md)（已 Accepted）落地。新建 `packages/core/src/shapes/`（`ShapeDefinition` / `ShapeStyle` + 内置 4 注册项 + `BUILTIN_SHAPES`）；`NodeSchema.shape` 开放 `z.string().min(1)`、`BuiltinShapeName` / `NodeShape` 分离；`compile/node.ts` 5 分发点查表 + `NodeLayout` `shape`→`shapeName`+`shapeDef`、`inflateRect` generic、删 `*Of`/`unrotated`；`CompileOptions.shapes` 注入 + `SHAPE_OVERRIDES_BUILTIN` warn + 未知名 throw；synthetic layout 挂 `BUILTIN_SHAPES.rectangle`；公开 API + `<TikZ shapes>` 透传 + 文档站「自定义 Shape」页。内置 4 shape 改造前后 Scene 逐字节相等（`tests/compile/shape-baseline-snapshot.test.ts`）。core 941 / react 264 / docs 54 全过。
>
> 写于 2026-05-21。v0.2 第三段；plan 与 ADR 在 next 分支起草，alpha.1 出关后再开实施代码。完工后保留留档（摘要见 v0.2.md 跟踪段）。
>
> 关联：[`v0.2 总计划 §六段 alpha 节奏`](../roadmap.md#六段-alpha-节奏) · [`v0 roadmap §Shape Registry 提案`](./roadmap.md#shape-registry-提案) · alpha.3 ADR（`notes/decisions/core/v0/v0.2/alpha.3/` 已起草：[ADR-01](.//01-shape-registry.md)）· [alpha.1 ADR-02 anchor 解析](../alpha.1/02-node-index-anchor-resolution.md)（anchor lookup 同方向）

## 背景与定位

`NODE_SHAPES` 是 `as const` 闭合集合（rectangle / circle / ellipse / diamond），4 个 shape 的几何 / 边界 / anchor / emit 硬编码在 `compile/node.ts` 的 5 个 `switch(shape)` 分发点 + `geometry/{rect,circle,ellipse,diamond}.ts` 纯数学层。第三方包想加 `cloud` / `trapezium` / `cylinder` 没法进 IR、也无注入面。

alpha.3 把 shape 从「闭合枚举」推进到「可注册、可第三方注入」：抽 `ShapeDefinition` 接口 + `CompileOptions.shapes` 运行时注入 + `shape` 字段开放为字符串；**内置 4 shape 改造为「自己也是注册项」**，消除内置特权。

**核心约束（AI 一等公民）**：IR 的 `shape` 字段仍是字符串（JSON 可序列化），`ShapeDefinition` 含函数、**不进 IR**，走 `CompileOptions.shapes` 运行时注入。LLM 生成的 IR 永远只写 shape 名字符串。

**依赖关系**：ShapeRegistry **不依赖 Scope**，**可与 alpha.2 并行**（文件 scope 不交叉）。**是 alpha.6 的前置**——alpha.3 固化 `anchor(rect, name)` 接口，alpha.6 的对象化 path target 直接消费同一入口（接口先后、非排期紧邻）。

**衡量标准**：alpha.3 完工后第三方能发 `@retikz/shapes-flow` / `-uml` 之类包，注入新 shape 不依赖 core 修改；内置 4 shape 与注册 shape 走同一路径、无二等公民。

## 范围

**做**：

| 项 | 说明 |
|---|---|
| `ShapeDefinition` 接口 | 四方法 `circumscribe` / `boundaryPoint` / `anchor` / `emit`，操作外接 `Rect` |
| `BUILTIN_SHAPES` 注册表 | 内置 4 shape 改造为注册项 |
| `CompileOptions.shapes` 注入面 | 运行时注入第三方 shape；同名覆盖内置（onWarn 发 warning） |
| `NodeSchema.shape` 开放为字符串 | `z.string().min(1)`；`BuiltinShapeName`（Record key）与 `NodeShape`（开放名）分离 |
| compile 5 分发点查表 | `switch(shape)` → registry lookup |
| 未知 shape 诊断 | compile throw 列出可用名 |

**不做**（写进 ADR §范围外）：

- **新增内置 shape**（trapezium / cylinder / cloud 等）—— 维持现有 4 内置，其余全走 registry 由第三方注入（人工已确认）
- **`{ side, t }` 边比例点 anchor** —— 留 alpha.6；alpha.3 anchor 只要命名 + 数字角度 generic
- **字符串 target 解析重构**（`'A.north'`）—— 留 alpha.6，本段不动 `parseTarget` / `parseNodeRef`
- **shape factory 具体实现 / shape 继承 / 形状特化 every** —— v1+；ADR 仅断言接口预留

## ShapeDefinition 接口（详见 ADR-01）

```ts
export type ShapeDefinition = {
  // 内容半轴(text+padding) → 外接框半轴。rect=identity / circle=√(w²+h²) / ellipse=×√2 / diamond=×2
  circumscribe(innerHalfWidth: number, innerHalfHeight: number): { halfWidth: number; halfHeight: number };
  // 中心→toward 射线 ∩ 边界；rect 带 rotate，用 worldToLocal/localToWorld
  boundaryPoint(rect: Rect, toward: Position): Position;
  // 命名 anchor 世界坐标；不认识的名返回 undefined（调用方抛清晰错误）
  anchor(rect: Rect, name: string): Position | undefined;
  // 视觉 primitive，轴对齐空间（rotate 由编译器外层 GroupPrim 统一施加）
  emit(rect: Rect, style: ShapeStyle, round: (n: number) => number): Iterable<ScenePrimitive>;
};
```

**对 roadmap 草案的关键精化**（理由见 ADR §决策细节）：

1. shape 统一操作**外接 `Rect`**——circle/ellipse/diamond 全由 `rect.width/height` 派生，bounding rect 是单一载体；删 `compile/node.ts` 的 `rectOf`/`circleOf`/`ellipseOf`/`diamondOf`。
2. **margin 膨胀 generic**（所有 shape 都 `w+2m, h+2m`）——提 `inflateRect`，不进 shape 接口。
3. **数字角度 generic**——`angleBoundaryOf` 不变，算 toward 后调 `shape.boundaryPoint`；所有 shape 免费得 `.30`。
4. **emit 收轴对齐 rect**（rotate=0）——消除 diamond 的 `unrotated()` 特例，外层 group 统一旋转。

## IR / schema 改动清单

| 改动 | 文件 | Level | 说明 |
|---|---|---|---|
| `NodeSchema.shape` → 开放 string | `ir/node.ts` | **red** | `z.string().min(1).optional()` + describe（**不用** `z.union([nativeEnum, string])`——string 已覆盖 enum，union 无校验意义、误导）；校验只保非空、未注册名 compile 期拒 |
| `BuiltinShapeName` / `NodeShape` 类型分离 | `ir/node.ts` | **red** | `BuiltinShapeName = ValueOf<typeof NODE_SHAPES>`（Record key）；`NodeShape = BuiltinShapeName \| (string & {})`（开放名，保内置补全）——禁 `Record<NodeShape,...>` 退化 |
| `ShapeDefinition` / `ShapeStyle` 类型 | `shapes/types.ts`（新建） | **red** | 四方法接口 + emit 视觉样式子集 |
| 内置 4 shape 注册项 | `shapes/{rectangle,circle,ellipse,diamond}.ts`（新建） | **red** | assemble geometry ops + circumscribe + emit |
| `BUILTIN_SHAPES` + barrel | `shapes/index.ts`（新建） | **red** | `Record<BuiltinShapeName, ShapeDefinition>` + re-export `ShapeDefinition`/`ShapeStyle`/`Rect`/`Position`/`worldToLocal`/`localToWorld` |
| `CompileOptions.shapes` 注入 + 解析 | `compile/compile.ts` | **red** | 有效表 = `{...BUILTIN_SHAPES, ...options.shapes}`；覆盖经 onWarn 发 `SHAPE_OVERRIDES_BUILTIN`（不门控 NODE_ENV，用户 onWarn 始终收到）；未知 shape throw-only |
| 5 分发点查表 | `compile/node.ts` | **red** | switch → registry；emit*Shape 搬进 shape def；NodeLayout `shape`→`shapeName: string` + 加**必填** `shapeDef`；删 `*Of`/`unrotated` |
| synthetic layout 挂 rectangle shapeDef | `compile/compile.ts`（`zeroSizeRectAt`）/ `compile/scope.ts`（`registerScopeAsLayout`） | **red** | coordinate 占位 / scope.id bbox 不经查表，必须显式 `shapeDef: BUILTIN_SHAPES.rectangle`（使 `shapeDef` 必填、免兜底分支扩散） |
| 未知 anchor 错误信息 | `compile/anchor-cache.ts` | **red** | `anchor` 返回 undefined → throw 含 shape 名；computeAnchor 逻辑不变 |
| `worldToLocal`/`localToWorld` 提升公开 | `geometry/_transform.ts` | **red** | 脱 `_` 内部前缀，供第三方 shape 作者 |
| 公开 API 导出 | `core/src/index.ts` | **red** | `ShapeDefinition`/`ShapeStyle`/`BUILTIN_SHAPES`/`BuiltinShapeName`/`worldToLocal`/`localToWorld` |
| ZodSchema reference + 自定义 shape 章节 | `apps/docs/**` | **green** | shape 字段描述 + Shape Registry 教程（**显著提示** emit 收 rotate=0 rect、boundaryPoint/anchor 收带 rotate rect） |

**判级**：跨级取最高 = **red**，走 Spec-First TDD。绿色文档独立 commit、走简化路径。

**向后兼容**：schema `shape` 扩为开放 string（原 4 名仍合法）；`CompileOptions.shapes` 可选——零破坏。

**AST 白名单 / system prompt**：`shape` 是 `<Node>` 既有 prop，开放后不加新组件；system prompt 顺手补「shape 支持注册扩展 + 列举已注册名」（green，非阻塞）。

## 实现拆分

1. **shapes/ 扩展面**（packages/core）：`types.ts`（`ShapeDefinition` / `ShapeStyle`）；`{rectangle,circle,ellipse,diamond}.ts` 4 注册项（内部复用 `geometry/*` 纯数学 ops，数学层不动）；`index.ts`（`BUILTIN_SHAPES: Record<BuiltinShapeName, ...>` + helper re-export）。
2. **schema + 类型**：`ir/node.ts` 的 `shape` 改 `z.string().min(1)` + describe；加 `BuiltinShapeName`、重定义 `NodeShape` 为开放名。
3. **compile 查表**：`compile/compile.ts` 加 `CompileOptions.shapes` + 有效表解析 + 覆盖 warn（onWarn 通道）+ 未知 throw-only + warn code `SHAPE_OVERRIDES_BUILTIN`；`compile/node.ts` 5 分发点 switch → 查表、emit 搬迁、NodeLayout `shape`→`shapeName` + 加必填 `shapeDef`、删 `*Of`/`unrotated`、margin 走 generic `inflateRect`。
4. **synthetic layout shapeDef**：`compile/compile.ts` 的 `zeroSizeRectAt`（coordinate / scope.id 占位）+ `compile/scope.ts` 的 `registerScopeAsLayout`（scope bbox）显式挂 `shapeDef: BUILTIN_SHAPES.rectangle`。
5. **anchor 错误**：`compile/anchor-cache.ts` 未知 anchor 错误信息更新（列 shape 名）。
6. **helper 提升**：`geometry/_transform.ts` 的 `worldToLocal`/`localToWorld` 公开导出。
7. **测试**（Spec-First，red）：见 ADR 测试象限——内置 circumscribe/anchor/boundaryPoint 等价、注入/覆盖/未知、**改造前后内置 shape Scene 快照逐字节相等**回归、synthetic layout 挂 rectangle、emit 轴对齐、数字角度对自定义 shape 免费、**emit 多 primitive**、margin generic。
8. **公开 API**（`core/src/index.ts`）+ **文档**（green）+ **system prompt**（green）同步。

## 文档

- `apps/docs/.../reference/schema/**`：`shape` 字段描述更新（开放 string + 注册扩展点）
- `apps/docs/.../core/**`：新增「自定义 shape / Shape Registry」章节——`ShapeDefinition` 四方法 + factory 模式示例（`createPolygonShape`）+ `CompileOptions.shapes` 注入 + 覆盖内置 warn；配 demo
- `AGENTS.md` / `packages/core/AGENTS.md`：Shape Registry 一节（IR 字符串 + 运行时注入的边界）
- system prompt：注明 shape 开放扩展 + 列举已注册名

## 验收

- **内置等价（回归关键）**：改造前后内置 4 shape 的 Scene primitive 快照逐字节相等（boundaryPoint / anchor / 角度 / emit / 旋转 / margin 全路径）——证明纯重构无行为漂移
- **synthetic layout**：coordinate 占位 / scope.id bbox 的 layout `shapeDef === BUILTIN_SHAPES.rectangle`，被 path / `.north` anchor 引用不崩
- **注入自定义 shape**：`shapes: { hexagon }` + `node.shape='hexagon'` → 出 Scene、emit 自定义 prim
- **emit 多 primitive**：注入 emit 出 body + ≥2 pin 的 shape → Scene 含全部 prim（factory 接口价值）
- **数字角度免费**：注入只实现 `boundaryPoint` 的 shape，`'X.30'` 角度锚点可用
- **同名覆盖**：`shapes: { rectangle: custom }` + 自带 onWarn → 用 custom + onWarn 收 `SHAPE_OVERRIDES_BUILTIN`；production 下用户 onWarn 仍收到（仅默认 dispatcher 静默）
- **未知 shape**：`node.shape='cloud'` 未注册 → compile throw-only 列 sorted 可用名
- **schema/compile 分层**：`shape='cloud'` 通过 schema 校验（`z.string().min(1)` 接受任意非空），错误延到 compile
- **未知 anchor**：内置 shape `anchor('foobar')` → undefined → throw 含 shape 名
- **emit 轴对齐**：diamond 带 rotate → 顶点经外层 group 旋转，等价改造前 `unrotated` 路径
- 零破坏 v0.1 / alpha.1 既有测试；ZodSchema reference 含开放 string 描述

## 待定（全部拍板）

> **全部拍板**（2026-05-21 收敛）：接口 A、命名 anchor + 数字角度 generic、同名覆盖 + warn、未知 throw、维持 4 内置；`ShapeStyle` 独立 type、`circle.emit` 复用 `ellipse.emit`、`shapeDef` 存进 `NodeLayout`、`circumscribe` 半轴进 / 半轴出、覆盖内置不加 opt-in 开关。详见 [ADR-01 §决策细节](.//01-shape-registry.md)（10–14 项）。无遗留待决项。

## 设计 ADR

已起草（`notes/decisions/core/v0/v0.2/alpha.3/`，状态 Proposed）：

### [ADR-01 — Shape Registry](.//01-shape-registry.md)

`ShapeDefinition` 四方法（circumscribe / boundaryPoint / anchor / emit，操作外接 Rect）+ `BUILTIN_SHAPES` 注册表（key 用 `BuiltinShapeName`）+ `CompileOptions.shapes` 运行时注入 + `shape` 字段开放为 `z.string().min(1)`；内置 4 shape 改注册项；数字角度 generic、`anchor` 命名权威、emit 轴对齐（收 rotate=0 rect）；同名覆盖经 onWarn 发 warning、未知 shape throw-only；synthetic layout（coordinate / scope.id）挂 rectangle shapeDef；IR 仍纯字符串、ShapeDefinition 不进 IR；factory 接口预留断言；renderer-neutral 出 ScenePrimitive。含 Level=red 实现契约（Schema 改动表 / 文件 scope / 测试象限 / 依赖现有元素）。
