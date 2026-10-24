import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { compileToScene, definePath, PathSchema, resolvePathRegistry, StrokePathSchema } from '../../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

describe('Path full-subject contract', () => {
  it('accepts an open path host with any kind and JSON options', () => {
    expect(
      PathSchema.safeParse({
        type: 'path',
        kind: 'custom',
        kindOptions: { nested: { enabled: true } },
        children: steps,
      }).success,
    ).toBe(true);
  });

  it('rejects the removed top-level ribbon field', () => {
    expect(
      PathSchema.safeParse({
        type: 'path',
        kind: 'custom',
        ribbon: { width: 4 },
        children: steps,
      }).success,
    ).toBe(false);
  });

  it('keeps stroke full-subject rules in the built-in stroke schema', () => {
    expect(PathSchema.safeParse({ type: 'path', kind: 'stroke' }).success).toBe(true);
    expect(PathSchema.safeParse({ type: 'path', kind: 'stroke', kindOptions: {} }).success).toBe(true);
    expect(StrokePathSchema.safeParse({ type: 'path', children: steps }).success).toBe(true);
    expect(StrokePathSchema.safeParse({ type: 'path', kind: 'stroke', kindOptions: {} }).success).toBe(false);
    expect(StrokePathSchema.safeParse({ type: 'path', kind: 'stroke' }).success).toBe(false);
  });

  it('parses the selected full subject schema during compile lookup', () => {
    expect(() =>
      compileToScene({
        version: 1,
        type: 'scene',
        children: [{ type: 'path', kind: 'stroke' }],
      }),
    ).toThrow(/Stroke paths require `children` steps/);
  });

  it('exposes only domain-neutral path services to a custom kind', () => {
    let observed = false;
    const custom = definePath({
      name: 'service-probe',
      schema: PathSchema,
      compile: context => {
        const commands = context.materializePath();
        observed =
          commands.length > 0 &&
          typeof context.materializePath === 'function' &&
          typeof context.emitStroke === 'function' &&
          typeof context.emitHostLabels === 'function' &&
          typeof context.emitBoundaryLabels === 'function' &&
          typeof context.wrapOutput === 'function' &&
          typeof context.round === 'function' &&
          context.path.style?.color === 'red' &&
          context.appearance.color === 'red' &&
          context.appearance.fill === 'blue' &&
          context.appearance.blendMode === 'multiply' &&
          context.appearance.dashPattern !== undefined;

        return null;
      },
    });

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'service-probe',
            label: { text: 'host label' },
            marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'missing-for-materialization' } }],
            children: steps,
            style: { color: 'red', fill: 'blue', blendMode: 'multiply', dashPattern: [2, 1] },
          },
        ],
      },
      { paths: [custom] },
    );

    expect(observed).toBe(true);
  });

  it('keeps effective color for a built-in stroke until stroke emission', () => {
    const compiled = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: steps,
          style: { color: 'crimson' },
        },
      ],
    }).scene;
    const primitive = compiled.primitives.find(value => value.type === 'path');

    expect(primitive).toMatchObject({ type: 'path', stroke: 'crimson' });
  });

  it('uses definition.name as the registry key independently of schema shape', () => {
    const definition = definePath({
      name: 'named-key',
      schema: PathSchema.extend({ kind: literal('custom') }),
      compile: () => null,
    });

    expect(definition.name).toBe('named-key');
    expect(resolvePathRegistry([definition]).has('named-key')).toBe(true);
  });
});
