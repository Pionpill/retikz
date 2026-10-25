import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src';
import type { IRStep } from '../../src';
import { flattenPrims } from '../helpers/flatten';
import { pathIr } from './path/helpers';

const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
];

describe('内置路径标记', () => {
  it.each(['times', 'plus', 'check', 'star'])('%s 无需注册，居中放置且不截断宿主', shape => {
    const baseline = compileToScene(pathIr(steps)).scene;
    const scene = compileToScene(
      pathIr(steps, {
        marks: [{ pos: 0.5, shape, rotate: 30, scale: 2, stroke: 'red', fill: 'blue', lineWidth: 2 }],
      }),
    ).scene;
    const primitives = flattenPrims(scene.primitives);
    const paths = primitives.filter(primitive => primitive.type === 'path');
    expect(paths[0].commands).toEqual(
      flattenPrims(baseline.primitives).find(primitive => primitive.type === 'path')?.commands,
    );
    expect(paths).toHaveLength(2);
    expect(paths[1]).toMatchObject({ stroke: 'red', fill: shape === 'star' ? 'blue' : 'none' });
    if (shape !== 'star') expect(paths[1].strokeWidth).toBe(2);
    const placement = primitives.find(
      primitive => primitive.type === 'group' && primitive.transforms?.[0]?.kind === 'translate',
    );
    expect(placement).toMatchObject({
      transforms: [
        { kind: 'translate', x: 50, y: 0 },
        { kind: 'rotate', degrees: 30 },
        { kind: 'scale', x: 1.6, y: 1.6 },
        { kind: 'translate', x: -5, y: -5 },
      ],
    });
    const commands = paths[1].commands;
    expect(commands.filter(command => command.kind === 'move')).toHaveLength(
      shape === 'times' || shape === 'plus' ? 2 : 1,
    );
    expect(commands.filter(command => command.kind === 'line')).toHaveLength(shape === 'star' ? 9 : 2);
    expect(commands.some(command => command.kind === 'close')).toBe(shape === 'star');
  });

  it('线条标记继承宿主描边，星形继承宿主主色', () => {
    const scene = compileToScene(
      pathIr(steps, {
        style: { stroke: '#123456' },
        marks: [
          { pos: 0.25, shape: 'times' },
          { pos: 0.75, shape: 'star' },
        ],
      }),
    ).scene;
    const paths = flattenPrims(scene.primitives).filter(primitive => primitive.type === 'path');
    expect(paths[1]).toMatchObject({ stroke: '#123456', fill: 'none' });
    expect(paths[2]).toMatchObject({ fill: '#123456' });
  });

  it.each(['times', 'plus', 'check', 'star'])('%s 拒绝普通定义或箭头覆盖，也不能用于端点', name => {
    const input = pathIr(steps);
    expect(() => compileToScene(input, { marks: [{ name, emit: () => [] }] })).toThrow(/duplicate mark/);
    expect(() => compileToScene(input, { arrows: [{ name, backX: 0, lineContactX: 0, emit: () => [] }] })).toThrow(
      /duplicate mark/,
    );
    expect(() => compileToScene(pathIr(steps, { arrow: { end: { shape: name } } }))).toThrow(name);
  });
});
