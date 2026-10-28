import { BUILTIN_BOUNDARIES } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

for (const boundary of BUILTIN_BOUNDARIES.values()) {
  for (const fit of boundary.name === 'rectangle' ? ['tight'] : ['tight', 'bounds']) {
    const gap = 4;
    const params = boundary.paramsSchema.parse({ fit, gap });
    const visualRect = { x: 10, y: 20, width: 80, height: 60 };
    // 上游 envelope 已求值；只计 boundary 自身的 fit / gap 操作
    const envelope = boundary.name === 'circle' ? { ...visualRect, width: 80, height: 80 } : visualRect;
    const context = { visualRect, computeConnectionEnvelope: () => envelope };
    const resolveRect = boundary.resolveRect!;
    defineBenchmark(
      {
        id: `providers/boundary/${boundary.name}/fit/${fit}/${gap}`,
        dimensions: ['Boundary fit', `${boundary.name}/${fit}`, `gap=${gap}`],
      },
      () => ({
        run: () => resolveRect(context, params),
        verify: result => {
          const width =
            boundary.name === 'rectangle'
              ? 80
              : fit === 'tight'
                ? envelope.width
                : boundary.name === 'circle'
                  ? 100
                  : 80 * Math.SQRT2;
          const height =
            boundary.name === 'rectangle'
              ? 60
              : fit === 'tight'
                ? envelope.height
                : boundary.name === 'circle'
                  ? 100
                  : 60 * Math.SQRT2;
          expect(result.x).toBe(10);
          expect(result.y).toBe(20);
          expect(result.width).toBeCloseTo(width + gap * 2);
          expect(result.height).toBeCloseTo(height + gap * 2);
        },
      }),
    );
  }
  const params = boundary.paramsSchema.parse({});
  const bounds = { x: 10, y: 20, width: 80, height: boundary.name === 'circle' ? 80 : 60 };
  defineBenchmark(
    { id: `providers/boundary/${boundary.name}/point`, dimensions: ['Boundary point', boundary.name, '水平射线'] },
    () => ({
      run: () => boundary.computeBoundaryPoint(bounds, [200, 20], params),
      verify: result => {
        expect(result[0]).toBeCloseTo(50);
        expect(result[1]).toBeCloseTo(20);
      },
    }),
  );
}
