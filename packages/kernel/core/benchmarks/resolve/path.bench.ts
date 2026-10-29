import { encodePropertyPath } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveArrowRegistry, resolvePathRegistry, resolvePatternRegistry } from '../../src/providers';
import { resolvePath } from '../../src/resolve/path';
import type { PathResolveContext } from '../../src/resolve/path';
import type { IRPathBase, IRPosition, IRStep } from '../../src/schemas';

// 规模表示一次解析的步骤或 smooth 点数；查询上下文预置，不包含编译索引构建
for (const count of [16, 1_000, 10_000]) {
  for (const kind of ['absolute', 'relative', 'reference', 'labels', 'smooth'] as const) {
    defineBenchmark(
      {
        id: `resolve/path/${kind}/${count}`,
        dimensions: ['Path 解析', kind, `${count} ${kind === 'smooth' ? '点' : '步骤'}`],
      },
      () => {
        const positions = new Map<string, IRPosition>(
          Array.from({ length: count }, (_, index) => [`p${index}`, [index, 0]]),
        );
        const context: PathResolveContext = {
          mode: 'light',
          pathRegistry: resolvePathRegistry(),
          arrowRegistry: resolveArrowRegistry(),
          patternRegistry: resolvePatternRegistry(),
          round: value => value,
          targetResolver: {
            pointOfTarget: target =>
              Array.isArray(target) ? target : 'id' in target ? (positions.get(target.id) ?? null) : null,
          },
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
            expect(result.path.stroke).toBe('blue');
            expect(result.path.children).toHaveLength(kind === 'smooth' ? 1 : count);
            expect(result.targets.size).toBe(count);
            const key = encodePropertyPath(
              kind === 'smooth' ? ['children', 0, 'points', count - 1] : ['children', count - 1, 'to'],
            );
            expect(result.targets.get(key)?.point).toEqual([count - 1, 0]);
            if (kind === 'smooth') expect(result.path.children?.[0]).toMatchObject({ kind: 'smooth', tension: 1 });
            if (kind === 'labels')
              expect(result.path.children?.at(-1)).toMatchObject({
                label: { text: `L${count - 1}`, position: 0.5, distance: 4 },
              });
            expect(JSON.stringify(source)).toBe(original);
          },
        };
      },
    );
  }
}
