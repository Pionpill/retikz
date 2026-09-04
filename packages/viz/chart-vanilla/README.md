# @retikz/chart-vanilla

Plain-data authoring and single-compile SVG rendering for family-aware Retikz
Chart Source. The root entry, `@retikz/chart-vanilla`, exports `renderChart` and
the shared Chart InputEmbed types. Import typed `createXxxChart` helpers from
`@retikz/chart-vanilla/point` or a concrete subpath such as
`@retikz/chart-vanilla/point/scatter`, `/point/bubble`, or `/point/regression`
for a chartType-specific normalizer and provider contribution.

Each Point factory has an exact input contract and writes the stable Point
family plus its global `recipe.chartType` into Source. `encodings` contain field
names, `properties` contain constants, and `marks` preserve authored Chart mark
order. Vanilla only normalizes authoring input and contributes the selected
chartType provider; the Chart provider binds and resolves recipes during Core
compilation.
Definitions, providers, datasets, and resolved Plot IR stay outside the
JSON-safe Source IR.
