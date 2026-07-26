import { describe, expect, it } from 'vitest';

import * as SchemaExports from '../../src/schemas';
import { NodeDefaultSchema, NodeSchema } from '../../src/schemas';

const CONTRAST = 'contrast' as const;

describe('Node auto-contrast textColor keyword', () => {
  it('公开稳定的 contract 关键字', () => {
    expect(Reflect.get(SchemaExports, 'NodeTextColor')).toMatchObject({ Contrast: CONTRAST });
  });

  it('Node 与派生的 nodeDefault 接受关键字字符串', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        textColor: CONTRAST,
      }).success,
    ).toBe(true);
    expect(NodeDefaultSchema.safeParse({ textColor: CONTRAST }).success).toBe(true);
  });

  it('不再接受参数化策略对象', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        textColor: { kind: 'contrast' },
      }).success,
    ).toBe(false);
    expect(
      NodeDefaultSchema.safeParse({
        textColor: { kind: 'contrast', backdrop: '#ffffff', fallback: 'navy' },
      }).success,
    ).toBe(false);
  });

  it('关键字保持普通 JSON string round-trip', () => {
    const parsed = NodeSchema.parse({
      type: 'node',
      id: 'status',
      position: [0, 0],
      text: 'Status',
      textColor: CONTRAST,
    });
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });
});
