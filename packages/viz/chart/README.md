# @retikz/chart

`@retikz/chart` provides the `chart.base` execution shape, Chart presentation,
and exact typed Chart schemas over `@retikz/plot`.

Import `BaseChartSchema`, the Base binding/resolution contracts, and shared Chart
capabilities from `@retikz/chart`. The root `bindChart` accepts Base Chart input
only. Scatter, Bubble, and Connected Scatter each own an exact schema and
recipe exported from `@retikz/chart/point`; use the matching schema and recipe
directly. The Point entry does not re-export the package root, so import shared
Base Chart capabilities from `@retikz/chart`. There is no public union schema or
Point-family dispatcher: each exact recipe binds to the shared Base Chart
resolution path.

Use `@retikz/chart-react` for JSX authoring or `@retikz/chart-vanilla` for
plain-data and server-side rendering helpers.

This package is ESM-only and requires Node.js 24 or newer.
