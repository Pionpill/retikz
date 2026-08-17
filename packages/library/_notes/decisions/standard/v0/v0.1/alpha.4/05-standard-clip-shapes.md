# ADR-05：Standard 裁剪形状与两级 Provider

- 状态：Superseded（由 [ADR-06](./06-single-clip-definition.md) 取代）
- 决策日期：2026-08-16
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.4 roadmap](./roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Core ADR-21](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/21-extensible-clip-shapes.md) · [ADR-02](./02-core-minimal-builtins-and-standard-provider-entrypoints.md)

## 背景与目标

Standard alpha.4 ADR-02 已把 `polygon`、`path`、`compound` 的 Clip operation schema 与 definitions 迁入 `@retikz/standard/clip`，但它们仍只能返回 Core 封闭的 Scene `ClipShape`。`circle`、`ellipse` 也继续由 Core 同时拥有 spec、shape 和实现，因此 Standard 只取得部分输入 API，第三方和官方扩展仍受 Core 内置形状集合限制。

Core ADR-21 建立 `ClipDefinition → ClipShapeDefinition → SceneClipPath` 两级扩展链，并将 Core 默认裁剪收敛为 `rect`。本决策在该底座上让 Standard 完整拥有 `circle`、`ellipse`、`polygon`、`path`、`compound` 的 operation spec、ClipShape、两级 definitions 和静态 providers，同时保持直接 Core、provider contribution、React、Vanilla、SSR 与官方 Tier 2 的显式装配闭环。

## 决策：五种官方 ClipShape 全部由 Standard 提供

`@retikz/standard/clip` 提供 Circle、Ellipse、Polygon、Path 与 Compound 五种 ClipShape。前四种 operation spec 与 resolved shape 字段完全同义，复用各自唯一 schema；Compound operation 的 children 是开放 `IRClip`，resolved Compound shape 的 children 是开放 `ClipShape`，因此分别拥有 spec schema 与 shape schema，但共享同一个 `kind: 'compound'` 和 fill rule 语义。

每种能力同时提供 `XxxClipDefinition` 与 `XxxClipShapeDefinition`。Clip Definition 只把已校验 spec 解析成对应 JSON-safe shape；ClipShape Definition 负责降低到 Core `SceneClipPath`：Circle 使用完整圆弧，Ellipse 使用完整椭圆弧，Polygon 使用 authored 顶点顺序生成闭合子路径，Path 传递结构化 commands，Compound 按 authored child 顺序递归累积 commands 并以外层 fill rule 统一解释全部子路径。

每个 operation provider 的 key 仍是 `{ capability: 'clip', name: kind }`，并依赖同 kind 的 `{ capability: 'clipShape', name: kind }` provider。`StandardClipProviders` 同时提供五个 shape providers 与五个 operation providers，供 resolver 从显式 roots 解析可达闭包；它不是自动注册 bundle。直接 `compileToScene` 使用 `StandardClipDefinitions` 与 `StandardClipShapeDefinitions` 分别注入两级 definitions。

Compound 的直接静态依赖只有 Compound ClipShape provider。它可以包含任意 Standard 或第三方 operation，因此调用方必须同时把实际 child operation roots 及其 provider catalog 作为 contribution 提供；Compound 不从 IR 反向扫描 package、不隐式安装全部 Standard clips。使用直接 compile options 时，调用方同样只注入实际需要的两级 definitions，或显式使用 Standard 全集合。

本决策演进并取代 ADR-02 表格中 Clip 的内置所有权结论：Core 默认内置从 `rect`、`circle`、`ellipse` 收敛为仅 `rect`，Standard 官方扩展从 `polygon`、`path`、`compound` 扩展为五种形状。ADR-02 的能力子入口、无全局注册、显式 provider graph、冲突和跨入口装配原则保持有效。

Core 保留的 `rect` 同时承载正面积与零尺寸裁剪；任一轴为零时表示空区域。Layout 因此始终使用 Core rect 表达 allocation clip，不依赖 Standard Path provider；Standard `path` 只服务显式选择该可选 operation 的作者和上层 composite。

理由：

1. spec、shape 与 lowering 由同一个可选 owner 提供，才是真正的实现迁移，而不是 Core 类型的包装层
2. 五种形状都能通过 Core 统一结构化路径表达，不需要 Standard 依赖 renderer 或建立私有 Scene
3. operation provider 显式依赖 shape provider，使缺失、冲突和传递装配在 dispatch 前可诊断
4. Core 仅保留矩形即可完成最小 Scope clip 闭环，其余几何不应成为所有 Core 消费者的常驻内置

## 基础数据结构与公开契约

```ts
type CircleClipShape = {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
};

type EllipseClipShape = {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

type PolygonClipShape = {
  kind: 'polygon';
  points: Array<IRPosition>;
};

type PathClipShape = {
  kind: 'path';
  commands: Array<PathCommand>;
  fillRule?: IRClipFillRule;
};

type CompoundClipShape = {
  kind: 'compound';
  children: Array<ClipShape>;
  fillRule?: IRClipFillRule;
};

declare const CircleClipDefinition: ClipDefinition<IRCircleClip, CircleClipShape>;
declare const CircleClipShapeDefinition: ClipShapeDefinition<CircleClipShape>;

declare const StandardClipDefinitions: ReadonlyArray<ClipDefinition>;
declare const StandardClipShapeDefinitions: ReadonlyArray<ClipShapeDefinition>;
declare const StandardClipProviders: ReadonlyArray<CoreDependencyProvider>;
```

同名 `Ellipse`、`Polygon`、`Path`、`Compound` definitions 与 providers 遵循相同命名。直接编译 Path Clip 的最小装配为：

```ts
compileToScene(scene, {
  clips: [PathClipDefinition],
  clipShapes: [PathClipShapeDefinition],
});
```

provider contribution 以 Path operation 为 root 时，provider catalog 必须同时包含 `PathClipProvider` 和它依赖的 `PathClipShapeProvider`。缺少 shape provider 会在 Core provider graph 解析期报告完整 capability/kind，不延迟到 renderer。

## 行为、失败语义与兼容性

- 默认行为：五种 Standard ClipShape 的几何、authored 顺序、默认 `nonzero` fill rule、precision 后 Scene、visual bounds 与 SVG / Canvas 输出保持现有可观察语义；canonical path 由 Core 统一校验和规范化
- Compound：children 非空并按 authored 顺序递归 resolve/lower；外层 `fillRule` 覆盖 child path/compound 自带规则，缺省为 `nonzero`。结果是单一累积路径的 winding/parity 区域，不是 child 几何交集；需要交集时使用嵌套 Scope clip
- 失败与诊断：无效 spec 由对应 Standard schema 诊断；缺少 operation/shape provider、重复 kind、非法 shape output、递归 cycle/depth 与非法 canonical path 沿 Core ADR-21 的统一错误边界处理。Standard 不捕获后降级为 `rect`、跳过 clip 或偷偷安装定义
- 兼容性 / breaking：`CircleClipShape`、`EllipseClipShape`、`PolygonClipShape`、`PathClipShape`、`CompoundClipShape` 改从 `@retikz/standard/clip` 导入；Circle/Ellipse Clip spec 与 definitions 也改从该子入口取得。旧 Core 导出和默认内置被删除，不保留 alias。既有 Standard Polygon/Path/Compound ClipDefinition 名称保持，但调用方必须同时装配 shape definitions/providers
- Layout：零尺寸 allocation 继续裁掉全部内容，但统一通过 Core `rect` 表达；Layout 不声明 Standard provider root，也不要求宿主预装 `@retikz/standard/clip`
- React / Vanilla 等价性：Standard React/Vanilla 不新增 ClipShape registry；它们与 Surface、Chart、Table 等 consumer 只声明 Core provider roots/catalog，并由同一个 Core resolver 物化两级 definitions。相同 IR 和 contribution 在直接 Core、React、Vanilla、SSR 与 retained processing 中得到相同 Scene 和诊断

## 实施结论

五种可选 ClipShape 的 schema、IR、shape、两级 definitions 与 providers 已统一由 `@retikz/standard/clip` 拥有，Core 默认裁剪集合已收敛为 `rect`。直接编译、provider contribution、React、Vanilla、Surface 及官方领域 consumer 均通过同一两级 registry 显式装配，Layout 的 allocation clip 保持 Core-only。

验证覆盖公开导出、schema 与 definition 契约、provider 可达闭包、precision、Compound 递归与第三方 child、零尺寸 bounds、跨 adapter / Tier 2 接入及双语文档。迁移不保留旧 Core 导出、兼容 alias、隐式全量安装或 renderer 旁路。
