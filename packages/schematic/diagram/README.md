# @retikz/diagram

`@retikz/diagram` is the framework-agnostic Schematic package for assembling a
complete diagram and deriving automatic layout, routing, and geometry over
`@retikz/graph` data.

Alpha.1 provides the first complete FlowDiagram MVP. Its Foundation provides
package-internal Presentation, Frame, Diagram Theme, and fixed region assembly
by reusing Core text and theme, Layout flex, Standard Surface, and Legend. The
Flow API is exposed symmetrically through the `./flow` subpath; the package root
does not aggregate concrete diagram types.

alpha.1 已建立首个完整 FlowDiagram MVP。Foundation 阶段在包内建立
Presentation、Frame、Diagram Theme 与固定区域装配基础，复用 Core 文本和主题、
Layout Flex、Standard Surface 与 Legend。Flow API 通过对称的 `./flow` 子入口公开，
包根不聚合具体图类型。

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。
