import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';

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
    expectTypeOf({ mode: 'static' as const }).toMatchTypeOf<LayoutRuntimeOptions>();
    expectTypeOf({ mode: 'retained' as const, updateStrategy: 'full' as const }).toMatchTypeOf<LayoutRuntimeOptions>();
    expectTypeOf({
      mode: 'static' as const,
      updateStrategy: 'full' as const,
    }).not.toMatchTypeOf<LayoutRuntimeOptions>();
  });
});
