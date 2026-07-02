import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileOptions } from '../../src/compile/compile';
import type { BoundaryDefinition } from '../../src/contract';
import type { ScenePrimitive } from '../../src/contract';
import type { IR, IRBoundary } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { defineBoundary } from '../../src/contract';
import { defineShape } from '../../src/contract';
import { BoundarySchema } from '../../src/schemas/boundary';
import { flattenPrims } from '../helpers/flatten';

const lineEndpoint = (options: CompileOptions, boundary?: IRBoundary): [number, number] => {
  const node = {
    type: 'node',
    id: 'a',
    position: [0, 0],
    minimumSize: 40,
    boundary,
  } satisfies IR['children'][number];
  const ir: IR = {
    version: 1,
    type: 'scene',
    children: [
      node,
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [100, 0] },
          { type: 'step', kind: 'line', to: { id: 'a' } },
        ],
      },
    ],
  };
  const scene = compileToScene(ir, { padding: 0, ...options });
  const prim = flattenPrims(scene.primitives).find(
    (p): p is Extract<ScenePrimitive, { type: 'path' }> =>
      p.type === 'path' && !p.commands.some(command => command.kind === 'close'),
  );
  if (prim === undefined) throw new Error('expected connection path');
  const line = prim.commands.find((command): command is Extract<(typeof prim.commands)[number], { kind: 'line' }> =>
    command.kind === 'line',
  );
  if (line === undefined) throw new Error('expected line command');
  return [line.to[0], line.to[1]];
};

const fixedBoundary = (name: string, x: number): BoundaryDefinition =>
  defineBoundary({
    name,
    paramsSchema: z.strictObject({}),
    boundaryPoint: rect => [rect.x + x, rect.y],
  });

describe('Boundary provider contract', () => {
  it('boundary_provider_custom_point：注册 custom boundary 后 path endpoint 使用 BoundaryDefinition.boundaryPoint', () => {
    expect(lineEndpoint({ boundaries: [fixedBoundary('pin', 7)] }, 'pin')).toEqual([7, 0]);
  });

  it('boundary_provider_custom_params：boundary params 经 paramsSchema parse 后传给 provider', () => {
    const parametric = defineBoundary({
      name: 'pin',
      paramsSchema: z.strictObject({ offset: z.number().positive() }),
      boundaryPoint: (rect, _toward, params) => [rect.x + Number(params.offset), rect.y],
    });

    expect(lineEndpoint({ boundaries: [parametric] }, { type: 'pin', params: { offset: 11 } })).toEqual([11, 0]);
  });

  it('boundary_default_shape_unchanged：未写 boundary 与显式 shape 等价', () => {
    expect(lineEndpoint({}, undefined)).toEqual(lineEndpoint({}, 'shape'));
  });

  it('boundary_shape_fallback_kept：boundary registry 查不到时仍可 fallback 到 shape registry', () => {
    const shapeBoundary = defineShape({
      name: 'shape-surface',
      paramsSchema: z.strictObject({}),
      circumscribe: () => ({ halfWidth: 20, halfHeight: 20 }),
      boundaryPoint: rect => [rect.x + 13, rect.y],
      anchor: () => undefined,
      *emit(): Iterable<ScenePrimitive> {},
    });

    expect(lineEndpoint({ shapes: [shapeBoundary] }, 'shape-surface')).toEqual([13, 0]);
  });

  it('boundary_provider_priority_over_shape_fallback：boundary provider 与 shape 同名时 provider 优先', () => {
    const sameNameShape = defineShape({
      name: 'same',
      paramsSchema: z.strictObject({}),
      circumscribe: () => ({ halfWidth: 20, halfHeight: 20 }),
      boundaryPoint: rect => [rect.x + 17, rect.y],
      anchor: () => undefined,
      *emit(): Iterable<ScenePrimitive> {},
    });

    expect(lineEndpoint({ boundaries: [fixedBoundary('same', 5)], shapes: [sameNameShape] }, 'same')).toEqual([5, 0]);
  });

  it('boundary_unknown_lists_boundaries_and_shapes：未知连接面错误同时提示 boundaries 与 shapes', () => {
    expect(() => lineEndpoint({ boundaries: [fixedBoundary('pin', 7)] }, 'missing')).toThrow(/options\.boundaries/i);
    expect(() => lineEndpoint({ boundaries: [fixedBoundary('pin', 7)] }, 'missing')).toThrow(/options\.shapes/i);
  });

  it('boundary_params_schema_rejects：provider params schema 拒绝非法参数', () => {
    const parametric = defineBoundary({
      name: 'pin',
      paramsSchema: z.strictObject({ offset: z.number().positive() }),
      boundaryPoint: (rect, _toward, params) => [rect.x + Number(params.offset), rect.y],
    });

    expect(() => lineEndpoint({ boundaries: [parametric] }, { type: 'pin', params: { offset: -1 } })).toThrow();
  });

  it('boundary_json_round_trip：boundary IR 只保存 JSON-safe 引用和 params', () => {
    const boundary = { type: 'pin', params: { offset: 11 } };
    expect(BoundarySchema.parse(JSON.parse(JSON.stringify(boundary)))).toEqual(boundary);
  });
});
