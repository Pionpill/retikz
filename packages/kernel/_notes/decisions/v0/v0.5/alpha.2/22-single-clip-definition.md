# ADR-22：单一 Clip Definition 扩展契约

- 状态：Accepted
- 决策日期：2026-08-16
- 关联：[ADR-21](./21-extensible-clip-shapes.md) · [Standard alpha.3 ADR-12](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.3/12-single-clip-definition.md)

## 背景与目标

Core 现有裁剪扩展把一个裁剪 kind 拆成 `ClipDefinition` 与 `ClipShapeDefinition` 两个公开注册项，并分别暴露 `clips`、`clipShapes`、`clip` provider 和 `clipShape` provider。虽然两级机制允许第三方定义 JSON-safe 的中间 ClipShape，但每个完整裁剪实现必须同步维护两套 definition、registry、compile options、provider key 与装配依赖；Standard 的每种官方裁剪也因此产生 operation 与 shape 两组公共对象。对于最终都降低为同一 `SceneClipPath` 的静态二维裁剪，这个公开拆分没有形成两个可独立消费的能力，反而允许 operation kind 与 shape kind 漂移，使一个裁剪实现的 schema、解析和降低契约被拆散。

本决策保留 `ClipShape` 作为 JSON-safe 的内部阶段与递归组合数据契约，但将 spec 解析、shape 校验和 Scene path lowering 合并到一个 `ClipDefinition`。Core 对外只开放 `clips` 这一条扩展与装配路径；内置、Standard 和第三方裁剪使用同一 definition、registry、provider capability、编译消费与诊断链路。Core 仍只默认提供矩形裁剪，canonical `SceneClipPath`、Scene resource 与 renderer 行为保持不变。

## 决策：每个裁剪 kind 由一个完整 ClipDefinition 拥有

一个 `ClipDefinition` 以唯一非空 `kind` 同时拥有 authored spec schema、spec 到 ClipShape 的解析、完整 shape schema 和 ClipShape 到 `SceneClipPath` 的 lowering。definition 解析出的 `shape.kind` 必须与 definition `kind` 相同；递归降低 shape 时也按该 kind 回到同一个 Clip registry。需要复用几何或 schema 的多个裁剪 kind 可以共享普通 helper，但不能通过第二个公开 registry 把完整实现拆成独立 operation 与 shape provider。

Core 删除独立的 `ClipShapeDefinition`、`defineClipShape`、`clipShapes` compile option、`clipShape` provider capability 及其 registry。`CompileOptions.clips`、Core provider definitions 和 React / Vanilla 接线只传递 `ClipDefinition`。每个 `clip` provider 直接生成完整 definition，不再依赖同 kind 的 shape provider。Compound 等递归裁剪继续通过 definition context 解析 child spec、降低 child shape；实际 child kind 的 definitions/providers 仍必须由调用方显式提供，Core 不扫描 IR、动态安装包或维护全局 registry。

Core 默认矩形 definition 同时完成 rect spec 校验、JSON-safe shape 解析和结构化路径 lowering。`ClipShape`、`SceneClipPath`、canonical path 校验、precision、resource 去重、bounds、hit-test 与 renderer 消费继续由 Core 拥有；删除的是独立的外部 ClipShape 扩展入口，不是中间数据阶段或 Scene 表达。

理由：

1. 一个裁剪 kind 的输入、内部形状和 lowering 是同一个可独立装配的能力，应由一个 definition 冻结并统一诊断
2. 单一 registry 仍允许第三方完全自定义 spec、JSON-safe shape 与路径 lowering，同时消除两套 options、provider key 和缺失依赖错误
3. 强制 definition kind 与 shape kind 一致，使解析、递归 dispatch、冲突和 provenance 只有一个稳定身份
4. canonical `SceneClipPath` 已是 SVG、Canvas、headless bounds 与 hit-test 的后端最大公约数，无需改变 Scene 或 renderer

## 基础数据结构与公开契约

以下形态冻结单一扩展边界；具体只读修饰与类型擦除由实现保持等价：

```ts
type ClipShape = IRJsonObject & {
  kind: string;
};

type ClipDefinitionInput<TClip extends ClipLike, TShape extends ClipShape> = {
  kind: TClip['kind'] & TShape['kind'];
  schema: z.ZodType<TClip>;
  resolve: (spec: TClip, context: ClipResolveContext) => TShape;
  shapeSchema: z.ZodType<TShape>;
  lower: (shape: TShape, context: ClipLowerContext) => SceneClipPath;
};

type ClipDefinition<TClip extends ClipLike = ClipLike, TShape extends ClipShape = ClipShape> = ClipDefinitionInput<
  TClip,
  TShape
>;

type ClipResolveContext = {
  round: (value: number) => number;
  resolve: (clip: IRClip) => ClipShape;
};

type ClipLowerContext = {
  round: (value: number) => number;
  lower: (shape: ClipShape) => SceneClipPath;
};

type CompileProviderOptions = {
  clips?: ReadonlyArray<ClipDefinition>;
};

type CoreProviderCapability = 'clip' /* | ... */;
```

`defineClip` 是唯一 author-facing helper。spec 经 `schema` 解析后才进入 `resolve`；其返回值先复制为纯 JSON snapshot，再由同一 definition 的 `shapeSchema` 校验并确认 `shape.kind === definition.kind`，之后才能进入 `lower`。递归 `context.resolve` 与 `context.lower` 都使用当前 Clip registry，并共享现有 cycle / depth 保护。lowering 产出的 `SceneClipPath` 继续经过 Core 的 canonical path 校验与规范化。

## 行为、失败语义与兼容性

- 默认行为：Core-only compile 默认只注册完整的 `rect` ClipDefinition；显式提供相同 definitions 时，相同 IR、precision 与 provider 顺序继续产生确定且跨 renderer 等价的 canonical `SceneClipPath`
- 递归行为：Compound 可以递归解析任意已注册 child clip，并按 authored 顺序降低 child shape；外层 fill rule、cycle / depth、空集合与零面积语义保持既有契约
- 失败与诊断：未知 kind 统一报告 Clip kind 与 `CompileOptions.clips`。无效 spec、无效或非 JSON shape、definition/spec/shape kind 不一致、非法 canonical path、重复 registry key、递归 cycle / depth overflow 均 fail-loud，不得被降级为矩形或跳过裁剪
- 兼容性 / breaking：删除 `ClipShapeDefinition`、`AnyClipShapeDefinition`、`ClipShapeDefinitionInput`、`defineClipShape`、`CompileOptions.clipShapes`、provider definitions 的 `clipShapes` 与 `CoreProviderCapability.ClipShape`。`ClipShapeLowerContext` 由 `ClipLowerContext` 取代；`RectClipShapeDefinition`、`BUILTIN_CLIP_SHAPES`、`BuiltinClipShapeProviderName`、`resolveClipShapeRegistry` 及独立 ClipShape provider / registry 不再公开，也不保留 alias。`ClipShape` 与 `RectClipShape` 作为单一 Clip contract 的数据类型继续公开。既有同 kind 自定义 `ClipDefinition` 必须补充 `shapeSchema` 与 `lower`；既有跨 kind 实现必须以原 operation/spec kind 作为唯一 definition kind，同步改写 resolved `shape.kind`、shape schema literal 与 provider key，并删除原 shape kind provider。所有迁移都不保留 fallback 或两级接口兼容层
- Scene 与 renderer：`ClipResource.path`、`SceneClipPath`、Scene / ScenePatch validator、visual bounds、hit-test、SVG、Canvas 与 Node Canvas 契约不变，不接收 runtime definition 或 renderer-specific callback
- React / Vanilla 等价性：两者只收集并转交同一个 `clips` definitions 集合；直接 JSON、Vanilla、React、SSR 与 retained processing 对相同 definitions 产生相同 Scene 和诊断
