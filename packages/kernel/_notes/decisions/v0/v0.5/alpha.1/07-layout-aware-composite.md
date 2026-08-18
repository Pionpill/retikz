# ADR-07：布局感知 Composite 与显式编译产物

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 ADR-06](../alpha.2/06-box-layout-composite-contract.md) · [alpha.2 ADR-08](../alpha.2/08-layout-proposal-probe-contract.md)

## 背景

Tier 2 layout composite 需要在完整 Core compile 环境中测量任意 `IRChild`，求解真实尺寸后反馈约束并复用选中结果。结构化 `expand()` 无法访问 provider、namespace、reference、文字 / TeX 测量或父级约束；事后 `onNodeLayout` 也不能布局任意 child 或表达 replay

## 决策

Composite 继续使用同一 `defineComposite`、registry、`CompileOptions.composites` 和 `namespace.type` key，Definition 分为互斥 `expand` 或 layout-aware `compile`，不新增 layout registry：

```ts
type CompositeDefinition<TNode, TNamespace extends string = string, TType extends string = string, TArtifact extends JsonValue = never> = {
  namespace: TNamespace;
  type: TType;
  schema: ZodType<TNode>;
} & (
  | { expand: (node: TNode, context: CompositeExpandContext) => IRChild | Array<IRChild>; compile?: never; artifactSchema?: never }
  | { expand?: never; compile: (node: TNode, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<TArtifact>; artifactSchema?: ZodType<TArtifact> }
);
```

`expand` 保持可由 lowering-only 执行的结构展开；`compile` 只在完整 compile traversal 中运行，并通过受限 `layoutChild` 获取完整环境，不直接暴露 measureText、provider map、namespace stack 或 resource registry

### Child layout、bounds 与 replay

```ts
type ChildLayoutConstraint =
  | { kind: 'intrinsic' }
  | { kind: 'constrained'; maxWidth: number };

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

`intrinsic` 表示自然需求；`constrained.maxWidth` 是有限非负 allocation 上限，alpha.1 不承诺 min width、height 或 exact-size。Node 可扣除 margin / padding 后重排文本，显式 minimumSize、不可断 token 或 shape circumscribe 可使 allocation 超过 maxWidth，不能压缩或裁剪伪造约束满足；Path、Coordinate、普通 Scope 和固定几何返回真实 allocation。`allocationBounds` 是布局占用，含 margin，不补齐到上限；`visualBounds` 是 settled Scene primitive tree 的 renderer-neutral 保守 AABB，含可见 stroke、marker、shadow 和 clip 影响但不代表 glyph ink、像素或动画全时域

Visual bounds 对 Text、Rect、Ellipse、Path、arc、stroke、marker、shadow、Group transform 和 clip 使用确定的 Core 几何规则；renderer 不参与。Table 可用 allocation 求轨道、visual bounds 判 fit / overflow，其它 composite 由领域规则选择，不得重新测量或从 renderer 回读

Replay 是 callback-local、compile-local、opaque、one-use token。选中 replay 只提交已保存的 namespace、resource、diagnostic、artifact、layout 和 Scene primitive，并应用数值 transform；不得再次 expand、compile、measureText、lowerTex 或 layout。跨 compile、伪造、重复 replay、forward reference、父子循环和不可解析 child 全部 fail-loud；未选 probe 不注册 id/resource、不发布 warning/artifact、不改变 resource 顺序

### CompileResult 与 typed artifacts

`compileToScene()` 返回单一结果：

```ts
type CompileOccurrenceLocator = Readonly<{
  sourcePath: string;
  expansionPath: ReadonlyArray<{ kind: 'expand' | 'output' | 'replay' | 'scopeChild'; index: number }>;
}>;

type CompositeCompileArtifact<TNamespace extends string = string, TType extends string = string, TValue extends JsonValue = JsonValue> = Readonly<{
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

type CompileResult = Readonly<{ scene: Scene; artifacts: ReadonlyArray<CompositeCompileArtifact | NodeLayoutCompileArtifact> }>;
```

可产 artifact 的 definition 必须声明 `artifactSchema`；Core 解析并 detached 为 JSON-safe plain data，拒绝函数、Map、Set、class、symbol 和循环引用，递归冻结 payload、envelope、locator 和数组。Envelope 的 namespace/type 来自 definition，occurrence 由 Core 分配；同一 composite 出现两次产生两个 occurrence。Locator 只保证同一次 canonical compile 内确定，不是 interaction target 或跨编辑稳定 identity。Artifact 按最终逻辑树 preorder 输出，被丢弃的 probe 无 locator / artifact；未注册 composite 继续 warning + skip，definition compile、schema 或 replay 失败 fail-loud，不返回部分结果

Node layout artifact 默认 opt-in；React 通过 commit 后 `onArtifacts` 通知，Vanilla view 与同次 Scene 原子持有。输入已是 Scene 时 artifacts 为空，renderer 只消费 `result.scene`

`lowerIRToKernel()` 遇到 layout-aware definition 必须在 callback 前以 provider key 和 IR path fail-loud，不回退 intrinsic、不丢 artifact、不偷偷调用 compileToScene

## 行为、兼容性与最终结果

这是对 CompositeDefinition 和 `compileToScene` 返回值的 0.x 公开变更：Scene schema 与 renderer primitive 不变，Core、React、Vanilla、Plot、Table 和其它 consumer 共享同一 CompileResult。`expand | compile` 互斥、proposal/replay、typed artifact 与 occurrence locator 已成为统一契约

## 遗留边界

不提供跨 compile replay/cache、dependency graph、patch、增量 layout、异步测量、DOM intrinsic layout、forward-reference fixpoint、稳定 interaction identity 或全局 layout solver；Table 的具体 solver 与 manifest 由 Tier 2 owner 负责
