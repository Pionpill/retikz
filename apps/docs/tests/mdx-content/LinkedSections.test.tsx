import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '@/modules/docs/components/mdx-content/components';

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
  it('renders configured links in an adaptive 250px to 400px grid', () => {
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
    expect(html).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))]');
    expect(html).toContain('max-w-[400px]');
    expect(html).toContain('Geometry primitives');
    expect(html).toContain('Points, vectors, and curves');
    expect(html).toContain('href="/kernel/packages/math/primitives"');
    expect(html).toContain('href="https://example.com/guide"');
    expect(html).toContain('target="_blank"');
  });
});
