import { fetchLlmsTxt } from './llms-txt';

export type ContextMode = 'lean' | 'balanced' | 'heavy';

export type Lang = 'zh' | 'en';

export type CurrentPage = {
  title: string;
  mdx: string;
  lang: Lang;
  /** GitHub raw URL of the page mdx；空状态深链按钮需要把这个 URL 喂给外部 AI */
  rawUrl: string;
};

/**
 * 按 contextMode 拼 system message
 * @description lean=只送当前页；balanced=当前页 + 全站 llms.txt 索引；heavy=v1 暂同 balanced，
 *   v1.1 再扩展自动拉 demo 源码
 */
export const composeSystem = async (mode: ContextMode, page: CurrentPage | null): Promise<string> => {
  const lang = page?.lang ?? 'zh';
  const intro =
    lang === 'zh'
      ? '你是 retikz（TikZ React 适配库）的文档助手。基于下面提供的当前页内容回答用户的问题，回答用中文。需要引用其他文档页时给出对应的 markdown 链接，链接 path 用站内绝对路径（以 / 开头）。'
      : 'You are a documentation assistant for retikz (a TikZ React adapter). Answer user questions based on the current page content provided below. Respond in English. When referencing other documentation pages, include a markdown link using a site-relative path (starting with /).';

  if (!page) return intro;

  const pageBlock = `\n\n## Current page: ${page.title}\n\n${page.mdx}`;
  if (mode === 'lean') return intro + pageBlock;

  const llms = await fetchLlmsTxt();
  if (!llms) return intro + pageBlock;
  return `${intro}${pageBlock}\n\n## Site index (other pages)\n\n${llms}`;
};
