---
name: develop-review
description: retikz beta 期模块级只读代码审计技能，是 flow-beta 的上游发现器。版本通道按被审范围所属分组判断（core 分组 lockstep，plot 等 Tier 2 各自独立）。主 AI 横向通读一个模块（整个 workspace 包，或某个子系统 / 路径集），按五维度——文件组织结构、bug 排查（含类型安全 / 测试覆盖）、逻辑复用与简化、数据结构 / schema 抽象与 AI 友好、文档一致性——系统排查全局问题，输出一份分级 review 报告（BLOCKING / WARNING / INFO，每条带维度标签 + 代码位置证据 + 建议改法 + 预估 flow-beta Level）。产品代码只读：不改源码、不碰 roadmap，仅新增 notes/reports 报告，跑完对比工作区基线确认未误改。下游由人工 triage 决定把哪些 finding 登记成所属模块的 beta roadmap TODO 交 flow-beta 修；高风险 bug / 不确定的重构指向 cross-review（多模型背书）或 cross-test（写测试坐实）。适用于 beta 期引入新代码后对模块做整体优化盘点、重构前找复用与收敛机会、schema 抽象度与 AI 友好性体检。
---

# Develop Review：模块级只读审计

beta 期对**单个模块横向通读**、系统排查全局优化点的只读审计器。主 AI 一口气读完一个模块的代码，按五个维度找问题，产出一份**分级 review 报告**——但**产品代码只读、不碰 roadmap**。修不修、登记哪几条、走哪条流程，交给下游人工 triage 与 [`flow-beta`](../flow-beta/SKILL.md)。

价值在于**横向视角**：单条 TODO 只盯一处，而引入新代码后真正的优化点往往是「跨多个文件的重复实现」「新代码让旧目录结构失衡」「相邻 schema 抽象度不一致」——这些只有把模块当整体读才看得出来。

## 与 cross-review / flow-beta 的边界

三个 review 类 skill 必须分清，否则语义糊在一起：

| 维度 | [`cross-review`](../cross-review/SKILL.md) | **develop-review（本 SKILL）** | [`flow-beta`](../flow-beta/SKILL.md) |
|---|---|---|---|
| 入口 | 固定快照（commit / range / 代码块） | **横向通读整个模块** | 单条已登记 TODO |
| 谁评 | 多个外部 LLM + 主 AI 裁决 | **主 AI 单路深读** | 主 AI + 双 LLM 审计 |
| 产出 | 分级报告 | **分级报告（只读）** | 改动 + changelog |
| 改代码 | 否 | **否** | 是 |
| 碰 roadmap | 否 | **否** | 是（消费已登记 TODO） |

一句话分工：**develop-review 横向扫整模块、生成待办；cross-review 对固定范围拉多模型视角；flow-beta 逐条把待办改掉。** develop-review 是把「引入新代码后该整体优化什么」从模糊感受变成一张可 triage 的清单，正是 flow-beta「TODO 必须先登记」缺的上游入口。

## 何时用 / 不用

**用本 skill：**

- beta 期某模块刚引入一批新代码，想整体盘点是否带来结构失衡 / 重复实现 / 抽象漂移
- 重构前先找模块内的复用与收敛机会（DRY、死代码、可合并的工具）
- 给一个模块的 schema 抽象度与 AI 友好性做体检
- 想要一张「该模块待优化项」的分级清单，再人工挑选转 TODO

**不用本 skill（改走别处）：**

- 要评审一个**固定 commit / range / PR** 的改动 → [`cross-review`](../cross-review/SKILL.md)
- 已经有**一条登记好的 beta TODO** 要执行 → [`flow-beta`](../flow-beta/SKILL.md)
- 要**加新功能 / 新 IR 形态 / 新公开字段**（不是优化现有代码）→ 走 alpha 的 [`develop-design`](../develop-design/SKILL.md)
- 发现一个**具体 bug 想立刻修** → [`develop-implement`](../develop-implement/SKILL.md) / cross-test，而非整模块审计

## 启动前确认

1. **审查范围所属分组在 beta 期**——版本通道按**被审范围所属的 package / 分组**判断，不把 core 包当唯一版本来源：
   - **core 分组**（core / render / react / vanilla，版本 lockstep）：读 `packages/core/core/package.json`
   - **plot / chart 等 Tier 2 分组**（各自独立版本）：读对应分组的 `packages/<group>/<pkg>/package.json`（如 `packages/plot/plot/package.json`）
   - 版本号含 `-beta.` 即在 beta 期。alpha 期清理也能用本 skill，但要在报告里注明「所属分组非 beta 期，仅作整理盘点参考」。
2. **范围已声明**（见下）——没说清审哪个模块就先问，不默认全仓（全仓审计又慢又发散、价值低）。

## 输入：声明模块范围

本 skill 支持两种粒度，启动时由用户声明，报告头部记录确切范围：

| 粒度 | 用户怎么给 | 收敛成 |
|---|---|---|
| **整个 workspace 包** | `@retikz/core` 的 core 子包、`@retikz/render` 等 | 通读该包 `src/**` |
| **子系统 / 路径集** | 一个主题（geometry / anchor / schema / registry…）或一组文件 / 目录路径 | 通读这组路径（可跨包但同主题） |

范围过大（如「审整个 core 包」实际牵涉十几个子系统、finding 会爆）时，提示用户**拆成多次按子系统审**，并在报告里写明本轮只覆盖了哪部分。

通读前记录基准快照，报告开头复述；**`git status` 那份清单要留底作「工作区保护基线」**——审计后再 `git status` 对比，证明除新增报告外没动任何文件（避免把用户审计前已有的脏改动误判成 skill 造成的改动）：

```bash
git rev-parse HEAD            # 基准 commit
git status --short            # 工作区基线：审计前已有的改动清单，留底待审计后对比
```

通读时**记录实际读过的文件 / glob**，报告里如实声明覆盖率——模块级审计很容易声称「通读」却漏掉测试 / schema / adapter。覆盖范围至少要含范围内的：实现源码、`*.schema.ts` 或 zod 定义、react / vanilla 两套 adapter、对应测试。

## 审查维度

逐文件通读模块，按下面五个维度找问题。**每个维度本 skill 都先给一份「最小必查清单」**，保证 AI 不漏重点；**展开细则与判例引 [`cross-review`](../cross-review/SKILL.md) 的「评审方向」段**（必查四项 + 通用 review 点），不在此重抄完整判例，避免两处维护漂移。

最小必查总览（每条都要扫，详见各维度）：**正确性 · 类型安全 · 分层归属 · schema/数据结构 · 文件结构 · 测试覆盖 · 文档一致性**。

### finding 证据要求

每条 finding 必须给：**① 代码位置（`文件:行`）+ ② 为什么当前行为 / 结构会出问题**。只有「建议可优化」「这里可以更好」而没有具体代码位置和成因的，不写进报告——它无法被 triage、也无法被 flow-beta 消费。

### ① 文件组织结构（develop-review 特有重点）

横向通读才看得出的结构问题——单文件 review 看不到：

- 引入新代码后，**某目录是否该重新切分**（一个目录塞了不同主题、或一个主题散在多个目录）
- **文件是否过大 / 职责过载**需要拆分；是否有该合并的碎文件
- 目录是否有只 re-export 的 `index.ts` barrel；import 是否从 barrel 进而非深入具体文件
- 目录 kebab-case、文件「组件 PascalCase / 其余 camelCase」是否守住
- **分层归属**：新代码是否放错层（Kernel / Sugar / Tier 2）；带 data 数组 / 算法 / 改变节点数的东西混进了 Sugar；子组绕开 core 自造了平行机制

### ② bug 排查（含类型安全、测试覆盖）

最小必查：

- **正确性**：边界条件（`0` / 负数 / `NaN` / `Infinity` / 空数组 / 角度跨 360 / 极值）、错误处理与可诊断性、引用解析（未定义 id / 自引用 / 同名）、顺序敏感与重复调用、react 与 vanilla 是否产同一 IR
- **类型安全**：有无 `as any` / `@ts-ignore` / 非必要 `!` 绕过；TS 类型是否 `z.infer` 派生而非手写；IR 是否 100% JSON 可序列化
- **测试覆盖**：被审范围的关键行为有无锁定测试；新引入逻辑是否缺回归测试

横向通读的额外价值：**跨文件的不一致 bug**（同一概念在两处实现得不一样）最容易在整模块读时暴露。展开判例见 cross-review「正确性 / 类型安全 / 可测试性」。

### ③ 逻辑复用与简化

本 skill 的核心维度——也是 beta 期一串 ♻️ 重构的来源：

- **DRY**：模块内是否重复实现了本可复用的工具 / 计算（如多处各写一遍极坐标点、弧端点、anchor 归一化）→ 收敛成单一入口
- **死代码 / 未使用导出**：删
- **可简化的体积**：过长函数、绕弯的实现、能用现有工具一行替代的手写逻辑
- **可缓存的重复计算**：热路径上每次重建的派生几何 / 对象

按 cross-review「可维护性 / 简洁性」与「性能」两段的判据落实。

### ④ 数据结构 / schema 抽象与 AI 友好

按 cross-review 必查的第 2 / 3 / 4 项逐条对照：

- **zod `.describe` 完整性**：每个字段（含顶层 object、`type` / `kind`）都有英文、写含义不复述字段名的 describe
- **const 风格枚举**：可枚举取值用 `as const` 对象 + `ValueOf` 派生，不裸字符串、不用 TS `enum`
- **非法状态不可表达**：共现 / 互斥约束用子结构复合 / discriminated union / `.refine` 表达，而非一堆全可选字段靠运行时假设成对出现
- **命名是否自解释、抽象是否对 LLM 友好**：相邻 schema 抽象度是否一致；模型能否据 description 自我纠错

### ⑤ 文档一致性

beta 审计不只看代码——按 `AGENTS.md`「文档同步」口诀：**如果用户按现有文档会写出与当前代码不一致的代码，就是问题**。最小必查：

- 模块的 public API / React props / IR schema 字段 / 默认值语义，是否与 `apps/docs` 的 API 表、说明、demo 一致（有无字段改了但文档没跟）
- zh / en 是否同步（zh 是 source of truth）
- 新引入的能力是否缺 demo / 缺页面
- 仅审纯内部代码（不触 public surface）时本维度可标「不适用」并说明

> 与 ④ 的分工：④ 看 schema 本身的抽象与 describe 质量，⑤ 看 schema / API 与**对外文档**是否一致。

## 报告格式

报告要让人工 triage 时一眼能挑出「该转哪条 TODO、走哪条流程」。三档分级 × 维度标签，每条 finding 必须带这些列：

| 列 | 内容 |
|---|---|
| 位置 | `文件:行`（跨文件问题列多处） |
| 维度 | ① 结构 / ② bug / ③ 复用 / ④ schema / ⑤ 文档 |
| 问题 | 当前行为 / 结构是什么、**为什么会出问题**（证据，不能只说「可优化」） |
| 建议改法 | 怎么改（收敛到哪、拆成什么、改成什么 schema） |
| 预估 Level | `internal` / `visible` / `breaking` |
| 坐实出口 | 需不需要转 cross-review（多模型背书）或 cross-test（写测试），不需要写 `-` |

**严重度分级**——按「问题本身有多严重」分，**不是**按改动大小：

- **BLOCKING**：真实 bug / 非法状态可表达 / **阻碍后续设计收敛的结构性问题**。修与不修影响正确性或后续演进方向。
- **WARNING**：伤害可维护性但非 bug——**DRY / 重复实现默认落这里**、命名漂移、抽象不一致、可简化点、文档与代码不一致。重复实现**仅当导致行为不一致、或维护风险极高时才升 BLOCKING**。
- **INFO**：低优先清理点 / 一致认为良好的点。

**预估 Level**——含义直接取自 [`flow-beta`](../flow-beta/SKILL.md) 的判级（`internal` / `visible` / `breaking`），供下游免再判。注意它**按「修复方案触及的范围」判，不是按问题严重度**：一个 BLOCKING bug 若纯内部修复就是 `internal`；一个 WARNING 命名漂移若要改 public export 名就是 `breaking`。两个轴互相独立。

落盘：

```text
notes/reports/develop-review-YYYY-MM-DD-<module>.md
```

`<module>` 用简短 kebab-case（如 `core-geometry`、`anchor`、`render-svg`）。

## 报告模板

```md
# Develop Review Report: <module>

日期：YYYY-MM-DD
审查范围：<整包名 / 子系统 / 路径集>
基准快照：HEAD=<sha>，工作区=<clean / 含未提交改动摘要>
所属分组 / 版本通道：<core 分组 0.3.0-beta.1 / plot 分组 …>
覆盖率声明：<实际读过的文件清单或 glob，含实现 / schema / react+vanilla adapter / 测试；范围过大时本轮只覆盖了哪部分、漏了什么>

## 结论概览

- BLOCKING：N 条　WARNING：N 条　INFO：N 条
- 维度分布：① 结构 N / ② bug N / ③ 复用 N / ④ schema N / ⑤ 文档 N
- 一句话总评：<模块整体健康度、最值得先动的方向>

## BLOCKING

| # | 位置 | 维度 | 问题 | 建议改法 | 预估 Level | 坐实出口 |
|---|---|---|---|---|---|---|

## WARNING

| # | 位置 | 维度 | 观察 | 建议改法 | 预估 Level | 坐实出口 |
|---|---|---|---|---|---|---|

## INFO

| # | 位置 | 维度 | 观察 |
|---|---|---|---|

## 横向发现（跨文件 / 整模块结论）

> 单文件看不出、通读才暴露的：重复实现该收敛到哪、结构该怎么切、抽象漂移在哪。

## 建议 triage（供人工决定，本 skill 不执行）

- 建议转 beta roadmap TODO（人工登记后走 flow-beta）：#…
- 建议先转 cross-review 多模型背书：#…
- 建议先转 cross-test 写测试坐实：#…
- 建议暂不动 / 推后：#…
```

无某档时也写明，例如：

```md
## BLOCKING

无（本模块未发现阻断级问题）。
```

## 产品代码只读

术语统一，避免「只读」与「写报告」表述打架：

- **产品代码只读 / 不改产品代码**：不动任何源码、不写 roadmap、不动 ADR、不 commit
- **允许新增审计产物**：唯一写入的是 `notes/reports/develop-review-*.md` 报告本身
- **工作区保护**：审计后对比审计前留底的基线，确认「除新增报告外，审计前已有的工作区改动未变化」——不把用户审计前已有的脏改动算到 skill 头上：

```bash
git status --short    # 与输入段留底的基线对比：应只多出新增的报告文件
```

## 与下游衔接

本 skill 终点是**报告**，不是改动。下游由人工驱动：

1. **人工 triage 报告** → 决定哪些 finding 值得修、优先级、走哪条流程
2. 选中要修的 → 人工登记到**所属模块的 beta milestone roadmap**（路径按被审模块走：core 分组在 `notes/decisions/core/v<MAJOR>/.../v<MAJOR>.<MINOR>-beta.<N>/roadmap.md`，plot 分组在 `notes/decisions/plot/...`）→ 交 [`flow-beta`](../flow-beta/SKILL.md) 逐条消费
3. **高风险 finding 的坐实出口**：
   - 不确定是不是真 bug / 重构怕引入回归 → [`cross-review`](../cross-review/SKILL.md) 拉多模型背书
   - 疑似 BLOCKING bug → [`cross-test`](../cross-test/SKILL.md) 写 fail 测试坐实再修

报告把这些出口在「建议 triage」段标好，人工照单挑即可。

## 禁止事项

- 不改源码、不碰 roadmap、不动 ADR——本 skill 产品代码只读，唯一新增产物是报告。
- 不自行 commit / push / tag（含报告文件）；按根 `AGENTS.md` 需用户当次授权。
- 不替主 AI 包装成多模型——本 skill 就是主 AI 单路深读；要多视角请转 cross-review，别在报告里假称跨模型。
- 不夸大 / 不硬凑 finding，把风格偏好或对 `AGENTS.md` 规范的误解（如把规定的 `Array<T>` 当问题）说成 BLOCKING。
- 不在报告里下「已修复」结论——修复不在本 skill 职责内。
- 范围过大不硬审——提示拆分，别一轮糊一个全包还漏读。

## 完成标志

- 已声明并在报告头记录确切审查范围、所属分组版本通道、基准快照与覆盖率声明。
- 已横向通读范围内代码，按五维度产出分级报告（每条 finding 列齐：位置证据 / 维度 / 问题 / 建议改法 / 预估 Level / 坐实出口），无「只有建议、没有代码位置与成因」的空 finding。
- 报告含「横向发现」与「建议 triage」段，高风险项标好 cross-review / cross-test 出口。
- 报告写入 `notes/reports/develop-review-YYYY-MM-DD-<module>.md`。
- 已对比工作区基线复核：除新增报告外仓库未被改动。
