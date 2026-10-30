import type { IRNode, IRScope } from '@retikz/core';
import { DataFieldType, resolveScale } from '@retikz/data';
import { defineScale } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import * as plot from '../../../src';
import type { ChannelScaleResolveContext } from '../../../src/contract';
import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { BUILTIN_PLOT_SCALES, resolveScaleRegistry } from '../../../src/providers';
import {
  assertBaselineScaleCompatible,
  assertScaleFieldCompatible,
  resolveChannelScale,
  resolvePositionScale,
  resolvePositionScalePolicy,
} from '../../../src/resolve/scale';
import type { IRPlot } from '../../../src/schemas';
import { BUILTIN_SCALE_TYPES, PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/** 自定义 position scale：把内置 linear 包一层，仅验证 registry 分派（type 'unit'，固定 domain [0,1]） */
const unitScale = defineScale({
  type: 'unit',
  paramsSchema: strictObject({}),
  isFieldCompatible: fieldType => fieldType !== DataFieldType.Categorical,
  resolve: context => resolveScale({ type: 'linear', domain: [0, 1] }, context),
});

const channels = [
  {
    kind: 'position' as const,
    channel: 'unit-position',
    role: 'x',
    pick: () => undefined,
    scales: { unit: { continuity: 'continuous' as const, allowsBaseline: true } },
  },
];

const monoScale = defineScale({
  type: 'mono',
  paramsSchema: strictObject({}),
  isFieldCompatible: fieldType => fieldType === undefined || fieldType === DataFieldType.Categorical,
  resolve: context => resolveScale({ type: 'ordinal', range: ['#111111', '#eeeeee'] }, context),
});

const channelCtx = (over: Partial<ChannelScaleResolveContext> = {}): ChannelScaleResolveContext => ({
  toNumber: value => (typeof value === 'number' && Number.isFinite(value) ? value : null),
  coerceTimestamp: () => null,
  resolveColorScheme: () => () => '#000000',
  ...over,
});

const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(layer.children);

  return out;
};

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

describe('比例尺登记（契约规格）', () => {
  it('defineScale 保留 schema 推导出的注册 type 与 family', () => {
    expect(unitScale.type).toBe('unit');
    expect(unitScale.isFieldCompatible(DataFieldType.Continuous)).toBe(true);
    expect(monoScale.isFieldCompatible(DataFieldType.Categorical)).toBe(true);
  });

  it('公共聚合入口导出比例定义助手', () => {
    expect('definePlotScale' in plot).toBe(false);
    expect('defineScale' in plot).toBe(false);
    expect(plot.resolveScaleRegistry).toBe(resolveScaleRegistry);
    expect('createCustomScale' in plot).toBe(false);
  });

  it('内置秤覆盖公共内置类型', () => {
    expect(BUILTIN_PLOT_SCALES.map(def => def.type).sort()).toEqual([...BUILTIN_SCALE_TYPES].sort());
  });

  it('位置比例尺定义声明封闭的连续性元数据', () => {
    expect(resolvePositionScalePolicy('linear', { registry: resolveScaleRegistry() })?.continuity).toBe('continuous');
    expect(resolvePositionScalePolicy('band', { registry: resolveScaleRegistry() })?.continuity).toBe('discrete');
  });

  it('resolveScaleRegistry 注册内置 + 自定义', () => {
    const registry = resolveScaleRegistry([unitScale, monoScale]);

    expect(registry.get('unit')).toBe(unitScale);
    expect(registry.get('mono')).toBe(monoScale);
    expect(registry.get('linear')).toBeDefined();
  });

  it('duplicate_scale_type_throws（自定义撞内置）', () => {
    const collide = {
      ...unitScale,
      type: 'linear',
    };

    expect(() => resolveScaleRegistry([collide])).toThrow(/invalid scale registry/);
  });

  it('duplicate_scale_type_throws（两自定义同 type）', () => {
    expect(() => resolveScaleRegistry([unitScale, unitScale])).toThrow(/invalid scale registry/);
  });

  it('未知的比例尺类型抛出', () => {
    const registry = resolveScaleRegistry();

    expect(() => resolvePositionScale({ type: 'nope', name: 'x' }, [], [0, 1], { registry, channels })).toThrow(
      /scale type "nope" is not registered/,
    );
  });

  it('自定义位置比例尺项目', () => {
    const registry = resolveScaleRegistry([unitScale]);
    const scale = resolvePositionScale({ type: 'unit', name: 'x' }, [0, 0.5, 1], [0, 100], { registry, channels });

    expect(scale.coordinate(0)).toBe(0);
    expect(scale.coordinate(1)).toBe(100);
    expect(scale.coordinate(0.5)).toBe(50);
  });

  it('报告反转带和点范围的正离散步长，同时连续保持为零', () => {
    const registry = resolveScaleRegistry();
    const band = resolvePositionScale({ type: 'band', name: 'band' }, ['A', 'B'], [100, 0], { registry, channels });
    const point = resolvePositionScale({ type: 'point', name: 'point' }, ['A', 'B'], [100, 0], { registry, channels });
    const continuous = resolvePositionScale({ type: 'linear', name: 'linear' }, [0, 1], [100, 0], {
      registry,
      channels,
    });

    expect(band.step).toBeGreaterThan(0);
    expect(point.step).toBeGreaterThan(0);
    expect(continuous.step).toBe(0);
  });

  it('将通道比例尺用作位置比例尺时明确报错', () => {
    const registry = resolveScaleRegistry();

    expect(() => resolvePositionScale({ type: 'ordinal', name: 'c' }, [], [0, 1], { registry, channels })).toThrow(
      /cannot drive a positional/,
    );
  });

  it('颜色失败时的位置比例', () => {
    const registry = resolveScaleRegistry();

    expect(() => resolveChannelScale({ type: 'linear', name: 'x' }, [], channelCtx(), { registry, channels })).toThrow(
      /is not a color scale/,
    );
  });

  it('自定义通道比例以图例形式解析', () => {
    const registry = resolveScaleRegistry([monoScale]);
    const resolution = resolveChannelScale(
      { type: 'mono', name: 'c' },
      ['a', 'b', 'a'],
      channelCtx({ fieldType: DataFieldType.Categorical }),
      { registry, channels },
    );

    expect(resolution.legendForm).toBe('swatch');
    expect(resolution.of('a')).toBe('#111111');
    expect(resolution.of('b')).toBe('#eeeeee');
    expect(resolution.domain).toEqual(['a', 'b']);
  });

  it('自定义通道字段不兼容失败', () => {
    const registry = resolveScaleRegistry([monoScale]);

    expect(() =>
      resolveChannelScale({ type: 'mono', name: 'c' }, [1, 2], channelCtx({ fieldType: DataFieldType.Continuous }), {
        registry,
      }),
    ).toThrow(/incompatible/i);
  });

  it('自定义颜色方案解析', () => {
    const registry = resolveScaleRegistry();
    const ctx = channelCtx({
      fieldType: DataFieldType.Continuous,
      resolveColorScheme: name => (name === 'brand' ? () => '#ff00ff' : () => '#000000'),
    });
    const resolution = resolveChannelScale({ type: 'sequential', name: 'c', scheme: 'brand' }, [0, 1], ctx, {
      registry,
    });

    expect(resolution.of(0.5)).toBe('#ff00ff');
  });

  it('isFieldCompatible 谓词驱动 position compat', () => {
    const registry = resolveScaleRegistry();

    expect(() =>
      assertScaleFieldCompatible('x', 'linear', DataFieldType.Categorical, 'xs', { registry, channels }),
    ).toThrow(/incompatible/i);
    expect(() =>
      assertScaleFieldCompatible('x', 'band', DataFieldType.Continuous, 'xs', { registry, channels }),
    ).not.toThrow();
  });

  it('allowsBaseline 谓词驱动 baseline guard', () => {
    const registry = resolveScaleRegistry();

    expect(() => assertBaselineScaleCompatible('log', [{ type: 'interval' }], { registry, channels })).toThrow(
      /cannot be used with interval\/area/,
    );
    expect(() => assertBaselineScaleCompatible('linear', [{ type: 'interval' }], { registry, channels })).not.toThrow();
  });

  it('绘图中的自定义位置比例下沉', () => {
    const spec: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'unit', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          properties: { autoPadding: false },
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    };
    const layer = expandOf(
      spec,
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
      { layout: { width: 200, height: 200 }, definitions: { channels, scales: [unitScale] } },
    ).children[0] as IRScope;
    const nodes = collectNodes(layer);

    expect(nodes.length).toBe(2);

    for (const node of nodes) {
      const [cx] = node.position as [number, number];

      expect(Number.isFinite(cx)).toBe(true);
    }
  });

  it('自定义通道比例会下沉绘图中的颜色', () => {
    const spec: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'mono', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { color: { field: 'g', scale: 'col' }, position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    };
    const layer = expandOf(
      spec,
      {
        d: [
          { x: 0, y: 0, g: 'a' },
          { x: 1, y: 1, g: 'b' },
        ],
      },
      { layout: { width: 200, height: 200 }, definitions: { scales: [monoScale] } },
    ).children[0] as IRScope;
    const json = JSON.stringify(layer);

    expect(json).toContain('#111111');
    expect(json).toContain('#eeeeee');
  });

  it('portable_roundtrip 含自定义 type 不丢字段', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'unit', name: 'x', params: { foo: 7 } },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
    };
    const roundtrip = PlotSchema.parse(JSON.parse(JSON.stringify(spec)));

    expect(roundtrip.scales[0]).toMatchObject({ type: 'unit', name: 'x', params: { foo: 7 } });
  });
});
