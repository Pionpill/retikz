---
description: Clip 声明使用 kind 和 params，分离注册身份与 JSON 参数
keywords: Clip、params、IRClip、Definition
---

# ADR-073：Clip 参数对象与注册身份分离

- 状态：Accepted
- 决策日期：2026-10-24
- 关联：[ADR-031](./031-single-clip-definition.md)

## 背景与目标

裁剪声明把注册身份与扩展参数分开，避免开放参数索引覆盖框架身份。所有内置与自定义裁剪使用同一结构。

## 核心决策

持久化 Clip spec 使用必填的 `{ kind, params }`。kind 选择注册项，params 必须为 JSON 对象；无参数时显式传入空对象。外层不接受额外字段。Core 矩形、Extension 圆形、椭圆、多边形、路径、复合裁剪与第三方扩展采用相同结构。

Definition 的 schema 解析完整 spec，输出仍满足 IRClip 的 JSON 声明约束；lower 接收精确的解析结果，直接返回 SceneClipPath。只保留一个输入泛型，不公开中间 ClipShape、ClipLike 或独立 resolve 阶段。函数或实例等临时计算值留在 lower 内部。

矩形类型由 RectClipSchema 派生为 IRRectClip，不重复声明具体形状类型。复合裁剪的 params.children 保存子 IRClip，通过 context.lower 递归生成路径。路径裁剪的 commands 与 fillRule 位于 params 中，最终 SceneClipPath 保持原结构。

## 行为与边界

- 参数约束、默认值、几何、零面积、精度与资源去重维持现有语义
- 缺失 params、非对象参数和未知外层字段由输入 schema 拒绝；参数错误路径包含 params
- schema 输出 kind 必须与注册身份一致；错误路径与递归预算遵循 ADR-031
- 平铺声明、旧中间形状与旧回调不保留 fallback、别名或双轨
- Vanilla 与 React 透传相同声明；Scene、renderer 和包职责不变
