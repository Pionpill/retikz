---
name: codex-develop-flow
description: Use when the active main model is gpt-6-astra or gpt-5.6-sol and an approved large task, or an approved medium task with separable implementation work, requires authorized agent roles.
---

# Codex Develop Flow

把本 skill 作为模型角色适配层，不作为第二套开发流程。任务规模、计划、测试、review gate 与完成条件始终由根 `AGENTS.md` 和具体 `flow-*` / `develop-*` skill 决定；本 skill 只在已有阶段需要 agent 时选择模型、定义交接和安全并发。

这是版本化模型策略。新模型或角色出现时在这里更新矩阵，不静默猜测或替换模型。

## 启动条件

同时满足以下条件才加载：

- 主模型明确为 `gpt-6-astra` 或 `gpt-5.6-sol`
- 大型任务的执行计划已确认，或部分中型任务包含可分离的实现工作
- 已确认计划明确授权 subagent、角色、数量、review 时点与最大循环次数
- 具体 owning flow 已决定某个阶段需要 implementer 或 reviewer

小型任务、不改变功能的中小型任务、普通文档 / bugfix / 命名调整，以及计划未授权 subagent 的任务不使用本 skill。触发本 skill 不新增文件修改、subagent、review、commit、push、tag 或 publish 权限。

## 主模型选择

主模型选择在任务开始和 Plan Gate 前完成，由根 `AGENTS.md` 的难度匹配规则决定；本 skill 只提供角色适配，不自动切换模型或扩大授权。四级主模型建议为：

- 高难度、大型、需要调研设计或跨包公开契约：`gpt-6-astra`
- 中高难度、中大型、需要调研设计且边界可收敛：`gpt-5.6-sol`
- 中等难度、中小型、任务较明确但需要判断：`gpt-5.6-terra`
- 普通难度、小型、方案确定的任务：`gpt-5.6-luna`

按需求不确定性、错误代价、设计深度、能力边界、修改范围和验证复杂度综合判断，不按代码量或文件数量单独判断。当前主模型与推荐主模型相差两个等级及以上时，必须在执行计划中说明不匹配并等待用户确认；相邻等级可在计划中说明取舍后继续。

## Agent 模型矩阵

只使用调度工具当轮实际暴露的名字：

- 大型复杂任务主控与集成：优先 `gpt-6-astra`
- 边界清楚的中小型任务主控：优先 `gpt-5.6-sol`；小型任务仍由主 agent 直接执行，不启用本 skill
- 输入输出明确、可独立验收的实现：`luna_worker` / `gpt-5.6-luna`
- 跨层疑难 bug、关键算法、难以拆分的核心链路：优先由 Astra 主控直接实现，或按计划交给 `gpt-6-astra`
- 常规单 reviewer：优先 `gpt-5.6-terra`；计划可指定独立的 `gpt-5.6-sol` 或其他实际获批模型
- 最终 `cross-review`：优先 fresh Luna + Terra

以上 agent 分工与主模型选择是两层规则。大型任务仍保持 Astra / Sol 主控，Terra / Luna 按已确认计划承担执行或评审；新增的主模型匹配规则不替换、不削弱这套大型任务流程。

按问题不确定性、错误代价和依赖选择模型，不按代码量分配。以完成任务的总成本评估效果，包括计费 token、交接、验证和返工；步骤减少不等于费用降低。

记录实际模型、角色、实例和 reasoning effort；不发明 `luna_max` 等不存在的名字。矩阵是计划选型建议，不自动切换当前主模型或扩大授权。

## 思考强度

- Astra / Sol 作为用户开启的主模型时，沿用用户设置，不主动覆盖
- Astra / Sol 由 agent 被动开启或调度时，未有用户明确指定则使用 `high`
- Terra / Luna 被动调度时统一使用 `max`，适用于实现、诊断、常规 review 与最终 `cross-review`
- 调度时显式传入对应 reasoning effort，不依赖父 agent 的继承值；`luna_worker` 已固定为 `max` 时沿用角色设置

## 角色分工

主控负责 source of truth、计划、验收标准、任务拆分、依赖、集成验证与 finding 裁决。owning flow 允许主 agent 实现时，主控可以直接处理未委派文件；本 skill 不为维持“纯调度”而强制派 Luna。

同一任务只保留一个主控，不叠加 Astra 与 Sol 两层常驻管理。Astra 主控可直接完成难以拆分的核心链路，不为委派而拆碎问题。

Sol 主控遇到复杂争议或持续返工时，只在计划已授权的职责、文件范围与循环上限内调用 Astra 诊断或实现；Sol 保留集成与最终裁决职责。未授权升级或已达失败阈值时按 owning flow 交人工，不自行追加 agent 或评审轮次。

只有已确认计划指定实现模型与职责时才调度 worker。给 worker 明确的输入、输出、文件所有权和依赖，并声明它不是仓库中唯一工作者，不得回滚或覆盖他人改动。worker 只完成分配的实现并报告改动文件、已知风险与待验证点，不运行 ESLint、TypeScript 类型检查、测试或构建；这些命令由主控在整合该波改动后统一执行。依赖连续的步骤和返修优先复用原 worker；新 worker 只用于新的独立任务。

## 并发实现

详细 plan 中不存在任务依赖、文件所有权重叠、共享 barrel / manifest / lockfile / schema / registry / 生成产物写入时，才允许同一波并发 worker。任一共享写入都视为依赖边，相关任务串行或合并给一个 worker；不把共享集成文件留给主控作为并发补丁。

每波结束后由主控核对跨文件改动与所有权，并统一运行受影响范围的格式化、ESLint、类型检查、测试和构建。冲突或共享状态污染使该波失效，后续改为串行。

## Review 角色映射

本 skill 不创建 review gate，也不规定 review 轮数：

- owning flow 要求常规单 subagent review 时，调度计划中已授权的一个 reviewer；修改后复用同一 reviewer 循环
- owning flow 在大型任务最终阶段调用已授权的 `cross-review`，或用户明确要求交叉验证时，优先使用 fresh Luna + Terra
- 实现 worker 不自动成为 reviewer；是否允许由已确认计划决定

reviewer 不可用时按 owning flow 与执行计划的降级规则处理；不得自行追加 reviewer 或扩大轮数。

## 不拥有的职责

本 skill 不新增 plan、`TEST_CONTRACT.md`、状态文件、completion gate、subagent 或评审轮次，也不把中小型任务升级为 long task。先按根规则选择任务规模和具体 flow；只有 owning flow 已要求 agent 角色时才用本 skill 完成模型映射。
