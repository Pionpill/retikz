# ADR-04：PatternDefinition 注册面（自定义 pattern motif + 内置 3 降注册项）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第二部分补](./roadmap.md) · [tikz-gap-analysis §1 填充](../../../../../analysis/tikz-gap-analysis.md) · 本 milestone [ADR-01 ArrowDefinition](./01-arrow-definition.md)（复用 `MarkerPrimitive` emit + emit-in-compile 落点）· [alpha.7 ADR-04 pattern/image](../alpha.7/04-pattern-image-deferred.md)（pattern motif 固定 enum，本篇开放）

> **前置依赖**：复用 ADR-01 的 `MarkerPrimitive` 窄子集 + emit-in-compile 落点（compile 调 emit、adapter 物化），故排在 ArrowDefinition 之后。

## 背景

- alpha.7 的 pattern（`ir/paint.ts` `PaintSpecSchema` 的 `pattern` 分支）motif 是固定 enum `z.enum(['lines','dots','grid'])`，react `paintDefs.tsx` 用 `switch(spec.shape)` 写死渲染（lines = 横线、grid = 横竖、dots = circle）。用户无法自定义图案 motif（斜纹、砖墙、波点变体…），只能改 core / react。
- 与 ADR-01 的 arrow 同源——都是「renderer-agnostic 局部坐标 tile 几何」。开放自定义 motif 复用 ADR-01 的 `MarkerPrimitive` emit 契约 + emit-in-compile 落点。

## 决策：`PatternDefinition` + `CompileOptions.patterns`，内置 3 降注册项，emit-in-compile

`pattern.shape` 由 `z.enum(['lines','dots','grid'])` 开放为 `z.string().min(1)`（对齐 alpha.3 node.shape / ADR-01 arrow.shape）；未注册名编译期 throw。`CompileOptions.patterns?: Record<string, PatternDefinition>`，有效表 = `{ ...BUILTIN_PATTERNS, ...patterns }`，同名覆盖发 warn（`PATTERN_OVERRIDES_BUILTIN`，仿 `SHAPE_OVERRIDES_BUILTIN`）。内置 3 motif（lines / dots / grid）迁进 `core/src/patterns/`（仿 `shapes/` / `arrows/`），降注册项无特权。`PatternDefinition` / `PatternEmitContext` 为 TS type（运行时注入、不进 IR）；签名真源见 `core/src/patterns/types.ts`。

理由：

1. **对齐 shape / arrow 注册面成功范式**：第三方发 `@retikz/patterns-*`，core 不为新 motif 改动。
2. **emit-in-compile 一致性**：本 milestone ADR-01 已定 arrow emit 在 compile；pattern 同走 compile，Scene 资源自包含 tile 几何，所有 adapter 纯物化（Canvas / PDF 零 pattern 逻辑）。
3. **复用 ADR-01 `MarkerPrimitive` 窄子集**：motif tile 几何 = `MarkerPrimitive[]`（path/ellipse/rect/group，fill 限 `string | contextStroke`），与 arrow marker 同契约。

### 设计细节（具体决策）

- **`pattern.shape` 开放 string**：新增 `BuiltinPatternName = ValueOf<typeof PATTERN_SHAPES>` / `PatternShapeName = BuiltinPatternName | (string & {})`（照抄 node.shape / arrow.shape）。`image` 分支不变（非 motif，spec 驱动）。
- **emit-in-compile**：`createPaintRegistry(effectivePatterns, round)`——`resolve` 见 pattern spec 时查表（未注册 throw、带可用名）、构 `PatternEmitContext`（`size` / `color` 缺省 `currentColor` / `background` 缺省透明 / `lineWidth` undefined 时各 motif 自定缺省）、调 `def.emit` 产 motif `MarkerPrimitive[]` → 连同 size / background / rotation 写进 `SceneResource.tile`。gradient / image 资源不变（spec 驱动）。
- **`SceneResource` 扩**：加可选 `tile?: ResolvedPatternTile`（`{ size, background?, rotation?, motif: MarkerPrimitive[] }`，纯数据无函数，进 Scene）——仅 pattern 资源有；gradient / image 资源仍只 `{ kind, id, spec }`。
- **react 物化**：`paintDefs.tsx` 对带 `tile` 的资源物化 `<pattern width=size height=size patternUnits="userSpaceOnUse" patternTransform=rotate(...)>` + 可选 background rect + motif `MarkerPrimitive[]`（删 motif switch）；gradient / image 分支不变。
- **`color` 用 string 而非 `PaintValue`**：pattern motif 是 `<defs>` 内独立元素，`currentColor` 天然继承 svg color，不需 contextStroke sentinel。
- **dedup 不变**：`createPaintRegistry` 仍按 `JSON.stringify(spec)` 去重；同 pattern spec → 1 资源 1 tile（tile 由 spec + registry 确定，确定性）。
- **内置 3 迁移 + 回归**：lines / dots / grid 迁成 PatternDefinition，物化几何与旧 switch 逐一等价。

### 被否决的选项

- **B：emit 在 react adapter 调（查 registry 物化 `<pattern>`）**——`patterns` 注册表数据流与 shapes / arrows（喂 compile）不一致（要喂 render），未注册名校验移到 render，Canvas adapter 要各自重调。与本 milestone ADR-01 emit-in-compile 取向不符。
- **C：不开放，保持 alpha.7 固定 enum**——无法自定义 motif，用户明确要补。

## 不在本 ADR 范围

- **ArrowDefinition / MarkerPrimitive**→ [ADR-01](./01-arrow-definition.md)（本篇复用）。
- **image paint**（非 motif，spec 驱动，不进 pattern 注册面）。
- pattern 更多内置 motif（brick / zigzag…）：由第三方注册，core 不内置。

---

> **实现指针**：level `red`（动 `ir/paint.ts` shape 开放 + 新 `patterns/` 注册面 + `primitive/paint.ts` `SceneResource.tile` + `compile/**` registry + CompileOptions + `react/render` 物化 + 公开导出），向后兼容非 breaking（`pattern.shape` 从 3 枚举扩为 string，旧字面量仍合法；内置 3 行为零回归）。真源以代码为准——`PatternDefinition` / `PatternEmitContext` + `BUILTIN_PATTERNS`（`core/src/patterns/{types,index}.ts`）、`pattern.shape` 开放 + 名类型（`core/src/ir/paint.ts`）、`ResolvedPatternTile` + `SceneResource.tile`（`core/src/primitive/paint.ts`）、`createPaintRegistry` 查表 + emit 产 tile（`core/src/compile/paint.ts`）、`CompileOptions.patterns` + 合并 + warn code（`core/src/compile/compile.ts`）、物化（`react/src/render/paintDefs.tsx`）、`<Layout patterns>`（`react/src/kernel/Layout.tsx`）、公开导出（core+react `index.ts`）。测试在 `core/tests/patterns/`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 待决策点）见本文件 git 历史。

> 🔖 封板压缩 commit `7141a9b0`；压缩前完整施工蓝图 = `git show 7141a9b0^:notes/decisions/core/v0/v0.2/alpha.8/04-pattern-definition.md`。
