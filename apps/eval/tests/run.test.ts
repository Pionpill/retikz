import { describe, expect, it } from 'vitest';
import { fakeClient } from './llm/fake';
import { runEval } from '../src/run';
import { type CorpusPrompt } from '../src/corpus/types';
import { type LlmClient } from '../src/llm/types';

const corpus: Array<CorpusPrompt> = [
  { id: 'c1', category: 'core', difficulty: 'single', prompt: 'p1' },
  { id: 'c2', category: 'core', difficulty: 'composite', prompt: 'p2' },
];

const goodIr = JSON.stringify({ version: 1, type: 'scene', children: [] });
const badIr = JSON.stringify({ version: 2, type: 'scene', children: [] });

describe('runEval', () => {
  it('每条 prompt × 每个 client × K 产出一条记录', async () => {
    const clients = [fakeClient('fake:good', [goodIr]), fakeClient('fake:bad', [badIr])];
    const records = await runEval({ clients, corpus, schemaJson: '{}', k: 2 });
    expect(records).toHaveLength(2 * 2 * 2); // prompt × client × K
  });

  it('记录携带维度与两层打分', async () => {
    const clients = [fakeClient('fake:good', [goodIr])];
    const records = await runEval({ clients, corpus, schemaJson: '{}', k: 1 });
    const r = records[0];
    expect(r).toMatchObject({
      promptId: 'c1',
      category: 'core',
      difficulty: 'single',
      model: 'fake:good',
      kIndex: 0,
      zodOk: true,
      compileOk: true,
    });
  });

  it('模型返回非 JSON：记为 zod 失败、stage=extract', async () => {
    const clients = [fakeClient('fake:prose', ['抱歉我无法生成。'])];
    const records = await runEval({ clients, corpus, schemaJson: '{}', k: 1 });
    expect(records[0].zodOk).toBe(false);
    expect(records[0].compileOk).toBe(false);
    expect(records[0].failure?.stage).toBe('extract');
  });

  it('provider 抛错：记为 llm 失败、不中断整批', async () => {
    const boom: LlmClient = {
      id: 'fake:boom',
      generate: () => Promise.reject(new Error('401 unauthorized')),
    };
    const records = await runEval({ clients: [boom], corpus, schemaJson: '{}', k: 1 });
    expect(records).toHaveLength(corpus.length); // 每条 prompt 仍各出一条记录
    expect(records[0].zodOk).toBe(false);
    expect(records[0].compileOk).toBe(false);
    expect(records[0].failure?.stage).toBe('llm');
    expect(records[0].failure?.reason).toContain('401');
  });
});

describe('runEval L2', () => {
  const helloIr = JSON.stringify({
    version: 1,
    type: 'scene',
    children: [{ type: 'node', position: [0, 0], text: 'Hello', shape: 'rectangle' }],
  });
  const l2Corpus: Array<CorpusPrompt> = [
    {
      id: 'p1',
      category: 'core',
      difficulty: 'single',
      prompt: 'x',
      assertions: [
        { kind: 'textPresent', text: 'Hello' },
        { kind: 'textPresent', text: 'NOPE' },
      ],
    },
    { id: 'p2', category: 'core', difficulty: 'single', prompt: 'y' }, // 无断言 → l2 null
  ];

  it('有断言时跑 L2，无断言时 l2=null', async () => {
    const clients = [fakeClient('fake:hello', [helloIr, helloIr])];
    const records = await runEval({ clients, corpus: l2Corpus, schemaJson: '{}', k: 1 });
    const p1 = records.find((r) => r.promptId === 'p1');
    const p2 = records.find((r) => r.promptId === 'p2');
    expect(p1?.l2).toEqual({ total: 2, passed: 1, results: expect.any(Array) });
    expect(p2?.l2).toBeNull();
  });

  it('L1 挂（非 JSON）时 l2=null', async () => {
    const clients = [fakeClient('fake:prose', ['抱歉。'])];
    const records = await runEval({
      clients,
      corpus: [l2Corpus[0]],
      schemaJson: '{}',
      k: 1,
    });
    expect(records[0].l2).toBeNull();
  });
});
