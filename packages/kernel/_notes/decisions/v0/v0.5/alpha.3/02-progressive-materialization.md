# ADR-02：Progressive Materialization

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[alpha.3 roadmap](./roadmap.md) · [ADR-01](./01-cooperative-concurrent-runtime.md) · [alpha.2 Scene Patch ADR](../alpha.2/05-scene-patch-retained-renderer.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md) · [交互与增量运行时设计](../../../../../../../notes/architecture/interaction-design.md)

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

## 测试设计

- 每个中间 batch 的 visible content、geometry、hit-test、event target 与 materialization snapshot 一致。
- 完成后的 SVG DOM / Canvas pixels、resources 与完整 atomic render 可观察等价。
- Supersede、batch throw、resource failure、dispose 和 rollback 后不残留 candidate identity、index 或引用计数。
- unsupported capability、auto decision、requireProgressive 与 SSR/export 强制 atomic 具有稳定诊断。
- React / Vanilla、SVG / Canvas 对 semantic revision 与 materialization revision 使用同一契约。

详细矩阵见 ignored `notes/plans/kernel-v0.5-performance/TEST_CONTRACT_ALPHA3_ADR_02.md`。

## 公开影响

- `@retikz/render` 新增 materialization strategy、state、batch scheduler hook 与 renderer capability。
- React / Vanilla view 可分别配置 initial / update 策略并订阅 materialization state。
- hit-test、geometry 与 hydration event result 增加 view revision context；不把 materialization 字段写入 Scene。
- 默认 atomic，不改变 SSR、导出、截图或现有完整 render 入口的可见语义。

## 能力完备性检查

- 所属能力域与能力面：Drawing 的 Primitive/Scene、Interaction Readiness 与运行表现层。
- 解决的问题：在不部分提交 Scene 的前提下分批物化完整结果，并保持可见与命中一致。
- 主责包与协作包：render 拥有 batch / retained view / indexes；runtime 调度 batch；Core 只提供完整 Scene/Patch；adapter 配置和订阅。
- 是否可由现有能力组合：alpha.2 retained renderer 可完整 patch，但没有独立 materialization state 与 rollback，需要扩展 Render，不应修改 Core transaction 原子性。
- 内部表达链路：complete Scene/Patch → renderer batch plan → materialization transaction → live view/index → complete or rollback。
- 外部扩展链路：第三方 renderer 通过同一 capability 声明 progressive；不支持时 atomic 合法且可诊断。
- define-registry：materialization 是 renderer instance 的闭合执行能力，不按名称解析，不新增 registry；renderer implementation 仍通过 alpha.2 `RetainedRenderer` interface 注入。
- 下游执行 / adapter 等价性：React/Vanilla 共享 state；SVG/Canvas 各自派生 batch，但完成结果与 atomic oracle 等价。
- 不支持边界与诊断：未物化 target 不可交互；fallback/rollback/首批/完成时间可 trace；本轮不定义领域 behavior。

## 不在本 ADR 范围

- document、contribution 或 Scene 的部分 semantic commit。
- LLM draft batch、generation checkpoint 或模型 token。
- pointer / keyboard / focus / selection / drag / zoom behavior 与持久 intent。
- 跨页面 retained cache、WebGL streaming、远端 renderer 或视频编码。

---

## 实现契约

### Level

`red`：扩展公共 renderer、hit-test 与 adapter view contract，并引入新的 revision 维度。

### Schema 改动

无 IR / Scene schema 改动。MaterializationSnapshot 与 PresentationBatch 都是运行时派生 contract。

### 文件 scope

- `packages/kernel/render/src/runtime/materialization/**`
- `packages/kernel/render/src/{svg,canvas}/**`
- `packages/kernel/render/src/{hit-test,geometry}/**`
- `packages/kernel/render/src/index.ts`
- `packages/kernel/react/src/{kernel/runtime,render}/**`
- `packages/kernel/vanilla/src/runtime/**`
- `packages/kernel/{render,react,vanilla}/tests/**materialization**`
- `apps/docs/src/modules/docs/contents/kernel/packages/{render,react,vanilla}/**`

### 测试象限

**Happy path**：initial progressive；update progressive；atomic；auto；多 batch 完成。

**边界**：空 Scene；单 batch；unknown total；resource-only change；unchanged patch；materialization revision 上界前一值。

**错误路径**：batch throw；resource failure；unsupported + require；supersede；dispose；rollback failure 后 replace。

**交互**：可见/命中同步；事件 revision context；SVG/Canvas 完成等价；React/Vanilla state parity；动画与 patch 同步。

### 依赖的现有元素

- alpha.2 `RetainedRenderer` / Scene Patch / replace fallback——完整真源、增量输入与恢复路径。
- `hitTest()`、geometry query、hydration target——必须纳入同一 materialization transaction。
- ADR-01 scheduler——按预算调度 batch 与取消过期 candidate。
- performance benchmark——记录 first visible、complete、rollback、fallback 与最长 batch 阻塞。
