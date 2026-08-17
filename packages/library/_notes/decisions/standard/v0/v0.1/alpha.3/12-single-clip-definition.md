# ADR-12：Standard 单一 Clip Definition 接入

- 状态：Accepted
- 决策日期：2026-08-16
- 关联：[alpha.3 roadmap](./roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [ADR-11](./11-standard-clip-shapes.md) · [Core ADR-22](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/22-single-clip-definition.md)

## 背景与目标

Standard 当前为 `circle`、`ellipse`、`polygon`、`path`、`compound` 分别公开 Clip operation definition 与 ClipShape definition，并同时维护 `StandardClipDefinitions`、`StandardClipShapeDefinitions` 及两组 providers。这是 Core ADR-21 两级扩展入口的直接映射，但每种裁剪只有在两组对象共同装配时才完整可用，`clipShapes` 并不是 Standard 使用者可独立选择的能力。

Core ADR-22 将完整裁剪能力收敛为单一 `ClipDefinition`。本决策让 Standard 五种官方裁剪接入该契约：每个 definition 同时拥有 spec schema、JSON-safe shape schema、resolve 与 lowering；`@retikz/standard/clip` 只公开一个 definitions 集合和一组 clip providers。Standard 继续拥有五种可选裁剪实现，Core 继续只保留最常用的 `rect`。

## 决策：五种官方裁剪各由一个完整 Definition 和 Provider 提供

`CircleClipDefinition`、`EllipseClipDefinition`、`PolygonClipDefinition`、`PathClipDefinition` 与 `CompoundClipDefinition` 改为 Core ADR-22 定义的完整 ClipDefinition。每个 definition 的 spec kind、resolved shape kind 与 registry kind 相同，并在同一对象上提供 `schema`、`resolve`、`shapeSchema` 与 `lower`。Circle、Ellipse、Polygon 与 Path 继续保持现有字段和几何；Compound 的 authored children 继续是开放 `IRClip`，resolved children 继续是开放 `ClipShape`，并通过当前 Clip registry 递归解析和降低。

Standard 只保留 `StandardClipDefinitions` 作为五种完整 definitions 的集合。删除 `StandardClipShapeDefinitions`、五个 `XxxClipShapeDefinition` 与五个 `XxxClipShapeProvider`。`StandardClipProviders` 只包含五个 `clip` providers；每个 provider 直接生成同 kind 的完整 definition，不再声明 `clipShape` 依赖。Compound 的动态 child definitions 仍由实际消费方显式贡献为 roots/catalog，Standard 不扫描 IR、不自动安装全量集合，也不通过根入口产生副作用注册。

直接编译只注入 `clips`：

```ts
compileToScene(scene, {
  clips: [PathClipDefinition],
});
```

理由：

1. Standard 的每种裁剪只有一个可独立消费的功能单元，definitions、providers 与文档应与该单元一一对应
2. spec、shape 与 lowering 留在同一个可选 owner，仍保持 Core registry、Scene 和 renderer 的单一真源
3. 删除 shape provider 依赖后，显式装配只需表达实际使用的 Clip kind，缺失与冲突诊断更直接
4. 五种形状继续使用结构化 canonical path，不引入 Standard 私有 IR、Scene、registry 或 renderer 分支

## 基础数据结构与公开契约

```ts
declare const CircleClipDefinition: ClipDefinition<IRCircleClip, CircleClipShape>;
declare const EllipseClipDefinition: ClipDefinition<IREllipseClip, EllipseClipShape>;
declare const PolygonClipDefinition: ClipDefinition<IRPolygonClip, PolygonClipShape>;
declare const PathClipDefinition: ClipDefinition<IRPathClip, PathClipShape>;
declare const CompoundClipDefinition: ClipDefinition<IRCompoundClip, CompoundClipShape>;

declare const StandardClipDefinitions: ReadonlyArray<ClipDefinition>;
declare const StandardClipProviders: ReadonlyArray<CoreDependencyProvider>;
```

五种 spec 与 shape 的 JSON 字段、默认 `nonzero` fill rule、authored point / command / child 顺序保持不变。Circle、Ellipse、Polygon 与 Path 可以复用同义 schema；Compound 仍分别校验 authored child spec 与 resolved child shape。`ClipShape` 及五种具体 shape 类型作为 definition 内部阶段的数据契约保留，但不再形成独立 definitions 集合、registry 或 provider capability。

## 行为、失败语义与兼容性

- 默认行为：五种 Standard Clip 的几何、precision 后 Scene path、visual bounds 与 SVG / Canvas 输出保持现有可观察语义；Core-only 默认仍只有 `rect`
- Compound：children 非空并按 authored 顺序递归 resolve/lower；外层 fill rule 覆盖 child 自带规则，结果仍是单一累积路径的 winding/parity 区域而非几何交集
- 失败与诊断：无效 spec 或 shape 由同一个 Standard definition 诊断；缺少 child Clip provider、重复 kind、非法 JSON shape、kind 不一致、递归 cycle / depth 与非法 canonical path 沿 Core ADR-22 的统一错误边界 fail-loud
- 兼容性 / breaking：删除五个 `XxxClipShapeDefinition`、五个 `XxxClipShapeProvider` 与 `StandardClipShapeDefinitions`，调用方只传 `clips` 或声明 `clip` provider roots。不保留 re-export、旧集合别名、自动补全或两级 provider fallback
- Layout：allocation clip 继续使用 Core `rect`，不依赖 `@retikz/standard/clip`
- React / Vanilla 等价性：Standard adapters、Surface、Chart、Table 与其它 consumer 只贡献完整 Clip providers；直接 Core、React、Vanilla、SSR 与 retained processing 使用同一个 registry 和诊断语义
