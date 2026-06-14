# retikz eval：LLM 生成准确性评测 · 设计

> 目的：验证 LLM 生成 retikz IR（core + plot）的准确性，产出**可回归追踪**的报告，反哺 schema / DSL 设计。
> 状态：**设计中（草案）** · 2026-06-12 起 · 关联：[`core-design.md §1.2 / §7 AI 友好`](../architecture/core-design.md) · [`core 底座对比分析 · AI 维度`](../analysis/core-compare-analysis.md) · [`v0.4 roadmap · D`](../decisions/core/v0/v0.4/roadmap.md)
> 落地：`apps/eval`（workspace 包，依赖 core + plot 的 schema）。

## 为什么做

- core-design §1.2 把「AI 友好」列为第一设计原则，但目前**没有任何客观度量**——schema 改动对生成质量的影响全靠手感。
- eval 把「AI 友好」从口号变成**可测量、可回归**的信号：每次改 IR schema / `.describe`，跑一遍看准确率有没有掉。
- 对比分析里 retikz 的「schema 即契约」是结构强项（9），但「AI 原生 / 自纠错」现状仅 6——缺的正是这套评测闭环。

## 打分阶梯（核心框架）

| 档 | 测什么 | 客观性 / 成本 | 状态 |
|---|---|---|---|
| **L1 结构有效性** | 生成 IR 过 zod 校验？`compileToScene` 不报错？ | 全自动、客观、便宜 | ✅ **首切锚定** |
| **L2 语义正确性** | 结果符合 prompt 意图？走**断言集**（查编译后 Scene） | 确定性、零额外成本、中 | ✅ **断言 baseline 落地（v1：4 类确定性断言）** |
| **L3 视觉保真** | 渲染成图 → 与 golden 图 diff / vision 评分 | 最贵 | 后置 |

> **L1-only 的一个简化收益**：L1 不需要 golden 输出——只要 prompt + 元数据，成功 = 过 zod + compile。语料因此从「prompt → 期望」退化成「一组带类别 / 难度标签的 prompt」，攒起来快得多。

## 设计轴（待逐个定）

1. **首切野心**：只 L1 / L1+L2 / L1–L3？
2. **语料 corpus**：`(prompt → 期望)` 的期望形态（golden IR / 断言集 / golden 图 / 纯 rubric）；覆盖 core + plot、分难度档；语料如何维护 / 扩充。
3. **生成驱动**：喂 JSON Schema（structured output / tool）还是 few-shot；是否带 **self-repair**（zod 错误喂回模型，测收敛轮数）；多模型 / 跨 vendor。
4. **报告**：指标（通过率 by 类别 / 难度 / 模型）、回归追踪、产物格式。
5. **放置 / 结构**：`apps/eval` 包形态、与 core / plot schema 的依赖接法。

## 前置依赖

- **「zod → 喂 LLM 的 JSON Schema 契约」导出尚未落地**（core-design §7 的设计意图）。eval 要测生成，先得有「喂给模型的 schema 契约」。
- core 已升级 **zod v4**（见 [`v0.3 beta.2`](../decisions/core/v0/v0.3/beta.2/roadmap.md)），内置 `z.toJSONSchema` 可**零额外依赖**产出 JSON Schema；`SceneSchema` / `PlotSpecSchema` 的导出能力已有测试锁定 → 导出做进 core（见 D2）只剩封装工作。

## 首切定稿（L1 baseline · 端到端流水线）

D1–D6 串成一条流水线：

1. **语料**（D3）：手写自然语言种子 + 文档 demo 反推（改写成自然语言、不泄 IR 结构），按 core / plot × 难度档（单图元 / 组合 / 复杂图）组织，存 `apps/eval/corpus/`。
2. **schema 契约**（D2）：core / plot 的 zod schema 转 JSON Schema 作 prompt 上下文——直接用 zod v4 内置 `z.toJSONSchema`（已随 beta.2 升级落地）。
3. **生成**（D4 + D6）：经 Vercel AI SDK（薄 adapter 隔离）对 1–2 个 provider，**自由生成、单发、不带 self-repair**；每条 prompt 跑 **K 次**。
4. **打分**（D1）：每个产出过 **zod 校验 + `compileToScene`**，得 **zod 通过率 / compile 通过率** 两层 + 失败归因（按错误类型聚合）。
5. **报告**（D5）：通过率按 类别 × 难度 × 模型 聚合，结果持久化到 `results/`，与基线 diff 标出回归。

**后置**：L2 语义 / L3 视觉、structured output(B) 模式、self-repair、CI 门禁、多 provider 扩容。

### 模型接口选型（2026-06-12）

候选 Vercel AI SDK vs TanStack AI，结论 **Vercel AI SDK**：两者都多 provider + zod 原生，但 TanStack 的招牌优势（多框架 `useChat` hooks、isomorphic client/server 工具）对**无 UI 的 node 评测脚本用不上**；剩下能比的成熟度——**TanStack AI 尚在 alpha（API 会变）**，eval 要当稳定回归基线，选久经验证的 Vercel；仓库现无任何 `@tanstack/*`，也无技术栈一致性理由。用薄 adapter 隔离，将来 TanStack 出 alpha 后可低成本换。

## 开放决策（随讨论补）

- [x] **D1** 首切打分档 → **只 L1**（全自动客观回归基线；L2 / L3 后置）
- [~] **D2** schema 导出归属 → 倾向 **(a) core 产出**，用 zod v4 内置 `z.toJSONSchema`（已随 beta.2 升级落地、零额外依赖），eval 消费。
- [x] **D3** 语料 → **手写种子 + demo 反推 结合**：手写 = 真实自然语言用法；demo 反推 = 量大且**自带 known-good IR**（可复用为未来 L2 reference）。⚠️ demo 反推须改写成自然语言、**不直接描述 IR 结构**（避免泄题）。按 core / plot 两大类 × 难度档（单图元 / 组合 / 复杂图）组织，存 `apps/eval` 下 JSON/YAML。
- [x] **D4** 生成驱动 → **A 自由生成（free-form），单发、不带 self-repair**。L1 真实信号在此（B 受限生成会把 L1 锁成必过）；B 留接 L2 / 生产模拟，self-repair（测自纠错）后置。多模型跨 1–2 vendor 起步。
- [x] **D5** 报告 → 指标**拆两层**（zod 通过率 / compile 通过率）× 类别 × 难度 × 模型 + **失败归因**（按错误类型聚合）；**每 prompt 跑 K 次取通过率**（正视 LLM 非确定性，回归比通过率差值超噪声带、非逐字 diff）；回归追踪 = **(b) 持久化结果 + 基线 diff**（标回归项；不上 CI 门禁）。
- [x] **D6** 包结构 / 放置 → `apps/eval`（node/tsx CLI，无 UI），目录 `corpus/ runner/ report/ results/ schema/`；依赖 core + plot schema；**模型接口 = Vercel AI SDK + 薄 adapter 隔离**（runner 只依赖「prompt + schema → 文本 / 对象」抽象，可换 TanStack AI 等）；API key 走 env、不入库。理由见下「模型接口选型」。
- [x] **D7** L2 路线 → **断言集**（非 golden IR 比对、非 LLM-as-judge）。理由：确定性（可回归基线 diff）、零额外 API 成本、直击 L1 在强模型上 100% 饱和的盲区。断言**查编译后 Scene 不查 IR**——Scene 已归一（文字一律 `text` 原语、形状一律 rect/ellipse/path），对自由生成的 IR 写法变体免疫；node id 模型自取不可靠，用**文字内容当语义锚点**。v1 词汇 4 类（`textPresent` / `primitiveCount` / `arrowCount` / `stylePresent`），指标 = 候选级 + 断言级 + 按 kind 通过率。**v2 待补（临时边界）**：空间关系（A 在 B 上方）、`edgeBetween`（X→Y 真有边）需几何端点匹配，脆弱且工程量大，本期不做。另：多模型对照（gpt-5.5 + deepseek-v4-pro）暴露 **`primitiveCount path` 是「边数」的烂代理**——模型可合法地把多条边塞进一条多段 path（move+line+line），导致按 path 原语计数低估边数；v2 应补「数 path 段（line/curve 命令）」或「数 arrow mark」的断言 kind 来根治。校准方法论：**当两个独立模型都「失败」同一条断言，几乎可断定是断言写过严而非模型都错**（本轮据此修正 arrowCount 误套到「连线」类 prompt 等 5 条）。

## 更新记录

- **2026-06-12**：建档，框定打分阶梯 + 设计轴 + 开放决策；当日 brainstorm 把 **D1–D6 首切定稿**（L1 baseline，自由生成单发 + 持久化基线 diff + Vercel AI SDK）。
- **2026-06-14**：L1 baseline 落地后扩 core 语料至 36 条（含 advanced 档）；定 **D7 = L2 走断言集**并落地 v1（4 类确定性断言查编译后 Scene，候选级/断言级/按 kind 通过率 + 失败明细进报告，零 core 改动）；v2 空间/关系断言留待后续。
