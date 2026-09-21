# ADR 与镜像计划

## ADR 位置

新建 ADR 先确认主责 owner 与目标中版本；用户明确指定的目标优先，否则读取主责 package 当前 `package.json` 的 major / minor：

- `0.5.0-alpha.4`、`0.5.0-beta.1` 与 `0.5.0` 均归入 `v0/v0.5/`，不为 patch 或预发布阶段建子目录，也不为放置 ADR 预 bump 包版本
- 在同一 owner / 中版本内取最大编号加一，使用至少三位十进制编号，从 `001` 起；不复用删除或 Superseded 的编号，不随发布重排
- 跨组 ADR 按能力所有权确定主责，协作组可有独立版本线；主责或目标范围不清时先对齐，不从最大目录或其它 checkout 猜测

```text
packages/kernel/_notes/decisions/v<MAJOR>/v<MAJOR>.<MINOR>/<NNN>-<slug>.md
packages/viz/_notes/decisions/<FAMILY>/v<MAJOR>/v<MAJOR>.<MINOR>/<NNN>-<slug>.md
```

其它分组沿用同形态。模板优先使用所属分组的 `_notes/decisions/_template.md`；该分组无模板时复用 Viz 的 family 模板，并按实际位置填写引用。Roadmap 不要求每个目标对应 ADR；新增长期决策才建 ADR，bugfix / 优化不为发包补造 ADR。创建 ADR 时同步创建镜像目录和简略 plan：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/001-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/001-example/PLAN.md
```

`**/_notes/plans/` 由 `.gitignore` 覆盖；简略 plan 默认不 stage、不 commit。

## ADR 内容契约

### 检索元数据与读取顺序

- 正式 ADR 使用 YAML frontmatter：`description` 为 1–200 字符单行摘要，说明主题与必要边界；`keywords` 为顿号 `、` 分隔的 1–12 个短关键词，保持一行，优先中英文术语与真实公开名称。正文调整时同步维护，不写状态或发布结论。
- owner、版本、编号从路径推导，状态仍以正文为准，不复制字段或维护手写索引；元数据仅用于发现，不证明决策生效或实现完成。
- 先用 `pnpm adr:search <关键词...> --owner <owner> [--version v0.x]`；多词全部命中，默认最多 10 条，`--limit` 上限 100，`--json` 返回结构化结果。
- 未命中先换同义词 / 公开名称或扩大范围，再用 `--body` 或 `rg` 补查正文。没有摘要命中不等于没有相关设计，不默认把所有 ADR 全文送入上下文。
- 命中后阅读全文并追踪前置、Superseded 与替代决策；历史 ADR 不自动过滤。实现、设计裁决与发布审计仍以相关全文和当前代码为依据。
- 新建、迁移或修改元数据后运行 `pnpm adr:search --check`；命令动态读文档，不生成重复索引。

### 正文

ADR 至少包含：

1. 背景、目标和必须解决的问题。
2. 核心决策及不可让步的理由。
3. 基础数据结构、公开 DSL / API 或稳定跨层契约；只写理解功能必需的最小形态。
4. 用户可观察行为、默认值、失败语义和兼容性。

理解核心决策所必需的跨包接口或依赖方向可以写入相关决策段，但 ADR 不另设功能与包边界、能力完备性检查、同类设计验证、被否决方案、测试策略摘要或不在本 ADR 范围章节。

ADR 不得写：

- 具体源文件、测试文件、文档文件白名单。
- 私有函数、helper、class、内部模块名或临时类型名。
- 逐步业务逻辑、算法施工顺序、object spread / merge 等实现过程。
- 测试标题、逐项 case、测试路径、验证命令或覆盖率 checklist。
- commit 切分、执行 checklist、review prompt、轮次状态和临时裁决。
- 功能与包边界、能力完备性检查、同类设计验证、被否决方案、测试策略摘要和不在本 ADR 范围等设计检查材料；它们进入同步创建的简略 plan。
- “实现后再删除 / 压缩”的临时段或只存在于 Git 历史的施工全文。

Schema 或数据结构只有在它是基础公开契约、跨包接口或非法状态边界时进入 ADR；文件位置、Zod 拼装方式、private intermediate 和逐字段操作进入 plan。

新增或修改 authoring API 时，ADR 必须说明 React 与 Vanilla 是否表达同一契约；某套不适用时写明理由。

## 简略 plan

ADR 草拟时同步创建镜像 `PLAN.md`，至少包含：

- ADR 路径、目标与非目标。
- 功能与包边界。
- 能力完备性检查及明确结论。
- 同类设计验证。
- 被否决方案。
- 测试策略摘要。
- ADR 人工确认后需要补齐的实施信息。

这些检查必须真实执行并保留结论，不能因 ADR 变短而省略。简略 plan 可以引用当前代码和外部资料，但不必提前冻结文件清单、任务顺序、验证命令或 commit；这些内容在 ADR 确认后细化。

## Architecture Gate

草案与简略 plan 完成后，按 develop-completeness 的 adr-gate rubric 核对；常规评审按 [单 reviewer 循环](../../flow-development/references/review-cycle.md)。公开契约 finding 修 ADR，设计检查 finding 修 plan。Gate PASS 后等待明确实施授权，不把通过当作批准。

## Implementation plan 细化

人工明确接受设计时将 ADR 标为 `Accepted`；明确批准执行也包含接受设计，但单独接受设计不授权实现。Accepted 不代表实现完成；实现进度由 plan / 任务证据跟踪，roadmap 只概览重点功能，发布事实由 changelog、tag 与 registry 核验。获准实施后，重新阅读全文 ADR 与简略 plan，并在同一镜像目录细化 `PLAN.md`、创建其它执行产物：

```text
packages/viz/_notes/decisions/chart/v0/v0.1/001-example.md
-> packages/viz/_notes/plans/chart/v0/v0.1/001-example/
   PLAN.md
   TEST_CONTRACT.md
   TASK_STATE.md      # 长任务需要
   REVIEW.md          # 记录 Plan Gate 轮次摘要
```

细化后的 `PLAN.md` 在原有设计检查结论上补充：当前代码基线、文件 scope、基础契约到代码的映射、业务逻辑与任务顺序、docs / changelog、验证命令、commit 边界、风险与回滚。详细测试矩阵由 `test-contract` 写入同目录 `TEST_CONTRACT.md`。

Plan 可以细化实现，不能改变 ADR 的公开契约、所有权和功能边界；发现冲突时停止 plan，回到 ADR 修订和 Architecture Gate。

Plan 写完后必须完成 Plan Gate；默认由主 agent 自审，执行计划已授权时使用一个 reviewer 循环。通过前不得修改产品代码，具体编排由 [alpha](../../flow-development/references/alpha.md) 负责。
