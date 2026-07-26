# @retikz/standard-vanilla

Framework-free authoring bindings for [`@retikz/standard`](../standard). It
provides Grid, Axes, and Frame builders plus explicit Vanilla adapters for
normalization, SSR, and mount workflows.

## Install

```bash
pnpm add @retikz/standard-vanilla @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { frame, frameTitle, StandardVanillaAdapters } from '@retikz/standard-vanilla';

const group = frame('contract', {
  title: frameTitle({ text: 'Definition contract' }),
  children: [{ type: 'node', position: [0, 0], text: 'defineXxx()' }],
});
```

`StandardVanillaAdapters` is an explicit all-capabilities convenience array.
Callers can still pass only the adapters they use, while direct persisted IR
uses a bundle from `@retikz/standard`.

See the [Standard documentation](https://pionpill.github.io/retikz/standard/introduction)
for complete examples.
