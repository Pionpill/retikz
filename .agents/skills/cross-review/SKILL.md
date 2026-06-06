---
name: cross-review
description: retikz 多 LLM 交叉评审技能。把一段固定范围的代码（commit / commit range、某个 tag / 分支版本、用户指定的固定代码块、工作区未提交改动）交给多个独立模型评审，再由 Claude 把各家结果归并成分级报告。评审员走外部 codex CLI（可多 -m 模型）+ claude -p headless，跨厂商多视角找缺陷、设计问题、可维护性与一致性风险。适用于发版前评审、commit / PR 把关、关键模块多视角审计、对单模型结论不放心时求第二/第三意见。强调评审固定快照、如实标注哪些模型提了哪条、区分共识与分歧，绝不伪造 finding 或夸大模型数量。
---

# Cross Review：多 LLM 交叉评审

本 skill 的目标是**用多个相互独立的模型评审同一段固定范围的代码**，再由 Claude（编排者）把各家结论归并、对齐、裁决成一份分级报告。价值来自**视角多样性**：不同厂商 / 不同模型对同一段代码的关注点不同，共识项可信度高，分歧项往往是最值钱的讨论点。

与 [`cross-test`](../cross-test/SKILL.md) 区别：cross-test 是**自己写测试去打破实现**；cross-review 是**把代码丢给别的模型读、让它们挑问题**，Claude 不直接下结论而是先收集外部意见再综合。两者互补，可串联使用（先 cross-review 找方向，再 cross-test 写测试坐实）。

## 核心理念

1. **评审固定快照**——一轮评审锁定一个明确、可复现的代码范围（某 commit、某 range、某 tag/分支、某段贴入的代码、某次未提交改动）。工作区未提交改动会变，评审前先记录 `git rev-parse HEAD` + `git status` 摘要，报告里写清评审的是哪个快照。
2. **真多模型，不糊弄**——“多 LLM”只有在**确有多个不同模型实际跑完**时才成立。如实记录本轮跑了哪几个模型、哪个失败/超时。绝不能只跑一个模型却包装成多视角；也不能把 codex 与 claude 都算上却不说明 claude 这一路本质仍是 Claude 家族。
3. **Claude 是编排者与裁决者，不是第 N 个匿名评审员**——Claude 的职责是：解析范围、派发评审、读各家原始输出、归并去重、标注共识/分歧、对冲突做技术裁决。Claude 自己的判断要和外部模型的判断分开标注，不能混为一谈。
4. **只读评审，绝不改仓库**——评审员只读不写。codex 用 `exec review`（分析态）或 `-s read-only` 沙箱；评审跑完后 `git status` 复核确认工作树未被改动。任何修改 / commit / push 都不在本 skill 职责内。
5. **不伪造、不夸大**——不替模型编造它没说的 finding，不把单模型的猜测升级成“共识”，不把风格偏好硬说成 BLOCKING。模型说不准的就标 WARNING / 待人工确认。

## 可用评审员

启动时先探测本机有哪些可用 CLI（不同机器不同），常见：

| 评审员 | 调用 | 说明 |
|---|---|---|
| **codex**（外部主力） | `codex exec review ...` / `codex exec ...` | OpenAI Codex CLI，有专门的 `exec review` 子命令，原生支持按 commit / base 分支 / 未提交改动评审。可用 `-m <model>` 切不同模型，跑多次即多视角。 |
| **claude -p**（headless 独立一路） | `claude -p --model <model> "<prompt>"` | Claude headless print 模式，独立上下文。注意：仍是 Claude 家族，报告里要标明它与编排者同源，跨厂商多样性主要靠 codex 提供。 |
| ~~copilot~~ | — | 本机的 `copilot` 是 VS Code 内置版，无法独立 CLI 运行，**不用**。 |

探测命令：

```bash
for c in codex claude; do command -v $c >/dev/null && echo "available: $c"; done
```

> 至少要有 **2 个相互独立的评审通道**才算一次有效 cross-review。理想：codex 跑 ≥1 个外部模型 + claude -p 跑 1 路 = 跨厂商。若只有 codex 可用，则用**不同 `-m` 模型**跑 ≥2 次（如默认模型 + 一个更强/不同的模型），并在报告里说明“同厂商不同模型”这一局限。只能跑一个模型时：如实告知用户这不构成交叉评审，问是否继续（退化为单模型评审）。

## 输入：四种范围

| 范围 | 用户怎么给 | 解析成 |
|---|---|---|
| **commit / range** | commit hash，或 `A..B`、`HEAD~3..HEAD` | codex `--commit <SHA>`；range 见下方说明 |
| **版本代码**（tag / 分支） | tag 名、分支名、版本号 | codex `--base <base-branch>`（评审目标相对 base 的改动）；或 checkout 该版本后按固定块评审 |
| **固定代码块** | 文件 / 目录 / 函数路径，或直接贴的代码片段 | 通用 `codex exec -s read-only` + 只读评审 prompt（见下） |
| **工作区当前改动** | “评审我现在的改动” | codex `--uncommitted`（staged + unstaged + untracked） |

若用户没指定范围，先问清要评审什么；不要默认全仓——多模型全仓评审又慢又发散，价值低。

## 评审方向（统一评审重点）

把下列方向写进**每个**评审员的 prompt，保证各家可比、且贴合本仓规范——外部模型默认按通用直觉评审，不喂这些会跑偏。评审前最好把 `AGENTS.md` 关键规则摘要随 prompt 一起给模型。按本轮范围与用户重点可取舍通用项，但**必查四项默认都要过**。

### 必查（本仓高优先，重点盯）

1. **是否符合 `AGENTS.md` 代码规范**——总纲，逐条对照。命名不缩写写全称（`direction` 不写 `dir`、`reference` 不写 `ref`、`background` 不写 `bg`…，TikZ/SVG/CSS 标准词如 `stroke`/`fill`/`cx` 除外）；目录 kebab-case，文件按「组件 PascalCase / 其余 camelCase」；从目录 barrel import 不深入具体文件；数组用 `Array<T>` 不用 `T[]`；函数优先箭头；React 组件用 `FC` 注解 + 独立导出 `Props` 类型 + 在函数体内解构 props。

2. **代码是否 LLM 友好**——尤其 zod schema 描述与重要数据结构。每个 zod 字段都要有 `.describe(...)`（含顶层 object、`type`/`kind` 这类看似自描述的字段）；描述写**含义与用途**、不复述字段名、**全英文**、不中英混写——schema description 直接进 LLM tool definition，是给模型看的契约，必须完整无歧义。重要数据结构的命名与形状对模型是否自解释、模型能否据 description 自我纠错；schema 内部不写 JSDoc（说明全走 `.describe`），派生类型/常量/函数才写中文 JSDoc。

3. **是否用 const 风格枚举，不裸用字符串**——可枚举的取值集 / discriminated union 判别字段，必须用 `as const` 对象 + 派生类型（`ValueOf`），**不用 TS `enum`**，也不要在代码里散落裸字符串字面量当枚举值。命名走 `DrawWay` 风格（PascalCase 域前缀 + 成员、`export` 暴露给用户）；union 成员写 `z.literal(X.Member)`，整体 `z.discriminatedUnion('type', [...])`；成员值保持干净判别串，使裸字面量（`{ type: 'point' }`）仍是有效第一形态。揪出「该用 const 枚举却散字符串」「仍用 TS `enum`」的地方（旧 `SCREAMING_SNAKE` 是遗留写法，新代码按 `DrawWay` 风格）。

4. **数据结构是否可靠——非法状态不可表达**——有共现 / 互斥约束的字段，不能摊成一堆全可选字段。反例：`{ x?, y?, a?, b? }`，而语义要求 x、y 必须同时出现、a、b 必须同时出现。正确做法：① 拆成独立子结构再复合（`{ point: { x, y } }`）；② 互斥用 discriminated union 表达；③ 共现/条件约束用 zod `.refine` / `.superRefine` 校验——**保证只要通过 schema 校验，生成的对象就一定有效**。揪出「全可选 + 靠运行时假设字段成对出现」的脆弱结构，建议改成类型层面就排除非法组合（make illegal states unrepresentable）。

### 通用代码 review 点

**正确性**
- 边界条件：`0` / 负数 / `NaN` / `Infinity` / 空数组 / 角度跨 360 / 极大极小值
- 错误处理：失败时是抛错、warning 还是 silent no-op，哪个合适；错误信息能否定位到具体字段 / id / step / path（可诊断性），而非模糊报错或静默
- 引用解析：未定义 id、自引用、引用顺序、coordinate 与 node 同名、anchor 拼写错误
- 顺序敏感 / 重复调用 / 多功能组合下行为是否仍可预测

**类型安全**
- 无 `as any` / `@ts-ignore` / `@ts-expect-error` / 非必要 `!` 绕过；让 zod / IR / 第三方真实类型穿透到调用点
- TS 类型用 `z.infer` 派生不手写（单一真源，避免与 schema 漂移）
- IR 100% JSON 可序列化：schema 里不出现 `z.any()` / `z.unknown()` / 函数 / `ReactNode`

**分层与架构**
- Kernel / Sugar / Tier 2 归属是否正确（有 data 数组 / 算法 / 改变节点数或拓扑的参数 → Tier 2，不该当 Sugar）
- 子组遇 core 能力不足是否绕开 core 自造平行机制，而非把通用能力补进 core
- Sugar 是否保持与手写 Kernel 完全等价的 IR
- discriminator 字段 `type`（顶层实体 / paint 变体）vs `kind`（类型内部子变体）用法是否符合约定

**一致性**
- react 与 vanilla 两套 authoring 入口同能力是否产**同一 IR**（一致性漂移是高价值 bug）
- 用户可见改动是否在同一改动集同步 zh / en 文档 + demo（zh 是 source of truth）
- 默认值是否符合 TikZ / SVG 用户直觉，是否惊讶且文档未说明

**可维护性 / 简洁性**
- DRY：是否重复实现了本可复用的现有工具；是否有死代码 / 未使用的导出
- 单一职责：函数过长 / 文件过大 / 一个单元干太多事、边界不清
- 魔法数字、散落常量；命名是否表意
- 注释只解释「为什么」不复述代码；**不引用 ADR / 历史阶段**（编号会随重排 rot，且会进 LLM definition 成噪声）

**性能**
- 不必要的重复计算 / O(n²) / 在 render 中重建对象 / 热路径缺 memo
- 模块级缓存、`useId`、marker dedup 等共享状态是否正确、有无泄漏或非确定性

**可测试性**
- 纯函数边界是否清晰、是否便于测试；关键行为有无锁定测试；新增 / 改动行为是否缺回归测试

## 工作流

### 1. 锁定范围与快照

```bash
git rev-parse HEAD            # 记录基准 commit
git status --short            # 工作区状态（评审未提交改动时尤其重要）
git --no-pager log --oneline -1
```

把“本轮评审的确切范围”写下来（哪个 commit / range / 路径 / 是否含未提交改动），后面报告开头要复述。range 提醒：`codex exec review` 原生吃 `--commit <单个SHA>` 与 `--base <分支>`；要评审任意 `A..B` range 时，可先 `git diff A..B` 生成 diff 作为附件喂给通用 prompt，或对该 range 的合并 commit / 分支用 `--base`。

### 2. 选评审员阵容

- 探测可用 CLI（见上）。
- 默认阵容：**codex（默认模型）+ codex（另一个 `-m` 模型，若用户/配置可用）+ claude -p**。具体模型让用户确认或按其偏好；不要硬编码不存在的模型名，先确认 codex / claude 各自能用哪些 `-m` / `--model`。
- 把最终阵容（模型清单）讲给用户，再开跑。

### 3. 并行派发评审

每个评审员**独立进程、各写各的输出文件**，尽量并行（后台跑）以省时间。统一把原始输出收进一个临时目录，例如 `.cross-review/<scope>/`（评审完可清理，不入库）。

**codex —— git 范围（commit / base / uncommitted）**，用专用 review 子命令：

```bash
# 某个 commit
codex exec review --commit <SHA> -m <model> -o .cross-review/codex-<model>.md

# 相对某分支/版本的改动
codex exec review --base <base-branch> -m <model> -o .cross-review/codex-<model>.md

# 工作区未提交改动（staged + unstaged + untracked）
codex exec review --uncommitted -m <model> -o .cross-review/codex-<model>.md
```

可在 `[PROMPT]` 位置追加自定义评审重点（如“重点看 IR schema 契约与 zod description 完整性”）。多模型就把上面命令换 `-m` 再跑一遍，输出文件名带上模型名区分。

**codex —— 固定代码块**（review 子命令只认 git 改动，固定块走通用 exec + 只读沙箱）：

```bash
codex exec -s read-only -m <model> -o .cross-review/codex-block-<model>.md \
  "只读评审下列代码，禁止修改任何文件，只输出问题清单（按 严重/警告/提示 分级）：\n<把代码块或文件路径写进来>"
```

贴入的零散代码（不在仓库里）：先写进临时文件再让 codex 读，必要时 `-C <dir> --skip-git-repo-check`。

**claude -p —— 独立一路**（headless，需自己把 diff/代码喂进 prompt）：

```bash
# 先按范围生成 diff 或取出代码，再喂给 claude
git --no-pager diff <range>  > .cross-review/scope.diff
claude -p --model <model> \
  --append-system-prompt "你是一个严格的代码评审员，只读评审，输出按 BLOCKING/WARNING/INFO 分级，每条给文件:行 与理由，不要复述代码。" \
  "评审以下改动，挑出正确性 bug、设计问题、可维护性与一致性风险：\n$(cat .cross-review/scope.diff)" \
  > .cross-review/claude.md
```

给所有评审员的**统一评审重点见上方「评审方向」**——把同一份重点写进每个评审员的 prompt，保证各家可比、贴合本仓规范（差异才来自模型本身而非 prompt 不同）。评审前最好把 `AGENTS.md` 关键规则摘要随 prompt 一起给模型，让外部模型按本仓规范评审而非通用直觉。

### 4. 收集与归一

- 等所有评审员跑完（后台任务回收），逐个读 `.cross-review/*.md` 原始输出。
- 任一评审员失败 / 超时 / 输出空 / 跑偏：如实记录，不用其它模型的结论替它补。
- 各家格式不同，Claude 负责读懂并抽取出可对齐的 finding（文件:行 + 问题 + 严重度）。

### 5. 综合裁决

Claude 把各家 finding 归并：

- **去重对齐**：同一处问题不同模型的描述合并成一条，记下“哪些模型提了”。
- **共识 / 分歧标注**：≥2 个独立模型都提 → 共识（可信度高）；只有 1 个模型提 → 分歧/单点（需 Claude 判断是真问题还是误报）。
- **冲突裁决**：模型之间结论矛盾时，Claude 给出技术判断与依据，并标明这是 Claude 的裁决而非外部共识。
- **过滤噪声**：明显的风格偏好、对本仓规范的误解（如把规定的 `Array<T>` 当问题）降级或剔除，并说明原因。

裁决要克制：Claude 是把关人，但对拿不准的不要硬下 BLOCKING，标 WARNING + “建议人工/cross-test 确认”。

### 6. 输出分级报告

最终回复给出分级报告；若有 BLOCKING/WARNING 或用户要求留档，同时写入：

```text
notes/reports/cross-review-YYYY-MM-DD-<scope>.md
```

`<scope>` 用简短 kebab-case（如 `commit-1f1bd60`、`plot-axis`、`uncommitted`）。报告必须有三档，并且**每条 finding 标注是哪些模型提出 + 共识/单点**。

跑完后复核仓库未被改动：

```bash
git status --short    # 应与评审前一致；codex/claude 评审不应改任何文件
```

## 报告模板

```md
# Cross Review Report: <scope>

日期：YYYY-MM-DD
评审范围：<commit SHA / range / tag / 文件路径 / uncommitted>
基准快照：HEAD=<sha>，工作区=<clean / 含未提交改动摘要>
评审重点：<正确性 / 契约 / 分层 / 一致性 …>

## 评审员阵容

| 评审员 | 模型 | 厂商 | 结果 |
|---|---|---|---|
| codex | <model> | OpenAI | ok / 失败原因 |
| codex | <model2> | OpenAI | ok |
| claude -p | <model> | Anthropic（与编排者同源） | ok |

多样性说明：<是否跨厂商；若仅同厂商不同模型，写明局限>

## 结论概览

- 共识 BLOCKING：N 条
- 单点 / 分歧：N 条
- 一致认为良好的点：…

## BLOCKING（真实缺陷，需修）

| # | 位置(文件:行) | 问题 | 提出模型 | 共识/单点 | Claude 裁决 |
|---|---|---|---|---|---|

## WARNING（不一定是 bug，但伤害体验/可维护性）

| # | 位置 | 观察 | 提出模型 | 共识/单点 | 建议动作 |
|---|---|---|---|---|---|

## INFO（低优先级 / 一致认为没问题 / 清理点）

| # | 位置 | 观察 | 提出模型 |
|---|---|---|---|

## 模型分歧明细

> 哪些点各家结论不一致，分别怎么说，Claude 倾向哪边及理由。

## 后续沉淀

- 建议立即修：…
- 建议转 cross-test 写测试坐实：…
- 建议记入 plan / notes/decisions TODO：…
- 误报 / 已剔除（附原因）：…
```

无问题时也要明确写：

```md
## BLOCKING

无（N 个模型均未提出阻断级问题）。
```

## 与其它 skill 协同

- **cross-test**：cross-review 找出的疑似 BLOCKING，转 cross-test 写 fail 测试坐实，再修。
- **flow-alpha / flow-beta / flow-rc**：发版前对发布范围跑一轮 cross-review 当多视角把关，结论喂给发布流程。
- 评审发现用户可见行为/契约问题且需要改 → 走对应 develop / docs skill，**本 skill 不直接改代码**。

## 禁止事项

- 不伪造 finding，不替模型编造它没说的话。
- 不把单模型猜测包装成“共识”；不夸大实际跑了几个模型。
- 不让评审员修改仓库；评审后必 `git status` 复核。
- 不把风格偏好 / 对本仓规范的误解硬说成 BLOCKING。
- 不自行 commit / push / tag / publish；按 `AGENTS.md` 等用户授权。
- 不把 `.cross-review/` 临时产物提交进库（评审完清理或加 .gitignore）。
- 只跑得起一个模型时，不假装是交叉评审——如实降级并告知用户。

## 完成标志

- 已锁定并记录评审的固定范围与基准快照。
- 已确认评审员阵容（≥2 独立通道，理想跨厂商），并实际跑完。
- 已收集各家原始输出，对失败/超时的如实记录。
- 已归并去重、标注每条 finding 的提出模型与共识/分歧，并对冲突给出 Claude 裁决。
- 已输出三档分级报告；有 BLOCKING/WARNING 或用户要求时已写入 `notes/reports/cross-review-YYYY-MM-DD-<scope>.md`。
- 已 `git status` 复核仓库未被评审过程改动。
