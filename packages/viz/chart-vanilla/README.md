# @retikz/chart-vanilla

Plain-data authoring and single-compile SVG rendering for canonical Retikz
Charts. It exports `createChart`, typed `createXxxChart` helpers, and
`renderChart`. Pass root `theme` and matching Core definitions to a factory,
alongside Chart and Plot runtime Theme definitions; `renderChart` then consumes
that self-contained authoring result.
