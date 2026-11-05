import { describe, expect, it } from 'vitest';

import { emitTextLine, fallbackMeasurer, layoutTextLine, snapshotLoweredTex } from '../../../../core/src/compile/text';
import type { GroupPrimitive, PathPrimitive } from '../../../../core/src/contract';

describe('[tex-lowering]多路径契约', () => {
  it.each([
    { width: -1, height: 8, depth: 2 },
    { width: 10, height: -1, depth: 0 },
    { width: 10, height: 8, depth: -1 },
    { width: 10, height: 8, depth: 9 },
    { width: Number.NaN, height: 8, depth: 2 },
    { width: 10, height: Number.POSITIVE_INFINITY, depth: 2 },
  ])('拒绝无法用于公式布局的尺寸 %j', metrics => {
    expect(() => snapshotLoweredTex({ paths: [], ...metrics })).toThrow(/invalid|non-finite|depth greater/);
  });

  it.each([{ strokeWidth: -1 }, { opacity: Number.NaN }])('拒绝非法描边尺寸或非有限的公式属性 %j', style => {
    expect(() =>
      snapshotLoweredTex({
        paths: [{ commands: [], fill: { kind: 'none' }, stroke: { kind: 'currentColor' }, ...style }],
        width: 10,
        height: 8,
        depth: 2,
      }),
    ).toThrow(/invalid|non-finite/);
  });

  it('按 paint order 输出多条路径并解析宿主颜色与透明度', () => {
    const line = layoutTextLine([{ tex: 'x', fontSize: 16 }], {
      measureText: fallbackMeasurer,
      font: { size: 16 },
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

    const [group] = emitTextLine(
      line,
      { color: '#333', opacity: 0.5, segments: [{ fill: '#0af', opacity: 0.8 }] },
      0,
      6,
      value => value,
    ) as Array<GroupPrimitive>;

    expect(group.children).toHaveLength(2);

    const [first, second] = group.children as Array<PathPrimitive>;

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
    const line = layoutTextLine([{ tex: 'x', fontSize: 16 }], {
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

    const [group] = emitTextLine(line, { segments: [{}] }, 0, 1, value => value) as Array<GroupPrimitive>;
    const [path] = group.children as Array<PathPrimitive>;

    expect(path).not.toHaveProperty('fill');
    expect(path.stroke).toBe('currentColor');
  });

  it('在 lowerTex 返回后复制独立的路径快照', () => {
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
    const line = layoutTextLine([{ tex: 'x', fontSize: 16 }], {
      measureText: fallbackMeasurer,
      font: { size: 16 },
      warn: () => undefined,
      lowerTex: () => lowered,
    });

    command.to[0] = 99;
    lowered.paths.length = 0;

    const [group] = emitTextLine(line, { segments: [{}] }, 0, 1, value => value) as Array<GroupPrimitive>;
    const [path] = group.children as Array<PathPrimitive>;

    expect(path.commands).toEqual([{ kind: 'move', to: [0, 0] }]);
  });

  it('只读取一次动态 lowerTex 结果后再校验与消费', () => {
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
      widthReads: 1,
      commandKindReads: 1,
      paintKindReads: 1,
    });
  });
});
