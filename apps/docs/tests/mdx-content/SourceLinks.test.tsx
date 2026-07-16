import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import i18n from '@/i18n';
import { mdxComponents } from '@/modules/docs/components/mdx-content/components';

type SourceLinksProbeProps = {
  sources: Array<{
    label: string;
    path: string;
    startLine?: number;
    endLine?: number;
  }>;
};

const getSourceLinks = (): FC<SourceLinksProbeProps> => {
  const SourceLinks = mdxComponents.SourceLinks;
  expect(SourceLinks).toBeTypeOf('function');
  return SourceLinks as FC<SourceLinksProbeProps>;
};

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

afterAll(async () => {
  await i18n.changeLanguage('zh');
});

describe('<SourceLinks>', () => {
  it('把仓库相对路径和行号范围渲染为次要 GitHub 源码入口', () => {
    const SourceLinks = getSourceLinks();
    const html = renderToStaticMarkup(
      <SourceLinks
        sources={[
          {
            label: '输入归一',
            path: 'packages/kernel/react/src/kernel/runtime/Layout.tsx',
            startLine: 399,
            endLine: 455,
          },
        ]}
      />,
    );

    expect(html).toContain('源码入口：');
    expect(html).toContain('输入归一');
    expect(html).toContain(
      'href="https://github.com/Pionpill/retikz/blob/main/packages/kernel/react/src/kernel/runtime/Layout.tsx#L399-L455"',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<svg');
  });

  it('首个链接前不显示横线，后续链接之间保留点分隔符', () => {
    const SourceLinks = getSourceLinks();
    const html = renderToStaticMarkup(
      <SourceLinks
        sources={[
          { label: '输入归一', path: 'packages/kernel/react/src/kernel/runtime/Layout.tsx' },
          { label: '根 Scope', path: 'packages/kernel/react/src/kernel/adapter/builder.ts' },
        ]}
      />,
    );

    expect(html).not.toContain('—');
    expect(html).toContain('·');
  });

  it('省略行号时链接到完整文件', () => {
    const SourceLinks = getSourceLinks();
    const html = renderToStaticMarkup(
      <SourceLinks sources={[{ label: 'Layout', path: 'packages/kernel/react/src/kernel/runtime/Layout.tsx' }]} />,
    );

    expect(html).toContain(
      'href="https://github.com/Pionpill/retikz/blob/main/packages/kernel/react/src/kernel/runtime/Layout.tsx"',
    );
  });

  it('跟随当前文档语言显示英文标题', async () => {
    await i18n.changeLanguage('en');
    const SourceLinks = getSourceLinks();
    const html = renderToStaticMarkup(
      <SourceLinks
        sources={[{ label: 'input normalization', path: 'packages/kernel/react/src/kernel/runtime/Layout.tsx' }]}
      />,
    );

    expect(html).toContain('Source:');
    await i18n.changeLanguage('zh');
  });

  it('没有源码项时不渲染容器', () => {
    const SourceLinks = getSourceLinks();
    expect(renderToStaticMarkup(<SourceLinks sources={[]} />)).toBe('');
  });
});
