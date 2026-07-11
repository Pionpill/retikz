# @retikz/plot

`@retikz/plot` is retikz's Tier 2 visualization package. It defines a
JSON-serializable, grammar-of-graphics **Plot IR** and lowers that IR to
`@retikz/core` primitives through the core composite pipeline.

- **Data stays outside the IR.** A plot stores a named data reference
  (`data.reference`) and an optional data model; dataset values are supplied to
  `lowerPlots(datasets)` at compile time.
- `@retikz/data` owns the shared JSON data models, field resolution, and transform
  pipeline used by visualization packages.
- `@retikz/plot-react` provides the `<Plot>` component and JSX authoring DSL.
- `@retikz/plot-vanilla` provides `plotBuilder()` and `renderPlot()` for
  framework-free and server-side rendering workflows.

See the [plot architecture](https://github.com/Pionpill/retikz/blob/next-viz/packages/viz/_notes/architecture/plot-design.md)
and [plot design decisions](https://github.com/Pionpill/retikz/tree/next-viz/packages/viz/_notes/decisions/plot)
for the underlying model and design rationale.
