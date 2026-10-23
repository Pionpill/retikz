---
description: Clip 输入与完整形状统一使用 kind 和 params，分离注册身份与扩展参数并保留精确类型
keywords: Clip、params、ClipShape、IRClip、Definition
---

# ADR-073：Clip 参数对象与注册身份分离

- 状态：Accepted
- 决策日期：2026-10-24
- 关联：[ADR-031](./031-single-clip-definition.md)

## 背景与目标

裁剪输入与解析后形状原先把 kind 和所有扩展字段平铺在同一对象上。开放 JSON 索引约束因此覆盖整个对象，框架身份与扩展参数没有独立边界。本决策将两者分离，保留单一 Clip Definition、同 kind 解析与降低机制。

## 核心决策

所有持久化 Clip spec 和完整 ClipShape 均使用必填的 `{ kind, params }`。kind 只负责选择注册项，params 承载该 kind 的参数；参数为空时显式传入空对象。外层不接受额外字段。Core 矩形、Extension 圆形、椭圆、多边形、路径、复合裁剪与第三方扩展采用相同结构。

```ts
type ClipShape = {
  kind: string;
  params: JsonObject;
};

type RectClipShape = {
  kind: 'rect';
  params: { x: number; y: number; width: number; height: number };
};
```

持久化 spec 的 params 必须为 JSON 对象，字段由所属 Definition 的 schema 约束。schema 仍解析完整 spec，resolve 接收其精确解析结果，返回同 kind 的完整 shape；lower 接收精确 shape 类型。输入参数与输出参数可不同，schema 的转换结果不额外要求 JSON，完整 shape 仍必须 JSON-safe。满足完整形状契约的 spec 继续支持 identity resolve。

复合裁剪的子项位于 params.children；每个子项保留自己的 kind 和 params，并通过相同 registry 递归解析与降低。路径裁剪的 commands 与 fillRule 位于 params 中，最终 SceneClipPath 保持原结构。

## 行为、失败语义与兼容性

- 参数约束、缺省值、几何、零面积、精度与资源去重行为保持原语义
- 缺失 params、非对象参数、未知外层字段由外部输入 schema 拒绝；参数错误路径包含 params
- 未注册 kind、spec/shape kind 不一致、非 JSON shape、非法路径与递归 cycle/depth 继续按既有错误契约处理
- 平铺 Clip spec 与 shape 被移除，不保留 fallback、别名或双轨解析
- Vanilla 与 React 透传同一 Clip 数据结构，Core IR、扩展与直接 JSON 使用同一契约；Scene、renderer 和包职责不变
