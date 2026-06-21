import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type AnyChannelDefinition, type AnyVisualChannelDefinition, defineVisualChannel } from '../../src/contract';
import { type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';

/**
 * 自定义 `intensity`（→ node.opacity）经 options.channelDefinitions 注册，
 * 与内置通道共享 channel registry / delivery。
 */

/** 自定义 intensity 通道：score 字段线性映射到 [0.3, 1]，落到 node.opacity */
const intensityChannel = defineVisualChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.3, 1] },
  legend: 'ramp',
  resolve: ctx => mark => {
    const binding = mark.type === 'point' ? mark.encoding.channels?.intensity : undefined;
    if (binding?.field === undefined) return undefined;
    const field = binding.field;
    const valueOf = (row: Record<string, unknown>): number => Number(row[field]);
    const nums = ctx.rows.map(row => valueOf(row)).filter(Number.isFinite);
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const map = (v: number): number => 0.3 + (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (1 - 0.3);
    return {
      of: row => {
        const v = valueOf(row);
        return Number.isFinite(v) ? map(v) : undefined;
      },
      descriptor: { channel: 'intensity', scaleType: 'linear', domain: [lo, hi], range: [0.3, 1], field, fieldType: ctx.fieldTypes.get(field) },
    };
  },
  deliver: (node, value) => {
    node.opacity = value;
  },
});

const opts = (defs?: Array<AnyChannelDefinition>): LowerPlotsOptions => ({ width: 480, height: 300, channelDefinitions: defs });
const legacyVisualOpts = (defs?: Array<AnyVisualChannelDefinition>): LowerPlotsOptions => ({ width: 480, height: 300, visualChannelDefinitions: defs });

const scatterSpec = (channels?: Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, ...(channels ? { channels } : {}) } }],
  });

const nodesOf = (scope: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(scope.children);
  return out;
};

const scopesOf = (scope: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];
  const walk = (node: IRScope): void => {
    out.push(node);
    for (const child of node.children) {
      if ((child as { type?: string }).type === 'scope') walk(child as IRScope);
    }
  };
  walk(scope);
  return out;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return (def.expand(spec) as IRScope).children[0] as IRScope;
};

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

describe('custom visual channel registry', () => {
  const rows = [{ x: 0, y: 0, score: 0 }, { x: 1, y: 1, score: 5 }, { x: 2, y: 2, score: 10 }];

  // Happy path：score 0/5/10 → opacity 0.3 / 0.65 / 1.0，落到各 node
  it('custom_intensity_delivers_to_node_opacity', () => {
    const spec = scatterSpec({ intensity: { field: 'score' } });
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));
    const opacities = nodes.map(n => (n as { opacity?: number }).opacity ?? NaN);
    expect(opacities[0]).toBeCloseTo(0.3, 6);
    expect(opacities[1]).toBeCloseTo(0.65, 6);
    expect(opacities[2]).toBeCloseTo(1, 6);
  });

  // 边界：encoding.channels 不绑该键 → 不应用（node 无 custom opacity）
  it('unbound_custom_channel_not_applied', () => {
    const spec = scatterSpec();
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));
    expect(nodes.every(n => (n as { opacity?: number }).opacity === undefined)).toBe(true);
  });

  // 错误路径：encoding.channels 写了通道名，但没有对应 definition → fail-loud
  it('channels_binding_without_registered_def_fails_loud', () => {
    const spec = scatterSpec({ intensity: { field: 'score' } });
    expect(() => firstLayer(spec, { d: rows }, opts())).toThrow(/channel "intensity" is not registered/);
  });

  // 错误路径：自定义通道撞内置名 → fail-loud
  it('collision_with_builtin_channel_fails_loud', () => {
    const bad = defineVisualChannel<number>({ channel: 'size', output: { outputKind: 'number', range: [1, 2] }, resolve: () => () => undefined, deliver: () => {} });
    expect(() => lowerPlots({ d: rows }, opts([bad]))[0].expand(scatterSpec())).toThrow(/collides with a built-in channel/);
  });

  // 错误路径：缺 deliver → fail-loud
  it('missing_deliver_fails_loud', () => {
    const bad = { channel: 'glow', output: { outputKind: 'number' as const, range: [0, 1] as const }, resolve: () => () => undefined } as unknown as AnyVisualChannelDefinition;
    expect(() => lowerPlots({ d: rows }, opts([bad]))[0].expand(scatterSpec())).toThrow(/must provide deliver/);
  });

  // 错误路径：两个自定义通道同名 → fail-loud
  it('duplicate_custom_channel_fails_loud', () => {
    expect(() => lowerPlots({ d: rows }, opts([intensityChannel, intensityChannel]))[0].expand(scatterSpec())).toThrow(/duplicate custom visual channel/);
  });

  it('legacy_visual_channel_definitions_alias_still_works', () => {
    const spec = scatterSpec({ intensity: { field: 'score' } });
    const nodes = nodesOf(firstLayer(spec, { d: rows }, legacyVisualOpts([intensityChannel])));
    expect(nodes.some(n => (n as { opacity?: number }).opacity !== undefined)).toBe(true);
  });

  // 交互：自定义通道 + 内置 size 同图各自生效（size→radius、intensity→opacity）
  it('custom_channel_coexists_with_builtin_size', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', size: { kind: 'field', value: 'score' }, encoding: { x: { field: 'x' }, y: { field: 'y' }, channels: { intensity: { field: 'score' } } } }],
    });
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));
    expect(nodes.every(n => (n as { opacity?: number }).opacity !== undefined)).toBe(true);
    expect(nodes.some(n => (n as { minimumSize?: number }).minimumSize !== undefined)).toBe(true);
  });

  // 交互：自定义视觉通道也可被 legend guide 引用；schema 不再把 channel 限死在内置 color/size/opacity/shape。
  it('custom_channel_legend_lowers_from_registry_descriptor', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, channels: { intensity: { field: 'score' } } } }],
      guides: [{ type: 'legend', channel: 'intensity' }],
    });
    const root = expandOf(spec, { d: rows }, opts([intensityChannel]));
    const legend = scopesOf(root).find(scope => scope.id === 'legend.intensity');
    expect(legend).toBeDefined();
  });

  // JSON round-trip：encoding.channels 进 IR 不丢
  it('encoding_channels_survives_json_roundtrip', () => {
    const spec = scatterSpec({ intensity: { field: 'score' } });
    const back = PlotSpecSchema.parse(JSON.parse(JSON.stringify(spec)));
    const mark = back.marks[0] as { encoding: { channels?: Record<string, unknown> } };
    expect(mark.encoding.channels).toEqual({ intensity: { field: 'score' } });
  });
});
