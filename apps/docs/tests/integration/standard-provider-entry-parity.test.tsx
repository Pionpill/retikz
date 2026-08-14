import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { Layout } from '@retikz/react';
import { DiamondArrowDefinition } from '@retikz/standard/arrow';
import { CompoundClipDefinition } from '@retikz/standard/clip';
import { CrossShapeDefinition } from '@retikz/standard/shape';
import { renderToSvgString, toSceneResult } from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: {
        kind: 'compound',
        children: [{ kind: 'circle', cx: 0, cy: 0, r: 36 }],
      },
      children: [{ type: 'node', position: [0, 0], shape: 'cross', text: 'optional shape' }],
    },
    {
      type: 'path',
      marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'diamond' } }],
      children: [
        { type: 'step', kind: 'move', to: [60, 0] },
        { type: 'step', kind: 'line', to: [120, 0] },
      ],
    },
  ],
};

const definitions = {
  shapes: [CrossShapeDefinition],
  arrows: [DiamondArrowDefinition],
  clips: [CompoundClipDefinition],
} as const;

describe('Standard provider entry integration', () => {
  it('keeps direct Core compile and Vanilla compilation scene-equivalent with exact capability entries', () => {
    const direct = compileToScene(source, definitions);
    const vanilla = toSceneResult(source, { compile: definitions });
    const svg = renderToSvgString(source, { compile: definitions });

    expect(vanilla.compileResult?.scene).toEqual(direct.scene);
    expect(vanilla.compileResult?.artifacts).toEqual(direct.artifacts);
    expect(svg).toContain('optional shape');
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('<marker');
  });

  it('renders the same explicitly assembled capability set through React SSR', () => {
    const markup = renderToStaticMarkup(<Layout ir={source} {...definitions} idPrefix="standard-provider-entry" />);

    expect(markup).toContain('<svg');
    expect(markup).toContain('optional shape');
    expect(markup).toContain('<clipPath');
    expect(markup).toContain('<marker');
  });
});
