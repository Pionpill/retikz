---
description: 'Vanilla 为非 React 宿主提供作者输入和接线能力，业务数据不必先伪装成 React element；SVG 和 Canvas 仍消费同一 Scene'
keywords: 'Vanilla、runtime、Kernel、mountSvg、renderToSvgString、view.root、update'
---

# ADR-003：Vanilla runtime 与 Kernel 依赖图

- 状态：Partially Superseded
- 决策日期：2026-05-31
- 关联：[ADR-001 SVG descriptor](./001-svg-descriptor-contract.md)、[ADR-002 Canvas renderer](./002-canvas-renderer-and-react-canvas-mode.md)、[ADR-005 renderer 重打包](./005-renderer-repackage.md)
- 后续决策：[kernel v0.4/037](../v0.4/037-vanilla-plain-spec-api.md)、[kernel v0.5/056](../v0.5/056-vanilla-default-text-measurement.md)、[kernel v0.5/082](../v0.5/082-scene-reconciler-entry.md)

## 保留的决策

Vanilla 为非 React 宿主提供作者输入和接线能力，业务数据不必先伪装成 React element；SVG 和 Canvas 仍消费同一 Scene。

## 修订边界

旧依赖图把编译、默认测量和后端接线画在一起。现行作者入口以 plain object 表达；Vanilla 负责测量准备，底层执行由 Reconciler 负责。
