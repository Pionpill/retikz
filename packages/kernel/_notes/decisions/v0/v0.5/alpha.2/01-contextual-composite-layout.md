# ADR-01：上下文化 Composite 布局事务

- 状态：Proposed
- 决策日期：2026-07-23
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Table Core gate](../../../../../../viz/_notes/decisions/table/v0/v0.1/alpha.2/01-core-constrained-layout-gate.md) · [Table transaction](../../../../../../viz/_notes/decisions/table/v0/v0.1/alpha.2/06-layout-lowering-manifest-and-migration.md)

## 背景

现有 `CompositeDefinition.expand(node)` 是纯结构变换：Core 在 traversal 前递归把 Tier 2 composite 展开为 Tier 1 IR，然后再做 Node / Path / Scope 布局。这适合 Plot、Grid、Axes 等可以只根据自身 spec 和显式尺寸生成 Core IR 的能力，却无法表达 Table 的二维反馈循环：

```text
Cell 内容 intrinsic size
  → auto / minmax track 求解
    → 最终 Cell content box
      → 内容在有限宽度下换行或保持溢出
        → 自动行高、边框与最终 manifest
```

若 Table 自行估算文字、自建 composite 递归或 deep import Core compile，会复制 `measureText`、shape、clip、path、scope transform、reference 和 provider 语义。若 Table 在 `expand()` 内嵌套调用 `compileToScene()`，probe 与宿主 compile 又会使用不同的 occurrence、artifact sink 和引用环境，并重复展开、布局和发布 nested artifact。

`lowerIRToKernel()` 的使命是无布局地输出 JSON-safe Tier 1 IR。需要真实 host measurer、provider 与约束反馈的 composite 无法在该入口中保持精确 replay；把 Scene primitive 或布局快照加入 IR 会混淆“用户输入描述”和“编译缓存”。因此上下文化 composite 只属于完整 compile，不扩张持久化 IR。

## 决策：同一 Composite registry 支持 structural expand 与 contextual compile

`CompositeDefinition` 变为互斥 union，但仍由 `defineComposite()` 校验、进入同一个 `CompileOptions.composites` registry，并按相同 `${namespace}.${type}` key dispatch。

```ts
type StructuralCompositeDefinition<T> = CompositeDefinitionBase<T> & {
  expand: (node: T) => IRChild | Array<IRChild>;
  compile?: never;
};

type ContextualCompositeDefinition<T> = CompositeDefinitionBase<T> & {
  expand?: never;
  compile: (node: T, context: CompositeCompileContext) => CompositeCompileOutput;
};

type CompositeDefinition<T = unknown> = StructuralCompositeDefinition<T> | ContextualCompositeDefinition<T>;
```

现有 structural definition 不要求增加 discriminator，也不改变 `expand` 签名。`defineComposite()` 对同时缺少或同时提供 `expand` / `compile` fail-loud。Core 不建立第二个 layout registry，Table 也不声明私有 measurement provider。

`lowerIRToKernel()` 继续递归处理 structural definition；遇到 contextual definition 时携带 provider key 与 IR path 直接抛错，说明该 composite 需要完整 compile。`compileToScene()` 与 `compileWithArtifacts()` 同时支持两种 definition。

理由：

1. 两种 definition 的差异是执行阶段与所需 context，不是能力所有权；共同 registry 能保证内置与自定义 composite 走同一解析与冲突规则
2. 结构型能力保持最小纯函数表面，避免所有 Plot / Standard definition 被迫接触布局事务
3. 上下文化能力不能伪装成无环境 JSON lowering；明确拒绝比生成可能漂移的 Tier 1 IR 更可靠

## 决策：contextual composite 在 traversal occurrence 上执行

Core 不再把所有 composite 在 traversal 前一次性抹平。structural definition 可以继续复用纯递归展开 helper，但完整 compile 的统一 dispatch 移到 occurrence traversal：每个输入 composite 先取得 compile-local locator、当前 constraint 与 artifact probe sink，再选择 `expand` 或 `compile`。

```ts
type ChildLayoutConstraint = Readonly<{
  width?: number;
  height?: number;
}>;

type CompositeCompileContext = Readonly<{
  owner: CompositeOccurrenceLocator;
  constraint: ChildLayoutConstraint;
  layoutChild: (child: IRChild, constraint?: ChildLayoutConstraint) => ChildLayoutResult;
  replay: (result: ChildLayoutResult) => CompositeCompileChild;
  scope: (
    scope: Omit<IRScope, 'type' | 'children'>,
    children: ReadonlyArray<CompositeCompileChild | IRChild>,
  ) => CompositeCompileChild;
}>;
```

`layoutChild(child)` 表示两个轴 unconstrained 的 intrinsic probe；显式 constraint 表示 constrained probe。字段省略与显式 `0` 严格区分，给定值必须是有限非负数。constraint 是当前 occurrence 的 runtime 输入，不进入 IR。

`context.scope()` 是 Core 提供的 runtime wrapper builder，使 contextual composite 可以在 replay 外建立与 `IRScope` 同语义的 transform / clip / style 层，但它返回不透明 compile intermediate，不形成第二套可序列化 IR。Table 通过外层 clip scope 与内层 placement scope 保持 clip 和 fit/alignment transform 的坐标顺序。

contextual `compile()` 返回 `CompositeCompileOutput`，其中普通 `IRChild` 与 Core 创建的不透明 `CompositeCompileChild` 可以并列。调用方不能构造、序列化或跨 compile 保存 opaque child。

```ts
type CompositeCompileOutput = Readonly<{
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  artifacts?: ReadonlyArray<CompileArtifactContribution>;
}>;
```

普通 `IRChild` output 与 structural expansion 使用同一语义：它在当前 composite occurrence 下按 output 数组位置取得 `expansion:index` segment，默认以 unconstrained 方式编译，不继承当前 contextual composite 的 width / height constraint。它共享当前 namespace frame、style stack、definition registry、compile environment 与剩余 composite depth budget；其中的 structural/contextual composite 继续统一 dispatch，nested artifact owner 从该 `expansion:index` occurrence 继续派生。只有显式 `layoutChild(child, constraint)` 才会把约束交给 child 并取得可 replay result。

`context.scope()` 在 output 中同样占据一个 `expansion:index` occurrence；wrapper 内普通 children 按 `child:index` 继续定位，`context.replay()` 放置则按所在 runtime children 数组位置取得 `replay:index`。这些 segment 都来自最终 traversal 位置，不从对象 identity 或调用次数推断。

## 决策：child layout result 是 compile-local replay bundle

`layoutChild()` 使用当前 compile 的完整环境：text measurer、TeX lowering、definitions、providers、precision 之外的内部 double-precision geometry、warning policy、composite depth budget 与当前 constraint。它在 detached replay root 中建立独立 namespace：child 子树内部定义和引用按现有规则工作，任何逃逸到 probe 外部 occurrence 的非局部引用都 fail-loud。它返回公开只读 bounds 和不可伪造的 opaque replay handle。

```ts
type ChildLayoutResult = Readonly<{
  allocationBounds: BoundsRect;
  visualBounds: BoundsRect;
  // opaque compile-local replay identity，由 context.replay() 消费
}>;
```

内部 replay bundle 固定持有：

- 已解析并选择的 structural/contextual definition 结果
- primitive layout 与 namespace registration replay 数据
- allocation / visual bounds
- 当前 replay root 下的 deferred nested artifacts
- 相对 replay root 的 deferred warning 与 `CompiledNodeLayout` observation
- probe-local resource definitions 与 primitive 中的 resource reference 重写索引
- compile environment identity 与 composite depth 状态

probe 不向宿主 namespace、primitive sink、resource table、warning / node-layout observer 或 artifact collection 写入永久状态。`context.replay(result)` 只接受同一 compile environment 产生且尚未失效的 result；跨 compile、伪造 handle 或环境不匹配直接抛错。

最终 replay 不重新 lookup definition、expand composite、调用 contextual `compile()` 或重新执行 Node / Path / Scope layout。内部 commit 顺序固定为：

1. probe-local paint / clip resources 按结构值重新登记到宿主 registry，取得最终 id；相同资源复用宿主既有 id
2. 递归改写 replay primitive、nested Group、paint `resourceRef`、`clipRef` 与资源内部引用，禁止把 probe-local `paint-N` / `clip-N` 直接带入宿主
3. 把 replay-local namespace registration 和 Node layout 按最终 placement transform 投影到宿主坐标，再注册进当前 namespace frame；重复 id 复用现有诊断
4. 把 deferred warning 的相对路径、nested artifact owner 与 `CompiledNodeLayout` DTO rebase 到最终 occurrence / 全局坐标
5. 最后把 primitive、resource、namespace registration、warning DTO、Node observation DTO 与 artifact 原子合并到 compile transaction 内部缓冲；任一步失败时整个 compile 不返回部分结果

未选 probe 的所有缓冲被丢弃，不触发 `onWarn`、`onNodeLayout` 或任何外部 callback。同一 `ChildLayoutResult` 可以放置多次；每次都重新执行上述 commit/rebase，并形成新的 occurrence。放在不同 namespace Scope 中的内部同名 id 合法；放在同一 namespace frame 中仍按现有 duplicate-id 规则诊断。Table transaction 对每个最终 Cell result 只 replay 一次。

Core 在整棵根 scene 的内部 transaction、resource、namespace、artifact 与 `CompileResult` 均验证并封存后，才进入外部通知阶段。warning 与 Node observation 以原 traversal 的统一事件顺序调用 `onWarn` / `onNodeLayout`；通知不改变已经封存的 Scene 或 artifacts。callback 抛错沿用既有 fail-fast 合同：立即停止后续通知并把原异常抛给调用方，因此本次 compile 不返回 `Scene` / `CompileResult`。已经执行的用户 callback 副作用无法回滚，Core 明确不承诺撤销；原子性只覆盖内部返回产物与 probe 隔离。若内部 compile 在通知阶段前失败，则所有外部 callback 都不调用。

## 决策：约束响应是 Core 明确合同

约束表示父布局给当前 child occurrence 的可用 allocation box，不强制所有图元缩放到盒内：

- Node：有限 width 只约束正文 text block。在 Node layout 已解析 `scale.x` 后，从 width 减去缩放后的左右 padding 与 margin，负值截为 `0`，得到 user-unit runtime text budget；它与同样已缩放为 user units 的显式 `maxTextWidth` 取较小值，再交给现有 content layout。minimumSize、shape circumscription、label、stroke 和 shadow 不反向减少 text budget，因此仍可让 allocation / visual bounds 超出 constraint
- Node 的零 text budget 进入内部 wrap 算法而不写回 IR schema：CJK 与可分词文本折到最小合法 token，长不可断 token 保持整段并溢出；空文本保持零正文。有限 height 当前只作为可观察输入，不截行、不缩放
- contextual composite：原样收到当前 constraint，并自行通过 `layoutChild()` 分配给内部 child
- structural composite：保持纯结构语义；其展开结果按 intrinsic 方式布局，不隐式把父 constraint 分发给多个输出
- Path、Coordinate 与普通 Scope：不响应宽高约束，返回真实 allocation / visual bounds，允许超出
- Scope：不是通用 layout container，不自动把自身 constraint 分发给 children；需要约束分配的 owner 应使用 contextual composite

这使“固定几何超出可用盒”成为正常结果，overflow / fit / clip 仍由 Table 等父布局处理。Node 宽度响应与所有不响应类型都必须有正式测试，不能静默伪装成缺失能力。

## 决策：allocation 与 visual bounds 使用 replay-root local 坐标

`ChildLayoutResult` 的两个 bounds 都位于未放置 replay root 的局部坐标系，不包含 scene 根 padding。`visualBounds` 是保证包含实际可见输出的 conservative AABB，不承诺像素级精确裁剪：

- `allocationBounds`：父布局用于分配空间的 canonical footprint。Node 包含 outer layout 与 label layout；Path 包含几何和 label；Coordinate 为零面积；Scope 是 child allocation union，空 Scope 固定为其局部原点零面积矩形
- `visualBounds`：由通用 Scene primitive bounds analyzer 递归分析 Rect / Ellipse / Text / Path / Group，而不是信任单个 `PathKindCompileResult.boundsPoints`。custom PathKind 因为最终仍发出通用 Scene primitives，所以自动进入相同分析
- Path 曲线使用控制点 hull，圆弧 / 椭圆弧使用覆盖完整旋转椭圆的 AABB；这是可验证的保守上界。round / bevel join 与 butt / round / square cap 至少扩张半 stroke；miter join 按 Canvas 上界 `10 × halfStroke` 扩张，确保同时覆盖 SVG 默认视觉。arrow marker 递归分析变换后的 marker primitives；shadow 再按 offset / blur 扩张
- rect / circle / ellipse / polygon / path clip 都先转换为 conservative clip AABB；path 使用命令 hull / 完整弧上界，compound clip 使用 children AABB union。嵌套 Scope clip 逐层与当前 visual AABB 相交；fill-rule hole 不收紧 conservative bounds
- clip AABB 与 content AABB 无交集时，返回以有效 clip AABB 左上角为 `(x, y)` 的零面积矩形；allocation bounds 不受 clip 修改

完整 compile 同时累计根 allocation 与 visual bounds；自动 `Scene.layout` 使用二者 union 后再加根 padding。这样透明 allocation sentinel 可以保留父布局占位，粗 Path stroke、shadow 或 visible overflow 也不会被 viewport 裁切。动画不改变静态 bounds；allocation 与 visual 在简单内容上可以相等，但必须保留两个字段，不能用“当前碰巧相等”合并合同。

为闭合该口径，本 milestone 同时修正现有 Core：

1. Path visual bounds 按实际 stroke width、arrow、label 与 shadow扩张，避免 Table 外边框半描边被自动 viewBox 裁切
2. Scope clip 参与 visual bounds；manifest 求交不能替代 Core scene 的 clip-aware 自动 bounds
3. allocation sentinel 等透明 primitive 可以贡献 allocation，但不进入 visual bounds

## 决策：typed artifact 与 occurrence locator 由 Core 管理

artifact 是 compile sidecar，不进入 IR 或 Scene：

```ts
type CompositeOccurrenceSegment =
  | Readonly<{ kind: 'child'; index: number }>
  | Readonly<{ kind: 'expansion'; index: number }>
  | Readonly<{ kind: 'replay'; index: number }>;

type CompositeOccurrenceLocator = Readonly<{
  segments: ReadonlyArray<CompositeOccurrenceSegment>;
}>;

type CompileArtifactContribution<T = unknown> = Readonly<{
  channel: string;
  payload: T;
}>;

type CompileArtifact<T = unknown> = CompileArtifactContribution<T> &
  Readonly<{
    owner: CompositeOccurrenceLocator;
  }>;
```

locator 是 JSON-safe、compile-local、由输入/expansion/replay 的确定遍历位置组成。它不依赖 id、对象引用、全局 counter 或 adapter，不承诺跨 IR 改写或跨版本稳定。adapter 构造单根 scene 时使用同一 segment contract 得到根 selector。

artifact contract 从 `contract/artifact` owner barrel 导出，再通过 `contract/index.ts` 与包根 `index.ts` 的 `export *` 暴露；不由 compile 或 adapter 转手导出。

contextual composite 只能返回不带 owner 的 contribution；Core 为当前 occurrence 附加 owner，防止 definition 伪造其它 occurrence。probe 中的 own contribution 与 nested replay artifact 一起 deferred；只有最终 occurrence commit 时发布。

Core 在 contextual `compile()` 返回后校验 contribution：`channel` 必须是非空字符串，`payload` 必须通过 `JsonValueSchema`，函数、class 实例、`undefined`、循环对象和非 JSON 数值都 fail-loud。错误同时携带 provider key、channel（若可得）与 occurrence locator。泛型 `T` 只保留 channel-specific payload 类型，JSON-safe 由 runtime gate 保证。

```ts
type CompileResult = Readonly<{
  scene: Scene;
  artifacts: ReadonlyArray<CompileArtifact>;
}>;

const compileWithArtifacts = (
  ir: IRScene,
  options?: CompileOptions,
): CompileResult;

const compileToScene = (
  ir: IRScene,
  options?: CompileOptions,
): Scene;
```

`compileWithArtifacts()` 是完整编译真源；`compileToScene()` 调用它并丢弃 sidecar。两者 Scene 必须深度等价，artifact 开关不得改变布局、warning、资源或 definition 调用次数。

artifact channel 是稳定 runtime discriminator。Core 保留同 owner 多 channel 或同 channel 多 contribution；具体 consumer 按自己的不变量决定是否允许。Table 根 observer 按 channel + owner 要求唯一匹配并 fail-loud。

`ChildLayoutResult`、`CompositeCompileChild` 和 replay bundle 不得离开创建它们的 compile transaction。因此 Core 不提供“先 layout、返回带隐藏 replay 的 `IRChild`、稍后另一次 compile”的 environment 工厂。Table alpha.2 必须删除 `lowerTableWithArtifacts(): { node, manifest }` 这条不可闭合的 direct contract，改为一次性 `compileTable()` convenience：内部构造单根 Table scene、注入 contextual definition、调用一次 `compileWithArtifacts()`，并返回 `{ scene, artifacts, manifest }`。需要纯 JSON lowering 的调用方只能使用 structural composite。

## 决策：React 与 Vanilla 只接线同一次 compile

React `LayoutProps` 新增 `compile?: CompileOptions`，与 Vanilla `RenderToStringOptions.compile` 对齐。冲突和默认规则固定为：

- 顶层 `nodeDistance`、`fontSize`、`shapes`、`boundaries`、`clips`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`ribbonWidthProfiles`、`composites`、`lowerTex` 是现有 compile sugar；与 `compile` 中同字段同时显式提供时按该顺序列出并 fail-loud
- 顶层 `onNodeLayouts` 与 `compile.onNodeLayout` 同时提供时 fail-loud；单独提供前者时由 Layout 聚合 DTO 后在 commit effect 通知，单独提供后者时按 Core observer 合同逐项发布
- `compile.measureText` 缺省时才注入 React browser measurer；显式 custom measurer 不被覆盖。`padding`、`precision`、`labelDistance`、`maxCompositeDepth`、`onWarn` 与 `measureText` 只通过 `compile` 暴露
- children/embeddable 贡献的 composites 是 authoring 产物，不与显式 `compile.composites` 冲突；先聚合 embeddable definitions，再拼显式 definitions，registry 的重复 key 诊断保持唯一真源
- 顶层 `composites` 与 `compile.composites` 互斥；无论使用哪一个，都与 embeddable definitions 按同一顺序合并

`<Layout ir={...}>` 的显式 `ScopeStyleProps` 改为包裹 IR children 的 synthetic root Scope，与 children 模式共享 color、stroke、fill、strokeWidth、opacity、fillOpacity、strokeOpacity、nodeDefault、pathDefault、labelDefault、arrowDefault 语义。viewBox 与 root animations 仍属于 scene 根，不放进 synthetic Scope；本 milestone 不新增 transform、clip、zIndex 宿主 prop。

React 内部调用 `compileWithArtifacts()` 一次。为让 `@retikz/table-react` 在不 deep import 的情况下观察同次结果，`@retikz/react` 公共 protocol owner 新增：

```ts
type LayoutCompileObservation = Readonly<{
  result: CompileResult;
  sourceRootOwners: ReadonlyArray<CompositeOccurrenceLocator>;
}>;

type LayoutCompileObserver = (observation: LayoutCompileObservation) => void;
```

`LayoutProps.onCompileResult?: LayoutCompileObserver` 是低层 adapter bridge，不触发 compile，也不进入 `CompileOptions`。`sourceRootOwners[i]` 对应调用方原始 IR 的第 `i` 个 root child；若 Layout 为 IR ScopeStyle 加 synthetic Scope，由 Layout 负责映射到实际 occurrence locator。children authoring 模式没有独立的原始 IR prop，`sourceRootOwners` 对规范化后的 root children 建立相同顺序映射。

Layout 在 React commit 后通过 effect 通知 observer；SSR / `renderToStaticMarkup` 不调用 callback，SSR sidecar 应直接使用 Core / Vanilla compile result。observer identity 只进入 effect 依赖，不进入 IR / compile `useMemo`，更换 callback 不得重新编译。Table standalone 内部 observer 使用 `sourceRootOwners[0]` + channel 精确选择 manifest，再通知公开 `onManifest`；Table 不把 `onCompileResult` 重新暴露为自身 prop。普通 Layout 用户可以使用该低层 bridge，但本 milestone 不再增加另一套 `onArtifacts`。

Vanilla `toSceneResult()` 改为持有同次 `CompileResult`；现有只返回 Scene 的入口丢弃 artifacts，Table Vanilla runtime 可从同一结果精确选择根 manifest。IR / plain spec 的 `compile` options 继续同源；已是 Scene 的输入没有 compile artifact。

## 决策：失败、warning 与引用边界

- 非有限或小于 `0` 的 constraint 直接抛错；`0` 与 `-0` 都按合法零约束处理
- 未注册 composite 在普通完整 compile 中保持现有 warning + skip；作为 `layoutChild()` 输入时必须抛出可关联到 child occurrence 的布局错误，不能返回与空 Scope 相同的成功结果。其它可延迟 warning 只在选中 replay 发布一次。`lowerIRToKernel()` 对 contextual definition 直接抛错
- composite depth 对 probe 与 replay 共享同一预算；循环或 runaway expansion 有限终止
- replay handle 跨 environment、transaction 结束后使用或伪造 intermediate 时 fail-loud；同一 result 在有效 transaction 内允许多次 replay，namespace 重名继续使用既有 duplicate-id warning 与 last-wins 规则
- `layoutChild()` 只允许 detached child 子树内的局部引用；引用 probe 外 occurrence、未定义目标或依赖外部临时注册项时以 `NONLOCAL_CHILD_REFERENCE` / 既有缺失引用诊断 fail-loud，不把缺失引用伪装成零面积
- Coordinate 的合法零面积、空 Scope 的合法零面积和 provider/compile 失败使用不同结果路径
- contextual compile 抛错中断宿主 compile，不生成部分 Scene 或半份 artifact collection
- 内部 compile 失败时不通知 warning / Node observer；外部通知阶段 callback 抛错时 fail-fast、停止后续通知且不返回结果，但不回滚已经执行的用户副作用

## 被否决的方案

### 整图双遍 compile

第一遍测量、第二遍最终输出看似可以保持 IR 不变，但会重复 definition lookup、expand、文字测量和 contextual compile；nested artifact、warning 与自定义 provider 副作用需要额外去重，仍无法证明两遍环境完全一致。

### 把布局快照写入 IR

把 Scene primitive、文字行盒或 opaque cache key写入持久化 IR，可以让 `lowerIRToKernel()` 返回某种结果，但会让 IR 同时承担声明输入和编译缓存，扩大 schema、持久化体积与 renderer 兼容面，并引入缓存失效协议。

### Table 私有 measurement service

Table 私建 `TableMeasurementService` 或按 Node / Path / Plot 类型分派会复制 Core provider、引用、transform 和 bounds 语义，第三方 composite 也无法自动接入。

## 待决策点 🔻

无。公开名称、错误边界、locator segment、bounds 口径、约束响应与 adapter 接线在本 ADR 中冻结。实现若证明 opaque replay 无法保持 namespace/resource 原子性，应停止并回到本 ADR，不得降级为双遍 compile 或隐藏 side channel。

## DSL 表面

普通结构型 composite 保持原写法：

```ts
const GridDefinition = defineComposite({
  namespace: 'standard',
  type: 'grid',
  schema: GridSpecSchema,
  expand: spec => lowerGrid(spec),
});
```

layout-aware Table 使用同一注册入口：

```ts
const TableDefinition = defineComposite({
  namespace: 'table',
  type: 'table',
  schema: TableSpecSchema,
  compile: (spec, context) => {
    const intrinsic = context.layoutChild(spec.structure.cells[0].content);
    const constrained = context.layoutChild(spec.structure.cells[0].content, { width: 160 });

    return {
      children: [context.replay(constrained)],
      artifacts: [
        {
          channel: '@retikz/table/layout-manifest',
          payload: {
            allocationBounds: intrinsic.allocationBounds,
            visualOverflowBounds: constrained.visualBounds,
          },
        },
      ],
    };
  },
});
```

需要 artifact 的宿主使用：

```ts
const { scene, artifacts } = compileWithArtifacts(ir, {
  composites: [TableDefinition],
  measureText,
});
```

## 测试设计

Core 正式测试覆盖：

- structural / contextual definition 互斥校验、同 registry dispatch 与 `lowerIRToKernel()` 边界
- Node intrinsic 与 width-constrained wrap；Path、Coordinate、Scope 的不响应约束行为
- replay 不重复 definition/layout；未选 probe 不发布 warning/observer/resource/artifact，final replay 全部恰好一次
- contextual output 的普通 Tier 1 / structural / contextual child 按 expansion occurrence、unconstrained、共享 namespace/depth 规则递归编译
- 宿主预占 paint/clip id 后 replay正确去重/remap；同一 result 多 placement 不携带 probe-local引用
- namespace registration、duplicate id、warning path、Node layout DTO 在 placement 后按最终 occurrence/全局坐标重定位
- nested contextual composite probe artifact 不泄漏，最终 replay按 occurrence rebase
- allocation / visual bounds 坐标、custom PathKind primitive、miter stroke/arrow/shadow 与非矩形/compound Scope clip
- missing reference、unregistered provider、cycle、invalid constraint 与跨 environment replay
- 内部失败不通知 callback；外部通知首个/中间 callback 抛错时 fail-fast、无返回值且不伪装可回滚既有副作用
- `compileToScene()` / `compileWithArtifacts()` Scene 等价
- React `LayoutProps.compile` 冲突诊断、IR ScopeStyle 包裹与 Vanilla artifact透传

具体行为、反例与最低测试层见 ignored `notes/plans/kernel-v0.5-alpha.2-contextual-composite-layout/TEST_CONTRACT.md`。

## 影响

- `CompositeDefinition` 是 additive capability union；既有 structural definitions 不改调用表面
- ⚠️ BREAKING：完整 compile 的 composite dispatch 从全量前置 lowering 移到 occurrence traversal；依赖具体 warning 时序或对象调用次数的非契约代码需要迁移
- `lowerIRToKernel()` 对 contextual definition 明确拒绝
- 新增 `compileWithArtifacts()`、layout/replay/artifact/locator 公共 runtime contract
- ⚠️ BREAKING：Table `lowerTableWithArtifacts()` 删除，迁移到一次性 `compileTable()` 的 `{ scene, artifacts, manifest }`
- React `LayoutProps.compile`、`onCompileResult` additive；顶层 sugar 与 `compile` 重叠从隐式可能性变为显式错误
- ⚠️ BREAKING：Core warning / Node layout callback 延迟到内部 compile 结果封存后统一通知；内部失败不再暴露此前产生的部分 callback 事件
- Core Path / Scope 自动 bounds 的可见结果会更准确，可能扩大或收紧自动 viewBox
- Table alpha.2 在本 ADR 实现并通过 gate 后才能激活 auto/minmax、wrap、span、border 与同次 manifest
- 用户可见 API 与行为必须同步 Kernel / Table 中英文 runtime、composite 与 bounds 文档

## 绘图完备性检查

- 能力面与解决的问题：Drawing Complete / constrained layout、composite runtime 与 headless artifact
- 是否属于 Drawing Complete：是；任意 `IRChild` 的真实布局、bounds 和 replay 只能由 Core 统一拥有
- 主责包与协作包：Core 主责 contract、traversal、bounds、artifact；React/Vanilla 只接线；Table 消费
- 是否可由现有能力组合：不能；现有 `expand(node)` 无 layout/reference/artifact context
- math / core / render / adapter 责任切分：Math 不改；Core 计算；renderer 只消费 Scene；adapter 透传 environment 与 sidecar
- 是否需要新 IR / contract / registry：新增 runtime contract，不新增 IR 或 registry
- Scene / manifest 如何承载：Scene 不变；manifest 作为 typed compile artifact payload
- renderer 实现或诊断降级：renderer 零 Table 特判；Core 在 Scene 前完成 bounds 与 replay
- React / Vanilla 如何等价暴露：共享 `CompileOptions` 与 `compileWithArtifacts()`；React 增加 `compile` prop，Vanilla 已有 compile 分组
- Interaction Readiness 是否适用：locator 仅 compile-local artifact owner，不承诺用户交互查询；完整 locator 延期
- 不支持边界与本轮结论：扩展 Core contextual composite；不支持持久化 replay、通用 Scope layout container 或跨 compile cache

## 不在本 ADR 范围

- Table track、Cell、border、fit/overflow 的具体算法与 schema
- Data Transform、group/pivot Table、fragmentation、virtual scroll
- 通用 flex/grid constraints 或任意父 Scope 自动分配 child constraint
- replay bundle 跨进程、跨 worker、跨 compile 或持久化
- 稳定公开 artifact 查询 API、通用 React `onArtifacts`
- 增量编译、跨 compile layout cache 与资源 diff

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。修改 Core composite contract、compile orchestration、public exports、React/Vanilla runtime 与用户文档。

### Schema 改动

无持久化 IR / Scene schema 改动。`ChildLayoutConstraint`、replay、artifact 与 locator 都是 runtime contract，不进入 Zod schema。

### 文件 scope

本 ADR 实现允许触碰：

- `packages/kernel/core/src/contract/composite/types.ts`
- `packages/kernel/core/src/contract/composite/define.ts`
- `packages/kernel/core/src/contract/composite/index.ts`
- `packages/kernel/core/src/contract/artifact/**`（新建）
- `packages/kernel/core/src/contract/index.ts`
- `packages/kernel/core/src/compile/layout/**`（新建）
- `packages/kernel/core/src/compile/visual-bounds/**`（新建）
- `packages/kernel/core/src/compile/namespace.ts`
- `packages/kernel/core/src/compile/resource/paint.ts`
- `packages/kernel/core/src/compile/resource/clip.ts`
- `packages/kernel/core/src/compile/resource/index.ts`
- `packages/kernel/core/src/compile/node/content/layout.ts`
- `packages/kernel/core/src/compile/node/content/text.ts`
- `packages/kernel/core/src/compile/node/box.ts`
- `packages/kernel/core/src/compile/node/layout.ts`
- `packages/kernel/core/src/compile/node/layout-metrics.ts`
- `packages/kernel/core/src/compile/node/types.ts`
- `packages/kernel/core/src/compile/orchestration/composite.ts`
- `packages/kernel/core/src/compile/orchestration/context.ts`
- `packages/kernel/core/src/compile/orchestration/events.ts`（新建）
- `packages/kernel/core/src/compile/orchestration/traversal.ts`
- `packages/kernel/core/src/compile/orchestration/types.ts`
- `packages/kernel/core/src/compile/orchestration/bounds.ts`
- `packages/kernel/core/src/compile/orchestration/primitive.ts`
- `packages/kernel/core/src/compile/orchestration/index.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/compile/lower.ts`
- `packages/kernel/core/src/compile/types.ts`
- `packages/kernel/core/src/compile/index.ts`
- `packages/kernel/core/src/index.ts`
- `packages/kernel/core/tests/contract/composite/**`
- `packages/kernel/core/tests/compile/contextual-composite*.test.ts`
- `packages/kernel/core/tests/compile/child-layout*.test.ts`
- `packages/kernel/core/tests/compile/artifact*.test.ts`
- `packages/kernel/core/tests/compile/path-visual-bounds*.test.ts`
- `packages/kernel/core/tests/compile/scope-clip-bounds*.test.ts`
- `packages/kernel/core/tests/compile/lower-kernel.test.ts`
- `packages/kernel/core/tests/compile/public-api.test.ts`
- `packages/kernel/core/tests/architecture/layering.test.ts`
- `packages/kernel/react/src/kernel/runtime/Layout.tsx`
- `packages/kernel/react/src/kernel/runtime/index.ts`
- `packages/kernel/react/src/kernel/protocol/compile-observer.ts`（新建）
- `packages/kernel/react/src/kernel/protocol/index.ts`
- `packages/kernel/react/src/kernel/protocol/scope-style.ts`
- `packages/kernel/react/tests/kernel/runtime/layout-compile-options.test.tsx`
- `packages/kernel/react/tests/kernel/runtime/layout-artifacts.test.tsx`
- `packages/kernel/react/tests/kernel/runtime/layout-scope-style.test.tsx`
- `packages/kernel/react/tests/kernel/runtime/composites-passthrough.test.tsx`
- `packages/kernel/react/tests/public-api.test.ts`
- `packages/kernel/vanilla/src/runtime/to-scene.ts`
- `packages/kernel/vanilla/src/runtime/types.ts`
- `packages/kernel/vanilla/src/runtime/index.ts`
- `packages/kernel/vanilla/tests/runtime/to-scene.test.ts`
- `packages/kernel/vanilla/tests/runtime/contextual-composite.test.ts`
- `packages/kernel/vanilla/tests/runtime/artifacts.test.ts`
- `apps/docs/src/modules/docs/contents/kernel/concepts/design/composite/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/concepts/design/composite/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.en.mdx`
- 与上述页面对应的新增/修改 demo、controls 与 docs data / i18n / schema registry 精确文件

Table product与文档文件由 Table alpha.2 ADR-06/07 的修订后 scope 所有，不混入 Kernel 实现 commit。发现必须触碰上述列表外的 owner 文件时，先回本 ADR 增补精确路径并重新 Architecture Gate。

### 测试象限

**Happy path（≥ 3）**：

- structural 与 contextual definitions 同 registry 正确 dispatch
- Node intrinsic → width-constrained wrap → replay 的 bounds 与 Scene 一致
- Table-like contextual composite probe多个 child、选择 final replay并贡献 artifact
- nested contextual composite artifacts 在最终 occurrence 下正确 rebase
- contextual output 的普通 Tier 1、nested structural 与 nested contextual child 按 expansion occurrence、unconstrained 与共享 depth 规则编译

**边界（≥ 2）**：

- 显式 width/height `0` 与省略轴区分；固定 Path 可超出 constraint
- Coordinate、空 Scope 和完全裁空 Scope 返回确定零面积但不同成功路径
- 同一 replay result 多次 placement 产生不同 occurrence owner

**错误路径（≥ 2）**：

- `defineComposite()` 同时/均不提供 `expand` / `compile` fail-loud
- `lowerIRToKernel()` 遇 contextual definition 携 key + path 抛错
- invalid constraint、跨 environment replay、missing reference、cycle 与 provider failure 有限失败
- 内部 compile 失败不通知外部 callback；通知阶段首个/中间 callback 抛错时停止后续通知、不返回结果，已执行副作用不承诺回滚

**交互（≥ 2）**：

- custom measurer/shape/clip/composite 在 probe/replay/final compile 使用同一 environment
- contextual output 的普通 child、nested structural/contextual child 共享 namespace、environment 与剩余 depth，artifact owner 按 expansion occurrence 派生
- `compileToScene()` 与 `compileWithArtifacts()` Scene 等价且 definition调用次数一致
- React `compile` 与 Vanilla `compile` 对同一 IR 得到同 Scene/artifact；React重复 sugar fail-loud
- IR mode ScopeStyle synthetic Scope 与 children mode等价

### 依赖的现有元素

- `CompositeDefinition` / `defineComposite` / `resolveCompositeRegistry`—— 复用同一 definition 与 registry
- `lowerComposites()` / `lowerIRToKernel()`—— 保留 structural JSON lowering边界
- `compileToScene()` / `createCompileContext()` / `compileChildrenToPrimitives()`—— 迁移为 compile transaction真源
- `NamespaceStack` 与 traversal frame—— 提供 detached child namespace、registration replay 与 occurrence path
- `collectLayoutBounds()` / Node layout / Path compile / Scope clip registry—— 建立双 bounds
- React `LayoutProps` / Vanilla `RenderToStringOptions.compile`—— adapter同源入口
- Table alpha.2 ADR-01 / 06 / 07—— 下游 gate、transaction 和宿主接线约束
