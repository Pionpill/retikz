# @retikz/eval

LLM 生成 retikz IR 的准确性评测（L1 结构有效性 + L2 语义断言）。设计见 `notes/eval/design.md`。

## 这是什么

把「core schema 契约 → LLM 自由生成 → zod 校验 + compileToScene 打分 → 断言打分 → 报告」跑成一条可回归流水线。

- **L1 结构有效性**：能不能过 zod、能不能过 compile（两层）。
- **L2 语义正确性**：对编译后的 Scene 跑一组**确定性断言**，测「画对没」——L1 在强模型上会饱和到 100%（只测「合法」不测「对」），L2 才有区分信号。

L3 视觉保真后置。

## L2 断言

断言存在 corpus 每条 prompt 的可选 `assertions` 字段里，**查编译后 Scene 不查 IR**（Scene 已归一：文字一律 `text` 原语、形状一律 rect/ellipse/path，对自由生成的写法变体免疫；node id 模型自取不可靠，故用**文字内容当语义锚点**）。

v1 词汇 4 类：

| kind | 测什么 |
| --- | --- |
| `textPresent` | 某段文字在不在（`match: contains`(默认)/`exact`） |
| `primitiveCount` | 某类原语（rect/ellipse/text/path/group）数量满足 `op value`（计数下钻 group） |
| `arrowCount` | 带箭头的 path 数量满足 `op value` |
| `stylePresent` | 至少一个原语带某样式（fill / dashed / stroke） |

指标：**候选级通过率**（一条候选所有断言都过）+ **断言级通过率**（pass 断言 / 总断言，主区分信号）+ 按 kind 通过率 + 断言失败明细。L1 挂或 prompt 无断言的候选不进 L2 分母（计 skipped）。

> **v1 边界（临时，留 v2）**：只做上述 4 类。**空间关系**（A 在 B 上方）与 **edgeBetween**（X 节点→Y 节点真有边）需几何端点匹配、脆弱且工程量大，v1 不做。断言作者原则：只断言 prompt 明说的、计数一律 `>=`（多画装饰不算错）、不可判定的跳过。

## 跑法（推荐：.env）

`eval` 脚本会自动加载本包目录下的 `.env`（缺失也不报错）。复制模板填 key 即可：

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
# 编辑 .env 填入 ANTHROPIC_API_KEY（openai/deepseek 还需各自的 EVAL_<P>_MODEL）
pnpm --filter @retikz/eval eval
```

`.env` 已被仓库根 `.gitignore` 忽略，不会入库。可配置的变量见 `.env.example`：

- `ANTHROPIC_API_KEY` —— 填了即可用（权威默认模型 `claude-opus-4-8`）
- `OPENAI_API_KEY` + `EVAL_OPENAI_MODEL` —— openai 须同时设 key 与显式模型 id 才启用
- `DEEPSEEK_API_KEY` + `EVAL_DEEPSEEK_MODEL` —— 同上
- `EVAL_<P>_BASE_URL` —— 覆盖该家端点（代理 / 网关 / 兼容端点），缺省走官方端点（`EVAL_ANTHROPIC_BASE_URL` / `EVAL_OPENAI_BASE_URL` / `EVAL_DEEPSEEK_BASE_URL`）
- `EVAL_K` —— 每条 prompt 跑几次（默认 1，须 >=1 整数，非法 fail fast）
- `EVAL_ANTHROPIC_MODEL` —— 覆盖 anthropic 模型 id

只跑「有 key 且能定到模型 id」的家。报告写入 `apps/eval/results/<timestamp>.md`（不入库）。

> 注：Node `--env-file` 对**已存在于 shell 的同名环境变量让位**（不覆盖）。若你 shell 里已 export 过 `ANTHROPIC_API_KEY`，它会盖过 `.env` 里的值——以 shell 为准。

不想用 .env 时，直接在环境里 export 这些变量再跑也一样。

## 结构

- `corpus/` 自然语言种子语料 + L2 断言（按 core × 难度档）
- `src/schema` schema 契约（`z.toJSONSchema(SceneSchema)`）
- `src/llm` 薄 provider adapter（Vercel AI SDK，三家 env-gated）
- `src/assert` 断言 schema / 求值器（查编译后 Scene）
- `src/run` 编排，`src/score` L1+L2 打分，`src/report` 聚合 + markdown

## 后置

L2 v2 断言（空间关系 / edgeBetween）、L3 视觉、structured output 模式、self-repair、K 次回归基线 diff、plot 语料、CI 门禁。
