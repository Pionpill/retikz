# ADR-02：Tier 2 JSX authoring、expand 上下文与 lowering cache

- 状态：Accepted（延后方案已采纳；三项均未实现、未排期）
- 决策日期：2026-06-02
- 关联：[ADR-01 Tier 2 支撑](./01-tier2-support.md)

## 背景与边界

ADR-01 已冻结 IR 后 lowering、注册表、schema 校验、fixpoint 和错误语义。本 ADR 只记录三个仍保持 core lowering 所有权的后续扩展，避免 adapter 各自形成平行机制。

## 决策

### React Composite authoring

新增 Kernel 级 Composite namespace kind props children，只声明 IRComposite，不展开；领域组件是无 hooks 的薄壳，必须渲染该组件而不能直接吐 Tier 1。React builder 递归收集嵌套 composite，展开仍由 core 完成。触发条件是 plot 或其他领域开始需要 JSX DSL。

### CompositeContext

当真实 composite 需要 warning、递归展开器或只读 compile options 时，扩展 expand 为 (node, context)。context 最小包含 onWarn、递归 expand 和只读 options，不提供几何或 layout，保持 expand 为纯结构变换。未出现真实消费者前不固化该参数。

### lowering cache

当实测展开成为瓶颈或开始 progressive/incremental rendering 时，在 core 的 lowerComposites 中按内容或引用缓存纯 expand 结果。缓存必须共享于所有 runtime，不下放到 React、Vanilla 或领域包；节点仍需可序列化、展开不得有可观察副作用。

## 兼容性与实现结果

当前实现维持 ADR-01 的纯 expand(node) 形态；本 ADR 没有实现变更。未来三项均应以 additive 方式演进，不改变 IR 后展开和未注册/环/深度错误语义。

## 遗留风险

React Tier 2 JSX 入口、带上下文的领域展开和缓存仍缺失，具体触发条件由实际消费者和性能证据决定。
