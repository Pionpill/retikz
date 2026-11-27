import type { AnyPathDefinition } from '@retikz/core';
import { definePath, PathSchema } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import { literal } from 'zod';

import type { LayoutProps } from '../../../src';
import { Layout, Node } from '../../../src';

describe('Layout 公共 API', () => {
  it('从包条目导出 Layout 及其公共选项类型', () => {
    const props: LayoutProps = {
      width: 120,
      height: 80,
      reconciler: { mode: 'incremental' },
      children: (
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      ),
    };
    const svg = renderToStaticMarkup(<Layout {...props} />);

    expect(svg).toContain('<svg');
    expect(svg).toMatch(/><\/svg>$/);
  });

  it('paths 接受带完整 subject schema 的自定义 Definition', () => {
    const schema = PathSchema.extend({ kind: literal('precise-options') });
    const definition = definePath<ZodInfer<typeof schema>>({
      name: 'precise-options',
      schema,
      compile: context => context.emitStroke(),
    });
    const paths: ReadonlyArray<AnyPathDefinition> = [definition];

    expect(paths).toEqual([definition]);
  });
});
