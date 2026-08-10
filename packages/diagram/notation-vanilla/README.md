# @retikz/notation-vanilla

Framework-free authoring bindings for [`@retikz/notation`](../notation). Every
builder returns a Vanilla embed, and explicit adapters normalize those embeds
to canonical Notation IR for SSR and mount workflows.

## Install

```bash
pnpm add @retikz/notation-vanilla @retikz/notation @retikz/vanilla
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { DrawWay } from '@retikz/core';
import {
  connector,
  ConnectorVanillaAdapter,
  stage,
  StageVanillaAdapter,
  terminal,
  TerminalVanillaAdapter,
} from '@retikz/notation-vanilla';

const children = [
  terminal('start', { position: [0, 0], text: 'Start' }),
  stage('step', { position: [160, 0], text: 'Process' }),
  connector('edge', { way: ['start', DrawWay.Hv, 'step'] }),
];
const adapters = [TerminalVanillaAdapter, StageVanillaAdapter, ConnectorVanillaAdapter];
```

LogicFrame, Terminal, Stage, Decision, Junction, Connector, and Callout
builders and adapters cover the complete Notation family. Semantic units and
Connector reuse the embed id as the canonical Notation IR id; LogicFrame and
Callout derive stable nested ids for their outer composites. Connector accepts
either canonical Step `children` or authoring-only `way`.
Direct persisted IR uses selected Definitions from `@retikz/notation` through
Core compile options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for complete examples.
