# @retikz/chart-react

React authoring for family-aware Retikz Chart Source, presentation, and typed
chartType recipes.

The base entry, `@retikz/chart-react`, exports the four headless presentation
markers and `ChartThemeProvider` for Chart-owned named Theme definitions. Import
`ScatterChart` from `@retikz/chart-react/point`, or import its concrete component
subpath. There is no generic `Chart` component.

Each typed component has exact props and normalizes to its matching family /
chartType Source before the shared runtime adapter enters the Chart provider
pipeline. There is no generic `<Chart type="..." />` API, Source-mode component,
or Point-family input union.

Every concrete Chart component is standalone by default and creates exactly one
`Layout` / Scene renderer host. When placed inside an outer `Layout`, it contributes
only its Chart-to-Plot Scope/composite and inherits the outer effective Theme. All
`ChartHostProps` are standalone-only in embedded mode—including `width`, `height`,
renderer/runtime fields, callbacks, and explicit `undefined` own props—and must move
to the outer `Layout`. Source `layout` remains the separate Chart border-box contract.
