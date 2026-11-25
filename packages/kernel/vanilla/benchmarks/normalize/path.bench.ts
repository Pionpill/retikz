import { normalizePath } from '@retikz/vanilla';
import type { InputPath } from '@retikz/vanilla';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

for (const count of [16, 256]) {
  const ids = Array.from({ length: count }, (_, i) => 'p' + i);
  const children = ids.map((id, i) => ({
    type: 'step' as const,
    kind: i === 0 ? ('move' as const) : ('line' as const),
    to: { id },
  }));
  for (const form of ['steps', 'target', 'way']) {
    const input: InputPath =
      form === 'way'
        ? { type: 'path', way: ids }
        : { type: 'path', children: form === 'steps' ? children : children.map(step => ({ ...step, to: step.to.id })) };
    defineBenchmark({ id: form + '/' + count, dimensions: ['归一化', form, count + ' 步'] }, () => ({
      run: () => normalizePath(input),
      verify: result => expect(result.children).toEqual(children),
    }));
  }
}
