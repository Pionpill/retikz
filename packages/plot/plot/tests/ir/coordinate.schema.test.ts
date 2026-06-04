import { describe, expect, it } from 'vitest';
import { CoordinateSchema } from '../../src/ir/coordinate';

describe('CoordinateSchema (ADR-04)', () => {
  // Happy path
  it('coordinate_cartesian2d_valid', () => {
    const c = { type: 'cartesian2D', x: 'xs', y: 'ys' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界
  it('coordinate_empty_x_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: '', y: 'ys' })).toThrow();
  });

  // 错误路径
  it('coordinate_missing_x_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', y: 'ys' })).toThrow();
  });

  it('coordinate_missing_y_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: 'xs' })).toThrow();
  });

  it('coordinate_unknown_type_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', x: 'xs', y: 'ys' })).toThrow();
  });

  // 交互：schema 层不做跨字段引用校验（引用完整性归 lowering）
  it('coordinate_references_unknown_scale_name_schema_passes', () => {
    const c = { type: 'cartesian2D', x: 'nonexistent', y: 'alsoMissing' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });
});
