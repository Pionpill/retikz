# kernel v0.5 Roadmap

## 版本目标

完善跨图元机制、组合能力与增量运行时底座。

## 重点功能

| 重点能力       | 目标                                                                   | 相关 ADR                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 几何与文字     | 完善锚点、单轴连接、标签间距、对比色、TeX 与固定宽度                   | [001](./001-node-anchor-position.md)、[002](./002-scope-anchor-and-transform-pivot.md)、[003](./003-single-axis-path-connection.md)、[004](./004-node-text-auto-contrast.md)、[005](./005-node-label-box-spacing.md)、[006](./006-tex-math-syntax-compatibility.md)、[038](./038-node-fixed-width.md) |
| 布局与组合     | 支持上下文布局、完整 Scope 输出及跨 namespace 空间引用                 | [007](./007-layout-aware-composite.md)、[009](./009-contextual-composite-layout.md)、[017](./017-layout-proposal-probe-contract.md)、[020](./020-layout-aware-scope-output.md)、[028](./028-qualified-spatial-handles.md)                                                                             |
| 增量运行时     | 统一 identity、事务、增量编译与 retained renderer                      | [011](./011-runtime-identity-owner-registry.md)、[012](./012-program-transaction-lifecycle.md)、[013](./013-incremental-core-compile.md)、[014](./014-scene-patch-retained-renderer.md)、[016](./016-runtime-execution-policy.md)                                                                     |
| 基础契约与入口 | 建立 Foundation、统一 authoring 与能力依赖接入                         | [019](./019-core-atomic-contracts.md)、[023](./023-foundation-package.md)、[026](./026-foundation-schema-primitives.md)、[027](./027-composite-dependency-provider-graph.md)、[029](./029-vanilla-authoring-normalization.md)                                                                         |
| 颜色与 Source  | 统一颜色解析、Theme 来源、Source 分组与 schema 边界                    | [024](./024-lightweight-theme-resolution.md)、[032](./032-contextual-color-resolution.md)、[035](./035-json-undefined-field-contracts.md)、[036](./036-source-ir-semantic-grouping.md)、[037](./037-theme-source-fragments.md)                                                                        |
| 路径与诊断     | 完善裁剪、居中标签断线、箭头重叠与 Inspect                             | [021](./021-extensible-inspector-content.md)、[031](./031-single-clip-definition.md)、[033](./033-stroke-path-label-interruption.md)、[034](./034-path-endpoint-arrow-overlap.md)、[039](./039-builtin-inspection.md)                                                                                 |
| Scope 外框     | 在保持内容包络、锚点与布局不变的前提下添加背景装饰                     | [044](./044-scope-frame.md)                                                                                                                                                                                                                                                                           |
| 候选方向       | Headless Interaction、协作并发、渐进物化与生成会话；不作为本版本必交项 | [040](./040-cooperative-concurrent-runtime.md)、[041](./041-progressive-materialization.md)、[042](./042-generation-session.md)                                                                                                                                                                       |

## 功能规划

### 几何与文字

主要场景：

- 节点与 Scope 需要明确的对齐点、固定宽度和变换参照。
- 标签、箭头与公式在组合图中需要更可靠的视觉定位。

规划内容：

- 完善锚点定位、单轴连接、标签间距和宽度表达。
- 补齐文字自动对比色、标签对齐与 TeX 数学语义。

预期效果：

复杂组合中的文字、标签和连接位置更可控，减少宿主侧手工修正。

### 布局与组合

主要场景：

- 嵌套 composite 要在父容器约束下完成布局。
- 一个组合需要引用另一个 namespace 中公开的空间位置。

规划内容：

- 统一上下文布局、proposal / probe 和完整 Scope 输出。
- 支持空间引用与跨组合装配，保留真实布局边界及公开职责。

预期效果：

组合内容在容器约束和跨区域引用下仍能形成完整布局结果。

### 增量运行时

主要场景：

- 宿主持续修改图形，希望复用未受影响的计算与显示。
- 一组修改需要作为完整更新被运行时消费。

规划内容：

- 建立 identity、事务、增量编译和 Scene patch 的共同底座。
- 明确执行策略与 retained renderer 的协作边界。

预期效果：

持续修改可以复用已有工作，并以完整事务观察每次更新。

### 基础契约与入口

主要场景：

- 多个包需要共享原子契约与基础 schema。
- 作者和扩展包需要一致的输入规范化与能力依赖表达。

规划内容：

- 建立 Foundation，收敛通用契约和基础 schema 所有权。
- 统一 authoring 入口与 composite 依赖接入，减少平行解释。

预期效果：

跨包基础概念有独立真源，扩展和作者输入不再重复定义共同机制。

### 颜色与 Source

主要场景：

- 主题需要继承、覆盖并投影到不同能力 owner。
- Source 默认片段与颜色来源需要保持清晰且可组合。

规划内容：

- 统一轻量 Theme、上下文颜色与 Source 语义分组。
- 收敛默认片段和 schema 边界，使源输入不承载冗余派生状态。

预期效果：

作者可以理解颜色和默认配置的来源，并在嵌套组合中精确覆盖。

### 路径与诊断

主要场景：

- 路径中部标签与端点箭头会影响连线的可见范围。
- 宿主需要检查当前图形、布局与扩展能力的结果。

规划内容：

- 完善裁剪、居中标签断线和箭头视觉重叠处理。
- 扩展 Inspect 内容与内置检查能力，不把诊断实现混入领域模型。

预期效果：

路径呈现与检查工具能反映真实图形关系，便于理解和诊断。

### 候选方向

主要场景：

- 复杂内容可能需要协作调度、渐进呈现或生成会话。
- 后续交互能力需要宿主无关的共享底座。

规划内容：

- 保留 Headless Interaction、Concurrent、渐进物化与生成会话候选。
- 候选不作为必交项；设计接受、实现授权与实际交付分别判断。

预期效果：

后续能力保留明确探索入口，但不会绑架已完成内容的正常发布。

## 边界与依赖

领域图形、自动图布局、编辑器与单一 renderer 特性不进入 Kernel；候选是否进入执行须独立确认。
