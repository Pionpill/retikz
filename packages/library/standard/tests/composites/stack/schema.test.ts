import { expect, it } from 'vitest';

import { StackSchema } from '../../../src/collection/stack/schema';

const base = { namespace: 'standard', type: 'stack' };
it('三入口可JSON往返，解析物化默认且保持最后项', () => {
  for (const content of [{ items: ['bottom', 'top'] }, { data: [1, { a: 2 }] }, { skeleton: { count: 0 } }]) {
    const parsed = StackSchema.parse({ ...base, ...content });
    expect(parsed.border).toBe(true);
    expect(parsed.arrow).toBe(false);
    expect(StackSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  }
  expect(StackSchema.parse({ ...base, items: [], layout: {} }).layout).toEqual({
    direction: 'up',
    gap: 8,
    reverseArrows: false,
  });
});
it('非法外部输入在schema边界失败', () => {
  for (const fields of [
    { items: [], data: [] },
    { skeleton: { count: -1 } },
    { items: [], dataExpand: true },
    { items: [], layout: { gap: -1 } },
    { items: [], border: { children: [] } },
    { items: [], arrow: { input: { children: [] } } },
    { items: [], arrow: { output: { arrowDetail: { scale: -1 } } } },
    { skeleton: { count: 1, labels: ['a'] } },
  ])
    expect(StackSchema.safeParse({ ...base, ...fields }).success).toBe(false);
  const result = StackSchema.safeParse({ ...base, items: [{ id: 'x' }, { id: 'x' }] });
  expect(result.success).toBe(false);
  if (!result.success)
    expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ['items', 1, 'id'] }));
});

it('arrow object materializes each omitted side as false', () => {
  expect(StackSchema.parse({ ...base, items: [], arrow: { input: true } }).arrow).toEqual({
    input: true,
    output: false,
  });
  expect(StackSchema.parse({ ...base, items: [], arrow: {} }).arrow).toEqual({ input: false, output: false });
});
