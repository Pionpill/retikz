import { describe, expect, it } from 'vitest';

import { StandardPathBorderStyleSchema, StandardPathStrokeStyleSchema } from '../../../../src/shared/schemas';

describe('Standard 呈现路径样式片段', () => {
  it('保留现有描边样式字段集和约束', () => {
    const value = {
      color: 'red',
      stroke: '#111827',
      strokeWidth: 2,
      dashPattern: [4, 2],
      dashOffset: -1,
      lineCap: 'round' as const,
      lineJoin: 'bevel' as const,
      opacity: { overall: 0.8, stroke: 0.6 },
      zIndex: 3,
    };

    expect(StandardPathStrokeStyleSchema.parse(value)).toEqual(value);
    expect(StandardPathStrokeStyleSchema.safeParse({ fill: 'blue' }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, cornerRadius: 2 }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, strokeWidth: -1 }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, dashPattern: [] }).success).toBe(false);
    expect(StandardPathStrokeStyleSchema.safeParse({ ...value, unknown: true }).success).toBe(false);
  });

  it('仅向边框组合添加填充语义并保持严格', () => {
    const value = {
      color: 'red',
      stroke: '#111827',
      strokeWidth: 2,
      fill: '#fee2e2',
      opacity: { fill: 0.4 },
      fillRule: 'evenodd' as const,
      zIndex: 1,
    };

    expect(StandardPathBorderStyleSchema.parse(value)).toEqual(value);
    expect(StandardPathBorderStyleSchema.safeParse({ fill: 'red', fillRule: 'evenodd' }).success).toBe(true);
    expect(StandardPathBorderStyleSchema.safeParse({ ...value, rotate: 15 }).success).toBe(false);
    expect(StandardPathBorderStyleSchema.safeParse({ ...value, zIndex: 1.5 }).success).toBe(false);
  });

  it('通过 JSON 往返 Standard 路径样式', () => {
    const value = { stroke: 'teal', strokeWidth: 1.5, opacity: 0.7, zIndex: 2 };

    expect(StandardPathStrokeStyleSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
    expect(StandardPathBorderStyleSchema.parse(JSON.parse(JSON.stringify({ ...value, fill: 'white' })))).toEqual({
      ...value,
      fill: 'white',
    });
  });
});
