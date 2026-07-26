# ADR-05：建立 Standard capability module 与显式 preset

- 状态：Accepted
- 决策日期：2026-07-26
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-grid-composite.md) · [ADR-02](./02-axes-composite.md) · [ADR-04](./04-frame-header-composition.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

Grid、Axes、Frame 都通过 Core `CompositeDefinition` 注册。React 组件可在当前 Layout 静态贡献 definition，Vanilla embed 可显式传 adapter；但直接编译持久化 Standard IR 时，调用方必须重复维护 definitions 数组。

随着 Standard 增长，需要按项、部分或全量选择官方能力的纯组合入口，同时不能建立第二 registry、import 副作用、自动全局注册或 Core 到 Standard 的反向依赖。

## 决策

`@retikz/standard` 新增只组合 Core composite definitions 的 module 与 bundle：

```ts
type StandardCapabilityModule = Readonly<{
  name: string;
  composites: ReadonlyArray<AnyCompositeDefinition>;
}>;

type StandardBundle = Readonly<{
  modules: ReadonlyArray<string>;
  compile: Readonly<{
    composites: ReadonlyArray<AnyCompositeDefinition>;
  }>;
}>;

declare const createStandardBundle: (modules: ReadonlyArray<StandardCapabilityModule>) => StandardBundle;
```

alpha.1 公开 `GridModule`、`AxesModule`、`FrameModule` 与 `StandardAllPreset`。module 名固定为 `standard.grid`、`standard.axes`、`standard.frame`；all preset 等价于按该顺序组合三项，并随 Standard 版本显式扩展，不是跨版本固定集合。

`StandardCapabilityModule` 不是 provider definition 或 module registry。第三方能力仍通过 Core `defineComposite()` 创建 definition，可直接传入 `CompileOptions.composites`，也可用相同只读结构参与 bundle；Standard 不检查官方白名单。

### 组合与不可变性

- 输入 module 顺序与每个 module 内的 definition 顺序逐字保留
- module name 必须非空且唯一；重复 name 在 Standard 层 fail-loud
- 不同 module 中重复 composite key 原样保留，由 Core registry 给出唯一权威冲突诊断
- 空 bundle 合法，并确定暴露 `compile.composites: []`
- bundle、modules、compile 与 composites 容器做运行时浅冻结；不递归冻结调用方 module 或 definition 对象
- 创建 bundle 与导入 preset 都不改变无 options 的 Core compile；能力只在调用方显式传入时生效

### 宿主接线

React JSX 保持组件静态 adapter 主路径：按当前图实际使用的 Grid / Axes / Frame 贡献 definition，不新增 Provider、Context、hook 或全量 preset。React `ir` 模式可把 `bundle.compile.composites` 显式传给 Layout。

Vanilla 公开浅冻结的 `StandardVanillaAdapters`，按 Grid、Axes、Frame 顺序提供当前版本全量便利入口。部分 adapter 仍由调用方显式选择；直接 IR 使用 bundle definitions，不读取 adapter 数组。

若 authoring adapter 已贡献 definition，调用方再传相同 bundle 会保留 Core duplicate registration 诊断，不做隐式去重。

### 公开入口与 tree-shaking

三包只公开根 package entry。所有能力通过根入口 named exports 提供，`sideEffects: false` 允许消费方 bundler tree-shake 未使用导出。不会为每个组件维护 `./grid`、`./axes`、`./frame`、`./preset` 等 package exports，也不增加 Vite 多入口。

开发态 `exports` 与发布态 `publishConfig.exports` 都只包含 `"."`；runtime 与 declarations 从打包后的根入口解析。

## 被否决的方案

- 第二套 Standard registry：会与 Core definition / resolver / diagnostics 产生双重真源
- import 副作用或自动全量注册：破坏局部可组合性、测试隔离和 tree-shaking
- 把 React / Vanilla adapters 塞入跨宿主 bundle：两种 authoring 协议不同，且 Standard 不能依赖宿主包
- 每组件 package subpath：组件增长后需要同步维护 manifest 与构建入口，named exports 已满足按需消费
- Standard 私有 provider 冲突策略：duplicate key 应由 Core registry 统一诊断

## 公开影响与兼容性

- `@retikz/standard` 新增 `StandardCapabilityModule`、`StandardBundle`、`createStandardBundle()`、三个官方 module 与 `StandardAllPreset`
- `@retikz/standard-vanilla` 新增 `StandardVanillaAdapters`
- `@retikz/standard-react` 不新增 bundle API，继续使用静态 adapter
- module / bundle / preset 不进入 IR、Scene、manifest 或 renderer descriptor
- 后续 Standard composite 必须提供 module，并在发布时显式决定是否进入 all preset 与 Vanilla adapter 数组

## 最终实现与验证摘要

- bundle 只用 Core `AnyCompositeDefinition` 承载异构 definitions；按序、空 bundle、浅冻结、第三方结构 module、重复 module name 与 Core provider 冲突边界均已实现
- React 按使用项贡献、React IR 显式 bundle、Vanilla 部分 / 全量 adapters 与直接 IR bundle 路径均有自动化证据
- 三包 manifest 已由精确测试锁定为 root-only exports；未引入 wildcard 或逐组件 subpath
- 双语 introduction、get-start 与 capability loading 扩展页已同步按项、部分、全量及宿主接线方式
- Standard、Standard React、Standard Vanilla 的 lint、类型检查、全量测试和 build，以及 release-group、docs integrity、docs 类型检查与 docs build 已通过

## 遗留边界

- alpha.1 bundle 只承载 composite definitions；尚未进入 Standard 的 shape、arrow、pattern 等 provider family 不预留字段
- bundle 不组合 measureText、lowerTex、onWarn、layout policy、renderer options 或宿主 runtime state
- 若未来多个能力组都需要通用跨 provider bundle，再基于独立证据评估下沉 Core；当前不提前抽象
- 完整仓库 publish-artifact 检查仍要求先构建全部发布包；Standard 三包应在发版阶段单独检查 pack / dry-run 产物
