# 性能与增量运行时设计

> **状态：架构总则，基础契约已部分实现。** `@retikz/runtime` 已承接 identity、owner / program registry、同步 transaction、revision 与 trace，Core 已建立受限 incremental program；跨 Tier 增量、cooperative scheduler、retained patch、渐进物化与 generation 仍由后续 ADR 冻结。本文只维护统一方向、跨包契约和验收口径，不替代当前公开类型。
>
> 关联：[`交互与增量运行时设计`](./interaction-design.md) · [`能力完备性与模块边界`](./capability-design.md) · [`Kernel v0.5 路线`](../../packages/kernel/_notes/decisions/v0/v0.5/roadmap.md)
>
> 本文主责 Snapshot / ChangeSet、逐 Tier 增量、调度、retained patch、渐进物化和 LLM generation，也是 identity、revision、transaction 与 ownership 等共享运行时基础的总则；事件、behavior、intent、动画与交互 presentation 以交互设计为准。

---

## 1. 定位

retikz 的多 Tier lowering、renderer-agnostic Scene 与可序列化 IR 带来表达力和扩展性，也增加了全量更新路径的固定成本。v0.5 不以极限大数据吞吐为主要目标，而以“中等规模图形持续更新时仍然流畅”为性能定位：

- 用 Diff、缓存和局部失效减少无效工作。
- 用 retained renderer 和 Scene Patch 降低提交成本。
- 用可取消、可让出的 prepare 控制主线程占用。
- 让交互优先于后台计算，让复杂更新尽快提供有效反馈。
- 支持 LLM 以多个合法批次渐进生成，而不要求一次产出完整图形。

首次全量渲染和极限吞吐是不得明显退化的护栏，不是牺牲架构边界追逐的单一指标。

## 2. 三个正交维度

性能系统必须区分三个问题：

1. **增量计算**决定哪些工作不必执行。
2. **并发调度**决定剩余工作何时执行、何时让出或取消。
3. **渐进呈现**决定哪些完整结果可以分批向用户显示。

三者共享 transaction、revision、identity 和 ownership，但不能互相替代。只加入时间片不会减少全量 lowering；只做 Scene Diff 也无法避免上游 Tier 重算；渐进显示更不能掩盖不一致的中间状态。

## 3. 统一运行链路

```text
Snapshot / ChangeSet
  → Runtime Transaction
  → Tier Programs
  → Core Contributions
  → Core Compiler
  → Scene Snapshot / Patch
  → Retained Renderer
```

Runtime 在链路之外统一管理 session、revision、调度、取消和提交。各领域只解释自己拥有的依赖与变化，不建立理解所有 Tier 语义的万能 Diff 引擎。

### Snapshot 与 ChangeSet

- Snapshot 是完整事实、通用入口和正确性回退。
- ChangeSet 是 Data、Plot、Table、交互与 LLM 的快速路径。
- Runtime 把两者规范化为同一种有版本 transaction。
- 每个被接受的 ChangeSet 都必须在候选 transaction 内确定性地产生下一份完整 owner Snapshot；下游 Patch 是前后 Snapshot 之间的派生产物。
- 无法证明局部等价时，program 必须回退到所属失效边界的完整重算。

Commit 时，owner Snapshot、program 输出、provenance 和索引一起切换。Patch 只优化执行，不成为第二份 IR、Scene 或领域真源。任何缓存和索引都必须允许丢弃后从 Snapshot 重建。

## 4. Identity、Key 与定位

稳定身份是 Diff、交互、history、动画与 LLM Patch 的共同基础，但 `id` 与 `key` 角色不同：

- `id` 是声明作用域内稳定的局部身份，用于 ownership、事件、Patch 和查询。
- `key` 是领域集合内部匹配新旧成员的规则，由集合 owner 决定。
- 已有稳定 `id` 的集合可以直接以 `id` 作为 key。
- 没有稳定身份时只能使用结构比较或扩大失效范围；数组下标不是 reorder 场景的可靠身份。

跨 owner 公共寻址必须使用包含 owner、namespace 或 identity path 的限定 identity；一个限定 identity 唯一解析到一个语义 owner，但可以映射到多个 Scene primitive。具体字段形态由 identity ADR 冻结。

每个 Tier 维护自己拥有的索引，并通过 ownership 关联：

```text
Domain identity
  → Core contribution identities
  → Scene semantic identities
  → Renderer objects
```

同一个语义 `id` 可以下沉为多个 Scene primitive，因此公共索引不能简化成 `id → mutable object`。按 id 发起的持久更新必须路由给领域 owner，再通过 transaction 修改 Snapshot；只有 hover、drag preview、动画等瞬时 presentation 可以直接作用于 retained view。

## 5. 每个 Tier 负责自己的增量

Data、Plot、Table、Core 和未来 Tier 2 都以 incremental program 参与运行时。每个 program 负责：

- 从完整输入生成完整输出。
- 识别自己拥有的依赖与最小失效边界。
- 在支持时从 ChangeSet 生成下游 Patch。
- 保留输入身份到输出身份的 provenance。
- 在局部处理不安全时声明 fallback。

因此 Diff 逐层传播，而不是等所有 lowering 完成后只比较最终 Scene：

```text
Data Pulse
  → Plot mark changes
  → Core contribution changes
  → Scene changes
  → Renderer patches
```

Compile cache、索引、候选结果和 retained state 都属于显式 runtime session，不使用模块全局或时间相关缓存。候选 session 只有在 revision 校验通过并成功提交后才能成为当前状态。

## 6. 并发准备与原子提交

React Concurrent Rendering 不会自动中断普通 JavaScript lowering。Kernel 需要 framework-neutral 的 cooperative scheduler；React 和 Vanilla 只负责宿主接线。

Program 可以声明三类执行能力：

- **blocking**：必须一次完成的短任务。
- **chunkable**：可保存进度并按预算主动让出。
- **offloadable**：纯计算且可序列化，可交给 Worker 等执行环境。

未声明能力的内置或第三方 program 默认按 blocking 执行，保证扩展可以渐进接入。

跨包只使用有限的语义优先级：

1. `immediate`：pointer feedback、drag preview、取消。
2. `interactive`：用户明确触发的领域更新。
3. `visible`：当前视图编译与 LLM 可见批次。
4. `background`：预计算、缓存与非当前视图任务。

Tier 2 不使用任意数字争抢资源。Runtime 根据宿主、设备和当前帧动态映射实际预算。高优先级任务在下一个 cooperative boundary 抢占低优先级 prepare；主线程 blocking program 不能被中途打断，默认 blocking 只保证兼容与正确性，不承诺帧延迟。同一 session 的新 revision 可以废弃旧候选结果；commit 前的 revision 校验仍是拒绝过期结果的正确性边界。

## 7. Retained Renderer 与可选渐进呈现

SVG、Canvas 与未来 renderer 共享 Scene Patch 语义，但各自拥有 retained structure、资源缓存、空间索引和局部提交策略。无法安全 patch 时，可以扩大到 render group、layer 或完整 redraw，fallback 只影响性能。

**可增量计算不等于必须渐进显示。** 表现层必须提供可选择的呈现策略，以适应不同场景：

- **原子呈现**：完整结果准备并物化后一次显示，适合 SSR、导出、截图、严格一致性视图以及不希望出现搭建过程的场景。
- **渐进呈现**：首屏或大型更新按合法 presentation batch 显示，适合交互式浏览和强调尽快反馈的场景。

首屏与后续更新是否渐进应允许分别选择。Program 仍只产出完整 Scene；渐进策略只有在调用方启用且 renderer / Scene 边界声明支持时生效，否则回退到原子呈现并提供可观察诊断；具体开关、默认值、诊断和 `auto` 策略由 runtime / renderer ADR 冻结。

逻辑 transaction 的 semantic revision 仍然原子提交。渐进模式可以在最终 semantic commit 前显示可回滚的候选 presentation batch，也可以在 commit 后继续物化同一 Scene；这些 batch 都不构成 document、contribution 或 Scene 的部分提交。

表现层独立维护 materialization state。每个可见 batch 都必须让画面、geometry、hit-test、事件 target 与 presentation index 基于同一 materialization state，并暴露尚未完成的状态；未物化实体不得命中。候选 batch 在 semantic commit 前只能产生瞬时反馈，持久 intent 必须等待对应 owner Snapshot 提交或重新校验。原子模式仍保证 semantic revision 与完整 view 一次切换，渐进模式则是显式启用、可诊断、可回滚的表现层例外。

LLM 的多批 draft transaction 与 renderer 的渐进物化是两种不同机制：前者逐批增加或修正语义内容，后者只改变同一语义结果的显示节奏。

## 8. LLM 渐进生成

LLM 默认在 generation session 中提交多个可见 draft transaction，例如：

```text
scale / coordinate / guide
  → marks / series
  → labels / annotations / details
```

每批必须是语义合法但可以不完整的结果，使用稳定 identity 的 upsert、remove、move 等领域操作，不以数组下标 JSON Patch 作为主要协议。批次可见、可恢复、可取消，但不进入正式 undo history；用户接受后再 squash 为一次正式文档 transaction。

Generation log 可以保留批次 ChangeSet、基础 revision 和恢复 checkpoint，用于诊断与恢复，但不成为普通文档历史。

## 9. 包职责

- **`@retikz/runtime` 基础契约**：identity、revision、ChangeSet、program、transaction、ownership 与执行 capability。
- **`@retikz/core`**：Core IR / contribution 的增量编译语义，输出 Scene Snapshot / Patch。
- **`@retikz/runtime`**：session、调度、取消、revision 校验和原子提交；只协调通过通用契约注入的 program，不静态识别或依赖 Data、Plot、Table。当前同步 transaction、owner / program registry 与 trace 已落地，后续 cooperative scheduler 在同一包内扩展。
- **`@retikz/render`**：Scene Patch、retained view、空间索引、命中与 presentation materialization。
- **`@retikz/react` / `@retikz/vanilla`**：创建并持有 runtime session，接入宿主调度与生命周期。
- **Data、Plot、Table 等 Tier 2**：领域 key、依赖、ChangeSet、增量 lowering 和 provenance。

Signal 可以作为包内脏标记、派生缓存和细粒度订阅的实现工具，但跨包仍传播显式 ChangeSet、Patch、revision、identity 与 ownership。

## 10. 性能验收

v0.5 的主性能门槛是中等规模持续更新中的帧延迟与无效工作量。基准至少覆盖：

- 首次完整渲染。
- 单属性和单实体几何修改。
- 数据增删、修改与 reorder。
- 局部变化触发全局 layout 的 fallback。
- 连续 drag / zoom 和快速 revision 替换。
- LLM 分批 draft generation。
- Tier 2 嵌套与跨 owner 失效。
- 原子呈现与渐进呈现两种策略。

每个场景同时观察首次延迟、更新延迟、最长主线程阻塞、访问实体数量、cache / patch 命中、取消浪费、commit 成本和 session 内存。具体规模、设备、预算与目标数值由各迭代 ADR 基于 baseline 冻结。

## 11. 迭代顺序与 ADR 分工

建议按以下顺序推进：

1. 测量、tracing 与基准场景。
2. Session、revision、identity 与 ownership。
3. Snapshot Diff、bailout 与局部失效。
4. 各 Tier incremental program 与 provenance。
5. Scene Patch 与 retained renderer。
6. Cooperative scheduler、取消与帧预算。
7. LLM generation session。
8. 在同一底座上建设 interaction。

先减少工作，再调度剩余工作；Scene Patch 与 retained renderer 必须形成闭环，不能只优化 compile 后仍完整重建表现层。

各包 ADR 负责冻结所属模块的 schema、API、算法、预算、fallback、测试契约与 capability；不得重复定义本文已统一的 Snapshot / ChangeSet、identity、transaction、调度与呈现边界。

## 12. 正确性不变量

1. Snapshot 是完整事实，增量结果与完整重建可观察等价。
2. ChangeSet 必须闭合为下一份完整 owner Snapshot，Patch 只由前后 Snapshot 派生。
3. 领域 owner 决定依赖、key 和最小失效范围。
4. 过期 revision、失败候选和部分 prepare 结果不可提交。
5. 缓存、Signal、Patch 和 renderer state 都不是持久化真源。
6. 持久更新必须回到 owner，presentation 不绕过领域语义修改文档。
7. 渐进呈现必须显式启用、可回退，并保持同一 materialization state 下可见内容与命中一致。
8. React / Vanilla、SVG / Canvas 共享运行语义，差异通过 capability 表达。
9. 内置与第三方 program 使用相同的增量、调度、fallback 和 diagnostics 契约。
