---
name: develop-design
description: Use when planning a retikz architecture direction, version roadmap, or alpha feature that may need a long-lived ADR before implementation.
---

# 功能设计

先判断当前产物是 architecture design、版本 roadmap 还是 ADR。ADR 从 Proposed 起就是长期功能与架构文档；设计检查与实现细节始终写入 ignored plan，不经过“施工蓝图再压缩”的阶段。

## 产物边界

| 产物                | 负责                                                                | 不负责                                               |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Architecture design | 长期问题、整体结构、能力归属、功能边界、关键原则与演进方向          | 版本字段、具体实现和执行步骤                         |
| 版本 roadmap        | 当前版本重点功能、目标与必要边界 / 依赖；ADR 仅用编号链接           | ADR 细节、实施进度、历史排期、执行及发布记录         |
| ADR                 | 单项功能、核心决策、基础数据结构 / 公开契约、行为、失败语义与兼容性 | 设计检查材料、文件 scope、测试策略和执行过程         |
| Mirror plan         | 设计检查结论；ADR 确认后再细化文件 scope、逻辑、测试、命令和风险    | 改写 ADR 的公开契约、默认 / 失败语义或 breaking 行为 |

当前任务只要求 architecture design 或 roadmap 时，完成对应文档并交人工 review 后停止，不提前进入 ADR 或 plan。进入 ADR 设计时，ADR 与镜像简略 `PLAN.md` 是同一阶段的配套产物。

## 必读

- 根 `AGENTS.md` 的设计原则、IR / Schema / 分层规则。
- 能力性迭代读取 `notes/architecture/capability-design.md` 和所属能力域 completeness 文档。
- 涉及 Core / Plot、Vanilla、框架 adapter、authoring Input、Source IR 规范化或 DOM 子入口时，读取 `notes/architecture/package-responsibility-design.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取适用层级 references。
- 对应分组的 `_notes/decisions/_template.md` 与目标中版本 `roadmap.md`。

## 按产物加载

- 版本目标与 roadmap：读 [roadmap](references/roadmap.md)。
- 新建/修改/检索 ADR：读 [ADR 与镜像计划](references/adr.md)。
- Architecture Gate 的审计标准由 develop-completeness 拥有；阶段顺序与 Plan Gate 读 flow-development 的 Alpha reference。

设计交付到用户要求的产物为止，不从 roadmap 自动进入 ADR，也不从设计获批自动进入实现。Accepted 在人工接受设计或批准执行时记录；它不表示实现完成。实际实施、评审与 Git 操作仍需明确授权。
