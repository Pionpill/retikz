import { expect, it } from 'vitest';

import { MatrixSchema } from '../../../src/collection/matrix/schema';

const base = { namespace: 'standard', type: 'matrix' };
it('保留三种矩形入口和空轴，JSON 往返不物化派生内容', () => {
  for (const input of [
    { items: [['x', {}]] },
    { data: [[1, { nested: [2] }]] },
    { skeleton: { rows: 0, columns: 3 } },
    { skeleton: { labels: [['a', '']] } },
    { items: [[], []] },
  ]) {
    const source = JSON.parse(JSON.stringify({ ...base, ...input }));

    expect(MatrixSchema.parse(source)).toMatchObject(input);
  }
});
it.each([
  {},
  { items: [], data: [] },
  { items: ['x'] },
  { items: [[1]] },
  { data: [[1], [2, 3]] },
  { skeleton: { labels: [['x'], []] } },
  { skeleton: { rows: -1, columns: 2 } },
  { skeleton: { rows: 1.2, columns: 2 } },
  { skeleton: { rows: Number.MAX_SAFE_INTEGER, columns: 2 } },
  { skeleton: { rows: 1, columns: 1, labels: [['x']] } },
  { skeleton: { rows: 1 } },
  { items: [], dataExpand: true },
  { skeleton: { rows: 0, columns: 0 }, dataExpand: false },
  { data: [[null]], cellIdMode: 'index' },
  { items: [['x']], cellIdMode: 'string' },
  { items: [['x']], index: { row: { labels: [] } } },
  { items: [['x']], index: { column: { start: 0, labels: ['x'] } } },
  { items: [[{ id: 'a' }, { id: 'a' }]] },
  { id: 'm', cellIdMode: 'index', items: [[{ id: 'm-0-1' }, {}]] },
])('拒绝非法矩形、互斥入口与身份配置 %j', fields => {
  expect(MatrixSchema.safeParse({ ...base, ...fields }).success).toBe(false);
});
it('双轴独立配置，显式文字不注入start，错误定位实际行', () => {
  expect(MatrixSchema.parse({ ...base, items: [['x']], index: { row: { labels: ['r'] } } }).index).toEqual({
    row: { labels: ['r'], position: 'before' },
  });
  expect(MatrixSchema.parse({ ...base, items: [], index: {} }).index).toEqual({});

  const result = MatrixSchema.safeParse({ ...base, data: [[1], []] });

  expect(result.success).toBe(false);

  if (!result.success) expect(result.error.issues.some(issue => issue.path.join('.') === 'data.1')).toBe(true);
});
