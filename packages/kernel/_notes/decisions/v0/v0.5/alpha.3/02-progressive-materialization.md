# ADR-02：Progressive Materialization

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[ADR-01](./01-cooperative-concurrent-runtime.md) · [alpha.2 Scene Patch ADR](../alpha.2/05-scene-patch-retained-renderer.md)

## 背景

Concurrent prepare 可以缩短单次阻塞，却不决定完整结果何时可见。大 Scene 即使已经编译完成，SVG DOM 创建或 Canvas display list / bitmap materialization 仍可能形成长提交；LLM 或复杂图形也需要尽快显示第一批有效结果。

不能用“部分 Scene commit”解决这个问题。document、Core contribution、Scene、provenance 与 index 必须继续按 semantic revision 原子提交；渐进显示只是 renderer presentation 的独立状态。如果可见 DOM、geometry、hit-test 和事件 target 各自推进，就会出现看得到但点不到、点到未显示实体或旧 intent 写入新 document。

## 决策：完整 Scene，独立 Materialization State

`@retikz/render` 在 alpha.2 `RetainedRenderer` 上增加原子与渐进两种 materialization 策略。默认是 `atomic`；`progressive` 必须由调用方显式选择；`auto` 只根据公开 capability 与阈值选择，并记录最终决策。

```ts
type MaterializationStrategy = 'atomic' | 'progressive' | 'auto';

type MaterializationOptions = Readonly<{
  initial: MaterializationStrategy;
  update: MaterializationStrategy;
  requireProgressive?: boolean;
}>;

type MaterializationSnapshot = Readonly<{
  semanticRevision: RuntimeRevision;
  materializationRevision: number;
  phase: 'pending' | 'materializing' | 'complete' | 'rolling-back' | 'failed';
  visibleCount: number;
  totalCount: number | undefined;
}>;
```

`materializationRevision` 是 view-local 单调 safe integer，只标识一次可见 batch，不替代 semantic revision。每个事件 target、geometry query 与 hit-test result 都携带二者；持久 intent 在写回 owner 前必须确认 semantic revision 仍有效，并确认 identity 已在当前 materialization state 中可见。

Renderer 从完整 next Scene、Scene Patch 与后端 capability 派生 `PresentationBatch`。Batch 可以包含 primitive、resource、layout、index 与后端私有工作，但不是可持久化 Scene Patch 子集，也不对外暴露部分 Scene Snapshot。依赖顺序由 renderer 负责：resource 在 consumer 前可用，parent 在 child 前建立，移除时反向处理；无法形成合法 batch 时扩大边界或回退原子物化。

渐进 view 维护以下状态：

- 已提交的完整 semantic Scene，作为唯一稳定渲染真源。
- 最近一次 complete materialization，作为可回滚 anchor。
- 当前 materialization candidate、可见 identity set、geometry / hit-test / event index 与资源引用计数。
- completion / fallback / rollback diagnostic。

每个 batch 以同一 materialization transaction 同时切换可见对象、geometry、hit-test、event target 和 presentation index；未物化 identity 不可命中。Batch apply 失败、被更新 supersede 或 renderer dispose 时，candidate 不得留下半更新 index / resource；renderer 回到最近 complete anchor，随后可从最新完整 Scene 重新 materialize。

原子策略使用后端 shadow / staging state 准备完整 view，再一次切换 live view。渐进策略允许 semantic revision 已提交而 view 仍显示旧 complete anchor 或新 revision 的部分 candidate；这一差异必须通过 `MaterializationSnapshot` 可观察。SSR、字符串导出、截图和无 retained session 的入口强制 atomic。

Renderer capability：

```ts
type ProgressiveRetainedRendererCapability = Readonly<{
  patch: RetainedRendererCapabilityValue;
  materialization: 'atomic' | 'progressive';
  rollback: 'replace' | 'journal' | 'shadow';
}>;
```

alpha.3以破坏性变更把 alpha.2 `RetainedRenderer.capability: RetainedRendererCapabilityValue`替换为 `capability: ProgressiveRetainedRendererCapability`；其中 `patch`复用原 const object value。旧 scalar field删除，不保留并行同名 value/type、别名或桥接；不写迁移方案。

请求 progressive 但 renderer / Scene 边界不支持时，默认回退 atomic 并报告原因；`requireProgressive: true` 时在改变 live view 前 fail-loud。`auto` 的阈值由 host policy 注入，不能按 renderer 类型写死，也不能改变输出语义。

理由：

1. semantic revision 与 presentation progress 分离，保留完整 Snapshot、原子 transaction 和 history 边界。
2. Render 拥有合法 batch、资源与命中索引，Core / adapter 不需要理解后端物化细节。
3. atomic 仍是安全默认值；progressive 是显式、可诊断、可回滚的优化能力。

## 公开影响

- `@retikz/render` 新增 materialization strategy、state、batch scheduler hook 与 renderer capability。
- React / Vanilla view 可分别配置 initial / update 策略并订阅 materialization state。
- hit-test、geometry 与 hydration event result 增加 view revision context；不把 materialization 字段写入 Scene。
- 默认 atomic，不改变 SSR、导出、截图或现有完整 render 入口的可见语义。

## 长期边界

- document、contribution 或 Scene 的部分 semantic commit。
- LLM draft batch、generation checkpoint 或模型 token。
- pointer / keyboard / focus / selection / drag / zoom behavior 与持久 intent。
- 跨页面 retained cache、WebGL streaming、远端 renderer 或视频编码。

---

MaterializationSnapshot 与 PresentationBatch 都是运行时派生契约，不写入 IR 或 Scene。渐进物化复用 alpha.2 的完整 Scene、Scene Patch、retained renderer、命中索引和 rollback 边界
