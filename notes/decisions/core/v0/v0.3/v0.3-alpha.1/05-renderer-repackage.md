# ADR-05：合并 `@retikz/svg` + `@retikz/canvas` → `@retikz/render`（子路径后端）

- 状态：Accepted（已实现）
- 决策日期：2026-06-01
- 关联：[ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)（其包形态被本 ADR 重打包）· [ADR-02 `@retikz/canvas` + react canvas mode](./02-canvas-renderer-and-react-canvas-mode.md)（同）· [ADR-03 依赖图](./03-vanilla-runtime-and-dependency-graph.md)（依赖图随本 ADR 更新）· [v0.3 roadmap §包拆分目标](../roadmap.md)

> **一句话**：把 ADR-01 / ADR-02 各自独立的 `@retikz/svg`、`@retikz/canvas` 两个包**合并成一个 `@retikz/render`**，以**子路径** `@retikz/render/svg`、`@retikz/render/canvas` 暴露；为后续 `@retikz/render/webgl` 等渲染后端留同一命名空间。**ADR-01 / 02 的渲染设计（SvgNode descriptor、drawScene）完全不变,只改包形态。** 后文 ADR-01 / 02 / 03 / 04 里的 `@retikz/svg` ≡ `@retikz/render/svg`、`@retikz/canvas` ≡ `@retikz/render/canvas`。

## 背景

ADR-01 / ADR-02 把 SVG、Canvas 两条 renderer 拆成独立顶级包（并列、互不依赖）。复盘「5 个包是否偏多」时确认：

- 两个 renderer 包**总是被一起装**（react / vanilla 都同时依赖二者），从没人单独用其一；
- 后续还会出 **WebGL 等更多渲染后端**——沿用「每后端一个顶级包」会让顶级包持续膨胀；
- 业界（Three.js `WebGLRenderer` / `SVGRenderer` 同体系；Vega renderer 模块）把一族渲染后端放**同一命名空间**是主流。

故合并成一个 `@retikz/render`，后端走**子路径导出**。包数 5 → 4（`core` / `render` / `vanilla` / `react`）。

## 决策：单包 `@retikz/render` + 子路径暴露每个后端

```ts
import { buildSvgDocument, renderToSvgString } from '@retikz/render/svg';
import { drawScene, renderToCanvas } from '@retikz/render/canvas';
// 未来：import { ... } from '@retikz/render/webgl';
```

- **无根 `.` 导出**：强制按后端走子路径，`import from '@retikz/render'` 不解析——避免 barrel 把所有后端拖进来，保 tree-shaking。
- **依赖**：`@retikz/render` 仅 `@retikz/core` + `csstype`（纯类型）；命名空间内 svg / canvas **互不依赖**。

### 关键代价与缓解：包内边界守卫

分包时「svg 不依赖 canvas、canvas 不走 SVG 中转」（ADR-02）由**包边界天然保证**；合包后这层保证**消失**，必须用**包内 import 边界守卫**替代——双向断言 `src/canvas/**` 不含 svg 引用 / `buildSvgDocument` / `renderToSvgString` / `<svg`，`src/svg/**` 不含 canvas 引用 / `drawScene` / `renderToCanvas`。

> 这是合包唯一实质代价：把「包边界」降级成「测试守卫的内部边界」。

### 依赖图（更新 ADR-03）

```text
@retikz/core
   ├── @retikz/render   （core, csstype[type]）   —— ./svg + ./canvas 子路径；未来 ./webgl
   ├── @retikz/vanilla  （core, render）          —— renderToSvgString/mountSvg 用 render/svg；Figure.toCanvas 用 render/canvas
   └── @retikz/react    （core, render; react peer）—— svgToReact 消费 render/svg；renderer="canvas" 用 render/canvas
```

`@retikz/react` / `@retikz/vanilla` 的依赖从 `svg + canvas`（两条）收成 **`@retikz/render`**（一条）。

## 不在本 ADR 范围

- `@retikz/render/webgl` 等新后端的实现（本 ADR 只立命名空间与边界守卫模式）。
- 渲染逻辑本身（归 ADR-01 svg / ADR-02 canvas，不变）。

---

> **实现指针**：level `red`（包结构 + 公开 API 路径语义变更）、非 breaking（`@retikz/svg` / `@retikz/canvas` 从未发布过——npm 仅到 0.2.0-beta.2，故合并不影响任何已发布消费者）。物理上 `git mv` 原 svg / canvas 的 `src` → `render/src/{svg,canvas}`、`tests` → `render/tests/`（flat），render 走 vite 多入口 + `preserveModules` 产 `dist/{es,lib}/{svg,canvas}/...`，tsconfig 开 `lib: ESNext+DOM`；react / vanilla 的 import 全改走 `@retikz/render/{svg,canvas}`、`package.json` 依赖合成一条；原「canvas 跨包守卫」重写成 render **包内双向边界守卫**（`render/tests/degrade.test.ts`）。真源以代码为准——`packages/core/render/package.json`（子路径 exports + publishConfig）+ `render/vite.config.ts`（多入口）。

> 🔖 封板压缩 commit `05ed13c2`；压缩前完整施工蓝图 = `git show 05ed13c2^:notes/decisions/core/v0/v0.3/v0.3-alpha.1/05-renderer-repackage.md`。
