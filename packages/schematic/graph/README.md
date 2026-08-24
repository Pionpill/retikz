# @retikz/graph

`@retikz/graph` owns the framework-neutral, JSON-safe Graph Source IR, independent Definition registries, Canonical resolve, and lowering to ordinary Core Scope, Node, and Path inputs.

Graph, Entity, and Relation are independent public semantic composites:

- Graph is an optional thin shell over the complete Core Scope surface, adding local Graph Theme rules
- Entity optionally stores identity together with Node semantics, text, and Core-compatible placement fields; without identity it lowers as drawable-only Core content
- Relation stores Core NodeTarget endpoints, direction, relationship semantics, labels, and an optional route; without a route it lowers to a direct Core Path

Entity and Relation use independent role, kind, and predicate Definitions. They can appear with or without a Graph ancestor, and Graph does not copy Core Shape, Arrow, namespace, or reference registries.

Registry-backed Source fields remain open to custom non-blank keys. Their schemas also expose the built-in `EntityRole`, `RelationRole`, and `RelationKind` values as editor and JSON Schema hints; registration is still validated only during resolve.

## Install

```bash
pnpm add @retikz/graph @retikz/core
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

```ts
import { createEntity, createGraph, createGraphDefinitions } from '@retikz/graph';

const graph = createGraph({
  id: 'workflow',
  children: [createEntity({ id: 'task', role: 'activity', text: 'Process', position: [160, 80] })],
});

const composites = createGraphDefinitions();
```

Omit `children` when a Graph has no entries. Graph keeps arbitrary Core and Tier 2 children in author order and lowers them through one Core Scope; Entity and Relation can also compile directly outside Graph.

Use `createGraphDefinitions(options)` or `createGraphProviders(options)` to assemble built-in and custom Definitions in one assembly-local registry. Different Definition objects competing for the same key fail loudly; imports do not mutate global state.

Graph Theme style Definitions return sparse overrides relative to the mode-aware default preset. A style can change one token without repeating the complete Entity and Relation baseline:

```ts
import { createGraphDefinitions, defineGraphThemeStyle } from '@retikz/graph';

const compact = defineGraphThemeStyle({
  name: 'compact',
  resolve: () => ({
    entity: { tokens: { strokeWidth: 1.5 } },
  }),
});

const composites = createGraphDefinitions({ graphThemeStyles: [compact] });
```

The resolver applies the default preset, sparse style tokens, default rules, custom style rules, Graph-local rules, and explicit Entity / Relation appearance in that order. Custom style rules append after defaults; omitting rules or returning `rules: []` does not clear the built-in rules.

See the [Graph documentation](https://pionpill.github.io/retikz/schematic/graph) for components, Source schemas, and extension examples.
