import { BUILTIN_SHAPES } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

/** 典型形态与单个 polygon 的边数参考，不枚举所有方法和参数组合 */
const cases: Array<{ name: string; params: JsonObject }> = [
  { name: 'rectangle', params: {} },
  { name: 'rectangle', params: { cornerRadius: 8 } },
  { name: 'ellipse', params: {} },
  { name: 'polygon', params: { sides: 4, aspectRatio: 2 } },
  ...[6, 1024].flatMap(sides => [0, 2].map(cornerRadius => ({ name: 'polygon', params: { sides, cornerRadius } }))),
];

for (const entry of cases) {
  const shape = BUILTIN_SHAPES.get(entry.name)!;
  const label = JSON.stringify(entry.params);
  const bounds = { x: 10, y: 20, width: 120, height: 80 };
  const params = shape.paramsSchema.parse(entry.params);
  const register = <T>(operation: string, run: () => T, verify: (result: T) => void) =>
    defineBenchmark(
      {
        id: `providers/shape/${entry.name}/${label}/${operation}`,
        dimensions: [`Shape ${operation}`, entry.name, label],
      },
      () => ({ run, verify }),
    );

  register(
    'boundary',
    () => shape.computeBoundaryPoint(bounds, [1000, 20], params),
    result => {
      if (entry.name === 'polygon' && params.cornerRadius) {
        expect(result[0]).toBeGreaterThan(10);
        expect(result[0]).toBeLessThanOrEqual(70 + 1e-8);
      } else expect(result[0]).toBeCloseTo(70);
      expect(result[1]).toBeCloseTo(20);
    },
  );
  const style = { fill: '#123456', stroke: '#abcdef' };
  register(
    'emit',
    () => Array.from(shape.emit(bounds, style, Math.round, params)),
    result => {
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(style);
      if (entry.name === 'rectangle')
        expect(result[0]).toMatchObject({ type: 'rect', x: -50, y: -20, width: 120, height: 80 });
      if (entry.name === 'ellipse')
        expect(result[0]).toMatchObject({ type: 'ellipse', cx: 10, cy: 20, rx: 60, ry: 40 });
      if (result[0].type === 'path') expect(result[0].commands.at(-1)).toEqual({ kind: 'close' });
    },
  );

  // 圆角不影响外接尺寸和连接包络，不重复该参数分支
  if (!params.cornerRadius) {
    register(
      'circumscribe',
      () => shape.computeCircumscribedGeometry(30, 20, params),
      result => {
        expect(result.halfWidth).toBeGreaterThanOrEqual(30);
        expect(result.halfHeight).toBeGreaterThanOrEqual(20);
        if (entry.name === 'rectangle') expect(result).toEqual({ halfWidth: 30, halfHeight: 20 });
      },
    );
    const envelope = shape.computeConnectionEnvelope!;
    register(
      'envelope-circle',
      () => envelope(bounds, 'circle', params),
      result => {
        expect(result?.halfWidth).toBeGreaterThanOrEqual(60 - 1e-8);
        expect(result?.halfWidth).toBeCloseTo(result!.halfHeight);
      },
    );
  }
}
