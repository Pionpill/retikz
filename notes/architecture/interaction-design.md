# 交互与增量运行时设计

> **状态：架构总则，运行时基础已部分实现，Headless Interaction 尚未实现。** `@retikz/runtime` 已承接 identity、ownership、program 与 transaction 基础；事件、behavior、presentation、intent 和交互 program 仍由后续 ADR 冻结。本文只维护统一方向、跨包契约和职责边界，不替代当前公开类型。
>
> 关联：[`性能与增量运行时设计`](./performance-design.md) · [`能力完备性与模块边界`](./capability-design.md) · [`包拓扑`](./package-topology.md) · [`Core 绘图完备设计`](../../packages/kernel/_notes/architecture/core-drawing-complete.md) · [`Kernel v0.5 路线`](../../packages/kernel/_notes/decisions/v0/v0.5/roadmap.md)
>
> 本文主责事件、ownership routing、behavior、presentation、intent 与动画；Snapshot / ChangeSet、逐 Tier 增量、调度、retained patch、渐进物化、LLM generation 以及共享运行时基础以性能设计为准。本文只补充这些基础契约在交互侧的消费约束，不建立第二份真源。

---

## 1. 定位

retikz 当前以一次性 `IR → Scene → Renderer` 为主。这个模型适合静态绘图、SSR 和导出，但无法直接支撑大规模局部更新、高频交互、动画与可中断计算。

v0.5 不应分别建设“性能系统”和“交互系统”，而应先建立一套共同的增量运行时：

- 性能重构负责稳定身份、变化传播、增量编译和 retained rendering。
- 交互能力复用同一套身份、事务、Scene 与 renderer，不另建平行状态和渲染语义。
- Plot、Table 等 Tier 2 模块通过统一契约接入，而不是在进入 Core 前完整重算。

本文借鉴 tldraw 的事务化状态、Vega 的显式 dataflow 和 PixiJS 的 retained rendering，但保留 retikz 的 JSON IR、Definition、Tier 2 lowering 与 renderer-agnostic Scene。

## 2. 设计目标

统一运行时需要满足：

1. Core、Data、Plot、Table 等模块各自拥有领域语义，同时使用统一的增量协议。
2. React、Vanilla、SVG、Canvas 共享同一套运行语义。
3. 增量执行与完整 snapshot 执行结果等价。
4. 增量计算可以并发或取消，正式状态始终原子提交。
5. 交互、图元变换和动画不受静态编译模型限制。
6. 内置模块与第三方扩展使用相同契约。

本文不冻结：

- 具体 TypeScript 类型、字段名和 Patch 操作集合。
- scheduler 优先级、Worker、时间片与缓存算法。
- SVG / Canvas 的局部更新实现。
- Plot、Table 的具体失效算法与交互语义。
- 事件列表、手势状态机和动画插值算法。
- 最终包名与公开 API。

## 3. 总体设计

统一链路分为四类状态：

```text
Domain Snapshot
  → Incremental Program
  → Core Contribution
  → Core Compiler
  → Scene
  → Retained Renderer
```

运行时在这条链路之外统一协调 revision、transaction、调度和提交：

```text
Domain Change
  → Runtime Transaction
  → prepare affected programs
  → validate candidate result
  → atomic commit
```

交互从 renderer 反向返回领域 owner：

```text
Renderer Event
  → normalized event and ownership
  → behavior
  → transient presentation or domain intent
  → optional domain transaction
```

这三条链路共享 identity、revision 和 ownership，不允许各模块建立互不兼容的更新机制。

## 4. 统一基础契约

以下是跨包必须共享的概念契约。名称只代表角色，不在本文冻结 API。

### Snapshot

每个领域保留完整、可重建的真源：

- Core 拥有 Core IR document。
- Data 拥有 dataset。
- Plot、Table 等 Tier 2 拥有各自 spec 或 semantic model。
- Scene 是 Core 编译后的完整渲染产物。

不同领域的 snapshot 不合并成万能 schema。Signal、store、cache 和 renderer 对象都不是持久化真源。

### Identity

可增量、可引用或可交互的实体必须具有跨更新稳定的 identity。局部 `id` 在声明作用域内稳定；跨 owner 公共寻址使用带 owner、namespace 或 identity path 的限定 identity。领域实体、Core contribution、Scene primitive 与交互 target 可以是不同层级的身份，但必须能通过 ownership 关系相互定位。

一个限定 identity 必须唯一解析到一个语义 owner，但可以映射到多个 Scene primitive。稳定 identity 是增量渲染、命中、动画、history、AI patch 和 Tier 2 组合的共同基础，不能依赖数组下标或临时对象引用。

### Change 与 Patch

Change 描述领域输入变化，Patch 描述两个稳定 snapshot 之间的执行增量。跨包传播至少要能表达实体的增加、修改、删除和顺序变化，并携带 revision。

每个被接受的 Change 都必须在候选 transaction 内确定性地产生下一份完整 owner snapshot；Patch 只由前后 snapshot 派生。Patch 不是新的 IR，也不是新的 Scene 真源。任何增量缓存都必须能够丢弃并从完整 snapshot 重建。

### Incremental Program

Data、Plot、Table、Core 和未来 Tier 2 都以 program 形式参与运行时。program 必须支持从完整输入生成完整输出，并可以选择支持从 change 生成 patch。

模块 owner 决定领域依赖和最小失效范围。未实现增量能力或无法证明局部等价时，必须回退到该 program 的完整重算；回退只影响性能，不改变结果。

### Runtime Transaction

跨领域变化由 framework-neutral runtime 统一协调。一次 transaction 可以触发多个 program，但对外只暴露完整、已提交的状态。

运行时采用“并发准备、串行原子提交”：

- 纯计算可以并发、取消或放入 Worker。
- 运行时负责拒绝过期结果。
- document、contribution、Scene、provenance 与索引作为同一 semantic revision 原子提交。
- 任一阶段失败时继续暴露旧状态。

原子呈现模式下，完整 view 与 semantic revision 一次切换；显式启用的渐进模式允许表现层独立推进 materialization state，但不构成 document、contribution 或 Scene 的部分提交。

### Contribution

Tier 2 统一向 Core 输出带稳定身份与 ownership 的 Core IR contribution，不直接输出 Scene、SVG、Canvas 或 renderer 命令。

Contribution 必须允许组合子 program，使 Table Cell 内嵌 Plot 等场景能够保留父子 ownership、布局和生命周期。父模块只依赖通用组合契约，不识别子模块的具体类型。

### Presentation

持久化 Scene 与逐帧 presentation state 分离：

- Scene 表达已提交的稳定渲染结果。
- hover、drag preview、camera、animation 和 overlay 属于瞬时 presentation。

renderer 必须基于同一 presentation 状态完成显示、命中和交互几何查询，避免画面与命中位置不一致。高频 presentation 更新不要求逐帧修改 IR 或重新执行完整 lowering。

渐进物化时，画面、geometry、hit-test、事件 target 与 presentation index 还必须共享同一 materialization state；未物化实体不能命中。候选 materialization 在 semantic commit 前只能驱动瞬时反馈，持久 intent 必须等待对应 owner snapshot 提交或重新校验。具体策略、开关和 fallback 由性能设计及 renderer ADR 负责。

## 5. Signal 的位置

Signal 可以作为包内实现增量状态、派生缓存和细粒度订阅的基础原语，但不是跨包协议。

跨包边界必须传播显式的 Change、Patch、revision、identity 与 ownership，而不能只依赖隐式属性读取形成依赖。这样才能：

- 检查和诊断依赖关系。
- 执行批处理、取消、并发和回退。
- 跨 Worker、SSR、React、Vanilla 与 renderer 传递变化。
- 保持 JSON IR 和 Scene 的可序列化边界。

Signal 解决“值如何响应变化”，dataflow 解决“变化沿哪些领域依赖传播”。两者可以协作，但不能互相替代。

## 6. 包职责

### `@retikz/runtime` 基础契约

`@retikz/runtime` 提供 framework-neutral 的 identity、revision、change、program、transaction、contribution 和 ownership 契约。基础契约不理解 Plot、Table、DOM、React 或具体 renderer。

### `@retikz/core`

- 拥有 Core IR、Core contribution 与 Core 编译语义。
- 维护 Core 领域依赖并产生 Scene snapshot / patch。
- 提供通用图形能力、manifest 与 ownership 基础。
- 不拥有 Plot、Table 或 renderer 的领域依赖。

### `@retikz/runtime`

- 协调宿主通过通用契约注入的 Data、Tier 2、Core、Render 与 Interaction program，不静态识别或依赖具体 Tier 2。
- 统一 transaction、调度、revision、提交和生命周期。
- 只协调 program，不接管各模块的领域语义。

Tier 2 与宿主 adapter 负责装配自己的 program；`@retikz/runtime` 是领域中立基础契约与协调机制的 owner，位于各方都能单向消费的位置。Core、Render、Tier 2 和 adapter 只拥有各自 program 与装配逻辑，不重复定义 transaction、revision 或 ownership。

### `@retikz/render`

- 消费 Scene snapshot / patch。
- 拥有 SVG / Canvas retained view、资源、空间索引与命中。
- 执行 presentation、overlay 和动画的后端更新。
- 向上提供统一事件源、坐标与 renderer capability。

### `@retikz/react` / `@retikz/vanilla`

- 提供 authoring 与宿主接线。
- 创建、持有和订阅 runtime session。
- 把框架状态映射为领域 transaction，把已提交结果映射回视图。
- 不拥有增量编译、Tier 2 依赖或交互语义。

### `@retikz/data`

- 拥有 dataset、transform 与数据依赖。
- 输出完整数据结果或增量 Data Pulse。
- 不理解 Plot、Table、Core 或 renderer。

### `@retikz/plot`、`@retikz/table` 与其它 Tier 2

- 拥有自身 spec、领域依赖、布局、manifest 和交互 intent。
- 消费领域 change 或 Data Pulse。
- 统一输出 Core contribution snapshot / patch。
- 通过通用 child program 契约组合其它 Tier 2。
- 不绕过 Core 直接生成 Scene 或 renderer 命令。

### Interaction

- 拥有 framework-neutral 的事件归一化、behavior、瞬时状态、intent 与动画编排。
- 通过 ownership 把事件路由给 Core 或 Tier 2 owner。
- 通过 presentation 提供即时反馈，通过 domain transaction 提交持久化结果。
- 不拥有 Plot、Table 或业务编辑器的领域策略。

## 7. 增量、并发与交互的关系

三者不是互斥机制：

- 增量决定哪些 program 和实体需要重新计算。
- 并发决定这些计算何时、以何种资源执行。
- transaction 决定哪些结果可以作为一个一致状态提交。
- presentation 负责不进入持久化编译链路的逐帧反馈。

因此增量渲染不会与 concurrent 冲突。并发任务只能生成候选结果，正式状态仍由 runtime 串行提交。交互也不被增量模型限制：低频语义变化进入 transaction，高频视觉变化进入 presentation。

## 8. 交互能力边界

统一运行时应能承载：

- 基础 pointer、keyboard、focus 与 viewport 事件。
- hover、selection、drag、resize、brush、zoom 等 behavior。
- Core 图元与 Tier 2 领域对象的统一命中和 ownership 路由。
- transform、camera、overlay 与 renderer-neutral 属性动画。
- 动画过程中的重定向，以及交互完成后的持久化提交。

Kernel 只提供通用表达与执行通道。Plot brush、Table Cell 编辑、Graph 节点连接等语义仍由各领域模块定义，因此上层能力不会被 Kernel 固定为一组内置交互白名单。

## 9. 正确性不变量

所有后续 ADR 和实现必须保持：

1. **Snapshot 是完整事实**：Patch 只影响执行效率。
2. **增量与全量等价**：同一最终输入产生可观察等价的输出。
3. **语义提交原子**：外部只能观察一致 revision 的 document、contribution、Scene、provenance 与索引；渐进 view 通过独立 materialization state 明确表达完成度。
4. **过期结果不可提交**：取消是优化，revision 校验是正确性边界。
5. **领域 owner 决定依赖**：Runtime 不猜测 Plot、Table 或 Core 的失效范围。
6. **展示与命中一致**：同一 presentation 和 materialization state 下的画面、几何、空间索引与事件 target 一致。
7. **跨入口一致**：React / Vanilla、SVG / Canvas 共享语义，差异通过 capability 明确表达。
8. **扩展与内置一致**：自定义 Definition 和 Tier 2 使用同一 program、fallback 与 diagnostics 契约。
9. **包依赖保持单向**：Core 不反向依赖 Tier 2，renderer 不拥有领域语义，adapter 不建立平行 runtime。

## 10. 迭代与 ADR 分工

v0.5 先完成性能底座，再建设交互能力，但性能 ADR 必须用真实交互场景验证其边界。

建议按以下方向拆分 ADR：

1. Kernel identity、revision、change 与 program 基础契约。
2. Runtime transaction、调度、并发与原子提交。
3. Core contribution、依赖图与 Scene patch。
4. SVG / Canvas retained renderer 与 presentation。
5. Data Pulse 与 Plot / Table incremental program。
6. Event、ownership、behavior 与 domain intent。
7. Transform、overlay、animation 与冲突策略。

每个 ADR 只冻结所属模块负责的 schema、API、算法、fallback、测试契约和性能预算，不重复发明本文已经确定的跨包模型。

## 11. 不在范围

- 在本文中确定具体 API 或实现文件。
- 规定所有模块使用同一种内部 Signal 库。
- 把 Signal、handler、store 或 runtime 对象写入 JSON IR。
- 让 Tier 2 绕过 Core 建立平行 Scene。
- 把交互语义集中到 Kernel 内置白名单。
- 为现有 `0.x` API 保留兼容桥接。
- 完整 Workspace、history、协作或 CRDT 设计。
