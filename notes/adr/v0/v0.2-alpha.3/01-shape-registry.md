# ADR-01：Shape Registry（NodeShape 开放为字符串 + ShapeDefinition 注入面 + 内置 4 shape 改造为注册项）

- 状态：Proposed
- 决策日期：2026-05-21
- 关联：[v0 roadmap §Shape Registry 提案](../../../plans/v0/roadmap.md#shape-registry-提案) · [v0.2 总计划 §七段 alpha 节奏](../../../plans/v0/v0.2.md#七段-alpha-节奏) · [DESIGN.md §1.2 AI 一等公民](../../../architecture/DESIGN.md) · [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · [v0.1-beta.1 ADR-03 geometry 共享 transform / 死 anchor 清理](../v0.1-beta.1/03-geometry-shared-transform-dead-anchor-cleanup.md) · [v0.1-beta.1 ADR-08 onWarn 收集器](../v0.1-beta.1/08-compile-on-warn-collector.md)

> **前置依赖说明**：alpha.7（结构化 Target / Anchor）依赖本 ADR 先固化 anchor 接口。本 ADR 把 anchor 解释面收敛到 `ShapeDefinition.anchor(rect, name)`，alpha.7 的对象化 path target 直接消费同一入口，避免「内置 shape anchor 走旧路径、注册 shape anchor 走新路径」的双轨。是接口先后，非排期紧邻。

## 背景

`NODE_SHAPES` 是 `as const` 闭合集合（`rectangle` / `circle` / `ellipse` / `diamond`），`NodeShape = z.nativeEnum(NODE_SHAPES)`。4 个 shape 的几何 / 边界 / anchor / emit 硬编码在两层：

- **纯数学层** `geometry/{rect,circle,ellipse,diamond}.ts`：各导出结构类型（`Rect` / `Circle` / `Ellipse` / `Diamond`）+ ops 对象（`center` / `contains` / `anchor(struct, RectAnchor)` / `boundaryPoint(struct, toward)`）。
- **编译分发层** `compile/node.ts`：5 个 `switch (shape)` 分发点——`layoutNode`（内框 → 外接框 circumscription）、`boundaryPointOf`、`anchorOf`、`angleBoundaryOf`、`emitNodePrimitives`（`emitRectShape` / `emitEllipseShape` / `emitDiamondShape`），外加 `rectOf`/`circleOf`/`ellipseOf`/`diamondOf` 把 `NodeLayout` 转成各 shape 结构。

第三方包想加 `cloud`（拓扑）/ `trapezium`（流程图）/ `cylinder`（数据库）没法进 IR，也没有可注入面。**`geometry/` 现存 4 个 shape 文件 = 这套接口的「硬编码版本」**——本 ADR 把每个包成一个 `ShapeDefinition` 注册项；纯数学文件（`point` / `polar` / `bend` / `segment` / `arc`）不变。

**不能套 Tier 2 `lowerComposites` 钩子**：shape 是 Tier 1 一等基元——`boundaryPoint` / `anchor` / `circumscribe` / `emit` 四件事下沉不到 Kernel，它本身就是 Kernel 的一部分。

**AI 一等公民校验**（DESIGN.md §1.2）：核心约束——**IR 的 `shape` 字段仍是字符串（JSON 可序列化），`ShapeDefinition` 含函数、不进 IR，走 `CompileOptions.shapes` 运行时注入**。LLM 生成的 IR 永远只写 shape 名字符串，扩展能力靠宿主在编译期注入。内置 4 名通过 `.describe` + schema reference + system prompt 列举（schema 校验只 `z.string().min(1)`、不门控内置名；未注册名 compile 期拒）。

## 选项

### A. 抽 `ShapeDefinition`（4 方法、操作外接 `Rect`、generic 部分留 `layoutNode`）+ 运行时注入（**推荐**）

shape 只承担**真正多态**的 4 件事，统一操作外接 `Rect`（bounding box 是所有内置 shape 的天然单一载体）；文本度量 / 字号缩放 / sep / minimumSize / margin 膨胀 / 数字角度等 generic 逻辑留在 `layoutNode` 与编译分发层。

```ts
// packages/core/src/shapes/types.ts
import type { Rect } from '../geometry/rect';
import type { Position } from '../geometry/point';
import type { ScenePrimitive } from '../primitive';

/** emit 需要的视觉样式子集（从 NodeLayout 的样式字段收敛，不含几何 / 文本） */
export type ShapeStyle = {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  roundedCorners?: number;
  opacity?: number;
};

export type ShapeDefinition = {
  /**
   * 外接：内容半轴（text + padding）→ 外接框半轴。
   * rectangle: identity；circle: √(w²+h²) 两轴相等；ellipse: ×√2；diamond: ×2。
   */
  circumscribe(innerHalfWidth: number, innerHalfHeight: number): {
    halfWidth: number;
    halfHeight: number;
  };
  /** 中心 → toward 射线 ∩ 边界。rect 带 rotate，用 worldToLocal / localToWorld 处理旋转。 */
  boundaryPoint(rect: Rect, toward: Position): Position;
  /** 命名 anchor 世界坐标；shape 不认识的名字返回 undefined（调用方据此抛清晰错误）。 */
  anchor(rect: Rect, name: string): Position | undefined;
  /** 视觉 primitive，**轴对齐空间**（rotate 由编译器外层 GroupPrim 统一施加）。 */
  emit(rect: Rect, style: ShapeStyle, round: (n: number) => number): Iterable<ScenePrimitive>;
};
```

```ts
// packages/core/src/ir/node.ts —— 内置名（Record key 用）与开放名分离
export type BuiltinShapeName = ValueOf<typeof NODE_SHAPES>;   // 'rectangle' | 'circle' | 'ellipse' | 'diamond'
export type NodeShape = BuiltinShapeName | (string & {});     // 开放名；`& {}` 保内置名 IDE 自动补全

// packages/core/src/shapes/index.ts —— Record key 用 BuiltinShapeName（不用 NodeShape，避免开放后退化为 Record<string>）
export const BUILTIN_SHAPES: Record<BuiltinShapeName, ShapeDefinition> = {
  rectangle, circle, ellipse, diamond,
};

// packages/core/src/compile/compile.ts —— CompileOptions 扩字段
shapes?: Record<string, ShapeDefinition>;   // 运行时注入第三方 shape（不进 IR）

// packages/core/src/ir/node.ts —— schema 开放为任意非空字符串（校验不门控内置名）
NodeSchema.shape = z.string().min(1).optional()
  .describe('节点形状；内置 rectangle/circle/ellipse/diamond，或经 CompileOptions.shapes 注册的扩展名。任意非空字符串通过 schema 校验，未注册名在 compile 期报错。');
```

> **不用 `z.union([z.nativeEnum(NODE_SHAPES), z.string().min(1)])`**（评审 3）：`string().min(1)` 已完全覆盖 enum 分支，union 不增加任何校验、只会误导「内置走 enum 校验」。内置 4 名通过 `.describe` + schema reference + system prompt 列出；schema 层只保证非空字符串。

**解析规则**：有效 shape 表 = `{ ...BUILTIN_SHAPES, ...options.shapes }`（注入覆盖内置）；编译期按 `node.shape ?? 'rectangle'` 查表，未命中 throw 列出可用名。

- 优：接口最小、贴现实分发点；shape 只看几何不看 internal layout 全字段；数字角度 generic（所有 shape 免费得 `.30`）；emit 轴对齐消除 diamond 的 `unrotated()` 特例；IR 仍纯字符串。
- 缺：相比 roadmap 草案多一个「generic / 多态」边界判断（哪些留 layoutNode、哪些进 shape）——但这恰是把硬编码拆干净的必要工作。

### B. `ShapeDefinition` 直译 roadmap 草案（全部方法收 `NodeLayout`、`layout(text, padding)` 整搬进 shape）

roadmap 草案 `layout(text, padding): Rect` / `boundaryPoint(layout, from)` / `anchor(layout, name)` / `emit(layout, round)` 字面实现——每个方法都拿到完整 `NodeLayout`。

- 优：与 roadmap 文字一致，签名统一。
- 缺：① 把文本度量 / 字号缩放 / sep / min 这些 **shape 无关**逻辑搬进每个 shape，第三方写一个 `cloud` 要重抄一遍 layout plumbing；② `boundaryPoint` / `anchor` 只需几何却被迫依赖 internal `NodeLayout` 全类型，扩展面与内部结构强耦合；③ 数字角度落到谁不清晰。不达「接口最小、易写第三方」目标。

### C. 只开 union、不抽统一接口（shape 退化为「外接框近似」）

`shape` 字段开放为字符串，但内部只对内置 4 名做精确几何，未知 shape 一律按 bounding rect 近似（rect 的 anchor / boundaryPoint 兜底）。

- 优：改动最小。
- 缺：第三方 shape 无法表达自己的边界 / anchor 几何——`cloud` / `diamond` 类非矩形贴边、`.30` 角度点全错。**等于没有真正的扩展点**，不达 v0.2 衡量标准「第三方能发 `@retikz/shapes-flow`」。

## 决策：A

理由：

1. **达标**：`ShapeDefinition` + `CompileOptions.shapes` 让第三方能发 `@retikz/shapes-flow` / `-uml` 不依赖 core 修改；内置 4 shape 改注册项消除内置特权。
2. **接口最小、贴现实**：4 方法精确对应 5 个分发点的多态部分（`circumscribe`↔layoutNode 外接、`boundaryPoint`↔boundaryPointOf+angleBoundaryOf、`anchor`↔anchorOf、`emit`↔emitNodePrimitives），generic 逻辑不外溢——第三方写 shape 只关心几何。
3. **AI 友好 + IR 纯净**：IR `shape` 仍是字符串，`ShapeDefinition` 走运行时注入不进 IR，序列化 / LLM tool schema / JSON Patch 全不受影响；schema 只校验非空字符串、未注册名 compile 期拒，内置名经 describe / reference / system prompt 列出。
4. **为 alpha.7 固化 anchor 接口**：`anchor(rect, name): Position | undefined` 是命名 anchor 唯一权威；数字角度 generic 走 boundaryPoint；alpha.7 对象化 path target 直接消费这套，不开双轨。
5. **renderer-neutral**：emit 出 `ScenePrimitive`（`RectPrim` / `EllipsePrim` / `PathPrim` / `GroupPrim`），adapter 不感知 shape（延续 v0.1-beta.1 ADR）。

## 决策细节

> 主选项已锁，以下随对话收敛，下游按此执行。

1. **shape 操作外接 `Rect`**：`circle` / `ellipse` / `diamond` 全部由 `rect.width/height` 派生（`radius = width/2`、`rx = width/2, ry = height/2`、`halfA = width/2, halfB = height/2`），bounding `Rect`（x/y/width/height/rotate）是单一载体。删除 `compile/node.ts` 的 `rectOf`/`circleOf`/`ellipseOf`/`diamondOf` shape 专属转换，统一用 `Rect`。

2. **margin 膨胀 generic**：所有 shape 的 margin 外扩都是 `width += 2m, height += 2m`（已验证 4 个 `*Of` 均如此）。提取 generic `inflateRect(rect, m): Rect`，由 `boundaryPointOf` 调用方先膨胀再传 `shape.boundaryPoint`；`anchorOf` / `angleBoundaryOf` 不膨胀（沿用现状：explicit anchor 取视觉边界、不涉 outer sep）。

3. **数字角度 generic（你已拍板：anchor 只要命名）**：`angleBoundaryOf` 不进 shape 接口——保持现状由编译层算出局部 `(cos,sin)` 经 `rect.rotate` 旋转成世界 toward，调 `shape.boundaryPoint(rect, toward)`。任何实现了 `boundaryPoint` 的 shape 自动获得 `.30` 角度锚点。`anchor-cache.ts` 的 `computeAnchor` 逻辑不变（`ANGLE_RE` → `angleBoundaryOf`；其余 → `anchorOf`）。

4. **`anchor` 返回 `Position | undefined` + 未知名抛错**：`anchorOf(layout, name)` 改为 `shape.anchor(layout.rect, name)`；返回 `undefined` 时 throw `Unknown anchor '<name>' for shape '<shape>'`（取代现状 geometry 层 RectAnchor cast）。内置 4 shape 的 `anchor` 仍只认 9 个 `RECT_ANCHORS` 名，行为零变化。

5. **emit 收轴对齐 rect（rotate=0）+ `ShapeStyle`**：`emitNodePrimitives` 给 `shape.emit` 传 `{ ...layout.rect, rotate: 0 }` + 从 layout 收敛的 `ShapeStyle`；rotate 由 emitNodePrimitives 末端的外层 `GroupPrim` 统一施加（`rotateDeg !== 0` 时）。**消除 diamond 的 `unrotated()` 特例**——所有 shape emit 都在轴对齐空间，diamond 顶点经外层 group 旋转，与 text 一致。**第三方最易写错点（评审补，须文档显著提示）**：`emit` 收 rotate=0 轴对齐 rect，而 `boundaryPoint` / `anchor` 收**带 rotate** 的 rect（用 `worldToLocal` / `localToWorld` 处理）——两套坐标语义不同。

6. **registry 解析**：有效表 = `{ ...BUILTIN_SHAPES, ...(options.shapes ?? {}) }`。
   - **同名覆盖 + warning（经 onWarn 通道、不门控环境）**（你已拍板覆盖；评审 4 修正触发语义）：`options.shapes` 含内置同名 key 时覆盖内置，**始终**经 `onWarn` 发 `SHAPE_OVERRIDES_BUILTIN` warning——与所有 CompileWarning 同通道；是否落地由 dispatcher 决定（**用户传 `onWarn` 时即使 production 也收到**，仅默认 dispatcher 在 production 静默）。不引入 NODE_ENV 自有分支，库消费者在生产构建里仍可检测此配置风险。
   - **未知 shape 抛错（throw-only）**（你已拍板）：`node.shape` 不在有效表 → throw `Unknown shape '<name>'; registered shapes: <sorted list>`。**throw-only 而非 warn+降级的理由（评审 6）**：未知 shape 无可降级的正确几何（降到 rectangle 会静默错渲），与 `layoutNode` 现有「position 不可解析即 throw」同级硬失败；throw message 自带可用名列表、定位足够，无需先发 warning 再 throw。
   - 解析在 `layoutNode` 入口（拿到 shape def 后续 circumscribe / 存入 NodeLayout 供 boundaryPoint/anchor/emit 复用），避免每个分发点重复查表。`NodeLayout` 的 `shape: NodeShape` 改为 `shapeName: string`（诊断 / 错误信息）+ 新增 `shapeDef: ShapeDefinition`（已解析定义，取代 switch）。
   - **synthetic layout 必挂 `BUILTIN_SHAPES.rectangle`，`shapeDef` 必填非可选**（评审 1）：`NodeLayout` 不只来自 `layoutNode`——`compile.ts` 的 `zeroSizeRectAt`（coordinate 占位 + scope.id 入场占位）与 `scope.ts` 的 `registerScopeAsLayout`（scope bbox）也直接构造 rectangle layout、**不经查表**。这些 synthetic layout 会被 path 端点 / `.north` 等 anchor 引用，故其构造点必须显式 `shapeDef: BUILTIN_SHAPES.rectangle`。选「构造点挂 rectangle」而非「`shapeDef` 可选 + boundaryPointOf/anchorOf/emit 兜底 rectangle」——避免运行时分支扩散到 coordinate / scope 引用路径（评审推荐前者）。

7. **shape factory 接口预留（不实现，对齐 v0.2 范围外）**：`ShapeDefinition` 是 plain object → `createPolygonShape({ sides })` / `createDipShape({ pinCount })` 这类工厂只是返回 `ShapeDefinition` 的普通函数，无需任何工厂语法约定；`CompileOptions.shapes` 接受**已实例化**的 def。多引脚视觉（body + 每个 pin 短线 / 编号）靠 `emit` 返回 `Iterable<ScenePrimitive>`（一 shape 多 prim）已覆盖。本 ADR **仅断言接口满足这两点**，不写具体 factory。

8. **rotate 折平语义**：`boundaryPoint` / `anchor` 收带 `rotate` 的 `Rect`，shape 作者用 re-export 的 `worldToLocal` / `localToWorld` 写局部系几何，旋转透明处理（沿用 geometry ops 现有模式）。「shape 看到的全是已旋转坐标系几何、实现无需感知 rotate」由这两个 helper 保证。

9. **公开扩展面**：新建 `packages/core/src/shapes/` 导出 `ShapeDefinition` / `ShapeStyle` / `BUILTIN_SHAPES`，并 re-export 第三方 shape 作者所需 `Rect` / `Position` / `worldToLocal` / `localToWorld`（后两者脱 `_transform.ts` 的 `_` 内部前缀，提升为公开 API）。
10. **`ShapeStyle` 独立 type**（不用 `Pick<NodeLayout>`）：扩展面不耦合 internal `NodeLayout`；字段名与 NodeLayout 样式字段一致（单一词汇表）。
11. **`circle.emit` 复用 `ellipse.emit`**：circle = rx=ry 的 ellipse，emit 直接委托 `ellipse.emit`，省重复。
12. **`circumscribe` 半轴进 / 半轴出**：签名 `(innerHalfWidth, innerHalfHeight) → { halfWidth, halfHeight }`，最贴 layoutNode 现有 `innerHalfW/H → boundsHalfW/H`。
13. **`shapeDef` 存进 `NodeLayout`**：boundaryPoint / anchor / emit 多点复用、避免重复查表；NodeLayout 是 compile 内部类型（不出 Scene、不进 IR），挂函数无碍。
14. **覆盖内置不加 opt-in 开关**：直接覆盖 + `SHAPE_OVERRIDES_BUILTIN` warning（onWarn 通道，见 #6）足够（YAGNI），不引入 `CompileOptions.allowBuiltinOverride`。
15. **`BuiltinShapeName` 与 `NodeShape` 分离**（评审 2）：`BuiltinShapeName = ValueOf<typeof NODE_SHAPES>`（4 名）作 `BUILTIN_SHAPES` 的 Record key；`NodeShape = BuiltinShapeName | (string & {})` 表达开放名（保内置名 IDE 自动补全）。**禁用 `Record<NodeShape, ShapeDefinition>`**——schema 开放后 `NodeShape` 退化为 `string`，Record 失去对 4 内置的穷尽性约束。
16. **schema 校验不门控内置名**（评审 3）：`NodeSchema.shape = z.string().min(1)`（不用 `z.union([nativeEnum, string])`——见选项 A 注）。schema 期任意非空字符串通过；未注册名的拒绝在 **compile 期**（见测试 `unknown_shape_string_in_schema_passes_validation`）。实现者 / 测试作者据此分层，勿在 schema 层加 enum 门。

## 待决策点

> **全部拍板**（2026-05-21 收敛，已并入上「决策细节」10–14）：`ShapeStyle` 独立 type、`circle.emit` 复用 `ellipse.emit`、`circumscribe` 半轴进 / 半轴出、`shapeDef` 存进 `NodeLayout`、覆盖内置不加 opt-in 开关。无遗留待决项。

## DSL 表面

> shape 注入是 `CompileOptions` / 宿主层能力，**不写进 IR**。以下示宿主侧用法。

```ts
import { compileToScene, type ShapeDefinition } from '@retikz/core';
import { worldToLocal, localToWorld, type Rect, type Position } from '@retikz/core';

// 第三方 / 用户自定义 shape：正六边形（factory 模式 —— 普通函数返回 ShapeDefinition）
const createPolygonShape = (sides: number): ShapeDefinition => ({
  circumscribe: (hw, hh) => {
    const r = Math.sqrt(hw * hw + hh * hh);
    return { halfWidth: r, halfHeight: r };  // 外接圆同 circle
  },
  boundaryPoint: (rect, toward) => { /* 多边形射线交边，用 worldToLocal/localToWorld */ },
  anchor: (rect, name) => {
    if (name === 'center') return [rect.x, rect.y];
    return undefined;  // 不认识的名 → 调用方抛 Unknown anchor
  },
  emit: function* (rect, style, round) {
    yield { type: 'path', commands: [/* n 顶点 + close */], ...style };
  },
});

// 注入：IR 里只写 shape: 'hexagon' 字符串，定义在 options 注入
const scene = compileToScene(ir, {
  shapes: { hexagon: createPolygonShape(6) },
});

// 覆盖内置（dev 发 SHAPE_OVERRIDES_BUILTIN warning）：换默认 rectangle 的圆角行为
compileToScene(ir, { shapes: { rectangle: myRoundedRectShape } });
```

```jsonc
// IR 始终是纯字符串 shape（JSON 可序列化，LLM 友好）
{ "type": "node", "shape": "hexagon", "position": [0, 0], "text": "准备" }
{ "type": "node", "shape": "cloud", "position": [40, 0], "text": "Internet" }   // 未注册 → compile throw 列出可用名
```

## 测试设计

`packages/core/tests/shapes/shape-definition.test.ts`（新建）+ `packages/core/tests/compile/shape-registry.test.ts`（新建）+ 复用现有 `compile/node` 快照覆盖：

- **接口契约**：4 个内置 def 的 `circumscribe` 数值（rect identity / circle √(w²+h²) / ellipse ×√2 / diamond ×2）与改造前 `layoutNode` switch 等价；`anchor` 9 名 + 未知名 undefined；`boundaryPoint` 含 rotate。
- **registry**：注入 shape 编译通；同名覆盖发 warning + 实际覆盖；未知 shape throw 列出可用名；空 `options.shapes` 行为同改造前。
- **回归（关键）**：改造前后内置 4 shape 的 Scene primitive **快照逐字节相等**（boundaryPoint / anchor / angle / emit / 旋转 / margin 全路径）——证明纯重构无行为漂移。
- **emit 轴对齐**：diamond 带 rotate 时顶点经外层 group 旋转（取代 `unrotated`），与旋转前 + group 等价。

## 影响

- `packages/core/src/ir/node.ts`：`shape` 字段 `nativeEnum` → `z.string().min(1)`（开放，校验不门控内置名）+ `.describe`；新增 `BuiltinShapeName` / 重定义 `NodeShape` 为开放名（见决策细节 15）。
- `packages/core/src/shapes/`（新建目录）：`types.ts`（`ShapeDefinition` / `ShapeStyle`）+ `{rectangle,circle,ellipse,diamond}.ts`（4 注册项，assemble geometry ops + circumscribe + emit）+ `index.ts`（`BUILTIN_SHAPES` + re-export helper）。
- `packages/core/src/compile/node.ts`：5 分发点 switch → registry 查表；emit*Shape 逻辑搬进对应 shape def；`NodeLayout` 的 `shape` → `shapeName: string` + 加必填 `shapeDef`；删 `*Of` / `unrotated`。
- `packages/core/src/compile/compile.ts`：`CompileOptions` 加 `shapes?`；解析有效 shape 表 + 覆盖 warn（onWarn 通道）+ 未知 throw；新增 warn code `SHAPE_OVERRIDES_BUILTIN`；**`zeroSizeRectAt`（coordinate / scope.id 占位）synthetic layout 加 `shapeDef: BUILTIN_SHAPES.rectangle`**。
- `packages/core/src/compile/scope.ts`：**`registerScopeAsLayout`（scope bbox）synthetic layout 加 `shapeDef: BUILTIN_SHAPES.rectangle`**。
- `packages/core/src/compile/anchor-cache.ts`：`anchorOf` 抛错信息更新（未知 anchor 列 shape 名）；`computeAnchor` 逻辑不变。
- `packages/core/src/geometry/_transform.ts`：`worldToLocal` / `localToWorld` 提升公开（脱 `_` 语义，经 shapes barrel re-export）。
- `packages/core/src/index.ts`：公开 API 加 `ShapeDefinition` / `ShapeStyle` / `BUILTIN_SHAPES` / `BuiltinShapeName` / `worldToLocal` / `localToWorld`。
- `packages/react/src/kernel/builder.ts` / `unbuilder.ts`：`shape` 字符串透传（开放为 string 后任意非空字符串合法，校验交 compile）；如需 React 层注入 shapes，`<Layout>` 透传 compile options（与 measureText 同路径）。
- 文档：`apps/docs` schema reference `shape` 字段描述更新 + 新增「自定义 shape / Shape Registry」章节（**须显著提示**：`emit` 收 rotate=0 轴对齐 rect、`boundaryPoint`/`anchor` 收带 rotate 的 rect——第三方最易写错点）；system prompt 注明开放扩展点 + 列举已注册 shape。
- `AGENTS.md` / `packages/core/AGENTS.md`：Shape Registry 一节。
- 对外 API：schema `shape` 扩为开放 string（**向后兼容**：原 4 名仍合法）；新增 `CompileOptions.shapes`（可选，零破坏）。

## 不在本 ADR 范围

- **`{ side, t }` 边上比例点 anchor** → alpha.7（你已拍板：`anchor` v0.2 只要命名 + 数字角度 generic；`{side,t}` 留作内置 shape 专属，第三方 shape 仅必须支持命名 anchor，角度免费）。
- **字符串 target 解析重构**（`'A.north'` / `'A.30'` → 对象 IR）→ alpha.7；本 ADR 不动 `parseTarget` / `parseNodeRef`。
- **shape 继承（`\inheritsavedanchors`）/ shape factory 具体实现 / 形状特化 every（`every diamond node`）** → v0.2 §范围外（v1+）。
- **新增内置 shape**（trapezium / cylinder / cloud 等）→ 本 ADR 维持现有 4 内置，其余全走 registry 由第三方包注入（人工已确认）。
- **AST 白名单 / system prompt 硬约束**：`shape` 是 `<Node>` 既有 prop，开放为字符串后不加新组件；system prompt 顺手补「shape 支持注册扩展、列举已注册名」为 green，不在本 ADR 硬约束。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（node.ts shape 开放 string + BuiltinShapeName）
- 动 `packages/core/src/compile/**`（registry 查表 + CompileOptions.shapes + 分发点重构）
- 动 `packages/core/src/shapes/**`（新建扩展面）
- 动 `packages/core/src/index.ts`（公开 API）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/node.ts` | 改 schema | `NodeSchema.shape` | `z.string().min(1).optional()` | undefined（编译期回退 `rectangle`） | 节点形状；内置 rectangle/circle/ellipse/diamond，或经 `CompileOptions.shapes` 注册的扩展 shape 名；校验只保非空、未注册名 compile 期拒 |
| `ir/node.ts` | 新建 type | `BuiltinShapeName` | `ValueOf<typeof NODE_SHAPES>` | — | 内置 4 名联合；`BUILTIN_SHAPES` 的 Record key |
| `ir/node.ts` | 改 type | `NodeShape` | `BuiltinShapeName \| (string & {})` | — | 开放 shape 名；保内置名 IDE 自动补全（取代旧 `ValueOf<typeof NODE_SHAPES>`） |
| `shapes/types.ts` | 新建 type | `ShapeDefinition` | `{ circumscribe; boundaryPoint; anchor; emit }`（见决策） | — | shape 的外接 / 边界 / anchor / emit 四件事；plain object 支持 factory；含函数、不进 IR |
| `shapes/types.ts` | 新建 type | `ShapeStyle` | `{ fill?; fillOpacity?; stroke?; strokeOpacity?; strokeWidth?; dashPattern?; roundedCorners?; opacity? }` | — | emit 视觉样式子集，从 NodeLayout 样式字段收敛 |
| `shapes/index.ts` | 新建常量 | `BUILTIN_SHAPES` | `Record<BuiltinShapeName, ShapeDefinition>` | rectangle/circle/ellipse/diamond | 内置 4 shape 注册项；与注入表合并时被同名注入覆盖（Record key 用 `BuiltinShapeName` 保穷尽性，不用开放的 `NodeShape`） |
| `compile/compile.ts` | 改 type | `CompileOptions.shapes` | `Record<string, ShapeDefinition>.optional()` | undefined | 运行时注入第三方 shape；同名覆盖内置（onWarn 发 warning）；不进 IR |
| `compile/compile.ts` | 新增 warn code | `SHAPE_OVERRIDES_BUILTIN` | `CompileWarning['code']` 成员 | — | 注入 shape 覆盖内置同名时经 onWarn 发（与其它 warning 同通道；默认 dispatcher production 静默，用户自带 onWarn 始终收到） |

> shape 名字符串是 IR 真源；`ShapeDefinition` 是宿主运行时对象、不序列化。schema 校验只保非空字符串（不门控内置名）；内置 4 名经 `.describe` / schema reference / system prompt 列出，未注册名在 compile 期拒。

### 文件 scope

- `packages/core/src/ir/node.ts`（修改：shape 开放 `z.string().min(1)` + describe；加 `BuiltinShapeName` / 重定义 `NodeShape`）
- `packages/core/src/shapes/types.ts`（新建：`ShapeDefinition` / `ShapeStyle`）
- `packages/core/src/shapes/{rectangle,circle,ellipse,diamond}.ts`（新建：4 注册项）
- `packages/core/src/shapes/index.ts`（新建：`BUILTIN_SHAPES` + re-export `ShapeDefinition`/`ShapeStyle`/`Rect`/`Position`/`worldToLocal`/`localToWorld`）
- `packages/core/src/compile/node.ts`（修改：5 分发点查表 + emit 搬迁 + NodeLayout `shape`→`shapeName` + 加必填 `shapeDef` + 删 `*Of`/`unrotated`）
- `packages/core/src/compile/compile.ts`（修改：`CompileOptions.shapes` + 有效表解析 + 覆盖 warn + 未知 throw + warn code；`zeroSizeRectAt` synthetic layout 挂 `shapeDef: BUILTIN_SHAPES.rectangle`）
- `packages/core/src/compile/scope.ts`（修改：`registerScopeAsLayout` synthetic layout 挂 `shapeDef: BUILTIN_SHAPES.rectangle`）
- `packages/core/src/compile/anchor-cache.ts`（修改：未知 anchor 错误信息；computeAnchor 逻辑不变）
- `packages/core/src/geometry/_transform.ts`（修改：`worldToLocal`/`localToWorld` 提升公开导出）
- `packages/core/src/index.ts`（公开 API 加 `ShapeDefinition`/`ShapeStyle`/`BUILTIN_SHAPES`/`worldToLocal`/`localToWorld`）
- `packages/core/tests/shapes/shape-definition.test.ts`（新建）
- `packages/core/tests/compile/shape-registry.test.ts`（新建）
- `packages/react/src/kernel/builder.ts` / `unbuilder.ts`（修改：shape 字符串透传；如透传 compile shapes 则同 measureText 路径）
- `apps/docs/src/contents/core/reference/schema/**`（修改：shape 字段描述）
- `apps/docs/src/contents/core/**`（新建：自定义 shape / Shape Registry 章节 + demo）
- `AGENTS.md` / `packages/core/AGENTS.md`（修改：Shape Registry 一节）

### 测试象限

#### Happy path（≥ 3）

- `builtin_circumscribe_matches_legacy`：4 内置 def 的 `circumscribe` 数值 = 改造前 `layoutNode` switch（rect identity / circle √(w²+h²) / ellipse ×√2 / diamond ×2）
- `inject_custom_shape_compiles`：`shapes: { hexagon }` + `node.shape='hexagon'` → 出 Scene、emit 出自定义 prim
- `builtin_anchor_nine_names`：内置 4 shape 的 `anchor(rect, name)` 返回 9 个 `RECT_ANCHORS` 名正确世界坐标
- `numeric_angle_generic_for_custom`：注入只实现 `boundaryPoint` 的 shape，`'X.30'` 角度锚点免费可用
- `shape_emits_multiple_primitives`（评审补）：注入一个 emit 出 body + ≥2 个 pin 短线 / 编号的 shape → Scene 含全部 prim（验证 `Iterable<ScenePrimitive>` 对 factory / 复杂 shape 的接口价值）

#### 边界（≥ 2）

- `empty_shapes_option_equals_baseline`：`shapes: {}` / 不传 → 全 Scene 与改造前快照逐字节相等
- `unknown_anchor_returns_undefined_then_throws`：内置 shape `anchor('foobar')` → undefined → `anchorOf` throw 含 shape 名
- `default_rectangle_when_shape_absent`：`node.shape` 缺省 → 回退 rectangle 注册项
- `custom_shape_anchor_only_center`：自定义 shape 只认 `center`，其余 anchor 名 throw Unknown anchor
- `synthetic_layouts_have_rectangle_shapedef`（评审 1）：coordinate 占位 / scope.id bbox 的 synthetic NodeLayout 的 `shapeDef === BUILTIN_SHAPES.rectangle`；被 path 端点 / `.north` anchor 引用时走 rectangle 几何（不因 `shapeDef` 缺失而崩）

#### 错误路径（≥ 2）

- `unknown_shape_throws_with_list`：`node.shape='cloud'` 未注册 → throw 含 sorted 可用名列表（throw-only，不先 warn——见决策细节 #6）
- `unknown_shape_string_in_schema_passes_validation`：schema 层 `shape='cloud'` **通过**（`z.string().min(1)` 接受任意非空），错误延到 compile（验证 schema/compile 职责分层、不在 schema 加 enum 门）

#### 交互（≥ 2）

- `inject_overrides_builtin_emits_warn`：`shapes: { rectangle: custom }` + 自带 `onWarn` → 实际用 custom emit + onWarn 收到 `SHAPE_OVERRIDES_BUILTIN`
- `override_warn_reaches_user_onwarn_in_prod`（评审 4）：同上 + `NODE_ENV=production` + 用户自带 `onWarn` → 覆盖生效且 onWarn **仍**收到（仅默认 dispatcher 在 production 静默）
- `diamond_rotate_via_outer_group`：diamond 带 `rotate` → emit 轴对齐 + 外层 group 旋转，视觉等价改造前 `unrotated` 路径
- `injected_shape_with_margin`：注入 shape + node 有 `outerSep` → boundaryPoint 收 inflated rect（margin generic 路径）

### 依赖现有元素

- `packages/core/src/ir/node.ts` 的 `NODE_SHAPES` / `ValueOf` —— **引用 / 修改**：`NODE_SHAPES` 派生 `BuiltinShapeName`（BUILTIN_SHAPES key）；`NodeShape` 重定义为开放名
- `packages/core/src/geometry/{rect,circle,ellipse,diamond}.ts` ops —— **引用**：4 注册项内部复用纯数学 `anchor` / `boundaryPoint`（数学层不动）
- `packages/core/src/geometry/_transform.ts` 的 `worldToLocal` / `localToWorld` —— **修改**：提升公开导出供第三方 shape 作者
- `packages/core/src/geometry/rect.ts` 的 `Rect` / `RECT_ANCHORS` / `RectAnchor` —— **引用**：shape 接口几何载体 + 内置 anchor 名集
- `packages/core/src/compile/node.ts` 的 `layoutNode` / `boundaryPointOf` / `anchorOf` / `angleBoundaryOf` / `emitNodePrimitives` / `NodeLayout` —— **修改**：switch → 查表；NodeLayout `shape`→`shapeName` + 加必填 `shapeDef`
- `packages/core/src/compile/compile.ts` 的 `CompileOptions` / `compileToScene` / `CompileWarning` / `zeroSizeRectAt` —— **修改**：加 `shapes` + warn code + 解析有效表；synthetic layout（coordinate / scope.id 占位）挂 `shapeDef: BUILTIN_SHAPES.rectangle`
- `packages/core/src/compile/scope.ts` 的 `registerScopeAsLayout` —— **修改**：scope bbox synthetic layout 挂 `shapeDef: BUILTIN_SHAPES.rectangle`
- `packages/core/src/compile/anchor-cache.ts` 的 `computeAnchor` / `resolveAnchor` —— **修改**：错误信息；逻辑不变
- `packages/core/src/primitive` 的 `ScenePrimitive` —— **引用**：emit 返回类型
