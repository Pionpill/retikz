# @retikz/vanilla

Framework-free runtime + SSR entry for [retikz](https://pionpill.github.io/retikz/). No JSX, no UI framework — mount a diagram to the DOM, render it to an SVG string on the server, or compose one with a plain spec.

retikz 的无框架 runtime / SSR 入口：不依赖任何 UI 框架。`renderToSvgString` 走服务端 / 构建期（零 DOM）产 SVG 字符串；`mount` / `mountSvg` / `mountCanvas` 在浏览器把图形挂到 DOM；`hydrate` 绑定 SSR 或已挂载图形的事件；plain spec helper（`figure` / `layer` / `node` / `path` / `coordinate` / `scope` / `embed`）产同一份 core IR。组合 `@retikz/render` 内核，不自维护第二套渲染逻辑。

## Install

```bash
pnpm add @retikz/vanilla @retikz/core @retikz/render
```

## Render IR / Scene

```ts
import { renderToSvgString, mountSvg, mountCanvas } from '@retikz/vanilla';

// server / build time — no DOM
const svg = renderToSvgString(ir);

// browser
mountSvg(document.querySelector('#diagram')!, ir);
mountCanvas(document.querySelector('#canvas-diagram')!, ir, { width: 640, height: 360 });
```

## Plain spec

```ts
import { figure, layer, mount, node, path, renderToSvgString, VanillaLayerCache } from '@retikz/vanilla';

const spec = figure({
  id: 'flow',
  layers: [
    layer('main', { cache: VanillaLayerCache.Static }, [
      node('a', { position: [0, 0], text: 'A' }),
      node('b', { position: [120, 0], text: 'B' }),
      path('edge', { way: ['a', 'b'], marks: [{ pos: 1, mark: { kind: 'arrow' } }] }),
    ]),
  ],
});

const svg = renderToSvgString(spec);
mount(document.querySelector('#diagram')!, spec);
```

## Exports

- Runtime: `renderToSvgString`, `mount`, `mountSvg`, `mountCanvas`, `hydrate`
- Views: `VanillaView` from `mountSvg` exposes `root`, `update`, `hydrate`, `dispose`, and `animation`; `CanvasView` from `mountCanvas` also exposes `clientToScene`
- Plain spec: `figure` / `layer` / `node` / `path` / `coordinate` / `scope` / `embed`, plus `VanillaTier2Adapter` for explicit Tier 2 embedding
- Legacy builder: `legacyFigure` and `draw` remain available for migration, but new docs and new features use plain spec
- Hydration: `HydrationHandlers`, `HydrationContext`, `HydrationHandler`, `RetikzEventValue`, and related runtime types
- Animation: `blink`, `fadeIn`, `drawOn`, `loop`, `stagger`, `AnimationControls`, custom easing / animation-property types, and `view.animation`
- Extension registrars: `defineArrow`, `defineBoundary`, `defineClip`, `definePattern`, `definePathGenerator`, `definePathKind`, `defineRibbonWidthProfile`, plus their definition / context types

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
