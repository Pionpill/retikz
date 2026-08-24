import type { infer as ZodInfer } from 'zod';

import { definePathKind, PathBaseSchema } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { LayoutProps, LayoutRuntimeOptions } from '../../../src';

import { Layout, LayoutRuntimeMode, Node } from '../../../src';

describe('Layout public API', () => {
  it('exports Layout and its public option types from package entry', () => {
    const runtime: LayoutRuntimeOptions = {};
    const props: LayoutProps = { width: 120, height: 80, runtime };
    const svg = renderToStaticMarkup(
      <Layout {...props}>
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      </Layout>,
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
  });

  it('公开封闭 mode 常量与 static/retained 判别配置', () => {
    expect(LayoutRuntimeMode).toEqual({ Retained: 'retained', Static: 'static' });
  });

  it('pathKinds 接受带完整 subject schema 的自定义 Definition', () => {
    const schema = PathBaseSchema.extend({ kind: literal('precise-options') });
    const definition = definePathKind<ZodInfer<typeof schema>>({
      name: 'precise-options',
      schema,
      compile: context => context.emitStroke(context.path),
    });
    const pathKinds: NonNullable<LayoutProps['pathKinds']> = [definition];

    expect(pathKinds).toEqual([definition]);
  });
});
