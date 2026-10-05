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

const compiledSources = new Map<string, Promise<string>>();

const MAX_CACHED_SOURCES = 32;

/** 按完整源码复用编译任务；限制缓存数量，源码更新自动使用新结果，失败允许重试 */
export const compileMdx = (source: string): Promise<string> => {
  const cached = compiledSources.get(source);
  if (cached) {
    compiledSources.delete(source);
    compiledSources.set(source, cached);
    return cached;
  }

  const pending = createCompileOptions(source)
    .then(options => compile(source, options))
    .then(String)
    .catch(error => {
      if (compiledSources.get(source) === pending) compiledSources.delete(source);
      throw error;
    });
  compiledSources.set(source, pending);
  if (compiledSources.size > MAX_CACHED_SOURCES) {
    const oldest = compiledSources.keys().next().value;
    if (oldest !== undefined) compiledSources.delete(oldest);
  }

  return pending;
};
