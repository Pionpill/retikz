# @retikz/tex

Optional TeX formula support for [retikz](https://pionpill.github.io/retikz/). It turns MathJax SVG output into renderer-agnostic glyph paths and injects that capability into `@retikz/core` through `lowerTex`.

## Install

```bash
pnpm add @retikz/tex mathjax-full
```

`mathjax-full` is an optional peer dependency. Install it when you call `createMathJaxEngine()` or `useLowerTex()`. If you already have a compatible TeX-to-SVG runtime, inject your own `MathJaxSvgEngine` instead.

React users also need `react >= 18` for the `@retikz/tex/react` subpath.

## React

```tsx
import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

export const Diagram = () => {
  const lowerTex = useLowerTex();

  return (
    <Layout lowerTex={lowerTex}>
      <Node position={[0, 0]}>{'$\\frac{a}{b}=c$'}</Node>
    </Layout>
  );
};
```

`useLowerTex()` starts MathJax asynchronously and returns `LowerTex | undefined`. While it is `undefined`, core treats formula-bearing text as missing a lowerer and emits its normal diagnostics instead of crashing.

## Vanilla / core injection

```ts
import { figure, node, renderToSvgString } from '@retikz/vanilla';
import { createLowerTex, createMathJaxEngine } from '@retikz/tex';

const engine = await createMathJaxEngine({ packages: ['base'] });
const lowerTex = createLowerTex(engine);

const fig = figure([node('eq', { position: [0, 0], text: '$\\frac{a}{b}=c$' })]);
const svg = renderToSvgString(fig, { lowerTex });
```

`createMathJaxEngine(options?)` defaults to `packages: ['base']`. Pass additional MathJax TeX packages only when the app needs them.

## API

| API                    | Type                                                            | Description                                                                                              |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `createMathJaxEngine`  | `(options?: MathJaxEngineOptions) => Promise<MathJaxSvgEngine>` | Dynamically imports the optional `mathjax-full` SVG stack and creates a synchronous TeX-to-SVG engine.   |
| `MathJaxEngineOptions` | `{ packages?: Array<string> }`                                  | Options for MathJax TeX input. `packages` defaults to `['base']`.                                        |
| `MathJaxSvgEngine`     | `{ convert(tex, options): string }`                             | Minimal engine contract consumed by this package. Custom engines can implement it directly.              |
| `createLowerTex`       | `(engine: MathJaxSvgEngine) => LowerTex`                        | Converts an engine into core's `lowerTex` injection function and caches by `fontSize \| display \| tex`. |
| `useLowerTex`          | `() => LowerTex \| undefined`                                   | React hook from `@retikz/tex/react`; creates and caches the default MathJax engine.                      |

Parser helpers such as `parseMathJaxSvg`, `parsePathD`, and `parseTransform` are implementation details and are not exported from the root package entry.

## Failure semantics

- Missing `mathjax-full` makes `createMathJaxEngine()` reject with an install hint.
- MathJax `<merror>` output lowers to `null`.
- Engine conversion or SVG parsing failures lower to `null`; core then reports `TEX_INVALID`.
- Unsupported or malformed SVG transforms are treated as parser failures instead of silently applying identity transforms.
- Without an injected `lowerTex`, core leaves ordinary `$` text compatible and reports missing-lowerer diagnostics only for content that needs formula lowering.

## License

MIT
