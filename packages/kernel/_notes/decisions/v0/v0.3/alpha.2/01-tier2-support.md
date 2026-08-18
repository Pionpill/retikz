# ADR-01：Tier 2 领域节点与可注册 lowering 管线

- 状态：Accepted（已实现）
- 决策日期：2026-06-01
- 关联：[ADR-02 延后项](./02-composite-authoring-context-cache.md)

## 背景

Core 的四类 Tier 1 child schema 无法容纳领域节点；Tier 2 必须先进入可持久化 IR，再在 compile 阶段展开，才能同时服务 Canvas、Vanilla、SSR、AI 和所有 renderer。领域数据、scale、encoding 等语义仍归领域包，core 只提供通用机制。

## 决策

Core 提供 CompositeBaseSchema、CompositeNodeSchema 和 CompileOptions.composites 注册表：

- Tier 2 节点具有一等的 namespace、type 和领域字段，不包在 props 中；领域 schema 继承基础 schema 并收窄 literal，字段必须是 JSON 可序列化数据
- ChildSchema 保留原有按 type 区分的四类 Tier 1，并以 namespace 与 type 识别 Tier 2。Tier 1 不含 namespace，现有 IR 语义不变
- CompositeDefinition<T> 只包含 { schema, expand }。注册时从 schema 的 namespace/type literal 建立索引，不要求领域重复填写判别字段
- expand(node) => IRChild | IRChild[] 是纯结构变换，允许继续产生 Tier 2；compile 递归展开至 fixpoint。默认最大深度为 32，可由 maxCompositeDepth 调整；环和超深度是错误并抛出
- 未注册的 namespace/type 不使整图失败：发出 COMPOSITE_NOT_REGISTERED warning 并跳过该节点，其他节点继续编译
- 注册表默认为空，core 不内置领域 composite；展开产物继续使用现有 anchor、coordinate、z-index、布局和 renderer 管线

## 兼容性与实现结果

Tier 1 schema、IR、renderer 和既有 adapter 保持兼容；新增 composite 选项和透传能力为 additive。注册、schema 校验和展开由同一条路径处理，已完成跨 renderer 的实现闭环。

## 遗留风险

当前 expand 不接上下文，也没有 per-composite lowering cache；需要递归器、warning 或 options 时，以及实测展开成为瓶颈时，按 [ADR-02](./02-composite-authoring-context-cache.md) 的边界另行落地。
