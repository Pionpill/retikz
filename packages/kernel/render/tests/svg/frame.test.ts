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
      colorScope: 1,
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
          tone: 'scope',
          lineStyle: 'dashed',
        },
        {
          kind: 'line',
          role: 'layout.guide',
          x1: 0,
          y1: 10,
          x2: 30,
          y2: 10,
          tone: 'scope',
          lineStyle: 'dotted',
        },
        {
          kind: 'rect',
          role: 'layout.gap',
          x: 0,
          y: 2,
          width: 20,
          height: 6,
          presentation: 'fill',
          tone: 'scope',
          fillPattern: 'crosshatch',
          opacity: 0.5,
        },
        {
          kind: 'rect',
          role: 'layout.overflow',
          x: 28,
          y: 0,
          width: 4,
          height: 20,
          presentation: 'fill',
          tone: 'warning',
          fillPattern: 'solid',
        },
        { kind: 'label', role: 'layout.label', x: 4, y: 6, text: 'slot 0', tone: 'scope' },
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
    const entry = group.children?.[0];
    expect(entry).not.toBeTypeOf('string');
    if (entry === undefined || typeof entry === 'string') throw new Error('expected inspection entry group');
    expect(entry.children?.map(child => (typeof child === 'string' ? child : child.tag))).toEqual([
      'rect',
      'line',
      'path',
      'rect',
      'text',
    ]);
    expect(entry.children?.[2]).toMatchObject({
      tag: 'path',
      attrs: {
        d: 'M 4.5 7.5 L 9.5 2.5 M 16.5 7.5 L 19.5 4.5 M 14.5 2.5 L 19.5 7.5 M 2.5 2.5 L 7.5 7.5',
        fill: 'none',
        stroke: '#7c3aed',
        'stroke-width': 1,
        opacity: 0.275,
      },
    });
    expect(
      entry.children?.some(
        child =>
          typeof child !== 'string' &&
          child.tag === 'rect' &&
          child.attrs.x === 0 &&
          child.attrs.y === 2 &&
          child.attrs.width === 20 &&
          child.attrs.height === 6,
      ),
    ).toBe(false);

    const output = renderFrameToSvgString({ primary, inspection }, { idPrefix: 'frame' });
    expect(output).toContain('data-retikz-inspection="layout"');
    expect(output).toContain('<rect');
    expect(output).toContain('<line');
    expect(output).toContain('<path');
    expect(output).toContain('<text');
    expect(output).toContain('#7c3aed');
    expect(output).toContain('#dc2626');
    expect(output).not.toContain('url(#');
    expect(output).not.toContain('data-retikz-id="layout.');
  });

  it('Scene-only API 等价委托 inspection:null', () => {
    expect(buildSvgDocument(primary, { idPrefix: 'scene-only' })).toEqual(
      buildSvgFrameDocument({ primary, inspection: null }, { idPrefix: 'scene-only' }),
    );
  });
});
