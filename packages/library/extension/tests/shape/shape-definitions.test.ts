import type { IRScene, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  contourShapeDefinition,
  contourShapeProvider,
  crossShapeDefinition,
  crossShapeProvider,
  ellipticCapsuleShapeDefinition,
  ellipticCapsuleShapeProvider,
  sectorShapeDefinition,
  sectorShapeProvider,
  extensionShapeDefinitions,
  BuiltinExtensionShapeName,
  extensionShapeProviders,
  starShapeDefinition,
  starShapeProvider,
} from '../../src/node-shape';

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

describe('扩展可选形状定义', () => {
  it('解决横向宽度和高度覆盖的边、轴，然后默认', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'node',
          position: [0, 0],
          shape: {
            type: 'cross',
            params: {
              width: { default: 4, horizontal: 6, vertical: 8 },
              height: { default: 10, horizontal: 12, vertical: 14, top: 20, right: 22, bottom: 24, left: 26 },
            },
          },
        },
      ]),
      { padding: 0, shapes: [crossShapeDefinition] },
    ).scene;

    const path = firstPath(compiled.primitives);

    expect(path?.commands).toEqual([
      { kind: 'move', to: [-4, -20] },
      { kind: 'line', to: [4, -20] },
      { kind: 'line', to: [4, -3] },
      { kind: 'line', to: [22, -3] },
      { kind: 'line', to: [22, 3] },
      { kind: 'line', to: [4, 3] },
      { kind: 'line', to: [4, 24] },
      { kind: 'line', to: [-4, 24] },
      { kind: 'line', to: [-4, 3] },
      { kind: 'line', to: [-26, 3] },
      { kind: 'line', to: [-26, -3] },
      { kind: 'line', to: [-4, -3] },
      { kind: 'close' },
    ]);
  });

  it('接受对称臂的标量交叉宽度和高度', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'node',
          position: [0, 0],
          shape: { type: 'cross', params: { width: 6, height: 10 } },
        },
      ]),
      { padding: 0, shapes: [crossShapeDefinition] },
    ).scene;

    const path = firstPath(compiled.primitives);

    expect(path?.commands).toEqual([
      { kind: 'move', to: [-3, -10] },
      { kind: 'line', to: [3, -10] },
      { kind: 'line', to: [3, -3] },
      { kind: 'line', to: [10, -3] },
      { kind: 'line', to: [10, 3] },
      { kind: 'line', to: [3, 3] },
      { kind: 'line', to: [3, 10] },
      { kind: 'line', to: [-3, 10] },
      { kind: 'line', to: [-3, 3] },
      { kind: 'line', to: [-10, 3] },
      { kind: 'line', to: [-10, -3] },
      { kind: 'line', to: [-3, -3] },
      { kind: 'close' },
    ]);
  });

  it('在对象默认值之前使用交叉轴覆盖', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'node',
          position: [0, 0],
          shape: {
            type: 'cross',
            params: {
              width: { default: 4, horizontal: 6 },
              height: { default: 10, horizontal: 12, vertical: 14 },
            },
          },
        },
      ]),
      { padding: 0, shapes: [crossShapeDefinition] },
    ).scene;

    const path = firstPath(compiled.primitives);

    expect(path?.commands).toEqual([
      { kind: 'move', to: [-2, -14] },
      { kind: 'line', to: [2, -14] },
      { kind: 'line', to: [2, -3] },
      { kind: 'line', to: [12, -3] },
      { kind: 'line', to: [12, 3] },
      { kind: 'line', to: [2, 3] },
      { kind: 'line', to: [2, 14] },
      { kind: 'line', to: [-2, 14] },
      { kind: 'line', to: [-2, 3] },
      { kind: 'line', to: [-12, 3] },
      { kind: 'line', to: [-12, -3] },
      { kind: 'line', to: [-2, -3] },
      { kind: 'close' },
    ]);
  });

  it('将零厚度扇区编译为开放弧', () => {
    const compiled = compileToScene(
      scene([
        {
          type: 'node',
          position: [0, 0],
          shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 20, startAngle: 0, endAngle: 90 } },
        },
      ]),
      { padding: 0, shapes: [sectorShapeDefinition] },
    ).scene;

    const path = firstPath(compiled.primitives);

    expect(path?.commands).toEqual([
      { kind: 'move', to: [20, 0] },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 0, endAngle: 90 },
    ]);
    expect(path?.fill).toBe('transparent');
    expect(path?.commands.some(command => command.kind === 'close')).toBe(false);
  });

  it('拒绝大于外半径的内半径', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'node',
            position: [0, 0],
            shape: { type: 'sector', params: { innerRadius: 21, outerRadius: 20, startAngle: 0, endAngle: 90 } },
          },
        ]),
        { padding: 0, shapes: [sectorShapeDefinition] },
      ),
    ).toThrow('outerRadius must be greater than or equal to innerRadius');
  });

  it('编译十字、扇形、星形和轮廓定义及其视觉路径语义', () => {
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
        shapes: [crossShapeDefinition, sectorShapeDefinition, starShapeDefinition, contourShapeDefinition],
      },
    ).scene;

    const paths = pathsOf(compiled.primitives);

    expect(paths).toHaveLength(4);
    expect(
      paths.find(primitive => primitive.fillRule === 'evenodd')?.commands.filter(command => command.kind === 'arc'),
    ).toHaveLength(2);
  });

  it('在编译的 Scene 中保持每个显式可选形状定义可观察', () => {
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
        shapes: [crossShapeDefinition, sectorShapeDefinition, starShapeDefinition, contourShapeDefinition],
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

  it('通过独立的静态 Core 提供者导出每个形状', () => {
    expect(crossShapeProvider.makeDefinition([])).toBe(crossShapeDefinition);
    expect(sectorShapeProvider.makeDefinition([])).toBe(sectorShapeDefinition);
    expect(starShapeProvider.makeDefinition([])).toBe(starShapeDefinition);
    expect(contourShapeProvider.makeDefinition([])).toBe(contourShapeDefinition);
    expect(ellipticCapsuleShapeProvider.makeDefinition([])).toBe(ellipticCapsuleShapeDefinition);
    expect(ellipticCapsuleShapeDefinition.name).toBe(BuiltinExtensionShapeName.EllipticCapsule);
    expect(extensionShapeDefinitions).toContain(ellipticCapsuleShapeDefinition);
    expect(extensionShapeProviders).toContain(ellipticCapsuleShapeProvider);
  });
});
