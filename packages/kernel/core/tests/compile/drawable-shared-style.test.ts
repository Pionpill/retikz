import { describe, expect, it } from 'vitest';

import type { IRScene, PathPrimitive, ScenePrimitive } from '../../src';
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

const pathPrims = (ir: IRScene): Array<PathPrimitive> =>
  flatten(compileToScene(ir, { padding: 0 }).scene.primitives).filter(
    (primitive): primitive is PathPrimitive => primitive.type === 'path',
  );

describe('Drawable shared style resolution', () => {
  it('稀疏透明度逐项继承，整体简写不清除填充与描边', () => {
    const primitives = pathPrims(
      scene([
        {
          type: 'scope',
          defaults: { style: { opacity: { fill: 0.5, stroke: 0.8 } } },
          children: [
            {
              type: 'scope',
              defaults: { style: { opacity: 0.5 } },
              children: [
                linePath({ style: { opacity: 0.5 } }),
                linePath({ style: { opacity: { overall: 0, fill: 0, stroke: 1 } } }),
                linePath({ style: { opacity: {} } }),
              ],
            },
          ],
        },
      ]),
    );
    expect(primitives[0]).toMatchObject({ opacity: 0.5, fillOpacity: 0.5, strokeOpacity: 0.8 });
    expect(primitives[1]).toMatchObject({ opacity: 0, fillOpacity: 0, strokeOpacity: 1 });
    expect(primitives[2]).toMatchObject({ opacity: 0.5, fillOpacity: 0.5, strokeOpacity: 0.8 });
  });

  it('drawable-shared-path-default-stroke-full：stroke path 消费 pathDefault 的适用字段', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'scope',
          children: [
            linePath({
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
                { type: 'step', kind: 'line', to: [100, 100] },
              ],
            }),
          ],
          defaults: {
            path: {
              cornerRadius: 5,
              rotate: 30,
              scale: 2,
              style: {
                color: '#0f766e',
                fill: '#ccfbf1',
                stroke: '#134e4a',
                strokeWidth: 2,
                dashPattern: [4, 2],
                dashOffset: 1,
                lineCap: 'round',
                lineJoin: 'bevel',
                fillRule: 'evenodd',
              },
            },
          },
        },
      ]),
      { padding: 0 },
    ).scene;
    const primitives = flatten(compiled.primitives);
    const prim = primitives.find((primitive): primitive is PathPrimitive => primitive.type === 'path');
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
    expect(prim.lineCap).toBe('round');
    expect(prim.lineJoin).toBe('bevel');
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
          children: [linePath()],
          defaults: {
            path: {
              cornerRadius: 5,
              style: { color: '#2563eb', dashPattern: [4, 2], lineCap: 'round', lineJoin: 'round' },
            },
          },
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
          children: [linePath()],
          defaults: {
            path: {
              style: { color: 'crimson' },
            },
          },
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
          children: [
            {
              type: 'scope',
              children: [linePath()],
              defaults: { reset: ['path'] },
            },
          ],
          defaults: {
            path: {
              style: { color: 'red', strokeWidth: 5 },
            },
          },
        },
      ]),
    );

    expect(prims[0].stroke).toBe('currentColor');
    expect(prims[0].strokeWidth).toBe(1);
  });

  it('drawable-shared-label-default-independent：labelDefault 不进入 drawable geometry style', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      children: [linePath({ label: { text: 'flow' } })],
      defaults: {
        node: { label: { textColor: 'blue' } },
        path: { style: { color: 'red' }, label: { textColor: 'blue' } },
      },
    });

    expect(parsed.defaults?.path?.style).toEqual({ color: 'red' });
    expect(parsed.defaults?.node?.label).toEqual({ textColor: 'blue' });
  });

  it('drawable-shared-arrow-default-independent：arrowDefault 不进入 pathDefault 默认样式', () => {
    const parsed = ScopeSchema.parse({
      type: 'scope',
      children: [linePath()],
      defaults: { path: { style: { color: 'red' }, arrow: { shape: 'circle' } } },
    });

    expect(parsed.defaults?.path?.style).toEqual({ color: 'red' });
    expect(parsed.defaults?.path?.arrow).toEqual({ shape: 'circle' });
    expect(PathDefaultSchema.safeParse({ marks: arrowMarks('->') }).success).toBe(false);
  });

  it('drawable-shared-doc-schema-export：共享 drawable schema 从 public barrel 导出', () => {
    expect(PathDefaultSchema.safeParse({ id: 'x' }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ meta: { x: 1 } }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ animations: [] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ zIndex: 1 }).success).toBe(false);
  });
});
