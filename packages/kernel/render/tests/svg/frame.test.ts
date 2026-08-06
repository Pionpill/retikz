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
      owner: { kind: 'pathKind', name: 'stroke' },
      occurrence: { sourcePath: '$.children[0]', expansionPath: [] },
      colorScope: 1,
      transform: [1, 0, 0, 1, 12, 8],
      scene: {
        layout: { x: 0, y: 0, width: 32, height: 20 },
        resources: [
          {
            kind: 'paint',
            id: 'paint-1',
            spec: {
              kind: 'linearGradient',
              stops: [
                { offset: 0, color: '#7c3aed' },
                { offset: 1, color: '#ffffff' },
              ],
            },
          },
        ],
        primitives: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 30,
            height: 20,
            fill: { kind: 'resourceRef', id: 'paint-1' },
          },
          {
            type: 'path',
            commands: [
              { kind: 'move', to: [0, 10] },
              { kind: 'line', to: [30, 10] },
            ],
            stroke: '#7c3aed',
            dashPattern: [1, 4],
          },
          {
            type: 'ellipse',
            cx: 15,
            cy: 10,
            rx: 3,
            ry: 3,
            fill: '#dc2626',
          },
          {
            type: 'text',
            x: 4,
            y: 6,
            lines: [{ text: 'control' }],
            fontSize: 10,
            align: 'start',
            baseline: 'bottom',
            lineHeight: 12,
            measuredWidth: 42,
            measuredHeight: 12,
            fill: '#7c3aed',
          },
        ],
      },
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
    expect(group.attrs['aria-hidden']).toBe('true');
    expect(group.children?.[0]).toMatchObject({
      tag: 'g',
      attrs: { transform: 'matrix(1 0 0 1 12 8)' },
    });
    const entry = group.children?.[0];
    expect(entry).not.toBeTypeOf('string');
    if (entry === undefined || typeof entry === 'string') throw new Error('expected inspection entry group');
    expect(entry.children?.map(child => (typeof child === 'string' ? child : child.tag))).toEqual([
      'defs',
      'rect',
      'path',
      'ellipse',
      'text',
    ]);

    const output = renderFrameToSvgString({ primary, inspection }, { idPrefix: 'frame' });
    expect(output).toContain('data-retikz-inspection="layout"');
    expect(output).toContain('<rect');
    expect(output).toContain('<path');
    expect(output).toContain('<ellipse');
    expect(output).toContain('<text');
    expect(output).toContain('#7c3aed');
    expect(output).toContain('#dc2626');
    expect(output).toContain('id="retikz-paint-frame-inspection-0-paint-1"');
    expect(output).toContain('url(#retikz-paint-frame-inspection-0-paint-1)');
    expect(output).not.toContain('data-retikz-id="layout.');
  });

  it('为 primary 与每个辅助 Scene 隔离同名资源 id', () => {
    const sceneWithPaint = (color: string): Scene => ({
      layout: { x: 0, y: 0, width: 10, height: 10 },
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
      primitives: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: { kind: 'resourceRef', id: 'shared' } }],
    });
    const output = renderFrameToSvgString(
      {
        primary: sceneWithPaint('#111111'),
        inspection: {
          entries: [
            {
              owner: { kind: 'pathKind', name: 'stroke' },
              occurrence: { sourcePath: '$.children[0]', expansionPath: [] },
              colorScope: 0,
              transform: [1, 0, 0, 1, 0, 0],
              scene: sceneWithPaint('#222222'),
            },
            {
              owner: { kind: 'composite', namespace: 'test', type: 'layout' },
              occurrence: { sourcePath: '$.children[1]', expansionPath: [] },
              colorScope: 1,
              transform: [1, 0, 0, 1, 12, 0],
              scene: sceneWithPaint('#333333'),
            },
          ],
        },
      },
      { idPrefix: 'resource-frame' },
    );

    [
      'retikz-paint-resource-frame-shared',
      'retikz-paint-resource-frame-inspection-0-shared',
      'retikz-paint-resource-frame-inspection-1-shared',
    ].forEach(id => {
      expect(output).toContain(`id="${id}"`);
      expect(output).toContain(`url(#${id})`);
    });
  });

  it('Scene-only API 等价委托 inspection:null', () => {
    expect(buildSvgDocument(primary, { idPrefix: 'scene-only' })).toEqual(
      buildSvgFrameDocument({ primary, inspection: null }, { idPrefix: 'scene-only' }),
    );
  });
});
