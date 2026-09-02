import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { renderToSvgString } from '../../src/svg/serialize/to-string';

const STROKE = '#13579b';

const measuredLabel = () => ({ width: 20, height: 10 });

const render = (ir: IRScene): string =>
  renderToSvgString(compileToScene(ir, { measureText: measuredLabel }).scene, { idPrefix: 'label-interruption' });

const closedPath = (extra: Record<string, unknown> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      stroke: STROKE,
      label: { text: 'close', position: 0.9, sloped: true },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
        { type: 'step', kind: 'line', to: [100, 100] },
        { type: 'step', kind: 'cycle' },
      ],
      ...extra,
    },
  ],
});

describe('SVG Stroke Path label interruption', () => {
  it('serializes a centered label as two disjoint stroke paths instead of a continuous segment', () => {
    const svg = render({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'edge',
          stroke: STROKE,
          label: { text: 'gap', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    });

    expect(svg).toContain('d="M 0 0 L 39.5 0"');
    expect(svg).toContain('d="M 60.5 0 L 100 0"');
    expect(svg).not.toContain('d="M 0 0 L 100 0"');
  });

  it('serializes an interrupted closing edge without a Z command and preserves dash phase per fragment', () => {
    const svg = render(closedPath({ dashPattern: [11, 7], dashOffset: 3 }));

    expect(svg).toContain('d="M 0 0 L 100 0 L 100 100 L 40.35 40.35"');
    expect(svg).toContain('d="M 19.65 19.65 L 0 0"');
    expect(svg).not.toContain('d="M 0 0 L 100 0 L 100 100 Z"');
    expect(svg).toContain('stroke-dashoffset="3"');
    expect(svg).toMatch(/stroke-dashoffset="(?!3")[^"]+"/);
  });

  it('keeps marker-end on the original terminal drawable instead of a closing-edge fragment', () => {
    const svg = render(closedPath({ marks: [{ pos: 1, mark: { kind: 'arrow' } }] }));

    expect(svg).toMatch(/d="M 0 0 L 100 0 L 100 94\.9"[^>]*marker-end=/);
    expect(svg).toContain('d="M 100 100 L 40.35 40.35"');
    expect(svg).toContain('d="M 19.65 19.65 L 0 0"');
  });
});
