---
description: 'SVG 和 Canvas 共享 Render 包，通过后端子路径分别导入'
keywords: 'SVG、Canvas、retikz、render、csstype、canvas、SvgNode'
---

# ADR-005：将 SVG 与 Canvas 合并为 `@retikz/render` 子路径

- 状态：Partially Superseded
- 决策日期：2026-06-01
- 关联：[ADR-001 SVG descriptor](./001-svg-descriptor-contract.md)、[ADR-002 Canvas renderer](./002-canvas-renderer-and-react-canvas-mode.md)、[ADR-003 依赖图](./003-vanilla-runtime-and-dependency-graph.md)
- 后续决策：[kernel v0.3/025](025-node-canvas-export.md)、[kernel v0.5/014](../v0.5/014-scene-patch-retained-renderer.md)

## 保留的决策

SVG 和 Canvas 共享 Render 包，通过后端子路径分别导入。选择 Canvas 不需要先构造 SVG 描述树；没有必要为了复用基础 Scene 而聚合全部后端。

## 修订边界

最初的双后端子路径不是完整的公开入口清单。Node Canvas 导出、交互与运行时提交各有明确边界。
