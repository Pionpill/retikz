import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Layout, type LayoutProps, Node, TikZ, type TikZProps } from '../../src';

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

  it('keeps TikZ / TikZProps as a deprecated alias from package entry', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props: TikZProps = { width: 120, height: 80 };
    const svg = renderToStaticMarkup(
      <TikZ {...props}>
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      </TikZ>,
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
  });
});
