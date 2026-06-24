import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Layout, type LayoutProps, Node } from '../../src';

describe('Layout public API', () => {
  it('exports Layout and LayoutProps from package entry', () => {
    const props: LayoutProps = { width: 120, height: 80 };
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
