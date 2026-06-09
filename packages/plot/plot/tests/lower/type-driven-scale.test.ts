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

describe('deriveScale — 按 PlotFieldTypeValue 派生默认 scale', () => {
  it('continuous_to_linear', () => {
    expect(deriveScale(PlotFieldType.Continuous, 'x').type).toBe('linear');
  });
  it('temporal_to_time', () => {
    expect(deriveScale(PlotFieldType.Temporal, 'x').type).toBe('time');
  });
  it('categorical_to_band', () => {
    expect(deriveScale(PlotFieldType.Categorical, 'x').type).toBe('band');
  });
  it('undefined_field_defaults_linear', () => {
    expect(deriveScale(undefined, 'x').type).toBe('linear');
  });
});

describe('assertScaleFieldCompatible — 类型↔scale 兼容', () => {
  it('incompatible_categorical_linear_throws', () => {
    expect(() => assertScaleFieldCompatible('x', 'linear', PlotFieldType.Categorical, 'xs')).toThrow(/incompatible/i);
  });
  it('incompatible_temporal_band_throws', () => {
    expect(() => assertScaleFieldCompatible('x', 'band', PlotFieldType.Temporal, 'xs')).toThrow(/incompatible/i);
  });
  it('continuous_band_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'band', PlotFieldType.Continuous, 'xs')).not.toThrow();
  });
  it('continuous_linear_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'linear', PlotFieldType.Continuous, 'xs')).not.toThrow();
  });
  it('temporal_time_allowed', () => {
    expect(() => assertScaleFieldCompatible('x', 'time', PlotFieldType.Temporal, 'xs')).not.toThrow();
  });
});

describe('type-driven scale 集成', () => {
  it('derive_when_coordinate_binding_omitted', () => {
    // 省略 coordinate.x/y + model 声明类型 → 派生 scale，正常下沉
    const scene = compile(spec({}, [{ name: 'a', type: 'temporal' }, { name: 'b', type: 'continuous' }]), {
      d: [{ a: '2024-01-01', b: 10 }, { a: '2024-02-01', b: 14 }],
    });
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('derive_categorical_band', () => {
    expect(() =>
      compile(spec({}, [{ name: 'a', type: 'categorical' }, { name: 'b', type: 'continuous' }]), { d: [{ a: 'x', b: 1 }, { a: 'y', b: 2 }] }),
    ).not.toThrow();
  });

  it('explicit_scale_overrides_derive', () => {
    // 显式声明并绑定 → 用显式（不派生）；linear + continuous 兼容
    expect(() =>
      compile(spec({ x: 'xs', y: 'ys' }, [{ name: 'a', type: 'continuous' }, { name: 'b', type: 'continuous' }], [
        { type: 'linear', name: 'xs', domain: [0, 100] },
        { type: 'linear', name: 'ys' },
      ]), { d: [{ a: 5, b: 1 }] }),
    ).not.toThrow();
  });

  it('explicit_incompatible_throws', () => {
    // categorical 字段显式绑 linear → fail-loud
    expect(() =>
      compile(spec({ x: 'xs', y: 'ys' }, [{ name: 'a', type: 'categorical' }, { name: 'b', type: 'continuous' }], [
        { type: 'linear', name: 'xs' },
        { type: 'linear', name: 'ys' },
      ]), { d: [{ a: 'cat', b: 1 }] }),
    ).toThrow(/incompatible/i);
  });

  it('multi_mark_explicit_checks_all_field_types', () => {
    // 两 mark 共用 x：a=continuous、c=categorical，显式 linear + model → 第二个字段 categorical 触发兼容报错
    const s = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'a', type: 'continuous' }, { name: 'b', type: 'continuous' }, { name: 'c', type: 'categorical' }] },
      scales: [{ type: 'linear', name: 'xs' }, { type: 'linear', name: 'ys' }],
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
      marks: [
        { type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } },
        { type: 'point', encoding: { x: { field: 'c' }, y: { field: 'b' } } },
      ],
    });
    expect(() => compile(s, { d: [{ a: 1, b: 2, c: 'x' }] })).toThrow(/incompatible/i);
  });

  it('derive_mixed_role_types_throws', () => {
    // 省略 x scale，两 mark 的 x 字段类型不一（continuous + categorical）→ 无从派生单一 scale，fail-loud
    const s = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'a', type: 'continuous' }, { name: 'b', type: 'continuous' }, { name: 'c', type: 'categorical' }] },
      scales: [],
      coordinate: { type: 'cartesian2D' },
      marks: [
        { type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } },
        { type: 'point', encoding: { x: { field: 'c' }, y: { field: 'b' } } },
      ],
    });
    expect(() => compile(s, { d: [{ a: 1, b: 2, c: 'x' }] })).toThrow(/mixed types/i);
  });

  it('undeclared_binding_name_still_throws', () => {
    // 提供了绑定名但未声明该 scale → 仍抛（typo 守卫，不静默派生）
    expect(() =>
      compile(spec({ x: 'missing', y: 'ys' }, [{ name: 'a', type: 'continuous' }, { name: 'b', type: 'continuous' }], [{ type: 'linear', name: 'ys' }]), {
        d: [{ a: 1, b: 2 }],
      }),
    ).toThrow(/unknown scale/i);
  });
});
