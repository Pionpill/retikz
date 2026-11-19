---
description: 'Canvas 后端接收已经编译的 Scene'
keywords: 'Canvas、renderer、React、currentColor、CanvasRenderingContext2D、save、restore'
---

# ADR-002：Canvas 2D renderer 与 React Canvas 模式

- 状态：Partially Superseded
- 决策日期：2026-05-29
- 关联：[ADR-001 SVG descriptor](./001-svg-descriptor-contract.md)、[ADR-003 Vanilla runtime](./003-vanilla-runtime-and-dependency-graph.md)、[ADR-005 renderer 重打包](./005-renderer-repackage.md)
- 后续决策：[kernel v0.5/056](../v0.5/056-vanilla-default-text-measurement.md)、[kernel v0.5/082](../v0.5/082-scene-reconciler-entry.md)

## 保留的决策

Canvas 后端接收已经编译的 Scene。绘制到已有 context 与设置画布尺寸、DPR、取景变换是两层职责；一次绘制不持有图、不启动时钟，也不生成 SVG 描述树。

## 修订边界

过去用 compileToScene 和浏览器测量器说明前置步骤。测量、编译和绘制是不同边界；宿主准备输入后由 Reconciler 执行编译。
