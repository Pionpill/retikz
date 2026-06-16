# ADR-02：Scene blend mode（混合模式）—— 图元级 renderer-agnostic 混合

- 状态：Accepted（2026-06-16 完工）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.4 roadmap](./roadmap.md) · [v0.4 roadmap 候选 F](../roadmap.md) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · `primitive/scene.ts`（Scene 契约）· [ADR-01 drop shadow（同享接线骨架）](./01-scene-drop-shadow.md)

> **范围**：F2「blend mode」——给 Scene 图元加混合模式。F1「drop shadow」见 [ADR-01](./01-scene-drop-shadow.md)。

## 背景

blend mode 让图元与其下方已绘内容按 W3C compositing 公式混合（multiply 压暗、screen 提亮、overlay 增强对比…），是叠色高亮、热力叠加、艺术效果的通用能力。三端原生对应、值名同源：

- SVG：`mix-blend-mode: multiply | screen | …`。
- 浏览器 Canvas / Node `@napi-rs/canvas`：`ctx.globalCompositeOperation = 'multiply' | …`。**已实测 Node `@napi-rs/canvas` 支持全部 15 个非 normal 分离模式**（0 个不支持），无需降级。

两套共享 W3C 的 16 个**分离式 blend 模式**（normal / multiply / screen / overlay / darken / lighten / color-dodge / color-burn / hard-light / soft-light / difference / exclusion / hue / saturation / color / luminosity）；取这个交集即 renderer-agnostic，且**混合数学按 W3C 规范两端逐式相同**（结果像素级一致，差异只在「与谁混合」即 backdrop / isolation）。

## 决策：图元级可选 `blendMode` 闭集枚举，作用于元素主几何图元，编译期透传、各 renderer 翻译

给 `IRNode` / `IRPath` 加可选 `blendMode`，随 `opacity` 同路透传；SVG emit `mix-blend-mode`、Canvas 在 draw 前 set `globalCompositeOperation`。缺省 / `normal` → 逐字不变。

```ts
// ir/effects.ts（与 DropShadow 同文件）
export const BlendMode = {
  Normal: 'normal', Multiply: 'multiply', Screen: 'screen', Overlay: 'overlay',
  Darken: 'darken', Lighten: 'lighten', ColorDodge: 'color-dodge', ColorBurn: 'color-burn',
  HardLight: 'hard-light', SoftLight: 'soft-light', Difference: 'difference', Exclusion: 'exclusion',
  Hue: 'hue', Saturation: 'saturation', Color: 'color', Luminosity: 'luminosity',
} as const;
export type BlendModeValue = ValueOf<typeof BlendMode>;

// IRNode / IRPath 字段
blendMode: z.enum(BlendMode).optional().describe(
  'How this element’s primary geometry blends with the content already drawn beneath it (W3C separable blend modes); maps to CSS mix-blend-mode (SVG) and ctx.globalCompositeOperation (Canvas). Omitted / `normal` = ordinary source-over.',
);
```

**已拍板决策**：

1. **枚举 = 全 16 个分离模式**（含 `normal`），用 const-object enum（`BlendMode` 大驼峰常量 + `z.enum`，对齐 `DrawWay` 惯例）；`normal` 保留为显式值（= 省略，便于显式覆盖）。
2. **字段名 = `blendMode`**。
3. **作用范围 = 仅 element 级、跟随图元本身（主几何 + 其上端点箭头）**（同 [ADR-01](./01-scene-drop-shadow.md)）：Node `blendMode` → shape 几何图元；Path → 主 `PathPrim`，**含其端点箭头**（SVG `mix-blend-mode` 是元素级、Canvas 同一绘制过程，两端原生即把箭头一起混合）。**不**作用于 text / label / pin / step label 这些独立图元，不动 `GroupPrim`、不经 `IRScope` 级联。
4. **跨端一致语义（解红线冲突，见下「跨端语义」）**。
5. **Node 支持**：三端原生（已实测），无降级分支。

### 跨端语义（renderer-agnostic 可测口径）

定义 IR 语义为：**`blendMode` 让该图元与「同一 Scene 内在它之前绘制的全部内容（accumulated backdrop）」按 W3C 分离公式混合**。

- **首切 element 级、不引入额外 isolation**：SVG 端 emit `mix-blend-mode` 时**不**额外包裹 isolation group（`isolation:isolate`），故其 backdrop = 当前 stacking context 内已绘内容；Canvas 端 `globalCompositeOperation` 的 backdrop = 当前 canvas 已绘内容。扁平 Scene（无嵌套隔离）下两者 backdrop 相同 → **混合结果两端一致**（W3C 公式相同）。
- **可测口径**：两个重叠图元、上图元 `blendMode='multiply'`。Canvas 端用真实 `@napi-rs/canvas` 光栅化、断言交叠区中心像素被 multiply 压暗；SVG 端因 node 测试环境无 SVG 光栅器，退一步断言**emit 出相同的 blend 指令**（`mix-blend-mode:multiply`，与 Canvas GCO 同源、W3C 公式相同 → 结果等价）。见测试象限 `blend-cross-backend-parity`。待引入 SVG 光栅器后可升级为两端逐像素对比。
- **划归延后的分歧面**：嵌套 group 的 isolation（SVG stacking-context 隔离 vs Canvas 全局合成在「成组后再与外部混合」上的差异）只在 **group / scope 级混合**出现——而 group 级本就划归延后（见「不在本 ADR 范围」）。故 element 级首切**不破红线**：扁平场景两端一致且可测，分歧面随 group 级一并延后。

理由：

1. **renderer-agnostic 交集 + 同式数学**——只取三端共有的 16 分离模式，混合公式 W3C 统一，element 级扁平场景结果一致、可像素测。
2. **复用 opacity / shadow 管线**——与 [ADR-01](./01-scene-drop-shadow.md) 同骨架。
3. **闭集枚举、LLM 友好**——固定值集，非法值 schema parse 边界拒绝；CSS blend 名是 LLM 训练高频词。

## DSL 表面

react：

```tsx
<Node position={[0, 0]} shape="circle" fill="magenta" blendMode="multiply">overlap</Node>
<Path stroke="cyan" blendMode="screen"><Step kind="move" to="A" /><Step to="B" /></Path>
```

vanilla（`node` / `draw` config 经 `Omit<IR*>` 自动派生 `blendMode`）：

```ts
import { figure, node, draw } from '@retikz/vanilla';
const fig = figure([
  node('a', { position: [0, 0], shape: 'circle', fill: 'magenta', blendMode: 'multiply' }),
  draw(['(A)', '(B)'], { stroke: 'cyan', blendMode: 'screen' }),
]);
```

## 影响

- **附属图元继承语义**：blendMode 跟随图元本身——主几何 + Path 端点箭头（同 shadow）；text / label / pin / step label 这些独立图元不继承。文档写清。
- **跨端 isolation 差异**：element 级扁平场景两端一致（可测）；嵌套隔离差异随 group 级延后——文档须说明「首切为 element-与-backdrop 混合，组级隔离后续」。
- **renderer**：SVG `buildPrimRaw` 各几何 case emit `style="mix-blend-mode:…"`；Canvas `drawPrim` 包 `withBlend`（set `globalCompositeOperation`、draw 后 restore `'source-over'`）。
- **对外 API**：新增 `blendMode` prop / IR 字段 + `BlendMode` 公开常量，optional / additive，无 breaking。
- **文档站**：blend 双语说明 + demo（multiply / screen 叠色、三端一致性 + isolation 注脚）。

## 不在本 ADR 范围

- **drop shadow** —— [ADR-01](./01-scene-drop-shadow.md)。
- **group / scope 级组混合（isolation + 离屏合成）** —— 首切仅 element 主几何；组混合需 `GroupPrim` 加视觉属性 + 离屏合成，是嵌套 isolation 跨端分歧的归属地，留后续。
- **非分离 blend / PorterDuff 全集 / 自定义合成** —— 只取三端共有 16 分离模式。
- **mask / clip 类合成** —— clip 已覆盖硬边裁剪。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/**`、`primitive/**`、`compile/**`、`render/**`、新增公开导出（`BlendMode` 经 `src/index.ts`）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/effects.ts` | 加 | `BlendMode` + `BlendModeValue` | const-object enum（16 值） | — | W3C 分离 blend 模式集 |
| `packages/core/core/src/ir/node.ts` | 加 | `blendMode` | `z.enum(BlendMode).optional()` | `normal`（= 省略） | node 主形状混合 |
| `packages/core/core/src/ir/path/path.ts` | 加 | `blendMode` | `z.enum(BlendMode).optional()` | `normal` | path 主路径混合 |
| `packages/core/core/src/shapes/types.ts` | 加 | `blendMode`（`ShapeStyle`） | `BlendModeValue \| undefined` | — | 透传进 shape emit |
| `packages/core/core/src/primitive/{path,rect,ellipse}.ts` | 加 | `blendMode` | `BlendModeValue \| undefined` | — | 几何图元属性 |

`TextPrim` / `GroupPrim` **不加**。字段名 / 枚举值写死。

### 文件 scope

- `ir/effects.ts`（与 ADR-01 共建 / 改）、`ir/node.ts`、`ir/path/path.ts`（改）
- `shapes/types.ts`、`primitive/{path,rect,ellipse}.ts`、`primitive/index.ts`、`src/index.ts`（导出 `BlendMode`）（改）
- `compile/node.ts`（`toShapeStyle` 透传）、`compile/path/index.ts`（`PathBaseProps` 透传）（改）
- `render/src/svg/builders/prim.ts`（emit `mix-blend-mode`）、`render/src/canvas/draw-scene.ts`（`withBlend`）（改）
- `tests/compile/{node,path}-blend.test.ts`（新建）；`render/tests/**` blend 三端 + 跨端 parity 测试（新建）
- `react/src/kernel/{Node,Path}.tsx` + 测试；`apps/docs/**`（blend 页 + demo）

### 测试象限（≥9）

**Happy（≥3）**：`node-blend`（Node + `blendMode='multiply'` → shape 图元带 blendMode，SVG 出 `mix-blend-mode` / Canvas set GCO）；`path-blend`；`all-16-modes-accepted`（16 个值 schema 全过 + 各自 emit 正确字符串）。

**边界（≥2）**：`blend-omitted-noop`（不设 → 图元无 blendMode、渲染逐字不变）；`blend-normal-equals-omitted`（`blendMode='normal'` 渲染等价省略）。

**错误路径（≥2）**：`reject-unknown-mode`（`blendMode='glow'` 等枚举外值 → schema 拒）；`reject-non-string`（数字 / null → 拒）。

**交互（≥2）**：`blend-cross-backend-parity`（两重叠图元 + 上层 multiply：SVG 光栅 vs Canvas 像素近似一致，验证跨端语义口径）；`blend-text-not-inherited`（Node text + blendMode → text 图元不带）；`blend-with-opacity-shadow`（blendMode + opacity + shadow 三者共存正确）。

**round-trip（≥1）**：含 blendMode 的 IR JSON 往返 parse 深等。

### 依赖的现有元素

- `opacity` 全链路 —— **参照实现**（blendMode 镜像）。
- `withOpacity`（`render/canvas/draw-scene.ts`）—— **参照**（save/set GCO/draw/restore）。
- `ValueOf` + `DrawWay` const-object enum 惯例（仓库代码风格）—— **参照**（`BlendMode` 形态）。
- [ADR-01](./01-scene-drop-shadow.md) 的 `ir/effects.ts` / `ShapeStyle` / primitive / 透传骨架 —— **共建**（两 ADR 同骨架，建议同窗口实现避免重复改同文件）。
