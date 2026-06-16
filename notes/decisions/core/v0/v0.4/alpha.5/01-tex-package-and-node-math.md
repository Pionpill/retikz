# ADR-01：`@retikz/tex` 包 + MathJax→PathPrim 引擎 + `node.math` 内容（独立公式 A）

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [v0.4 roadmap 候选 E](../roadmap.md) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · [ADR-02 带框公式](./02-node-embedded-math.md) · [ADR-03 行内混排](./03-inline-math-runs.md) · `compile/compile.ts`（`CompileOptions` 注入）· `compile/node.ts`（内容→尺寸→emit）· `compile/text-metrics.ts`（measurer 注入先例）· `compile/constant.ts`（`CompileWarningCode` / `onWarn`）· `render/canvas-node`（`@napi-rs/canvas` optional peer 先例）

> **范围**：E1「`@retikz/tex` 包 + lowering 引擎 + 独立公式块（A）」——公式作 **node 内容**（`node.math`，与 `text` 平行）、无容器 shape 时即独立公式块。带框公式（B）见 [ADR-02](./02-node-embedded-math.md)、行内混排（C）见 [ADR-03](./03-inline-math-runs.md)。
>
> **路线（route 2 激进，2026-06-16 拍板）**：alpha.5 接受 **red-level core schema 变更**——本 ADR 起 core 新增 `IRNode.math` + `CompileOptions.lowerMath`。公式**统一为 node 内容模型**（不引入 `shape:'math'` 平行模型），A/B/C 共享同一条 `node.math` / math-run + `lowerMath` 注入链路。

## 背景

retikz 是 TikZ-inspired 库却无数学排版——节点写不了 LaTeX 公式，是图示作者刚需。注入 web 字体 / KaTeX / MathML 会绑死 DOM / 字体、**走不通 Canvas / Node 位图**，破 Scene 红线（`primitive/scene.ts`）。唯一干净路径 = **MathJax SVG 模式**：glyph 是 `<path>`（贝塞尔轮廓）非字体，解析进 retikz `PathPrim`，三端走既有 path 管线一致出图、零字体依赖。

公式在语义上是「节点的一种内容」——与 `text` 对等。retikz 现有 node 内容只有 `text`（`ir/text.ts`），编译期 `compile/node.ts` 用注入的 `measureText` 量尺寸、shape `circumscribe` 包住、emit `TextPrim`。**统一决策**：公式同样作 node 内容（`node.math`），走同一条「内容 → 测量 → 容器尺寸 → emit」链路，只是测量 / emit 委托给注入的 `lowerMath`（而非 `measureText`）。这样：
- A（无 shape 的 node + math 内容）= 独立公式块——同「无 shape 的纯 text node」一样，bbox = 内容 bbox、可连线 / compass anchor。
- B（有 shape 的 node + math 内容）= 带框公式（[ADR-02](./02-node-embedded-math.md)）——容器包住公式。
- C（行内 text+math run）= [ADR-03](./03-inline-math-runs.md)。
**只有一种公开公式模型**（`node.math` + math run），无 `shape:'math'` 平行概念。

core 不能依赖 MathJax，故沿用既有「能力注入」范式（`measureText` / `shapes` / `arrows` / `composites` 都是 `CompileOptions` 注入）：新增 `options.lowerMath` 注入点，`@retikz/tex` 提供实现，MathJax 走 optional peer（照搬 `@napi-rs/canvas`）。

## 决策：core 加 `node.math` 内容 + `options.lowerMath` 注入；`@retikz/tex` 提供 MathJax→PathPrim 引擎

core 新增（纯数据 + 注入点，**不依赖 MathJax**）：

```ts
// ir/math.ts（新建，core，纯 JSON 数据）
export const MathContentSchema = z.object({
  tex: z.string().describe('LaTeX math source rendered to glyph paths by an injected lowerMath capability.'),
  displayMode: z.boolean().optional().describe('Display (block) vs inline math metrics; default inline (false).'),
});
export type IRMathContent = z.infer<typeof MathContentSchema>;

// ir/node.ts：node 内容新增可选 math（与 text 互斥，math 优先 + warn）
math: MathContentSchema.optional().describe('Math formula as node content (parallel to text); sized/emitted via injected lowerMath.');

// compile：新增注入点（@retikz/tex 提供；缺省则带 math 的 node 降级 + onWarn）
export type LowerMath = (
  content: IRMathContent,
  style: { fontSize: number; color?: string },
) => { commands: Array<PathCommand>; width: number; height: number; depth: number } | null; // null = 渲染失败（非法 tex）
// CompileOptions.lowerMath?: LowerMath
```

数据流：`IRNode{ position, math:{tex} }`（无 shape）→ `compile/node.ts` 见 `math` 内容 → 调 `options.lowerMath` 拿 `{commands, width, height, depth}` → 内容 bbox 即 node bbox（无 shape 时）→ 定位 / compass anchor / boundaryPoint 走 AABB → emit 字形 `PathPrim`（`fillRule='evenodd'`、`fill` 继承 node 色 / `currentColor`）。MathJax 只在 compile 期（`@retikz/tex` 闭包内）跑，**不进 IR、不进 renderer**。

`@retikz/tex` 提供引擎（按 tex 串缓存，measure 与 emit 共用一次 `tex2svg`）：

```ts
// @retikz/tex —— 调用方 await MathJax startup 后构造，闭包持同步 tex2svg
export const createLowerMath = (mathjax: MathJaxSvgEngine): LowerMath => { /* tex2svg → 解析 path d（<use> 解引用 + transform 展平）→ PathCommand[] + bbox（ex→user）；非法 tex → null；按 tex 缓存 */ };
```

错误 / 降级（用 core `onWarn` + `CompileWarningCode`，**不扩 shape API、不抛**）：
- node 有 `math` 但**未注入** `options.lowerMath` → `onWarn(MATH_LOWERER_MISSING)` + 跳过该 node 的 math（渲染空 / 占位），不崩。
- `lowerMath` 返回 `null`（**非法 tex** / MathJax 渲染失败）→ `onWarn(MATH_TEX_INVALID)` + 占位（零尺寸或小问号框），不崩。

理由：

1. **renderer-agnostic 干净子集**——glyph = path，三端走既有 path 管线，零字体注入，守 Scene 红线。
2. **统一内容模型**——公式即 node 内容（同 text），A/B/C 一条链路，单一公开模型，无 `shape:'math'` 双轨（解评审 BLOCKING 2）。
3. **沿用 core 注入范式 + onWarn**——`lowerMath` 与 `measureText` 同形注入；错误走既有 `onWarn` / `CompileWarningCode`（解评审 WARNING 1/2：有 warn 通道、不偷扩 shape API）。core 不背 MathJax。
4. **AI 友好**——`node.math = { tex }` 纯 JSON、`tex` LLM 高频、与 `text` 对称。

## 待决策点 🔻

- **bbox → user 单位换算口径**：MathJax SVG 以 `ex` 计（`width` / `height` / `verticalAlign`=depth）。倾向 `1ex = fontSize × exFactor`（`exFactor≈0.45`），`fontSize` 取 node style 字号；displayMode 仅改 MathJax 排版度量。常量「可诊断近似」按快照微调（同 shadow blur）。
- **字形产物粒度**：MathJax SVG 用 `<use>` 引共享 glyph + `<rect>`（分数线等）。倾向解析期 `<use>` 解引用 + transform 展平成**一个** `PathPrim`（多 subpath，`fillRule='evenodd'`），`<rect>` 转矩形 subpath 并入。保真优先。
- **颜色继承**：倾向字形 `PathPrim.fill` 取 node text/stroke 色（缺省 `currentColor`），跟随主题。
- **MathJax 生命周期**：倾向 `@retikz/tex` 只吃「已初始化的同步 `tex2svg`」（`createLowerMath(mathjax)`），异步 startup 由 adapter（`@retikz/tex/react` / 用户）await 后再 compile；core `compileToScene` 保持纯同步。
- **无 shape node 的 math 内容定位**：倾向 node bbox = math bbox（AABB），anchor / boundaryPoint 走 AABB（同纯 text node 无 shape 时）。

## DSL 表面

react（`@retikz/tex/react` 提供 `<Math>` sugar = `<Node math>`；`<TexProvider>` await MathJax startup 并把 `lowerMath` 经 `<Layout lowerMath>` 注入）：

```tsx
import { TexProvider, Math } from '@retikz/tex/react';
<TexProvider>
  <Layout>
    {/* 独立公式块（无 shape）：复用 Node 几何，可连线、可加 alpha.4 效果 */}
    <Math id="eq" position={[0, 0]} tex="\frac{a}{b} = c" />
    <Math id="big" position={[0, -40]} tex="\sum_{i=1}^n i^2" displayMode shadow="sm" />
    <Path><Step kind="move" to="eq" /><Step kind="line" to="big" /></Path>
  </Layout>
</TexProvider>
```

vanilla（注入 `lowerMath` 到 `toScene` options；node 用 `math` 内容）：

```ts
import { createLowerMath } from '@retikz/tex';
import { figure, node } from '@retikz/vanilla';
const lowerMath = createLowerMath(await startMathJax());
const fig = figure([node('eq', { position: [0, 0], math: { tex: '\\frac{a}{b}=c' } })]);
toScene(fig, { lowerMath });
```

## 测试设计

`packages/tex/tex/tests/**` + `packages/core/core/tests/compile/node-math.test.ts` 覆盖：SVG path 解析、node math 内容→字形 PathPrim、bbox/单位换算、降级（缺 lowerMath / 非法 tex）、交互（连线 / anchor / alpha.4）、round-trip。具体见「实现契约 § 测试象限」。

## 影响

- **core**：`ir/math.ts`（新建）、`ir/node.ts`（加 `math`）、`compile/compile.ts`（加 `options.lowerMath` 注入 + 透传）、`compile/node.ts`（math 内容分支：测量 + emit 字形）、`compile/constant.ts`（新 warn code）、`src/index.ts`（导出 `IRMathContent` / `LowerMath`）。**red 级 core 变更**（additive / optional，缺省零回归）。
- **`@retikz/react`**：`Layout.tsx` 加 `lowerMath` prop → 透传 `compileToScene`（解评审 BLOCKING 3：现有 Layout 只传 shapes/arrows/patterns/pathGenerators/composites，无 lowerMath 通道）。
- **`@retikz/vanilla`**：`toScene` 透传 `lowerMath`。
- **新包 `@retikz/tex`**：独立包（非 core 组 lockstep），`dependencies` 含 `@retikz/core`，`mathjax` 走 optional peer；含 `@retikz/tex/react`（`<Math>` + `<TexProvider>`）。
- **renderer**：**零改动**（字形是普通 `PathPrim`）。
- **对外 API**：core 新增 `IRNode.math` + `LowerMath` + `IRMathContent`（additive）；新包公开 API；无 breaking。
- **文档站**：公式双语页 + demo（独立公式块、连线、与 shadow/blend 叠加；MathJax 安装说明）。

## 不在本 ADR 范围

- **带框公式（B）**——node math 内容 + 容器 shape，见 [ADR-02](./02-node-embedded-math.md)。
- **行内 text+math 混排（C）**——扩 text-run 模型，见 [ADR-03](./03-inline-math-runs.md)。
- **`shape:'math'` 平行模型**——已弃（统一走 content，解 BLOCKING 2）。
- **公式编辑 / 实时预览 / KaTeX·MathML 引擎 / 化学式扩展**——超范围 / 已淘汰。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/core/core/src/ir/**`（新建 `ir/math.ts` + 改 `ir/node.ts`）、`compile/**`（`lowerMath` 注入 + node math 分支 + warn code）、`src/index.ts`（公开导出）；新增公开包 `@retikz/tex`（`packages/*/*/src/index.ts`）。`@retikz/react` `Layout.tsx`（黄）整体取最高走红。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/math.ts`（新建） | 加 | `MathContentSchema` | `z.object({ tex: z.string(), displayMode: z.boolean().optional() })` | `displayMode=false` | node 公式内容：tex 源 + 行/块级度量；经注入 lowerMath 渲染 |
| `packages/core/core/src/ir/node.ts` | 加 | `math` | `MathContentSchema.optional()` | — | node 内容为公式（与 text 互斥，math 优先 + warn） |
| `packages/core/core/src/compile/compile.ts` | 加 | `CompileOptions.lowerMath` | `LowerMath`（`(content, style) => {commands,width,height,depth} \| null`） | `undefined`（缺省降级 + warn） | 注入：公式 → 字形命令 + bbox（@retikz/tex 提供） |
| `packages/core/core/src/compile/constant.ts` | 加 | `CompileWarningCode.MATH_LOWERER_MISSING` / `MATH_TEX_INVALID` | const-enum 成员 | — | 缺 lowerMath / 非法 tex 的可诊断 warn |
| `packages/tex/tex/src/lower/lower-math.ts`（新建） | 加 | `createLowerMath` | `(mathjax) => LowerMath` | — | MathJax 引擎 → lowerMath 实现（按 tex 缓存） |

`LowerMath` 类型在 core（`compile`）声明、经 `src/index.ts` 导出；`@retikz/tex` 实现。字段名 / 默认值 / warn code 写死。`TextPrim` 不改（公式 emit 成 `PathPrim`）。

### 文件 scope

- core：`ir/math.ts`（新建）、`ir/node.ts`、`ir/index.ts`、`compile/compile.ts`（`lowerMath` 注入 + 透传）、`compile/node.ts`（math 内容测量 + emit；无 shape → bbox=math bbox）、`compile/constant.ts`（warn code）、`src/index.ts`
- `@retikz/react`：`src/kernel/Layout.tsx`（加 `lowerMath` prop + 传 `compileToScene`）+ 测试
- `@retikz/vanilla`：`src/to-scene.ts`（透传 `lowerMath`）+ 测试
- `@retikz/tex`（新建包）：`src/index.ts`、`src/lower/lower-math.ts`（`createLowerMath`）、`src/mathjax/load.ts`（optional peer 动态 import + 缺失诊断）、`src/svg-path/parse.ts`（SVG `path d` → `PathCommand`；`<use>` 解引用 + transform 展平）、`src/measure/bbox.ts`（ex→user）、`package.json` / `tsconfig*` / 包配置、`tests/**`
- `@retikz/tex/react`（新建包）：`src/index.ts`、`src/Math.tsx`（`<Math>` = `<Node math>`）、`src/TexProvider.tsx`（MathJax startup + 经 `<Layout lowerMath>` 注入）、`package.json`、`tests/**`
- `pnpm-workspace.yaml`（catalog 加 `mathjax`）
- **不动**：`render/src/**`（零改动验证点）
- `apps/docs/**`（stage 4）

### 测试象限（≥9）

**Happy（≥3）**：`parse-simple`（`\frac{a}{b}` SVG path d → `PathCommand[]`，含 `<use>` 解引用 + transform 展平）；`node-math-emits-paths`（`node.math` 的 node compile → 字形 `PathPrim`，`fillRule='evenodd'`）；`bbox-sizes-node`（无 shape node 的 bbox = MathJax bbox 经 ex→user）；`color-inherit`（字形 `fill` 取 node 色 / `currentColor`）。

**边界（≥2）**：`empty-tex`（`tex=''` → 空 / 零尺寸、不崩）；`single-glyph`（`x` → 1 path）；`display-vs-inline`（`displayMode` true/false 度量不同）；`math-vs-text-precedence`（同给 text + math → math 优先 + warn）。

**错误路径（≥2）**：`lowermath-missing`（node 有 math 但未注入 `options.lowerMath` → `onWarn(MATH_LOWERER_MISSING)` + 跳过，不抛）；`invalid-tex`（`lowerMath` 返回 null → `onWarn(MATH_TEX_INVALID)` + 占位，不抛）。

**交互（≥2）**：`math-node-connectable`（math node 可被 `<Path>` 连线，boundaryPoint 落 AABB）；`compass-anchor-aabb`（`eq.north` 等返回 AABB 点）；`math-with-effects`（math node + alpha.4 `shadow` / `opacity` 共存，效果落字形 path）。

**round-trip（≥1）**：含 `math:{tex,displayMode}` 的 IRNode JSON 往返深等。

### 依赖的现有元素

- `compile/text-metrics.ts` 的 `measureText` 注入范式 —— **参照**（`lowerMath` 同形注入）。
- `compile/node.ts` 的「内容→shape circumscribe→emit」链路 —— **扩展**（加 math 内容分支；无 shape 时 bbox=内容 bbox，同纯 text node）。
- `compile/compile.ts` 的 `CompileOptions` —— **扩展**（加 `lowerMath`）。
- `compile/constant.ts` 的 `CompileWarningCode` / `onWarn` —— **扩展**（加 math warn code；错误走既有 warn 通道）。
- `react/src/kernel/Layout.tsx` 的 `compileToScene` options 透传 —— **扩展**（加 `lowerMath` 通道，解 BLOCKING 3）。
- `primitive/path.ts`（`PathPrim` cubic + `fillRule`）—— **引用**（emit 产物）。
- `render/canvas-node`（`@napi-rs/canvas` optional peer）—— **参照**（MathJax optional peer 照搬）。
- `packages/plot/*`（Tier 2 包结构 + react adapter 分层）—— **参照**（`@retikz/tex` 包结构范本）。
