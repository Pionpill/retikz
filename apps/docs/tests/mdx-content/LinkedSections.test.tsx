import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '@/modules/docs/components/mdx-content/components';
import { getLinkedSectionRowSizes } from '@/modules/docs/components/mdx-content/linked-sections';

type LinkedSectionsProbeProps = {
  items: Array<{
    title: string;
    description: string;
    url: string;
  }>;
};

const getLinkedSections = (): FC<LinkedSectionsProbeProps> => {
  const LinkedSections = mdxComponents.LinkedSections;

  expect(LinkedSections).toBeTypeOf('function');

  return LinkedSections as FC<LinkedSectionsProbeProps>;
};

describe('<LinkedSections>', () => {
  it('均分项目以避免四项在三列宽度下形成孤立末行', () => {
    expect(getLinkedSectionRowSizes(4, 3)).toEqual([2, 2]);
    expect(getLinkedSectionRowSizes(5, 3)).toEqual([3, 2]);
    expect(getLinkedSectionRowSizes(7, 3)).toEqual([3, 2, 2]);
  });

  it('renders configured links in independently equal-width rows', () => {
    const LinkedSections = getLinkedSections();
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LinkedSections
          items={[
            {
              title: 'Geometry primitives',
              description: 'Points, vectors, and curves',
              url: '/kernel/packages/math/primitives',
            },
            { title: 'External guide', description: 'Opens in a new tab', url: 'https://example.com/guide' },
          ]}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('data-linked-sections');
    expect(html).toContain('data-linked-section-row');
    expect(html).toContain('grid-template-columns:repeat(1, minmax(0, 1fr))');
    expect(html).toContain('Geometry primitives');
    expect(html).toContain('Points, vectors, and curves');
    expect(html).toContain('href="/kernel/packages/math/primitives"');
    expect(html).toContain('href="https://example.com/guide"');
    expect(html).toContain('target="_blank"');
  });
});
