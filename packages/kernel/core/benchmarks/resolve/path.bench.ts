import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveArrowRegistry, resolvePathRegistry, resolvePatternRegistry } from '../../src/providers';
import { resolvePath } from '../../src/resolve/path';
import type { PathResolveContext } from '../../src/resolve/path/types';
import type { IRPathBase, IRStep } from '../../src/schemas';

// 只测 IR 到 Canonical 的解析；不绑定目标，不计算引用点位或路径几何
for (const count of [16, 1_000, 10_000]) {
  for (const kind of ['absolute', 'relative', 'reference', 'labels', 'smooth'] as const) {
    defineBenchmark(
      {
        id: `resolve/path/${kind}/${count}`,
        dimensions: ['Path 解析', kind, `${count} ${kind === 'smooth' ? '点' : '步骤'}`],
      },
      () => {
        const context: PathResolveContext = {
          mode: 'light',
          rootFontSize: 16,
          gatingOn: false,
          pathRegistry: resolvePathRegistry(),
          arrowRegistry: resolveArrowRegistry(),
          patternRegistry: resolvePatternRegistry(),
          round: value => value,
        };
        const children: Array<IRStep> =
          kind === 'smooth'
            ? [{ type: 'step', kind: 'smooth', points: Array.from({ length: count }, (_, index) => [index, 0]) }]
            : Array.from({ length: count }, (_, index): IRStep => ({
                type: 'step',
                kind: index === 0 ? 'move' : 'line',
                to:
                  kind === 'reference'
                    ? { id: `p${index}` }
                    : kind === 'relative' && index > 0
                      ? { relativeAccumulate: [1, 0] }
                      : [index, 0],
                ...(kind === 'labels' && index > 0
                  ? { label: { text: `L${index}`, position: 'midway' as const } }
                  : {}),
              }));
        const source: IRPathBase = { type: 'path', children, style: { stroke: 'blue' } };
        const original = JSON.stringify(source);
        return {
          run: () => resolvePath(source, context),
          verify: result => {
            expect(result.canon.stroke).toBe('blue');
            expect(result.canon.children).toHaveLength(kind === 'smooth' ? 1 : count);
            expect(result.definition.name).toBe('stroke');
            expect(result.canon.strokeWidth).toBe(1);
            if (kind !== 'smooth')
              expect(result.canon.children?.at(-1)).toMatchObject({
                kind: 'line',
                to:
                  kind === 'reference'
                    ? { id: `p${count - 1}` }
                    : kind === 'relative'
                      ? { relativeAccumulate: [1, 0] }
                      : [count - 1, 0],
              });
            if (kind === 'smooth')
              expect(result.canon.children?.[0]).toMatchObject({
                kind: 'smooth',
                tension: 1,
                points: Array.from({ length: count }, (_, index) => [index, 0]),
              });
            if (kind === 'labels')
              expect(result.canon.children?.at(-1)).toMatchObject({
                label: { text: { lines: [{ plainText: `L${count - 1}` }] }, position: 0.5, distance: 4 },
              });
            expect(JSON.stringify(source)).toBe(original);
          },
        };
      },
    );
  }
}
