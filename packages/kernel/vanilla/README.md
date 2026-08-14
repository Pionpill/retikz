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
import { InputLayerCache, layer, node, path, renderToSvgString, scene } from '@retikz/vanilla';

const input = scene({
  id: 'flow',
  layers: [
    layer('main', { cache: InputLayerCache.Static }, [
      node('a', { position: [0, 0], text: 'A' }),
      node('b', { position: [120, 0], text: 'B' }),
      path('edge', { way: ['a', 'b'], marks: [{ pos: 1, mark: { kind: 'arrow' } }] }),
    ]),
  ],
});

const svg = renderToSvgString(input, { output: { width: 640, height: 360 } });
```

## Browser mounting

```ts
import { mount } from '@retikz/vanilla/dom';

const view = mount(document.querySelector('#diagram')!, input);
view.update(input);
view.dispose();
```

## Exports

- Root: `InputXxx`, `scene`, `layer`, `node`, `path`, `scope`, `embed`, `normalizeScene`, processing APIs, and `renderToSvgString`
- DOM sub-entry: `@retikz/vanilla/dom` exports `mount`, `mountSvg`, `mountCanvas`, and `hydrate`
- Tier 2 packages contribute through `InputEmbedAdapter`; callers provide adapters to the Vanilla processing or render options

Core IR helpers, animation preset factories, and extension registrars such as `DrawWay`, `fadeIn`, `defineArrow`, and `definePathKind` should be imported from `@retikz/core`.

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
