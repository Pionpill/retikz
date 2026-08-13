# @retikz/chart-vanilla

Plain-data authoring and single-compile SVG rendering for canonical Retikz
Charts. The base entry, `@retikz/chart-vanilla`, exports `createChart` and
`renderChart`. Import typed `createXxxChart` helpers from
`@retikz/chart-vanilla/point`; that entry also includes every base export. Pass
root `theme` and matching Core definitions to a factory, alongside Chart and
Plot runtime Theme definitions; `renderChart` then consumes that self-contained
authoring result.
