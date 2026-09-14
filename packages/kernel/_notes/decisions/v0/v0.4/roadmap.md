# kernel v0.4 Roadmap

## 版本目标

深化计算、文字、路径与公开扩展底座。

## 重点功能

| 重点能力   | 目标                                            | 相关 ADR                                                                                                                                                                                                                     |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 计算与组合 | 建立 Math 底座、可嵌入 Tier 2 与 Scope 包围形状 | [001](./001-math-package-and-geometry-api.md)、[002](./002-core-pure-geometry-sink.md)、[004](./004-embeddable-tier2-in-layout.md)、[005](./005-scope-polymorphic-bbox.md)                                                   |
| 路径与外观 | 完善轮廓、曲线、阴影、混合与 Ribbon / Path kind | [006](./006-polyline-rounded-corners.md)、[007](./007-smooth-curve-through-points.md)、[008](./008-core-contour-shape.md)、[009](./009-scene-drop-shadow.md)、[010](./010-blend-mode.md)、[021](./021-path-kind-registry.md) |
| 公式与文字 | 建立可选 TeX 接入、内嵌公式与文字度量           | [011](./011-tex-package-and-node-math.md)、[012](./012-node-embedded-math.md)、[013](./013-inline-math-runs.md)、[034](./034-font-size-presets-and-relative-units.md)、[036](./036-node-layout-measurement.md)               |
| 扩展契约   | 统一 Provider、Boundary、Clip 与能力接入        | [022](./022-provider-registry-contract.md)、[023](./023-provider-key-contract.md)、[024](./024-capability-provider-migration.md)、[026](./026-boundary-provider-contract.md)、[027](./027-clip-provider-contract.md)         |
| 公开入口   | 收敛 Vanilla、React 与 Tier 2 authoring 公共面  | [025](./025-adapter-surface-and-docs.md)、[037](./037-vanilla-plain-spec-api.md)、[038](./038-react-public-surface.md)、[039](./039-tier2-unbuilder-lowering.md)                                                             |

## 功能规划

### 计算与组合

主要场景：

- 多个包需要复用相同的几何计算。
- 高层图形需要作为普通 child 嵌入布局内容。

规划内容：

- 建立独立 Math 底座并收敛 Core 纯几何职责。
- 支持可嵌入 Tier 2 与能表达自身包围形状的 Scope。

预期效果：

计算能力与绘图组合能力可以被多个包复用，而不依赖 Core 私有实现。

### 路径与外观

主要场景：

- 路径需要平滑转折、轮廓、带状连接和边界对齐。
- 图元需要阴影、混合与更完整的描边呈现。

规划内容：

- 完善曲线、轮廓、Ribbon 和统一 Path kind。
- 将视觉效果表达为通用能力，不依赖单个 renderer 的私有入口。

预期效果：

更复杂的路径和视觉表达能够沿既有绘图链工作。

### 公式与文字

主要场景：

- 科研或工程图中包含公式与普通文字混排。
- 文字尺寸影响节点、标签和图形布局。

规划内容：

- 建立可选 TeX 包、节点数学内容与内嵌公式能力。
- 完善字号、相对单位与文字度量的共同语义。

预期效果：

科研与工程内容可以同时包含文字和公式，布局基于共同度量。

### 扩展契约

主要场景：

- 上层包按需提供图形、边界或裁剪能力。
- 第三方扩展需要与官方实现保持相同消费路径。

规划内容：

- 统一 Provider、能力 key、Boundary 与 Clip 接入。
- 使扩展依赖可表达、能力归属可识别，避免平行注册方式。

预期效果：

官方和自定义能力的装配方式一致，上层包能识别真实依赖。

### 公开入口

主要场景：

- 不同 authoring 入口需要表达同一份图形。
- 上层 composite 的公开入口不应暴露内部编译结构。

规划内容：

- 收敛 Vanilla plain API、React 公共面与 Tier 2 authoring。
- 完善布局边界适配，使入口差异不改变最终绘图契约。

预期效果：

不同作者入口更容易组合和理解，同时保持领域与底座职责分离。

## 边界与依赖

通用计算归 Math，可选公式能力归 TeX；交互边界与未排期方向见 [backlog](./backlog.md)，不因文档整理扩大范围。
