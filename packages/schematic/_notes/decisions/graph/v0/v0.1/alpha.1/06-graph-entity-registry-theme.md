# ADR-06：建立 Graph 语义注册与主题样式

- 状态：Accepted
- 决策日期：2026-08-16
- 修订日期：2026-08-23
- 关联：[Entity contract](./07-entity-data-geometry.md) · [Relation contract](./08-relation-data-geometry.md) · [Graph context](./09-composable-graph-context.md)
- 替代：[GraphNode Variant ADR](./02-graph-node-variants.md)

## 背景与目标

Entity 与 Relation 需要开放的语义词汇、可替换的结构 Definition，以及随 Core Theme 变化的领域外观默认。Graph 因此拥有 role、kind、predicate、direction 等领域语义和按这些 Canonical 语义匹配的 Theme rules；Core、Scene 与 renderer 不解释 Graph 词汇

早期 Variant 只间接选择视觉样式，与 Graph Theme 和元素显式 appearance 形成重复入口。本决策删除整条 Variant 轴：可复用语义进入 role、kind 或 predicate，批量视觉默认进入 Theme，单个实例的精确呈现进入 Core-compatible appearance

## 决策

### 语义 Definition 与 registry

Entity 与 Relation 分别拥有 role、kind、predicate Definition、registry 和 resolver。key 是开放的非空字符串；内置值只为 schema、编辑器和 LLM 提供已知词汇提示，不构成白名单。内置与自定义项通过同一 provider assembly、registry 和 resolver 消费

Entity role 拥有 shape、boundary、padding、cornerRadius 与基础 minimum size 等结构默认；kind 和 predicate 只表达稳定语义分类。Relation role、kind 与 predicate 按 ADR-08 拥有 direction、marker 和规范 dash 等结构语义

Graph 不提供 Variant Definition、registry、options 或 selector。不同对象争用同一 key、自定义项覆盖内置 key，以及缺失已引用 Definition 均 fail-loud；同一 Definition 对象的重复贡献可以按 provider assembly 规则去重

### Graph Theme style

Graph Theme style 与当前 Core Theme style 同名协作。Definition 返回相对 Graph 默认 preset 的稀疏 Entity / Relation tokens 与有序 rules：

```ts
type GraphThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => Readonly<{
    entity?: {
      tokens?: IRGraphEntityAppearanceTokenOverrides;
      rules?: ReadonlyArray<IRGraphEntityThemeRule>;
    };
    relation?: {
      tokens?: IRGraphRelationAppearanceTokenOverrides;
      rules?: ReadonlyArray<IRGraphRelationThemeRule>;
    };
  }>;
}>;
```

`entity`、`relation`、`tokens` 与 `rules` 均可省略；出现的 token 对象必须非空。Graph resolver 先按当前 Core Theme mode 建立 Neutral 默认 preset，再逐字段应用 Definition tokens；默认 rules 保留，自定义 rules 后置

省略 Core `theme.style` 时使用 Neutral baseline。显式 style 必须存在同名 Graph Theme Definition，否则 fail-loud。发布包只内置 Neutral；其它 reference style 由调用方通过同一公开 Definition 注入

### Selector 与级联

Entity selector 可以匹配 `role`、`kind` 与 `predicate`；Relation selector 还可以匹配有效 `direction`。单值或非空无重复列表表示允许值，同一 selector 的多个字段按 AND 匹配；省略 selector 匹配对应类型的全部元素

Theme selector 不接受 Variant、id、颜色或其它纯视觉 key。按单个 identity 设置外观时直接写入 Entity / Relation；非语义的批量变化由上层组合显式生成字段

单个元素的 appearance 按以下顺序确定：

```text
Graph Neutral preset
> 当前 Core Theme style 对应的 Graph Definition tokens 与 rules
> 从外到内各层 graphTheme rules
> Entity / Relation 显式 appearance
```

带显式 Core `theme` 的 Scope、Graph 或 Group 建立新的 Graph Theme baseline，并切断外层 `graphTheme`；普通 Core Scope 不切断级联，第三方 composite 内部保持不透明。Graph-local rules 只影响可见的 Entity / Relation，不改变普通 Core、Plot、Table 或 renderer

### Source 与运行时边界

`graphTheme` 只保存 JSON-safe 的有序 appearance rules。Definition、registry、callback、完整 token resolution 与运行时上下文不进入 Source IR。Direct IR、React 与 Vanilla 使用同一 definitions 和 resolve / lowering 真源；adapter 不维护私有 Theme、registry 或默认值

React 可以通过 `GraphThemeProvider` 组合 definitions；跨静态 InputEmbed 边界或 Vanilla authoring 必须显式传递 definitions，不依赖 ambient 或全局可变 registry

## 行为、失败语义与兼容性

- strict Source schema 拒绝 `variant`、`entityVariant` 和 selector `variant`
- 未注册 role、kind、predicate、Theme style 或 selector key 由 owner resolver fail-loud
- Theme callback 抛错或返回非法稀疏结构时报告 Definition callback 失败；空 token 对象无效
- Theme 只改变 appearance，不改变语义、结构、identity、位置、尺寸、route 或 marker family
- 旧 Variant schema、常量、Definition、registry、options 与导出直接删除，不保留 alias 或 fallback

## 结果

Graph 语义扩展统一经过 Definition / registry，视觉默认统一经过 Graph Theme，实例覆盖统一复用 Core-compatible appearance。最终 lowering 仍只产生普通 Core Node、Path 与 Scope
