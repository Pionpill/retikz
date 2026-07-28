import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { LayoutProps, LayoutRuntimeOptions } from '../../../src';

import { Layout, Node } from '../../../src';

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
});
