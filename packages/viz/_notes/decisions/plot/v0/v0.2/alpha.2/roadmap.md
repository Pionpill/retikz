# plot v0.2-alpha.2：性能优化

> milestone 执行路线。长期决策放同目录的 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.2 roadmap`](../roadmap.md) · [`plot v0.2-alpha.1 roadmap`](../alpha.1/roadmap.md) · [`性能与增量运行时设计`](../../../../../../../../notes/architecture/performance-design.md) · [`_template.md`](../../../../_template.md)
> ⚠️ 暂定：本 milestone 需等待 Kernel 提供并 Accepted 对应的同步原子增量能力后进入实现。

## 目标

在 alpha.1 映射契约稳定、Kernel 提供可消费的同步增量运行时后，降低 Plot 持续更新中的无效工作，同时保持完整重建与增量结果的可观察等价：

1. **消费 Kernel 通用能力**：使用 Kernel 的 identity、revision、transaction、incremental compile、Scene patch / retained renderer 等底层契约，不在 Plot 重复定义 Runtime、提交协议或 renderer 更新机制。
2. **建立 Plot 领域增量边界**：由 Plot 负责自身 spec、data view、mapping、scale、mark、guide、layout 和 provenance 的依赖关系，声明最小安全失效范围以及无法证明局部等价时的 fallback。
3. **贯通 Plot 更新链路**：让数据或 Plot 语义变化可以沿 `Snapshot / ChangeSet → Plot program → Core contribution → Scene` 传播，并保留 identity 到 mark / guide / locator 的追溯关系。
4. **优化共享工作**：在不改变公开语义的前提下，识别共享解析上下文、映射结果、scale / guide 依赖和分层物化中的可复用边界；具体缓存和 patch 形态由 ADR 冻结。
5. **响应 Chart 通用需求**：Chart 只有在实际迭代中提出可复用于 Plot 的性能或更新问题时，才作为候选能力插入本 milestone；Chart-specific recipe、presentation 和业务状态不进入 Plot。

## 前置

- **alpha.1**：Spatial Mapping 的 identity、provenance、确定性和 lowering 边界稳定。
- **Kernel**：至少提供并 Accepted `sync + atomic + incremental` 的 Runtime / Core / Scene 链路，以及 Plot 可以注入的 program / ownership contract。
- **data**：提供稳定的数据 snapshot、字段 identity、lineage 和 ChangeSet / data pulse 入口；Plot 不复制 Data 的通用 diff 或 transform 语义。
- **standard**：通用 layout / Legend 能力继续通过 Standard 消费；Plot 不因增量需求建立私有容器或 renderer 机制。

## ADR 清单

| ADR | 主题                                                                                                            | Level  | 依赖                                | 状态   |
| --- | --------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------- | ------ |
| 01  | **Plot incremental program**：Plot snapshot、program、owner、revision 与完整 / 增量输出边界                     | red    | Kernel Runtime、alpha.1             | 待规划 |
| 02  | **Plot dependency invalidation**：data、mapping、scale、mark、guide、layout 与 provenance 的依赖传播和 fallback | red    | ADR-01、Data ChangeSet              | 待规划 |
| 03  | **Plot incremental lowering observability**：增量与完整重建等价性、诊断、性能指标和 Chart 通用消费边界          | yellow | ADR-01 / ADR-02、Kernel Scene patch | 待规划 |

## 不在本 milestone 范围

- Kernel Runtime、transaction、scheduler、identity registry、Scene patch 或 retained renderer 的重新设计。
- cooperative concurrent、Worker、progressive materialization 和 generation session；这些属于 Kernel 其它 milestone。
- Plot 的交互语义、事件归一化、behavior、presentation 或 tooltip UI；这些进入 alpha.3 或上层 Chart / adapter。
- Chart-specific 性能旁路、业务 dashboard 状态和跨域联动。
- 为既有 `0.x` API 保留仅用于性能迁移的平行兼容路径。

## 退出条件

- Plot 有明确的领域 snapshot、owner、依赖和最小失效边界，并通过 Kernel 通用 program contract 接入。
- 增量路径与完整重建在合法输入下保持可观察等价；不安全局部更新可诊断并回退。
- identity、provenance、locator、Core contribution、Scene patch 和 retained renderer 的更新 revision 一致。
- React、Vanilla、SVG、Canvas 使用同一 Plot 更新语义；adapter / renderer 不建立平行更新协议。
- 至少有真实 Plot 更新闭环和可复现性能观测；Chart 需求只有在能抽象成 Plot 通用能力时才计入退出条件。

## 执行顺序

```text
Kernel sync / atomic / incremental Accepted
  → Plot program 与依赖边界
  → Plot incremental lowering / fallback
  → Scene patch / retained consumer 验证
```

具体实现顺序、文件 scope、测试矩阵和 benchmark 参数放入对应 ADR 确认后的 plan；本 roadmap 不提前冻结 cache、patch 或 API 字段。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../../../_template.md`](../../../../_template.md)。
