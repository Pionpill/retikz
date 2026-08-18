---
name: codex-develop-flow
description: Use when the active main model is explicitly gpt-5.6-sol and an approved large task, or an approved medium task with separable implementation work, needs model-role routing across Sol, Luna, and Terra.
---

# Codex Develop Flow

把本 skill 作为模型角色适配层，不作为第二套开发流程。任务规模、计划、测试、review gate 与完成条件始终由根 `AGENTS.md` 和具体 `flow-*` / `develop-*` skill 决定；本 skill 只在已有阶段需要 agent 时选择模型、定义交接和安全并发。

这是临时的版本化模型策略。GPT-6 或新角色出现时只在这里更新矩阵，不静默猜测或替换模型。

## 启动条件

同时满足以下条件才加载：

- 主模型明确为 `gpt-5.6-sol`
- 大型任务的执行计划已确认，或部分中型任务包含可分离的实现工作
- 已确认计划明确授权 subagent、角色、数量、review 时点与最大循环次数
- 具体 owning flow 已决定某个阶段需要 implementer 或 reviewer

小型任务、不改变功能的中小型任务、普通文档 / bugfix / 命名调整，以及计划未授权 subagent 的任务不使用本 skill。触发本 skill 不新增文件修改、subagent、review、commit、push、tag 或 publish 权限。

## 模型矩阵

只使用调度工具当轮实际暴露的名字：

- 主控与集成：`gpt-5.6-sol`
- 实现：`luna_worker` / `gpt-5.6-luna`
- 常规单 reviewer：优先 `gpt-5.6-terra`；计划另有指定时使用实际获批模型
- 最终 `cross-review`：优先 fresh Luna + Terra

记录实际模型、角色、实例和 reasoning effort；不发明 `luna_max` 等不存在的名字。

## 角色分工

Sol 负责 source of truth、计划、验收标准、任务拆分、依赖、集成验证与 finding 裁决。owning flow 允许主 agent 实现时，Sol 可以直接处理未委派文件；本 skill 不为维持“纯调度”而强制派 Luna。

只有已确认计划把实现阶段交给 Luna 时才调度 worker。给 worker 明确的输入、输出、文件所有权和依赖，并声明它不是仓库中唯一工作者，不得回滚或覆盖他人改动。worker 只完成分配的实现并报告改动文件、已知风险与待验证点，不运行 ESLint、TypeScript 类型检查、测试或构建；这些命令由 Sol 在整合该波改动后统一执行。依赖连续的步骤和返修优先复用原 worker；新 worker 只用于新的独立任务。

## 并发实现

详细 plan 中不存在任务依赖、文件所有权重叠、共享 barrel / manifest / lockfile / schema / registry / 生成产物写入时，才允许同一波并发 Luna。任一共享写入都视为依赖边，相关任务串行或合并给一个 worker；不把共享集成文件留给 Sol 作为并发补丁。

每波结束后由 Sol 核对跨文件改动与所有权，并统一运行受影响范围的格式化、ESLint、类型检查、测试和构建。冲突或共享状态污染使该波失效，后续改为串行。

## Review 角色映射

本 skill 不创建 review gate，也不规定 review 轮数：

- owning flow 要求常规单 subagent review 时，调度计划中已授权的一个 reviewer；修改后复用同一 reviewer 循环
- owning flow 在大型任务最终阶段调用已授权的 `cross-review`，或用户明确要求交叉验证时，优先使用 fresh Luna + Terra
- 实现 worker 不自动成为 reviewer；是否允许由已确认计划决定

reviewer 不可用时按 owning flow 与执行计划的降级规则处理；不得自行追加 reviewer 或扩大轮数。

## 不拥有的职责

本 skill 不新增 plan、`TEST_CONTRACT.md`、状态文件、completion gate、subagent 或评审轮次，也不把中小型任务升级为 long task。先按根规则选择任务规模和具体 flow；只有 owning flow 已要求 agent 角色时才用本 skill 完成模型映射。
