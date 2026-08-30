# @retikz/diagram

`@retikz/diagram` is the framework-agnostic Schematic package for assembling a
complete diagram and deriving automatic layout, routing, and geometry over
`@retikz/graph` data.

Alpha.1 is building the first complete FlowDiagram MVP. Its completed Foundation
phase provides package-internal Presentation, Frame, Diagram Theme, and fixed
region assembly by reusing Core text and theme, Layout flex, Standard Surface,
and Legend. The package root remains intentionally empty until the remaining
Flow drawing-core ADRs define an instantiable Diagram contract and the three
authoring entries are implemented.

alpha.1 正在建立首个完整 FlowDiagram MVP。已完成的 Foundation 阶段在包内建立
Presentation、Frame、Diagram Theme 与固定区域装配基础，复用 Core 文本和主题、
Layout Flex、Standard Surface 与 Legend。后续 Flow drawing core ADR 冻结可实例化
Diagram 契约并完成三入口前，包根继续保持空导出。

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。
