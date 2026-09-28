# @retikz/chart-vanilla

Plain-data Chart authoring through the standard Vanilla InputEmbed protocol.
Import `scatterChart`, `bubbleChart`, `connectedScatterChart`, `rangedDotChart`,
`regressionChart`, or `stripChart` and the matching `XxxChartInputEmbedAdapter`
from `@retikz/chart-vanilla/point`.

Builders preserve the typed authoring input in a standard embed. Put that node
in `scene.children` and pass the matching adapter to Vanilla rendering or
processing. The adapter normalizes the exact Chart Source and contributes its
Chart/Plot dependencies during the same traversal as other components.
`normalizeXxxChart` remains available for explicitly constructing JSON-safe IR.

For a standalone chart, `renderChart(chart, { adapters: [ScatterChartInputEmbedAdapter] })`
is a convenience over the same processing and SVG renderer. Its `{ svg, compileResult }`
result shares one compilation. Complete `layout` dimensions define the standalone
viewBox; `output` dimensions only resize the displayed SVG. In a composed scene,
viewport and host theme options belong to the containing scene and processing call.

Runtime datasets, definitions, and callbacks remain outside JSON Source IR.
