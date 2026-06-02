# @retikz/vanilla

Framework-free runtime + SSR entry for [retikz](https://pionpill.github.io/retikz/). No JSX, no UI framework — mount a diagram to the DOM, render it to an SVG string on the server, or compose one with an imperative named builder.

retikz 的无框架 runtime / SSR 入口：不依赖任何 UI 框架。`renderToSvgString` 走服务端 / 构建期（零 DOM）产 SVG 字符串；`mountSvg` 在浏览器把图形挂到 DOM；命令式 builder（`figure`/`node`/`draw`/`coordinate`/`scope`）让你像 React 一样具名构图、产同一份 IR。组合 `@retikz/render` 内核，不自维护第二套渲染逻辑。

## Install

```bash
pnpm add @retikz/vanilla @retikz/core @retikz/render
```

## Render IR / Scene

```ts
import { renderToSvgString, mountSvg } from '@retikz/vanilla';

// server / build time — no DOM
const svg = renderToSvgString(ir);

// browser
mountSvg(document.querySelector('#diagram'), ir);
```

## Imperative builder

```ts
import { figure, node, draw } from '@retikz/vanilla';

const fig = figure([
  node('a', { position: [0, 0], text: 'A' }),
  node('b', { position: [120, 0], text: 'B' }),
  draw(['a', 'b'], { arrow: '->' }),
]);

const svg = fig.toSvgString();   // also: fig.mount(el) / fig.toCanvas(canvas)
```

## Exports

- Runtime: `renderToSvgString`, `mountSvg`
- Builder: `figure` / `node` / `draw` / `coordinate` / `scope` + the `Figure` view (`.toSvgString` / `.mount` / `.toCanvas`)

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
