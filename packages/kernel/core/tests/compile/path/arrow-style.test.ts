import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../../src';
import type { ArrowDefinition, IRArrowMark, IRPathStyle, IRStep } from '../../../src';
import { findPathPrim, pathIr } from './helpers';

const steps: Array<IRStep> = [
  { type: 'step', kind: 'move', to: [0, 0] },
  { type: 'step', kind: 'line', to: [100, 0] },
];

const compileArrow = (mark: IRArrowMark, style?: IRPathStyle, arrows?: Array<ArrowDefinition>) =>
  findPathPrim(
    compileToScene(pathIr(steps, { style: style ?? {}, marks: [{ pos: 1, mark }] }), { arrows }).scene.primitives,
  ).arrowEnd!.marker;

describe('箭头有效样式', () => {
  it.each(['normal', 'stealth', 'circle'])('实心 %s 保持无轮廓默认并消费显式描边', shape => {
    expect(compileArrow({ kind: 'arrow', shape })[0]).toMatchObject({ stroke: 'none' });
    expect(compileArrow({ kind: 'arrow', shape, stroke: 'red', dashPattern: [3, 2] })[0]).toMatchObject({
      stroke: 'red',
      dashPattern: [3, 2],
    });
  });

  it('Scope 主色覆盖公共与端点颜色，保留端点具体 paint', () => {
    const scene = compileToScene({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          defaults: {
            style: { color: 'blue' },
            path: { arrow: { color: 'red', start: { color: 'green' }, end: { fill: 'orange' } } },
          },
          children: [
            {
              type: 'path',
              children: steps,
              marks: [
                { pos: 0, mark: { kind: 'arrow', color: 'purple' } },
                { pos: 1, mark: { kind: 'arrow' } },
              ],
            },
          ],
        },
      ],
    }).scene;
    const group = scene.primitives[0];
    const path = findPathPrim(group.type === 'group' ? group.children : scene.primitives);
    expect(path.arrowStart?.marker[0]).toMatchObject({ fill: 'blue' });
    expect(path.arrowEnd?.marker[0]).toMatchObject({ fill: 'orange' });
  });

  it('Path 主色覆盖 mark 主色，具体填充仍然优先', () => {
    const style = { color: 'blue', stroke: 'red' };
    expect(compileArrow({ kind: 'arrow', color: 'green' }, style)[0]).toMatchObject({ fill: 'blue' });
    expect(compileArrow({ kind: 'arrow', color: 'green', fill: 'orange' }, style)[0]).toMatchObject({ fill: 'orange' });
    expect(compileArrow({ kind: 'arrow', color: 'green' }, { stroke: 'red' })[0]).toMatchObject({ fill: 'green' });
  });

  it('定义输出的固定局部样式不被选项再次覆盖', () => {
    const arrows: Array<ArrowDefinition> = [
      {
        name: 'two-tone',
        backX: 0,
        lineContactX: 0,
        emit: ctx => [
          {
            type: 'group',
            children: [
              { type: 'ellipse', cx: 2, cy: 2, rx: 1, ry: 1, fill: ctx.fill },
              { type: 'ellipse', cx: 5, cy: 2, rx: 1, ry: 1, fill: 'gold', stroke: 'black', dashPattern: [1, 1] },
            ],
          },
        ],
      },
    ];
    expect(
      compileArrow(
        { kind: 'arrow', shape: 'two-tone', fill: 'blue', stroke: 'red', dashPattern: [3, 2] },
        undefined,
        arrows,
      )[0],
    ).toMatchObject({
      type: 'group',
      children: [{ fill: 'blue' }, { fill: 'gold', stroke: 'black', dashPattern: [1, 1] }],
    });
  });

  it.each(['open', 'openStealth', 'openCircle'])('内置 %s 消费原子描边配置', shape => {
    expect(
      compileArrow({
        kind: 'arrow',
        shape,
        stroke: 'red',
        dashPattern: [3, 2],
        dashOffset: 2,
        lineCap: 'round',
        lineJoin: 'bevel',
      })[0],
    ).toMatchObject({
      fill: 'none',
      stroke: 'red',
      dashPattern: [3, 2],
      dashOffset: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'bevel',
    });
  });
});
