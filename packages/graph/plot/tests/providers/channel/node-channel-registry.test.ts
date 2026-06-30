import { describe, expect, it } from 'vitest';

import { ChannelDefinitionKind } from '../../../src/contract';
import {
  OPACITY_MIN,
  PLOT_SHAPE_PALETTE,
  resolveChannelRegistry,
  SIZE_MAX_RADIUS,
  SIZE_MIN_RADIUS,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
} from '../../../src/providers';

/**
 * 内置 Node 通道（size / opacity / strokeWidth / shape）收敛为 NodeChannelDefinition 内部 registry。
 * 本文件锁「声明式契约」（output 判别 union + legend 形态 + 注册成员）；逐行解析行为由 size/opacity/shape-channel
 * 三套 e2e（经 lowerPlots，已用本 registry 分派）覆盖，不在此重复。
 */
describe('node channel registry', () => {
  const registry = resolveChannelRegistry();

  it('暴露 size / opacity / strokeWidth / shape 四个内置 node 通道', () => {
    expect([...registry.keys()]).toEqual(expect.arrayContaining(['opacity', 'shape', 'size', 'strokeWidth']));
    for (const key of ['size', 'opacity', 'strokeWidth', 'shape'] as const) {
      expect(registry.get(key)?.channel).toBe(key);
      const def = registry.get(key);
      expect(def?.kind).toBe(ChannelDefinitionKind.Node);
      if (def?.kind !== ChannelDefinitionKind.Node) throw new Error(`${key} should be a node channel`);
      expect(typeof def.resolve).toBe('function');
      expect(typeof def.deliver).toBe('function');
    }
  });

  it('size：number 输出 + [MIN, MAX] 半径范围 + size legend', () => {
    const size = registry.get('size');
    if (size?.kind !== ChannelDefinitionKind.Node) throw new Error('size should be a node channel');
    expect(size.output).toEqual({ outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] });
    expect(size.legend).toBe('size');
  });

  it('opacity：number 输出 + [OPACITY_MIN, 1] clamp + ramp legend', () => {
    const opacity = registry.get('opacity');
    if (opacity?.kind !== ChannelDefinitionKind.Node) throw new Error('opacity should be a node channel');
    expect(opacity.output).toEqual({ outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true });
    expect(opacity.legend).toBe('ramp');
  });

  it('strokeWidth：number 输出 + [MIN, MAX] clamp + 无 legend（无 descriptor 不进图例）', () => {
    const strokeWidth = registry.get('strokeWidth');
    if (strokeWidth?.kind !== ChannelDefinitionKind.Node) throw new Error('strokeWidth should be a node channel');
    expect(strokeWidth.output).toEqual({
      outputKind: 'number',
      range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX],
      clamp: true,
    });
    expect(strokeWidth.legend).toBeUndefined();
  });

  it('shape：symbol 输出 + glyph palette + symbol legend（复用 ordinal 数学）', () => {
    const shape = registry.get('shape');
    if (shape?.kind !== ChannelDefinitionKind.Node) throw new Error('shape should be a node channel');
    expect(shape.output).toEqual({ outputKind: 'symbol', palette: [...PLOT_SHAPE_PALETTE] });
    expect(shape.legend).toBe('symbol');
  });

  it('size 常量编码：直接产最终半径、无 descriptor（不入 legend）', () => {
    const size = registry.get('size');
    if (size?.kind !== ChannelDefinitionKind.Node) throw new Error('size should be a node channel');
    const resolve = size.resolve({
      node: {
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [],
      },
      rows: [],
      fieldTypes: new Map(),
    });
    const resolution = resolve({ type: 'point', size: { kind: 'constant', value: 7 }, encoding: {} });
    expect(resolution?.resolver({})).toBe(7);
    expect(resolution?.descriptor).toBeUndefined();
  });
});
