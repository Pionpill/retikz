import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/adapter';
import { PointMark } from '../../../src/components/marks';

describe('buildPlotSpec 坐标系族 cartesian1D / polar1D', () => {
  it('cartesian1d_coordinate_input：字符串简写 → IR coordinate.type', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', { coordinate: 'cartesian1D' });
    expect(spec.coordinate).toEqual({ type: 'cartesian1D', x: '__x' });
    expect(spec.marks[0]).toEqual({ type: 'point', encoding: { x: { field: 'value' } } });
  });

  it('cartesian1d_object_orientation：对象配置 orientation 进 IR', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', {
      coordinate: { type: 'cartesian1D', orientation: 'vertical' },
    });
    expect(spec.coordinate).toEqual({ type: 'cartesian1D', x: '__x', orientation: 'vertical' });
  });

  it('cartesian1d_point_only_x：PointMark 只 x（无 y）→ 合法 IR', () => {
    const spec = buildPlotSpec(<PointMark x="value" />, '__plot', { coordinate: 'cartesian1D' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
    expect(spec.guides).toEqual([]);
  });

  it('polar1d_coordinate_input：字符串简写 + 对象半径/角向区间', () => {
    expect(buildPlotSpec(<PointMark x="hour" />, '__plot', { coordinate: 'polar1D' }).coordinate).toEqual({
      type: 'polar1D',
      angle: '__angle',
    });
    const half = buildPlotSpec(<PointMark x="hour" />, '__plot', {
      coordinate: { type: 'polar1D', radius: 0.8, startAngle: 180, endAngle: 360 },
    });
    expect(half.coordinate).toEqual({ type: 'polar1D', angle: '__angle', radius: 0.8, startAngle: 180, endAngle: 360 });
  });

  it('cartesian_regression：默认 cartesian2D scale/coord 推断不变；薄 Plot 无默认轴', () => {
    const spec = buildPlotSpec(<PointMark x="m" y="r" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.guides).toEqual([]);
  });

  it('all_family_products_pass_schema：1D 装配产物全过 PlotSpecSchema', () => {
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<PointMark x="v" />, '__plot', { coordinate: 'cartesian1D' })),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse(buildPlotSpec(<PointMark x="h" />, '__plot', { coordinate: 'polar1D' })),
    ).not.toThrow();
  });
});
