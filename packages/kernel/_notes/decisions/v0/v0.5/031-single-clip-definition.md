---
description: 裁剪定义通过单一 lower 回调将已校验声明转换为 Scene 路径
keywords: Clip、Definition、SceneClipPath、lower、clips
---

# ADR-031：单一 Clip Definition 扩展契约

- 状态：Accepted
- 决策日期：2026-08-16
- 参数结构：[ADR-073](./073-clip-params-envelope.md)
- 前置：[ADR-030](./030-extensible-clip-shapes.md)

## 背景与目标

裁剪的输入校验、几何计算和路径生成属于同一个可装配能力。独立的 operation / shape 注册表，以及公开的 resolve / lower 两阶段回调，会要求作者维护没有独立消费需求的中间形状。定义应直接从裁剪声明生成后端中立路径。

## 决策

一个 ClipDefinition 以唯一 kind 拥有 schema 和 lower。schema 解析完整 JSON 声明，lower 消费其精确输出并返回 SceneClipPath。kind 必须与声明和注册身份一致。所有内置、官方扩展和第三方定义使用同一 registry、provider 与编译路径。

```ts
type ClipDefinition<TClip extends IRClip = IRClip> = Readonly<{
  kind: TClip['kind'];
  schema: z.ZodType<TClip>;
  lower: (clip: TClip, context: ClipLowerContext) => SceneClipPath;
}>;

type ClipLowerContext = {
  round: (value: number) => number;
  lower: (clip: IRClip) => SceneClipPath;
};
```

defineClip 保留作者定义，不生成默认回调。输入仅保留一个泛型；ClipDefinition 是可注册的定义类型。删除 ClipShape、ClipResolveContext、独立 resolve 回调与具体 resolved shape 类型，不提供别名或兼容分支。IRClip 的 schema 与 JSON 参数约束继续是真源。

Core 默认只提供矩形裁剪；其它形状由 Extension 或第三方显式装配。复合裁剪通过 context.lower 递归生成子路径，按声明顺序拼接命令并应用外层 fillRule。子项所需定义必须显式注册；不动态发现、安装或全局注册。

## 编译与资源

lower 输出在 Core 内物化为隔离路径快照，并执行路径语法、数值及精度规范化。SceneClipPath、资源去重、可视边界、命中测试和 renderer 消费语义由 Core 的现有路径契约负责。

布局预检直接生成并保存规范路径，不登记资源。提交时登记该路径，不再次调用 provider 或重复消耗递归预算。生成路径与登记资源保持独立；取消候选不得泄漏资源。

## 失败与递归

- schema 错误、未知 kind 和注册冲突维持统一诊断
- lower 回调抛出的普通异常在布局预检中可恢复，保留原始 cause；调用方可舍弃失败候选
- 非法路径、非 JSON 输出、循环和预算越界属于不可忽略的契约错误
- maxClipDepth 默认 32；一次根裁剪转换中，每次进入 lower 计一次，根声明及所有递归子声明共享累计预算
- 递归活动链上的同一声明对象构成循环；已完成的同一子声明可在兄弟位置复用
- 路径登记和预检回放不额外计数

## 边界与兼容性

IR 的 `{ kind, params }`、SceneClipPath、clipRef、renderer 和宿主装配入口保持不变。自定义定义必须将计算合并到 lower，递归通过 context.lower 输入子声明。两阶段旧接口与中间 shape 注册机制全部删除。
