import { describe, expect, it } from 'vitest';

import { PathMarkSchema } from '../../src/schemas';

const start = { kind: 'move', to: [0, 0] };
const dataPosition = { x: { field: 'x' }, y: { field: 'y' } };
const mark = (step: unknown) => ({ type: 'path', encodings: { steps: [start, step] } });

describe('显式路径步骤', () => {
  it.each([
    { kind: 'move', to: dataPosition },
    { kind: 'line', to: dataPosition },
    { kind: 'axis-line', axis: 'horizontal', to: dataPosition },
    { kind: 'fold', via: '-|-', fraction: 0.3, to: dataPosition },
    { kind: 'cycle' },
    { kind: 'curve', to: dataPosition, control: dataPosition },
    { kind: 'cubic', to: dataPosition, control1: [1, 2], control2: dataPosition },
    { kind: 'bend', to: { mark: 'nodes', key: { field: 'target' } }, outAngle: 30 },
    { kind: 'arc', center: dataPosition, radius: 10, startAngle: 0, endAngle: 90 },
    { kind: 'circlePath', radius: 10 },
    { kind: 'ellipsePath', radius: { x: 10, y: 20 } },
    { kind: 'rectangle', from: dataPosition, to: [10, 20] },
    { kind: 'smooth', points: [dataPosition, { relative: [10, 20] }] },
  ])('往返 $kind，有自己的构造场', step => {
    const source = mark(step);
    const parsed = PathMarkSchema.parse(source);
    expect(parsed.encodings).toEqual(source.encodings);
    expect(PathMarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it.each([
    { kind: 'curve', to: [1, 2] },
    { kind: 'curve', to: [1, 2], control: { mark: 'nodes', key: { value: 'a' } } },
    { kind: 'cycle', to: [1, 2] },
    { kind: 'fold', via: '-|', fraction: 0.3, to: [1, 2] },
    { kind: 'circlePath', radius: 10, startAngle: 0 },
    { kind: 'ellipsePath', radius: { x: 10, y: 20 }, startAngle: 0, endAngle: 90, closed: 'closed' },
    { kind: 'line', type: 'step', to: [1, 2] },
    { kind: 'line', to: { relative: [1, 2], ...dataPosition } },
    { kind: 'line', to: { relative: [1, 2], mark: 'nodes', key: { value: 'a' } } },
    { kind: 'axis-line', axis: 'horizontal', to: { id: 'node', ...dataPosition } },
  ])('拒绝格式错误的外部步骤：%j', step => {
    expect(PathMarkSchema.safeParse(mark(step)).success).toBe(false);
  });

  it('拒绝混合路径输入和仅顶点属性', () => {
    const source = mark({ kind: 'line', to: [1, 2] });
    expect(
      PathMarkSchema.safeParse({ ...source, encodings: { ...source.encodings, position: dataPosition } }).success,
    ).toBe(false);
    for (const properties of [
      { curve: 'linear' },
      { closed: false },
      { connection: 'straight' },
      { connectNulls: false },
    ]) {
      expect(PathMarkSchema.safeParse({ ...source, properties }).success).toBe(false);
    }
    expect(PathMarkSchema.parse({ ...source, properties: { strokeWidth: 2 } }).properties).toEqual({ strokeWidth: 2 });
  });
});
