import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROVIDERS, availableProviderIds } from '../../src/llm/registry';

const ENV = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'EVAL_OPENAI_MODEL',
  'EVAL_DEEPSEEK_MODEL',
];

describe('provider registry gating', () => {
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
    for (const k of ENV) delete process.env[k];
  });
  afterEach(() => {
    for (const k of ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('登记三家 provider', () => {
    expect(PROVIDERS.map((p) => p.id).sort()).toEqual(['anthropic', 'deepseek', 'openai']);
  });

  it('无 key 时无可用 provider', () => {
    expect(availableProviderIds()).toEqual([]);
  });

  it('anthropic 有权威默认模型：设 key 即可用', () => {
    process.env.ANTHROPIC_API_KEY = 'x';
    expect(availableProviderIds()).toEqual(['anthropic']);
  });

  it('openai/deepseek 仅设 key、未配模型 id：不可用', () => {
    process.env.OPENAI_API_KEY = 'x';
    process.env.DEEPSEEK_API_KEY = 'x';
    expect(availableProviderIds()).toEqual([]);
  });

  it('openai/deepseek 设 key + 显式 EVAL_<P>_MODEL：才可用', () => {
    process.env.OPENAI_API_KEY = 'x';
    process.env.EVAL_OPENAI_MODEL = 'gpt-x';
    expect(availableProviderIds()).toEqual(['openai']);
  });
});
