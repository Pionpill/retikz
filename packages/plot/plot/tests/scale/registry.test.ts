import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import type { IRNode, IRScope } from '@retikz/core';
import * as plot from '../../src';
import { BUILTIN_SCALE_TYPES, PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';
import { type AnyScaleDefinition, type ChannelResolveContext, defineScale, extractScaleType } from '../../src/contract';
import {
  BUILTIN_SCALES,
  assertBaselineScaleCompatible,
  assertScaleFieldCompatible,
  linearPositionScale,
  resolveChannelScale,
  resolveLinearScale,
  resolvePositionScale,
  resolveScaleRegistry,
} from '../../src/providers';

/** 自定义 position scale：把内置 linear 包一层，仅验证 registry 分派（type 'unit'，固定 domain [0,1]） */
const unitScale = defineScale({
  family: 'position',
  schema: z.object({ type: z.literal('unit'), name: z.string().min(1) }),
  isFieldCompatible: fieldType => fieldType !== PlotFieldType.Categorical,
  allowsBaseline: true,
  resolve: (_def, values, range) => linearPositionScale(resolveLinearScale({ domain: [0, 1] }, values.filter((value): value is number => typeof value === 'number'), range)),
}) as AnyScaleDefinition;

/** 自定义 channel scale：分类值 → 黑白两色轮转，legendForm swatch（type 'mono'） */
const monoScale = defineScale({
  family: 'channel',
  schema: z.object({ type: z.literal('mono'), name: z.string().min(1) }),
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === PlotFieldType.Categorical,
  resolve: (_def, values) => {
    const domain = [...new Set(values.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number'))];
    const colors = domain.map((_category, index) => (index % 2 === 0 ? '#111111' : '#eeeeee'));
    const colorByCategory = new Map(domain.map((category, index) => [category, colors[index]] as const));
    return {
      of: value => (typeof value === 'string' || typeof value === 'number' ? colorByCategory.get(value) : undefined),
      legendForm: 'swatch',
      domain,
      range: colors,
      scaleType: 'mono',
    };
  },
}) as AnyScaleDefinition;

const channelCtx = (over: Partial<ChannelResolveContext> = {}): ChannelResolveContext => ({
  toNumber: value => (typeof value === 'number' && Number.isFinite(value) ? value : null),
  toTimestamp: () => null,
  resolveColorScheme: () => () => '#000000',
  ...over,
});

const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

describe('scale registry（alpha.12 ADR-07 spec）', () => {
  it('defineScale 保留 schema 推导出的注册 type 与 family', () => {
    expect(extractScaleType(unitScale.schema)).toBe('unit');
    expect(unitScale.family).toBe('position');
    expect(monoScale.family).toBe('channel');
  });

  it('public_barrel_exports_scale_definition_helpers', () => {
    expect(plot.defineScale).toBe(defineScale);
    expect(plot.extractScaleType).toBe(extractScaleType);
    expect(plot.resolveScaleRegistry).toBe(resolveScaleRegistry);
    expect('createCustomScale' in plot).toBe(false);
  });

  it('builtin_scales_cover_public_builtin_types', () => {
    expect(BUILTIN_SCALES.map(def => extractScaleType(def.schema)).sort()).toEqual([...BUILTIN_SCALE_TYPES].sort());
  });

  it('resolveScaleRegistry 注册内置 + 自定义', () => {
    const registry = resolveScaleRegistry([unitScale, monoScale]);
    expect(registry.get('unit')).toBe(unitScale);
    expect(registry.get('mono')).toBe(monoScale);
    expect(registry.get('linear')).toBeDefined();
  });

  it('duplicate_scale_type_throws（自定义撞内置）', () => {
    const collide = { ...unitScale, schema: z.object({ type: z.literal('linear'), name: z.string().min(1) }) } as AnyScaleDefinition;
    expect(() => resolveScaleRegistry([collide])).toThrow(/duplicate scale registration: "linear"/);
  });

  it('duplicate_scale_type_throws（两自定义同 type）', () => {
    expect(() => resolveScaleRegistry([unitScale, unitScale])).toThrow(/duplicate scale registration: "unit"/);
  });

  it('malformed_scale_schema_throws（type 非 literal）', () => {
    const malformed = { ...unitScale, schema: z.object({ type: z.string(), name: z.string() }) } as AnyScaleDefinition;
    expect(() => resolveScaleRegistry([malformed])).toThrow(/must declare type as a non-empty z.literal string/);
  });

  it('unknown_scale_type_throws', () => {
    const registry = resolveScaleRegistry();
    expect(() => resolvePositionScale({ type: 'nope', name: 'x' }, [], [0, 1], registry)).toThrow(/scale type "nope" is not registered/);
  });

  it('custom_position_scale_projects', () => {
    const registry = resolveScaleRegistry([unitScale]);
    const scale = resolvePositionScale({ type: 'unit', name: 'x' }, [0, 0.5, 1], [0, 100], registry);
    expect(scale.coordinate(0)).toBe(0);
    expect(scale.coordinate(1)).toBe(100);
    expect(scale.coordinate(0.5)).toBe(50);
  });

  it('channel_scale_as_position_fails_loud', () => {
    const registry = resolveScaleRegistry();
    expect(() => resolvePositionScale({ type: 'ordinal', name: 'c' }, [], [0, 1], registry)).toThrow(/cannot drive a positional/);
  });

  it('position_scale_as_color_fails_loud', () => {
    const registry = resolveScaleRegistry();
    expect(() => resolveChannelScale({ type: 'linear', name: 'x' }, [], channelCtx(), registry)).toThrow(/is not a color scale/);
  });

  it('custom_channel_scale_resolves_with_legend_form', () => {
    const registry = resolveScaleRegistry([monoScale]);
    const resolution = resolveChannelScale({ type: 'mono', name: 'c' }, ['a', 'b', 'a'], channelCtx({ fieldType: PlotFieldType.Categorical }), registry);
    expect(resolution.legendForm).toBe('swatch');
    expect(resolution.of('a')).toBe('#111111');
    expect(resolution.of('b')).toBe('#eeeeee');
    expect(resolution.domain).toEqual(['a', 'b']);
  });

  it('custom_channel_field_incompatible_fails', () => {
    const registry = resolveScaleRegistry([monoScale]);
    expect(() => resolveChannelScale({ type: 'mono', name: 'c' }, [1, 2], channelCtx({ fieldType: PlotFieldType.Continuous }), registry)).toThrow(/incompatible/i);
  });

  it('custom_color_scheme_resolves', () => {
    const registry = resolveScaleRegistry();
    const ctx = channelCtx({ fieldType: PlotFieldType.Continuous, resolveColorScheme: name => (name === 'brand' ? () => '#ff00ff' : () => '#000000') });
    const resolution = resolveChannelScale({ type: 'sequential', name: 'c', scheme: 'brand' }, [0, 1], ctx, registry);
    expect(resolution.of(0.5)).toBe('#ff00ff');
  });

  it('isFieldCompatible 谓词驱动 position compat', () => {
    const registry = resolveScaleRegistry();
    expect(() => assertScaleFieldCompatible('x', 'linear', PlotFieldType.Categorical, 'xs', registry)).toThrow(/incompatible/i);
    expect(() => assertScaleFieldCompatible('x', 'band', PlotFieldType.Continuous, 'xs', registry)).not.toThrow();
  });

  it('allowsBaseline 谓词驱动 baseline guard', () => {
    const registry = resolveScaleRegistry();
    expect(() => assertBaselineScaleCompatible('log', [{ type: 'interval' }], registry)).toThrow(/cannot be used with interval\/area/);
    expect(() => assertBaselineScaleCompatible('linear', [{ type: 'interval' }], registry)).not.toThrow();
  });

  it('custom_position_scale_lowers_in_plot', () => {
    const spec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'unit', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    };
    const layer = expandOf(spec, { d: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }, { width: 200, height: 200, scaleDefinitions: [unitScale] }).children[0] as IRScope;
    const nodes = collectNodes(layer);
    expect(nodes.length).toBe(2);
    for (const node of nodes) {
      const [cx] = node.position as [number, number];
      expect(Number.isFinite(cx)).toBe(true);
    }
  });

  it('custom_channel_scale_lowers_color_in_plot', () => {
    const spec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'mono', name: 'col' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', color: { kind: 'field', value: 'g', scale: 'col' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    };
    const layer = expandOf(spec, { d: [{ x: 0, y: 0, g: 'a' }, { x: 1, y: 1, g: 'b' }] }, { width: 200, height: 200, scaleDefinitions: [monoScale] }).children[0] as IRScope;
    const json = JSON.stringify(layer);
    expect(json).toContain('#111111');
    expect(json).toContain('#eeeeee');
  });

  it('portable_roundtrip 含自定义 type 不丢字段', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'unit', name: 'x', foo: 7 }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    };
    const roundtrip = PlotSpecSchema.parse(JSON.parse(JSON.stringify(spec)));
    expect(roundtrip.scales[0]).toMatchObject({ type: 'unit', name: 'x', foo: 7 });
  });
});
