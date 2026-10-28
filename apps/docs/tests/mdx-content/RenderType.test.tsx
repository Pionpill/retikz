import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { walkType } from '@/modules/docs/components';
import { RenderType } from '@/modules/docs/components/mdx-content/zod-schema/RenderType';

describe('RenderType', () => {
  it('将数组类型呈现为一个代码标记', () => {
    const markup = renderToStaticMarkup(
      <RenderType
        name="ExampleSchema.transforms"
        repr={{
          kind: 'array',
          element: { kind: 'ref', name: 'TransformSchema', url: '/kernel/components/scope/reference' },
          constraints: [],
        }}
      />,
    );

    expect(markup).toMatch(/bg-muted[^>]*><span[^>]*>TransformSchema<\/span>\[\]<\/span>$/);
    expect(markup.match(/bg-muted/g)).toHaveLength(1);
  });

  it('使用判别字段、字段类型和开放属性渲染对象联合分支', () => {
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

    const markup = renderToStaticMarkup(<RenderType repr={walkType(schema)} name="ExampleSchema.mode" />);

    expect(markup).toContain('kind:');
    expect(markup).toContain('&quot;sum&quot;');
    expect(markup).toContain('field:');
    expect(markup).toContain('string');
    expect(markup).toContain('[key: string]: unknown');
  });

  it('使用显式分隔符呈现交集成员', () => {
    const schema = z.intersection(
      z.strictObject({ kind: z.string() }),
      z.record(z.string(), z.union([z.string(), z.number()])),
    );

    const markup = renderToStaticMarkup(<RenderType repr={walkType(schema)} name="ExampleSchema.mode" />);

    expect(markup).toContain('kind:');
    expect(markup).toContain('&amp;');
  });
});
