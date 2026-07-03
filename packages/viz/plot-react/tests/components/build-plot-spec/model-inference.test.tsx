import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { PathMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('buildPlotSpec model → type-driven 派生（alpha.6 ADR-03，评审 P1）', () => {
  it('有 model 时省略 AUTO 位置 scale 绑定（交给 expand 派生）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot', {
      model: [
        { name: 'month', type: 'temporal' },
        { name: 'revenue', type: 'continuous' },
      ],
    });
    expect(spec.scales).toEqual([]);
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.data).toEqual({
      reference: '__plot',
      model: [
        { name: 'month', type: 'temporal' },
        { name: 'revenue', type: 'continuous' },
      ],
    });
  });

  it('无 model 时沿用 AUTO 绑定（向后兼容）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales.length).toBeGreaterThan(0);
  });

  it('延迟位置 scale 推断时省略 AUTO 绑定（交给 lower 按数据派生）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, '__plot', {
      deferPositionScaleInference: true,
    });
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.scales).toEqual([]);
    expect(spec.data).toEqual({ reference: '__plot' });
  });

  it('可写入 plot id 与自描述尺寸（组合 anchor / 面板尺寸）', () => {
    const spec = buildPlotSpec(<PathMark x="month" y="revenue" />, 'panelA', {
      id: 'panelA',
      width: 320,
      height: 180,
      deferPositionScaleInference: true,
    });
    expect(spec).toMatchObject({ id: 'panelA', width: 320, height: 180, data: { reference: 'panelA' } });
  });

  it('有 model（nominal x）端到端 spec 合法', () => {
    const spec = buildPlotSpec(<PathMark x="cat" y="revenue" />, '__plot', {
      model: [
        { name: 'cat', type: 'categorical' },
        { name: 'revenue', type: 'continuous' },
      ],
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('显式 <Scale> 可覆盖 model 的单个位置维度，其余维度继续派生', () => {
    const spec = buildPlotSpec(
      <>
        <PathMark x="month" y="revenue" />
        <Scale dimension="x" type="time" />
      </>,
      '__plot',
      {
        model: [
          { name: 'month', type: 'temporal' },
          { name: 'revenue', type: 'continuous' },
        ],
      },
    );
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x' });
    expect(spec.scales).toEqual([{ type: 'time', name: '__x' }]);
  });
});
