import { mkdirSync, writeFileSync } from 'node:fs';
import { sceneContractString } from './schema/contract';
import { loadCorpus } from './corpus/load';
import { availableProviderIds, createClients } from './llm/registry';
import { runEval } from './run';
import { aggregate } from './report/aggregate';
import { formatMarkdown } from './report/format';

/** 解析 EVAL_K：要求正整数，非法 fail fast（避免 0/负/NaN 产出「0 样本」却报成功） */
const parseK = (raw: string | undefined): number => {
  if (raw === undefined) return 1;
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new Error(`EVAL_K 必须是 >=1 的整数，收到：${JSON.stringify(raw)}`);
  }
  return Number(raw);
};

const main = async (): Promise<void> => {
  const k = parseK(process.env.EVAL_K);

  const clients = createClients();
  if (clients.length === 0) {
    console.error(
      '无可用 provider：anthropic 设 ANTHROPIC_API_KEY 即可；openai / deepseek 需同时设 key 与 EVAL_OPENAI_MODEL / EVAL_DEEPSEEK_MODEL。',
    );
    process.exitCode = 1;
    return;
  }
  console.log(`可用 provider：${availableProviderIds().join(', ')} · K=${k}`);

  const corpus = loadCorpus(new URL('../corpus/core.json', import.meta.url));
  const schemaJson = sceneContractString();

  const records = await runEval({
    clients,
    corpus,
    schemaJson,
    k,
    onRecord: (r) =>
      console.log(`  ${r.promptId} · ${r.model} · k${r.kIndex} → zod=${r.zodOk} compile=${r.compileOk}`),
  });

  const report = aggregate(records);
  const generatedAt = new Date().toISOString();
  const md = formatMarkdown(report, { generatedAt });

  const outDir = new URL('../results/', import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const outFile = new URL(`./${generatedAt.replace(/[:.]/g, '-')}.md`, outDir);
  writeFileSync(outFile, md, 'utf8');

  console.log(`\n${md}`);
  console.log(`\n报告已写入：${outFile.pathname}`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
