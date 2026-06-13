import { type CorpusPrompt } from './corpus/types';
import { extractJson } from './extract/json';
import { type LlmClient } from './llm/types';
import { type L1Result, scoreL1 } from './score/l1';
import { buildPrompt } from './prompt/build';

/** 单次（一条 prompt × 一个 model × 一个 K）的扁平评测记录 */
export type RunRecord = {
  promptId: string;
  category: CorpusPrompt['category'];
  difficulty: CorpusPrompt['difficulty'];
  model: string;
  kIndex: number;
  zodOk: boolean;
  compileOk: boolean;
  failure?: { stage: 'llm' | 'extract' | 'zod' | 'compile'; reason: string };
};

export type RunOptions = {
  clients: Array<LlmClient>;
  corpus: Array<CorpusPrompt>;
  schemaJson: string;
  /** 每条 prompt 对每个 model 跑的次数（正视 LLM 非确定性） */
  k: number;
  /** 可选进度回调（CLI 打点用） */
  onRecord?: (record: RunRecord) => void;
};

const scoreText = (text: string): { result: L1Result; extractFailed: boolean } => {
  const candidate = extractJson(text);
  if (candidate === null) {
    return {
      extractFailed: true,
      result: {
        zodOk: false,
        compileOk: false,
        failure: { stage: 'zod', reason: 'no JSON object found in model output' },
      },
    };
  }
  return { extractFailed: false, result: scoreL1(candidate) };
};

/** 跑完整评测：prompt × client × K，逐条生成→抽取→打分，返回扁平记录数组 */
export const runEval = async (options: RunOptions): Promise<Array<RunRecord>> => {
  const { clients, corpus, schemaJson, k, onRecord } = options;
  const records: Array<RunRecord> = [];

  for (const task of corpus) {
    const prompt = buildPrompt(task, schemaJson);
    for (const client of clients) {
      for (let kIndex = 0; kIndex < k; kIndex += 1) {
        const base = {
          promptId: task.id,
          category: task.category,
          difficulty: task.difficulty,
          model: client.id,
          kIndex,
        };
        let record: RunRecord;
        try {
          const text = await client.generate(prompt);
          const { result, extractFailed } = scoreText(text);
          record = {
            ...base,
            zodOk: result.zodOk,
            compileOk: result.compileOk,
            failure: extractFailed
              ? { stage: 'extract', reason: 'no JSON object found in model output' }
              : result.failure,
          };
        } catch (err) {
          // provider 调用失败（鉴权 / 限流 / 模型名错误 / 网络）——单条计 llm 失败，不拖垮整批
          record = {
            ...base,
            zodOk: false,
            compileOk: false,
            failure: { stage: 'llm', reason: err instanceof Error ? err.message : String(err) },
          };
        }
        records.push(record);
        onRecord?.(record);
      }
    }
  }

  return records;
};
