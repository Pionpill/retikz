import { createOpenAiCompatProvider } from './openai-compat';

/** DeepSeek 走 OpenAI-Compatible 端点；usage 默认随流返回，无需显式 include_usage */
export const deepseekProvider = createOpenAiCompatProvider({
  id: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
});
