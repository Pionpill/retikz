# ADR-02：带框公式（B）—— `node.math` 内容 + 任意 shape 容器

- 状态：Proposed
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [ADR-01 tex 包 + node.math 内容](./01-tex-package-and-node-math.md)（地基：`node.math` + `lowerMath`）· [ADR-03 行内混排](./03-inline-math-runs.md) · `compile/node.ts`（内容→shape circumscribe→emit）· `shapes/types.ts`（`ShapeDefinition`）

> **范围**：E2「带框公式（B）」——node 用常规 shape（rectangle / circle / star…）作容器、**内容为公式**，容器自动尺寸包住公式、可用常规 `fill` / `stroke` / `cornerRadius` / alpha.4 效果。独立公式块（A）见 [ADR-01](./01-tex-package-and-node-math.md)、行内混排（C）见 [ADR-03](./03-inline-math-runs.md)。
>
> **依赖**：本 ADR 建在 [ADR-01](./01-tex-package-and-node-math.md) 的统一内容模型上——`node.math` 内容字段 + `options.lowerMath` 注入 + compile 内容路径已由 ADR-01 落地。本 ADR 只补「内容为公式 **且** 有容器 shape」时的容器尺寸 / emit 合成。

## 背景

[ADR-01](./01-tex-package-and-node-math.md) 已把公式作 node 内容（`node.math`）：无 shape 时即独立公式块（A），bbox = 公式 bbox。图示里更常见的是**带框公式**：矩形 / 圆 / 星里放一条公式，框可填色描边、自动尺寸包住公式——TikZ `\node[draw, rounded corners] {$E=mc^2$}`。

retikz 的「容器 shape 包住内容」链路**已存在**（纯 text node + shape：shape `circumscribe` 据 text bbox 算容器半轴、emit 容器 prim + 居中 `TextPrim`）。本 ADR 让这条链路认识 math 内容：node 同时有 shape + `math` 时，用 ADR-01 的 `lowerMath` 量公式 bbox 喂 `circumscribe`，容器包住公式 + padding，emit 容器 prim + 居中字形 `PathPrim`。

## 决策：node 有 shape + `math` 内容时，shape 据公式 bbox 自动尺寸、emit 框 + 居中字形

复用 ADR-01 的 `node.math` + `options.lowerMath`，**core 无新 schema 字段**——只在 `compile/node.ts` 把「内容测量」从「text-only 经 `measureText`」推广到「math 内容经 `lowerMath`」并喂给任意 shape 的 `circumscribe`：

```ts
// compile/node.ts（伪码）：内容尺寸来源按内容类型分派
const contentSize = node.math
  ? sizeFromLowerMath(options.lowerMath, node.math, style)   // 公式 bbox（ADR-01）
  : sizeFromMeasureText(options.measureText, node.text, style); // 文本 bbox（既有）
const { halfWidth, halfHeight } = shapeDef.circumscribe(contentSize.halfW + padding, contentSize.halfH + padding, params);
// emit：容器 prim（shapeDef.emit，带 node fill/stroke）+ 居中字形 PathPrim（math）/ TextPrim（text）
```

数据流：`IRNode{ shape:'rectangle', fill, stroke, math:{tex} }` → `compile/node.ts` 见 `math` 内容 → `lowerMath` 量 bbox → 任意 shape `circumscribe` 包住（+ padding）→ 定位 → emit 容器 `RectPrim`（node 的 fill/stroke/cornerRadius/alpha.4 效果）+ 居中字形 `PathPrim`。降级同 ADR-01（缺 `lowerMath` → `onWarn(MATH_LOWERER_MISSING)`；非法 tex → `onWarn(MATH_TEX_INVALID)`；容器框仍照画）。

理由：

1. **复用全套 shape 系统**——容器可是 rectangle / circle / ellipse / star / contour 任意 shape，公式作内容自动尺寸，框走 node 常规 `fill` / `stroke` / `cornerRadius` / alpha.4 效果——这是统一内容模型的直接红利。
2. **几乎零增量**——ADR-01 的 `node.math` + `lowerMath` + 内容路径已就位；本 ADR 只把「内容尺寸来源」按 text/math 分派、喂给已有的「shape 包住内容」链路。无新 IR / 注入点。
3. **单一公式模型**——同 `node.math`，有无 shape 只决定有无容器框（解评审 BLOCKING 2，无 `shape:'math'` 双轨）。

## 待决策点 🔻

- **text 与 math 并存语义**：node 同给 `text` 和 `math` 时——倾向 `math` 优先（忽略 text）+ `onWarn`（ADR-01 已定此口径，本 ADR 沿用）；不做「text + math 堆叠」（多内容块超本轮）。
- **内容内边距 padding**：容器包公式的留白。倾向复用 node 既有 text padding 语义（同一字段、同一默认），公式与文本一致；具体默认值实现期按快照定。
- **非矩形容器的公式定位**：circle / star 等容器内公式居中即可（公式 AABB 中心对齐容器中心）；不做「贴合容器内切区域」的精细排布（超本轮）。

## DSL 表面

react：

```tsx
import { TexProvider } from '@retikz/tex/react';
<TexProvider>
  <Layout>
    {/* 带框公式：rectangle 容器 + 公式内容，框填色描边 + alpha.4 效果 */}
    <Node id="box" position={[0, 0]} shape="rectangle" fill="#eef" stroke="#33f" math={{ tex: 'E = mc^2' }} shadow="sm" />
    {/* 圆形容器 */}
    <Node id="circ" position={[80, 0]} shape="circle" fill="white" math={{ tex: '\\oint_C' }} />
    <Path><Step kind="move" to="box" /><Step kind="line" to="circ" /></Path>
  </Layout>
</TexProvider>
```

vanilla：

```ts
import { createLowerMath } from '@retikz/tex';
import { figure, node } from '@retikz/vanilla';
const lowerMath = createLowerMath(await startMathJax());
figure([node('box', { position: [0, 0], shape: 'rectangle', fill: '#eef', math: { tex: 'E = mc^2' } })]);
// toScene(fig, { lowerMath })
```

## 测试设计

`packages/core/core/tests/compile/node-math.test.ts`（与 ADR-01 共文件，扩「+ 容器 shape」case）覆盖：带框公式尺寸、任意容器、容器 fill/stroke + 效果共存、padding、降级时框仍画。具体见「实现契约 § 测试象限」。

## 影响

- **core**：`compile/node.ts`——「内容尺寸来源」按 text/math 分派后喂任意 shape `circumscribe`；emit 容器 + 居中字形。**无新 IR 字段 / 无新注入点**（全复用 ADR-01）。
- **`@retikz/tex/react` / `@retikz/vanilla`**：`<Node shape math>` / `node(...,{shape,math})` 透传（schema 已支持，无新 API）。
- **对外 API**：无新增（ADR-01 的 `node.math` 即够）；纯能力扩展。
- **renderer**：零改动。
- **文档站**：带框公式双语页 + demo（任意容器、fill/效果叠加）。

## 不在本 ADR 范围

- **独立公式块（A）/ `node.math` 机制 / `lowerMath` 注入** —— [ADR-01](./01-tex-package-and-node-math.md)。
- **行内 text+math 混排（C）** —— [ADR-03](./03-inline-math-runs.md)（本 ADR 只做「整个 node 内容是公式」）。
- **node 内 text + math 堆叠 / 多内容块** —— 超本轮（math 与 text 互斥）。
- **容器内切区域精细排布 / 公式自动换行** —— 居中即可，留后续。

---

## 实现契约（必填）🔻

### Level

`yellow`——主要动 `packages/core/core/src/compile/node.ts`（内容尺寸分派 + emit 合成），**不动 `ir/**` schema**（复用 ADR-01 的 `node.math`）。若与 ADR-01 同窗口实现，整体随 ADR-01 走红；独立实现则黄级。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| — | — | 无 | — | — | **无新 schema**：复用 ADR-01 的 `IRNode.math` + `CompileOptions.lowerMath` |

### 文件 scope

- core：`compile/node.ts`（内容尺寸来源 text/math 分派 + 任意 shape circumscribe + emit 容器 + 居中字形）；如需，`compile/text-metrics.ts` 邻近的内容尺寸抽象
- 测试：`packages/core/core/tests/compile/node-math.test.ts`（扩「+ 容器 shape」case）
- `apps/docs/**`（stage 4）
- **不动**：`ir/**`（无新字段）、`render/src/**`、`@retikz/tex` 引擎（复用 ADR-01 `createLowerMath`）

### 测试象限（≥9）

**Happy（≥3）**：`framed-math-sizes-container`（`shape:'rectangle', math:{tex}` → 容器尺寸 = 公式 bbox + padding）；`emit-frame-and-glyphs`（emit 容器 `RectPrim` + 居中字形 `PathPrim`）；`any-shape-container`（circle / ellipse 容器同样包住公式）；`container-fill-stroke`（容器 `fill` / `stroke` / `cornerRadius` 生效、与公式共存）。

**边界（≥2）**：`empty-math-framed`（`tex=''` + shape → 容器退化 / 不崩）；`displayMode-framed`（display vs inline 容器尺寸不同）；`padding-applied`（公式与容器边有 padding 留白）。

**错误路径（≥2）**：`lowermath-missing-framed`（有 math + shape 但未注入 `lowerMath` → `onWarn(MATH_LOWERER_MISSING)` + 仍画空框，不抛）；`invalid-tex-framed`（非法 tex → `onWarn(MATH_TEX_INVALID)` + 占位 / 空框，不抛）。

**交互（≥2）**：`framed-math-connectable`（带框公式 node 可连线，boundaryPoint 走容器 shape 而非 AABB）；`framed-math-with-effects`（容器 + 公式 + shadow / blend 共存，效果落容器与字形）；`compass-anchor-shape`（容器 compass anchor 走 shape 几何）。

**round-trip（≥1）**：含 `shape` + `math` 的 IRNode JSON 往返深等（schema 同 ADR-01，验证组合形态）。

### 依赖的现有元素

- [ADR-01](./01-tex-package-and-node-math.md) 的 `node.math` + `options.lowerMath` + math 内容编译路径 + warn code —— **共用**（本 ADR 的地基）。
- `compile/node.ts` 的「内容 → shape circumscribe → emit 容器 + 居中内容」链路（text 版）—— **扩展**（内容尺寸来源按 text/math 分派）。
- `shapes/types.ts` 的 `ShapeDefinition.circumscribe` / `emit` / `boundaryPoint` / `anchor` —— **引用**（任意容器包住公式 + 连线 / anchor 走 shape）。
- `primitive/{rect,ellipse,path}.ts`—— **引用**（容器 prim + 字形 path）。
