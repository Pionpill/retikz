# @retikz/notation-vanilla

Framework-free authoring bindings for [`@retikz/notation`](../notation). It
provides Notation builders plus explicit Vanilla adapters for normalization,
SSR, and mount workflows.

## Install

```bash
pnpm add @retikz/notation-vanilla @retikz/notation @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { logicFrame, stage } from '@retikz/notation-vanilla';

const group = logicFrame('contract', {
  sections: [{ key: 'body', child: stage('body', { position: [0, 0], text: 'Notation' }) }],
});
```

Callers can pass only the adapters they use. Direct persisted IR uses the
selected `Definition` values from `@retikz/notation` through Core compile
options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for complete examples.
