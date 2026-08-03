# ADR-07：布局感知 Composite 与显式编译产物

- 状态：Accepted
- 决策日期：2026-07-23
- 接受日期：2026-07-25
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [Table v0.1 roadmap](../../../../../../viz/_notes/decisions/table/v0/v0.1/roadmap.md)

> Architecture Gate 三轮未取得自动 PASS；本 ADR 由人工接受修订后的设计，该结论不追记为 Gate PASS。

## 背景

Table v0.1 alpha.2 需要让 `auto` / `minmax` 轨道读取每个 Cell 中任意 `IRChild` 的真实尺寸，先求解列宽和行高，再把确定的 Cell 内容宽度反馈给文本布局以重新换行。相同需求也会出现在需要按真实子内容反馈求解的图例、面板、流程和其它 Tier 2 layout composite 中，不属于 Table 私有测量算法。

`CompositeDefinition.expand()` 在完整 compile context 创建前做结构展开。按 ADR-09，它只读取继承的有效 Theme；仍拿不到宿主文字测量、TeX lowering、provider registries、namespace / reference 环境、继承样式和父级约束，也不能保留一次布局结果供最终输出复用。Table alpha.1 因此只能使用固定轨道，并把普通 composite lowering 与 `lowerTableWithArtifacts()` 分开调用；需要 Scene 与 manifest 时，同一 Table resolve 会执行两次。

Core 已有 `CompileOptions.onNodeLayout`，但 observer 只能事后捕获真实 Node，不能在父布局求解期间约束任意 `IRChild`，也不能表达 nested composite、allocation / visual bounds 或 replay。继续增加 callback、全局 `Map`、closure capture 或 Scene meta 会让 artifact 所有权、并发和 occurrence identity 变成隐藏通道。

本 ADR 只处理同一次完整 compile 内的布局反馈与结果复用。它不建立跨次缓存、dependency graph、patch 或增量 Scene update；这些跨次更新能力由未来版本另行设计。

## 决策：在现有 Composite registry 中增加 layout-aware compile 分支

### CompositeDefinition 使用互斥的 `expand` / `compile` 分支

Composite 继续通过同一个 `defineComposite()`、`CompileOptions.composites`、provider resolver 和 `namespace.type` registry 注册，不新增 layout registry，也不区分内置与自定义消费路径。

```ts
type LayoutCompositeBranch<TNode, TArtifact extends JsonValue> = [TArtifact] extends [never]
  ? {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
    }
  : {
      expand?: never;
      compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<TArtifact>;
      artifactSchema: ZodType<TArtifact>;
    };

type CompositeDefinition<
  TNode,
  TNamespace extends string = string,
  TType extends string = string,
  TArtifact extends JsonValue = never,
> = {
  namespace: TNamespace;
  type: TType;
  schema: ZodType<TNode>;
} & (
  | {
      expand: (node: TNode, context: CompositeExpandContext) => IRChild | Array<IRChild>;
      compile?: never;
      artifactSchema?: never;
    }
  | LayoutCompositeBranch<TNode, TArtifact>
);
```

- `expand` 保持结构性、可由 `lowerIRToKernel()` 执行；按 ADR-09 接收只含有效 Theme 的受限 context，不获得完整 compile 环境。
- `compile` 只在完整 `compileToScene()` traversal 中执行，拥有当前 composite occurrence 的父约束，并只通过受限 context 布局子内容。
- 同一定义不能同时声明 `expand` 与 `compile`；`defineComposite()` 在类型和运行时都 fail-loud。
- `schema`、definition key 校验、内置与自定义 registry 合并和重复 key 诊断保持同一条路径。
- `compile` 不直接接收 `measureText`、provider maps、namespace stack、resource registries 或可变 traversal state，避免把 Core 内部结构固化为第三方 API；这些完整环境由 `layoutChild()` 代表 Core 消费。

`artifactSchema` 与 artifact payload 是同一个泛型分支：不产 artifact 的 `compile` definition 使用 `TArtifact = never` 且不能声明 schema / 返回 artifact；可能产 artifact 的 definition 必须声明 `ZodType<TArtifact>`。完整擦除与推导契约见“typed artifacts”一节。

### `layoutChild()` 支持 intrinsic 与 constrained layout

```ts
type ChildLayoutConstraint =
  | { kind: 'intrinsic' }
  | {
      kind: 'constrained';
      maxWidth: number;
    };

type LayoutChildResult = Readonly<{
  allocationBounds: Readonly<BoundsRect>;
  visualBounds: Readonly<BoundsRect>;
  replay: CompositeReplay;
}>;

type LayoutCompositeCompileContext = Readonly<{
  constraint: ChildLayoutConstraint;
  layoutChild: (child: IRChild, constraint: ChildLayoutConstraint) => LayoutChildResult;
}>;
```

约束契约：

1. `intrinsic` 表示不提供父级尺寸上限，求子内容自然所需空间。
2. `constrained.maxWidth` 是 allocation box 的有限非负宽度上限。alpha.1 不公开 min width、height constraint 或 exact-size 语义；Table 先确定 Cell 内容宽度，再通过 constrained 结果的自然高度求行高，已经形成所需闭环。新增其它约束字段必须另立 ADR。
3. `constraint` 是当前 layout-aware composite 从父级收到的约束；根 occurrence 固定收到 `intrinsic`。父 composite 通过 `layoutChild()` 把求解结果继续传给 nested layout-aware composite。
4. Core Node 消费宽度约束时，以其 allocation box 为口径扣除左右 margin 与 shape padding，再把剩余非负宽度与显式 `maxTextWidth` 取更严格者并重新执行文本换行。stroke 只影响 visual bounds，不从文本可用宽度重复扣除。`maxWidth: 0` 合法；空文本保持零内容宽，长不可断 token 按现有 wrap 规则溢出。
5. Node 的显式 `minimumSize`、不可断 token 或 shape circumscribe 可以使实际 allocation 宽度超过 `maxWidth`。Core 不压缩、裁剪或移动 allocation 来伪造约束满足；调用方通过 `allocationBounds.width > maxWidth` 识别 overflow。
6. Path、Coordinate、普通 Scope 与不能重排内容的固定尺寸 Node忽略 `maxWidth` 的重排作用，返回与 intrinsic 相同的真实 allocation / visual bounds 和 replay。只有 Node 文本、nested layout-aware composite 与 Core 后续明确加入 contract 的可重排内容消费该上限；普通多子 Scope 不猜测如何把宽度分配给后代。
7. 空输出在 intrinsic / constrained 下都保持零 bounds，不扩张到 `maxWidth`。该字段是上限，不是父级强制分配的空白盒。
8. 同一个 callback 可以先 intrinsic 测量，再用求得的宽度 constrained 测量。两次是两个显式 layout 结果；最终 replay 不构成第三次布局。

Bounds 统一处于 child replay 的局部坐标：

- `allocationBounds` 是父布局应为该 child 保留的布局几何包络；intrinsic 时表示自然需求，constrained 时表示应用 `maxWidth` 重排后的实际占用，不补齐到上限。
- `visualBounds` 是由最终 Scene primitive tree 的 canonical settled state 计算的保守静态几何 AABB。它用于 Core / Tier 2 的确定性 fit 与 overflow 判断，不是 glyph ink box、renderer 回读、逐像素结果或动画全时域包络。
- 空输出两者均为 `{ x: 0, y: 0, width: 0, height: 0 }`。所有数值必须有限；无法得到有限 bounds 时 fail-loud。

两类 bounds 的包含口径固定如下：

| 元素 / 效果                      | allocation bounds                    | visual bounds                                     |
| -------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Node shape、padding、minimumSize | 包含                                 | 有可见 fill / stroke 时包含对应 primitive         |
| Node margin                      | 包含                                 | 不包含不可见空白                                  |
| Node label / pin                 | 不包含，视为 out-of-flow decoration  | 包含                                              |
| Path / Ribbon 主几何             | 包含 provider `boundsPoints` 的 AABB | 从最终 settled primitives 计算                    |
| Coordinate                       | 零尺寸                               | 零尺寸                                            |
| Scope / Group transform          | 变换后聚合                           | 变换后聚合                                        |
| stroke width、cap / join、marker | 不额外扩张                           | 包含                                              |
| shadow                           | 不包含                               | 包含                                              |
| 显式数值 opacity 为 0 或无 paint | 仍按布局几何包含                     | 不贡献；任意 CSS color 字符串保守视为可能可见     |
| clip                             | 不改变                               | 与 clip shape AABB 做保守相交；不承诺精确布尔裁剪 |

allocation 的 Node 基点沿用当前 `outerRectOf(layout)`；非对称 margin 可以移动包络中心。Path / custom path kind 继续以现有 `PathKindCompileResult.boundsPoints` 作为 allocation 真源。visual bounds 新增 compile 内部的 canonical primitive bounds 计算；renderer 不参与，也不要求第三方 provider 另报一套 visual bbox，因为 provider 的最终输出已经是封闭的 `ScenePrimitive` union。

canonical visual 算法固定为：

1. 只读取 primitive 静态字段，也就是没有 animation runtime 时 renderer 使用的 settled state。Scene / primitive 的 `animations` 不扩张 bounds；`viewBox`、transform、opacity、fill、stroke、strokeWidth 等内置动画轨迹和自定义动画属性均不进入本字段。需要动画全时域包络的能力必须另立契约。
2. Text 以已保存的 `measuredWidth` / `measuredHeight` 矩形为唯一口径：`align` 依次按 start / middle / end 放在 `x` 的右侧 / 居中 / 左侧，`baseline` 按 top / middle / bottom 放在 `y` 的下侧 / 居中 / 上侧，alphabetic 在 canonical bounds 中与 bottom 同口径，再应用 group transform；不声称覆盖字体 glyph ink overhang。TeX 继续使用其已保存的 Scene primitive 几何，不调用 lowerer 或 measurer。
3. Rect 使用解析后的几何矩形。Ellipse 未旋转时使用 `cx ± rx` / `cy ± ry`；旋转角 `θ` 下的半宽固定为 `sqrt((rx * cos θ)^2 + (ry * sin θ)^2)`，半高固定为 `sqrt((rx * sin θ)^2 + (ry * cos θ)^2)`。Path 的 line / quad / cubic 使用游标端点与 control points 的 hull；arc 使用完整圆的 AABB，ellipseArc 使用同一旋转椭圆公式的完整 AABB。即使只绘制部分弧也取完整包络，保证算法保守且无需 renderer 曲线采样。
4. 存在可能可见 stroke 时，effective width 为 `strokeWidth ?? 1`。round / bevel join 与 butt / round / square cap 的外扩不超过 half width；miter join 使用 Core 常量 `CANONICAL_STROKE_MITER_LIMIT = 10`，外扩为 `halfWidth * 10`。Core 对 primitive 几何 AABB 按该上界各向同性扩张；SVG 当前默认 miter limit 4、Canvas 当前默认 10，均不超过 canonical 上界，未来 renderer 不得使用更大的隐式值。
5. arrow marker 按已解析 endpoint、切线、`baseSize`、`refX`、`markerWidth` / `markerHeight` 和 effective path strokeWidth 建立与 renderer 相同的数值 transform，再递归计算 marker primitive bounds；marker-local stroke 使用同一 miter 上界。
6. shadow 沿用 `compile/orchestration/bounds` 的现有 canonical 口径，不替换 helper。设无 shadow 包络为 `[minX, maxX] × [minY, maxY]`、`dx = offsetX`、`dy = offsetY`、`b = blur ?? 0`，结果固定为 `[minX - b - max(0, -dx), maxX + b + max(0, dx)] × [minY - b - max(0, -dy), maxY + b + max(0, dy)]`。不再额外执行“平移 shadow 后与原包络 union”的另一套算法。该数值是跨 renderer 的布局近似，不声称覆盖高斯滤镜的全部非零像素。
7. Group 递归 union children 后按结构化 transform 变换四角。clip 使用已解析 `ClipShape` 的 canonical 几何 AABB 与 child bounds 相交；compound clip 仍只做 AABB 级保守相交。blend mode 不扩张包络。
8. primitive 的显式数值 opacity 为 0 时整棵不贡献；fill / stroke 的显式 opacity 为 0 时只抑制对应 paint。Core 不解析任意 CSS color 的 alpha，因此出现 paint 字符串时保守视为可能可见。

这些规则使 `visualBounds` 有纯 Core、无需实际 renderer 的测试 oracle。对应实现进入 `compile/orchestration/bounds`、`compile/resource/clip` 与必要的纯几何 helper；renderer 只需继续遵守现有 Scene 数值语义。

Table 使用 allocation bounds 求解轨道，使用 visual bounds 决定 fit / overflow / clip；其它 composite 可以按自身领域规则选择，但不得重新测量或从 Scene primitive 反推尺寸。

### replay 是显式、compile-local、至多使用一次的结果

```ts
declare const replayBrand: unique symbol;

type CompositeReplay = Readonly<{
  [replayBrand]: never;
}>;

type CompositeReplayPlacement = Readonly<{
  kind: 'replay';
  replay: CompositeReplay;
  transforms?: ReadonlyArray<Transform>;
}>;

type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  children: ReadonlyArray<IRChild | CompositeReplayPlacement>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });
```

- `children` 的顺序就是最终逻辑绘制顺序；普通 `IRChild` 走正常 compile，replay placement 复用对应 `layoutChild()` 已完成的展开、provider 解析、文字 / TeX 测量、引用解析和布局结果。
- replay 阶段只提交已保存的 namespace / resource / diagnostic / artifact contribution、应用数值 `Transform`、emit Scene primitive；不得再次调用 composite `expand` / `compile`、`measureText`、`lowerTex` 或任何 layout 函数。
- replay token 只能在创建它的同一次 `compileToScene()` 中使用，且最多 placement 一次。跨 compile、伪造 token或重复 placement 全部 fail-loud；未选择的 intrinsic probe 可以丢弃。
- 未 replay 的 probe 不注册 id / resource，不发布 warning / artifact，也不改变最终 resource 顺序。布局期间的 fail-loud 错误仍立即抛出。
- `layoutChild()` 使用当前 occurrence 的只读 reference snapshot 与隔离的局部 namespace。子树内部引用可以解析；对尚未完成的外部 forward reference 或会形成父子布局循环的引用明确报错，不以第二次 traversal 猜测结果。
- `maxCompositeDepth` 同时约束 `expand`、layout-aware `compile` 和 nested `layoutChild` 调度；replay 自身不增加深度。

replay 是公开 contract 中的 opaque token，但不是 IR、artifact 或持久化数据。内部状态随本次 compile 释放，不使用 module-level mutable state 或全局 token table。

### `compileToScene()` 返回 Scene 与 typed artifacts

`compileToScene()` 在 v0.5 进行破坏性升级，返回单一显式结果：

```ts
type CompileExpansionSegment = Readonly<{
  kind: 'expand' | 'output' | 'replay' | 'scopeChild';
  index: number;
}>;

type CompileOccurrenceLocator = Readonly<{
  /** 最近的原始输入 IR occurrence，沿用当前 compile 诊断 path */
  sourcePath: string;
  /** 从该输入 occurrence 到 provider 产出 occurrence 的结构化索引链 */
  expansionPath: ReadonlyArray<CompileExpansionSegment>;
}>;

type CompositeCompileArtifact<
  TNamespace extends string = string,
  TType extends string = string,
  TValue extends JsonValue = JsonValue,
> = Readonly<{
  kind: 'composite';
  namespace: TNamespace;
  type: TType;
  occurrence: CompileOccurrenceLocator;
  value: TValue;
}>;

type NodeLayoutCompileArtifact = Readonly<{
  kind: 'nodeLayout';
  occurrence: CompileOccurrenceLocator;
  value: CompiledNodeLayout;
}>;

type CompileArtifactOptions = Readonly<{
  /** 是否返回真实 Node 的布局 DTO */
  nodeLayouts?: boolean;
}>;

type CompileResult<TCompositeArtifact extends CompositeCompileArtifact = CompositeCompileArtifact> = Readonly<{
  scene: Scene;
  artifacts: ReadonlyArray<TCompositeArtifact | NodeLayoutCompileArtifact>;
}>;

type AnyExpandCompositeDefinition = {
  namespace: string;
  type: string;
  schema: ZodType;
  expand: (node: never, context: CompositeExpandContext) => IRChild | Array<IRChild>;
  compile?: never;
  artifactSchema?: never;
};

type AnyLayoutCompositeDefinition =
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (node: never, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<never>;
      artifactSchema?: never;
    }
  | {
      namespace: string;
      type: string;
      schema: ZodType;
      expand?: never;
      compile: (node: never, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<JsonValue>;
      artifactSchema: ZodType<JsonValue>;
    };

type AnyCompositeDefinition = AnyExpandCompositeDefinition | AnyLayoutCompositeDefinition;

declare const defineComposite: <
  const TNamespace extends string,
  const TType extends string,
  TNode,
  TArtifact extends JsonValue = never,
>(
  definition: CompositeDefinition<TNode, TNamespace, TType, TArtifact>,
) => CompositeDefinition<TNode, TNamespace, TType, TArtifact>;

type CompositeArtifactOf<TDefinition> = TDefinition extends {
  namespace: infer TNamespace extends string;
  type: infer TType extends string;
  artifactSchema: ZodType<infer TArtifact extends JsonValue>;
}
  ? CompositeCompileArtifact<TNamespace, TType, TArtifact>
  : never;

type CompileOptions<TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>> =
  CompileHostOptions &
    CompileLayoutOptions &
    CompileProviderOptions & {
      composites?: TComposites;
      maxCompositeDepth?: number;
      artifacts?: CompileArtifactOptions;
    };

/** 当前无内置 composite，因此为 never；以后由 BUILTIN_COMPOSITES 推导 */
type BuiltinCompositeArtifact = never;

declare const compileToScene: <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
) => CompileResult<BuiltinCompositeArtifact | CompositeArtifactOf<TComposites[number]>>;
```

Artifact 契约：

1. layout-aware definition 返回 `artifact` 时必须同时声明 `artifactSchema`。Core 以 schema 解析后再校验为 JSON-safe plain data，创建 detached copy；函数、`Map`、`Set`、class instance、symbol 和循环引用全部拒绝。payload、envelope、occurrence segment 与最终 artifacts 数组全部递归冻结。
2. artifact envelope 的 `namespace` / `type` 来自已解析 definition，`occurrence` 由 Core 分配，provider 不能伪造。相同 composite node 出现两次就有两个 occurrence，不依赖业务 id。
3. `sourcePath` 使用现有 compile IR path 口径；provider 生成的 occurrence 用结构化 `expansionPath` 逐层消歧。locator 只保证在本次 canonical IR + definitions 的完整 compile 内确定，不承诺跨 IR 插入、重排或版本稳定，也不替代后续 interaction 设计中的 target / manifest identity。
4. artifacts 按最终逻辑树的 occurrence preorder 输出；同一 occurrence 的 composite artifact先于其 replay descendants。被丢弃的 probe 不占 locator、不产 artifact。
5. 未注册 composite 继续按现有 `compileToScene()` warning + skip 契约处理，不产 artifact。definition `compile`、artifact schema 或 replay 失败时 fail-loud，不返回部分 `CompileResult`。
6. 没有 artifact 时仍返回 `artifacts: []`。Scene 结构本身不增加 artifact 字段，renderer 只消费 `result.scene`。

`CompositeDefinition<TNode, TNamespace, TType, TArtifact>` 表示一个 definition 的精确作者类型。`AnyCompositeDefinition` 是 registry / adapter 使用的显式擦除类型：callback 参数使用 `never` 保持严格函数方差安全，artifact payload 擦除为 `JsonValue`；resolver 只能在对应 schema parse 后调用 callback。`defineComposite()` 返回完整 literal key / payload 泛型。`CompositeArtifactOf` 对 `expand` 或无 `artifactSchema` definition 映射为 `never`，对 artifact definition 生成精确 envelope。直接把 definitions 作为 `as const` tuple 传入时，调用方得到精确 artifact union；经 `ReadonlyArray<AnyCompositeDefinition>` registry 或 adapter 聚合后安全退化为 `CompositeCompileArtifact<string, string, JsonValue>`，不使用 `any`。当前 `BUILTIN_COMPOSITES` 为空；以后内置 artifact 必须进入同一个 `BuiltinCompositeArtifact` 推导，不得另加返回通道。

类型边界：

- `defineComposite({...})` 返回精确的 definition 类型。
- 单个 definition 的显式注解使用 `CompositeDefinition<TNode, TNamespace, TType, TArtifact>`，裸 `CompositeDefinition` 不表示宽类型。
- registry、adapter props、贡献收集器和 normalize options 使用 `Array<AnyCompositeDefinition>` / `ReadonlyArray<AnyCompositeDefinition>`。
- 只有紧邻 schema parse 的 resolver 可以把 erased definition 恢复为内部可调用形态；其它 consumer 不得对 `never` callback 做 assertion 后调用。

### occurrence locator 递归生成算法

Core 在 composite pre-expand 与 traversal 内部为 prepared child 保存非 IR provenance；它只服务本次 compile 的 occurrence 分配，不进入用户 IR、Scene 或全局表。规则固定如下：

1. 原始输入 Core child 使用当前实体 path 作为 `sourcePath`，`expansionPath: []`。例如直接 Node 是 `children[0].node`，输入 Scope 后代是 `children[0].scope.children[2].node`。
2. 原始输入 composite 使用当前 raw child path 作为 `sourcePath`，不追加伪实体后缀。例如 `children[1]`。definition key 已在 artifact envelope / 诊断中单独提供。
3. `expand()` 第 `i` 个直接产物继承 composite locator 并追加 `{ kind: 'expand', index: i }`；递归 expand 每层继续追加。probe 不参与 expand 索引，索引只来自 definition 返回数组。
4. layout-aware `compile()` 的 `children[i]` 若是普通 `IRChild`，追加 `{ kind: 'output', index: i }`；若是 replay placement，追加 `{ kind: 'replay', index: i }`。未 replay probe 没有 output index，也不占 locator。
5. canonical 输入 `IRScene.children` 与输入 Scope 的 children 在进入 provider 前就各自取得当前诊断 path，因此输入 Scope 后代始终以自己的原始 `sourcePath` 为起点。由 `expand`、`compile` 或 replay 子树生成的 Scope 中第 `i` 个后代追加 `{ kind: 'scopeChild', index: i }`。Composite payload 内嵌的 `IRChild` 属于 provider 输入，不被视为 canonical Scene child；definition 把它交给 `layoutChild()` 或作为 output 返回时，仍从当前 composite sourcePath 追加 replay / output 段。
6. replay 保存被测 child 的相对 provenance；commit 时先追加本次 `replay` segment，再接上其内部 `expand` / `output` / `scopeChild` segments。nested replay 按同一规则继续追加。
7. artifacts 按上述 locator 对应的最终 logical tree preorder 发布。相同 locator 不允许发布两个同 `kind + namespace + type` artifact；需要多个领域产物时放进一个 payload 对象。

规范调试字符串由唯一 formatter 生成：

```ts
const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  locator.sourcePath + locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');
```

示例：

```text
children[0].node
children[1]::expand[0]
children[2]::output[0]::scopeChild[1]
children[2]::replay[3]::scopeChild[0]::replay[1]
```

`NodeLayoutCompileArtifact.occurrence` 按来源区分：直接输入 Node / 输入 Scope 内 Node 使用实体 `sourcePath` 且 `expansionPath` 为空；由 composite 生成的 Node 使用原始 composite `sourcePath` + 结构化 `expansionPath`。docs 与 tests 分别锁定两类 locator。

### Node layout typed artifacts

Node layout 作为 opt-in typed artifact 提供，定位统一放在 artifact envelope 的 occurrence 中。需要 Node layout 的调用方显式开启：

```ts
const result = compileToScene(ir, {
  artifacts: { nodeLayouts: true },
});

const nodeLayouts = result.artifacts.filter(
  (artifact): artifact is NodeLayoutCompileArtifact => artifact.kind === 'nodeLayout',
);
```

`artifacts.nodeLayouts` 默认 `false`，避免大图无条件复制全部 Node layout DTO。Composite artifacts 是 definition 的正式输出，不能由宿主关闭；不需要 artifact 的 definition 不返回该字段。

`onWarn` 是宿主即时诊断通道，不承担产物传递。React `<Layout>` 通过 `artifacts?: CompileArtifactOptions` 声明 Node layout 等 opt-in artifact，通过通用 `onArtifacts` 在 commit 后通知 Core 已返回并冻结的 artifact 数组。通知不能影响 compile，也不是 definition 捕获 artifact 的隐藏通道：

```tsx
<Layout
  artifacts={{ nodeLayouts: true }}
  onArtifacts={artifacts => {
    const layouts = artifacts.filter(isNodeLayoutCompileArtifact);
  }}
>
  {children}
</Layout>
```

Vanilla 的内部 `SceneResult` 同步携带 artifacts，render / mount 路径只把 `scene` 交 renderer；`VanillaView.artifacts` / `CanvasView.artifacts` 暴露当前一次 compile 的 immutable 数组，并在 `update()` 后与 Scene 原子替换。输入已是 Scene 时 artifacts 固定为空。领域 convenience 可以从同一结果返回自己的 typed artifact，不再次 lower 或 compile；普通 `renderToSvgString()` 返回形态不因 artifact 改变。

### `lowerIRToKernel()` 对 layout-aware composite fail-loud

`lowerIRToKernel()` 只拥有 schema、composite registry 与结构展开环境。遇到已注册的 `compile` 分支时，在执行 definition 前抛出包含 provider key 与 IR path 的错误：

```text
lowerIRToKernel: composite 'table.table' at children[0] requires layout-aware compile and cannot be lowered without the full compile environment.
```

该规则同时覆盖输入中直接出现的 layout-aware composite，以及普通 `expand` 产物中嵌套出现的 layout-aware composite。函数不回退到 intrinsic、不丢 artifact、不偷偷调用 `compileToScene()`。

## 公开使用形态

layout-aware definition 在 `compile()` 中调用 `layoutChild()`，求解后把选中的 replay 放入 `children`，并可返回由 `artifactSchema` 校验的领域产物。调用方把精确 definition tuple 传给同一个 `composites` option，即可从一次 compile 同时取得 Scene 与推导后的 artifact union：

```ts
const result = compileToScene(ir, {
  composites: [layoutDefinition] as const,
  artifacts: { nodeLayouts: true },
});

const { scene, artifacts } = result;
```

领域 solver、布局字段、fit / overflow 与 artifact payload schema 仍由具体 Tier 2 package 拥有。

## 被否决的方案

- 新建 layout composite registry：会把同一 `namespace.type` provider 拆成两套注册、冲突和 options 路径。
- 给 `expand()` 注入完整 compile context：会让原本可独立 lowering 的纯结构展开依赖 namespace、资源与宿主测量，并且仍无法表达 replay。
- 只公开 `measureChild()` 再重新 compile：会重复 composite expansion、文本 / TeX 测量和 provider 工作，也无法保证测量与最终输出同源。
- 把 artifact 写进 Scene / meta：renderer 不应消费 Table manifest、lineage 或 compile DTO，且多个 occurrence 无可靠归属。
- 用 callback、闭包数组、全局 `Map` 或 module-level cache 收集 artifact：并发、Strict Mode、SSR 和重复 compile 会互相污染，产物也不再由返回值显式拥有。
- 保留 `compileToScene(): Scene` 并新增平行 `compile()`：会形成两个长期入口，调用方和 adapter 容易继续走无法取得 artifact 的旧路径。

## 最终实现与验证

实现沿既有分层落地：

- contract 扩展 `CompositeDefinition` 为互斥的 `expand | compile`，保留 `defineComposite()` 与唯一 registry
- compile traversal 增加隔离 child layout、compile-local replay transaction、canonical visual bounds、typed artifact 与 occurrence 分配
- `compileToScene()` 统一返回 `{ scene, artifacts }`；`lowerIRToKernel()` 对 layout-aware definition fail-loud
- React 通过 `artifacts` / `onArtifacts` 在 commit 后通知，Vanilla view 同步持有与 Scene 同次生成的 artifacts
- Render、TeX、Plot、Table、Eval 与 docs 调用方只消费 `CompileResult`，没有新增 renderer 或领域私有布局语义

正式验证覆盖 Core contract、artifact、类型推导、visual bounds 与对抗场景，以及受影响的 Kernel / Viz adapter、Render、TeX、Table、Eval、类型检查、lint 和 docs integrity。中英文 Layout artifact demo 的独立浏览器验证均无 warning / error。

Table alpha.2 仍需为真实 auto / minmax、wrap、fit / overflow 与 manifest integration 提供独立上层证据。

## 影响

- `compileToScene()` 返回包含 `scene` 与 `artifacts` 的 `CompileResult`。
- Node layout 由 opt-in typed artifacts 提供，React 通过 `onArtifacts` 在 commit 后通知。
- `CompositeDefinition` 是 `expand | compile` 互斥的精确 definition union；registry 使用 `AnyCompositeDefinition`。
- Core compile 从“先全部 lower composite 再 traversal”调整为“预展开 `expand` 分支，traversal 调度 `compile` 分支”；Scene schema 与 renderer primitive 不变。
- React / Vanilla runtime、Plot / Table SSR convenience、eval 与 docs 示例消费同一返回形态；React `LayoutProps` 与 Vanilla view 提供显式 artifact surface，renderer API 不改。
- Table alpha.2 可以把固定轨道替换为内容反馈求解，并从同一次 Core compile 取得 manifest；Table 具体 schema / solver / adapter 改动不属于本 ADR 实现。
- 文档站需同步 zh/en compile reference、CompositeDefinition API、React Layout artifacts 与 Vanilla compile 示例，只描述当前公开面。

## 绘图完备性检查

- 能力面与解决的问题：Drawing / Constraint & Layout、Composition；让通用 Tier 2 composite 在完整 Core 环境中测量、约束、放置任意 `IRChild`，并显式返回同源 artifact。
- 是否属于 Drawing Complete：是。缺失时 Table、未来 panel / legend 等上层会复制 Core 测量、provider、reference、Scene bounds 或建立隐藏 side channel。
- 主责包与协作包：Core 主责 definition、registry dispatch、layoutChild、replay、compile result、occurrence locator；math 只提供 BoundsRect / 纯几何；render 只消费 Scene；React / Vanilla 负责结果接线；Table 主责二维 solver 与 Cell 语义。
- 是否可由现有能力组合：不能。`expand` 与 `onNodeLayout` 分别缺少反馈时机和任意 child replay。
- math / core / render / adapter 的责任切分：不新增 math 算法或 renderer primitive；adapter 不测量、不重跑 lowering，只转交 Core 返回值。
- 是否需要新 IR / contract / registry：不改 IR/schema，不建新 registry；扩展现有 CompositeDefinition contract 与 compile dispatch。
- Scene / manifest 如何承载：Scene 保持纯 renderer 产物；typed artifacts 与 Scene 并列位于 CompileResult，Table manifest 作为 composite artifact payload。
- renderer 实现或诊断降级：renderer 无新语义；compile 在 artifact、constraint、reference、replay 错误时 fail-loud，不向 renderer 降级。
- React / Vanilla 如何等价暴露：两者消费同一 CompileResult；React 仅 post-commit 通知 immutable artifacts，Vanilla 同步持有结果，均不二次 compile。
- Interaction Readiness 是否适用：只复用 compile-local occurrence locator，不定义稳定 target / hit / intent；与后续 interaction 设计正交。
- 不支持边界与本轮结论：扩展 Drawing Complete 的通用 layout-aware composition 与 compile artifact 链路；Table solver、跨次 cache、增量 compile、异步测量、DOM intrinsic layout 明确不进入 Core。

## 不在本 ADR 范围

- Table track schema、span、border、Cell alignment、fit / overflow、fragmentation 与具体 manifest 字段。
- 跨 compile replay、memoization、dependency / invalidation graph、patch 与 renderer 局部更新。
- 异步 `measureText` / TeX、DOM / CSS layout、ReactNode 或 renderer 反向测量。
- 可替换全局 layout solver registry；领域 solver 仍归各 Tier 2 package。
- 稳定 interaction target、跨 IR 编辑 locator、Composite source identity 与 Plot datum locator 设计。
- arbitrary forward-reference fixpoint、父子循环约束或多 pass 全图求解；不可形成有向布局顺序时 fail-loud。

## 遗留风险与后续

- `CompileResult`、opt-in artifacts 与 occurrence locator 是本版唯一公开编译结果契约
- occurrence locator 只保证同一次 canonical compile 内确定，不是 interaction target 或跨编辑稳定 identity
- visual bounds 是 renderer-agnostic 的保守 settled AABB，不覆盖 glyph ink、逐像素 alpha 或动画全时域
- Table alpha.2 solver / manifest、跨次缓存、增量 compile、异步测量与 forward-reference fixpoint 均需独立设计和验收
