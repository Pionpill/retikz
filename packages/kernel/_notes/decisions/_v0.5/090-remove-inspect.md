---
description: 退役通用 Inspect 扩展与单图只读辅助帧，保留绘图、领域结果和具名 Scene 图层
keywords: Inspect、InspectorDefinition、InspectionPlane、RenderReadonlyLayer、CompileResult、CompositeArtifact、provenance、具名图层
---

# ADR-090：删除通用 Inspect 与单图只读辅助层

- 状态：Accepted
- 接受日期：2026-11-26
- 决策日期：2026-11-26
- 关联：[roadmap](./roadmap.md) · [021](./021-extensible-inspector-content.md) · [039](./039-builtin-inspection.md) · [077](./077-compile-output-contract.md) · [078](./078-inspect-compiled-output.md) · [087（具名图层）](./087-independent-scene-layers.md) · [包职责](../../../../../notes/architecture/package-responsibility-design.md)

## 背景与目标

Layout 的边距、分行和间距由排版求解决定。最终图元间的空白可能同时来自固定 gap、外边距和剩余空间分配，不能从两条可见边界的距离还原。现有检查器解释的是 Path、Group 和 Clip 的渲染几何；通用注册、选择与辅助编译并未解决布局解释，也没有建立嵌套容器局部坐标到主图的可靠映射。

## 决策

退役 `@retikz/inspect`，不在 Core、Reconciler、Render 或 Layout 中重建同义机制。宿主需要解释布局时可读取领域本身交付的结果；需要测距时可显示已知坐标系中的几何距离。两者都不构成向主体编译请求专用输出、保留中间状态或增加空间索引的理由。本决策不提供新的检查 UI 或世界坐标查询契约。

单图的 Render 接口只执行该图的 Scene 或运行时快照，不再把一个主图和若干被动辅助 Scene 包装成只读合成帧。具名 Layer 仍是可独立提交、更新与释放的普通 Scene；名为 overlay 的作者图层不是被删除的只读辅助层。

## 公开契约

- 删除检查器定义与注册、检查请求与目标、辅助片段、`InspectionPlane`、检查诊断、内置及第三方检查器入口。React 与 Vanilla 均不再提供检查扩展。
- 删除 `RenderReadonlyLayer`、`StaticRenderFrame`、`RenderFrameSnapshot`、仅服务该帧的静态输出入口，以及 renderer 的只读层 capability 和 target 的图层解析回调。静态导出消费 Scene；单图 renderer 的挂载、更新与读取使用主图快照，不再要求传空层数组或声明支持只读层。
- 保留 [077](./077-compile-output-contract.md) 的普通结果：`CompileResult.scene` 供绘制，`artifacts` 交付 Composite 定义的领域值及其 occurrence。提交诊断、按需 provenance、资源、正常布局测量与增量依赖各有独立职责；不把它们转换成观测 API，也不因删除 Inspect 而取消收集。已退役的 observer、节点摘要和空间句柄不恢复。
- 本提案生效后替代 [078](./078-inspect-compiled-output.md)，结束 [021](./021-extensible-inspector-content.md) 与 [039](./039-builtin-inspection.md) 中仍有效的检查扩展及只读辅助层约定；仅替代 [077](./077-compile-output-contract.md) 和 [087](./087-independent-scene-layers.md) 中关于继续提供旧式只读层的表述，不改变编译结果或独立图层的所有权。

## 行为、失败语义与兼容性

这是 0.x breaking 变更，不保留空包、旧名、兼容回调或返回空 plane 的替代入口。使用旧扩展、frame API 或自定义 renderer 的调用方需调整；已有静态图无须为了渲染而新增包装。移除的是检查请求、辅助编译与辅助呈现的失败路径；主图编译诊断、资源与命中、更新失败回滚、SSR 和水合语义不变。
