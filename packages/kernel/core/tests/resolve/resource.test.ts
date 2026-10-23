import { describe, expect, it, vi } from 'vitest';
import { array, literal, number, strictObject, tuple } from 'zod';

import { compileToScene } from '../../src/compile/compile';
import { createRound } from '../../src/compile/scene';
import type { ClipDefinition, ClipResolveContext, ScenePrimitive, PatternDefinition } from '../../src/contract';
import { defineClip, definePattern } from '../../src/contract';
import { resolveClipRegistry } from '../../src/providers/clip';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveClip, resolvePaint } from '../../src/resolve/resource';
import type { IRClip, IRPaint, IRScene } from '../../src/schemas';

const round = createRound(3);

const patternContext = (patterns: ReadonlyArray<PatternDefinition> = []) => ({
  patterns: resolvePatternRegistry(patterns),
  round,
  irPath: 'children[0].node.fill',
});

const sceneWithPaint = (paint: IRPaint): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      position: [0, 0],
      style: { fill: paint },
    },
  ],
});

describe('resolve/resource paint', () => {
  it('binds builtin pattern and materializes defaults before compile', () => {
    const resolved = resolvePaint({ kind: 'pattern', shape: 'lines' }, patternContext());

    expect(typeof resolved).toBe('object');
    expect(resolved).toMatchObject({ kind: 'paint', pattern: { name: 'lines', size: 8 } });
  });

  it('binds custom pattern and applies shape/style priority in resolve', () => {
    const custom = definePattern({
      name: 'custom',
      emit: (): Array<ScenePrimitive> => [],
    });
    const resolved = resolvePaint(
      {
        kind: 'pattern',
        shape: 'custom',
        color: '#123456',
        dashed: true,
        dotted: true,
        dashPattern: [7, 2],
        horizontalStyle: { dotted: true },
      },
      patternContext([custom]),
    );

    expect(resolved).toMatchObject({
      kind: 'paint',
      pattern: {
        name: 'custom',
        style: {
          base: { color: '#123456', dashPattern: [7, 2] },
          horizontalStyle: { color: '#123456', dashPattern: [1, 2] },
        },
      },
    });
  });

  it('reports unknown pattern provider at the resolve boundary', () => {
    expect(() => resolvePaint({ kind: 'pattern', shape: 'missing' }, patternContext())).toThrow(
      /Unknown provider 'missing'/,
    );
  });

  it('preserves dedupe boundary after compile consumes resolved paint', () => {
    const paint: IRPaint = {
      kind: 'linearGradient',
      stops: [
        { offset: 0, color: '#000' },
        { offset: 1, color: '#fff' },
      ],
    };
    const scene = compileToScene({
      ...sceneWithPaint(paint),
      children: [
        {
          type: 'node',
          position: [0, 0],
          style: { fill: paint },
        },
        {
          type: 'node',
          position: [40, 0],
          style: { fill: paint },
        },
      ],
    }).scene;

    expect(scene.resources).toHaveLength(1);
  });

  it('emits a deduplicated pattern resource once', () => {
    const emit = vi.fn((): Array<ScenePrimitive> => []);
    const pattern = definePattern({ name: 'dedupe-pattern', emit });
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            style: { fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
          },
          {
            type: 'node',
            position: [40, 0],
            style: { fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
          },
        ],
      },
      { patterns: [pattern] },
    ).scene;

    expect(scene.resources).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });
});

describe('resolve/resource clip', () => {
  const polygonResolve = vi.fn(
    (spec: {
      kind: 'polygon';
      /** 裁剪参数 */
      params: { points: Array<[number, number]> };
    }) => ({
      kind: 'polygon' as const,
      params: {
        points: spec.params.points,
      },
    }),
  );
  const polygon: ClipDefinition = defineClip({
    kind: 'polygon',
    schema: strictObject({
      kind: literal('polygon'),
      params: strictObject({
        points: array(tuple([number(), number()])).min(3),
      }),
    }),
    resolve: polygonResolve,
    lower: shape => ({
      commands: [
        { kind: 'move', to: shape.params.points[0] },
        ...shape.params.points.slice(1).map(to => ({ kind: 'line' as const, to })),
        { kind: 'close' },
      ],
      fillRule: 'nonzero',
    }),
  });

  it('binds clip definition and parsed params without invoking provider', () => {
    const resolved = resolveClip(
      {
        kind: 'polygon',
        params: {
          points: [
            [0, 0],
            [10, 0],
            [0, 10],
          ],
        },
      },
      { clips: resolveClipRegistry([polygon]), irPath: 'children[0].scope.clip' },
    );

    expect(resolved.kind).toBe('polygon');
    expect(resolved.params).toEqual({
      kind: 'polygon',
      params: {
        points: [
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      },
    });
    expect(polygonResolve).not.toHaveBeenCalled();
  });

  it('keeps recursive clip resolution in the bound registry closure', () => {
    const leafResolve = vi.fn(
      (spec: {
        kind: 'leaf';
        /** 裁剪参数 */
        params: { radius: number };
      }) => ({
        kind: 'leaf' as const,
        params: {
          radius: spec.params.radius,
        },
      }),
    );
    const leaf = defineClip({
      kind: 'leaf',
      schema: strictObject({ kind: literal('leaf'), params: strictObject({ radius: number().positive() }) }),
      resolve: leafResolve,
      lower: shape => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [shape.params.radius, 0] },
          { kind: 'line', to: [shape.params.radius, shape.params.radius] },
          { kind: 'line', to: [0, shape.params.radius] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      }),
    });
    const wrapperResolve = vi.fn(
      (
        spec: {
          kind: 'wrapper';
          /** 裁剪参数 */
          params: {
            child: {
              kind: 'leaf';
              /** 裁剪参数 */
              params: { radius: number };
            };
          };
        },
        context: ClipResolveContext,
      ) => ({
        kind: 'wrapper' as const,
        params: {
          child: context.resolve(spec.params.child as IRClip),
        },
      }),
    );
    const wrapper = defineClip({
      kind: 'wrapper',
      schema: strictObject({
        kind: literal('wrapper'),
        params: strictObject({
          child: strictObject({ kind: literal('leaf'), params: strictObject({ radius: number().positive() }) }),
        }),
      }),
      resolve: wrapperResolve,
      lower: (shape, context) => context.lower(shape.params.child),
    });
    const clips = resolveClipRegistry([wrapper, leaf]);
    const resolution = resolveClip(
      { kind: 'wrapper', params: { child: { kind: 'leaf', params: { radius: 3 } } } },
      { clips, irPath: 'children[0].scope.clip' },
    );

    expect(wrapperResolve).not.toHaveBeenCalled();
    expect(leafResolve).not.toHaveBeenCalled();

    const nested = resolution.resolve({ kind: 'leaf', params: { radius: 2 } });

    expect(nested.kind).toBe('leaf');
    expect(nested.definition).toBe(leaf);

    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            clip: { kind: 'wrapper', params: { child: { kind: 'leaf', params: { radius: 3 } } } },
            children: [],
          },
        ],
      },
      { clips: [wrapper, leaf] },
    ).scene;
    const resource = scene.resources?.find(item => item.kind === 'clip');

    expect(resource).toMatchObject({
      kind: 'clip',
      path: {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [3, 0] },
          { kind: 'line', to: [3, 3] },
          { kind: 'line', to: [0, 3] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    });
    expect(wrapperResolve).toHaveBeenCalledTimes(1);
    expect(leafResolve).toHaveBeenCalledTimes(1);
  });

  it('reports unknown clip provider at the resolve boundary', () => {
    expect(() => resolveClip({ kind: 'missing', params: {} }, { clips: resolveClipRegistry() })).toThrow(
      /Unknown provider 'missing'/,
    );
  });
});
