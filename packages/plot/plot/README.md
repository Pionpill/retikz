# @retikz/plot

retikz Tier 2 plot package: a JSON-serializable, grammar-of-graphics **Plot IR** that
lowers to `@retikz/core` (Scope / Node / Path / Step / Coordinate) via the core
`CompileOptions.composites` hook.

- **Data lives outside the IR.** The IR holds a named data reference (`data.ref`) plus an
  optional data model; the dataset values are injected at compile time through
  `lowerPlots(datasets)`.
- Authoring surface for v0.1 is the Plot IR object + lowering; framework bindings
  (React / vanilla) come later.

See `notes/architecture/plot-design.md` and `notes/decisions/plot/` for design and ADRs.
