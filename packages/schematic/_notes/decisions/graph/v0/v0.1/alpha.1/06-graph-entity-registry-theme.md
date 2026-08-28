# ADR-06：建立 Graph 语义注册与主题样式

- 状态：Accepted
- 决策日期：2026-08-16
- 修订日期：2026-08-23
- 修订关系：ADR-07 保留本 ADR 的 Entity registry、Theme style lookup、语义 selector 与 scope 级联能力，并取代独立 Graph presentation root、按 identity 分离的实例 override、root token bag 与 Theme role recipe。ADR-09 进一步把 Graph 收敛为可选上下文，并让 Entity / Relation 成为独立 composite
- 替代：[GraphNode variant ADR](./02-graph-node-variants.md)

## 背景与目标

Entity 与 Relation 需要开放的语义词汇、可替换的结构 Definition，以及随 Core Theme 变化的领域外观默认。Graph 因此拥有 role、kind、predicate、direction 等领域语义，以及按这些 Canonical 语义匹配的 Theme rules；最终仍下沉为普通 Core Node、Path 与 Scope，Core、Scene 和 renderer 不解释 Graph 词汇

早期 Graph 还提供 Entity / Relation `variant`、Graph `entityVariant`、Variant Definition 与 Theme selector 中的 `variant`。这些字段被定义为非语义视觉 key，不改变 role、kind、predicate、direction、结构、引用或几何，只是间接选择 fill、stroke、opacity 等 appearance。它们与 Graph Theme style、Graph-local rules 和元素显式 Core-compatible appearance 形成了第二套视觉参数体系，也让 LLM 和作者需要在两个等价入口之间选择

本修订删除整条 Variant 轴。Graph Theme 负责整体视觉语言与按语义批量设置默认值，`graphTheme` 负责局部规则，Entity / Relation 显式 appearance 字段负责单个实例的精确覆盖。Graph 不再提供任何纯视觉 selector key

## 决策

### Graph 语义使用 Definition / registry

Entity role、kind、predicate 与 Relation role、kind、predicate 使用开放非空 key。内置和自定义项通过同一 Definition、registry、resolver 和 provider assembly 消费；内置名称只为 author、schema 与工具提供已知词汇，不构成闭合集合

Entity role definition 拥有 shape、boundary、padding、cornerRadius 与基础 minimum size 等结构默认。Entity kind 和 predicate 只表达稳定语义分类，不保存 appearance。Relation role、kind 与 predicate 按 ADR-08 拥有 direction、marker family、marker existence 与规范 dash 等结构语义

Graph 不定义 Entity / Relation Variant Definition、registry、内置 Variant 常量或 definition options。新增可复用语义分类时进入 role、kind 或 predicate；仅改变视觉时进入 Theme 或实例 appearance，不能为视觉便利伪造语义 key

### Graph Theme style 与 Core Theme style 同名协作

Graph Theme style definition 以当前有效 Core Theme 解析稀疏 Entity / Relation appearance 与有序 rules。Definition 作者只声明相对 Graph 默认 preset 的变化；Graph resolver 负责补全为下游唯一完整结果：

```ts
type GraphThemeStyleOverrides = Readonly<{
  entity?: Readonly<{
    tokens?: IRGraphEntityAppearanceTokenOverrides;
    rules?: ReadonlyArray<IRGraphEntityThemeRule>;
  }>;
  relation?: Readonly<{
    tokens?: IRGraphRelationAppearanceTokenOverrides;
    rules?: ReadonlyArray<IRGraphRelationThemeRule>;
  }>;
}>;

type GraphThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => GraphThemeStyleOverrides;
}>;

declare const defineGraphThemeStyle: (definition: GraphThemeStyleDefinition) => GraphThemeStyleDefinition;
```

`entity`、`relation`、`tokens` 与 `rules` 均可省略；出现的 token 对象必须至少包含一个字段。Graph 默认 preset 始终先按当前 Core Theme mode 建立，Definition tokens 再按字段覆盖。默认 rules 保留，自定义 rules 按声明顺序追加在后，因此匹配同一字段时由后规则覆盖

省略 Core `theme.style` 时使用 Graph 自身的 Neutral 默认 baseline。显式 Core style 名称要求当前 Graph definitions 中存在同名 `GraphThemeStyleDefinition`；缺失时 fail-loud，不猜测、不回退到其它 style，也不根据 Viz 或 Docs 名称建立包内白名单

发布包只提供 Neutral 默认 baseline，不内置命名 reference styles。Docs 通过公开 Core 与 Graph definitions 维护同名 `academic`、`vibrant` 与 `clean` 参考实现：Academic 使用出版型清晰轮廓，Vibrant 吸收旧 `fill` 的实心高对比语言，Clean 吸收旧 `mixed` 的平整弱填充与清晰边界。它们是公开 Theme 能力的消费示例，不进入 Graph Source IR 或发布包内置 registry

### Theme rules 只匹配真实语义轴

Entity Theme selector 可以按 `role`、`kind` 与 `predicate` 匹配；Relation Theme selector 可以按 `role`、`kind`、`predicate` 与有效 `direction` 匹配。每个 key 字段接受一个非空值或非空、无重复的值列表；同一 selector 中多个字段按 AND 匹配。rule 省略 selector 时匹配对应类型的全部元素

Theme selector 不接受 `variant`、id、颜色或其它纯视觉 key。需要按单个 identity 设置外观时，作者直接在对应 Entity / Relation record 写显式 appearance；需要按多个非语义实例批量设置时，由上层组合显式生成字段，而不是把实例集合倒灌为 Graph Theme 语义

### Theme 与显式 appearance 的唯一级联

对单个 Entity / Relation，appearance 从低到高按以下顺序确定：

```text
当前 Core Theme mode 下的 Graph Neutral 默认 preset
> 当前 Core Theme style 对应 Graph Definition 的稀疏 tokens
> Graph 默认 rules
> 当前 Graph Theme style Definition 中匹配的 rules
> 从外到内各层 Graph.graphTheme 匹配 rules
> Entity / Relation 显式 Core-compatible appearance 字段
```

Graph-local layer 不改变普通 Core、Plot、Table 或其它第三方 composite。带自身 Core `theme` 的 Scope 或 Graph 建立新的 Graph Theme style baseline，并切断外层 `graphTheme` layer；第三方 composite 内部保持不透明。元素显式 `fill`、`stroke`、`color`、`textColor`、`opacity`、marker appearance 与 label appearance 始终逐字段覆盖 Theme 默认

### Definition、provider 与 authoring 入口

`GraphDefinitionOptions` 只装配 Entity / Relation role、kind、predicate 与 Graph Theme style definitions：

```ts
type GraphDefinitionOptions = Readonly<{
  entityRoles?: ReadonlyArray<EntityRoleDefinition>;
  entityKinds?: ReadonlyArray<EntityKindDefinition>;
  entityPredicates?: ReadonlyArray<EntityPredicateDefinition>;
  relationRoles?: ReadonlyArray<RelationRoleDefinition>;
  relationKinds?: ReadonlyArray<RelationKindDefinition>;
  relationPredicates?: ReadonlyArray<RelationPredicateDefinition>;
  graphThemeStyles?: ReadonlyArray<GraphThemeStyleDefinition>;
}>;
```

直接 IR、React 与 Vanilla 使用同一 Graph definitions 与 resolve / lowering 真源。React 提供 `GraphThemeProvider`，按祖先到局部顺序为 standalone Graph authoring 子树合并 Graph-owned Theme definitions；Graph 上显式 `graphThemeStyles` 后置。embedded Graph / Entity / Relation 由自身 authoring props 或外层宿主显式传递 `graphThemeStyles`，不能依赖 React context 穿透 Layout 的静态 InputEmbed 提取边界。Vanilla 继续使用显式 `graphThemeStyles`，不建立 ambient 或全局可变 registry

同一 registry 中重复 key、自定义覆盖内置语义 key、同名不同对象争用 Definition 均 fail-loud。相同 Definition 对象因 adapter contribution 重复出现时可以按既有 provider assembly 规则去重

## 基础数据结构与公开契约

Entity、Relation 与 Graph Source 中不再存在 Variant 字段：

```ts
type IRGraphEntity = Readonly<{
  namespace: 'graph';
  type: 'entity';
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  // Core Node-compatible non-structural fields
}>;

type IRGraphRelation = Readonly<{
  namespace: 'graph';
  type: 'relation';
  role: string;
  kind?: string;
  predicate?: IRGraphPredicateRef;
  direction?: RelationDirection;
  // Core Path-compatible fields and NodeTarget endpoints
}>;

type IRGraph = IRScopeProps &
  Readonly<{
    namespace: 'graph';
    type: 'graph';
    graphTheme?: IRGraphThemeLayer;
    children?: ReadonlyArray<IRChild>;
  }>;
```

`IRGraphThemeLayer` 只保存有序 appearance rules；运行时 Definition、registry、完整 token resolution 与 callback 不进入 Source IR。Graph Source 只选择 Core `theme.style`，不重复保存 Graph style 名称

## 行为、失败语义与兼容性

- Source schema 使用 strict object；`variant` 与 `entityVariant` 作为未知字段直接拒绝，不静默忽略
- Variant 常量、schema、类型、Definition、define helper、registry、options 与公开导出直接删除，不保留 alias、deprecated 或 fallback
- Theme selector 中的 `variant` 作为未知字段拒绝；未注册 role、kind、predicate、Graph Theme style 或 selector key 继续由 owner resolver fail-loud，并列出可用 key 或注入入口
- Graph Theme style callback 抛出异常或返回非法稀疏结构时统一报告 Definition callback 失败；显式空 token 对象无效
- Graph Theme 只改变视觉默认，不改变 Entity / Relation 语义、结构、引用、位置、尺寸、route、marker family 或 Scene identity
- 默认 Graph 视觉保持旧 `default` 的轮廓语言；旧 `fill` 与 `mixed` 不再是 Source 值，仅由 Docs Vibrant / Clean reference definitions 迁移其视觉意图
- 这是 breaking Source IR、public API 与 authoring migration；`0.x` 不提供 Variant 双轨解析或自动迁移
