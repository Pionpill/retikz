import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ClipDefinition, ClipResolveContext, MarkerPrimitive, PatternDefinition } from '../../src/contract';
import type { IRClip, IRPaint, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { createRound } from '../../src/compile/scene';
import { defineClip, definePattern } from '../../src/contract';
import { resolveClipRegistry } from '../../src/providers/clip';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveClip, resolvePaint } from '../../src/resolve/resource';
import { JsonObjectSchema } from '../../src/schemas';

const round = createRound(3);

const patternContext = (patterns: ReadonlyArray<PatternDefinition> = []) => ({
  patterns: resolvePatternRegistry(patterns),
  round,
  irPath: 'children[0].node.fill',
});

const sceneWithPaint = (paint: IRPaint): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', position: [0, 0], fill: paint }],
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
      emit: (): Array<MarkerPrimitive> => [],
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
      /Unknown pattern shape 'missing'/,
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
        { type: 'node', position: [0, 0], fill: paint },
        { type: 'node', position: [40, 0], fill: paint },
      ],
    }).scene;
    expect(scene.resources).toHaveLength(1);
  });

  it('emits a deduplicated pattern resource once', () => {
    const emit = vi.fn((): Array<MarkerPrimitive> => []);
    const pattern = definePattern({ name: 'dedupe-pattern', emit });
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', position: [0, 0], fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
          { type: 'node', position: [40, 0], fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
        ],
      },
      { patterns: [pattern] },
    ).scene;

    expect(scene.resources).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('preserves the missing pattern emit diagnostic at the compile boundary', () => {
    const pattern = { name: 'missing-emit', emit: undefined } as unknown as PatternDefinition;
    expect(
      () => compileToScene(sceneWithPaint({ kind: 'pattern', shape: 'missing-emit' }), { patterns: [pattern] }).scene,
    ).toThrow("Pattern 'missing-emit' is missing an emit function (PatternDefinition.emit is required).");
  });
});

describe('resolve/resource clip', () => {
  const polygonResolve = vi.fn((spec: { kind: 'polygon'; points: Array<[number, number]> }) => ({
    kind: 'polygon' as const,
    points: spec.points,
  }));
  const polygon: ClipDefinition = defineClip({
    kind: 'polygon',
    schema: z.strictObject({
      kind: z.literal('polygon'),
      points: z.array(z.tuple([z.number(), z.number()])).min(3),
    }),
    resolve: polygonResolve,
    shapeSchema: z.strictObject({
      kind: z.literal('polygon'),
      points: z.array(z.tuple([z.number(), z.number()])).min(3),
    }),
    lower: shape => ({
      commands: [
        { kind: 'move', to: shape.points[0] },
        ...shape.points.slice(1).map(to => ({ kind: 'line' as const, to })),
        { kind: 'close' },
      ],
      fillRule: 'nonzero',
    }),
  });

  it('binds clip definition and parsed params without invoking provider', () => {
    const resolved = resolveClip(
      {
        kind: 'polygon',
        points: [
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      },
      { clips: resolveClipRegistry([polygon]), irPath: 'children[0].scope.clip' },
    );
    expect(resolved.kind).toBe('polygon');
    expect(resolved.params).toEqual({
      kind: 'polygon',
      points: [
        [0, 0],
        [10, 0],
        [0, 10],
      ],
    });
    expect(polygonResolve).not.toHaveBeenCalled();
  });

  it('keeps recursive clip resolution in the bound registry closure', () => {
    const leafResolve = vi.fn((spec: { kind: 'leaf'; radius: number }) => ({
      kind: 'leaf' as const,
      radius: spec.radius,
    }));
    const leaf = defineClip({
      kind: 'leaf',
      schema: z.strictObject({ kind: z.literal('leaf'), radius: z.number().positive() }),
      resolve: leafResolve,
      shapeSchema: z.strictObject({ kind: z.literal('leaf'), radius: z.number().positive() }),
      lower: shape => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [shape.radius, 0] },
          { kind: 'line', to: [shape.radius, shape.radius] },
          { kind: 'line', to: [0, shape.radius] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      }),
    });
    const wrapperResolve = vi.fn(
      (spec: { kind: 'wrapper'; child: { kind: 'leaf'; radius: number } }, context: ClipResolveContext) => ({
        kind: 'wrapper' as const,
        child: context.resolve(spec.child as IRClip),
      }),
    );
    const wrapper = defineClip({
      kind: 'wrapper',
      schema: z.strictObject({
        kind: z.literal('wrapper'),
        child: z.strictObject({ kind: z.literal('leaf'), radius: z.number().positive() }),
      }),
      resolve: wrapperResolve,
      shapeSchema: z.strictObject({
        kind: z.literal('wrapper'),
        child: z.intersection(z.object({ kind: NonBlankStringSchema }), JsonObjectSchema),
      }),
      lower: (shape, context) => context.lower(shape.child),
    });
    const clips = resolveClipRegistry([wrapper, leaf]);
    const resolution = resolveClip(
      { kind: 'wrapper', child: { kind: 'leaf', radius: 3 } },
      { clips, irPath: 'children[0].scope.clip' },
    );

    expect(wrapperResolve).not.toHaveBeenCalled();
    expect(leafResolve).not.toHaveBeenCalled();
    const nested = resolution.resolve({ kind: 'leaf', radius: 2 });
    expect(nested.kind).toBe('leaf');
    expect(nested.definition).toBe(leaf);

    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            clip: { kind: 'wrapper', child: { kind: 'leaf', radius: 3 } },
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
    expect(() => resolveClip({ kind: 'missing' }, { clips: resolveClipRegistry() })).toThrow(/Unknown clip 'missing'/);
  });
});
