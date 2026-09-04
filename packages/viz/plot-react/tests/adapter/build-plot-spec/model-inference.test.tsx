import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PathMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';

describe('buildPlotIR model → type-driven 派生（alpha.6 ADR-03，评审 P1）', () => {
  it('有 model 时省略 AUTO 位置 scale 绑定（交给 expand 派生）', () => {
    const spec = buildPlotIR(<PathMark x="month" y="revenue" />, '__plot', {
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
    const spec = buildPlotIR(<PathMark x="month" y="revenue" />, '__plot');
    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.scales.length).toBeGreaterThan(0);
  });

  it('延迟位置 scale 推断时省略 AUTO 绑定（交给 lower 按数据派生）', () => {
    const spec = buildPlotIR(<PathMark x="month" y="revenue" />, '__plot', {
      deferPositionScaleInference: true,
    });
    expect(spec.coordinate).toEqual({ type: 'cartesian2D' });
    expect(spec.scales).toEqual([]);
    expect(spec.data).toEqual({ reference: '__plot' });
  });

  it('可写入 plot id 与自描述尺寸（组合 anchor / 面板尺寸）', () => {
    const spec = buildPlotIR(<PathMark x="month" y="revenue" />, 'panelA', {
      id: 'panelA',
      width: 320,
      height: 180,
      deferPositionScaleInference: true,
    });
    expect(spec).toMatchObject({ id: 'panelA', width: 320, height: 180, data: { reference: 'panelA' } });
  });

  it('有 model（nominal x）端到端 spec 合法', () => {
    const spec = buildPlotIR(<PathMark x="cat" y="revenue" />, '__plot', {
      model: [
        { name: 'cat', type: 'categorical' },
        { name: 'revenue', type: 'continuous' },
      ],
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('显式 <PlotScale> 可覆盖 model 的单个位置维度，其余维度继续派生', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="month" y="revenue" />
        <PlotScale dimension="x" type="time" />
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

  it('显式 log <PlotScale> 会把 base 转发到 IRPlot', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="month" y="revenue" />
        <PlotScale dimension="y" type="log" base={Math.E} />
      </>,
      '__plot',
    );

    expect(spec.scales).toContainEqual({ type: 'log', name: '__y', base: Math.E });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('显式 symlog <PlotScale> 会把 constant 转发到 IRPlot', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="month" y="revenue" />
        <PlotScale dimension="y" type="symlog" constant={50} />
      </>,
      '__plot',
    );

    expect(spec.scales).toContainEqual({ type: 'symlog', name: '__y', constant: 50 });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('显式 <PlotScale> 保留 ratio domain padding', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="month" y="revenue" />
        <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.1 }} />
      </>,
      '__plot',
    );

    expect(spec.scales).toContainEqual({
      type: 'linear',
      name: '__y',
      domainPadding: { kind: 'ratio', lower: 0.1 },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('显式 point <PlotScale> 会把分类 domain、padding 与 align 转发到 IRPlot', () => {
    const spec = buildPlotIR(
      <>
        <PathMark x="month" y="revenue" />
        <PlotScale dimension="x" type="point" domain={['Jan', 'Feb', 'Mar']} padding={0} align={0} />
      </>,
      '__plot',
    );

    expect(spec.scales).toContainEqual({
      type: 'point',
      name: '__x',
      domain: ['Jan', 'Feb', 'Mar'],
      padding: 0,
      align: 0,
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
