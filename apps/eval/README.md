# @retikz/eval

LLM 生成 retikz IR 的准确性评测（L1 结构有效性 baseline）。设计见 `notes/eval/design.md`。

## 这是什么

把「core schema 契约 → LLM 自由生成 → zod 校验 + compileToScene 打分 → 报告」跑成一条可回归流水线。
L1 只看结构有效性两层：能不能过 zod、能不能过 compile。语义 / 视觉（L2 / L3）后置。

## 跑法

```bash
# anthropic：设 key 即可用（权威默认模型 claude-opus-4-8）
export ANTHROPIC_API_KEY=...

# openai / deepseek：必须同时设 key 与显式模型 id 才启用（不内置猜测默认）
export OPENAI_API_KEY=...
export EVAL_OPENAI_MODEL=...        # 例如某个当前有效的 OpenAI chat 模型 id
export DEEPSEEK_API_KEY=...
export EVAL_DEEPSEEK_MODEL=deepseek-chat

# 可选：每条 prompt 跑 K 次（默认 1，必须是 >=1 整数，非法会 fail fast）
export EVAL_K=3
# 可选：覆盖 anthropic 模型 id
export EVAL_ANTHROPIC_MODEL=claude-opus-4-8

pnpm --filter @retikz/eval eval
```

只跑「有 key 且能定到模型 id」的家。报告写入 `apps/eval/results/<timestamp>.md`（不入库）。

## 结构

- `corpus/` 自然语言种子语料（按 core × 难度档）
- `src/schema` schema 契约（`z.toJSONSchema(SceneSchema)`）
- `src/llm` 薄 provider adapter（Vercel AI SDK，三家 env-gated）
- `src/run` 编排，`src/score` L1 打分，`src/report` 聚合 + markdown

## 后置

L2 语义 / L3 视觉、structured output 模式、self-repair、K 次回归基线 diff、plot 语料、CI 门禁。
