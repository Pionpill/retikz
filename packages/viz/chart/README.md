# @retikz/chart

`@retikz/chart` provides the family-aware Chart Source shell, Chart presentation,
exact chartType schemas, and the active provider boundary over `@retikz/plot`.
Its recipe and mark Definitions are package-internal implementation contracts
used by built-in chartTypes, while concrete provider contributions remain the
public runtime/authoring boundary.

The root package exports family-neutral Source schemas and the public theme
contract, including `IRChartSource`, `createChartSourceSchema`, and
`defineChartTheme`. Scatter and Bubble are the currently implemented Point
chartTypes; each owns an exact schema and provider contribution under its
concrete `@retikz/chart/point/*` subpath. A Source uses
`type: 'point'` for family discovery and `recipe.chartType` for exact recipe
selection. There is no public family-wide schema, global catalog, global Chart
parser/router, or Base Chart compatibility path. Applications that need dynamic
family/chartType discovery own that catalog and route JSON to the concrete
schema/provider; complex custom graphics should use `@retikz/plot` directly.

Use `@retikz/chart-react` for JSX authoring or `@retikz/chart-vanilla` for
plain-data and server-side rendering helpers.

This package is ESM-only and requires Node.js 24 or newer.
