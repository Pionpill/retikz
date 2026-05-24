# ADR-01：ArrowDefinition 注册面（自定义 arrow + MarkerPrimitive + 内置 7 降注册项）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第一部分](../../../plans/v0/v0.2-alpha.8.md) · [tikz-gap-analysis §2 Path](../../../analysis/2026-05-07-tikz-gap-analysis.md) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（注册面先例）· [alpha.7 ADR-01 Paint](../v0.2-alpha.7/01-paint-basics.md)（`PaintValue.contextStroke` 颜色继承）· 本 milestone [ADR-02](./02-path-generator-definition.md) / [ADR-03](./03-curve-transform-marking.md)

> **前置依赖**：颜色继承依赖 alpha.7 ADR-01 定下的 `PaintValue.contextStroke`。**故 alpha.8 紧跟 alpha.7、ArrowDefinition 先于 PathGeneratorDefinition 实现**（评审 P2#2）。

## 背景

arrow shape 现状 = **固定 7 枚举** `ARROW_SHAPES`（`packages/core/src/ir/path/arrow.ts:8-16`：normal / open / stealth / diamond / openDiamond / circle / openCircle），定义**散在两处**：

- compile 几何：`compile/path/arrow-geometry.ts:33` `resolveArrowShapeGeometry(spec)` `switch(shape)` 出 `lineContactX` / `tipX` 等，供 `compile/path/shrink.ts` 算 path 收缩。
- render：`react/src/render/arrowMarkers.tsx:15` `renderInner(spec)` `switch(shape)` 出写死 SVG `<path>` / `<circle>`，`ArrowMarker` 包进 `<marker>`。

数据流：IR `arrowDetail.shape`（`z.nativeEnum(ARROW_SHAPES)`，`arrow.ts:43`）→ `shrink.ts` resolve start/end merge → `ArrowEndSpec`（`primitive/path.ts:100`）→ react `ArrowMarker` 渲 `<marker>`。

痛点：① 用户无法自定义箭头；② `<marker>` 是 SVG-only（`scene.ts:9` 明列 marker 为禁项），内置箭头把 SVG 写死在 react 包，是渲染泄漏。

## 选项

### A. `ArrowDefinition` + `CompileOptions.arrows` 注册面，内置 7 降注册项，emit 产 `MarkerPrimitive`（**推荐**）

```ts
// 不进 IR，运行时注入（plain object，对齐 ShapeDefinition / CompileOptions.shapes）
export type ArrowDefinition = {
  baseSize?: number;          // marker 局部基准边长（viewBox 0 0 baseSize baseSize，refY = baseSize/2）；缺省 10
  hollow?: boolean;           // 空心：fill 丢、color 主导描边、启用 lineWidth
  lineContactX: number;       // 线接触点 refX（决定 path shrink + marker refX）
  tipX?: number;              // 尖端 x（shrink 用）；缺省 = baseSize
  defaultLength?: number;     // 缺省 6
  defaultWidth?: number;      // 缺省 6
  emit: (ctx: ArrowEmitContext) => Iterable<MarkerPrimitive>;  // 局部坐标 marker 几何（renderer-agnostic）
};
export type ArrowEmitContext = { stroke: PaintValue; fill: PaintValue; lineWidth: number; round: (n: number) => number };
```

- `arrowDetail.shape`：`z.nativeEnum(ARROW_SHAPES)` → `z.string()`（对齐 alpha.3 开放 node.shape）；未注册名编译期 throw。
- `CompileOptions.arrows?: Record<string, ArrowDefinition>`，有效表 = `{ ...BUILTIN_ARROWS, ...arrows }`，同名覆盖发 warn（仿 `SHAPE_OVERRIDES_BUILTIN`）。
- 内置 7 移到 `arrows/`（仿 `shapes/`），降注册项无特权。
- 优：开放自定义；消除 `<marker>` 渲染泄漏（emit 产 renderer-agnostic primitive，adapter 嵌 marker）；对齐已验证的 shape 注册面。
- 缺：内置 7 要逐一迁成 ArrowDefinition + 回归校验。

### B. 只把 shape 枚举开成 string，渲染仍写死在 react

- 缺：渲染泄漏未解、无法真正自定义（react 不认识新 shape）。半吊子，否决。

### C. emit 返回完整 `ScenePrimitive`

- 缺：`ScenePrimitive` 含 `TextPrim` / 外部 `fillRef` / `clipRef` / `arrowStart/End`，放进 `<marker>` 会递归引用 marker / clip / 文本布局，复杂度失控（评审 P1#2 反对）。否决——用窄子集 `MarkerPrimitive`。

## 决策：A（emit 用 `MarkerPrimitive` 窄子集）

理由：

1. **对齐 Shape Registry 成功范式**：第三方可发 `@retikz/arrows-xxx`，core 不为新箭头改动。
2. **消除渲染泄漏**：emit 产 renderer-agnostic primitive，`<marker>` 物化在 adapter，满足 `scene.ts` 契约。
3. **`MarkerPrimitive` 窄子集兜住复杂度**（评审 P1#2）：禁 text / 外部资源引用 / arrow 字段，杜绝递归。
4. **颜色继承复用 alpha.7**：`PaintValue.contextStroke` 已定，不悬空（评审 P2#1）。

## 决策细节

1. **`MarkerPrimitive` 窄子集**：仅 marker-local `path` / `ellipse` / `rect` / `group`；`fill` 收窄到 `string | { kind:'contextStroke' }`（无 `resourceRef` / 外部资源）；禁 `text`、禁 `arrowStart/End`、禁 `clipRef`。
2. **颜色继承**：`ArrowEmitContext.stroke` 无 override 时 = `{ kind:'contextStroke' }`（alpha.7 `PaintValue`）；adapter 映射 `context-stroke`，保 `currentColor` / `var()` 主题反应。
3. **compile 查表算 shrink**：`arrow-geometry` / `shrink` 不再 `switch(shape)`，改读 `def` 的 `lineContactX` / `tipX` / `defaultLength` 等。
4. **emit 在 compile 调（对齐 `ShapeDefinition`，修正原 adapter-emit 设计）**：`def.emit(ctx)` 在 **compile** 期调（与 `ShapeDefinition.emit` 同位——shape 几何也在 compile 产 ScenePrimitive 进 Scene），产 `MarkerPrimitive[]` + 解析后的 wrapper 参数（`baseSize` / `refX`=hollow 已减 lineWidth/2 / `markerWidth`=length / `markerHeight`=width / `opacity`），一起写进 Scene 的 `ArrowEndSpec`（成"已解析 marker 描述"，渲染无关）。adapter（react / canvas / pdf）只**物化**：react 把 `ArrowEndSpec` 的 `MarkerPrimitive[]` 嵌进 `<marker viewBox refX refY=baseSize/2 markerWidth markerHeight orient="auto-start-reverse" markerUnits="strokeWidth">`，不再 `switch`、不再调 emit、不需要 arrows 注册表。`arrows` 像 `shapes` 一样**只**喂 `compileToScene`（react `<TikZ>` 加 `arrows` prop 转发给内部 compile）。
5. **视觉字段分工**：`scale` / `length` / `width` / `opacity` framework（compile）统一处理；`hollow` / `lineWidth` / 几何交给 `def`。
6. **内置 7 迁移 + 回归**：逐一迁成 ArrowDefinition，渲染 / shrink 与旧 switch 逐一等价（快照不变）。
7. **英文 `.describe`**：`shape` 字段 describe 更新为"registered arrow name; built-ins + CompileOptions.arrows"。

## 已决策（实现期拍板）

- **emit 落点 = compile**（非原文的 react adapter）：对齐 `ShapeDefinition.emit`，自定义 arrow 只传 `compileToScene`，Canvas/PDF adapter 零 arrow 逻辑。`ArrowEndSpec` 升级为"已解析 marker 描述"（见决策细节 #4）。
- `MarkerPrimitive` **允许 `group`**（嵌套 transform，复合箭头），但禁再套 marker / text。
- `ArrowEmitContext` **不传 `hollow`**；`def` 自带 `hollow` 标志，framework 据此丢 fill / 启用 lineWidth / 对 `lineContactX` 减 `lineWidth/2`。
- 同名覆盖内置 = **warn**（`ARROW_OVERRIDES_BUILTIN`，对齐 `SHAPE_OVERRIDES_BUILTIN`，不 error）。

## DSL 表面

```tsx
// 注册自定义箭头
const myArrow: ArrowDefinition = { lineContactX: 2, emit: ({ stroke }) => [/* MarkerPrimitive */] };
compileToScene(ir, { arrows: { myTip: myArrow } });
// IR: arrowDetail.shape 现接受任意已注册名
<Path arrow="->" arrowDetail={{ shape: 'myTip' }} />
```

## 影响

- `packages/core/src/ir/path/arrow.ts`：`shape` `z.nativeEnum` → `z.string()`。
- `packages/core/src/arrows/`（新建，仿 `shapes/`）：`ArrowDefinition` 类型 + `BUILTIN_ARROWS`（7 内置迁入）。
- `packages/core/src/primitive/`（新 `MarkerPrimitive` 类型，可挂 scene.ts 或独立）。
- `packages/core/src/compile/compile.ts`：`CompileOptions.arrows` + 有效表合并 + 同名 warn。
- `packages/core/src/compile/path/{arrow-geometry,shrink}.ts`：查表替 switch；**新增**：compile 调 `def.emit` 产 `MarkerPrimitive[]` + wrapper 参数，写进 `ArrowEndSpec`。
- `packages/core/src/primitive/path.ts`：`ArrowEndSpec` 升级为"已解析 marker 描述"——加 `marker: MarkerPrimitive[]`（已解析内部几何）+ `baseSize` / `refX` / `markerWidth` / `markerHeight`（wrapper 参数）；`shape` 保留作标识。
- `packages/react/src/render/arrowMarkers.tsx`：删 switch，改**物化** `ArrowEndSpec.marker`（嵌进 `<marker>`），不调 emit、不需 arrows 表。
- `packages/react/src/kernel/Layout.tsx`：`<TikZ>` 加 `arrows` prop，转发给内部 `compileToScene`（对齐既有 `shapes` prop）。
- `packages/core/src/index.ts` / `packages/react/src/index.ts`：公开 `ArrowDefinition` / `MarkerPrimitive`。
- 对外 API：`arrowDetail.shape` 类型从 7 枚举扩为 string（向后兼容，旧字面量仍合法）；内置 7 行为零回归。

## 不在本 ADR 范围

- **PathGeneratorDefinition**→ [ADR-02](./02-path-generator-definition.md)；**out/in·self-loop / 路径变换 / marking**→ [ADR-03](./03-curve-transform-marking.md)。
- **`PaintValue` / `contextStroke` 定义**→ alpha.7 ADR-01（本篇消费，不定义）。

---

## 实现契约（必填）

### Level

`red`

- 动 `ir/path/arrow.ts`（shape 开放）+ 新 `arrows/`（注册面）+ `primitive/`（MarkerPrimitive）+ `compile/**`（查表 + CompileOptions）+ `react/render`（emit）+ `index.ts`
- 取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/path/arrow.ts` | 改 schema | `ArrowEndDetailSchema.shape` | `z.nativeEnum(ARROW_SHAPES)` → `z.string()` | 缺省 stealth | 已注册箭头名（内置 7 + CompileOptions.arrows）；未注册编译期 throw |

> `ArrowDefinition` / `ArrowEmitContext` / `MarkerPrimitive` 为 TS type（非 zod，运行时注入不进 IR）。**英文 `.describe`**：`shape` 字段描述更新为英文"registered arrow name"。

### 文件 scope

- `packages/core/src/ir/path/arrow.ts`（shape 开放 string）
- `packages/core/src/arrows/{types,index}.ts`（新建：`ArrowDefinition` + `BUILTIN_ARROWS`）
- `packages/core/src/primitive/marker.ts`（新建：`MarkerPrimitive` 窄子集）
- `packages/core/src/compile/compile.ts`（`CompileOptions.arrows`）
- `packages/core/src/compile/path/{arrow-geometry,shrink}.ts`（查表替 switch + compile 调 `def.emit` 产 marker 写进 `ArrowEndSpec`）
- `packages/core/src/primitive/path.ts`（`ArrowEndSpec` 升级为已解析 marker 描述：加 `marker: MarkerPrimitive[]` + `baseSize`/`refX`/`markerWidth`/`markerHeight`）
- `packages/react/src/render/arrowMarkers.tsx`（删 switch，物化 `ArrowEndSpec.marker`）
- `packages/react/src/kernel/Layout.tsx`（`<TikZ>` 加 `arrows` prop 转发内部 compile）
- `packages/core/src/index.ts` / `packages/react/src/index.ts`（公开）
- `packages/core/tests/arrows/builtin-registry.test.ts`（新建）+ `packages/react/tests/render/arrowMarkers.test.tsx`（扩 / 回归）

### 测试象限

#### Happy path（≥ 3）

- `builtin_7_via_registry`：内置 7 经注册表渲染 + shrink 与旧 switch 逐一等价（回归快照）
- `custom_arrow_register`：注册自定义 ArrowDefinition → 渲染 + shrink 正确
- `shape_open_string`：`arrowDetail.shape: 'myTip'`（已注册）合法编译
- `marker_renderer_agnostic`：core 输出无 `<marker>`（ArrowEndSpec 渲染无关），marker 在 react 物化

#### 边界（≥ 2）

- `hollow_linewidth`：空心箭头 lineWidth / context-stroke 正确
- `scale_length_width`：scale 乘 length/width；framework 统一处理
- `start_end_override`：`<->` 起末端 def 各自 resolve

#### 错误路径（≥ 2）

- `unregistered_shape_throws`：`shape: 'nope'` → 编译期 throw
- `same_name_override_warn`：`arrows` 覆盖内置名 → warn（不静默）
- `marker_primitive_rejects_text`：emit 返回含 text 的 primitive → 类型 / 运行时拒（窄子集）

#### 交互（≥ 2）

- `context_stroke_theme`：默认箭头 stroke = `contextStroke` → `var()` / `currentColor` 主题反应不冻结
- `custom_arrow_with_path_stroke`：自定义箭头继承 path stroke 颜色
- `arrow_with_shrink`：自定义 lineContactX → path 端点收缩量正确（线不穿出）

### 依赖的现有元素

- `packages/core/src/ir/path/arrow.ts` 的 `ARROW_SHAPES` / `ArrowEndDetailSchema` —— **修改**：shape 开放、内置名成注册键
- `packages/core/src/compile/path/{arrow-geometry,shrink}.ts` —— **修改**：查表替 switch
- `packages/react/src/render/arrowMarkers.tsx` 的 `renderInner` / `ArrowMarker` —— **重写**：def.emit
- `packages/core/src/shapes/{types,index}.ts`（`ShapeDefinition` / `BUILTIN_SHAPES` / `CompileOptions.shapes`）—— **范式参照**：ArrowDefinition 同构
- alpha.7 `PaintValue.contextStroke`（`primitive/scene.ts`）—— **引用**：颜色继承
