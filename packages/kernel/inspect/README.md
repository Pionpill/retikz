# @retikz/inspect

Optional Inspector definitions, runtime selection, and host wiring for retikz compile outputs.

```bash
pnpm add @retikz/inspect
```

```tsx
import { createDefaultInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';

const registry = createDefaultInspectorRegistry();

<InspectLayout registry={registry}>
  <InspectPath request={{ inspector: STROKE_PATH_INSPECTOR_KEY, value: true }}>{/* Path props */}</InspectPath>
</InspectLayout>;
```

Entry points:

- `@retikz/inspect` provides Inspector definitions, registries, selection, diagnostics, and the built-in stroke Path Inspector
- `@retikz/inspect/react` provides optional Layout, Scope, and Path wrappers plus the React compile driver
- `@retikz/inspect/vanilla` provides opaque authoring markers and the Vanilla compile driver
- `@retikz/inspect/render` maps an inspection plane to `@retikz/render` readonly layers

Core remains domain-neutral: it publishes final owner outputs, observes final occurrences, and compiles isolated ordinary-IR fragments. This package owns Inspector-specific schemas, selection, palettes, diagnostics, and plane assembly. Selection is runtime-only and never enters IR, Scene, or Runtime snapshots. Ordinary Core, React, Vanilla, and Render usage does not require this package or run Inspector compilation.

See the [Inspect package guide](https://pionpill.github.io/retikz/kernel/packages/inspect) for custom Definitions, Standard layout integration, and failure semantics.
