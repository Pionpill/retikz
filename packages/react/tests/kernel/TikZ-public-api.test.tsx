import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Node, TikZ, type TikZProps } from '../../src';

describe('TikZ public API', () => {
  it('exports TikZ and TikZProps from package entry', () => {
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
