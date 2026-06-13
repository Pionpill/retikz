# @retikz/eval

LLM 生成 retikz IR 的准确性评测（L1 结构有效性 baseline）。设计见 `notes/eval/design.md`。

## 这是什么

把「core schema 契约 → LLM 自由生成 → zod 校验 + compileToScene 打分 → 报告」跑成一条可回归流水线。
L1 只看结构有效性两层：能不能过 zod、能不能过 compile。语义 / 视觉（L2 / L3）后置。

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
- `EVAL_K` —— 每条 prompt 跑几次（默认 1，须 >=1 整数，非法 fail fast）
- `EVAL_ANTHROPIC_MODEL` —— 覆盖 anthropic 模型 id

只跑「有 key 且能定到模型 id」的家。报告写入 `apps/eval/results/<timestamp>.md`（不入库）。

> 注：Node `--env-file` 对**已存在于 shell 的同名环境变量让位**（不覆盖）。若你 shell 里已 export 过 `ANTHROPIC_API_KEY`，它会盖过 `.env` 里的值——以 shell 为准。

不想用 .env 时，直接在环境里 export 这些变量再跑也一样。

## 结构

- `corpus/` 自然语言种子语料（按 core × 难度档）
- `src/schema` schema 契约（`z.toJSONSchema(SceneSchema)`）
- `src/llm` 薄 provider adapter（Vercel AI SDK，三家 env-gated）
- `src/run` 编排，`src/score` L1 打分，`src/report` 聚合 + markdown

## 后置

L2 语义 / L3 视觉、structured output 模式、self-repair、K 次回归基线 diff、plot 语料、CI 门禁。
