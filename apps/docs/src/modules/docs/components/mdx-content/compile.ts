import type { CompileOptions } from '@mdx-js/mdx';

import { compile } from '@mdx-js/mdx';
import rehypeMdxCodeProps from 'rehype-mdx-code-props';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

const createCompileOptions = async (source: string): Promise<CompileOptions> => {
  const rehypePlugins: NonNullable<CompileOptions['rehypePlugins']> = [
    rehypeSlug,
    [rehypeMdxCodeProps, { tagName: 'code' }],
  ];

  if (source.includes('$')) {
    const { default: rehypeMathJax } = await import('rehype-mathjax');
    rehypePlugins.unshift(rehypeMathJax);
  }

  return {
    outputFormat: 'function-body',
    development: import.meta.env.DEV,
    remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath],
    // rehype-slug 给 h1-h6 注 id（TOC 跳转 / 锚链接靠它）；rehype-mdx-code-props 把围栏 meta 转成 JSX props，必须最后跑（把 hast 转 JSX 后下游插件就处理不了了）
    rehypePlugins,
  };
};

/** 编译页面 MDX，按需加载 MathJax 以转换正文公式 */
export const compileMdx = async (source: string): Promise<string> => {
  const compiled = await compile(source, await createCompileOptions(source));
  return String(compiled);
};
