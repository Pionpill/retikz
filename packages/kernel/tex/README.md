# @retikz/tex

Optional TeX formula support for [retikz](https://pionpill.github.io/retikz/). It turns MathJax SVG output into renderer-agnostic glyph paths and injects that capability into `@retikz/core` through `lowerTex`.

## Install

```bash
pnpm add @retikz/tex mathjax-full
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

`mathjax-full` is an optional peer dependency. Install it when you call `createMathJaxEngine()` or `useLowerTex()`. If you already have a compatible TeX-to-SVG runtime, inject your own `MathJaxSvgEngine` instead.

React users also need `react >= 18` for the `@retikz/tex/react` subpath.

## React

```tsx
import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';

export const Diagram = () => {
  const lowerTexState = useLowerTex({ profile: 'math' });

  return (
    <Layout lowerTex={lowerTexState.status === 'ready' ? lowerTexState.lowerTex : undefined}>
      <Node position={[0, 0]}>{'$\\frac{a}{b}=c$'}</Node>
    </Layout>
  );
};
```

`useLowerTex()` starts MathJax asynchronously and returns a `MathJaxLowerTexState`. Use `lowerTex` only in the `ready` state; `loading` means the engine is still initializing, while `error` provides the startup diagnostic. Engines are shared by the effective extension set, so equivalent profile / extension shorthand reuses one engine; switching that set clears the old lowerer until the new engine is ready. Pass `onDiagnostic` to observe startup and lowering failures.

## Vanilla / core injection

```ts
import { figure, node, renderToSvgString } from '@retikz/vanilla';
import { createMathJaxLowerTex } from '@retikz/tex';

const lowerTex = await createMathJaxLowerTex({ profile: 'math' });

const fig = figure([node('eq', { position: [0, 0], text: '$\\frac{a}{b}=c$' })]);
const svg = renderToSvgString(fig, { compile: { lowerTex } });
```

The default `base` profile keeps MathJax minimal. `math` adds `ams`, `newcommand`, `boldsymbol`, `braket`, `cancel`, `cases`, `centernot`, `mathtools`, and `color`. Individual entries can be appended through `extensions`.

## API

| API                     | Type                                                                        | Description                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createMathJaxEngine`   | `(options?: MathJaxEngineOptions) => Promise<MathJaxSvgEngine>`             | Dynamically imports the optional MathJax stack and selected configurations.                                   |
| `createMathJaxLowerTex` | `(options?: MathJaxLowerTexOptions) => Promise<LowerTex>`                   | Creates the built-in engine and lowerer in one step.                                                          |
| `MathJaxEngineOptions`  | `{ profile?: 'base' \| 'math'; extensions?: Array<MathJaxExtensionValue> }` | Selects a built-in profile and optional extensions.                                                           |
| `MathJaxSvgEngine`      | `{ convert(tex, options): string }`                                         | Minimal engine contract consumed by this package. Custom engines can implement it directly.                   |
| `createLowerTex`        | `(engine: MathJaxSvgEngine, options?: LowerTexOptions) => LowerTex`         | Adapts an engine and caches deterministic results by source, display mode, font size, and host color.         |
| `useLowerTex`           | `(options?: MathJaxLowerTexOptions) => MathJaxLowerTexState`                | React hook from `@retikz/tex/react`; shares engines by effective extensions and reports initialization state. |
| `MathJaxLowerTexState`  | `loading` \| `ready` \| `error`                                             | `ready` provides `lowerTex`; `error` provides the startup diagnostic.                                         |

SVG lowering helpers such as `parsePathD` and `parseTransform` are implementation details and are not exported from the root package entry.

## Failure semantics

- Missing `mathjax-full` makes `createMathJaxEngine()` reject with an install hint.
- `useLowerTex()` reports that startup error as `engine-error` once per shared attempt and retries on a later mount.
- MathJax `<merror>` output lowers to `null`.
- Engine conversion, unsupported SVG, and malformed SVG failures lower to `null`; `onDiagnostic` preserves their category and core reports `TEX_INVALID`.
- `<text>`, `<foreignObject>`, nested `<svg>`, unsupported visual styles, and non-similarity transforms on visible strokes reject the whole formula.
- Without an injected `lowerTex`, core leaves ordinary `$` text compatible and reports missing-lowerer diagnostics only for content that needs formula lowering.

## License

MIT
