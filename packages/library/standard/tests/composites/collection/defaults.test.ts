import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import {
  ArraySchema,
  ChainSchema,
  MapSchema,
  MatrixSchema,
  QueueSchema,
  StackSchema,
  TreeSchema,
} from '../../../src/collection';

const cases: Array<{ schema: ZodType; source: Record<string, unknown> }> = [
  { schema: ArraySchema, source: { type: 'array', items: ['A'] } },
  { schema: MapSchema, source: { type: 'map', entries: [{ key: 'A', value: 'B' }] } },
  { schema: MatrixSchema, source: { type: 'matrix', items: [['A']] } },
  { schema: ChainSchema, source: { type: 'chain', items: ['A'] } },
  { schema: StackSchema, source: { type: 'stack', items: ['A'] } },
  { schema: QueueSchema, source: { type: 'queue', items: ['A'] } },
];
describe('集合默认配置与实例样式', () => {
  it.each(cases)('$source.type 的共享外观仅通过默认入口配置', ({ schema, source }) => {
    const input = {
      namespace: 'standard',
      ...source,
      defaultCell: {
        style: { fill: 'red', opacity: { fill: 0 } },
        layout: { width: 0, height: 24, padding: 0, overflow: 'clip' },
      },
    };
    const parse = (target: ZodType, value: unknown): unknown => target.parse(value);
    const parsed = parse(schema, JSON.parse(JSON.stringify(input)));
    expect(parsed).toMatchObject(input);
    expect(schema.safeParse({ ...input, style: { fill: 'blue' } }).success).toBe(false);
    expect(schema.safeParse({ ...input, defaultCellStyle: { fill: 'blue' } }).success).toBe(false);
    for (const layout of [{ width: 10 }, { height: 10 }, { padding: 2 }, { overflow: 'clip' }]) {
      expect(schema.safeParse({ ...input, layout }).success).toBe(false);
    }
    for (const field of ['content', 'id']) {
      expect(schema.safeParse({ ...input, defaultCell: { [field]: 'unexpected' } }).success).toBe(false);
    }
  });

  it('Tree 区分整棵树的默认配置与节点及入边的实例覆盖', () => {
    const input = {
      namespace: 'standard',
      type: 'tree',
      defaultNode: { style: { fill: 'red' } },
      defaultConnection: false,
      root: { node: { style: { fill: 'blue' } }, children: [{ content: 'A', connection: { route: 'straight' } }] },
    };
    expect(TreeSchema.parse(JSON.parse(JSON.stringify(input)))).toMatchObject(input);
    for (const field of ['style', 'node', 'connection']) {
      expect(TreeSchema.safeParse({ ...input, [field]: {} }).success).toBe(false);
    }
  });
});
