import { DEFAULT_RESOLVED_THEME } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { assembleDiagram, defineDiagramThemeStyle, resolveDiagramAppearance } from '../../src/foundation';

describe('Diagram private foundation adversarial boundaries', () => {
  it('does not trim authored text while still rejecting truly empty content', () => {
    expect(() => resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, { title: {} }, undefined, new Map())).toThrow();
    expect(() =>
      assembleDiagram({
        presentation: { title: ' ' },
        drawing: { type: 'node', position: [0, 0], text: 'drawing' },
        appearance: resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map()),
      }),
    ).not.toThrow();
  });

  it('rejects Legend-specific Frame fields when no Legend is present', () => {
    const appearance = resolveDiagramAppearance(DEFAULT_RESOLVED_THEME, undefined, undefined, new Map());
    expect(() =>
      assembleDiagram({
        presentation: { title: 'Title' },
        drawing: { type: 'node', position: [0, 0], text: 'drawing' },
        frame: { legendPosition: 'left' },
        appearance,
      }),
    ).toThrow(/requires a Legend/i);
  });

  it('wraps invalid Definition callback output without falling back to Neutral', () => {
    const style = defineDiagramThemeStyle({
      name: 'broken',
      resolve: () => JSON.parse('{"title":{"unknown":true}}'),
    });
    expect(() =>
      resolveDiagramAppearance(
        { ...DEFAULT_RESOLVED_THEME, style: 'broken' },
        undefined,
        undefined,
        new Map([['broken', style]]),
      ),
    ).toThrow(/resolution failed/i);
  });
});
