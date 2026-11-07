import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveCoordinate } from '../../src/resolve/coordinate';
import type { CanonicalCoordinate } from '../../src/resolve/coordinate';
import type { IRCoordinate } from '../../src/schemas';

for (const kind of ['absolute', 'polar', 'direction', 'nested'] as const) {
  defineBenchmark({ id: `resolve/coordinate/${kind}`, dimensions: ['Coordinate 解析', kind, '单坐标声明'] }, () => {
    const source: IRCoordinate = {
      type: 'coordinate',
      id: 'coordinate',
      position:
        kind === 'absolute'
          ? [12, 24]
          : kind === 'polar'
            ? { radius: 10, angle: 90 }
            : kind === 'direction'
              ? { direction: 'right', of: 'node' }
              : {
                  between: [
                    { of: { origin: { radius: 2, angle: 0 }, radius: 3, angle: 90 }, offset: [1, 2] },
                    { id: 'node', anchor: 'right' },
                  ],
                  fraction: 0.5,
                },
    };
    const expected: CanonicalCoordinate = {
      id: 'coordinate',
      position:
        kind === 'absolute'
          ? [12, 24]
          : kind === 'polar'
            ? { origin: [0, 0], radius: 10, angle: 90 }
            : kind === 'direction'
              ? { direction: 'right', of: 'node', distance: 24 }
              : {
                  between: [
                    { of: { origin: { origin: [0, 0], radius: 2, angle: 0 }, radius: 3, angle: 90 }, offset: [1, 2] },
                    { id: 'node', anchor: 'right' },
                  ],
                  fraction: 0.5,
                },
    };
    const context = { nodeDistance: 24 };
    const original = structuredClone(source);
    return {
      run: () => resolveCoordinate(source, context),
      verify: result => {
        expect(result).toEqual(expected);
        expect(source).toEqual(original);
        expect(context).toEqual({ nodeDistance: 24 });
      },
    };
  });
}
