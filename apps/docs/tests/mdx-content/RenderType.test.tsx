import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { walkType } from '@/modules/docs/components';
import { RenderType } from '@/modules/docs/components/mdx-content/zod-schema/RenderType';

describe('RenderType', () => {
  it('renders an array type as one code token', () => {
    const markup = renderToStaticMarkup(
      <RenderType
        repr={{
          kind: 'array',
          element: { kind: 'ref', name: 'TransformSchema', url: '/kernel/reference/schema/transform' },
          constraints: [],
        }}
      />,
    );

    expect(markup).toMatch(/bg-muted[^>]*><span[^>]*>TransformSchema<\/span>\[\]<\/span>$/);
    expect(markup.match(/bg-muted/g)).toHaveLength(1);
  });

  it('renders object union branches with discriminators, field types, and open properties', () => {
    const schema = z.union([
      z.strictObject({
        kind: z.literal('sum'),
        field: z.string(),
        as: z.string(),
      }),
      z.looseObject({
        kind: z.string(),
      }),
    ]);

    const markup = renderToStaticMarkup(<RenderType repr={walkType(schema)} />);

    expect(markup).toContain('kind:');
    expect(markup).toContain('&quot;sum&quot;');
    expect(markup).toContain('field:');
    expect(markup).toContain('string');
    expect(markup).toContain('[key: string]: unknown');
  });

  it('renders intersection members with an explicit separator', () => {
    const schema = z.intersection(
      z.strictObject({ kind: z.string() }),
      z.record(z.string(), z.union([z.string(), z.number()])),
    );

    const markup = renderToStaticMarkup(<RenderType repr={walkType(schema)} />);

    expect(markup).toContain('kind:');
    expect(markup).toContain('&amp;');
  });
});
