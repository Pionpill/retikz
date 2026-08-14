import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/adapter';
import { PointMark } from '../../../src/components/marks';

describe('buildPlotSpec 自定义坐标系（alpha.12 ADR-05）', () => {
  it('custom_coordinate_input：对象形态 → IR {type:<customType>, ...config}', () => {
    const spec = buildPlotSpec(<PointMark x="hx" y="vy" />, '__plot', {
      coordinate: { type: 'bridge', archHeight: 70 },
    });
    expect(spec.coordinate).toEqual({ type: 'bridge', archHeight: 70 });
    expect(spec.scales).toEqual([]); // 自定义坐标系自建几何，无 AUTO 位置 scale
    expect(spec.guides).toEqual([]); // 非 cartesian2D，无默认轴
  });

  it('custom_coordinate_no_config：仅 type 可用', () => {
    const spec = buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: { type: 'sine' } });
    expect(spec.coordinate).toEqual({ type: 'sine' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('custom_coordinate_pass_schema：装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(<PointMark x="sa" y="si" z="cl" />, '__plot', {
      coordinate: { type: 'tri' },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(spec.marks[0]).toEqual({
      type: 'point',
      encoding: { x: { field: 'sa' }, y: { field: 'si' }, z: { field: 'cl' } },
    });
  });

  it('legacy_custom_coordinate_rejected', () => {
    expect(() =>
      buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: { type: 'custom', name: 'sine', roles: ['x'] } }),
    ).toThrow(/custom coordinates must use a non-built-in type/i);
  });
});
