# ADR-01：ArrowDefinition 注册面（自定义 arrow + MarkerPrimitive + 内置 7 降注册项）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第一部分](./roadmap.md) · [tikz-gap-analysis §2 Path](../../../../../analysis/tikz-gap-analysis.md) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（注册面先例）· [alpha.7 ADR-01 Paint](../v0.2-alpha.7/01-paint-basics.md)（`PaintValue.contextStroke` 颜色继承）· 本 milestone [ADR-02](./02-path-generator-definition.md) / [ADR-03](./03-curve-transform-marking.md)

## 背景 / 约束

- arrow shape 原为**固定 7 枚举** `ARROW_SHAPES`（normal / open / stealth / diamond / openDiamond / circle / openCircle），定义散在两处：compile 几何（`switch(shape)` 出 `lineContactX` / `tipX` 算 path 收缩）+ react render（`switch(shape)` 出写死 SVG `<path>` / `<circle>` 包进 `<marker>`）。用户无法自定义箭头。
- `<marker>` 是 SVG-only（`core/src/primitive/scene.ts` 明列 marker 为禁项），内置箭头把 SVG 写死在 react 包 = 渲染泄漏，违反「core 不假定渲染端」。
- 颜色继承依赖 alpha.7 ADR-01 的 `PaintValue.contextStroke`，故 ArrowDefinition 紧跟 alpha.7、先于 PathGeneratorDefinition 实现。

## 决策：`ArrowDefinition` + `CompileOptions.arrows` 注册面，emit 产 `MarkerPrimitive` 窄子集，内置 7 降注册项

`arrowDetail.shape` 由 `z.nativeEnum(ARROW_SHAPES)` 开放为 `z.string()`（对齐 alpha.3 开放 node.shape）；未注册名编译期 throw。`CompileOptions.arrows?: Record<string, ArrowDefinition>`，有效表 = `{ ...BUILTIN_ARROWS, ...arrows }`，同名覆盖发 warn（`ARROW_OVERRIDES_BUILTIN`，仿 `SHAPE_OVERRIDES_BUILTIN`，不 error）。内置 7 迁进 `core/src/arrows/`（仿 `shapes/`），降注册项无特权。`ArrowDefinition` / `ArrowEmitContext` 为 TS type（运行时注入、不进 IR）；签名真源见 `core/src/arrows/types.ts`。

理由：

1. **对齐 Shape Registry 成功范式**：第三方可发 `@retikz/arrows-*`，core 不为新箭头改动。
2. **消除渲染泄漏**：emit 产 renderer-agnostic primitive，`<marker>` 物化在 adapter，满足 `scene.ts` 契约。
3. **窄子集兜住复杂度**：`MarkerPrimitive` 禁 text / 外部资源引用 / arrow 字段，杜绝 marker→clip→text 递归引用。
4. **颜色继承复用 alpha.7**：默认 stroke = `{ kind:'contextStroke' }`，保 `currentColor` / `var()` 主题反应。

### 设计细节（具体决策）

- **`MarkerPrimitive` 窄子集**（`core/src/primitive/marker.ts`）：仅 marker-local `path` / `ellipse` / `rect` / `group`；`fill` 收窄到 `string | { kind:'contextStroke' }`（无 `resourceRef` / 外部资源）；禁 `text`、`arrowStart/End`、`clipRef`。允许 `group`（嵌套 transform 做复合箭头），但禁再套 marker / text。
- **emit 落点 = compile**（对齐 `ShapeDefinition.emit`，shape 几何也在 compile 产 ScenePrimitive）：compile 期调 `def.emit(ctx)` 产 `MarkerPrimitive[]` + 解析后 wrapper 参数（`baseSize` / `refX` / `markerWidth` / `markerHeight` / `opacity`），写进 Scene 的 `ArrowEndSpec`（升级为「已解析 marker 描述」，渲染无关）。adapter 只**物化**：react 把 `ArrowEndSpec.marker` 嵌进 `<marker viewBox refX refY=baseSize/2 markerWidth markerHeight orient="auto-start-reverse" markerUnits="strokeWidth">`，不再 `switch`、不调 emit、不需 arrows 注册表。`arrows` 像 `shapes` 一样只喂 `compileToScene`（react `<Layout>` 加 `arrows` prop 转发内部 compile），Canvas / PDF adapter 零 arrow 逻辑。
- **视觉字段分工**：`scale` / `length` / `width` / `opacity` 由 framework（compile）统一处理；`hollow` / `lineWidth` / 几何交给 `def`。`ArrowEmitContext` 不传 `hollow`——`def` 自带 `hollow` 标志，framework 据此丢 fill / 启用 lineWidth / 对 `lineContactX` 减 `lineWidth/2`。
- **compile 查表算 shrink**：`arrow-geometry` / `shrink` 不再 `switch(shape)`，改读 `def` 的 `lineContactX` / `tipX` / `defaultLength` 等。
- **颜色继承**：`ArrowEmitContext.stroke` 无 override 时 = `{ kind:'contextStroke' }`（alpha.7 `PaintValue`）；adapter 映射 `context-stroke`。
- **内置 7 迁移 + 回归**：逐一迁成 ArrowDefinition，渲染 / shrink 与旧 switch 逐一等价（快照不变）。

### 被否决的选项

- **B：只把 shape 枚举开成 string、渲染仍写死 react**——渲染泄漏未解、react 不认识新 shape 无法真正自定义，半吊子。
- **C：emit 返回完整 `ScenePrimitive`**——`ScenePrimitive` 含 `TextPrim` / 外部 `fillRef` / `clipRef` / `arrowStart/End`，放进 `<marker>` 会递归引用 marker / clip / 文本布局，复杂度失控。改用窄子集 `MarkerPrimitive`。

## 不在本 ADR 范围

- **PathGeneratorDefinition**→ [ADR-02](./02-path-generator-definition.md)；**out/in·self-loop / 路径变换 / marking**→ [ADR-03](./03-curve-transform-marking.md)。
- **`PaintValue` / `contextStroke` 定义**→ alpha.7 ADR-01（本篇消费，不定义）。

---

> **实现指针**：level `red`（动 `ir/path/arrow.ts` shape 开放 + 新 `arrows/` 注册面 + `primitive/marker.ts` + `compile/**` 查表 + `react/render` 物化 + 公开导出）、向后兼容非 breaking（`arrowDetail.shape` 从 7 枚举扩为 string，旧字面量仍合法；内置 7 行为零回归）。真源以代码为准——`ArrowDefinition` / `ArrowEmitContext`（`core/src/arrows/types.ts`）、`BUILTIN_ARROWS`（`core/src/arrows/index.ts`）、`MarkerPrimitive` 窄子集（`core/src/primitive/marker.ts`）、`ArrowEndSpec` 升级（`core/src/primitive/path.ts`）、`CompileOptions.arrows` + emit 调用（`core/src/compile/compile.ts`、`core/src/compile/path/{arrow-geometry,shrink}.ts`）、物化（`react/src/render/arrowMarkers.tsx`）、`<Layout arrows>`（`react/src/kernel/Layout.tsx`）。测试在 `core/tests/arrows/`、`react/tests/render/arrowMarkers*`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `7141a9b0`；压缩前完整施工蓝图 = `git show 7141a9b0^:notes/decisions/core/v0/v0.2/v0.2-alpha.8/01-arrow-definition.md`。
