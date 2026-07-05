import { describe, expect, it } from 'vitest';

import type { IRScene, PathPrim, ScenePrimitive } from '../../src';

import { compileToScene, PathDefaultSchema, ScopeSchema } from '../../src';
import { arrowMarks } from '../helpers/arrow-marks';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const linePath = (overrides: Record<string, unknown> = {}): IRScene['children'][number] => ({
  type: 'path',
  children: steps,
  ...overrides,
});

const ribbon = (overrides: Record<string, unknown> = {}): IRScene['children'][number] => ({
  type: 'path',
  kind: 'ribbon',
  ribbon: { width: 10, samples: 2 },
  children: steps,
  ...overrides,
});

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }
  return out;
};

const pathPrims = (ir: IRScene): Array<PathPrim> =>
  flatten(compileToScene(ir, { padding: 0 }).primitives).filter(
    (primitive): primitive is PathPrim => primitive.type === 'path',
  );

describe('Drawable shared style resolution', () => {
  it('drawable-shared-path-default-ribbon-subset：pathDefault 的共享字段会作用到 ribbon', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: {
            color: '#0f766e',
            fillOpacity: 0.4,
            stroke: '#134e4a',
            strokeWidth: 2,
            strokeOpacity: 0.6,
            opacity: 0.8,
            shadow: 'sm',
            blendMode: 'multiply',
          },
          children: [ribbon()],
        },
      ]),
    );

    expect(prim.fill).toBe('#0f766e');
    expect(prim.fillOpacity).toBe(0.4);
    expect(prim.stroke).toBe('#134e4a');
    expect(prim.strokeWidth).toBe(2);
    expect(prim.strokeOpacity).toBe(0.6);
    expect(prim.opacity).toBe(0.8);
    expect(prim.shadow).toBeDefined();
    expect(prim.blendMode).toBe('multiply');
  });

  it('drawable-shared-path-default-path-only-ignored-for-ribbon：path-only 默认值不泄漏给 ribbon', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: {
            color: '#2563eb',
            dashPattern: [4, 2],
            lineCap: 'round',
            lineJoin: 'round',
            roundedCorners: 5,
            thickness: 'ultraThick',
          },
          children: [ribbon()],
        },
      ]),
    );

    expect(prim.fill).toBe('#2563eb');
    expect(prim.dashPattern).toBeUndefined();
    expect(prim.strokeWidth).toBeUndefined();
  });

  it('drawable-shared-z-index-relation-style：zIndex 排序对 path 和 ribbon 采用同一语义', () => {
    const prims = pathPrims(
      scene([ribbon({ id: 'front-ribbon', zIndex: 3 }), linePath({ id: 'back-path', zIndex: 0 })]),
    );

    expect(prims.map(prim => prim.id)).toEqual(['back-path', 'front-ribbon']);
  });

  it('drawable-shared-color-fallback：pathDefault color 默认映射到 path stroke 与 ribbon fill', () => {
    const prims = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: { color: 'crimson' },
          children: [linePath(), ribbon()],
        },
      ]),
    );

    expect(prims[0].stroke).toBe('crimson');
    expect(prims[1].fill).toBe('crimson');
  });

  it('drawable-shared-reset-style-path：resetStyle path 同时切断 path 和 ribbon 的 pathDefault', () => {
    const prims = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: { color: 'red', strokeWidth: 5 },
          children: [
            {
              type: 'scope',
              resetStyle: ['path'],
              children: [linePath(), ribbon()],
            },
          ],
        },
      ]),
    );

    expect(prims[0].stroke).toBe('currentColor');
    expect(prims[0].strokeWidth).toBe(1);
    expect(prims[1].fill).toBe('currentColor');
    expect(prims[1].strokeWidth).toBeUndefined();
  });

  it('drawable-shared-label-default-independent：labelDefault 不进入 drawable geometry style', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      pathDefault: { color: 'red' },
      labelDefault: { textColor: 'blue' },
      children: [ribbon({ label: { text: 'flow' } })],
    });

    expect(parsed.pathDefault).toEqual({ color: 'red' });
    expect(parsed.labelDefault).toEqual({ textColor: 'blue' });
  });

  it('drawable-shared-arrow-default-independent：arrowDefault 不进入 pathDefault / ribbon 默认样式', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      pathDefault: { color: 'red' },
      arrowDefault: { shape: 'circle' },
      children: [ribbon()],
    });

    expect(parsed.pathDefault).toEqual({ color: 'red' });
    expect(parsed.arrowDefault).toEqual({ shape: 'circle' });
    expect(PathDefaultSchema.safeParse({ marks: arrowMarks('->') }).success).toBe(false);
  });

  it('drawable-shared-doc-schema-export：共享 drawable schema 从 public barrel 导出', () => {
    expect(PathDefaultSchema.safeParse({ id: 'x' }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ meta: { x: 1 } }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ animations: [] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ zIndex: 1 }).success).toBe(false);
  });
});
