import { describe, expect, it } from 'vitest';

import type { IRAnimationTrack, ScenePrimitive, SceneResource } from '../../src';

import { visualBoundsOfPrimitives } from '../../src/compile/orchestration/visual-bounds';

const boundsOf = (primitives: ReadonlyArray<ScenePrimitive>, resources: ReadonlyArray<SceneResource> = []) =>
  visualBoundsOfPrimitives(primitives, resources);

describe('canonical visual bounds', () => {
  it('uses measured Text alignment and baseline without remeasuring', () => {
    expect(
      boundsOf([
        {
          type: 'text',
          x: 20,
          y: 30,
          lines: [{ text: 'ignored geometry' }],
          fontSize: 16,
          align: 'middle',
          baseline: 'alphabetic',
          lineHeight: 12,
          measuredWidth: 40,
          measuredHeight: 10,
          fill: '#000',
        },
      ]),
    ).toEqual({ x: 0, y: 20, width: 40, height: 10 });
  });

  it('uses the closed-form AABB for rotated ellipses and ellipse arcs', () => {
    const ellipse = boundsOf([
      {
        type: 'ellipse',
        cx: 0,
        cy: 0,
        rx: 10,
        ry: 5,
        rotate: 90,
        fill: '#f00',
      },
    ]);
    const ellipseArc = boundsOf([
      {
        type: 'path',
        commands: [
          {
            kind: 'ellipseArc',
            center: [0, 0],
            radiusX: 10,
            radiusY: 5,
            rotation: 30,
            startAngle: 0,
            endAngle: 15,
          },
        ],
        fill: '#f00',
      },
    ]);

    expect(ellipse.x).toBeCloseTo(-5);
    expect(ellipse.y).toBeCloseTo(-10);
    expect(ellipse.width).toBeCloseTo(10);
    expect(ellipse.height).toBeCloseTo(20);
    expect(ellipseArc.width).toBeCloseTo(
      2 * Math.sqrt((10 * Math.cos(Math.PI / 6)) ** 2 + (5 * Math.sin(Math.PI / 6)) ** 2),
    );
    expect(ellipseArc.height).toBeCloseTo(
      2 * Math.sqrt((10 * Math.sin(Math.PI / 6)) ** 2 + (5 * Math.cos(Math.PI / 6)) ** 2),
    );
  });

  it('takes curve control hulls and the canonical miter limit', () => {
    expect(
      boundsOf([
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            {
              kind: 'cubic',
              control1: [0, 100],
              control2: [100, 100],
              to: [100, 0],
            },
          ],
          fill: '#f00',
        },
      ]),
    ).toEqual({ x: 0, y: 0, width: 100, height: 100 });

    expect(
      boundsOf([
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [10, 0] },
          ],
          stroke: '#000',
          strokeWidth: 2,
          strokeLinejoin: 'miter',
        },
      ]),
    ).toEqual({ x: -10, y: -10, width: 30, height: 20 });
  });

  it('uses the settled state while ignoring animation tracks and non-miter cap variants', () => {
    const animation: IRAnimationTrack = {
      property: 'scaleX',
      keyframes: [
        { at: 0, value: 1 },
        { at: 1, value: 100 },
      ],
      duration: 1000,
    };
    const primitive: ScenePrimitive = {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      stroke: '#000',
      strokeLinecap: 'square',
      strokeLinejoin: 'round',
      animations: [animation],
    };

    expect(boundsOf([primitive])).toEqual({ x: -0.5, y: -0.5, width: 11, height: 1 });
    expect(boundsOf([{ ...primitive, animations: undefined }])).toEqual(boundsOf([primitive]));
  });

  it('applies canonical shadow expansion and suppresses explicit zero opacity', () => {
    expect(
      boundsOf([
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 20,
          height: 10,
          fill: '#f00',
          shadow: {
            offsetX: -10,
            offsetY: 8,
            blur: 2,
            color: '#000',
          },
        },
      ]),
    ).toEqual({ x: -12, y: -2, width: 34, height: 22 });

    expect(
      boundsOf([
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 20,
          height: 10,
          fill: '#f00',
          opacity: 0,
        },
      ]),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('suppresses arrow marker bounds when the owning path has zero opacity', () => {
    expect(
      boundsOf([
        {
          type: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [20, 0] },
          ],
          stroke: '#000',
          opacity: 0,
          arrowEnd: {
            shape: 'test',
            baseSize: 10,
            refX: 0,
            markerWidth: 6,
            markerHeight: 6,
            marker: [
              {
                type: 'path',
                commands: [
                  { kind: 'move', to: [0, 0] },
                  { kind: 'line', to: [10, 5] },
                  { kind: 'line', to: [0, 10] },
                  { kind: 'close' },
                ],
                fill: { kind: 'contextStroke' },
              },
            ],
          },
        },
      ]),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('clips in group-local coordinates and then applies transforms', () => {
    expect(
      boundsOf(
        [
          {
            type: 'group',
            clipRef: 'clip-1',
            transforms: [{ kind: 'translate', x: 5, y: 7 }],
            children: [
              {
                type: 'rect',
                x: -10,
                y: -10,
                width: 20,
                height: 20,
                fill: '#f00',
              },
            ],
          },
        ],
        [
          {
            kind: 'clip',
            id: 'clip-1',
            shape: { kind: 'rect', x: 0, y: 0, width: 5, height: 5 },
          },
        ],
      ),
    ).toEqual({ x: 5, y: 7, width: 5, height: 5 });
  });

  it('returns a finite immutable zero rectangle for empty output', () => {
    const bounds = boundsOf([]);

    expect(bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(Object.isFrozen(bounds)).toBe(true);
  });
});
