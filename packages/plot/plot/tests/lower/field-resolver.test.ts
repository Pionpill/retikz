import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { normalizeRows } from '../../src/lower/coerce';
import { lowerPlots, prepareRows } from '../../src/lower/expand';
import { createPlotLocator } from '../../src/lower/locate';
import { type ParsedFieldValue, type ResolveField, applyFieldResolver } from '../../src/lower/resolve';

/** cartesian point spec，model 可选（部分声明走 ADR-05），无 scales → 走 type-driven 派生 */
const pointSpec = (model?: Array<{ name: string; type?: string }>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', ...(model ? { model } : {}) },
    scales: [],
    coordinate: { type: 'cartesian2D' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

const parseSlashDate = (raw: unknown): ParsedFieldValue => Date.parse(String(raw).replaceAll('/', '-'));

describe('applyFieldResolver — 类型覆盖 + parser 收集（ADR-04）', () => {
  it('apply_resolver_overrides_type_collects_parse', () => {
    const base = new Map([['x', PlotFieldType.Continuous]]);
    const parse = (raw: unknown): ParsedFieldValue => Number(raw);
    const { fieldTypes, parsers, resolverHit } = applyFieldResolver(
      base,
      new Set(['x']),
      undefined,
      'd',
      undefined,
      field => (field === 'x' ? { type: PlotFieldType.Categorical, parse } : undefined),
    );
    expect(fieldTypes.get('x')).toBe(PlotFieldType.Categorical);
    expect(parsers.get('x')).toBe(parse);
    expect(resolverHit).toBe(true);
  });

  it('apply_resolver_undefined_no_hit', () => {
    const base = new Map([['x', PlotFieldType.Continuous]]);
    const result = applyFieldResolver(base, new Set(['x']), undefined, 'd', undefined, undefined);
    expect(result.resolverHit).toBe(false);
    expect(result.fieldTypes).toBe(base);
  });

  it('apply_resolver_passes_dataset_context', () => {
    const base = new Map([['x', PlotFieldType.Temporal]]);
    let seen: unknown;
    applyFieldResolver(
      base,
      new Set(['x']),
      [{ name: 'x', type: PlotFieldType.Temporal }],
      'd',
      { x: 'when' },
      (field, context) => {
        if (field === 'x') seen = context;
        return undefined;
      },
    );
    expect(seen).toEqual({ dataReference: 'd', physicalPath: 'when', declaredType: PlotFieldType.Temporal });
  });

  it('parse_only_without_declared_type_throws', () => {
    const base = new Map([['x', PlotFieldType.Continuous]]);
    expect(() =>
      applyFieldResolver(base, new Set(['x']), undefined, 'd', undefined, () => ({ parse: raw => Number(raw) })),
    ).toThrow(/needs a type/i);
  });

  it('parse_only_with_declared_type_ok', () => {
    const base = new Map([['x', PlotFieldType.Temporal]]);
    const { parsers } = applyFieldResolver(
      base,
      new Set(['x']),
      [{ name: 'x', type: PlotFieldType.Temporal }],
      'd',
      undefined,
      () => ({ parse: parseSlashDate }),
    );
    expect(parsers.has('x')).toBe(true);
  });
});

describe('normalizeRows — 自定义 parser（ADR-04）', () => {
  it('parser_overrides_builtin_coerce', () => {
    const out = normalizeRows([{ x: '2024/01/01' }], new Map([['x', PlotFieldType.Temporal]]), undefined, new Map([['x', parseSlashDate]]));
    expect(out[0].x).toBe(Date.parse('2024-01-01'));
  });

  it('parser_returning_boolean_or_null_skipped', () => {
    const out = normalizeRows([{ a: 'x' }], new Map([['a', PlotFieldType.Categorical]]), undefined, new Map([['a', () => true as unknown as ParsedFieldValue]]));
    expect(out[0].a).toBeUndefined();
  });

  it('parser_returning_undefined_skips', () => {
    const out = normalizeRows([{ a: 'x' }], new Map([['a', PlotFieldType.Categorical]]), undefined, new Map([['a', () => undefined]]));
    expect(out[0].a).toBeUndefined();
  });
});

describe('prepareRows — resolveField 集成（ADR-04）', () => {
  it('custom_date_parse', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ x: '2024/01/01', y: 10 }];
    const { normalized } = prepareRows(spec, { d: rows }, { resolveField: field => (field === 'x' ? { type: 'temporal', parse: parseSlashDate } : undefined) }, rows);
    expect(normalized[0].x).toBe(Date.parse('2024-01-01'));
  });

  it('numeric_enum_categorical_no_model', () => {
    const spec = pointSpec();
    const rows = [{ x: 0, y: 1 }, { x: 1, y: 2 }];
    const { fieldTypes, normalized } = prepareRows(spec, { d: rows }, { resolveField: field => (field === 'x' ? { type: 'categorical' } : undefined) }, rows);
    expect(fieldTypes.get('x')).toBe(PlotFieldType.Categorical); // 覆盖推断的 continuous
    expect(normalized[0].x).toBe(0); // resolver 命中 → 归一化跑，类别键原样
  });

  it('parse_only_with_model', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ x: '2024/03/04', y: 1 }];
    const { fieldTypes, normalized } = prepareRows(spec, { d: rows }, { resolveField: field => (field === 'x' ? { parse: parseSlashDate } : undefined) }, rows);
    expect(fieldTypes.get('x')).toBe(PlotFieldType.Temporal); // 类型沿用 model
    expect(normalized[0].x).toBe(Date.parse('2024-03-04'));
  });

  it('parse_only_without_model_throws', () => {
    const spec = pointSpec();
    const rows = [{ x: 1, y: 2 }];
    expect(() => prepareRows(spec, { d: rows }, { resolveField: () => ({ parse: raw => Number(raw) }) }, rows)).toThrow(/needs a type/i);
  });

  it('resolver_does_not_bypass_strict', () => {
    // model 仅声明 x，mark 引用了未声明的 y；resolver 返类型也不能让 y 通过 strict
    const spec = pointSpec([{ name: 'x', type: 'continuous' }]);
    const rows = [{ x: 1, y: 2 }];
    expect(() => prepareRows(spec, { d: rows }, { resolveField: () => ({ type: 'continuous' }) }, rows)).toThrow(/unknown field/i);
  });

  it('resolver_undefined_falls_back', () => {
    const spec = pointSpec();
    const rows = [{ x: 5, y: 1 }];
    const withoutResolver = prepareRows(spec, { d: rows }, {}, rows);
    const withUndefinedResolver = prepareRows(spec, { d: rows }, { resolveField: () => undefined }, rows);
    expect(withUndefinedResolver).toEqual(withoutResolver);
  });

  it('resolver_receives_physical_path_from_fieldmaps', () => {
    const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
    const rows = [{ when: '2024/01/01', y: 1 }];
    let seenPath = '';
    prepareRows(
      spec,
      { d: rows },
      {
        fieldMaps: { d: { x: 'when' } },
        resolveField: (field, context) => {
          if (field === 'x') {
            seenPath = context.physicalPath;
            return { type: 'temporal', parse: parseSlashDate };
          }
          return undefined;
        },
      },
      rows,
    );
    expect(seenPath).toBe('when');
  });
});

describe('render ⟺ locator parity + scale 兼容（ADR-04 / 评审 P2）', () => {
  const spec = pointSpec([{ name: 'x', type: 'temporal' }, { name: 'y' }]);
  const resolveField: ResolveField = field => (field === 'x' ? { type: 'temporal', parse: parseSlashDate } : undefined);
  const datasets = { d: [{ x: '2024/01/01', y: 10 }, { x: '2024/02/01', y: 14 }] };

  it('render_compiles_with_resolveField', () => {
    const scene = compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, { resolveField }) });
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('locator_builds_with_same_resolveField', () => {
    expect(() => createPlotLocator(spec, datasets, { resolveField })).not.toThrow();
  });

  it('resolved_type_feeds_scale_compat', () => {
    // resolveField 把 x 盖成 categorical → 与显式 linear scale 不兼容 → 用覆盖后类型 fail-loud
    const explicitSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'x', type: 'continuous' }, { name: 'y', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'xs' }, { type: 'linear', name: 'ys' }],
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });
    expect(() =>
      compileToScene(
        { version: 1, type: 'scene', children: [explicitSpec] },
        { composites: lowerPlots({ d: [{ x: 1, y: 2 }] }, { resolveField: field => (field === 'x' ? { type: 'categorical' } : undefined) }) },
      ),
    ).toThrow(/incompatible/i);
  });
});
