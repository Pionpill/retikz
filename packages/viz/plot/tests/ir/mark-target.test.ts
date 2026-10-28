import { describe, expect, it } from 'vitest';

import { PathMarkSchema } from '../../src/schemas';

const coordinate = { x: { value: 0 }, y: { value: 1 } };
const reference = { mark: 'nodes', key: { field: 'source' } };

describe('标记目标端点', () => {
  it.each([coordinate, reference])('往返完整端点输入', from => {
    const mark = PathMarkSchema.parse({ type: 'path', encodings: { from, to: reference }, properties: {} });
    expect(mark.properties?.connection).toBe('straight');
    expect(PathMarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
  });

  it.each([
    { mark: 'nodes' },
    { key: { value: 'a' } },
    { ...reference, ...coordinate },
    { mark: 'nodes', key: { field: 'source', value: 'a' } },
    { mark: 'nodes', key: { edge: 'start' } },
    { ...reference, boundary: true },
  ])('拒绝不完整或不明确的外部目标', from => {
    expect(PathMarkSchema.safeParse({ type: 'path', encodings: { from, to: coordinate } }).success).toBe(false);
  });
});
