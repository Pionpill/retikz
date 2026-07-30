# Bench 与开发者性能实验室设计

> **状态：Proposed 架构总则。** `@retikz/bench` 已具备自动化 benchmark；可视化开发者工具尚未实现。首个 GUI 版本只服务当前 Kernel 已落地的性能能力。
>
> 关联：[`性能与增量运行时设计`](./performance-design.md) · [`交互与增量运行时设计`](./interaction-design.md) · [`能力完备性与模块边界`](./capability-design.md) · [`@retikz/bench`](../../apps/bench/README.md)
>
> 本文只确定长期方向、整体结构和功能边界。具体场景、数据结构、界面布局、文件组织与测试清单在后续 ADR 或 implementation plan 中设计。

---

## 1. 定位

retikz 的性能链路会逐步覆盖完整编译、增量执行、retained rendering、并发调度、渐进呈现和 LLM generation。只有纯命令行数据时，开发者能够判断门禁是否通过，却很难直观看到优化是否真的发生、影响了哪些图形以及不同策略的体验差异。

`@retikz/bench` 因此长期包含两个表面：

1. **自动化 Bench Harness**：提供可复现的正确性、确定性工作量和受控 timing 证据，服务 CI 与版本验收。
2. **Developer Performance Lab**：提供可操作、可观察的图形界面，服务本地理解、调试和方案比较。

二者共用场景与执行底座。GUI 不是另一套 demo，CLI 也不退化为 GUI 的脚本录制结果。

## 2. 核心原则

### 2.1 正确性先于性能

增量、fallback 和完整执行必须先与完整真源对账。输出错误时，本次性能数据只能用于诊断，不能成为优化收益。

### 2.2 观测不改变产品语义

Bench 通过产品包已有的 trace、diagnostics、Scene、Patch 和公开运行入口收集事实，不拥有领域失效规则，不修改产品结果，也不建立平行 IR 或渲染协议。

### 2.3 自动化与交互共享底座

同一场景应能被 CLI、无头浏览器和交互界面执行。场景、fixture、运行策略与结果口径只有一份，避免自动化结果和人工调试相互矛盾。

### 2.4 调试与测量分离

实时更新界面、展开 trace 和检查图形会干扰计时。Performance Lab 应区分：

- **Inspect**：强调过程、图形和诊断的可见性。
- **Measure**：隔离执行并减少界面干扰，结束后再展示汇总。

### 2.5 比较必须说明环境

同一次本地 A/B 可以帮助理解策略差异；跨运行、跨机器或跨浏览器的绝对耗时只有在环境与场景一致时才可比较。界面必须明确显示可比或不可比，不能生成误导性的提升比例。

## 3. 整体架构

```text
Scenario
  → Run Engine
  → Product Pipeline
  → Observation
  → Result
  ├─ CLI Check / Report
  └─ React Performance Lab
```

整体分为五层：

| 层               | 职责                                                               |
| ---------------- | ------------------------------------------------------------------ |
| Scenario         | 描述要运行的真实场景、参数范围和正确性依据                         |
| Run Engine       | 在 Node、无头浏览器或交互浏览器中组织执行与生命周期                |
| Product Pipeline | 运行 Runtime、Core、renderer、adapter 及未来上层能力的真实公共链路 |
| Observation      | 收集 trace、Patch、耗时、诊断、生命周期和可选内存信息              |
| Presentation     | CLI 负责门禁与报告，Performance Lab 负责操作、图形观察和对比       |

产品包不能依赖 Bench。Bench 可以组合各包公开能力，但 Bench 内部概念不反向进入产品契约。

## 4. 观测范围

Performance Lab 长期围绕五类问题组织信息：

1. **结果是否正确**：增量与完整结果是否等价，renderer 输出是否一致。
2. **执行了什么**：实际走 full、incremental、fallback 还是 bailout。
3. **减少了多少工作**：访问、复用、变更、Patch 和物化范围。
4. **花费了多少时间**：首次执行、更新、提交及未来的阻塞、首个可见和完成时间。
5. **保留了多少状态**：session、缓存、索引、renderer resource 与 dispose 后生命周期。

内存数据必须注明观测能力和误差。没有可靠字节测量时，应展示稳定的结构与生命周期计数，或明确标记不可用，不能用序列化大小冒充真实内存。

## 5. 三类使用方式

### 自动检查

固定场景与预算，验证正确性、确定性工作量和资源释放，继续作为共享 CI 的主要性能证据。

### 受控报告

在冻结环境中采集 timing，只在完整环境指纹一致时与正式 baseline 比较。baseline 仍通过候选文件和人工审查更新。

### 交互实验

开发者在本机选择场景和策略，观察图形、执行结果和相对差异。交互结果默认属于探索数据，可以导出，但不直接写入 tracked baseline。

## 6. 首个版本边界

首版只为 Kernel 当前已落地的性能优化提供调试面板，不提前模拟未来能力。

开发者需要能够：

- 选择 SVG / Canvas 与当前支持的 Runtime 执行策略。
- 调整基础场景规模并触发初始渲染或更新。
- 直接看到实际图形输出。
- 判断本次是否发生增量执行、完整执行或 fallback。
- 对比不同策略的工作量与本机耗时。
- 查看必要的 trace、Scene Patch、诊断和资源释放结果。
- 导出本次实验结果与环境信息。

首版使用与 `apps/docs` 一致的 Vite、React、Tailwind v4 和 shadcn/ui 基础技术，但 Bench 保持独立 app，不依赖 Docs 的业务代码。

首版不包含：

- 修改正式 baseline 或 timing guard 的界面。
- 尚未落地的调度、渐进物化或 generation 假数据。
- Data、Plot、Table 等上层模块的占位场景。
- 真实 LLM 调用、模型评测或远程结果服务。

## 7. 长期扩展方向

未来能力通过新增真实 Scenario 和 Observation 接入同一 Run Engine，不扩张新的性能应用。

演进方向包括：

- 上层数据、可视化、表格和逻辑制图链路的端到端场景。
- 高频交互、并发调度、取消和主线程阻塞观测。
- 渐进物化的首个可见、完整呈现、fallback 与一致性观测。
- LLM generation 的合法 draft 批次、预览、失败恢复和最终接受过程。

真实 LLM 的网络、模型和 prompt 具有不确定性，默认只适合开发者观察。需要稳定评测 Runtime 与渲染链路时，应重放固定、脱敏的 generation 过程。

## 8. 结果与 baseline 治理

Performance Lab 必须区分三种证据：

| 证据                 | 用途                                         |
| -------------------- | -------------------------------------------- |
| 确定性结果           | 判断工作量、执行路径、输出和生命周期是否回归 |
| 同环境本地 A/B       | 理解不同策略在当前机器上的相对表现           |
| 受控 timing baseline | 作为正式版本性能门禁                         |

GUI 可以读取和导出报告，但不能直接把一次本机结果设为正式 baseline。环境不一致时只展示事实，不给出可比较结论。

## 9. 阶段路线

### 阶段 1：Kernel Performance Lab

在现有 Bench 上建立共享运行底座和 React 调试面板，覆盖当前 Kernel 的执行策略、增量路径、renderer 输出与基础性能数据。

### 阶段 2：实验与报告体验

完善结果对比、历史导入导出和调试信息组织，让开发者更容易复现和交流性能问题。

### 阶段 3：能力随产品演进接入

当上层增量、并发、渐进呈现和 generation 契约实际落地后，再分别通过 ADR 或 plan 设计对应场景和观测细节。

## 10. 架构不变量

1. CLI 与 GUI 共享场景、fixture、执行和结果口径。
2. 正确性失败时，不产生性能通过结论。
3. 产品包不依赖 Bench，Bench 不复制产品语义。
4. Inspect 与 Measure 分离，调试界面不进入受控计时区间。
5. 环境不可比时明确标记，不生成误导结论。
6. 首版只展示当前可证明的 Kernel 事实。
7. 后续能力的字段、算法、文件和测试细节由对应 ADR 或 implementation plan 冻结。
