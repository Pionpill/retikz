# @retikz/inspect

Optional inspectors for completed retikz compilation results.

```bash
pnpm add @retikz/inspect
```

```tsx
import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectionOverlay } from '@retikz/inspect/react';

// result is the ordinary CompileResult already displayed by the primary host.
<InspectionOverlay
  result={result}
  options={{
    registry: createDefaultInspectorRegistry(),
    requests: [{ inspector: PATH_INSPECTOR_KEY }],
    idPrefix: 'inspection',
  }}
/>;
```

Place the overlay over the primary view using the same viewport and dimensions. Primary compilation and commits remain independent of inspection.

- `@retikz/inspect`: definitions, registries, requests, diagnostics, and auxiliary compilation; built-ins inspect final paths, groups, and clip boundaries
- `@retikz/inspect/react`: the result-consuming `InspectionOverlay` component
- `@retikz/inspect/vanilla`: independent SVG, Canvas, and DOM presentation helpers

Inspect generates ordinary auxiliary IR from Scene primitives or Composite artifacts, then compiles that IR independently. It cannot recover missing authoring geometry or infer artifact coordinates from occurrence locators. Core and Reconciler provide no inspection hooks.

See the [Inspect package guide](https://pionpill.github.io/retikz/kernel/packages/inspect) for definitions, selection, coordinate spaces, and failure behavior.
