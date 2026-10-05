import { createProcessor } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import type { DocDifficultyValue } from '../data';
import { getDocDifficultyReadingCoefficient } from '../data';

/** 文档正文与参考章节的阅读统计；不包含代码块及 JSX 属性 */
export type DocStats = {
  /** 正文非空白字符数，包含行内代码 */
  chars: number;
  /** API / Schema 参考章节的非空白字符数 */
  referenceChars: number;
  /** 文档中的预览示例数 */
  examples: number;
  /** 仅根据正文与阅读难度估算的分钟数 */
  readingMinutes: number;
};

/** 统计所需的 MDX 语法节点字段 */
type DocNode = {
  type: string;
  value?: string;
  name?: string | null;
  depth?: number;
  children?: Array<DocNode>;
};

const processor = createProcessor({ remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath] });

/** 只读取可见文本，不读取 JSX 属性、表达式、注释或模块源码 */
const textOf = (node: DocNode): string => {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';

  let text = '';

  for (const child of node.children ?? []) text += textOf(child);

  return text;
};

/** 按章节统计 MDX；无效源码交给既有编译错误 UI，不显示猜测的统计 */
export const computeDocStats = (mdx: string, lang: string, difficulty?: DocDifficultyValue): DocStats | null => {
  let root: DocNode;

  try {
    root = processor.parse(mdx);
  } catch {
    return null;
  }

  let chars = 0;
  let referenceChars = 0;
  let examples = 0;
  let referenceDepth: number | undefined;

  const visit = (node: DocNode): void => {
    if (node.type === 'heading' && node.depth !== undefined) {
      if (referenceDepth !== undefined && node.depth <= referenceDepth) referenceDepth = undefined;
      if (/^(?:API|Schema)\s*(?:参考|reference)?$/i.test(textOf(node).trim())) referenceDepth = node.depth;
    }

    if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'ComponentPreview')
      examples++;
    if (node.type === 'text' || node.type === 'inlineCode') {
      const count = Array.from((node.value ?? '').replace(/\s/gu, '')).length;
      if (referenceDepth === undefined) chars += count;
      else referenceChars += count;
    }

    for (const child of node.children ?? []) visit(child);
  };

  visit(root);
  const speed = lang.startsWith('zh') ? 500 : lang.startsWith('en') ? 900 : 650;

  return {
    chars,
    referenceChars,
    examples,
    readingMinutes: Math.max(1, Math.ceil((chars / speed) * getDocDifficultyReadingCoefficient(difficulty))),
  };
};
