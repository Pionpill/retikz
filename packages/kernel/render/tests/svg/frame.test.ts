import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { RenderReadonlyLayer } from '../../src/runtime';

import { buildSvgDocument, buildSvgFrameDocument, renderFrameToSvgString } from '../../src/svg';

const primary: Scene = {
  layout: { x: 0, y: 0, width: 100, height: 60 },
  primitives: [{ type: 'rect', id: 'primary', x: 10, y: 12, width: 20, height: 16, fill: '#ef4444' }],
};

const layerScene = (color: string): Scene => ({
  layout: { x: -100, y: -100, width: 500, height: 500 },
  resources: [
    {
      kind: 'paint',
      id: 'shared',
      spec: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color },
          { offset: 1, color: '#ffffff' },
        ],
      },
    },
  ],
  primitives: [{ type: 'rect', x: 0, y: 0, width: 30, height: 20, fill: { kind: 'resourceRef', id: 'shared' } }],
});

const layers: ReadonlyArray<RenderReadonlyLayer> = [
  { key: 'first', scene: layerScene('#7c3aed'), transform: [1, 0, 0, 1, 12, 8] },
  { key: 'second', scene: layerScene('#dc2626'), transform: [1, 0, 0, 1, -4, 6] },
];

describe('SVG static readonly layers', () => {
  it('keeps the primary viewport and appends ordinary layer Scenes in input order', () => {
    const document = buildSvgFrameDocument({ primary, layers }, { idPrefix: 'frame' });
    const children = document.children ?? [];
    const primaryIndex = children.findIndex(
      child => typeof child !== 'string' && child.attrs['data-retikz-id'] === 'primary',
    );
    const layerGroups = children.filter(
      child => typeof child !== 'string' && child.attrs['data-retikz-readonly-layer'] !== undefined,
    );

    expect(document.attrs.viewBox).toBe('0 0 100 60');
    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(
      layerGroups.map(group => (typeof group === 'string' ? undefined : group.attrs['data-retikz-readonly-layer'])),
    ).toEqual(['first', 'second']);
    expect(children.indexOf(layerGroups[0])).toBeGreaterThan(primaryIndex);
    expect(layerGroups[0]).toMatchObject({
      tag: 'g',
      attrs: {
        'pointer-events': 'none',
        'aria-hidden': 'true',
        transform: 'matrix(1 0 0 1 12 8)',
      },
    });
  });

  it('isolates same-named resources between primary and every layer namespace', () => {
    const primaryWithResource = layerScene('#111111');
    const output = renderFrameToSvgString({ primary: primaryWithResource, layers }, { idPrefix: 'resource-frame' });

    [
      'retikz-paint-resource-frame-shared',
      'retikz-paint-resource-frame-layer-first-shared',
      'retikz-paint-resource-frame-layer-second-shared',
    ].forEach(id => {
      expect(output).toContain(`id="${id}"`);
      expect(output).toContain(`url(#${id})`);
    });
  });

  it('Scene-only API is equivalent to a frame with frozen empty layers', () => {
    expect(buildSvgDocument(primary, { idPrefix: 'scene-only' })).toEqual(
      buildSvgFrameDocument({ primary, layers: Object.freeze([]) }, { idPrefix: 'scene-only' }),
    );
  });
});
