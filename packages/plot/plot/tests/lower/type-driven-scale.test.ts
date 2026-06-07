import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { lowerPlots } from '../../src/lower/expand';
import { assertScaleFieldCompatible, deriveScale } from '../../src/lower/scale';

const compile = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>) =>
  compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets) });

/** cartesian spec，可选省略 coordinate 的 x/y 绑定（触发派生） */
const spec = (coordinate: Record<string, unknown>, model: Array<{ name: string; type: string }>, scales: Array<unknown> = []): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model },
    scales,
    coordinate: { type: 'cartesian2D', ...coordinate },
    marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
  });

describe('deriveScale — 按 FieldType 派生默认 scale（ADR-03）', () => {
  it('quantitative_to_linear', () => {
    expect(deriveScale(PlotFieldType.Quantitative, 'x').type).toBe('linear');
  });
  it('temporal_to_time', () => {
    expect(deriveScale(PlotFieldType.Temporal, 'x').type).toBe('time');
  });
  it('nominal_ordinal_to_band', () => {
    expect(deriveScale(PlotFieldType.Nominal, 'x').type).toBe('band');
    expect(deriveScale(PlotFieldType.Ordinal, 'x').type).toBe('band');
  });
  it('proportion_to_linear_zero_one', () => {
    const s = deriveScale(PlotFieldType.Proportion, 'x');
    expect(s.type).toBe('linear');
    expect(s.type === 'linear' ? s.domain : undefined).toEqual([0, 1]);
  });
  it('undefined_field_defaults_linear', () => {
    expect(deriveScale(undefined, 'x').type).toBe('linear');
  });
});

describe('assertScaleFieldCompatible — 类型↔scale 兼容（ADR-03）', () => {
  it('incompatible_nominal_linear_throws', () => {
    expect(() => assertScaleFieldCompatible('x', 'linear', PlotFieldType.Nominal, 'xs')).toThrow(/incompatible/i);
  });
  it('incompatible_temporal_band_throws', () => {
    expect(() => assertScaleFieldCompatible('x', 'band', PlotFieldType.Temporal, 'xs')).toThrow(/incompatible/i);
  });
  it('quantitative_band_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'band', PlotFieldType.Quantitative, 'xs')).not.toThrow();
  });
  it('quantitative_linear_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'linear', PlotFieldType.Quantitative, 'xs')).not.toThrow();
  });
  it('temporal_time_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'time', PlotFieldType.Temporal, 'xs')).not.toThrow();
  });
});

describe('type-driven scale 集成（ADR-03）', () => {
  it('derive_when_coordinate_binding_omitted', () => {
    // 省略 coordinate.x/y + model 声明类型 → 派生 scale，正常下沉
    const scene = compile(spec({}, [{ name: 'a', type: 'temporal' }, { name: 'b', type: 'quantitative' }]), {
      d: [{ a: '2024-01-01', b: 10 }, { a: '2024-02-01', b: 14 }],
    });
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('derive_nominal_band', () => {
    expect(() =>
      compile(spec({}, [{ name: 'a', type: 'nominal' }, { name: 'b', type: 'quantitative' }]), { d: [{ a: 'x', b: 1 }, { a: 'y', b: 2 }] }),
    ).not.toThrow();
  });

  it('explicit_scale_overrides_derive', () => {
    // 显式声明并绑定 → 用显式（不派生）；linear + quantitative 兼容
    expect(() =>
      compile(spec({ x: 'xs', y: 'ys' }, [{ name: 'a', type: 'quantitative' }, { name: 'b', type: 'quantitative' }], [
        { type: 'linear', name: 'xs', domain: [0, 100] },
        { type: 'linear', name: 'ys' },
      ]), { d: [{ a: 5, b: 1 }] }),
    ).not.toThrow();
  });

  it('explicit_incompatible_throws', () => {
    // nominal 字段显式绑 linear → fail-loud
    expect(() =>
      compile(spec({ x: 'xs', y: 'ys' }, [{ name: 'a', type: 'nominal' }, { name: 'b', type: 'quantitative' }], [
        { type: 'linear', name: 'xs' },
        { type: 'linear', name: 'ys' },
      ]), { d: [{ a: 'cat', b: 1 }] }),
    ).toThrow(/incompatible/i);
  });

  it('undeclared_binding_name_still_throws', () => {
    // 提供了绑定名但未声明该 scale → 仍抛（typo 守卫，不静默派生）
    expect(() =>
      compile(spec({ x: 'missing', y: 'ys' }, [{ name: 'a', type: 'quantitative' }, { name: 'b', type: 'quantitative' }], [{ type: 'linear', name: 'ys' }]), {
        d: [{ a: 1, b: 2 }],
      }),
    ).toThrow(/unknown scale/i);
  });
});
