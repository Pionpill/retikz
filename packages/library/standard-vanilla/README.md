# @retikz/standard-vanilla

Framework-neutral Input bindings for [`@retikz/standard`](../standard). It
provides Grid, Axes, Frame, Legend, and Surface Input helpers plus explicit
InputEmbed adapters for normalization, SSR, and mount workflows.

## Install

```bash
pnpm add @retikz/standard-vanilla @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { frame, frameTitle, StandardInputEmbedAdapters } from '@retikz/standard-vanilla';

const group = frame('contract', {
  title: frameTitle({ text: 'Definition contract' }),
  children: [{ type: 'node', position: [0, 0], text: 'defineXxx()' }],
});
```

`StandardInputEmbedAdapters` is an explicit all-adapters convenience array.
Callers can still pass only the adapters they use. Direct persisted IR uses
the selected `Definition` values from `@retikz/standard` through Core compile
options.

See the [Standard documentation](https://pionpill.github.io/retikz/standard/introduction)
for complete examples.
