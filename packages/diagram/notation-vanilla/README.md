# @retikz/notation-vanilla

Framework-neutral Input bindings for [`@retikz/notation`](../notation). Every
helper returns an `InputEmbed`, and explicit InputEmbed adapters lower those
embeds for SSR and mount workflows.

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
  ConnectorInputEmbedAdapter,
  stage,
  StageInputEmbedAdapter,
  terminal,
  TerminalInputEmbedAdapter,
} from '@retikz/notation-vanilla';

const children = [
  terminal('start', { position: [0, 0], text: 'Start' }),
  stage('step', { position: [160, 0], text: 'Process' }),
  connector('edge', { way: ['start', DrawWay.Hv, 'step'] }),
];
const adapters = [TerminalInputEmbedAdapter, StageInputEmbedAdapter, ConnectorInputEmbedAdapter];
```

LogicFrame, Terminal, Stage, Decision, Junction, and Connector helpers and
adapters cover the complete Notation family. Semantic units and Connector
reuse the embed id as the canonical Notation IR id; LogicFrame derives stable
nested ids for its outer composite. Connector accepts
either canonical Step `children` or authoring-only `way`.
Direct persisted IR uses selected Definitions from `@retikz/notation` through
Core compile options.

See the [Notation documentation](https://pionpill.github.io/retikz/diagram/notation)
for complete examples.
