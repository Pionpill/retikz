import { type AssertionResult } from './assert/types';
import { type CorpusPrompt } from './corpus/types';
import { extractJson } from './extract/json';
import { type LlmClient } from './llm/types';
import { scoreL1 } from './score/l1';
import { scoreL2 } from './score/l2';
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
  /** L2 断言结果；L1 挂或 prompt 无断言时为 null（未到达 L2） */
  l2: { total: number; passed: number; results: Array<AssertionResult> } | null;
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

const REASON_NO_JSON = 'no JSON object found in model output';

/** 抽 JSON + L1 +（L1 通过且有断言时）L2 打分；抽取失败归 extract 层，l2=null */
const scoreText = (
  text: string,
  assertions: CorpusPrompt['assertions'],
): Pick<RunRecord, 'zodOk' | 'compileOk' | 'failure' | 'l2'> => {
  const candidate = extractJson(text);
  if (candidate === null) {
    return {
      zodOk: false,
      compileOk: false,
      failure: { stage: 'extract', reason: REASON_NO_JSON },
      l2: null,
    };
  }
  const l1 = scoreL1(candidate);
  const l2 =
    l1.compileOk && l1.scene && assertions && assertions.length > 0
      ? scoreL2(l1.scene, assertions)
      : null;
  return { zodOk: l1.zodOk, compileOk: l1.compileOk, failure: l1.failure, l2 };
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
          record = { ...base, ...scoreText(text, task.assertions) };
        } catch (err) {
          // provider 调用失败（鉴权 / 限流 / 模型名错误 / 网络）——单条计 llm 失败，不拖垮整批
          record = {
            ...base,
            zodOk: false,
            compileOk: false,
            failure: { stage: 'llm', reason: err instanceof Error ? err.message : String(err) },
            l2: null,
          };
        }
        records.push(record);
        onRecord?.(record);
      }
    }
  }

  return records;
};
