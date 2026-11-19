---
name: codex-develop-flow
description: Use when an approved large or separable medium Retikz task authorizes an Astra or Sol lead to delegate implementation or review.
---

# Codex Develop Flow

把本 skill 作为模型角色适配层，不作为第二套开发流程。任务规模、计划、测试、review gate 与完成条件始终由根 `AGENTS.md` 和具体 `flow-*` / `develop-*` skill 决定；本 skill 只在已有阶段需要 agent 时选择模型、定义交接和安全并发。

这是版本化模型策略。新模型或角色出现时在这里更新矩阵，不静默猜测或替换模型。

## 启动条件

仅在 Astra / Sol 主控的中大型任务中，按已确认计划调度具备独立文件范围的 worker 或只读 reviewer。中型任务须有可分离的实现或专项评审。角色、数量、时点、并发与循环上限均以授权为准；不因加载本 skill 新增权限。

## 模型与角色

| 角色  | 当前模型 ID     | 使用场景                                     |
| ----- | --------------- | -------------------------------------------- |
| Astra | `gpt-6.2-astra` | 高不确定性的架构决策、跨层疑难问题和关键算法 |
| Sol   | `gpt-6.2-sol`   | 常规工程主控、跨层诊断、整体或专项评审       |
| Terra | `gpt-6.1-terra` | 边界明确的实现、文档、视觉核验及局部评审     |

- 代码范式与按需的性能 reviewer 各用独立 Sol；职责见[常规评审](../flow-development/references/review-cycle.md)。
- 已授权最终交叉评审时，Astra 主控优先 Sol + Terra，Sol 主控优先 Astra + Terra；独立性与降级条件按 [cross-review](../cross-review/SKILL.md)。
- 计划以当轮工具实际提供的 ID 为准。主控沿用用户的思考强度；调度时默认显式使用 `high`，用户指定时优先。记录实际角色、ID、实例与强度，不静默替换获批模型。

## 角色分工

主控负责 source of truth、计划、验收标准、任务拆分、依赖、集成验证与 finding 裁决。owning flow 允许主 agent 实现时，主控可以直接处理未委派文件。

同一任务只保留一个主控，不叠加 Astra 与 Sol 两层常驻管理。Astra 主控可直接完成难以拆分的核心链路，不为委派而拆碎问题。

Sol 主控遇到复杂争议或持续返工时，只在计划已授权的职责、文件范围与循环上限内调用 Astra 诊断或实现；Sol 保留集成与最终裁决职责。未授权升级或已达失败阈值时按 owning flow 交人工，不自行追加 agent 或评审轮次。

只有已确认计划指定实现模型与职责时才调度 worker。给 worker 明确的输入、输出、文件所有权和依赖，并声明它不是仓库中唯一工作者，不得回滚或覆盖他人改动。worker 只完成分配的实现并报告改动文件、已知风险与待验证点，不运行 Oxlint、TypeScript 类型检查、测试或构建；这些命令由主控在整合该波改动后统一执行。依赖连续的步骤和返修优先复用原 worker；新 worker 只用于新的独立任务。

## 并发实现

详细 plan 中不存在任务依赖、文件所有权重叠、共享 barrel / manifest / lockfile / schema / registry / 生成产物写入时，才允许同一波并发 worker。任一共享写入都视为依赖边，相关任务串行或合并给一个 worker；不把共享集成文件留给主控作为并发补丁。

每波结束后由主控核对跨文件改动与所有权，并统一运行受影响范围的格式化、Oxlint、类型检查、测试和构建。冲突或共享状态污染使该波失效，后续改为串行。

评审使用已授权的独立角色，worker 不自动成为 reviewer；常规评审和交叉评审分别按对应流程执行。
