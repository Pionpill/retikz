# @retikz/chart-react

React authoring for family-aware Retikz Chart Source, presentation, and typed
chartType recipes.

The base entry, `@retikz/chart-react`, exports `ChartData`, `ChartLayout`, and
`ChartExtension` together with the four headless presentation markers and
`ChartThemeProvider`. Import Scatter, Bubble, or Regression declarations from
`@retikz/chart-react/point`, or use the corresponding concrete component
subpath. There is no generic `Chart` component.

Each typed component has exact props and normalizes to its matching family /
chartType Source before the shared runtime adapter enters the Chart provider
pipeline. There is no generic `<Chart type="..." />` API, Source-mode component,
or Point-family input union.

Every concrete Chart component is standalone by default and creates exactly one
`Layout` / Scene renderer host. In standalone mode, `ChartLayout` `width` and
`height` configure that host and, unless an explicit `layout` is present, mirror
into the Chart Source. Inside an outer `Layout`, a Chart contributes only its
Chart-to-Plot Scope/composite: `ChartLayout` may carry Source `layout`, while host
dimensions and advanced renderer/runtime fields belong to the outer `Layout`.
