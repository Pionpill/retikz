# ADR-06：直接使用 CompositeDefinition 接入 Standard 能力

- 状态：Accepted（2026-08-03，人工确认）
- 决策日期：2026-08-03
- 关联：[alpha.3 roadmap](./roadmap.md) · [alpha.1 ADR-05](../alpha.1/05-capability-loading.md) · [alpha.2 ADR-06](../alpha.2/06-layout-artifacts-capabilities-adapters.md) · [Standard Library 设计](../../../../../architecture/standard-library-design.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
- 后继：[Notation alpha.1 ADR-01](../../../../../../../diagram/_notes/decisions/notation/v0/v0.1/alpha.1/01-notation-package-family.md) 已复用本 ADR 的直接 Definition loading 原则；Notation 不增加 capability bundle 或动态注册层

## 背景与目标

Standard 的 bundle 只把选中的 definitions 展平成 Core `CompileOptions.composites`，不负责动态 import、代码分包、运行时 registry 或跨包发现。当前官方 capability module 一项只贡献一个 definition，bundle 额外保存的 module 名称也不是 Core compile 契约的一部分。把这种 compile 选项包装成新的 Standard API 会让“按需使用组件”和“按需加载代码”产生歧义，并增加一层不拥有实际 lowering 或 registry 语义的组合对象

本 ADR 收缩 Standard 的公开契约，让每个 composite owner 直接提供 definition、factory、schema、artifact 与 lowering；调用方按图实际使用的能力，把选中的 definitions 传给 Core 现有 compile 入口

## 决策：直接 Definition 注入

`@retikz/standard` 不再公开以下组合 API：

- `StandardCapabilityModule`
- `StandardBundle`
- `createStandardBundle()`
- 各 composite 的 `*Module`
- `StandardAllPreset` 与 `StandardLayoutPreset`

直接 IR、服务端编译和工具链使用 Core 已有契约：

```ts
compileToScene(ir, {
  composites: [GridDefinition, FrameDefinition],
});
```

`composites` 的顺序、缺失 definition 的 warning、重复 composite key 的错误与重复注册诊断全部继续由 Core 唯一 registry 解释。Standard 不复制、过滤、静默去重或改写 Core 的冲突规则

组件 owner 仍然可以导出自己的 `XxxDefinition`，也可以为同一 owner 的 adapter 提供内部有序数组，但这些数组不形成 Standard 公共 preset，也不携带 module identity、版本 catalog 或自动加载语义

## React 与 Vanilla 接线

React JSX 保持现有静态 adapter 路径：组件只为当前 authoring 内容贡献需要的 definition，不新增 Provider、Context、hook 或全量 Standard 注册。直接 `ir` 模式把选中的 definitions 直接传给 Layout / Core compile options

Vanilla 保持现有 builder、adapter 与显式 adapter 数组。直接持久化 IR 使用 `{ composites: [...] }`；adapter 数组仍属于 `@retikz/standard-vanilla` 的 authoring 便利入口，不转化为 Standard compile preset

嵌套 Standard composite 或自定义 composite 仍必须在同一次 compile environment 中显式提供所需 definition。Standard 不根据 sample、IR discriminator 或 adapter 输入反向发现未知 definition

## 用户可观察行为与兼容性

- 直接 compile 只注册调用方传入的 definitions；未传入的 Standard composite 保持 Core 未注册诊断
- React 与 Vanilla 的 authoring 行为、canonical IR、Scene 与适用 artifact 保持不变
- 持久化 IR 不增加或删除字段；module、bundle 与 preset 从未进入 IR、Scene、manifest 或 renderer descriptor
- `@retikz/standard` 的旧组合名称在 0.x 中直接移除，不保留 alias、兼容桥或 deprecation wrapper
- 这是一项有意的公开 API 破坏性收缩；调用方把 `bundle.compile` 改为 `{ composites: [...] }`，把各 `*Module` 改为对应 `*Definition`
- ESM named exports 与 `sideEffects: false` 继续支持消费方 bundler tree-shaking，但不把它表述为运行时按需加载机制

## 功能与包边界

- `@retikz/standard` 拥有每个 composite 的 JSON-safe schema、definition、factory、artifact 与 lowering
- `@retikz/core` 拥有 `CompileOptions.composites`、composite registry、lookup、冲突诊断与 compile 行为
- `@retikz/standard-react` 与 `@retikz/standard-vanilla` 只拥有各自的 authoring、adapter 与宿主接线
- Plot、Table 等领域包直接组合所需 Standard definitions，并继续拥有自己的领域解析、provenance、locator 与交互语义
- Standard 不拥有动态组件加载、包级代码分割、全局 registry、能力发现或跨能力 catalog

## 被否决方案

- 保留 bundle 并仅重命名：仍然保留没有独立 compile 语义的包装层
- 继续发布 all preset：鼓励全量收集，与调用方按实际使用选择 definition 的目标相反
- 在 Standard 中加入动态 loader 或 package subpath registry：会把代码分发问题与 composite compile 契约混在一起，并新增另一套加载协议
- 让 adapter 自动发现并注册所有 Standard definitions：会破坏显式依赖、tree-shaking 与 Core 的缺失 definition 诊断

## 架构验证

- 该收缩复用 Core 已有 `CompositeDefinition` 与 `CompileOptions.composites`，不新增 IR、schema、registry、compile option、Scene 或 renderer 语义
- 内置与自定义 composite 继续进入同一 Core registry 与 compile 路径，缺失与冲突保持同一诊断来源
- React、Vanilla、直接 IR 仍以同一 canonical Standard input 和 Core compile environment 产生等价结果
- 组件 owner、Core、adapter 与领域包的依赖方向不变；移除的是 Standard 内部的组合包装层

## 测试策略摘要

测试需要证明直接 definitions 的 compile 选择、缺失与重复诊断、React / Vanilla authoring parity、nested composite 的显式依赖、根入口不再暴露旧组合名称，以及 docs 与实际 public API 一致。测试只依赖 Core 可观察 compile / Scene / diagnostic 结果，不以旧 bundle 或 preset 的内部结构作为新契约

## 不在本 ADR 范围

- Core 的动态 import、运行时插件系统或 package loader
- Standard composite 的 schema、factory、lowering、artifact 与 renderer 语义
- `@retikz/standard-vanilla` 自身的 adapter convenience array
- Plot、Table 或其它领域包的领域语义和 release 版本策略
