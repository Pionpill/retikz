# ADR-04：PatternDefinition 注册面（自定义 pattern motif + 内置 3 降注册项）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第二部分补](../../../plans/v0/v0.2-alpha.8.md) · [tikz-gap-analysis §1 填充](../../../analysis/2026-05-07-tikz-gap-analysis.md) · 本 milestone [ADR-01 ArrowDefinition](./01-arrow-definition.md)（复用 `MarkerPrimitive` emit + emit-in-compile 落点）· [alpha.7 ADR-04 pattern/image](../v0.2-alpha.7/04-pattern-image-deferred.md)（pattern motif 固定 enum，本篇开放）

> **前置依赖**：复用 ADR-01 的 `MarkerPrimitive` 窄子集 + emit-in-compile 落点（compile 调 emit、adapter 物化）。**故排在 ArrowDefinition 之后。**

## 背景

alpha.7 的 pattern（`ir/paint.ts` `PaintSpecSchema` 的 `pattern` 分支）motif 是**固定 enum** `z.enum(['lines','dots','grid'])`，react `paintDefs.tsx` 用 `switch(spec.shape)` 写死渲染（lines = 横线、grid = 横竖、dots = circle）。痛点：用户无法自定义图案 motif（斜纹、砖墙、波点变体…），只能改 core / react。

与 ADR-01 的 arrow 同源——都是"renderer-agnostic 局部坐标 tile 几何"。开放自定义 motif 复用 ADR-01 的 `MarkerPrimitive` emit 契约 + emit-in-compile 落点。

## 选项

### A. `PatternDefinition` + `CompileOptions.patterns`，内置 3 降注册项，emit-in-compile（**推荐**）

```ts
// 不进 IR，运行时注入（plain object，对齐 ShapeDefinition / ArrowDefinition）
export type PatternDefinition = {
  defaultSize?: number;   // tile 周期默认（user units）；用户 pattern.size 覆盖；缺省 8
  emit: (ctx: PatternEmitContext) => Iterable<MarkerPrimitive>;  // 局部 tile 坐标系产 motif 几何
};
export type PatternEmitContext = {
  size: number;           // 解析后 tile 周期（user units）
  color: string;          // motif 主色（CSS 串，缺省 currentColor）
  background?: string;    // tile 背景（缺省透明）
  lineWidth?: number;     // 线 / 网格描边宽；undefined 时各 motif 自定缺省（lines/grid 用 1、dots 半径用 size/5）
  round: (n: number) => number;
};
```

- `pattern.shape`：`z.enum(['lines','dots','grid'])` → `z.string().min(1)`（对齐 alpha.3 node.shape / ADR-01 arrow.shape）；未注册名编译期 throw。
- `CompileOptions.patterns?: Record<string, PatternDefinition>`，有效表 = `{ ...BUILTIN_PATTERNS, ...patterns }`，同名覆盖发 warn（`PATTERN_OVERRIDES_BUILTIN`，仿 `SHAPE_OVERRIDES_BUILTIN`）。
- 内置 3 motif（lines / dots / grid）移到 `patterns/`（仿 `shapes/` / `arrows/`），降注册项无特权。
- **emit-in-compile**（对齐 ADR-01）：compile 的 `createPaintRegistry` 对 pattern 资源查表 + 调 `def.emit` 产 motif `MarkerPrimitive[]` + wrapper 参数（size / background / rotation），一起写进 `SceneResource`（成"已解析 pattern tile"）；adapter 只物化 `<pattern>`。
- 优：开放自定义 motif；与 shape / arrow 注册面同构（第三方可发 `@retikz/patterns-*`）；Scene 自包含 tile 几何、renderer-agnostic（Canvas/PDF adapter 零 pattern 逻辑）。
- 缺：内置 3 迁成 PatternDefinition + 回归；`SceneResource` 加已解析 tile 字段。

### B. emit 在 react adapter 调（查 registry 物化 `<pattern>`）

- 缺：`patterns` 注册表数据流与 shapes / arrows（喂 compile）不一致（要喂 render）；未注册名校验移到 render；Canvas adapter 要各自重调。与本 milestone ADR-01 emit-in-compile 取向不符。否决。

### C. 不开放，保持 alpha.7 固定 enum

- 缺：无法自定义 motif，用户明确要补。否决。

## 决策：A（emit-in-compile，对齐 ADR-01）

理由：

1. **对齐 shape / arrow 注册面成功范式**：第三方发包，core 不为新 motif 改动。
2. **emit-in-compile 一致性**：本 milestone ADR-01 已定 arrow emit 在 compile；pattern 同走 compile，Scene 资源自包含 tile 几何，所有 adapter 纯物化。
3. **复用 ADR-01 `MarkerPrimitive` 窄子集**：motif tile 几何 = `MarkerPrimitive[]`（path/ellipse/rect/group，fill 限 `string | contextStroke`），与 arrow marker 同契约。

## 决策细节

1. **`pattern.shape` 开放 string**：`z.enum` → `z.string().min(1)`；新增 `BuiltinPatternName = ValueOf<typeof PATTERN_SHAPES>` / `PatternShapeName = BuiltinPatternName | (string & {})`（照抄 node.shape / arrow.shape）。`image` 分支不变（非 motif，spec 驱动）。
2. **PatternDefinition / PatternEmitContext 为 TS type**（非 zod，运行时注入不进 IR）。`color` 为 CSS 串（缺省 `currentColor`，主题反应天然——`<defs>` 内 motif 继承 svg color）。
3. **emit-in-compile**：`createPaintRegistry(effectivePatterns, round)`——`resolve` 见 pattern spec 时查 `effectivePatterns[shape]`（未注册 throw、带可用名）、构 `PatternEmitContext`、调 `def.emit` 产 motif → 连同 size / background / rotation 写进 `SceneResource.tile`。gradient / image 资源不变（spec 驱动）。
4. **`SceneResource` 扩**：加可选 `tile?: ResolvedPatternTile`（`{ size, background?, rotation?, motif: MarkerPrimitive[] }`）——仅 pattern 资源有；gradient / image 资源仍只 `{ kind, id, spec }`。
5. **react 物化**：`paintDefs.tsx` 对带 `tile` 的 paint 资源物化 `<pattern width=size height=size patternUnits="userSpaceOnUse" patternTransform=rotate(...)>` + 可选 background rect + motif `MarkerPrimitive[]`（删 motif switch）；gradient / image 分支不变。
6. **内置 3 迁移 + 回归**：lines / dots / grid 迁成 PatternDefinition，物化几何与旧 switch 逐一等价（回归）。
7. **react `<Layout patterns>` prop**：转发给内部 `compileToScene`（对齐 `shapes` / `arrows`）。
8. **dedup 不变**：`createPaintRegistry` 仍按 `JSON.stringify(spec)` 去重；同 pattern spec → 1 资源 1 tile（tile 由 spec + registry 确定，确定性）。
9. **英文 `.describe`**：`pattern.shape` describe 更新为"registered pattern motif name; built-ins + CompileOptions.patterns"。

## 待决策点

- `MarkerPrimitive` motif 是否允许 `group`——允许（复合 motif），同 ADR-01。
- `PatternEmitContext.color` 用 string 还是 `PaintValue`——用 string（pattern motif 是 `<defs>` 内独立元素，`currentColor` 天然继承 svg color，不需 contextStroke sentinel）。

## DSL 表面

```tsx
const cross: PatternDefinition = {
  defaultSize: 10,
  emit: ({ size, color, lineWidth }) => [/* MarkerPrimitive 斜十字 motif */],
};
compileToScene(ir, { patterns: { cross } });
// IR: node.fill = { type:'pattern', shape:'cross', size:10 }
<Node fill={{ type: 'pattern', shape: 'cross' }} />
```

## 影响

- `packages/core/src/ir/paint.ts`：`pattern.shape` `z.enum` → `z.string().min(1)` + `PATTERN_SHAPES` / `BuiltinPatternName` / `PatternShapeName`。
- `packages/core/src/patterns/{types,index}.ts`（新建，仿 `arrows/`）：`PatternDefinition` / `PatternEmitContext` + `BUILTIN_PATTERNS`（lines/dots/grid 迁入）。
- `packages/core/src/primitive/paint.ts`：`SceneResource` 加 `tile?: ResolvedPatternTile`；新 `ResolvedPatternTile` 类型。
- `packages/core/src/compile/paint.ts`：`createPaintRegistry(effectivePatterns, round)` 查表 + 调 emit 产 tile；未注册 throw、同名覆盖 warn。
- `packages/core/src/compile/compile.ts`：`CompileOptions.patterns` + 有效表合并 + 传给 registry；`PATTERN_OVERRIDES_BUILTIN` warn code。
- `packages/react/src/render/paintDefs.tsx`：带 `tile` 的资源物化 motif（删 switch）。
- `packages/react/src/kernel/Layout.tsx`：`<Layout patterns>` prop 转发 compile。
- `packages/core/src/index.ts` / `packages/react/src/index.ts`：公开 `PatternDefinition` / `PatternEmitContext` / `BUILTIN_PATTERNS` / `ResolvedPatternTile`。
- 对外 API：`pattern.shape` 类型从 3 枚举扩为 string（向后兼容，旧字面量仍合法）；内置 3 行为零回归。

## 不在本 ADR 范围

- **ArrowDefinition / MarkerPrimitive**→ [ADR-01](./01-arrow-definition.md)（本篇复用）。
- **image paint**（非 motif，spec 驱动，不进 pattern 注册面）。
- pattern 更多内置 motif（brick / zigzag…）：由第三方注册，core 不内置。

---

## 实现契约（必填）

### Level

`red`

- 动 `ir/paint.ts`（shape 开放）+ 新 `patterns/`（注册面）+ `primitive/paint.ts`（SceneResource.tile）+ `compile/**`（registry + CompileOptions）+ `react/render`（物化）+ `index.ts`
- 取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/paint.ts` | 改 schema | `PaintSpecSchema` pattern 分支 `shape` | `z.enum(['lines','dots','grid'])` → `z.string().min(1)` | 无（必填） | 已注册 pattern motif 名（内置 lines/dots/grid + CompileOptions.patterns）；未注册编译期 throw |

> `PatternDefinition` / `PatternEmitContext` / `ResolvedPatternTile` 为 TS type（`ResolvedPatternTile` 进 Scene、纯数据无函数；`PatternDefinition` 含函数但不进 IR、是 CompileOptions 注入）。**英文 `.describe`**：`pattern.shape` 描述更新为英文。

### 文件 scope

- `packages/core/src/ir/paint.ts`（pattern.shape 开放 string + 名类型）
- `packages/core/src/patterns/{types,index}.ts`（新建：PatternDefinition + BUILTIN_PATTERNS）
- `packages/core/src/primitive/paint.ts`（SceneResource.tile + ResolvedPatternTile）
- `packages/core/src/compile/paint.ts`（createPaintRegistry 查表 + emit 产 tile）
- `packages/core/src/compile/compile.ts`（CompileOptions.patterns + 合并 + warn code）
- `packages/react/src/render/paintDefs.tsx`（物化 tile，删 motif switch）
- `packages/react/src/kernel/Layout.tsx`（patterns prop 转发）
- `packages/core/src/index.ts` / `packages/react/src/index.ts`（公开）
- `packages/core/tests/patterns/builtin-registry.test.ts`（新建）+ `packages/react/tests/render/paintDefs*.test.tsx`（扩 / 回归）

### 测试象限

#### Happy path（≥ 3）

- `builtin_3_via_registry`：内置 lines/dots/grid 经注册表 → Scene 资源含 tile，motif 几何与旧 switch 等价（回归）
- `custom_pattern_register`：注册自定义 PatternDefinition → tile motif 进资源、render 物化
- `shape_open_string`：`pattern.shape:'myMotif'`（已注册）合法编译
- `pattern_dedup`：同 pattern spec 多处 → 1 资源 1 tile

#### 边界（≥ 2）

- `default_size`：缺省 size 8 / dots 半径 size/5 / color currentColor
- `size_background_rotation`：size / background / rotation override 进 tile
- `pattern_coexist_gradient`：同场景 pattern + gradient → resources 不撞、id 各异

#### 错误路径（≥ 2）

- `unregistered_pattern_throws`：`shape:'nope'` → 编译期 throw（带可用名）
- `same_name_override_warn`：`patterns` 覆盖内置名 → `PATTERN_OVERRIDES_BUILTIN` warn
- `motif_rejects_text`：emit 返回含 text 的 primitive → 运行时窄子集栅栏拒（复用 ADR-01 校验）

#### 交互（≥ 2）

- `pattern_currentColor`：motif color 缺省 currentColor → 跟随 svg color
- `custom_motif_multiple_prims`：emit 产多 MarkerPrimitive（背景 + 多 motif 元素）
- `round_trip`：含 pattern fill 的 IR `JSON.parse(JSON.stringify())` 语义等价（shape 名保真）

### 依赖的现有元素

- `packages/core/src/ir/paint.ts` 的 `PaintSpecSchema` pattern 分支 —— **修改**：shape 开放
- `packages/core/src/compile/paint.ts` 的 `createPaintRegistry` —— **修改**：查表 + emit 产 tile
- `packages/core/src/primitive/paint.ts` 的 `SceneResource` —— **修改**：加 tile
- `packages/core/src/arrows/` 的 `ArrowDefinition` / `MarkerPrimitive` 窄子集 + 运行时校验 —— **范式参照 + 复用**（pattern emit 同契约）
- `packages/react/src/render/paintDefs.tsx` 的 pattern switch —— **重写**：物化 tile
