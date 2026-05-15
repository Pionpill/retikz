import { createOpenAiCompatProvider } from './openai-compat';

/** OpenAI 走官方端点；要拿 usage 必须 stream_options.include_usage=true */
export const openaiProvider = createOpenAiCompatProvider({
  id: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  includeUsage: true,
});
