# @retikz/diagram

`@retikz/diagram` is the framework-agnostic Schematic package reserved for
automatic diagram layout, routing, and geometry over `@retikz/graph` data. Alpha1 also establishes the package-private Presentation, Frame, Theme, and assembly foundation used by future concrete Diagram roots.

The public API remains intentionally empty in Alpha1: the foundation is verified
internally and is not published as a temporary root or adapter API. FlowDiagram
and the first public three-entry API are scheduled for Alpha2.

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。
