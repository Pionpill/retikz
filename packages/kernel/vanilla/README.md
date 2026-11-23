# @retikz/vanilla

Framework-neutral authoring, processing, and SSR APIs for [retikz](https://pionpill.github.io/retikz/). The root entry is DOM-free; browser mounting is available only from `@retikz/vanilla/dom`.

`InputScene` and `normalizeScene()` are the framework-neutral authoring path. They produce one Core Source IR and ordered Tier 2 contributions; processing resolves those contributions and compiles the Scene. `@retikz/vanilla` does not define Core IR, lowering semantics, or renderer algorithms.

## Install

```bash
pnpm add @retikz/vanilla @retikz/core @retikz/render
```

This package is ESM-only and requires Node.js 24 or newer.

## Authoring and SSR

```ts
import { compileToScene, node, path, renderToSvg, scene } from '@retikz/vanilla';

const input = scene({
  children: [
    node({ id: 'a', position: [0, 0], text: 'A' }),
    node({ id: 'b', position: [120, 0], text: 'B' }),
    path({ id: 'edge', way: ['a', 'b'], marks: [{ pos: 1, mark: { kind: 'arrow' } }] }),
  ],
});

const compileResult = compileToScene(input);
const svg = renderToSvg(compileResult.scene, { output: { width: 640, height: 360 } });
```

## One-shot compilation

```ts
import { compileToScene } from '@retikz/vanilla';

const result = compileToScene(input);
```

This returns the reconciler’s original `CompileResult`: read `result.scene` and `result.artifacts` directly. For retained work, use `new SceneRuntime(ir, options)` for IR or `SceneRuntime.fromInput(input, options)` for authoring input, replace complete IR with `replace(ir)` or authoring input with `replaceInput(input)`, or submit an incremental batch with `update(batch, expected)`. `runtime.current` returns the committed `ReconcilerResult`, and `runtime.diagnostics()` drains session diagnostics. Export the committed frame with `runtime.renderToSvg()`. Use `compileLayers` or `createLayerController` for named layers. Await external data before submitting a source.

## Browser mounting

```ts
import { mount } from '@retikz/vanilla/dom';

const view = mount(document.querySelector('#diagram')!, input);
view.update(input);
view.dispose();
```

## Exports

- Root: `InputXxx`, `scene`, `layer`, `node`, `path`, `scope`, `embed`, `normalizeScene`, processing APIs, and `renderToSvg`
- DOM sub-entry: `@retikz/vanilla/dom` exports `mount`, `mountSvg`, `mountCanvas`, and `hydrate`
- Tier 2 packages contribute through `InputEmbedAdapter`; each embed carries its adapter into compilation

Path authoring grammar and parsers (`DrawWay`, `WayDSL`, `WayItem`, `parseWay`, `parseWayWithTargets`, `parseNodeTarget`, and `parseTargetSugar`) are owned by `@retikz/vanilla`. String targets and Way operators expand into structured Core IR before compilation. Animation preset factories and extension registrars such as `fadeIn`, `defineArrow`, and `definePath` remain available from `@retikz/core`.

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
