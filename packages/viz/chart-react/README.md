# @retikz/chart-react

React authoring for canonical Retikz Chart presentation and typed recipes.

The base entry, `@retikz/chart-react`, exports `Chart`, the four headless
presentation markers, and `ChartThemeProvider` for Chart-owned named Theme
definitions. Import `ScatterChart`, `BubbleChart`, and `ConnectedScatterChart`
from `@retikz/chart-react/point`; that entry also includes every base export.

Each typed component has exact props and binds its matching Chart schema before
the shared runtime adapter resolves it to Base Chart. There is no generic
`<Chart type="..." />` API or Point-family input union.
