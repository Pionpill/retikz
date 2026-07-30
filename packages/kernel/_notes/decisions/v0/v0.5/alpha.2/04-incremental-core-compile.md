# ADR-04：Core Runtime Program 与安全增量编译

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-28
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-03](./03-program-transaction-lifecycle.md) · [ADR-05](./05-scene-patch-retained-renderer.md) · [性能与增量运行时设计](../../../../../../../notes/architecture/performance-design.md)

## 背景

`compileToScene()` 是无状态完整编译入口。调用方持续更新完整 IR Scene 时，Core 过去只能重新创建编译上下文并遍历全部 child；Runtime 也没有 Core 领域知识，不能代替 Core 判断 Node、Scope、Path、Composite、资源或引用的安全失效边界。

alpha.2 需要先把完整编译接入 Runtime transaction，冻结 Snapshot、identity、Patch 与 fallback 的公共边界，并交付至少一个可证明与完整编译等价的真实局部更新路径。无法证明安全的变化必须继续完整编译，fallback 只影响性能，不改变结果。

## 决策

### 完整编译保持真源

`compileToScene()` 保持纯函数和无 session 的完整入口。`createCoreProgram(options)` 复用同一个内部完整编译器，把 Core Scene 接入 `@retikz/runtime` Program：

- initial revision 执行完整编译，产生完整 `CompileResult` 与 `SceneRuntimeSnapshot`
- update 始终接收完整 next IR Snapshot
- 局部路径无法证明等价时执行 full fallback，并以唯一 `replaceScene` operation 发布 Patch
- Runtime 只协调 revision、candidate 隔离和原子发布，不解释 Core IR 或 Scene

Program 生命周期内的 options、registry array 与 Definition record 在创建时复制并固定；callback reference 保持不变。要改变 measurer、lowerer、provider 或其闭包状态，调用方必须重建 Program 和 Session。

### 公共 Runtime 表面

Core 公开：

- `CORE_OWNER_KEY` 与 `CORE_PROGRAM_ID`
- `CoreOwnerDefinition`
- `createCoreProgram(options)`
- `CoreChange` 的 `add`、`update`、`remove`、`move` change hint
- `CoreProgramOptions`、`CoreProgramOutput`、`CoreProgramPublicRead` 与 `CoreProgramDefinition`

public read 固定包含：

- `output`：完整 `CompileResult` 与 canonical compile warnings
- `snapshot`：当前 revision 的完整 Runtime Scene 与 topology
- `patch`：相对 base revision 的原子 Scene Patch；initial full run 不提供

source Snapshot、stable identity index 和复用状态只存在于同一 Core Program 的 private read，不进入公共查询契约。Core IR 与持久 Scene schema 不新增字段。

### Snapshot identity 与 ChangeSet 校验

Core owner 对 JSON-safe IR 做结构复制、冻结和相等比较。Program 根据完整 previous / next Snapshot 建立 conservative stable identity index：

- document root path 固定为 `['root']`
- 同一稳定 parent 下唯一非空 `id` 的普通 child 使用 `[type, id]`
- 唯一 `id` Scope 建立递归 parent boundary；跨 Scope 移动形成 remove + add
- anonymous、duplicate 与 Composite output 不获得跨 revision stable identity
- `localNamespace` 只改变引用 frame，不改变 stable identity path

ChangeSet 是可选加速提示，不是真源。提供 hint 时，Core 会用完整前后 Snapshot 校验 identity、字段变化、parent、before 与最小 reorder；漏报、多报、unknown kind、anonymous/duplicate identity 或无法重建 next order 都视为 mismatch，并完整 fallback。

`CORE_CHANGESET_MISMATCH` 只作为 Runtime diagnostic 在 fallback 成功 commit 后发布一次，不进入 Core compile warnings 或 `onWarn`。fallback 失败时不发布 diagnostic、不推进 revision，也不替换已提交 artifact。

### 已接受的局部增量边界

alpha.2 ADR-04 接受一个保守但完整的安全子集：

- root children 全部是 unique-id Node
- Node 使用绝对 tuple position
- root 字段、child 结构与顺序不变
- 恰好一个 Node 只改变无资源的 string `fill`
- 没有自定义 shape、resource、artifact 或 compile warning

Core 只重新编译该 Node，复用其余 committed root contribution，以 emitted-subtree `update` operation 发布 Patch，并保持完整 result、snapshot、topology 与 fresh `compileToScene()` 可观察等价。

引用、资源、自定义 shape、Scope、Path、Composite、多 owner 变化或其它不满足上述证明条件的场景继续 full fallback。Accepted 不表示已经交付通用 contribution tree、依赖传播或任意 IRChild 的最小局部失效。

### Warning 与 trace

Core Program 在 candidate 内收集 compile warnings，只在成功 commit 后按 canonical 顺序通过 `observeCommit` 派发。bailout、失败、stale 与 rollback 不派发；直接 `compileToScene()` 也只在完整成功后派发。

Program trace 使用固定的 `update/ir-child` 与 `update/scene-change`：

- initial full run 报告 `full`，不产生 Patch trace
- 安全局部更新报告 `incremental`，并记录 reused / changed child 与 Patch operation 数
- full fallback 报告 `fallback`，Scene Patch 只含一个 `replaceScene`

## 被否决的方案

### 让 Runtime 推断 Core Diff

否决。Runtime 不拥有 Node、Scope、引用、资源或 Composite 语义，领域失效必须由 Core 决定。

### 只比较最终 Scene

否决。它可以减少 renderer commit，却不能形成 Core Program、稳定 identity、ChangeSet 校验或编译期复用边界。

### 未证明安全时继续局部拼装

否决。资源 id、warning 顺序、artifact locator、namespace 和引用依赖都可能使局部结果偏离完整编译；无法证明时必须 fallback。

### 在本 ADR 内承诺通用 contribution engine

否决作为本次 Accepted 边界。现有实现只对单 root Node fill 更新形成了完整等价证据；Path、Scope、资源、artifact、diagnostic 与 Tier 2 嵌套需要新的测试矩阵和独立收口，不能由设计草案代替交付事实。

## 最终实现

- Core owner 与 Program 接入 Runtime typed registry、Snapshot 和 transaction
- 完整编译与 Program full run 共用 `compileCoreSnapshot()`
- canonical Runtime topology 为 Scene primitive 建立 semantic owner 与稳定 emission identity
- stable root / nested Scope Diff 校验 add、update、remove 与最小 move
- Program option、registry 与 Definition 输入在创建时隔离
- full fallback 产生完整 Snapshot 和独占 `replaceScene` Patch
- 单 root Node fill 变化使用 committed Scene 作为安全 contribution cache，产生局部 `update` Patch
- public artifact、warning、Runtime diagnostic 与 trace 通道保持分离
- Core 中英文运行时文档说明完整入口、public artifact、identity、ChangeSet、局部子集与 fallback

## 验证

2026-07-28 对 `packages/kernel/core/tests/compile/incremental` 执行定向 Vitest：

- 4 个测试文件、58 项测试通过
- 覆盖 full oracle、public types、options 隔离、warning/失败隔离、canonical topology、stable/nested Diff、ChangeSet mismatch、full fallback 与单 Node fill 局部更新
- 局部更新测试同时比较 fresh `compileToScene()`，并锁定 trace 与 Patch operation
- 引用 position 与可读取 fill 的自定义 ShapeDefinition 明确保守 fallback

最终收口使用 Node 24.18.0，完成相关 Markdown / TypeScript 格式检查、Core 与 docs 类型检查、Core 增量定向测试及 changelog 数据测试。

## 公开影响与兼容性

本 ADR 新增 Core Runtime Program 公共入口，并消费 ADR-05 定义的 readonly Scene Patch DTO；Core IR 与持久 Scene schema 不变。`compileToScene()` 继续可独立使用；调用方无需提供 ChangeSet，也不需要根据 full / incremental / fallback 切换消费协议。

这是 `0.x` 新能力，不提供旧写法别名。React / Vanilla session 接线与 retained SVG / Canvas commit 由 ADR-05 承接。

## 遗留风险与后续

- 通用 contribution tree、依赖传播、资源重排、artifact / warning locator rebasing尚未交付
- Node 文本/几何、Path target、Scope subtree、insert/remove/reorder 与 Tier 2 nested 仍完整 fallback
- 5,000 实体 deterministic budget 与真实持续更新收益由 alpha.2 后续性能批次补齐
- ADR-06 双轴 layout constraint 与 replay wrapper 完成后，layout-aware subtree 的增量失效需要独立证明
- ADR-05 仍需接通 retained SVG / Canvas participant 与 React / Vanilla session

这些遗留项不削弱已接受安全子集的正确性，但不得从本 ADR 推断为已经具备任意 IR 的通用局部编译。
