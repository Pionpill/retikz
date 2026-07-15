# @retikz/data

`@retikz/data` is the framework-independent data foundation for retikz visualization packages. It owns serializable data models, field resolution and normalization, shared data transforms, extension registries, and runtime provenance.

Real dataset rows stay outside the IR and enter at runtime. This package prepares rows for consumers such as `@retikz/plot`; it does not define marks, scales, coordinates, React components, or rendering behavior.

## Install

```bash
pnpm add @retikz/data
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

## Quick start

Declare a logical field model, normalize external rows, then apply JSON-serializable transforms:

```ts
import type { ExternalRow, IRDataModel, IRDataTransform } from '@retikz/data';

import { applyTransforms, DataFieldType, normalizeRows, resolveFieldTypes } from '@retikz/data';

const rows: Array<ExternalRow> = [
  { region: 'north', revenue: '12' },
  { region: 'north', revenue: '8' },
  { region: 'south', revenue: '5' },
];

const model: IRDataModel = [
  { name: 'region', type: DataFieldType.Categorical },
  { name: 'revenue', type: DataFieldType.Continuous },
];

const sourceFields = new Set(['region', 'revenue']);
const fieldTypes = resolveFieldTypes(model, rows, sourceFields);
const canonicalRows = normalizeRows(rows, fieldTypes);

const transforms: Array<IRDataTransform> = [
  {
    kind: 'summarize',
    groupBy: ['region'],
    metrics: [
      { kind: 'sum', field: 'revenue', as: 'total' },
      { kind: 'count', as: 'rows' },
    ],
  },
];

const summary = applyTransforms(canonicalRows, transforms);
// [{ region: 'north', total: 20, rows: 2 }, { region: 'south', total: 5, rows: 1 }]
```

The model and transform operations are serializable. `rows`, custom parser functions, registry definitions, and provenance records are runtime values and do not enter IR.

## Main entry points

| Area             | Public entry points                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Data contracts   | `DataReferenceSchema`, `DataModelSchema`, `DataFieldType`, and schema-derived `IRDataXxx` types                      |
| Field processing | `resolveFieldTypes`, `collectFormatFields`, `applyFieldResolver`, `normalizeRows`, `validateBoundData`               |
| Data transforms  | `applyTransforms`, `applyTransformsWithLineage`, `TransformSchema`                                                   |
| Statistics       | reducer and selector schemas, `applyReducerOperation`, `applySelectorOperation`                                      |
| Extensions       | `defineFieldFormat`, `defineStatisticsReducer`, `defineRowSelector`, `defineTransform`, and their registry resolvers |

## Extending registries

Built-ins and custom definitions use the same registry path. For example, a reusable field format can be registered without putting its parser function into IR:

```ts
import { DataFieldType, defineFieldFormat, resolveFormatRegistry } from '@retikz/data';

const currencyFormat = defineFieldFormat({
  name: 'currency',
  impliedType: DataFieldType.Continuous,
  parse: raw => Number(String(raw).replaceAll(',', '').replace('$', '')),
});

const formatRegistry = resolveFormatRegistry([currencyFormat]);
```

Custom reducers, row selectors, and transforms follow the same `defineXxx` plus `resolveXxxRegistry` pattern. Duplicate registration keys fail immediately instead of silently overriding a built-in.

## Documentation

Open the [retikz documentation site](https://pionpill.github.io/retikz/) and choose **Data Flow** for:

- **Overview** — package boundaries and the runtime data pipeline
- **Data Model** — field mapping, parsing, validation, and category order
- **Data Transforms** — transforms, reducers, selectors, and custom definitions
- **Provenance** — source tracking and runtime lineage
