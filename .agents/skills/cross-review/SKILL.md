---
name: cross-review
description: Use when retikz needs multiple independent LLMs to review the same fixed code, ADR, implementation plan, test contract, commit, or working-tree snapshot before a gate or delivery decision.
---

# Cross Review：多 LLM 交叉评审

本 skill 用多个相互独立的模型评审同一份固定快照，再由主 AI 归并、对齐和裁决。快照可以是 ADR、implementation plan、test contract、代码、diff、commit range 或发布范围。不同模型必须看到相同输入，同轮并发且互不可见结论。

与 [`cross-test`](../cross-test/SKILL.md) 区别：cross-test 通过测试打破实现；cross-review 只读审查固定材料。两者可以串联使用。

## 核心理念

1. **评审固定快照**——一轮锁定明确、可复现的输入，记录 HEAD、工作区摘要、文件清单与材料版本。评审期间快照变化则本轮作废。
2. **真多模型，不糊弄**——“多 LLM”只有在**确有多个不同模型实际跑完**时才成立。如实记录本轮跑了哪几个模型、哪个失败/超时。绝不能只跑一个模型却包装成多视角；也不能把同一模型同一上下文重复算成独立视角。
3. **主 AI 是编排者与裁决者，不是第 N 个匿名评审员**——主 AI 的职责是：解析范围、派发评审、读各家原始输出、归并去重、标注共识/分歧、对冲突做技术裁决。主 AI 自己的判断要和外部模型的判断分开标注，不能混为一谈。
4. **只读评审，绝不改仓库**——评审员只读不写；主 AI 收齐并归并本轮结果后，只要存在需修问题，就先生成修复 plan、修改并验证，再冻结新快照。未完成修订不得启动下一轮。评审跑完后复核工作区。commit、push 不在本 skill 职责内。
5. **不伪造、不夸大**——不替模型编造它没说的 finding，不把单模型的猜测升级成“共识”，不把风格偏好硬说成 BLOCKING。模型说不准的就标 WARNING / 待人工确认。

## 可用评审员

优先使用当前会话可调度的 collaboration subagent；没有该能力时再探测外部只读 CLI。模型名以工具当轮实际暴露为准，不硬编码不存在的模型。

| 评审员                     | 调用                                      | 说明                                             |
| -------------------------- | ----------------------------------------- | ------------------------------------------------ |
| collaboration subagent     | `spawn_agent` + 不同可用 `model` override | 首选；同轮并发，每个模型一个 fresh agent         |
| codex CLI                  | `codex exec review` / `codex exec`        | 外部只读通道；可用 `-m <model>` 选择实际可用模型 |
| claude headless 等外部 CLI | 对应只读命令                              | 仅在本机真实可用时采用                           |

探测命令：

```bash
for c in codex claude; do command -v $c >/dev/null && echo "available: $c"; done
```

PowerShell：

```powershell
Get-Command codex, claude -ErrorAction SilentlyContinue | Select-Object Name, Source
```

至少有 **2 个实际不同的外部模型**完成才算 cross-review。同厂商不同模型可以成立，但要说明多样性局限；同一模型重复运行不能算多模型，主 agent 也不算外部 reviewer。subagent 必须避开主 agent 模型：例如主 agent 为 sol 时，先选工具实际暴露的 terra，再选实际暴露的 luna 或其它非 sol 模型；不得派 sol subagent 填数。某名称未被工具暴露时必须跳过并如实记录，不得硬编码、伪造或静默换成主 agent 模型；调度能力支持时按风险与实际可用档位设置 `reasoning_effort: high` 至 `max`，并记录实际值。只剩一个不同模型时：强制 Gate halt 交人工；可选评审须经人工明确接受后才能降级，且不得称为交叉评审。

## 输入范围

| 范围                      | 固定方式                                                      |
| ------------------------- | ------------------------------------------------------------- |
| ADR / architecture design | 文件路径 + HEAD + 本轮内容 hash / diff                        |
| implementation plan       | ADR、`PLAN.md`、`TEST_CONTRACT.md` + HEAD + 工作区摘要        |
| commit / range / staged   | commit SHA、`A..B`、staged diff                               |
| 版本代码（tag / 分支）    | tag / branch + 目标相对 base 的 diff                          |
| 固定代码块 / 当前工作区   | 文件清单或完整 uncommitted diff + HEAD + `git status --short` |

调用方必须给出固定范围和评审目标；不要默认全仓。Architecture / Plan Gate 的自动授权只来自根 `AGENTS.md` 与对应 flow，不由本 skill 自行扩张。

## 文档评审方向

评审 ADR 时只检查长期内容：核心决策、基础数据结构 / 公开契约、功能边界、兼容性、被否决方案和架构完备性。不得要求 ADR 增加具体文件、私有命名、业务逻辑步骤、测试 case、命令、commit 切分或 review 过程。

评审 implementation plan 时检查：

- 是否完整追溯 ADR 且没有重新定义公开契约、能力归属或功能边界
- 文件 scope、代码 / 业务逻辑、任务依赖与执行顺序是否可落地
- `TEST_CONTRACT.md` 是否覆盖行为、不变量、反例、最低测试层和正式证据
- docs / changelog、验证命令、commit 边界、风险与回滚是否充分
- 是否混入 ADR 未授权的新能力；有冲突时要求回 ADR，不在 plan 中自行裁决

## 代码评审方向

仅当固定快照包含实现代码、diff、commit 或 public surface 时使用本节。ADR Gate 只使用上方“文档评审方向”与 `develop-completeness` rubric；Plan Gate 只检查 ADR 追溯与实施可执行性，不得用代码 rubric 反向要求 ADR / plan 固定 Zod 拼装或私有命名。

代码评审把下列方向写进**每个**评审员的 prompt，保证各家可比、且贴合本仓规范。评审前把适用 `AGENTS.md` 关键规则随 prompt 一起给模型。按本轮代码范围与用户重点可取舍通用项，但**必查四项默认都要过**。

### 必查（本仓高优先，重点盯）

1. **是否符合 `AGENTS.md` 代码规范**——总纲，逐条对照。命名不缩写写全称（`direction` 不写 `dir`、`reference` 不写 `ref`、`background` 不写 `bg`…，TikZ/SVG/CSS 标准词如 `stroke`/`fill`/`cx` 除外）；目录与非组件文件使用 kebab-case，组件 / 类文件可使用 PascalCase；从目录 barrel import 不深入具体文件；数组用 `Array<T>` 不用 `T[]`；函数优先箭头；React 组件用 `FC` 注解 + 独立导出 `Props` 类型 + 在函数体内解构 props。

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
- TS 类型用 `z.infer` 派生不手写（单一真源，避免与 schema 漂移）；由 IR schema object 推导出的公开数据类型命名为 `IRXxx`，由 const object enum + `ValueOf` 推导出的取值 union 命名为 `XxxValue`
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

写明本轮编号、确切范围、HEAD、工作区摘要、文件清单与评审目标。ADR / plan 评审要给完整文件，不只给摘要。range 可用 `git diff A..B` 固定。

### 2. 选评审员阵容

- 从当前工具元数据和可用 CLI 探测模型。
- 每轮选择 2–3 个实际不同且不同于主 agent 的模型，再优先跨 model family / 厂商；调度能力支持时按风险使用 `reasoning_effort: high` 至 `max`，不写死单一档位。模型或线程不足时暂停，不用主 agent 同模型 subagent 填位。
- 记录计划阵容、实际完成阵容、失败 / 超时和降级说明。
- 同轮使用 fresh agent / fresh context；collaboration subagent 使用 `fork_turns: "none"` 或等价无历史上下文方式，由 prompt 完整传入固定材料。上一轮评审员不得携带旧结论进入新轮。

### 3. 并行派发评审

所有评审员收到同一份 scope 与重点，并发启动；不能先等待一位完成再把其结论交给下一位。

**collaboration subagent**：每个实际可用模型一个 fresh agent，prompt 只给固定材料、适用规则、输出契约和只读限制。不要传主 AI 的预判、其它模型结论或期望答案。原始输出由会话保留；需要恢复记录时写入对应 ignored plan 的 `REVIEW.md` 或 `notes/reports/`。

外部 CLI 只作为无 collaboration 能力时的替代通道：

**codex —— git 范围（commit / base / uncommitted）**，用专用 review 子命令：

```bash
# 某个 commit
codex exec review --commit <SHA> -m <model> -o notes/reports/cross-review-<scope>/codex-<model>.md

# 相对某分支/版本的改动
codex exec review --base <base-branch> -m <model> -o notes/reports/cross-review-<scope>/codex-<model>.md

# 工作区未提交改动（staged + unstaged + untracked）
codex exec review --uncommitted -m <model> -o notes/reports/cross-review-<scope>/codex-<model>.md
```

可在 `[PROMPT]` 位置追加自定义评审重点（如“重点看 IR schema 契约与 zod description 完整性”）。多模型就把上面命令换 `-m` 再跑一遍，输出文件名带上模型名区分。

**codex —— 固定代码块**（review 子命令只认 git 改动，固定块走通用 exec + 只读沙箱）：

```bash
codex exec -s read-only -m <model> -o notes/reports/cross-review-<scope>/codex-block-<model>.md \
  "只读评审下列代码，禁止修改任何文件，只输出问题清单（按 严重/警告/提示 分级）：\n<把代码块或文件路径写进来>"
```

贴入的零散代码（不在仓库里）：先写进临时文件再让 codex 读，必要时 `-C <dir> --skip-git-repo-check`。

**claude -p —— 独立一路**（以下是 POSIX shell 示例；PowerShell 必须用原生命令生成文件并显式读取内容，不直接复制 `$()` / `cat` 写法）：

```bash
# 先按范围生成 diff 或取出代码，再喂给 claude
git --no-pager diff <range> > notes/reports/cross-review-<scope>/scope.diff
claude -p --model <model> \
  --append-system-prompt "你是一个严格的代码评审员，只读评审，输出按 BLOCKING/WARNING/INFO 分级，每条给文件:行 与理由，不要复述代码。" \
  "评审以下改动，挑出正确性 bug、设计问题、可维护性与一致性风险：\n$(cat notes/reports/cross-review-<scope>/scope.diff)" \
  > notes/reports/cross-review-<scope>/claude.md
```

给所有评审员的**统一评审重点见上方「评审方向」**——把同一份重点写进每个评审员的 prompt，保证各家可比、贴合本仓规范（差异才来自模型本身而非 prompt 不同）。评审前最好把 `AGENTS.md` 关键规则摘要随 prompt 一起给模型，让外部模型按本仓规范评审而非通用直觉。

### 4. 收集与归一

- 等所有评审员跑完，逐个读 ignored review 目录里的原始输出。
- 任一评审员失败 / 超时 / 输出空 / 跑偏：如实记录，不用其它模型的结论替它补。
- 各家格式不同，主 AI 负责读懂并抽取出可对齐的 finding（文件:行 + 问题 + 严重度）。

### 5. 综合裁决

主 AI 把各家 finding 归并：

- **去重对齐**：同一处问题不同模型的描述合并成一条，记下“哪些模型提了”。
- **共识 / 分歧标注**：≥2 个独立模型都提 → 共识（可信度高）；只有 1 个模型提 → 分歧/单点（需主 AI 判断是真问题还是误报）。
- **冲突裁决**：模型之间结论矛盾时，主 AI 给出技术判断与依据，并标明这是主 AI 的裁决而非外部共识。
- **过滤噪声**：明显的风格偏好、对本仓规范的误解（如把规定的 `Array<T>` 当问题）降级或剔除，并说明原因。

裁决要克制：主 AI 是把关人，但对拿不准的不要硬下 BLOCKING，标 WARNING + “建议人工/cross-test 确认”。

### 6. 评审轮次与收敛

一轮表示“同一快照上的一组并发多模型评审”，不是一个评审员：

1. 同时派发本轮全部模型并收齐结果；同轮 reviewer 都检查同一固定快照，不因先返回的问题取消其余并发评审。
2. 主 AI 归并并核实本轮全部 finding；同轮评审员不参与修改。
3. 有 BLOCKING 或需修订的 WARNING 时，先写 finding → 修改 → 验证的修复 plan，再完成修订与必要验证；没有实际修订与验证不得进入下一轮。
4. 下一轮使用 fresh agents，并重新并发派发；不能让上一轮单一评审员口头确认代替完整复审。
5. 最新一轮所有实际评审员完成、无 BLOCKING、WARNING 均已修订或有可验证的人工裁决时 PASS。
6. 满足 PASS 条件后立即结束，不为凑轮次追加评审；只有完成修订后才进入下一轮。
7. 最多 9 轮。第 9 轮仍未 PASS、模型分歧无法裁决、快照漂移或只剩一个模型时 halt，交人工决策。

### 7. 输出分级报告

最终回复给出分级报告。落盘优先级固定为：

- Architecture Gate reviewer 只按 `develop-completeness` 返回调用方，不写文件；主 AI 在内存中归并
- Plan Gate 把轮次、模型与归并结果写入镜像 plan 的 `REVIEW.md`
- 其它已获用户授权的 review 在有 BLOCKING / WARNING 或用户要求留档时写 ignored report

其它 report 路径：

```text
notes/reports/cross-review-YYYY-MM-DD-<scope>.md
```

`<scope>` 用简短 kebab-case。报告必须有三档，并且每条 finding 标注提出模型与共识 / 单点。其它报告放 `notes/reports/` 或 `_notes/reports/`。这些文件默认不 stage、不 commit。

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

| 评审员    | 模型     | 厂商      | 结果          |
| --------- | -------- | --------- | ------------- |
| codex     | <model>  | OpenAI    | ok / 失败原因 |
| codex     | <model2> | OpenAI    | ok            |
| claude -p | <model>  | Anthropic | ok            |

多样性说明：<是否跨厂商；若仅同厂商不同模型，写明局限>

## 结论概览

- 共识 BLOCKING：N 条
- 单点 / 分歧：N 条
- 一致认为良好的点：…

## BLOCKING（真实缺陷，需修）

| #   | 位置(文件:行) | 问题 | 提出模型 | 共识/单点 | 主 AI 裁决 |
| --- | ------------- | ---- | -------- | --------- | ---------- |

## WARNING（不一定是 bug，但伤害体验/可维护性）

| #   | 位置 | 观察 | 提出模型 | 共识/单点 | 建议动作 |
| --- | ---- | ---- | -------- | --------- | -------- |

## INFO（低优先级 / 一致认为没问题 / 清理点）

| #   | 位置 | 观察 | 提出模型 |
| --- | ---- | ---- | -------- |

## 模型分歧明细

> 哪些点各家结论不一致，分别怎么说，主 AI 倾向哪边及理由。

## 后续沉淀

- 建议立即修：…
- 建议转 cross-test 写测试坐实：…
- 建议记入 plan / \_notes/decisions TODO：…
- 误报 / 已剔除（附原因）：…
```

无问题时也要明确写：

```md
## BLOCKING

无（N 个模型均未提出阻断级问题）。
```

## 与其它 skill 协同

- **cross-test**：cross-review 找出的疑似 BLOCKING，转 cross-test 写 fail 测试坐实，再修。
- **flow-alpha**：Architecture Gate 与 Plan Gate 复用本 skill 的固定快照、并发模型和 1–9 轮协议。
- **flow-beta / flow-rc / flow-long-task / develop-refactor**：已有 review gate 复用同一轮次协议；本 skill 不扩大各自授权。
- 评审发现用户可见行为/契约问题且需要改 → 走对应 develop / docs skill，**本 skill 不直接改代码**。

## 禁止事项

- 不伪造 finding，不替模型编造它没说的话。
- 不把单模型猜测包装成“共识”；不夸大实际跑了几个模型。
- 不让评审员修改仓库；评审后必 `git status` 复核。
- 不把风格偏好 / 对本仓规范的误解硬说成 BLOCKING。
- 不自行 commit / push / tag / publish；按 `AGENTS.md` 等用户授权。
- 不把 plan review 或 reports 临时产物提交进库。
- 同轮不串行喂结论；轮间必须先归并、修订和冻结新快照。
- 不因同轮某个 reviewer 先返回问题而取消其余并发评审；收齐本轮后统一修复。
- 不在相同未修订快照上启动下一轮；不得把“下一轮继续确认”当作本轮修复。
- 不派与主 agent 相同模型的 subagent 填补阵容；Luna 等模型未被工具真实暴露时不伪造。
- 只跑得起一个模型时，不假装是交叉评审；强制 Gate halt，可选评审等待人工接受降级。

## 完成标志

- 已锁定并记录评审的固定范围与基准快照。
- 已确认评审员阵容（至少 2 个实际不同且不同于主 agent 的外部模型），并在同一轮并发跑完。
- 已收集各家原始输出，对失败/超时的如实记录。
- 已归并去重、标注每条 finding 的提出模型与共识/分歧，并对冲突给出主 AI 裁决。
- 无问题时已在当前轮立即 PASS；需要修订时已先生成修复 plan、完成修改与验证，再使用新快照和 fresh agents 复审；最多 9 轮，未通过时已 halt 交人工。
- 已输出三档分级报告；有 BLOCKING/WARNING 或用户要求时已写入 `notes/reports/cross-review-YYYY-MM-DD-<scope>.md`，且未 stage / commit 该 ignored 报告文件。
- 已 `git status` 复核仓库未被评审过程改动。
