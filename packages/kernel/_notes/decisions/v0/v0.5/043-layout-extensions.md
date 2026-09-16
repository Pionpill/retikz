---
description: 将 React Layout 的九类扩展注册统一收敛到 extensions，复用 Core 类型与 Vanilla processing，保持注册和更新语义
keywords: Layout、extensions、LayoutExtensions、React、provider、registry
---

# ADR-043：Layout 扩展注册分组

- 状态：Accepted
- 决策日期：2026-09-16
- 关联：[Roadmap](./roadmap.md) · [Provider registry](../v0.4/022-provider-registry-contract.md) · [Adapter surface](../v0.4/025-adapter-surface-and-docs.md)

## 背景与目标

Layout 将绘图输入、宿主属性和扩展注册平铺为一级属性，扩展能力增加会持续扩大常用入口。扩展注册需要可发现的统一入口，同时保留各类 Definition 的类型约束和既有消费路径。

## 决策

React Layout 用可选的 `extensions` 对象接收九类扩展。公开 `LayoutExtensions` 复用 Core `CompileOptions` 的同名字段类型，不建立平行 Definition 或 registry。常用宿主属性、场景输入、动画与回调保持原有位置。

分组只改变 React 的接入路径。Core 拥有注册、重复 key 与未知能力诊断；Vanilla 拥有框架无关 processing；React 负责把 extensions 接入同一条处理链。

## 公开契约

```ts
type LayoutExtensions = Pick<
  CompileOptions,
  | 'shapes'
  | 'boundaries'
  | 'clips'
  | 'arrows'
  | 'patterns'
  | 'pathGenerators'
  | 'pathKinds'
  | 'composites'
  | 'themeStyles'
>;
```

```tsx
<Layout extensions={{ shapes: [fileShape], composites: [cardDefinition] }}>
  <Node shape="file" />
</Layout>
```

## 行为、失败语义与兼容性

- 不提供 extensions、提供空对象或空扩展数组时，继续使用内置能力；不新增默认扩展。
- 重建外层对象或包含相同有序 Definition 实例的数组，不因容器 identity 变化重建处理状态。有效 Definition 变化仍更新配置。
- themeStyles 继续与已有 Provider 输入按原规则合并；theme selector 和 rootScope 行为不变。
- 扩展是运行时配置，不进入持久化 IR；重复、未知名称和 Definition 错误仍由既有 Core 契约处理，不增加 adapter fallback。
- 删除九个旧顶层属性，不保留别名或兼容读取。其余属性包括 lowerTex、easings、animationProperties 保持原样。
- Vanilla 继续通过 ProcessingOptions.compile 接收同名扩展字段，与 React 共享 Definition 类型和实际编译路径；不为外层写法一致而改动 Vanilla 或 Core API。
