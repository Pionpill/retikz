# v0.2.0-alpha.8 实施待办：Path / Step 能力完善

> 写于 2026-05-23。v0.2「能力补全阶段」第二段（gap §2 Path + §3 Step；Path 与 Step 同体，一段处理）。五块能力，**两块大的（自定义 arrow / 路径生成器注册面）拆独立 ADR、固定实现顺序**，其余三块（out/in·self-loop / 路径变换 / 中段 marking）为低成本搭车项。
>
> 关联：[`v0.2 总计划 §alpha.8 设计预想`](../roadmap.md) · [`tikz-gap-analysis §2 Path / §3 Step`](../../../../../analysis/tikz-gap-analysis.md) · 前一段 [`v0.2-alpha.7.md`](../v0.2-alpha.7/roadmap.md)（自定义 arrow 颜色继承复用本段前置 Paint）
>
> **依赖**：自定义 arrow 依赖 alpha.7 Paint 的「继承 path 描边」sentinel；其余四块复用既有机器。**故 alpha.8 紧跟 alpha.7。**
>
> **贯穿约束（评审 P1）**：IR 100% JSON 可序列化——路径生成器 `params` 限 `JsonObjectSchema`（禁 function / `z.any`）；ScenePrimitive 渲染无关——arrow marker 几何用 renderer-agnostic primitive，`<marker>` 物化只在 adapter。

## 背景

### 自定义 arrow（关键能力）

arrow shape 现状是**固定 7 枚举** `ARROW_SHAPES`（`packages/core/src/ir/path/arrow.ts:8-16`：normal / open / stealth / diamond / openDiamond / circle / openCircle），定义**散在两处**：

- compile 几何：`compile/path/arrow-geometry.ts:33` `resolveArrowShapeGeometry(spec)` —— `switch(spec.shape)` 出 `lineContactX` / `tipX` / `defaultLength` 等，供 `compile/path/shrink.ts` 算 path 收缩（避免线穿出箭头）。
- render：`react/src/render/arrowMarkers.tsx:15` `renderInner(spec)` —— `switch(spec.shape)` 出写死的 SVG `<path>` / `<circle>`，`ArrowMarker` 包进 `<marker>`。

数据流：IR `arrowDetail.shape`（`z.nativeEnum(ARROW_SHAPES)`，`arrow.ts:43`）→ compile `shrink.ts` resolve start/end merge → `ArrowEndSpec`（`primitive/path.ts:100`，挂 `PathPrim.arrowStart/arrowEnd`）→ react `ArrowMarker` 渲 `<marker>`。

痛点：用户无法自定义箭头。且 `<marker>` 是 SVG-only（`scene.ts:9` 明列 marker 为禁项）——现内置箭头把 SVG 写死在 react 包，是个渲染泄漏。

### 路径生成器注册面

step kind 现状是 **discriminatedUnion('kind')** 11 种（`ir/path/step.ts:287-299`：move/line/fold/cycle/curve/cubic/bend/arc/circlePath/ellipsePath/rectangle），全 core 写死。无外部注入口。

痛点：parabola / sin-cos / 二次方程曲线等"曲线 step"想扩展，只能改 core。需要一个 `ShapeDefinition` / `CompileOptions.shapes`（`compile/compile.ts:119`）那样的**注册注入面**，外部包注册曲线生成器。

### out/in 曲线 + self-loop

`bend` step（`ir/path/step.ts:161-178`）现支持 `bendDirection`（left/right）+ `bendAngle`，编译成 cubic 近似。缺任意出 / 入射角、缺自环（start = end node 的 self-loop，bend 画不出）。

### 路径整体变换

`PathSchema`（`ir/path/path.ts`）**无 transform 字段**——单 path 想旋转 / 缩放须包 `<Scope transforms>`。而 Node 有 rotate / scale（gap §1 ✅，经外层 `GroupPrim` 施加）。变换机器现成：`GroupPrim.transforms`（`primitive/group.ts:45-52`，translate/rotate/scale）+ `applyTransformChain`（compile）。

### 中段 marking

沿路径 t 处放图形（TikZ markings）。**几何现成**：`geometry/segment.ts` 给全 7 段类型（line/quad/cubic/fold/arc/ellipseArc/circle/ellipse）实现了 `*SegmentSample(seg, t) → { point, tangent }`（闭式 O(1)），`sloped` step label 已在用（`compile/path/label.ts:108` `atan2(tangent)`）。

痛点：现只能放文字 label。放图形（如边中点的方向箭头）缺。但点 + 切线复用 segment.ts，**低成本**。

---

## 实现顺序（评审 P2#2）

两注册面都是 public API surface，不堆一起改。固定顺序：

1. **自定义 arrow（ArrowDefinition）** —— 依赖 alpha.7 Paint 颜色继承，先行。
2. **路径生成器注册面（PathGeneratorDefinition）** —— 独立 surface，与 ArrowDefinition 互不阻塞。
3. **搭车项**（out/in·self-loop / 路径变换 / marking）—— 复用既有机器，随时插入，不阻塞两注册面。

---

## 第一部分：自定义 arrow（ArrowDefinition）

### 设计（仿 `ShapeDefinition` / `CompileOptions.shapes`）

```ts
// 不进 IR，走 CompileOptions.arrows 注入（plain object，factory 友好；对齐 shapes/types.ts）
export type ArrowDefinition = {
  /** marker 局部基准边长（viewBox 0 0 baseSize baseSize，refY = baseSize/2）；缺省 10 */
  baseSize?: number;
  /** 空心标志：true → fill 丢弃、color 主导描边、启用 lineWidth；缺省 false */
  hollow?: boolean;
  /** 线接触点 refX：线在局部坐标接触箭头尾 / 凹口的 x（决定 path shrink + marker refX） */
  lineContactX: number;
  /** 尖端 x（shrink 用）；缺省 = baseSize */
  tipX?: number;
  /** 默认 length / width（user units）；缺省 6 */
  defaultLength?: number;
  defaultWidth?: number;
  /** 渲染：在局部 baseSize 坐标系产 marker 几何——renderer-agnostic 的 **窄子集 `MarkerPrimitive`**（评审 P1#2，非完整 ScenePrimitive） */
  emit: (ctx: ArrowEmitContext) => Iterable<MarkerPrimitive>;
};

export type ArrowEmitContext = {
  /** resolve 后的描边色（已应用 color override / path 继承 sentinel；见颜色继承） */
  stroke: string;
  /** resolve 后的填充色（实心用；空心忽略） */
  fill: string;
  /** 空心描边粗细 */
  lineWidth: number;
  round: (n: number) => number;
};
```

**`MarkerPrimitive` 窄子集（评审 P1#2）**：`emit` **不**返回完整 `ScenePrimitive`——后者含 `TextPrim` / 外部 `fillRef` / `clipRef` / `arrowStart/End`，放进 `<marker>` 会让 marker 递归引用 marker / clip / 文本布局，复杂度失控。限定为 marker-local 几何：

```ts
// marker 局部几何：path / ellipse / rect / group；禁 text、禁外部资源引用、禁 arrow 字段
export type MarkerPrimitive =
  | MarkerPathPrim          // path：fill 仅 string | { kind:'contextStroke' }，无 arrowStart/End、无 resourceRef
  | MarkerEllipsePrim
  | MarkerRectPrim
  | { type: 'group'; transforms?: Array<Transform>; children: Array<MarkerPrimitive> };
// 各 Marker*Prim = 对应 Prim 去掉 arrow / 外部资源引用，fill 收窄到 string | { kind:'contextStroke' }
```

### 三处配套改动（对齐 alpha.3 开放 node.shape 先例）

| 改动 | 文件 | 形态 |
| --- | --- | --- |
| `arrowDetail.shape` 开放为 string | `ir/path/arrow.ts:43` | `z.nativeEnum(ARROW_SHAPES)` → `z.string()`；未注册名编译期 throw |
| `CompileOptions.arrows` 注入 | `compile/compile.ts:94` | `arrows?: Record<string, ArrowDefinition>`；有效表 = `{ ...BUILTIN_ARROWS, ...arrows }`，同名覆盖发 warn（仿 `SHAPE_OVERRIDES_BUILTIN`） |
| 内置 7 降注册项 | 新 `arrows/`（仿 `shapes/`） | `BUILTIN_ARROWS: Record<string, ArrowDefinition>`；7 内置无特权 |
| compile 查表算 shrink | `compile/path/arrow-geometry.ts` / `shrink.ts` | 不再 `switch(shape)`，改读 `def` 的 `lineContactX` / `tipX` 等 |
| render 用 def.emit | `react/src/render/arrowMarkers.tsx` | 不再 `switch(shape)`，把 `def.emit(ctx)` 的 primitive 塞进 `<marker>` |

### 颜色继承（核心难点，依赖 alpha.7 Paint）

内置箭头现用 `fill="context-stroke"`（`arrowMarkers.tsx:17,19`）继承 path 描边、保住 `currentColor` / `var()` 主题反应。`def.emit` 产 primitive 若 compile 期 resolve 颜色会**冻结主题反应**。

解法：复用 alpha.7 定稳的 `PaintValue` 里的 `{ kind: 'contextStroke' }`（评审 P2#1：alpha.7 ADR-01 已把 `PaintValue` 词汇表定下，不悬空）——`ArrowEmitContext.stroke` 无 override 时取该值、`MarkerPrimitive.fill` 也用它；react adapter 映射成 `context-stroke`（各 adapter 等价物）。emit 产的 primitive 不冻结主题反应。**这是 alpha.7 → alpha.8 的天然耦合点、依赖 alpha.7 先定 `PaintValue`。**

### renderer-agnostic（评审 P1）

`def.emit` 返回 `Iterable<ScenePrimitive>`（path / ellipse / rect prim，局部 marker 坐标）；**adapter** 把它们嵌进 `<marker>`。core / IR 不出现 `<marker>`（满足 `scene.ts` 契约）；`ArrowEndSpec` 仍是渲染无关的 `{ shape, 视觉字段 }`，marker 物化在 react。

---

## 第二部分：路径生成器注册面（PathGeneratorDefinition）

### 设计

```ts
// 不进 IR，走 CompileOptions.pathGenerators 注入
export type PathGeneratorDefinition = {
  /** 参数校验：输出必须 JSON-safe（评审 P1#4）——类型约束到 `ZodType<IRJsonObject>`，配 `definePathGenerator` 注册时元校验 */
  paramsSchema: ZodType<IRJsonObject>;
  /** 哪些 params 是 Target（compile 先 resolve 成世界坐标）；**仅顶层 key**（评审 P2#3：嵌套 / 数组内 Target 不支持，须放顶层；JSON-Pointer 留未来扩展） */
  targetParams?: Array<string>;
  /** 生成：起点 from（世界系）+ 终点 to（若带 target）+ 解析后 params → path 命令段 */
  generate: (ctx: PathGeneratorContext) => Array<PathCommand>;
};

export type PathGeneratorContext = {
  from: Position;                 // 当前游标（世界系）
  to?: Position;                  // step 带 target 时 resolve 后的终点
  params: Record<string, unknown>;       // paramsSchema 校验后
  resolvedTargets: Record<string, Position>;  // targetParams resolve 后
  round: (n: number) => number;
};
```

**注册辅助 `definePathGenerator`（评审 P1#4）**：`ZodType<IRJsonObject>` 在 TS 层约束了输出类型，但挡不住实现者传 `z.any()` / `z.function()`。故提供工厂 `definePathGenerator(def)`——注册时对 `paramsSchema` 跑元校验（确认其 schema 形态不含 function / 非 JSON 类型，输出 JSON-safe），不合规即抛。外部包用它注册，而非裸对象。

### IR：新增 generator step kind

```ts
// ir/path/step.ts —— discriminatedUnion 加一支
export const GeneratorStepSchema = z.object({
  kind: z.literal('generator'),
  name: z.string().min(1).describe('Registered path generator name; unregistered → compile throw'),
  to: TargetSchema.optional().describe('Optional destination (passed to generator as ctx.to)'),
  params: JsonObjectSchema.describe('Generator params; JSON-only (IR serializable). External paramsSchema refines this.'),
  label: StepLabelSchema.optional(),
});
// StepSchema union 追加 GeneratorStepSchema
```

### compile

- 解析 `{ kind:'generator', name, to?, params }`：查 `CompileOptions.pathGenerators[name]`（未注册 throw）。
- `paramsSchema.parse(params)`（外部校验，只在 JSON 子树）。
- `targetParams` 列出的 params 先经 target resolve（**那道坎**：如 `parabola bend (c)` 的 `c` 是 Target）→ `resolvedTargets`。**仅顶层 key**（评审 P2#3）：嵌套 / 数组内的 Target 不解析，须放 params 顶层。
- 调 `generate(ctx)` 得 `Array<PathCommand>`，splice 进 path 命令流。

### params JSON 约束（评审 P1#3）

`JsonObjectSchema` = 递归 JSON 值（string/number/boolean/null/array/object），**禁** `z.any` / `z.unknown` / function。外部 generator 的 `paramsSchema` 只能在这棵 JSON 子树上 refine。守住「IR 100% JSON 可序列化」。

---

## 第二部分补：pattern 自定义 motif（PatternDefinition）

> alpha.7 的 pattern（[ADR-04](../v0.2-alpha.7/04-pattern-image-deferred.md)）motif 是**固定 enum**（`lines` / `dots` / `grid`，react 写死渲染）。开放自定义 motif 与 ArrowDefinition 同源——都是"renderer-agnostic 局部坐标 tile 几何"，**复用 alpha.8 的 `MarkerPrimitive` emit 契约**，故放本段。

- IR：`PaintSpec` 的 `pattern.shape` 从 enum 开放为 `string`（同 `node.shape` / `arrow.shape` / generator name 开放）；未注册名编译期 throw。
- 注入：`CompileOptions.patterns?: Record<string, PatternDefinition>`；内置 3 motif（lines/dots/grid）降注册项（无特权，同内置 shape / arrow）。
- `PatternDefinition`：
  ```ts
  export type PatternDefinition = {
    /** tile 周期默认（user units）；用户 pattern.size 覆盖 */
    defaultSize?: number;
    /** tile 几何：局部 tile 坐标系产 MarkerPrimitive（与 ArrowDefinition.emit 同窄子集、同 contextStroke 颜色继承） */
    emit: (ctx: PatternEmitContext) => Iterable<MarkerPrimitive>;
  };
  export type PatternEmitContext = { size: number; color: PaintValue; background?: string; lineWidth: number; round: (n: number) => number };
  ```
- compile：**零改动**——`createPaintRegistry`（alpha.7）已按 JSON 去重任意 `PaintSpec`，pattern 自定义 motif 自动进资源表 + 拿 resourceRef；只是 react 物化 `<pattern>` 时改为查 `{ ...BUILTIN_PATTERNS, ...patterns }` 取 `def.emit` 而非写死 switch。
- 颜色继承：`PatternEmitContext.color` 复用 `PaintValue`（含 `currentColor`），与 arrow 同。

**实现顺序**：排在 ArrowDefinition 之后（共用 `MarkerPrimitive` + emit 契约，ArrowDefinition 先把契约跑通，pattern 复用）。可作为 ArrowDefinition ADR 的延伸切片，或独立 ADR-04（alpha.8）。

---

## 第三部分：out/in 曲线 + self-loop（搭车）

- `bend` step 加 `outAngle?` / `inAngle?` / `looseness?`（或新 `to` 风格 step；ADR 二选一）。编译成 cubic：控制点由出 / 入射角 + looseness 算（标准 TikZ 公式）。
- **self-loop**：`from == to`（同 node）退化——给默认环大小 + 用 out/in 角撑开（bend 画不出，这是 out/in 最大价值场景：状态机自环）。
- 复用现有 bend → cubic 编译路径（`compile/path`）。

---

## 第四部分：路径整体变换（搭车）

- `PathSchema` 加 `rotate?` / `scale?`（对齐 Node 的 transform 字段）。
- compile：把该 path 解析出的 primitive 包进 `GroupPrim`（`primitive/group.ts`），写 `transforms`（复用 Scope transform 机器）。
- **旋转支点**（ADR 拍）：path 包围盒中心 / 世界原点 / 可配——倾向包围盒中心（直觉，对齐 Node 绕自身中心）。

---

## 第五部分：中段 marking（搭车，低成本）

- IR：step / path 加 `marks?`：`Array<{ pos, mark, ... }>`（`pos` 0..1 或关键字，复用 label 的 `tForLabelPosition`；`mark` = 放什么——箭头 marker / 小图形）。
- compile：对每个 mark 调 `*SegmentSample(seg, pos)` 取 `{ point, tangent }`（复用 `segment.ts`），产一个按 tangent 定向的 marker primitive（复用 arrow marker 系统）。
- **不做**：真弧长参数化（`pos` 按段参数，沿用 label 同款便宜模型）。

---

## 实现拆分

每片一个语义闭环、独立可验收、单独 commit（commit 前按用户当次确认逐条执行）。顺序见上「实现顺序」。

1. **ArrowDefinition 注册面**（`ir/path/arrow.ts` shape 开放 string + 新 `arrows/` BUILTIN_ARROWS + `CompileOptions.arrows`）：内置 7 降注册项。**测试**：内置 7 经注册表渲染等价旧实现（快照不变）；未注册名编译期 throw；同名覆盖 warn。
2. **arrow compile 几何查表 + render emit**（`compile/path/arrow-geometry.ts` / `shrink.ts` + `react/render/arrowMarkers.tsx`）：去 switch，改查 def；emit → `<marker>`。**测试**：shrink 值与旧 switch 一致；marker 几何快照不变；颜色继承 sentinel → `context-stroke`（主题反应保留）。
3. **自定义 arrow 端到端**（用户注册一个 ArrowDefinition）：**测试**：自定义箭头渲染 + shrink 正确；hollow / lineWidth / scale 生效。
4. **PathGeneratorDefinition 注册面**（`ir/path/step.ts` GeneratorStep + `JsonObjectSchema` + `CompileOptions.pathGenerators` + compile resolve）。**测试**：注册一个 generator（如 parabola）端到端产 cubic；`targetParams` 的 Target 先 resolve；未注册名 throw；非 JSON params 被拒。
5. **out/in + self-loop**（`bend` step 加字段 + compile → cubic + self-loop 退化）。**测试**：out/in 角控制曲线方向；self-loop（from==to）成环；looseness 调紧致度。
6. **路径整体变换**（`PathSchema` rotate/scale + compile 包 GroupPrim）。**测试**：单 path 旋转 / 缩放等价包 Scope；旋转支点（ADR 定后补例）。
7. **中段 marking**（IR `marks` + compile 复用 segment.ts + arrow marker）。**测试**：mark 在 pos 处、按 tangent 定向（line / 贝塞尔 / arc 各一）；多 mark；无 mark 零开销。
8. **全量验收 + ADR 落档**：三包测试全绿；ADR 集合（`notes/decisions/core/v0/v0.2/v0.2-alpha.8/`）固化待定项。

---

## 测试

- **arrow 注册面**：内置 7 经注册表渲染 / shrink 与旧实现逐一等价（回归快照）；未注册 throw；同名覆盖 warn；自定义 ArrowDefinition 端到端；颜色继承 sentinel 保主题反应（`var()` / `currentColor` 不冻结）。
- **生成器注册面**：注册 generator 端到端（parabola → cubic、sin → 采样段）；`targetParams` 先 resolve；未注册 throw；`params` 非 JSON（function / undefined）被 schema 拒；同输入确定性输出。
- **out/in·self-loop**：出 / 入角方向；self-loop 成环且不退化为直线；looseness。
- **路径变换**：单 path rotate/scale 与包 Scope 等价；支点正确。
- **marking**：line / quad / cubic / arc 各段 pos 处点 + tangent 定向正确；多 mark；无 mark 不产额外 primitive。
- **回归**：alpha.1–7 全部测试通过；现有 arrow / bend / path 用法零破坏（`shape` 开放 string 后旧字面量仍合法）。

## 文档

- `core/concepts/custom-arrow/`（新，zh+en）：`ArrowDefinition` 契约 + 注册（`CompileOptions.arrows`）+ 自定义箭头 demo；颜色继承说明。
- `core/concepts/path-generator/`（新）：`PathGeneratorDefinition` + 注册 + `targetParams` + 外部曲线包思路（parabola / sin-cos 示例代码，**不进 core**）。
- Path / Step 页：out/in·self-loop（自环 demo）、路径 `rotate`/`scale`、`marks`（中段方向箭头 demo）。
- IR Schema 参考：`arrowDetail.shape`（开放 string）、generator step、bend out/in、path transform、`marks`。

## 验收

- 自定义 arrow 经 `CompileOptions.arrows` 注册可用；内置 7 降注册项、零回归；marker 几何 renderer-agnostic（core 无 `<marker>` 泄漏）；颜色继承保主题反应。
- 路径生成器经 `CompileOptions.pathGenerators` 注册可用；`params` JSON 可序列化；`targetParams` 正确 resolve；parabola / sin-cos 能作为**外部包**实现（core 不内置任何曲线）。
- out/in + self-loop 可画；路径整体变换免包 Scope；中段 marking 复用 segment.ts。
- 三包测试全绿；现有用法零破坏。

## 已决策（讨论确认）

- **两注册面拆独立 ADR + 固定顺序**：ArrowDefinition（依赖 alpha.7 Paint）先 → PathGeneratorDefinition；搭车项不阻塞。
- **arrow shape 开放 string**：对齐 alpha.3 node.shape；内置 7 降注册项（无特权）。
- **marker / 曲线本体不内置**：parabola / sin-cos / 二次曲线由路径生成器注册面外部提供，core 不内置。
- **params 限 JSON**（P1#3）：`JsonObjectSchema`，外部 schema 只在 JSON 子树 refine。
- **renderer-agnostic**（P1#2）：arrow marker emit 产 primitive，`<marker>` 物化在 adapter。
- **明确不做**（gap §2/§3）：decorations（snake/coil/其余 markings 形态）、intersections、真弧长参数化——学术 / 装饰，跳过。

## 待定（ADR 阶段敲定）

- **ArrowDefinition**：`emit` 局部坐标契约（baseSize / refY / orient 由 framework 统一）；视觉字段分工（scale/length/width/opacity 框架统一 vs hollow/lineWidth 交 def）；颜色继承用 alpha.7 `PaintValue.contextStroke`；**`MarkerPrimitive` 窄子集允许的 primitive 清单**（path/ellipse/rect/group，禁 text / 外部资源 / arrow）。
- **PathGeneratorDefinition**：`paramsSchema: ZodType<IRJsonObject>` + `definePathGenerator` 注册元校验范围；`targetParams` 顶层限制（vs 未来 JSON-Pointer）；resolve 时序（在 step 解析的哪一步）；`generate` 返回 `PathCommand` 还是更高层 step；游标推进语义（generator 产段后 cursor 落在哪）。
- **out/in**：扩 `bend` 字段 vs 新 step；looseness 默认；self-loop 退化几何（默认环大小 / 角度）。
- **路径变换**：旋转支点（包围盒中心 / 世界原点 / 可配）。
- **marking**：`marks` IR 形态（pos + mark 内容 + 定向）；mark 内容支持哪些（仅箭头 marker vs 任意小图形）；是否计入 layout。

## 设计 ADR

开工前另起（`notes/decisions/core/v0/v0.2/v0.2-alpha.8/`，编号到时定）：

- **ADR-01 ArrowDefinition**：契约 + `MarkerPrimitive` 窄子集（评审 P1#2）+ 颜色继承（依赖 alpha.7 `PaintValue.contextStroke`）+ marker emit 局部坐标 + 内置 7 迁移 + `CompileOptions.arrows` 覆盖语义。**`PatternDefinition`（pattern 自定义 motif）复用同 `MarkerPrimitive` emit + contextStroke 契约**（见 §第二部分补）——作本 ADR 延伸切片或并列 ADR-04。
- **ADR-02 PathGeneratorDefinition**：契约（`paramsSchema: ZodType<IRJsonObject>` + `definePathGenerator` 注册校验，评审 P1#4）+ `params` JSON 约束 + `targetParams` 顶层限制（评审 P2#3）+ resolve 时序 + generator step IR + 游标语义。
- **ADR-03 搭车项**：out/in → cubic 公式 + self-loop 退化几何 + 路径变换支点 + marking IR 形态（segment.ts 复用）。
