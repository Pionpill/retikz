# ADR-04：stroke paint 支持

- 状态：Accepted（2026-06-23 完工）
- 决策日期：2026-06-23
- 关联：[core v0.2-alpha.7 ADR-01 Paint 基础](../../v0.2/alpha.7/01-paint-basics.md) · [core-design.md §4.5 Scene 编译器](../../../../../../../notes/architecture/core-design.md#45-scene-编译器) · `packages/kernel/core/src/compile/paint.ts`

## 背景

core 已有 renderer-agnostic paint 基础：`PaintSpec` / `PaintValue` / `SceneResource` 能把 linearGradient、radialGradient、pattern、image 收进 Scene 资源表，再由 SVG / Canvas renderer 物化。这个能力此前主要用于 `fill`，而 path / node / scope 的 `stroke` 仍偏向纯色字符串。

plot 和后续图形能力需要渐变描边，例如 line mark 按屏幕方向或数据语义使用渐变。这个语义不应由 plot 绕过 core 去拼 SVG `url(#...)` 或 renderer 私有 mask；core 应把描边 paint 做成与填充 paint 同级的底层能力。

## 决策

把支持描边的 IR 与 Scene primitive 的 `stroke` 从纯字符串扩展为 `string | PaintSpec` / `PaintValue`：

- `Path.stroke`、`Node.stroke`、`Scope.stroke` 接受 PaintSpec。
- `PathPrim.stroke`、`RectPrim.stroke`、`EllipsePrim.stroke` 使用 `PaintValue`。
- 编译期复用同一 paint registry：PaintSpec 无论出现在 `fill` 还是 `stroke`，都进入 `Scene.resources` 去重表，并在 primitive 上写 `resourceRef`。
- 纯色字符串保持原样，不进入资源表。
- SVG renderer 对 stroke resourceRef 输出 `stroke="url(#...)"` 并生成对应 paint defs。
- Canvas renderer 对 stroke resourceRef 解析为 CanvasGradient / CanvasPattern 后描边。

arrow marker 继承是唯一需要限制的交互：当 path stroke 是 PaintSpec 且 arrow 未显式提供纯色时，compile 走 fail-loud，提示用户给 arrow 显式 color；已有显式 arrow color 时，path 可继续使用 gradient stroke，marker 使用该纯色。

## 理由

1. fill / stroke 都是 paint 通道，类型和资源模型应对称。
2. Tier 2 不应绕开 core 自造 renderer 私有渐变描边语义。
3. 复用现有 paint registry、SVG defs、Canvas paint resolver，新增能力集中在 stroke 接入点。
4. 纯色 stroke 完全兼容，只有合法输入范围扩大。
5. arrow marker 的显式纯色限制避免把 resourceRef 偷塞进 marker-local 上下文。

## 影响

- core schema：`Path.stroke`、`Node.stroke`、`Scope.stroke` 接受 `PaintSpec`。
- Scene primitive：path / rect / ellipse 的 `stroke` 变为 `PaintValue`。
- compile：paint resolver 泛化为 fill / stroke 共用；scope stroke PaintSpec 可级联到内部 node/path。
- render：SVG / Canvas stroke paint 与 fill paint 对齐。
- React / Vanilla：Node / Path / Scope props 和 builder 透传结构化 stroke paint。
- docs：Path、Node、Scope、Scene primitive、schema reference 增加 stroke paint 示例和 API 说明。

## 不在本 ADR 范围

- plot 的 `encoding.stroke.gradient` 具体 API。
- 沿路径数据值变化的分段 / 采样策略。
- 任意 mark mask / clip paint composition。
- 文字 fill / stroke 的渐变 paint。
- WebGL / shader 后端。

## 实现指针

实现以当前代码和测试为准，重点见：

- `packages/kernel/core/src/schemas/{node,scope,path/path}.ts`
- `packages/kernel/core/src/primitive/{path,rect,ellipse}.ts`
- `packages/kernel/core/src/compile/paint.ts`
- `packages/kernel/core/src/compile/node.ts`
- `packages/kernel/core/src/compile/path/index.ts`
- `packages/kernel/render/src/svg/builders/prim.ts`
- `packages/kernel/render/src/canvas/draw-scene.ts`
- `packages/kernel/core/tests/ir/paint.test.ts`
- `packages/kernel/core/tests/compile/paint.test.ts`
- `packages/kernel/render/tests/draw.test.ts`
- `packages/kernel/react/tests/render/paint-defs.test.tsx`

> 压缩前完整施工蓝图：`git show 63220f823d012744b29551f0a4bf38ff269b0c7e:_notes/decisions/core/v0/v0.4/alpha.5/04-stroke-paint.md`
