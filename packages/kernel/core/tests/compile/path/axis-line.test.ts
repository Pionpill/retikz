import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileWarning, IRPosition, IRScene, IRStep, ScenePrimitive } from '../../../src';

import { compileToScene, definePathGenerator } from '../../../src';
import { arrowMarks } from '../../helpers/arrow-marks';
import { flattenPrims } from '../../helpers/flatten';
import { line, move } from '../../helpers/path-command-factory';
import { findPathPrim, pathCommands } from './helpers';

describe('compile path: axis-line', () => {
  it('按当前 host 局部轴投影 horizontal / vertical endpoint', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [50, 80] },
        { type: 'step', kind: 'axis-line', axis: 'vertical', to: [70, 90] },
      ]),
    ).toEqual([move([10, 20]), line([50, 20]), line([50, 90])]);
  });

  it('NodeTarget 先解析中心再投影，target 端不做 implicit auto-boundary clipping', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'target', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [10, 20] },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'target' } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([move([10, 20]), line([100, 20])]);
  });

  it('source NodeTarget 仍以 projected endpoint 为 toward 做现有 boundary clipping', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'source', position: [0, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'source' } },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [100, 50] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([move([8, 0]), line([100, 0])]);
  });

  it('target NodeTarget 的隐式边界与 arrow inset 始终禁用', () => {
    const compile = (to: { id: string; anchor?: 'center' }) =>
      findPathPrim(
        compileToScene({
          version: 1,
          type: 'scene',
          children: [
            { type: 'node', id: 'target', position: [100, 0] },
            {
              type: 'path',
              marks: arrowMarks('->', { shape: 'open' }),
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'axis-line', axis: 'horizontal', to },
              ],
            },
          ],
        }).primitives,
      ).commands;
    expect(compile({ id: 'target' })).toEqual(compile({ id: 'target', anchor: 'center' }));
  });

  it('NodeTarget 显式 anchor 先按 boundary 解析，再叠加世界坐标 offset', () => {
    const endX = (to: {
      id: string;
      anchor?: 'center' | 'right';
      boundary?: 'rectangle';
      offset?: [number, number];
    }) => {
      const path = findPathPrim(
        compileToScene({
          version: 1,
          type: 'scene',
          children: [
            { type: 'node', id: 'target', position: [100, 60], text: 'target', shape: 'rectangle' },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [10, 20] },
                { type: 'step', kind: 'axis-line', axis: 'horizontal', to },
              ],
            },
          ],
        }).primitives,
      );
      const last = path.commands[path.commands.length - 1];
      if (last.kind !== 'line') throw new Error('expected line command');
      return last.to[0];
    };
    const center = endX({ id: 'target', anchor: 'center' });
    const right = endX({ id: 'target', anchor: 'right', boundary: 'rectangle' });
    const offsetRight = endX({
      id: 'target',
      anchor: 'right',
      boundary: 'rectangle',
      offset: [5, -3],
    });
    expect(right).toBeGreaterThan(center);
    expect(offsetRight).toBeCloseTo(right + 5, 6);
  });

  it('当前 Scope 的 rotate / scale 通过 inverse transform 后按局部轴投影', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'target', position: [100, 50] },
        {
          type: 'scope',
          transforms: [
            { kind: 'rotate', degrees: 90, pivot: [0, 0] },
            { kind: 'scale', x: 2, y: 1 },
          ],
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [10, 20] },
                { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'target' } },
              ],
            },
          ],
        },
      ],
    });
    const path = flattenPrims(scene.primitives).find(primitive => primitive.type === 'path');
    expect(path?.type === 'path' ? path.commands : undefined).toEqual([move([10, 20]), line([25, 20])]);
  });

  it('后置 Coordinate / Scope target 在 pending path flush 后解析', () => {
    const coordinateScene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [10, 20] },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'later-coordinate' } },
          ],
        },
        { type: 'coordinate', id: 'later-coordinate', position: [80, 90] },
      ],
    });
    const scopeScene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [10, 20] },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'later-scope' } },
          ],
        },
        {
          type: 'scope',
          id: 'later-scope',
          children: [{ type: 'node', id: 'scope-node', position: [120, 140] }],
        },
      ],
    });
    expect(findPathPrim(coordinateScene.primitives).commands).toEqual([move([10, 20]), line([80, 20])]);
    expect(findPathPrim(scopeScene.primitives).commands).toEqual([move([10, 20]), line([120, 20])]);
  });

  it('projected endpoint 同步为后续 relative / relativeAccumulate baseline', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [50, 80] },
        { type: 'step', kind: 'line', to: { relative: [5, 5] } },
        { type: 'step', kind: 'line', to: { relativeAccumulate: [10, 10] } },
        { type: 'step', kind: 'line', to: { relative: [2, 3] } },
      ]),
    ).toEqual([move([10, 20]), line([50, 20]), line([55, 25]), line([60, 30]), line([62, 33])]);
  });

  it('紧随 arc 时以实际 pen override 为 current reference', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [20, 100] },
      ]),
    ).toEqual([
      move([10, 0]),
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
      line([20, 10]),
    ]);
  });

  it('axis-line 后的普通绝对 target 会接管后续 relative baseline', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [50, 80] },
        { type: 'step', kind: 'line', to: [100, 100] },
        { type: 'step', kind: 'line', to: { relative: [5, 5] } },
      ]),
    ).toEqual([move([10, 20]), line([50, 20]), line([100, 100]), line([105, 105])]);
  });

  it('紧随 generator 时使用最后命令 pen override，并同步后续 relative baseline', () => {
    const generator = definePathGenerator({
      name: 'axis-probe',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 30, from[1] + 15] }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'axis-probe', params: {} },
            { type: 'step', kind: 'axis-line', axis: 'vertical', to: [100, 50] },
            { type: 'step', kind: 'line', to: { relative: [5, 5] } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir, { pathGenerators: [generator] }).primitives).commands).toEqual([
      move([0, 0]),
      line([30, 15]),
      line([30, 50]),
      line([35, 55]),
    ]);
  });

  it('动态 pen → axis-line 后，smooth relative points 使用 projected baseline', () => {
    const generator = definePathGenerator({
      name: 'axis-smooth-probe',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 30, from[1] + 15] }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'axis-smooth-probe', params: {} },
            { type: 'step', kind: 'axis-line', axis: 'vertical', to: [100, 50] },
            { type: 'step', kind: 'smooth', points: [{ relative: [5, 5] }] },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir, { pathGenerators: [generator] }).primitives).commands;
    const last = commands[commands.length - 1];
    expect(last).toMatchObject({ kind: 'cubic', to: [35, 55] });
  });

  it('axis-line → generator absolute to 后，relative 使用 generator target baseline', () => {
    const generator = definePathGenerator({
      name: 'axis-generator-target-probe',
      paramsSchema: z.strictObject({}),
      generate: ({ from, to }) => [{ kind: 'line', to: to ?? from }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 10] },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [20, 80] },
            { type: 'step', kind: 'generator', name: 'axis-generator-target-probe', params: {}, to: [60, 40] },
            { type: 'step', kind: 'line', to: { relative: [5, 5] } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir, { pathGenerators: [generator] }).primitives).commands).toEqual([
      move([0, 10]),
      line([20, 10]),
      line([60, 40]),
      line([65, 45]),
    ]);
  });

  it('动态 pen → axis-line → implicit arc 后，relative 使用 arc endpoint baseline', () => {
    const generator = definePathGenerator({
      name: 'axis-arc-probe',
      paramsSchema: z.strictObject({}),
      generate: ({ from }) => [{ kind: 'line', to: [from[0] + 30, from[1] + 15] }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'axis-arc-probe', params: {} },
            { type: 'step', kind: 'axis-line', axis: 'vertical', to: [100, 50] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'line', to: { relative: [5, 0] } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir, { pathGenerators: [generator] }).primitives).commands).toEqual([
      move([0, 0]),
      line([30, 15]),
      line([30, 50]),
      move([40, 50]),
      { kind: 'arc', center: [30, 50], radius: 10, startAngle: 0, endAngle: 90 },
      line([35, 60]),
    ]);
  });

  const penOverrideCases: Array<[string, Array<IRStep>, IRPosition]> = [
    [
      'rectangle',
      [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'rectangle', from: [10, 10], to: [30, 40] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [100, 100] },
      ],
      [100, 10],
    ],
    [
      'partial circle',
      [
        { type: 'step', kind: 'move', to: [20, 20] },
        { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 90, closed: 'open' },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [100, 100] },
      ],
      [100, 30],
    ],
    [
      'partial ellipse',
      [
        { type: 'step', kind: 'move', to: [20, 20] },
        {
          type: 'step',
          kind: 'ellipsePath',
          radius: { x: 20, y: 10 },
          startAngle: 0,
          endAngle: 90,
          closed: 'open',
        },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [100, 100] },
      ],
      [100, 30],
    ],
  ];

  it.each(penOverrideCases)('紧随 %s 时使用实际 pen override', (_name, children, expectedEnd) => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'path', children }],
    });
    const commands = findPathPrim(scene.primitives).commands;
    const last = commands[commands.length - 1];
    expect(last).toEqual(line(expectedEnd));
  });

  it('缺 current 时发 PATH_TOO_SHORT 并跳过整条 path', () => {
    const warnings: Array<CompileWarning> = [];
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [10, 20] },
              { type: 'step', kind: 'line', to: [30, 20] },
            ],
          },
        ],
      },
      { onWarn: warning => warnings.push(warning) },
    );
    expect(scene.primitives).toEqual([]);
    expect(warnings).toContainEqual(expect.objectContaining({ code: 'PATH_TOO_SHORT' }));
  });

  it('未定义 NodeTarget 发 UNRESOLVED_NODE_REFERENCE 并跳过整条 path', () => {
    const warnings: Array<CompileWarning> = [];
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'missing' } },
            ],
          },
        ],
      },
      { onWarn: warning => warnings.push(warning) },
    );
    expect(scene.primitives).toEqual([]);
    expect(warnings).toContainEqual(expect.objectContaining({ code: 'UNRESOLVED_NODE_REFERENCE' }));
  });

  it('boundary-only target 仍投影节点中心', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'target', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'axis-line',
              axis: 'horizontal',
              to: { id: 'target', boundary: 'circle' },
            },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([move([0, 0]), line([100, 0])]);
  });

  it('连续零长度投影保留合法 line commands', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [10, 99] },
        { type: 'step', kind: 'axis-line', axis: 'vertical', to: [42, 20] },
      ]),
    ).toEqual([move([10, 20]), line([10, 20]), line([10, 20])]);
  });

  it('非 finite projected endpoint fail-loud', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'axis-line',
              axis: 'horizontal',
              to: [Number.POSITIVE_INFINITY, 0],
            },
          ],
        },
      ],
    } as unknown as IRScene;
    expect(() => compileToScene(ir)).toThrow(/non-finite/i);
  });

  it('label sampler 使用投影后的真实 segment', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [10, 20] },
            {
              type: 'step',
              kind: 'axis-line',
              axis: 'horizontal',
              to: [50, 80],
              label: { text: 'x' },
            },
          ],
        },
      ],
    });
    const label = flattenPrims(scene.primitives).find(primitive => primitive.type === 'text');
    expect(label).toMatchObject({ type: 'text', x: 30 });
  });

  it('path mark 沿投影后的真实 segment 采样', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }],
          children: [
            { type: 'step', kind: 'move', to: [10, 20] },
            { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [90, 80] },
          ],
        },
      ],
    });
    const markerPoints: Array<[number, number]> = [];
    const visit = (primitives: ReadonlyArray<ScenePrimitive>): void => {
      for (const primitive of primitives) {
        if (primitive.type !== 'group') continue;
        const first = primitive.transforms?.[0];
        if (first?.kind === 'translate') markerPoints.push([first.x, first.y]);
        visit(primitive.children);
      }
    };
    visit(scene.primitives);
    expect(markerPoints).toContainEqual([50, 20]);
  });

  it('axis-line provenance 不打断 line-line rounded corners', () => {
    const commands = pathCommands(
      [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [20, 10] },
        { type: 'step', kind: 'line', to: [20, 20] },
      ],
      { roundedCorners: 4 },
    );
    expect(commands.some(command => command.kind === 'arc')).toBe(true);
  });
});
