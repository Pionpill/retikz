# @retikz/render

Rendering backends for [retikz](https://pionpill.github.io/retikz/). Consumes a compiled `Scene` from [`@retikz/core`](https://www.npmjs.com/package/@retikz/core) and renders it. Exposes one **subpath per backend** — no root export.

retikz 的渲染后端：消费 `@retikz/core` 编译出的 `Scene`，按后端走子路径。`./svg` 出 framework-neutral 的 `SvgNode` 描述树与字符串；`./canvas` 直接绘到 Canvas 2D（不走 SVG 中转）。两后端互不依赖，为后续 `./webgl` 预留命名空间。

> Merged from the former `@retikz/svg` + `@retikz/canvas`. / 由原 `@retikz/svg` + `@retikz/canvas` 合并而来。

## Install

```bash
pnpm add @retikz/render @retikz/core
```

## `@retikz/render/svg`

Framework-neutral, zero React. Build an `SvgNode` descriptor tree or serialize straight to a string (SSR / build time).

```ts
import { renderToSvgString, buildSvgDocument } from '@retikz/render/svg';

const svg = renderToSvgString(scene);          // string, no DOM
const node = buildSvgDocument(scene);          // SvgNode tree
```

Exports: `SvgNode` / `SvgAttrs` / `SvgStyle` types, `buildSvgDocument` / `buildSvgFragment`, `renderToSvgString`, plus the neutral helpers `buildPathD` / `buildTransform` / `formatViewBox`.

## `@retikz/render/canvas`

Draws a `Scene` to a Canvas 2D context — gradients, patterns, images, clips and markers are all really drawn (no SVG round-trip).

```ts
import { drawScene, renderToCanvas } from '@retikz/render/canvas';

drawScene(ctx, scene);                          // low-level: draw into a 2D context
renderToCanvas(canvasElement, scene);           // convenience
```

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
