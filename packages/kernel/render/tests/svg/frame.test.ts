import type { InspectionPlane, Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { buildSvgDocument, buildSvgFrameDocument, renderFrameToSvgString } from '../../src/svg';

const primary: Scene = {
  layout: { x: 0, y: 0, width: 100, height: 60 },
  primitives: [{ type: 'rect', id: 'primary', x: 10, y: 12, width: 20, height: 16, fill: '#ef4444' }],
};

const inspection: InspectionPlane = {
  entries: [
    {
      occurrence: { sourcePath: '$.children[0]', expansionPath: [] },
      transform: [1, 0, 0, 1, 12, 8],
      primitives: [
        {
          kind: 'rect',
          role: 'layout.slot',
          x: 0,
          y: 0,
          width: 30,
          height: 20,
          presentation: 'outline',
          tone: 'neutral',
          lineStyle: 'dashed',
        },
        {
          kind: 'line',
          role: 'layout.guide',
          x1: 0,
          y1: 10,
          x2: 30,
          y2: 10,
          tone: 'guide',
          lineStyle: 'dotted',
        },
        { kind: 'label', role: 'layout.label', x: 4, y: 6, text: 'slot 0', tone: 'accent' },
      ],
    },
  ],
};

describe('SVG static render frame', () => {
  it('在 primary 之后追加不可交互的 inspection group，并保留 occurrence transform', () => {
    const document = buildSvgFrameDocument({ primary, inspection }, { idPrefix: 'frame' });
    const children = document.children ?? [];
    const primaryIndex = children.findIndex(
      child => typeof child !== 'string' && child.attrs['data-retikz-id'] === 'primary',
    );
    const inspectionIndex = children.findIndex(
      child => typeof child !== 'string' && child.attrs['data-retikz-inspection'] === 'layout',
    );

    expect(document.attrs.viewBox).toBe('0 0 100 60');
    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(inspectionIndex).toBeGreaterThan(primaryIndex);

    const group = children[inspectionIndex];
    expect(group).not.toBeTypeOf('string');
    if (typeof group === 'string') throw new Error('expected inspection group');
    expect(group.attrs['pointer-events']).toBe('none');
    expect(group.children?.[0]).toMatchObject({
      tag: 'g',
      attrs: { transform: 'matrix(1 0 0 1 12 8)' },
    });

    const output = renderFrameToSvgString({ primary, inspection }, { idPrefix: 'frame' });
    expect(output).toContain('data-retikz-inspection="layout"');
    expect(output).toContain('<rect');
    expect(output).toContain('<line');
    expect(output).toContain('<text');
    expect(output).not.toContain('data-retikz-id="layout.');
  });

  it('Scene-only API 等价委托 inspection:null', () => {
    expect(buildSvgDocument(primary, { idPrefix: 'scene-only' })).toEqual(
      buildSvgFrameDocument({ primary, inspection: null }, { idPrefix: 'scene-only' }),
    );
  });
});
