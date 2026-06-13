import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type CorpusPrompt, CorpusPromptSchema } from './types';

/** 从 JSON 文件加载并校验一组语料；接受路径字符串或 file URL */
export const loadCorpus = (source: string | URL): Array<CorpusPrompt> => {
  const raw = readFileSync(source, 'utf8');
  return z.array(CorpusPromptSchema).parse(JSON.parse(raw));
};
