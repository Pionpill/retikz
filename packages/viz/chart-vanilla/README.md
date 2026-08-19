# @retikz/chart-vanilla

Plain-data authoring and single-compile SVG rendering for canonical Retikz
Charts. The base entry, `@retikz/chart-vanilla`, exports `createChart` and
`renderChart`. Import typed `createXxxChart` helpers from
`@retikz/chart-vanilla/point`; keep Base Chart imports on the package root. Pass
root `theme` and matching Core definitions to a factory, alongside Chart and Plot
runtime Theme definitions; `renderChart` then consumes that self-contained
authoring result.

Each typed factory has its own exact input contract and binds directly to its
matching Chart recipe. The package does not expose a generic Chart input union
or a factory that accepts a `type` selector.
