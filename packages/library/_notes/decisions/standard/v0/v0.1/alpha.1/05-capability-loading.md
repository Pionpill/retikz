# ADR-05：建立 Standard capability module 与显式 preset

- 状态：Accepted
- 决策日期：2026-07-26
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-grid-composite.md) · [ADR-02](./02-axes-composite.md) · [ADR-03](./03-frame-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

Grid、Axes 与 Frame 已分别公开 schema、factory 和 `CompositeDefinition`。React 组件通过静态 `EmbeddableTier2Adapter` 在当前 `<Layout>` 内按使用贡献 definition；Vanilla builder 通过调用方显式传入的 `VanillaTier2Adapter` 做同样的局部贡献。直接编译持久化 Standard IR 时，调用方则需要把每项 definition 手工写入 `CompileOptions.composites`。

这三条路径都复用了 Core 的 composite registry，但随着 Standard 在后续 alpha 增加布局和逻辑语义组件，直接 IR、服务端编译、工具链与 LLM 生成文档会不断重复维护 definition 数组。Standard 需要一种可按项、按组或全量选择官方能力的纯组合入口，同时必须避免形成第二套 provider registry、import 副作用或 Core 到 Standard 的反向依赖。

React 与 Vanilla 的 authoring 协议并不相同：React 组件能携带静态 adapter，Vanilla embed 必须从 runtime options 查找 adapter。`@retikz/standard` 又不能依赖任一宿主包。因此 capability bundle 只拥有宿主无关的 Core definition 组合；它不尝试把 React / Vanilla adapter 塞进同一个跨宿主 manifest。

## 决策：module 组合 Core definitions，adapter 保持现有按宿主接线

`@retikz/standard` 新增 capability module 与 bundle 合同。v0.1 只有 composite capability，因此合同只组合 `CompositeDefinition`；不提前为尚未进入 Standard 的 shape、arrow、pattern 等 provider family 冻结字段。

```ts
type StandardCapabilityModule = Readonly<{
  name: string;
  composites: ReadonlyArray<CompositeDefinition>;
}>;

type StandardBundle = Readonly<{
  modules: ReadonlyArray<string>;
  compile: Readonly<{
    composites: ReadonlyArray<CompositeDefinition>;
  }>;
}>;

declare const createStandardBundle: (modules: ReadonlyArray<StandardCapabilityModule>) => StandardBundle;
```

首批能力分别公开：

```ts
declare const GridModule: StandardCapabilityModule;
declare const AxesModule: StandardCapabilityModule;
declare const FrameModule: StandardCapabilityModule;

declare const StandardAllPreset: StandardBundle;
```

module 名固定为对应 capability key：`standard.grid`、`standard.axes`、`standard.frame`。`StandardAllPreset` 等价于 `createStandardBundle([GridModule, AxesModule, FrameModule])`，并随 Standard 版本显式增加后续已发布 module；它不是跨版本固定集合。

`StandardCapabilityModule` 是 bundle 的结构化分组输入，不是新的 provider definition，也不承担 composite lookup。它不新增 `defineStandardCapabilityModule()`：官方 module 由 Standard 自己声明，第三方能力继续使用 Core `defineComposite()` 并可直接传入 `CompileOptions.composites`；确需参与组合时，也可以用同一只读结构传给 `createStandardBundle()`，无需注册到 Standard。`createStandardBundle()` 不检查官方名称白名单，也不维护 module registry。

`StandardBundle.compile.composites` 刻意收窄为必填字段，不直接写成 `Pick<CompileOptions, 'composites'>`，因为 Core option 允许省略，而每个 Standard bundle（包括空 bundle）都保证暴露一个确定数组。

### 组合规则

`createStandardBundle()` 遵守以下规则：

1. 输入和 module 内 definition 数组保持声明顺序，函数不修改调用方数组
2. 空 module 列表合法，产生 `modules: []` 与 `compile.composites: []`
3. module `name` 必须是非空字符串；同一 bundle 中重复 name 立即 fail-loud
4. `createStandardBundle()` 复制 module name 与 definition 引用，冻结返回的 bundle、`modules`、`compile` 与 `compile.composites`；它不修改或冻结输入 module、输入数组与 definition。`GridModule`、`AxesModule`、`FrameModule` 这些官方常量及其 `composites` 数组由 Standard 自身在运行时冻结
5. 不复制 composite 的 `namespace.type` key 解析和冲突优先级。不同 module 提供重复 provider key 时，bundle 只保持顺序，Core `resolveCompositeRegistry()` 继续给出 `duplicate composite registration` 诊断
6. module 与 bundle 都是运行时配置对象，包含 definition 函数，不进入 IR、JSON、Scene 或 renderer descriptor
7. 导入 module / preset 不注册任何全局状态；没有把 bundle 传入 compile options 时，Core 行为与未安装 Standard 相同

module name 只负责 bundle 级去重和诊断，不是新的 provider lookup key。实际 composite lookup 仍只读取 definition 的 `namespace` 与 `type`。

### 代码归属

Capability module 持有 Core `CompositeDefinition`，不符合 dependency-free `shared/` 的准入条件。本 ADR 将 roadmap 中原计划由 `shared/` 承载的 module / bundle 调整为独立 `capability/` owner：

```text
packages/library/standard/src/
  capability/              # StandardCapabilityModule、StandardBundle 与纯组合
  composites/
    grid/module.ts         # GridModule
    axes/module.ts         # AxesModule
    frame/module.ts        # FrameModule
  preset/
    all.ts                 # StandardAllPreset
```

`capability/` 只依赖 `@retikz/core` 的公开 contract / compile option 类型和各 module 传入的 definition，不依赖具体 composite owner、adapter、renderer 或全局 registry。`preset/` 可以依赖 `capability/` 与各具体 module；反向依赖禁止。

## 宿主接线

### 直接 Core / 持久化 IR

```ts
import { compileToScene } from '@retikz/core';
import { createStandardBundle, FrameModule, GridModule } from '@retikz/standard';

const drawingBundle = createStandardBundle([GridModule, FrameModule]);
const scene = compileToScene(ir, drawingBundle.compile);
```

`StandardBundle.compile` 保持与 `CompileOptions` 结构兼容，但使用嵌套字段避免把 `modules` 元数据误传给 `<Layout>` 或 runtime options。

### React

JSX authoring 保持现状：`<Grid>`、`<Axes>`、`<Frame>` 的静态 adapter 只为当前图中实际出现的组件贡献 definition，不要求 preset。

```tsx
<Layout>
  <Grid bounds={{ min: [0, 0], max: [100, 80] }} spacing={10} />
</Layout>
```

`ir` prop 模式不能从 JSX 组件收集 definition，因此显式传 bundle 的 composite 列表：

```tsx
<Layout ir={persistedScene} composites={StandardAllPreset.compile.composites} />
```

同一能力不能同时由 JSX 静态 adapter 和显式 bundle 重复注入；若调用方混用，Core 保留 duplicate registration 的 fail-loud 语义。`@retikz/standard-react` 不新增 React 专用 bundle、Provider 或隐式 Context。

### Vanilla

Vanilla embed 仍由 adapter 负责 authoring 下沉。`@retikz/standard-vanilla` 新增只读的全量便利数组：

```ts
declare const StandardVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter>;
```

它按 Grid、Axes、Frame 的稳定顺序包含当前版本全部 Standard Vanilla adapters，并对导出数组做运行时浅冻结；不递归冻结 adapter 对象。部分加载继续显式写 `[GridVanillaAdapter, FrameVanillaAdapter]`，不通过 module name 再做一次 adapter lookup。

```ts
mountSvg(container, figure, { adapters: StandardVanillaAdapters });
```

直接传持久化 IR 时不需要 Vanilla adapter，只传 `compile: bundle.compile`。Vanilla embed 已从 adapter 自动贡献对应 composite 时，不再为同一能力同时传 bundle，重复时仍由 Core fail-loud。

## 公开入口与 tree-shaking

三个包只通过根入口公开稳定 API，与 Plot 包家族保持一致：

- `@retikz/standard`：schema、factory、definition、module、`createStandardBundle()` 与 `StandardAllPreset`
- `@retikz/standard-react`：Grid、Axes、Frame React authoring
- `@retikz/standard-vanilla`：builder、adapter 与 `StandardVanillaAdapters`

每项 capability 仍是独立 named export；按项或部分加载不要求建立逐组件 package subpath。三个包保持 `sideEffects: false`，由消费方 bundler 对未使用导出做 tree-shaking。`StandardAllPreset` 和 `StandardVanillaAdapters` 只有被显式引用时才是全量便利对象，导入包根本身不注册全局状态。

不使用 `"./*"` 通配符 exports，因为它会把 `composites`、`capability` 等源码组织意外升级为公共契约。若未来出现跨多个组件且需要独立加载的稳定能力族，再由对应 ADR 评估 `/layout`、`/logic` 等能力族入口；不为每个组件枚举 package export。

## 测试设计

Standard 最低层测试覆盖 module name、空 / 单项 / 部分 / 全量组合、`compile.composites` 的必填类型、稳定顺序、重复 module、返回容器与官方 module 的 runtime freeze、调用方输入不变以及不同 module 的重复 composite key 继续由 Core 诊断。另用 Core `defineComposite()` 创建第三方 definition，包装为普通结构化 module 后通过同一 bundle / Core resolver 编译，证明没有官方白名单或隐藏 module registry。直接 IR 分别证明按项、部分和 all preset 能下沉对应 composite，未选择的能力保持 `COMPOSITE_NOT_REGISTERED`。

React 覆盖 JSX 静态按需贡献不依赖 preset、`ir` prop 可消费 bundle composite，以及静态贡献与显式 bundle 重复时 fail-loud。Vanilla 覆盖浅冻结的 `StandardVanillaAdapters` 可处理全部当前 embed、部分数组只处理所选 adapter、直接 IR 只需 bundle，以及 adapter 与 bundle 重复注入保留 Core 冲突诊断。

package / publish 检查覆盖三个包根入口在开发态和 `pnpm pack --dry-run` 产物中的 runtime / types 可解析，并运行 `pnpm check:release-groups`、三个包 build 与 `pnpm test:publish-artifacts`。双语 docs 检查 `/standard/extension/capability-loading` 可从导航访问、zh / en 内容与 i18n 完整，并通过 docs `tsc --noEmit`。另证明仅导入 module / preset 不改变无 options 的 Core compile。renderer 不需要新增专门测试；所有输出仍是既有 Core Scene。

## 影响

- `@retikz/standard` 新增 `capability/` owner、三个首批 module、`createStandardBundle()` 与 `StandardAllPreset`
- `@retikz/standard-vanilla` 新增 `StandardVanillaAdapters`；各现有 builder / adapter 行为不变
- `@retikz/standard-react` 不新增 bundle 或 Provider；现有静态 embeddable 接线保持主路径
- 三包从根入口导出新增 API，不增加逐组件 public subpath
- roadmap 的代码结构示意从 `shared/` 承载 bundle 改为独立 `capability/` owner
- 双语 Standard introduction / get-start 与新的 capability loading 扩展页说明按项、部分、全量、React / Vanilla 和持久化 IR 路径
- 后续 Standard composite 必须同时提供 module，并在发布时决定是否进入 `StandardAllPreset` 与 `StandardVanillaAdapters`

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition 与扩展接入；本 ADR只组合已有 composite definition，不新增图形语义
- 解决的问题：让直接 IR、工具链和宿主以按项、部分或全量方式显式加载 Standard definitions，避免调用方散落维护 definition 数组
- 主责包与协作包：Standard 拥有 module / bundle / preset；Core 拥有 `CompositeDefinition`、registry、compile options 与冲突诊断；React / Vanilla 只保留各自 authoring adapter 接线
- 是否可由现有能力组合：可以。bundle 只是对 `CompileOptions.composites` 的确定性只读组合，不需要新 Core contract
- 是否需要下沉到依赖能力域：否。若未来多个非 Standard 能力组都需要通用跨 provider bundle，再由独立证据评估 Core 抽象；本轮不先下沉
- 内部表达链路：Standard module → `createStandardBundle()` → `bundle.compile.composites` → Core `resolveCompositeRegistry()` → 既有 composite expansion / compile
- 外部扩展链路：第三方能力继续直接实现 Core `CompositeDefinition` 并传入 `CompileOptions.composites`；Standard module 不替代 `defineComposite()`，也不建立 module registry
- 下游执行 / adapter 等价性：React JSX、Vanilla embed 与直接 IR 最终向同一 Core options 字段贡献相同 definition；SVG / Canvas 不认识 module 或 bundle
- 不支持边界与诊断：不组合 host options、layout policy、renderer options、React Context、Vanilla runtime state 或未进入 v0.1 的 provider family；module name 重复由 Standard 诊断，provider key 冲突与未注册能力由 Core 诊断
- 本轮结论：用当前 Core 能力组合表达，在 Standard 增加官方能力的显式装载与 preset 表面，不扩展 Drawing Complete 底座

## 实现结果

- `@retikz/standard` 已公开 module、不可变 bundle 与 `StandardAllPreset`；第三方结构化 module 继续沿 Core definition / registry 路径消费
- React JSX 保持静态 adapter 按使用项贡献；React `ir` 模式可显式传 bundle composites
- `@retikz/standard-vanilla` 已公开浅冻结的 `StandardVanillaAdapters`；部分 adapter 与直接 IR 路径保持显式
- 三个包只保留根 package exports，与 Plot 包家族一致；逐组件 subpath 与 Vite 多入口均未进入最终契约
- Standard、Standard React、Standard Vanilla 的 lint、类型检查、全量测试与 build 已通过；release-group、双语 docs integrity、docs 类型检查与 docs build 已通过
- `pnpm test:publish-artifacts` 仍要求先构建仓库其它发布包，未作为本次三个 Standard 包的独立通过证据；Standard changelog 数据切片留待 beta.1 发布准备统一接入

## 不在本 ADR 范围

- 修改 Core `CompileOptions`、provider resolver、composite registry 或 duplicate 规则
- 把 module / preset 写入 JSON IR、Scene、manifest 或 renderer descriptor
- React Provider、Context、hook、自动扫描 package 或 import 副作用注册
- 用 module name 映射 React / Vanilla adapter 的第二套 registry
- 合并 `measureText`、`lowerTex`、`onWarn`、padding、precision、depth 等宿主或编译策略
- 提前支持 Standard 尚未拥有的 shape、arrow、pattern、boundary、clip、path generator / kind 或 ribbon profile module 字段
- 为 JSX / Vanilla embed 与显式 bundle 的重复注入做静默去重
- 实现 alpha.2 之后的 Stack、Align / Distribute 或逻辑语义组件

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增三个包的公开入口、Standard module / bundle 类型与组合行为，并改变直接 IR 和 Vanilla 的推荐接入表面；不修改 IR schema、Core compile 或 renderer。

### Schema 改动

无。Capability module、bundle、preset 与 adapter 数组都是运行时配置，不能进入 JSON-safe IR。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/library/standard/src/capability/**`（新增）
- `packages/library/standard/src/composites/{grid,axes,frame}/module.ts`（新增）
- `packages/library/standard/src/composites/{grid,axes,frame}/index.ts`
- `packages/library/standard/src/preset/**`（新增）
- `packages/library/standard/src/index.ts`
- `packages/library/standard/tests/capability/**`、`packages/library/standard/tests/preset/**`（新增）
- `packages/library/standard/package.json`（清除逐组件 subpath，仅保留根 exports）
- `packages/library/standard-react/package.json`（清除逐组件 subpath，仅保留根 exports）
- `packages/library/standard-react/tests/capability-loading.test.tsx`（新增）
- `packages/library/standard-vanilla/src/preset/**`（新增）
- `packages/library/standard-vanilla/src/index.ts`
- `packages/library/standard-vanilla/tests/capability-loading.test.ts`（新增）
- `packages/library/standard-vanilla/package.json`（清除逐组件 subpath，仅保留根 exports）
- `apps/docs/src/modules/docs/contents/standard/{introduction,get-start}/index.{zh,en}.mdx`
- `apps/docs/src/modules/docs/contents/standard/extension/index.{zh,en}.mdx`（新增父分组页）
- `apps/docs/src/modules/docs/contents/standard/extension/capability-loading/**`（新增）
- `apps/docs/src/modules/docs/data/standard.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- `packages/library/_notes/decisions/standard/v0/v0.1/roadmap.md`
- `packages/library/_notes/decisions/standard/v0/v0.1/alpha.1/roadmap.md`
- 本 ADR 与 ignored 测试契约矩阵

不得修改 Kernel、renderer、其它 Standard composite 的 schema / lowering、React embeddable protocol、Vanilla normalize / runtime 或 Vite library config。三包 package exports 只允许删除本轮未提交的逐组件 subpath，使开发态 `exports` 与发布态 `publishConfig.exports` 均精确只含 `"."`。

### 测试象限

**Happy path（≥ 3）**：

- `single-module-bundle-exposes-one-composite`：`[GridModule]` → modules 与 composites 各含一个稳定条目，可直接编译 `IRGrid`
- `partial-bundle-preserves-module-order`：`[FrameModule, GridModule]` → name 与 definition 顺序逐字保持
- `all-preset-matches-current-standard-catalog`：`StandardAllPreset` → Grid、Axes、Frame 各出现一次，顺序稳定
- `third-party-structural-module-uses-core-definition-path`：Core `defineComposite()` + 普通只读 module → bundle 保留 name / definition 并由 Core resolver 编译；Standard 不检查官方名称或注册 module
- `persisted-ir-compiles-with-selected-bundle`：含所选 Standard nodes 的 JSON-safe scene + bundle.compile → 与直接 definitions 得到等价 lowered IR / Scene

**边界（≥ 2）**：

- `empty-bundle-is-valid-and-frozen`：`[]` → 空只读 bundle，不改变无 Standard options 的 Core 行为
- `bundle-composites-is-required-in-public-type`：空 / 单项 / all bundle → TypeScript 均可无空值分支读取 `bundle.compile.composites`
- `bundle-does-not-mutate-input-or-definitions`：冻结 / 可变输入数组与 definition 对象 → 输入顺序、对象身份与可扩展状态不被改写
- `official-module-and-bundle-containers-are-runtime-frozen`：官方 module / all preset / partial bundle 的公开容器 → 写入、push 或替换失败，调用方 module 与 definition 对象不被递归冻结
- `all-preset-is-versioned-not-global`：仅导入 all preset → 不修改后续无 options compile；显式传入后才生效

**错误路径（≥ 2）**：

- `bundle-rejects-empty-module-name`：空或纯空白 name → Standard fail-loud，不能生成匿名 module
- `bundle-rejects-duplicate-module-name`：同名 module 出现两次，即使对象引用相同 → Standard fail-loud
- `distinct-modules-with-duplicate-composite-key-defer-to-core`：不同 module 含同 namespace/type → bundle 保留两项，compile 抛 Core duplicate registration
- `unselected-composite-keeps-core-diagnostic`：bundle 未包含某 Standard node definition → `COMPOSITE_NOT_REGISTERED` 并跳过该节点
- `authoring-and-explicit-bundle-duplicate-fails-loud`：React JSX / Vanilla embed 已贡献 definition 且显式再传同一 bundle → Core duplicate registration，不静默去重

**交互（≥ 2）**：

- `react-jsx-remains-self-registering`：Grid / Axes / Frame JSX 不传 preset → 仍按当前图实际使用项贡献 definition
- `react-ir-mode-consumes-bundle-composites`：`<Layout ir>` + bundle composites → 直接 Standard IR 可编译，不需要伪 JSX
- `vanilla-all-adapters-lower-current-catalog`：三个 embed + `StandardVanillaAdapters` → 三个 adapter 和 definitions 各一次
- `vanilla-all-adapters-array-is-frozen`：全量数组不可 push / 替换，内部 adapter 对象不被递归冻结
- `vanilla-partial-adapters-remain-explicit`：只传 Grid / Frame adapters → 对应 embed 成功，未选 Axes 保留 missing adapter 诊断
- `vanilla-direct-ir-needs-bundle-not-adapter`：直接 Standard IR + bundle.compile → 编译成功且不读取 adapter 数组
- `root-exports-resolve-in-package-artifact`：三个包根入口的 runtime 与 types → 开发态、build 与 pack dry-run 均可解析
- `package-exports-remain-root-only`：三个包的 `exports` 与 `publishConfig.exports` key → 均精确等于 `["."]`，不残留逐组件或 wildcard subpath
- `capability-loading-docs-route-is-bilingual`：`/standard/extension/capability-loading` → zh / en 均可从导航访问，页面、i18n 与 docs 类型检查完整

### 依赖的现有元素

- `CompositeDefinition`、`defineComposite()`——module 中唯一允许的 v0.1 definition 类型与第三方扩展真源
- `CompileOptions.composites`、`resolveCompositeRegistry()`——bundle 唯一消费入口与 provider key 冲突诊断真源
- `compileToScene()`、`lowerIRToKernel()`——直接 IR 与 Scene / lowered IR 等价性证据
- `GridDefinition`、`AxesDefinition`、`FrameDefinition`——首批三个 module 的 definition
- `EmbeddableTier2Adapter` 与组件静态 `embeddableAdapter`——React JSX 现有按使用贡献主路径
- `VanillaTier2Adapter`、`VanillaNormalizeOptions.adapters`——Vanilla embed 显式 adapter 主路径
- 三包 `sideEffects: false`、Vite `preserveModules` 与根 package exports——named export 的 tree-shaking 和 pack 产物边界
