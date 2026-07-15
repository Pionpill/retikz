# @retikz/render

Rendering backends for [retikz](https://pionpill.github.io/retikz/). Consumes a compiled `Scene` from [`@retikz/core`](https://www.npmjs.com/package/@retikz/core) and renders it. The package has no root export; use the documented subpaths below.

retikz 的渲染后端：消费 `@retikz/core` 编译出的 `Scene`，按使用环境走子路径。`./svg` 产出 framework-neutral 的 `SvgNode` 描述树与字符串；`./canvas` 直接绘制到 Canvas 2D，不经 SVG 中转；`./canvas-node` 在 Node 环境通过可选 peer 渲染；`./hydration` 与 `./animation` 提供适配器复用的交互和动画运行时能力。

> Merged from the former `@retikz/svg` + `@retikz/canvas`. / 由原 `@retikz/svg` + `@retikz/canvas` 合并而来。

## Install

```bash
pnpm add @retikz/render @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

Node Canvas output additionally needs the optional peer:

```bash
pnpm add @napi-rs/canvas
```

## Public Subpaths

| Subpath                      | Use                                                                                           | Environment                    | Optional peer     |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------ | ----------------- |
| `@retikz/render/svg`         | Build an `SvgNode` descriptor tree, SVG fragment, or SVG string from a compiled `Scene`.      | Browser, Node, SSR, build time | None              |
| `@retikz/render/canvas`      | Draw a compiled `Scene` into a Canvas 2D context or an `HTMLCanvasElement`.                   | Browser Canvas 2D hosts        | None              |
| `@retikz/render/canvas-node` | Render a compiled `Scene` to a Node canvas and export image bytes.                            | Node.js                        | `@napi-rs/canvas` |
| `@retikz/render/hydration`   | Locate rendered SVG/Canvas nodes and bind runtime interaction or animation controllers.       | Browser DOM hosts              | None              |
| `@retikz/render/animation`   | Shared animation evaluation, clocks, runtime, easing, and custom property registry utilities. | Browser and Node runtimes      | None              |

## `@retikz/render/svg`

Framework-neutral, zero React. Build an `SvgNode` descriptor tree or serialize straight to a string.

```ts
import { buildSvgDocument, renderToSvgString } from '@retikz/render/svg';

const svg = renderToSvgString(scene, { idPrefix: 'doc-1' }); // string, no DOM
const node = buildSvgDocument(scene, { idPrefix: 'doc-1' }); // SvgNode tree
```

`idPrefix` is required so defs, fragment references, and animation names remain deterministic across SSR, hydration, and multiple diagrams on one page. Arbitrary external prefixes are accepted; unsafe characters are normalized internally before SVG ids and CSS class names are emitted.

Exports include `SvgNode` / `SvgAttrs` / `SvgStyle` types, `buildSvgDocument` / `buildSvgFragment`, `renderToSvgString`, and the neutral helpers `buildPathD` / `buildTransform` / `formatViewBox`.

## `@retikz/render/canvas`

Draws a `Scene` to a Canvas 2D context. Gradients, patterns, images, clips, markers, shadows, blend modes, and supported animation channels are drawn directly.

```ts
import { drawScene, renderToCanvas } from '@retikz/render/canvas';

drawScene(ctx, scene); // low-level: draw into a 2D context
renderToCanvas(canvasElement, scene); // convenience
```

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
