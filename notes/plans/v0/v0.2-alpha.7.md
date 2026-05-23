# v0.2.0-alpha.7 实施待办：Node 能力完善（填充服务 Paint + text width 自动换行 + pin 引脚）

> 写于 2026-05-23。v0.2「能力补全阶段」首段（gap §1 Node）。三块 core 横切能力：**填充服务 Paint**（`fill` 从单色升级为纯色 / 渐变，renderer-agnostic 资源表；图案 / 图片顺延）、**text width 自动换行**（给定宽度自动折行）、**pin 引脚**（label + 引线）。
>
> 关联：[`v0.2 总计划 §alpha.7 设计预想`](./v0.2.md) · [`tikz-gap-analysis §1 Node`](../../analysis/2026-05-07-tikz-gap-analysis.md) · 后续段 [`v0.2-alpha.8.md`](./v0.2-alpha.8.md)（自定义 arrow 复用本段 Paint 颜色继承）
>
> **贯穿约束（评审 P1，本段两处命中）**：① ScenePrimitive 渲染无关（`packages/core/src/primitive/scene.ts:8`：不允许 SVG-only 特性）——Paint 由 core 产 renderer-agnostic 资源表 + primitive 挂 `paintRef`，`<defs>` 物化只在 React SVG adapter；② IR 100% JSON 可序列化——`PaintSpec` 字段只用 JSON 值，禁 function / `z.any`。

## 背景

### 填充服务 Paint（主线先行）

`fill` 现状是**纯字符串**：`NodeSchema.fill`（`packages/core/src/ir/node.ts:145`）、`PathSchema.fill`（`ir/path/path.ts:42`）、`ScopeSchema.fill`（`ir/scope.ts:169`）全是 `z.string().optional()`；primitive 层 `RectPrim.fill` / `EllipsePrim.fill` / `PathPrim.fill` / `TextPrim.fill` 同为 `string`。render 端 `renderPrim.tsx` 的 `paintAttr` / `paintStyle`（`packages/react/src/render/renderPrim.tsx:44-55`）把含 `var(` 的值塞 inline style、其余走 attribute。

痛点：只能单色。无渐变 / 图案 / 图片——SVG 这些都靠 `fill="url(#id)"` 引用 `<defs>` 里的 paint server，而 core 没有任何 defs / 资源管理。硬塞 `url(#x)` 能侥幸渲染但无 API、无 defs 物化、跨 adapter 不可移植。

**关键约束**：`ScenePrimitive` 明确是"渲染目标无关的最大公约子集，不允许 SVG-only 特性"（`primitive/scene.ts:8-10`）。所以**不能**让 core 产 `<defs>` primitive。正解：core 产 renderer-agnostic **资源表 + 引用**，adapter 物化。

### text width 自动换行

node 文本现状：`text` 是单行 string 或多行 `LineSpec[]`（`ir/text.ts`），**只能手动分行**。文字度量已有注入式接口 `TextMeasurer`（`compile/text-metrics.ts:29`，react 用 canvas measureText、ssr 用 fontkit），node 布局用它算每行宽高、定外接框。

痛点：长 label 无法按给定宽度自动折行（TikZ `[text width=3cm]`）。折行算法只能落在 core 文本布局层（度量在这里）。

### pin 引脚

`NodeLabelSchema`（`ir/node.ts:44-93`）：label 挂 node 边、`position`（8 方向 / 数字角度）+ `distance` + 字体 + `rotate`。**label 无引线**——pin 是"label + 一条从 node 边牵到 label 的引线"。

痛点：缺带指引线的标注（TikZ `[pin=right:bar]`）。pin 可复用 label 的方向 / 角度 / distance 体系 + alpha.6 的 anchor / edgePoint 定引线起点。

---

## 第一部分：填充服务 Paint（基础先行）

### 分阶段（评审 P2#1）

alpha.7 只做 **Paint 基础**，避免与 text-wrap + pin 叠在一起失控：

| 阶段 | 内容 | 本段 |
| --- | --- | --- |
| **基础（本段）** | solid string 兼容 + linear / radial gradient + renderer-agnostic 资源表骨架 | ✅ |
| 顺延（另段 / 后续切片） | pattern（斜线 / 网点）、image（href / 坐标系 / SSR 内联） | ⏭ 单独 ADR 占位 |

### IR 改动清单

| 改动 | 文件 | 形态 |
| --- | --- | --- |
| 新增 `PaintSpec`（gradient 基础） | 新 `ir/paint.ts` | `{ type: 'linearGradient' \| 'radialGradient', stops, ... }`（纯 JSON） |
| `fill` 升 union | `ir/node.ts` / `ir/path/path.ts` / `ir/scope.ts` | `z.union([z.string(), PaintSpecSchema])`；`string` 仍纯色 |
| Scene 加资源表 | `primitive/scene.ts` | `resources?: Array<SceneResource>`；`SceneResource` = discriminated `{ kind:'paint' } \| { kind:'clip' }…`（评审 P1：alpha.9 加 clip 不再破契约） |
| primitive `fill` 升 `PaintValue` | `primitive/{rect,ellipse,path}.ts` | `fill?: PaintValue` = `string`(纯色) ∪ `{ kind:'resourceRef', id }` ∪ `{ kind:'contextStroke' }`（继承描边，供 alpha.8 arrow；评审 P2） |
| compile 收集 / 去重 / 派 id | 新 `compile/paint.ts` | 扫场景把 `PaintSpec` 收进资源表，primitive 写 `fillRef` |
| adapter 物化 | `react/src/render/`（新 `defs.tsx` + `renderPrim.tsx`） | 资源表 → `<defs>`，`fillRef` → `fill="url(#id)"` |

### `PaintSpec` schema（草案，ADR 固化）

```ts
// ir/paint.ts（新）—— 仅 JSON 值（守 IR 可序列化）
const GradientStopSchema = z.object({
  offset: z.number().min(0).max(1).describe('Stop position 0..1'),
  color: z.string().describe('Any CSS color'),
  opacity: z.number().min(0).max(1).optional(),
});

export const PaintSpecSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('linearGradient'),
    stops: z.array(GradientStopSchema).min(2),
    // 方向：角度（度，polar 约定）或两端点（objectBoundingBox 0..1）；ADR 二选一
    angle: z.number().finite().optional(),
  }),
  z.object({
    type: z.literal('radialGradient'),
    stops: z.array(GradientStopSchema).min(2),
    // 中心 / 半径（objectBoundingBox 0..1）；缺省居中
    center: z.tuple([z.number(), z.number()]).optional(),
    radius: z.number().positive().optional(),
  }),
]).describe('Paint server spec (gradient); solid color stays a plain string on `fill`');

export type IRPaintSpec = z.infer<typeof PaintSpecSchema>;
```

### renderer-agnostic 资源表（评审 P1#2 核心）

core **不**产 `<defs>`。改为：

```ts
// primitive/scene.ts —— 渲染无关资源（adapter 各自物化）

/** primitive 上的 paint 取值词汇表（评审 P2：alpha.8 arrow 颜色继承依赖此处先定稳） */
export type PaintValue =
  | string                              // 纯色（任意 CSS color；含 var() 走 inline style）
  | { kind: 'resourceRef'; id: string } // 指向资源表（gradient / 后续 pattern·image）
  | { kind: 'contextStroke' };          // 继承所在元素描边（adapter → SVG context-stroke）

/** 资源表元素：discriminated，alpha.9 直接加 'clip' 分支、不再破契约（评审 P1） */
export type SceneResource =
  | { kind: 'paint'; id: string; spec: IRPaintSpec };
  // alpha.9 追加： | { kind: 'clip'; id: string; region: ClipRegion }

export type Scene = {
  primitives: Array<ScenePrimitive>;
  layout: Layout;
  /** 渲染无关资源表；adapter 物化（SVG → <defs>）。无资源时省略 */
  resources?: Array<SceneResource>;
};
```

- **去重 + 稳定 id 在 core**（确定性）：`compile/paint.ts` 把相同 `PaintSpec`（结构化深比较）合并为一个 `{ kind:'paint' }` 资源，id 用内容 hash / 递增序号（ADR 定）——保证同输入同 id（快照稳定、SSR / CSR 一致）。
- **primitive 携 `PaintValue`**：`RectPrim` / `EllipsePrim` / `PathPrim` 的 `fill` 升为 `PaintValue`——纯色 = `string`（向后兼容、零破坏）、gradient = `{ kind:'resourceRef', id }`、继承描边 = `{ kind:'contextStroke' }`（alpha.8 arrow 用）。单字段 union 取代「`fill` + `fillRef` 双字段互斥」，无 invariant 负担。
- **adapter 物化**：react 新增 `render/defs.tsx`，把 `scene.resources` 渲成 `<defs><linearGradient>...`；`renderPrim` 按 `PaintValue` 分派：`string` 走现有 `paintAttr`/`paintStyle`（`var(` 仍 inline style）、`resourceRef` → `fill="url(#id)"`、`contextStroke` → `fill="context-stroke"`。

### compile 流程

1. node / path / scope 的 `fill` 若是 `PaintSpec` → 进 `compile/paint.ts` 收集器，换回 primitive 的 `fillRef`；若是 `string` → 原样写 `fill`。
2. scope `fill` 级联（alpha.2 样式继承）：`PaintSpec` 作默认值同样能级联——继承链解析后再进资源收集（避免每个继承点重复收集，去重兜底）。
3. `compileToScene` 返回前把资源表挂上 `Scene.resources`。

---

## 第二部分：text width 自动换行

### IR 改动

| 改动 | 文件 | 形态 |
| --- | --- | --- |
| `NodeSchema` 加 `maxTextWidth` | `ir/node.ts` | `z.number().positive().optional()`——折行阈值（user units）；超过才折行、短文本盒收缩（类比 TikZ `text width` 但非固定宽，评审 P2#2） |

### compile 折行

落在 node 布局（`compile/node.ts` + `compile/text-metrics.ts`）：

- `maxTextWidth` 未给 → 现行为（手动分行）不变。
- 给定 → 对每个逻辑行用注入的 `TextMeasurer` 贪心断行：累加 token 宽度 > `maxTextWidth` 即换行。
- **断行单位**：西文按**词**（空白分割）、CJK 按**字**（无空白连续段逐字可断）——单一断行器处理混排。
- 折行结果并入现有多行布局（与 `LineSpec` / `align` / `lineHeight` 同管线）：折出的物理行继承该逻辑行的 `LineSpec` 样式。
- 外接框宽度：**`maxTextWidth` 折行阈值语义（已拍，评审 P2#2）**——盒宽 = `min(实际最长行, maxTextWidth)`，超过阈值才折行、短文本盒子**收缩到内容不留白**（贴通用图表，Mermaid / draw.io 风格）。

### 待定（ADR）

- 显式 `LineSpec[]`（已手动分行）+ `maxTextWidth` 同时给：是各逻辑行再各自折行（推荐），还是冲突报错。
- 断词细节：长单词（超过 `maxTextWidth` 的不可断 token）是否硬断 / 溢出。
- 是否要 `align` 在折行后生效（多行对齐）——应自动复用现有 align。

---

## 第三部分：pin 引脚

### IR 改动（草案）

pin 复用 label 体系 + 加引线。两条路（ADR 二选一）：

- **A. `NodeLabelSchema` 加 `pin` 开关 + 引线样式**：`pin?: boolean`（true = 画引线）+ `leader?: { stroke?, strokeWidth?, dashPattern?, arrow? }`。复用 label 全部 placement 字段。
- **B. 独立 `NodePinSchema`**：`Node.pin`（单 / 数组），字段 = label placement 子集 + 引线样式。

倾向 **A**（pin 本质是"带引线的 label"，复用 placement 最省；`leader` 缺省 = 细实线）。

### compile / emit

- 引线**起点**：node 边界上朝 label 方向的点——复用 alpha.6 `boundaryPointOf` / edgePoint（沿 label 的 `position` 角度求边界点）。
- 引线**终点**：label 外接框朝 node 一侧的锚点（或 label center，ADR 定）。
- 产出：label 的 TextPrim + 一条 `PathPrim`（引线，line / 可选末端 arrow）。包进 label 的 GroupPrim。
- 引线 `stroke` 缺省继承 node 主色 `color` / `currentColor`。

### 待定（ADR）

- 引线终点锚定（label 边 vs center）+ 起点是否随 node `rotate`。
- 引线末端是否支持 arrow（复用 arrow 系统）——可留 alpha.8 自定义 arrow 后增强。
- pin 是否计入 layout 外接框（label 现不计入；引线 + 远端 label 可能需要计入避免被裁）。

---

## 实现拆分

每片一个语义闭环、独立可验收、单独 commit（commit 前按用户当次确认逐条执行）。**Paint 基础是主线，先行**。

1. **Paint schema + 类型**（`ir/paint.ts` + `fill` union 三处）：`PaintSpecSchema`（linear/radial gradient，纯 JSON）+ `NodeSchema`/`PathSchema`/`ScopeSchema` 的 `fill` 升 `union([string, PaintSpec])`；导出 `IRPaintSpec`；`src/index.ts` 公开。**测试**：schema 接受 string（纯色，向后兼容）+ 接受 gradient PaintSpec + stops <2 报错 + 非 JSON（function）被 TS / zod 拒。
2. **Scene 资源表 + primitive paintRef**（`primitive/scene.ts` + `primitive/{rect,ellipse,path}.ts`）：`PaintResource` + `Scene.resources?` + primitive `fillRef?`。**测试**：类型层 `fill` / `fillRef` 互斥（构造校验）。
3. **compile paint 收集 + 去重**（新 `compile/paint.ts` + 接入 `compile/node.ts` / `compile/path` / scope 级联）：`PaintSpec` → 资源表（结构化去重、稳定 id）+ primitive 写 `fillRef`；纯色仍 `fill`。**测试**：同 spec 多处用 → 资源表 1 条、id 一致；不同 spec → 多条；scope 级联的 PaintSpec 正确收集；纯色不进资源表。
4. **react adapter 物化**（新 `render/defs.tsx` + `renderPrim.tsx`）：`scene.resources` → `<defs>` gradient；`fillRef` → `fill="url(#id)"`；纯色走现有 `paintAttr`/`paintStyle`。**测试**：渲染含 gradient 的 node/path 出 `<defs>` + `url(#)`；纯色无 `<defs>`；`var(` 仍 inline style。
5. **text width 折行**（`ir/node.ts` `maxTextWidth` + `compile/node.ts` 折行器）：贪心断行（西文按词 / CJK 按字），并入多行布局。**测试**：给定 `maxTextWidth` 长文本折多行；西文 / CJK / 混排断点；未给 `maxTextWidth` 行为不变；折行行继承 `LineSpec` 样式 + `align` 生效。
6. **pin 引脚**（`ir/node.ts` label `pin`/`leader` + compile/emit 引线）：引线起点边界点 + 终点 label 锚 + TextPrim + 引线 PathPrim 包 GroupPrim。**测试**：pin 渲出 label + 引线；引线起点在 node 边界朝 label 方向；引线样式（stroke/dash）；多 pin。
7. **全量验收 + ADR 落档**：core / react / docs 三包测试全绿；ADR 集合（`notes/adr/v0/v0.2-alpha.7/`）固化全部待定项；pattern / image 留**顺延 ADR 占位**（不实现）。

---

## 测试

- **Paint schema**：纯色 string 仍合法（零破坏）；linear/radial gradient PaintSpec 合法；stops <2 / offset 越界 / 非 JSON 被拒。
- **资源去重 / 稳定 id**：同 `PaintSpec` 在多 node 复用 → `Scene.resources` 仅 1 条、id 确定（同输入同 id，快照稳定）；不同 spec 分条；纯色不进表。
- **adapter 物化**：gradient → `<defs>` + `fill="url(#id)"`；纯色 → 无 `<defs>`、走 attribute；`var(` → inline style（现有逻辑不退）。
- **text-wrap**：`maxTextWidth` 折多行；西文按词、CJK 按字、混排；超长不可断 token 行为（ADR 定后补例）；未给 `maxTextWidth` 与现行快照一致；折行 + `align`/`lineHeight`/`LineSpec` 协同。
- **pin**：引线起点 = node 边界朝 label 方向点；终点锚定；样式；多 pin；prod / 旋转 node 行为。
- **回归**：alpha.1–6 全部测试通过（基线不退）；`fill` 纯色既有用法零破坏。

## 文档

- `core/concepts/paint/`（新概念页 zh+en）：纯色 vs 渐变；`PaintSpec` 形态；renderer-agnostic 资源 → `<defs>` 的说明；pattern / image 标注"顺延"。
- Node / Path / Scope 组件页 `fill` 字段：补 `PaintSpec` 用法 + demo（渐变填充）。
- Node 页：`maxTextWidth`（自动换行 demo，含 CJK / 西文）+ `pin`（引脚 demo）。
- IR Schema 参考：`fill` union、`PaintSpec`、`maxTextWidth`、label `pin`/`leader` 字段。

## 验收

- `fill` 支持纯色（向后兼容）+ linear/radial gradient；core 产 renderer-agnostic 资源表（去重 + 稳定 id），react adapter 物化 `<defs>`，**core 无 SVG-only 泄漏**（满足 `scene.ts` 契约）。
- pattern / image **未实现**，但 `PaintSpec` union 形态为其预留（顺延 ADR 占位），不破坏后续扩展。
- `maxTextWidth` 给定时按宽度自动折行（西文 / CJK / 混排），与现有多行 / align / lineHeight 协同；未给时行为零变化。
- pin 渲出 label + 引线（起点 node 边界、终点 label 锚），复用 label placement。
- 三包测试全绿；现有纯色 fill / 多行文本 / label 用法零破坏。

## 已决策（讨论确认）

- **Paint 分阶段**：alpha.7 只做基础（solid + linear/radial gradient + renderer-agnostic 资源表）；pattern / image 顺延（单独 ADR，不进本段首批）。
- **renderer-agnostic 资源**：core 产 `PaintResource` 资源表 + primitive `fillRef`，去重 + 稳定 id 在 core；`<defs>` 物化只在 react SVG adapter（不违反 `ScenePrimitive` 渲染无关契约）。
- **纯色零破坏**：`fill` 仍接受 `string`；union 只是叠加 `PaintSpec` 分支。
- **text-wrap = `maxTextWidth` 折行阈值语义**（评审 P2#2 拍）：盒宽 = `min(实际最长行, maxTextWidth)`，短文本收缩到内容不留白（非 TikZ 固定 `text width`）；字段名 `maxTextWidth` 与语义一致。
- **明确不做**（gap §1）：边框语义粗细档（数值 `strokeWidth` 对结构化 / AI 更直接）、非矩形圆角（价值低）、双线边框（→ `@retikz/shape`）、图片填充本段不做（顺延）。
- **gap doc 状态修订**（本段一并改）：形状 ⚠️ → ✅（备注「内置 4 + 注入面对齐；更多形状由 `@retikz/shape` 扩展」）；数学 / LaTeX 仍 ❌（备注「未来 `@retikz/math`；core 需先留文本渲染钩子」）。

## 待定（ADR 阶段敲定）

- **`PaintSpec` 字段**：linear gradient 方向用 `angle` 还是两端点；radial 的 center/radius 坐标系（objectBoundingBox 0..1 vs userSpace）；stop 是否支持 `currentColor` / `var()`（主题反应）。
- **资源 id 策略**：内容 hash vs 递增序号；去重的结构化比较键。
- **`PaintValue` 词汇表最终形**（评审 P2）：`contextStroke` sentinel 命名 + 是否需要 `contextFill`；`resourceRef` 与未来 pattern / image 资源共用。
- **text-wrap**：显式 `LineSpec[]` + `maxTextWidth` 同给的语义；长不可断 token 硬断 / 溢出；断行器 CJK 标点禁则是否处理（倾向不处理，过细）。
- **pin**：schema 形态（label `pin` 开关 A vs 独立 `NodePin` B）；引线终点锚定（label 边 / center）；引线起点是否随 node `rotate`；pin 是否计入 layout 外接框；引线末端 arrow 是否本段做（倾向留 alpha.8）。

## 设计 ADR

开工前另起（`notes/adr/v0/v0.2-alpha.7/`，编号到时定），固化上节待定项 + 落交付物：

- **ADR-01 Paint 基础**：`PaintSpec`（gradient）字段清单 + **`PaintValue` 词汇表**（`string` ∪ `resourceRef` ∪ `contextStroke`，alpha.8 arrow 颜色继承依赖）+ **`SceneResource` discriminated 资源表**（去重键 / 稳定 id 在 core，alpha.9 clip 复用）+ adapter 物化 `<defs>` 边界 + scope 级联交互。
- **ADR-02 text width 自动换行**：折行算法（贪心、CJK / 西文断点）+ 与 `LineSpec` / `align` / `lineHeight` / 外接框的关系。
- **ADR-03 pin 引脚**：schema 形态 + 引线起点 / 终点锚定 + 样式继承 + layout 计入与否。
- **ADR-04（顺延占位）pattern / image**：仅记形态预留与待定项（href / 坐标系 / SSR 内联 / tile），本段不实现。
