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

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }
  return out;
};

const pathPrims = (ir: IRScene): Array<PathPrim> =>
  flatten(compileToScene(ir, { padding: 0 }).scene.primitives).filter(
    (primitive): primitive is PathPrim => primitive.type === 'path',
  );

describe('Drawable shared style resolution', () => {
  it('drawable-shared-path-default-stroke-full：stroke path 消费 pathDefault 的适用字段', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          pathDefault: {
            color: '#0f766e',
            fill: '#ccfbf1',
            stroke: '#134e4a',
            strokeWidth: 2,
            dashPattern: [4, 2],
            dashOffset: 1,
            lineCap: 'round',
            lineJoin: 'bevel',
            fillRule: 'evenodd',
            roundedCorners: 5,
            rotate: 30,
            scale: 2,
          },
          children: [
            linePath({
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
                { type: 'step', kind: 'line', to: [100, 100] },
              ],
            }),
          ],
        },
      ]),
      { padding: 0 },
    ).scene;
    const primitives = flatten(compiled.primitives);
    const prim = primitives.find((primitive): primitive is PathPrim => primitive.type === 'path');
    const transformGroup = primitives.find(
      primitive =>
        primitive.type === 'group' &&
        primitive.transforms?.some(transform => transform.kind === 'rotate') &&
        primitive.transforms.some(transform => transform.kind === 'scale'),
    );
    if (!prim) throw new Error('Expected compiled stroke path primitive');

    expect(prim.fill).toBe('#ccfbf1');
    expect(prim.fillRule).toBe('evenodd');
    expect(prim.stroke).toBe('#134e4a');
    expect(prim.strokeWidth).toBe(2);
    expect(prim.dashPattern).toEqual([4, 2]);
    expect(prim.dashOffset).toBe(1);
    expect(prim.strokeLinecap).toBe('round');
    expect(prim.strokeLinejoin).toBe('bevel');
    expect(prim.commands.some(command => command.kind === 'arc')).toBe(true);
    expect(
      transformGroup?.type === 'group' &&
        transformGroup.transforms?.some(transform => transform.kind === 'rotate' && transform.degrees === 30),
    ).toBe(true);
    expect(
      transformGroup?.type === 'group' &&
        transformGroup.transforms?.some(
          transform => transform.kind === 'scale' && transform.x === 2 && (transform.y ?? transform.x) === 2,
        ),
    ).toBe(true);
  });

  it('drawable-shared-path-default-fields-apply-to-stroke', () => {
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
          },
          children: [linePath()],
        },
      ]),
    );

    expect(prim.stroke).toBe('#2563eb');
    expect(prim.dashPattern).toEqual([4, 2]);
    expect(prim.strokeWidth).toBe(1);
  });

  it('drawable-shared-z-index-relation-style：zIndex 排序对 path 采用同一语义', () => {
    const prims = pathPrims(
      scene([linePath({ id: 'front-path', zIndex: 3 }), linePath({ id: 'back-path', zIndex: 0 })]),
    );

    expect(prims.map(prim => prim.id)).toEqual(['back-path', 'front-path']);
  });

  it('drawable-shared-color-fallback：pathDefault color 默认映射到 path stroke', () => {
    const prims = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: { color: 'crimson' },
          children: [linePath()],
        },
      ]),
    );

    expect(prims[0].stroke).toBe('crimson');
  });

  it('drawable-shared-reset-style-path：resetStyle path 切断 pathDefault', () => {
    const prims = pathPrims(
      scene([
        {
          type: 'scope',
          pathDefault: { color: 'red', strokeWidth: 5 },
          children: [
            {
              type: 'scope',
              resetStyle: ['path'],
              children: [linePath()],
            },
          ],
        },
      ]),
    );

    expect(prims[0].stroke).toBe('currentColor');
    expect(prims[0].strokeWidth).toBe(1);
  });

  it('drawable-shared-label-default-independent：labelDefault 不进入 drawable geometry style', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      pathDefault: { color: 'red' },
      labelDefault: { textColor: 'blue' },
      children: [linePath({ label: { text: 'flow' } })],
    });

    expect(parsed.pathDefault).toEqual({ color: 'red' });
    expect(parsed.labelDefault).toEqual({ textColor: 'blue' });
  });

  it('drawable-shared-arrow-default-independent：arrowDefault 不进入 pathDefault 默认样式', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      pathDefault: { color: 'red' },
      arrowDefault: { shape: 'circle' },
      children: [linePath()],
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
