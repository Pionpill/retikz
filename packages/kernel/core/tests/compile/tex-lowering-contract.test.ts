import { describe, expect, it } from 'vitest';

import type { GroupPrim, PathPrim } from '../../src/contract';

import { fallbackMeasurer, layoutInlineLine, snapshotLoweredTex } from '../../src/compile/text';

describe('[tex-lowering] multi-path contract', () => {
  it('按 paint order 输出多条路径并解析宿主颜色与透明度', () => {
    const line = layoutInlineLine([{ tex: 'x', fill: '#0af', opacity: 0.8 }], {
      measureText: fallbackMeasurer,
      font: { size: 16 },
      color: '#333',
      opacity: 0.5,
      warn: () => undefined,
      lowerTex: () => ({
        paths: [
          {
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [10, 0] },
            ],
            fill: { kind: 'currentColor' },
            fillOpacity: 0.7,
            stroke: { kind: 'none' },
            opacity: 0.5,
            fillRule: 'nonzero',
          },
          {
            commands: [
              { kind: 'move', to: [0, 1] },
              { kind: 'line', to: [10, 1] },
            ],
            fill: { kind: 'color', value: 'crimson' },
            stroke: { kind: 'currentColor' },
            strokeWidth: 2,
            strokeOpacity: 0.4,
          },
        ],
        width: 10,
        height: 8,
        depth: 2,
      }),
    });

    const [group] = line.emit(0, 6, value => value) as Array<GroupPrim>;
    expect(group.children).toHaveLength(2);

    const [first, second] = group.children as Array<PathPrim>;
    expect(first).toMatchObject({
      type: 'path',
      fill: '#0af',
      fillOpacity: 0.7,
      fillRule: 'nonzero',
      opacity: 0.2,
    });
    expect(first).not.toHaveProperty('stroke');

    expect(second).toMatchObject({
      type: 'path',
      fill: 'crimson',
      stroke: '#0af',
      strokeWidth: 2,
      strokeOpacity: 0.4,
      fillRule: 'evenodd',
      opacity: 0.4,
    });
  });

  it('仅 currentColor 回退到宿主默认色，none 不输出 paint', () => {
    const line = layoutInlineLine([{ tex: 'x' }], {
      measureText: fallbackMeasurer,
      font: { size: 16 },
      warn: () => undefined,
      lowerTex: () => ({
        paths: [
          {
            commands: [{ kind: 'move', to: [0, 0] }],
            fill: { kind: 'none' },
            stroke: { kind: 'currentColor' },
          },
        ],
        width: 1,
        height: 1,
        depth: 0,
      }),
    });

    const [group] = line.emit(0, 1, value => value) as Array<GroupPrim>;
    const [path] = group.children as Array<PathPrim>;
    expect(path).not.toHaveProperty('fill');
    expect(path.stroke).toBe('currentColor');
  });

  it('在 lowerTex 返回后脱离并冻结路径快照', () => {
    const command = { kind: 'move' as const, to: [0, 0] as [number, number] };
    const lowered = {
      paths: [
        {
          commands: [command],
          fill: { kind: 'none' as const },
          stroke: { kind: 'currentColor' as const },
        },
      ],
      width: 1,
      height: 1,
      depth: 0,
    };
    const line = layoutInlineLine([{ tex: 'x' }], {
      measureText: fallbackMeasurer,
      font: { size: 16 },
      warn: () => undefined,
      lowerTex: () => lowered,
    });

    command.to[0] = 99;
    lowered.paths.length = 0;

    const [group] = line.emit(0, 1, value => value) as Array<GroupPrim>;
    const [path] = group.children as Array<PathPrim>;
    expect(path.commands).toEqual([{ kind: 'move', to: [0, 0] }]);
  });

  it('从属性描述符快照动态 lowerTex 结果后再校验与消费', () => {
    let widthReads = 0;
    let commandKindReads = 0;
    let paintKindReads = 0;
    const command = new Proxy(
      { kind: 'move' as const, to: [0, 0] as [number, number] },
      {
        get: (target, property, receiver) => {
          if (property === 'kind') {
            commandKindReads += 1;
            return commandKindReads === 1 ? 'move' : 'bogus';
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const fill = new Proxy(
      { kind: 'none' as const },
      {
        get: (target, property, receiver) => {
          if (property === 'kind') {
            paintKindReads += 1;
            return paintKindReads === 1 ? 'none' : 'bogus';
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const lowered = new Proxy(
      {
        paths: [{ commands: [command], fill, stroke: { kind: 'currentColor' as const } }],
        width: 1,
        height: 1,
        depth: 0,
      },
      {
        get: (target, property, receiver) => {
          if (property === 'width') {
            widthReads += 1;
            return widthReads === 1 ? 1 : Number.NaN;
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );

    expect(snapshotLoweredTex(lowered)).toEqual({
      paths: [
        {
          commands: [{ kind: 'move', to: [0, 0] }],
          fill: { kind: 'none' },
          stroke: { kind: 'currentColor' },
        },
      ],
      width: 1,
      height: 1,
      depth: 0,
    });
    expect({ widthReads, commandKindReads, paintKindReads }).toEqual({
      widthReads: 0,
      commandKindReads: 0,
      paintKindReads: 0,
    });
  });
});
