# ADR-04：stroke paint 支持

- 状态：Accepted（已实现）
- 决策日期：2026-06-23
- 关联：[core Paint 基础](../../v0.2/alpha.7/01-paint-basics.md)

## 背景

IRPaint 与 SceneResource 已能让 fill 使用渐变、pattern 和 image，但 stroke 仍偏向纯色。描边 paint 应与填充 paint 共享同一 renderer-agnostic 资源模型，避免 Tier 2 自己拼 renderer 私有引用。

## 决策

- Path、Node、Scope 的 stroke 接受 string | IRPaint；PathPrim、RectPrim、EllipsePrim 的 stroke 使用 PaintValue
- compile 对 fill 和 stroke 共用 paint registry；IRPaint 进入 Scene.resources 去重表并由 primitive 写 resourceRef，纯色字符串保持原样
- SVG 将 stroke resourceRef 解析为 url(#...) 和 paint defs；Canvas 解析为 CanvasGradient/CanvasPattern 后描边
- path stroke 为 IRPaint 且 arrow 未显式纯色时 fail-loud，要求 arrow 给出 color；已有显式 arrow color 时，path 可继续使用 gradient stroke，marker 使用该纯色
- Scope 的 stroke paint 可按既有级联语义传给内部 Node/Path；文字仍不在本 ADR 的渐变 stroke 范围

## 兼容性与实现结果

纯色 stroke 完全兼容，结构化 stroke 只扩大合法输入；core、render、React 和 Vanilla 已完成同一 paint 资源路径。

## 遗留风险

plot 的 encoding.stroke.gradient、沿路径分段采样、文字 paint、mask/clip composition 和 WebGL shader 不属于本契约。
