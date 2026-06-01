# ADR-05：合并 `@retikz/svg` + `@retikz/canvas` → `@retikz/render`（子路径后端）

- 状态：Accepted（实现完成 2026-06-01；render 60 / vanilla 39 / react 298 测试全绿，render build + dist 入口正确，react/vanilla `tsc --noEmit` 0）
- 决策日期：2026-06-01
- 关联：[ADR-01 `@retikz/svg` descriptor 契约](./01-svg-descriptor-contract.md)（其包形态被本 ADR 重打包）· [ADR-02 `@retikz/canvas` + react canvas mode](./02-canvas-renderer-and-react-canvas-mode.md)（同）· [ADR-03 依赖图](./03-vanilla-runtime-and-dependency-graph.md)（#13 依赖图随本 ADR 更新）· [v0.3 roadmap §包拆分目标](../roadmap.md)

> **一句话**：把 ADR-01 / ADR-02 各自独立的 `@retikz/svg`、`@retikz/canvas` 两个包**合并成一个 `@retikz/render`**，以**子路径** `@retikz/render/svg`、`@retikz/render/canvas` 暴露；为后续 `@retikz/render/webgl` 等渲染后端留同一命名空间。**ADR-01 / 02 的渲染设计（SvgNode descriptor、drawScene）完全不变,只改包形态。** 后文 ADR-01 / 02 / 03 / 04 里的 `@retikz/svg` ≡ `@retikz/render/svg`、`@retikz/canvas` ≡ `@retikz/render/canvas`。

## 背景

ADR-01 / ADR-02 把 SVG、Canvas 两条 renderer 拆成独立顶级包 `@retikz/svg` / `@retikz/canvas`(并列、互不依赖)。复盘"5 个包是否偏多"时确认:

- 两个 renderer 包**总是被一起装**(react / vanilla 都同时依赖二者),从没人单独用其一;
- 后续还会出 **WebGL 等更多渲染后端**——若沿用"每后端一个顶级包",顶级包会持续膨胀;
- 业界(Three.js `WebGLRenderer`/`SVGRenderer` 同体系;Vega renderer 模块)把一族渲染后端放**同一命名空间**是主流。

故合并成一个 `@retikz/render` 包,后端走**子路径导出**。包数 5 → 4(`core` / `render` / `vanilla` / `react`)。

## 决策

**`@retikz/render`,子路径暴露每个渲染后端:**

```jsonc
// packages/render/package.json（in-repo 指向 src，publishConfig 指向 dist）
"exports": {
  "./svg":    { "types": "./src/svg/index.ts",    "default": "./src/svg/index.ts" },
  "./canvas": { "types": "./src/canvas/index.ts", "default": "./src/canvas/index.ts" }
}
```

```ts
import { buildSvgDocument, renderToSvgString } from '@retikz/render/svg';
import { drawScene, renderToCanvas } from '@retikz/render/canvas';
// 未来：import { ... } from '@retikz/render/webgl';
```

- **无根 `.` 导出**:强制按后端走子路径,`import from '@retikz/render'` 不解析(避免 barrel 把所有后端拖进来,保 tree-shaking)。
- **依赖**:`@retikz/render` 仅 `@retikz/core` + `csstype`(纯类型);命名空间内 svg / canvas **互不依赖**。
- **vite 多入口**:`lib.entry: ['src/svg/index.ts', 'src/canvas/index.ts']` + `preserveModules`,产 `dist/{es,lib}/{svg,canvas}/...`,publishConfig 子路径对应。

### 关键代价与缓解:包内边界守卫

分包时"svg 不依赖 canvas、canvas 不走 SVG 中转"(ADR-02)由**包边界天然保证**;合包后这层保证**消失**,必须用**包内 import 边界守卫**替代——`packages/render/tests/degrade.test.ts` 双向断言:

- `src/canvas/**` 不含 `render/svg` / `../svg` / `buildSvgDocument` / `renderToSvgString` / `<svg`;
- `src/svg/**` 不含 `render/canvas` / `../canvas` / `drawScene` / `renderToCanvas`。

> 这是合包唯一实质代价:把"包边界"降级成"测试守卫的内部边界"。已落地、绿。

### 依赖图（更新 ADR-03 #13）

```text
@retikz/core
   ├── @retikz/render   （core, csstype[type]）   —— ./svg + ./canvas 子路径；未来 ./webgl
   ├── @retikz/vanilla  （core, render）          —— renderToSvgString/mountSvg 用 render/svg；Figure.toCanvas 用 render/canvas
   └── @retikz/react    （core, render; react peer）—— svgToReact 消费 render/svg；renderer="canvas" 用 render/canvas
```

`@retikz/react` / `@retikz/vanilla` 的依赖从 `svg + canvas`(两条)收成 **`@retikz/render`**(一条)。

## 影响

- **包**:删 `packages/svg` / `packages/canvas`;新增 `packages/render`(`src/svg/*` + `src/canvas/*`,git rename 保历史)。
- **消费方**:react / vanilla 的依赖与 import 全部改走 `@retikz/render/{svg,canvas}`;`package.json` 依赖合成一条。
- **ADR-01 / 02 / 03 / 04**:渲染**设计不变**;仅包名/路径语义改为 render 子路径(各 ADR 顶部加指向本 ADR 的备注,narrative 不逐字重写)。
- **roadmap**:§包拆分目标(svg/canvas 两行 → render 一行)、§定位 依赖图、alpha.1 已交付 bullets 同步。
- **无 breaking**:`@retikz/svg` / `@retikz/canvas` **从未发布过**(npm 仅到 0.2.0-beta.2),故合并不影响任何已发布消费者。

## 不在本 ADR 范围

- `@retikz/render/webgl` 等新后端的实现(本 ADR 只立命名空间与边界守卫模式)。
- 渲染逻辑本身(归 ADR-01 svg / ADR-02 canvas,不变)。

## 实现记录（已完成 2026-06-01）

- 物理:`git mv` svg/canvas 的 `src` → `packages/render/src/{svg,canvas}`、`tests` → `packages/render/tests/`(flat,文件名无冲突);新建 render 的 `package.json`(子路径 exports + publishConfig)/ `tsconfig`(`lib: ESNext+DOM`)/ `tsconfig.node` / `vite.config`(多入口)。
- import:react 10 处 + vanilla 4 处 + 两包测试改走子路径;`deps-guard.test` 依赖断言 → `['@retikz/core', '@retikz/render']`,并把原"canvas 跨包守卫"重写成 render **包内双向边界守卫**。
- 验证:`pnpm install` 重链;`render` 60 / `vanilla` 39 / `react` 298 测试全绿;`render` build 产 `dist/{es,lib}/{svg,canvas}/index.*` + dts;`react` / `vanilla` `tsc --noEmit` 退出 0。
