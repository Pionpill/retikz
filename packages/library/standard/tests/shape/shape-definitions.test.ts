import type { IRScene, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  ArcShapeDefinition,
  ArcShapeProvider,
  ContourShapeDefinition,
  ContourShapeProvider,
  CrossShapeDefinition,
  CrossShapeProvider,
  SectorShapeDefinition,
  SectorShapeProvider,
  StarShapeDefinition,
  StarShapeProvider,
} from '../../src/shape';

const scene = (children: IRScene['children']): IRScene => ({ type: 'scene', version: 1, children });

const firstPath = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'path' }> | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'path') return primitive;
    if (primitive.type === 'group') {
      const path = firstPath(primitive.children);
      if (path !== undefined) return path;
    }
  }
  return undefined;
};

const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'path' }>> =>
  primitives.flatMap(primitive =>
    primitive.type === 'path' ? [primitive] : primitive.type === 'group' ? pathsOf(primitive.children) : [],
  );

describe('Standard optional shape definitions', () => {
  it('compiles a parameterized arc and preserves its open path commands', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'node',
          position: [0, 0],
          shape: { type: 'arc', params: { radius: 20, startAngle: 0, endAngle: 90 } },
        },
      ]),
      { padding: 0, shapes: [ArcShapeDefinition] },
    ).scene;

    const path = firstPath(compiled.primitives);
    expect(path?.commands).toEqual([
      { kind: 'move', to: [20, 0] },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 0, endAngle: 90 },
    ]);
  });

  it('compiles cross, sector, star, and contour definitions with their visual path semantics', () => {
    const compiled = compileToScene(
      scene([
        { type: 'node', position: [0, 0], shape: 'cross' },
        {
          type: 'node',
          position: [100, 0],
          shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 20, startAngle: 0, endAngle: 90 } },
        },
        {
          type: 'node',
          position: [200, 0],
          shape: { type: 'star', params: { points: 5, innerRadius: 8, outerRadius: 16 } },
        },
        {
          type: 'node',
          position: [300, 0],
          shape: {
            type: 'contour',
            params: {
              points: [
                [0, 0],
                [20, 0],
                [10, 20],
              ],
            },
          },
        },
      ]),
      {
        padding: 0,
        shapes: [CrossShapeDefinition, SectorShapeDefinition, StarShapeDefinition, ContourShapeDefinition],
      },
    ).scene;

    const paths = pathsOf(compiled.primitives);
    expect(paths).toHaveLength(4);
    expect(
      paths.find(primitive => primitive.fillRule === 'evenodd')?.commands.filter(command => command.kind === 'arc'),
    ).toHaveLength(2);
  });

  it('keeps every explicit optional shape definition observable in the compiled Scene', () => {
    const compiled = compileToScene(
      scene([
        { type: 'node', position: [0, 0], shape: 'cross' },
        {
          type: 'node',
          position: [100, 0],
          shape: { type: 'sector', params: { innerRadius: 0, outerRadius: 20, startAngle: 0, endAngle: 90 } },
        },
        {
          type: 'node',
          position: [200, 0],
          shape: { type: 'star', params: { points: 5, innerRadius: 8, outerRadius: 16 } },
        },
        {
          type: 'node',
          position: [300, 0],
          shape: {
            type: 'contour',
            params: {
              points: [
                [0, 0],
                [20, 0],
                [10, 20],
              ],
            },
          },
        },
      ]),
      {
        padding: 0,
        shapes: [CrossShapeDefinition, SectorShapeDefinition, StarShapeDefinition, ContourShapeDefinition],
      },
    ).scene;
    const paths = pathsOf(compiled.primitives);

    expect(paths[0]?.commands).toEqual([
      { kind: 'move', to: [-8, -24] },
      { kind: 'line', to: [8, -24] },
      { kind: 'line', to: [8, -8] },
      { kind: 'line', to: [24, -8] },
      { kind: 'line', to: [24, 8] },
      { kind: 'line', to: [8, 8] },
      { kind: 'line', to: [8, 24] },
      { kind: 'line', to: [-8, 24] },
      { kind: 'line', to: [-8, 8] },
      { kind: 'line', to: [-24, 8] },
      { kind: 'line', to: [-24, -8] },
      { kind: 'line', to: [-8, -8] },
      { kind: 'close' },
    ]);
    expect(paths[1]?.commands).toEqual([
      { kind: 'move', to: [100, 0] },
      { kind: 'line', to: [120, 0] },
      { kind: 'arc', center: [100, 0], radius: 20, startAngle: 0, endAngle: 90 },
      { kind: 'close' },
    ]);
    expect(paths[2]?.commands).toHaveLength(11);
    expect(paths[2]?.commands.at(-1)).toEqual({ kind: 'close' });
    expect(paths[3]?.commands).toEqual([
      { kind: 'move', to: [290, -10] },
      { kind: 'line', to: [310, -10] },
      { kind: 'line', to: [300, 10] },
      { kind: 'close' },
    ]);
  });

  it('exports each shape through an independent static Core provider', () => {
    expect(CrossShapeProvider.makeDefinition({})).toBe(CrossShapeDefinition);
    expect(ArcShapeProvider.makeDefinition({})).toBe(ArcShapeDefinition);
    expect(SectorShapeProvider.makeDefinition({})).toBe(SectorShapeDefinition);
    expect(StarShapeProvider.makeDefinition({})).toBe(StarShapeDefinition);
    expect(ContourShapeProvider.makeDefinition({})).toBe(ContourShapeDefinition);
  });
});
