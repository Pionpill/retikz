---
description: 移除 Scope 外框绘制能力，保留上下文传递、包络定位与引用，可见容器由 Standard 组合组件负责
keywords: Scope、frame、包络、Surface、Frame、职责
---

# ADR-068：移除 Scope 外框

- 状态：Accepted
- 决策日期：2026-10-23
- 关联：[044](./044-scope-frame.md) · [067](./067-host-owned-defaults.md) · [roadmap](./roadmap.md)

## 背景与目标

Scope 的外框让上下文容器同时承担可见几何的职责，而外框与引用包络的边界并不一致。可见分组已有 Standard Surface / Frame 等能力，继续在 Scope 内维护外框会重复容器绘制语义，并使连接边界的理解复杂化。

## 决策

删除 Scope 的 frame 属性及其外框样式、类型与派生绘制能力，不提供别名、兼容解析或替代的 Scope 外观字段。Scope 继续组织子树并传递变换、命名空间、默认配置和 Theme；保留既有裁剪、层级和组动画。

Scope 的内容包络、id、boundingShape、锚点定位及外部路径引用继续保留，包络是既有定位与引用事实，不因为移除外框而删除。Scope 不为自身包络产生填充、描边、阴影或额外图元。

可见容器使用 Standard Surface / Frame，空间分配使用 Layout；这些能力继续通过 Core 的既有组合契约接入，不在 adapter 或 renderer 中恢复 Scope 外框。

## 公开契约与行为

React、Vanilla、直接 IR 和 Composite 输出使用相同 Scope 契约。既有 frame 输入不再合法，JSON 解析拒绝该字段，类型化输入不再暴露相关属性。原先没有 frame 的输入保持编译、包络与连接行为；原先使用 frame 的调用方需显式选择可见容器组件。

完整编译及增量编译均只输出子内容及必要的 Scope 分组，不创建外框资源或装饰图元。子内容自己的样式、默认值继承和绘制范围不受影响。

本决策替代 ADR-044 的 Scope 外框能力；其中引入的 Scene hitTest 通用契约仍保留，其他消费者继续使用。
